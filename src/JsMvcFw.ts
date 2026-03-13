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
const virtualNodeObject: Record<string, IvirtualNode> = {};
const renderTriggerObject: Record<string, () => void> = {};
const variableBindRegistry: Record<string, Record<string, IvariableBind<unknown>>> = {};
const variableLoadedList: Record<string, string[]> = {};
const variableEditedList: Record<string, string[]> = {};
const variableRenderUpdateObject: Record<string, boolean> = {};
const variableHookObject: Record<string, unknown> = {};
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
            if (variableEditedList[controllerName] && !variableEditedList[controllerName].includes(stateLabel)) {
                variableEditedList[controllerName].push(stateLabel);
            }

            const isSuccess = Reflect.set(target, property, newValue, receiver);

            if (isSuccess) {
                variableRenderUpdate(controllerName);
            }

            return isSuccess;
        },
        deleteProperty(target, property) {
            if (variableEditedList[controllerName] && !variableEditedList[controllerName].includes(stateLabel)) {
                variableEditedList[controllerName].push(stateLabel);
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
            if (variableEditedList[controllerName] && !variableEditedList[controllerName].includes(label)) {
                variableEditedList[controllerName].push(label);
            }

            _state = variableProxy(label, value, controllerName);

            for (const listener of _listenerList) {
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
        const editedList = variableEditedList[controllerName] || [];

        callback((groupObject) => {
            for (const group of groupObject) {
                let isAllEdited = true;

                for (let b = 0; b < group.list.length; b++) {
                    const key = group.list[b];

                    if (editedList.indexOf(key) === -1) {
                        isAllEdited = false;

                        break;
                    }
                }

                if (isAllEdited) {
                    group.action();

                    for (const key of group.list) {
                        const index = editedList.indexOf(key);

                        if (index !== -1) {
                            editedList.splice(index, 1);
                        }
                    }
                }
            }

            variableEditedList[controllerName] = editedList;
        });
    });
};

