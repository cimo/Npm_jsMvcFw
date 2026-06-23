// Source
import {
    IvirtualNode,
    IvariableBind,
    IvariableHook,
    IvariableLink,
    IvariableLinkPending,
    IvariableEffect,
    Icontroller,
    IcallbackObserver,
    TvariableBindInput,
    Temitter
} from "./JsMvcFwInterface.js";
import { createVirtualNode, updateVirtualNode } from "./JsMvcFwDom.js";
import Emitter from "./JsMvcFwEmitter.js";

let urlRoot: string = "";
let appLabel: string = "";
const virtualNodeObject = {} as Record<string, IvirtualNode>;
const renderTriggerObject = {} as Record<string, () => void>;
const variableBindRegistryObject = {} as Record<string, Record<string, IvariableBind<unknown>>>;
const variableLoadedObject = {} as Record<string, string[]>;
const variableEditedObject = {} as Record<string, string[]>;
const variableRenderUpdateObject = {} as Record<string, boolean>;
const variableHookObject = {} as Record<string, unknown>;
const variableLinkPendingList: IvariableLinkPending[] = [];
const controllerList: Array<{ parent: Icontroller; childrenList: Icontroller[] }> = [];
let cacheVariableProxyWeakMap = new WeakMap<object, unknown>();
const emitterObject: { [controllerName: string]: Emitter<Temitter> } = {};
let observerWeakMap: WeakMap<HTMLElement, MutationObserver> = new WeakMap();
let callbackObserverWeakMap: WeakMap<HTMLElement, IcallbackObserver[]> = new WeakMap();

const variableRenderUpdate = (controllerName: string): void => {
    if (emitterObject[controllerName] && !variableRenderUpdateObject[controllerName]) {
        variableRenderUpdateObject[controllerName] = true;

        Promise.resolve().then(() => {
            const renderTrigger = renderTriggerObject[controllerName];

            if (renderTrigger) {
                renderTrigger();
            }

            emitterObject[controllerName].emit("variableChanged");

            variableRenderUpdateObject[controllerName] = false;
        });
    }
};

const variableProxy = <T>(stateLabel: string, stateValue: T, controllerName: string): T => {
    if (typeof stateValue !== "object" || stateValue === null) {
        return stateValue;
    }

    const cache = cacheVariableProxyWeakMap.get(stateValue as object);

    if (cache) {
        return cache as T;
    }

    const proxy = new Proxy(stateValue as object, {
        get(target, property, receiver) {
            const result = Reflect.get(target, property, receiver);

            if (typeof result === "object" && result !== null) {
                return variableProxy(stateLabel, result, controllerName);
            }

            return result;
        },
        set(target, property, newValue, receiver) {
            if (variableEditedObject[controllerName] && !variableEditedObject[controllerName].includes(stateLabel)) {
                variableEditedObject[controllerName].push(stateLabel);
            }

            const isSuccess = Reflect.set(target, property, newValue, receiver);

            if (isSuccess) {
                variableRenderUpdate(controllerName);
            }

            return isSuccess;
        },
        deleteProperty(target, property) {
            if (variableEditedObject[controllerName] && !variableEditedObject[controllerName].includes(stateLabel)) {
                variableEditedObject[controllerName].push(stateLabel);
            }

            const isSuccess = Reflect.deleteProperty(target, property);

            if (isSuccess) {
                variableRenderUpdate(controllerName);
            }

            return isSuccess;
        }
    });

    cacheVariableProxyWeakMap.set(stateValue as object, proxy);

    return proxy as T;
};

const variableBindItem = <T>(label: string, stateValue: T, controllerName: string): IvariableBind<T> => {
    let _state = variableProxy(label, stateValue, controllerName);
    const _listenerList: Array<(value: T) => void> = [];

    return {
        get state(): T {
            return _state;
        },
        set state(value: T) {
            if (variableEditedObject[controllerName] && !variableEditedObject[controllerName].includes(label)) {
                variableEditedObject[controllerName].push(label);
            }

            _state = variableProxy(label, value, controllerName);

            for (let a = 0; a < _listenerList.length; a++) {
                const listener = _listenerList[a];

                listener(_state);
            }

            variableRenderUpdate(controllerName);
        },
        listener(callback: (value: T) => void): void {
            _listenerList.push(callback);
        }
    };
};

const variableWatch = (controllerName: string, callback: (watch: IvariableEffect) => void): void => {
    if (!emitterObject[controllerName]) {
        emitterObject[controllerName] = new Emitter<Temitter>();
    }

    const emitter = emitterObject[controllerName];

    emitter.on("variableChanged", () => {
        const editedList = variableEditedObject[controllerName] || [];

        callback((groupList) => {
            for (let a = 0; a < groupList.length; a++) {
                const group = groupList[a];

                let isAllEdited = true;

                for (let b = 0; b < group.variableList.length; b++) {
                    const key = group.variableList[b];

                    if (editedList.indexOf(key) === -1) {
                        isAllEdited = false;

                        break;
                    }
                }

                if (isAllEdited) {
                    group.action();

                    for (let b = 0; b < group.variableList.length; b++) {
                        const key = group.variableList[b];

                        const index = editedList.indexOf(key);

                        if (index !== -1) {
                            editedList.splice(index, 1);
                        }
                    }
                }
            }

            variableEditedObject[controllerName] = editedList;
        });
    });
};

const elementHook = (elementContainer: Element, controllerValue: Icontroller): void => {
    const elementHookList = elementContainer.querySelectorAll("[jsmvcfw-elementHookName]");
    const hookObject = {} as Record<string, Element | Element[]>;

    for (let a = 0; a < elementHookList.length; a++) {
        const elementHook = elementHookList[a];

        const attribute = elementHook.getAttribute("jsmvcfw-elementHookName");

        if (attribute) {
            const matchList = attribute.match(/^([a-zA-Z0-9]+)_\d+$/);
            const baseKey = matchList ? matchList[1] : attribute;

            if (hookObject[baseKey]) {
                if (Array.isArray(hookObject[baseKey])) {
                    (hookObject[baseKey] as Element[]).push(elementHook);
                } else {
                    hookObject[baseKey] = [hookObject[baseKey] as Element, elementHook];
                }
            } else {
                if (matchList) {
                    hookObject[baseKey] = [elementHook];
                } else {
                    hookObject[attribute] = elementHook;
                }
            }
        }
    }

    const hookObjectMerged = { ...hookObject };
    const hookObjectCurrent = controllerValue.hookObject || {};

    const entryList = Object.entries(hookObjectCurrent);

    for (let a = 0; a < entryList.length; a++) {
        const [key, value] = entryList[a];

        if (hookObjectMerged[key]) {
            continue;
        }

        const valueList = Array.isArray(value) ? value : [value];
        const valueConnectedList = [];

        for (let a = 0; a < valueList.length; a++) {
            if (valueList[a] && valueList[a].isConnected) {
                valueConnectedList.push(valueList[a]);
            }
        }

        if (!valueConnectedList.length) {
            continue;
        }

        hookObjectMerged[key] = Array.isArray(value)
            ? valueConnectedList
            : valueConnectedList.length === 1
              ? valueConnectedList[0]
              : valueConnectedList;
    }

    controllerValue.hookObject = hookObjectMerged;
};

const variableLinkReference = (value: unknown): value is IvariableLink => {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const target = value as Partial<IvariableLink>;

    return target.__jsmvcfwType === "variableLink" && typeof target.controllerNameSource === "string";
};

const variableLinkClone = <T>(value: T): T => {
    if (value === null || typeof value !== "object") {
        return value;
    }

    if (Array.isArray(value)) {
        return [...value] as T;
    }

    return { ...(value as Record<string, unknown>) } as T;
};