const elementHook = (elementContainer: Element, controllerValue: Icontroller): void => {
    const elementHookList = elementContainer.querySelectorAll("[jsmvcfw-elementHookName]");
    const hookObject: Record<string, Element | Element[]> = {};

    for (const elementHook of elementHookList) {
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

    controllerValue.hookObject = hookObject;
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
    const sourceControllerObject = variableBindRegistry[target.controllerNameSource];
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
        for (const controller of controllerList) {
            if (controllerParent.constructor.name === controller.parent.constructor.name) {
                controller.childrenList.push(controllerValue);

                break;
            }
        }
    }

    controllerValue.variable();

    const renderTrigger = (): void => {
        if (!controllerParent) {
            const virtualNodeNew = controllerValue.view();
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
                }
            }

            virtualNodeObject[controllerName] = virtualNodeNew;
            elementHook(elementRoot, controllerValue);

            return;
        }

        const parentContainer = document.querySelector(`[jsmvcfw-controllerName="${controllerParent.constructor.name}"]`);
        if (!parentContainer) {
            throw new Error(
                `@cimo/jsmvcfw - JsMvcFw.ts - renderTrigger() => Tag jsmvcfw-controllerName="${controllerParent.constructor.name}" not found!`
            );
        }

        const elementContainerList = parentContainer.querySelectorAll(`[jsmvcfw-controllerName="${controllerName}"]`);
        if (!elementContainerList.length) {
            throw new Error(
                `@cimo/jsmvcfw - JsMvcFw.ts - renderTrigger() => Tag jsmvcfw-controllerName="${controllerName}" not found inside jsmvcfw-controllerName="${controllerParent.constructor.name}"!`
            );
        }

        let isFirstRenderAtLeastOne = false;

        elementContainerList.forEach((elementContainer, index) => {
            const viewAttribute = elementContainer.getAttribute("view");
            const viewName = viewAttribute && viewAttribute.trim() !== "" ? viewAttribute.trim() : undefined;

            const virtualNodeNew = controllerValue.view(viewName);
            if (!virtualNodeNew || typeof virtualNodeNew !== "object" || !virtualNodeNew.tag) {
                throw new Error(`@cimo/jsmvcfw - JsMvcFw.ts - renderTrigger() => Invalid virtual node returned by controller "${controllerName}"!`);
            }

            const slotKey = `${controllerName}::${viewName || "__default__"}::${index}`;
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
                }
            }

            virtualNodeObject[slotKey] = virtualNodeNew;
            elementHook(elementContainer as HTMLElement, controllerValue);
        });

        if (isFirstRenderAtLeastOne && callback) {
            callback();
        }
    };

    renderTriggerObject[controllerName] = renderTrigger;
    renderTrigger();

    if (controllerValue.subControllerList) {
        const subControllerList = controllerValue.subControllerList();

        for (const subController of subControllerList) {
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

            if (!variableLoadedList[controllerName]) {
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
        if (!variableLoadedList[controllerName]) {
            variableLoadedList[controllerName] = [];
            variableEditedList[controllerName] = [];
        }

        if (variableLoadedList[controllerName].includes(label)) {
            throw new Error(`@cimo/jsmvcfw - JsMvcFw.ts - variableHook() => The method variableHook use existing label "${label}"!`);
        }

        variableLoadedList[controllerName].push(label);
        variableHookObject[controllerName] = variableProxy(label, stateValue, controllerName);
    }

    return {
        state: variableHookObject[controllerName] as T,
        setState: (value: T) => {
            if (variableEditedList[controllerName] && !variableEditedList[controllerName].includes(label)) {
                variableEditedList[controllerName].push(label);
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
    const result = {} as { [A in keyof T]: IvariableBind<T[A]> };

    if (!variableLoadedList[controllerName]) {
        variableLoadedList[controllerName] = [];
        variableEditedList[controllerName] = [];
    }

    if (!variableBindRegistry[controllerName]) {
        variableBindRegistry[controllerName] = {};
    }

    for (const key in inputObject) {
        if (!Object.prototype.hasOwnProperty.call(inputObject, key)) {
            continue;
        }

        if (variableLoadedList[controllerName].includes(key)) {
            throw new Error(`@cimo/jsmvcfw - JsMvcFw.ts - variableBind() => The method variableBind use existing label "${key}"!`);
        }

        variableLoadedList[controllerName].push(key);

        const keyTyped = key as keyof T;
        const target = inputObject[keyTyped];
        let initialValue: unknown = target;

        if (variableLinkReference(target)) {
            const sourceControllerObject = variableBindRegistry[target.controllerNameSource];
            const sourceBind = sourceControllerObject ? sourceControllerObject[key] : null;

            initialValue = sourceBind ? variableLinkClone(sourceBind.state) : undefined;
        }

        const bindItem = variableBindItem(key, initialValue as T[typeof keyTyped], controllerName);

        result[keyTyped] = bindItem;

        variableBindRegistry[controllerName][key] = bindItem as IvariableBind<unknown>;
    }

    for (const key in inputObject) {
        if (!Object.prototype.hasOwnProperty.call(inputObject, key)) {
            continue;
        }

        const keyTyped = key as keyof T;
        const target = inputObject[keyTyped];

        if (!variableLinkReference(target)) {
            continue;
        }

        const targetBind = result[keyTyped] as IvariableBind<unknown>;

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

    return result;
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

            for (const mutationRecord of mutationRecordList) {
                for (const callback of callbackList) {
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
    Object.keys(virtualNodeObject).forEach((key) => delete virtualNodeObject[key]);
    Object.keys(renderTriggerObject).forEach((key) => delete renderTriggerObject[key]);
    Object.keys(variableBindRegistry).forEach((key) => delete variableBindRegistry[key]);
    Object.keys(variableLoadedList).forEach((key) => delete variableLoadedList[key]);
    Object.keys(variableEditedList).forEach((key) => delete variableEditedList[key]);
    Object.keys(variableRenderUpdateObject).forEach((key) => delete variableRenderUpdateObject[key]);
    Object.keys(variableHookObject).forEach((key) => delete variableHookObject[key]);
    variableLinkPendingList.length = 0;
    controllerList.length = 0;
    cacheVariableProxyWeakMap = new WeakMap();
    Object.keys(emitterObject).forEach((key) => delete emitterObject[key]);
    observerWeakMap = new WeakMap();
    callbackObserverWeakMap = new WeakMap();
};