const variableLinkResolve = (target: IvariableLink, label: string, targetBind: IvariableBind<unknown>): boolean => {
    const sourceControllerObject = variableBindRegistryObject[target.controllerNameSource];
    const sourceBind = sourceControllerObject ? sourceControllerObject[label] : null;

    if (!sourceBind) {
        return false;
    }

    let isSyncing = false;

    const syncSourceToTarget = (nextValue: unknown): void => {
        if (isSyncing || Object.is(targetBind.state, nextValue)) {
            return;
        }

        isSyncing = true;

        targetBind.state = nextValue;

        isSyncing = false;
    };

    const syncTargetToSource = (nextValue: unknown): void => {
        if (isSyncing || Object.is(sourceBind.state, nextValue)) {
            return;
        }

        isSyncing = true;

        sourceBind.state = nextValue;

        isSyncing = false;
    };

    syncSourceToTarget(sourceBind.state);

    sourceBind.listener(syncSourceToTarget);
    targetBind.listener(syncTargetToSource);

    return true;
};

const variableLinkPendingFlush = (): void => {
    for (let a = variableLinkPendingList.length - 1; a >= 0; a--) {
        const pending = variableLinkPendingList[a];

        const isResolved = variableLinkResolve(pending.target, pending.label, pending.targetBind);

        if (isResolved) {
            variableLinkPendingList.splice(a, 1);
        }
    }
};

const normalizeVirtualNode = (node: IvirtualNode) => {
    if (Array.isArray(node)) {
        return {
            tag: "div",
            propertyObject: { style: "display: contents;" },
            childrenList: node
        };
    }

    return node;
};

export const setUrlRoot = (urlRootValue: string) => (urlRoot = urlRootValue);
export const getUrlRoot = () => urlRoot;

export const setAppLabel = (appLabelValue: string) => (appLabel = appLabelValue);
export const getAppLabel = () => appLabel;

export const getControllerList = () => controllerList;

export const renderTemplate = (controllerValue: Icontroller, controllerParent?: Icontroller, callback?: () => void): void => {
    const controllerName = controllerValue.constructor.name;

    if (!controllerParent) {
        controllerList.push({ parent: controllerValue, childrenList: [] });
    } else {
        for (let a = 0; a < controllerList.length; a++) {
            const controller = controllerList[a];

            if (controllerParent.constructor.name === controller.parent.constructor.name) {
                controller.childrenList.push(controllerValue);

                break;
            }
        }
    }

    controllerValue.variable();

    const renderSubControllerList = (): void => {
        if (!controllerValue.subControllerList) {
            return;
        }

        const subControllerList = controllerValue.subControllerList();

        for (let a = 0; a < subControllerList.length; a++) {
            const subController = subControllerList[a];
            const subControllerName = subController.constructor.name;
            const renderSubTrigger = renderTriggerObject[subControllerName];

            if (!renderSubTrigger) {
                continue;
            }

            const subContainerList = document.querySelectorAll(`[jsmvcfw-controllerName="${subControllerName}"]`);
            let isRefillNeeded = false;

            for (let b = 0; b < subContainerList.length; b++) {
                if (!subContainerList[b].firstElementChild) {
                    isRefillNeeded = true;

                    break;
                }
            }

            if (isRefillNeeded) {
                renderSubTrigger();
            }
        }
    };

    const renderTrigger = (): void => {
        if (!controllerParent) {
            let virtualNodeNew = controllerValue.view();
            virtualNodeNew = normalizeVirtualNode(virtualNodeNew);

            if (!virtualNodeNew || typeof virtualNodeNew !== "object" || !virtualNodeNew.tag) {
                throw new Error(`@cimo/jsmvcfw - JsMvcFw.ts - renderTrigger() => Invalid virtual node returned by controller "${controllerName}"!`);
            }

            const elementRoot = document.getElementById("jsmvcfw_app");

            if (!elementRoot) {
                throw new Error("@cimo/jsmvcfw - JsMvcFw.ts - renderTrigger() => Root element #jsmvcfw_app not found!");
            }

            const virtualNodeOld = virtualNodeObject[controllerName];

            if (!virtualNodeOld) {
                const elementVirtualNode = createVirtualNode(virtualNodeNew);
                elementRoot.innerHTML = "";
                elementRoot.appendChild(elementVirtualNode);

                if (callback) {
                    callback();
                }
            } else {
                const elementFirstChild = elementRoot.firstElementChild;
                if (elementFirstChild) {
                    updateVirtualNode(elementFirstChild, virtualNodeOld, virtualNodeNew);
                } else {
                    const elementVirtualNode = createVirtualNode(virtualNodeNew);
                    elementRoot.innerHTML = "";
                    elementRoot.appendChild(elementVirtualNode);
                }
            }

            virtualNodeObject[controllerName] = virtualNodeNew;
            elementHook(elementRoot, controllerValue);
            renderSubControllerList();

            return;
        }

        const parentContainerList = document.querySelectorAll(`[jsmvcfw-controllerName="${controllerParent.constructor.name}"]`);

        if (!parentContainerList.length) {
            throw new Error(
                `@cimo/jsmvcfw - JsMvcFw.ts - renderTrigger() => Tag jsmvcfw-controllerName="${controllerParent.constructor.name}" not found!`
            );
        }

        const elementContainerList: Array<{
            elementContainer: Element;
            parentIndex: number;
            parentViewName: string | undefined;
        }> = [];

        for (let parentIndex = 0; parentIndex < parentContainerList.length; parentIndex++) {
            const parentContainer = parentContainerList[parentIndex];
            const parentViewAttribute = parentContainer.getAttribute("view");
            const parentViewName = parentViewAttribute && parentViewAttribute.trim() !== "" ? parentViewAttribute.trim() : undefined;

            const childContainerNodeList = parentContainer.querySelectorAll(`[jsmvcfw-controllerName="${controllerName}"]`);

            for (let childIndex = 0; childIndex < childContainerNodeList.length; childIndex++) {
                const elementContainer = childContainerNodeList[childIndex];
                const parentViewFilterAttribute = elementContainer.getAttribute("jsmvcfw-parentView");
                const parentViewFilter =
                    parentViewFilterAttribute && parentViewFilterAttribute.trim() !== "" ? parentViewFilterAttribute.trim() : undefined;

                if (parentViewFilter && parentViewFilter !== parentViewName) {
                    continue;
                }

                elementContainerList.push({
                    elementContainer,
                    parentIndex,
                    parentViewName
                });
            }
        }

        if (!elementContainerList.length) {
            const slotPrefix = `${controllerName}::`;
            const slotKeyList = Object.keys(virtualNodeObject);

            for (let a = 0; a < slotKeyList.length; a++) {
                if (slotKeyList[a].indexOf(slotPrefix) === 0) {
                    delete virtualNodeObject[slotKeyList[a]];
                }
            }

            return;
        }

        let isFirstRenderAtLeastOne = false;

        for (let a = 0; a < elementContainerList.length; a++) {
            const { elementContainer, parentIndex, parentViewName } = elementContainerList[a];
            const viewAttribute = elementContainer.getAttribute("view");
            const viewName = viewAttribute && viewAttribute.trim() !== "" ? viewAttribute.trim() : undefined;

            let virtualNodeNew = controllerValue.view(viewName);
            virtualNodeNew = normalizeVirtualNode(virtualNodeNew);

            if (!virtualNodeNew || typeof virtualNodeNew !== "object" || !virtualNodeNew.tag) {
                throw new Error(`@cimo/jsmvcfw - JsMvcFw.ts - renderTrigger() => Invalid virtual node returned by controller "${controllerName}"!`);
            }

            const slotKey = `${controllerName}::parent-${parentIndex}::${parentViewName || "__defaultParent__"}::${viewName || "__default__"}::${a}`;
            const virtualNodeOld = virtualNodeObject[slotKey];

            if (!virtualNodeOld) {
                const elementVirtualNode = createVirtualNode(virtualNodeNew);
                elementContainer.innerHTML = "";
                elementContainer.appendChild(elementVirtualNode);

                isFirstRenderAtLeastOne = true;
            } else {
                const elementFirstChild = elementContainer.firstElementChild;

                if (elementFirstChild) {
                    updateVirtualNode(elementFirstChild, virtualNodeOld, virtualNodeNew);
                } else {
                    const elementVirtualNode = createVirtualNode(virtualNodeNew);
                    elementContainer.innerHTML = "";
                    elementContainer.appendChild(elementVirtualNode);
                }
            }

            virtualNodeObject[slotKey] = virtualNodeNew;

            elementHook(elementContainer, controllerValue);
        }

        if (isFirstRenderAtLeastOne && callback) {
            callback();
        }

        renderSubControllerList();
    };

    renderTriggerObject[controllerName] = renderTrigger;
    renderTrigger();

    if (controllerValue.subControllerList) {
        const subControllerList = controllerValue.subControllerList();

        for (let a = 0; a < subControllerList.length; a++) {
            const subController = subControllerList[a];

            renderTemplate(subController, controllerValue, () => {
                subController.event();

                renderAfter(subController).then(() => {
                    subController.rendered();
                });
            });
        }
    }

    variableWatch(controllerName, (watch) => {
        controllerValue.variableEffect.call(controllerValue, watch);
    });
};

export const renderAfter = (controller: Icontroller): Promise<void> => {
    return new Promise((resolve) => {
        const check = () => {
            const controllerName = controller.constructor.name;

            if (!variableLoadedObject[controllerName]) {
                resolve();

                return;
            }

            const isRendering = variableRenderUpdateObject[controllerName];

            if (!isRendering) {
                resolve();

                return;
            }

            Promise.resolve().then(check);
        };

        check();
    });
};

export const variableHook = <T>(label: string, stateValue: T, controllerName: string): IvariableHook<T> => {
    if (!(controllerName in variableHookObject)) {
        if (!variableLoadedObject[controllerName]) {
            variableLoadedObject[controllerName] = [];
            variableEditedObject[controllerName] = [];
        }

        if (variableLoadedObject[controllerName].includes(label)) {
            throw new Error(`@cimo/jsmvcfw - JsMvcFw.ts - variableHook() => The method variableHook use existing label "${label}"!`);
        }

        variableLoadedObject[controllerName].push(label);
        variableHookObject[controllerName] = variableProxy(label, stateValue, controllerName);
    }

    return {
        state: variableHookObject[controllerName] as T,
        setState: (value: T) => {
            if (variableEditedObject[controllerName] && !variableEditedObject[controllerName].includes(label)) {
                variableEditedObject[controllerName].push(label);
            }

            variableHookObject[controllerName] = variableProxy(label, value, controllerName);

            variableRenderUpdate(controllerName);
        }
    };
};

export const variableBind = <T extends Record<string, unknown>>(
    inputObject: TvariableBindInput<T>,
    controllerName: string
): { [A in keyof T]: IvariableBind<T[A]> } => {
    const resultObject = {} as { [A in keyof T]: IvariableBind<T[A]> };

    if (!variableLoadedObject[controllerName]) {
        variableLoadedObject[controllerName] = [];
        variableEditedObject[controllerName] = [];
    }

    if (!variableBindRegistryObject[controllerName]) {
        variableBindRegistryObject[controllerName] = {};
    }

    const keyList = Object.keys(inputObject) as (keyof T)[];

    for (let a = 0; a < keyList.length; a++) {
        const keyTyped = keyList[a];
        const key = String(keyTyped);

        if (variableLoadedObject[controllerName].includes(key)) {
            throw new Error(`@cimo/jsmvcfw - JsMvcFw.ts - variableBind() => The method variableBind use existing label "${key}"!`);
        }

        variableLoadedObject[controllerName].push(key);

        const target = inputObject[keyTyped];
        let initialValue: unknown = target;

        if (variableLinkReference(target)) {
            const sourceControllerObject = variableBindRegistryObject[target.controllerNameSource];
            const sourceBind = sourceControllerObject ? sourceControllerObject[key] : null;

            initialValue = sourceBind ? variableLinkClone(sourceBind.state) : undefined;
        }

        const bindItem = variableBindItem(key, initialValue as T[typeof keyTyped], controllerName);

        resultObject[keyTyped] = bindItem;

        variableBindRegistryObject[controllerName][key] = bindItem as IvariableBind<unknown>;
    }

    for (let a = 0; a < keyList.length; a++) {
        const keyTyped = keyList[a];
        const key = String(keyTyped);
        const target = inputObject[keyTyped];

        if (!variableLinkReference(target)) {
            continue;
        }

        const targetBind = resultObject[keyTyped] as IvariableBind<unknown>;

        const isResolved = variableLinkResolve(target, key, targetBind);

        if (!isResolved) {
            variableLinkPendingList.push({
                target,
                label: key,
                targetBind
            });
        }
    }

    variableLinkPendingFlush();

    return resultObject;
};

export const variableLink = <T>(controllerNameSource: string): IvariableLink<T> => {
    return {
        __jsmvcfwType: "variableLink",
        controllerNameSource
    };
};

export const elementObserver = (element: HTMLElement, callback: IcallbackObserver): void => {
    const callbackList = callbackObserverWeakMap.get(element) || [];
    callbackObserverWeakMap.set(element, [...callbackList, callback]);

    if (!observerWeakMap.has(element)) {
        const observer = new MutationObserver((mutationRecordList) => {
            const callbackList = callbackObserverWeakMap.get(element);

            if (!callbackList) {
                return;
            }

            for (let a = 0; a < mutationRecordList.length; a++) {
                const mutationRecord = mutationRecordList[a];

                for (let b = 0; b < callbackList.length; b++) {
                    const callback = callbackList[b];

                    callback(element, mutationRecord);
                }
            }
        });

        observer.observe(element, {
            subtree: true,
            childList: true,
            attributes: true
        });

        observerWeakMap.set(element, observer);
    }
};

export const elementObserverOff = (element: HTMLElement): void => {
    const observer = observerWeakMap.get(element);

    if (observer) {
        observer.disconnect();
    }
};

export const elementObserverOn = (element: HTMLElement): void => {
    const observer = observerWeakMap.get(element);

    if (observer) {
        observer.observe(element, {
            subtree: true,
            childList: true,
            attributes: true
        });
    }
};

export const frameworkReset = (): void => {
    const virtualNodeKeyList = Object.keys(virtualNodeObject);

    for (let a = 0; a < virtualNodeKeyList.length; a++) {
        delete virtualNodeObject[virtualNodeKeyList[a]];
    }

    const renderTriggerKeyList = Object.keys(renderTriggerObject);

    for (let a = 0; a < renderTriggerKeyList.length; a++) {
        delete renderTriggerObject[renderTriggerKeyList[a]];
    }

    const variableBindKeyList = Object.keys(variableBindRegistryObject);

    for (let a = 0; a < variableBindKeyList.length; a++) {
        delete variableBindRegistryObject[variableBindKeyList[a]];
    }

    const variableLoadedKeyList = Object.keys(variableLoadedObject);

    for (let a = 0; a < variableLoadedKeyList.length; a++) {
        delete variableLoadedObject[variableLoadedKeyList[a]];
    }

    const variableEditedKeyList = Object.keys(variableEditedObject);

    for (let a = 0; a < variableEditedKeyList.length; a++) {
        delete variableEditedObject[variableEditedKeyList[a]];
    }

    const variableRenderUpdateKeyList = Object.keys(variableRenderUpdateObject);

    for (let a = 0; a < variableRenderUpdateKeyList.length; a++) {
        delete variableRenderUpdateObject[variableRenderUpdateKeyList[a]];
    }

    const variableHookKeyList = Object.keys(variableHookObject);

    for (let a = 0; a < variableHookKeyList.length; a++) {
        delete variableHookObject[variableHookKeyList[a]];
    }

    variableLinkPendingList.length = 0;
    controllerList.length = 0;
    cacheVariableProxyWeakMap = new WeakMap();

    const emitterKeyList = Object.keys(emitterObject);

    for (let a = 0; a < emitterKeyList.length; a++) {
        delete emitterObject[emitterKeyList[a]];
    }

    observerWeakMap = new WeakMap();
    callbackObserverWeakMap = new WeakMap();
};
