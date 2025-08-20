// Source
import { IvirtualNode, IvariableBind, IvariableHook, IvariableEffect, Icontroller, IcallbackObserver } from "./JsMvcFwInterface";
import { createVirtualNode, updateVirtualNode } from "./JsMvcFwDom";
import Emitter from "./JsMvcFwEmitter";

type Temitter = {
    variableChanged: void;
};

let isDebug = false;
let elementRoot: HTMLElement | null = null;
let urlRoot = "";

const virtualNodeObject: Record<string, IvirtualNode> = {};
const renderTriggerObject: Record<string, () => void> = {};
const variableLoadedList: Record<string, string[]> = {};
const variableEditedList: Record<string, string[]> = {};
const variableRenderUpdateObject: Record<string, boolean> = {};
const variableHookObject: Record<string, unknown> = {};
const controllerList: Array<{ parent: Icontroller; childrenList: Icontroller[] }> = [];
const cacheVariableProxyWeakMap = new WeakMap<object, unknown>();
const emitterObject: { [controllerName: string]: Emitter<Temitter> } = {};
const observerWeakMap: WeakMap<HTMLElement, MutationObserver> = new WeakMap();
const callbackObserverWeakMap: WeakMap<HTMLElement, IcallbackObserver[]> = new WeakMap();

const variableRenderUpdate = (controllerName: string): void => {
    if (!variableRenderUpdateObject[controllerName]) {
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
            if (!variableEditedList[controllerName].includes(stateLabel)) {
                variableEditedList[controllerName].push(stateLabel);
            }

            const isSuccess = Reflect.set(target, property, newValue, receiver);

            if (isSuccess) {
                variableRenderUpdate(controllerName);
            }

            return isSuccess;
        },
        deleteProperty(target, property) {
            if (!variableEditedList[controllerName].includes(stateLabel)) {
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
    let _listener: ((value: T) => void) | null = null;

    return {
        get state(): T {
            return _state;
        },
        set state(value: T) {
            if (!variableEditedList[controllerName].includes(label)) {
                variableEditedList[controllerName].push(label);
            }

            _state = variableProxy(label, value, controllerName);

            if (_listener) {
                _listener(_state);
            }

            variableRenderUpdate(controllerName);
        },
        listener(callback: (value: T) => void): void {
            _listener = callback;
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
    const elementHookList = elementContainer.querySelectorAll("[jsmvcfw-elementHook]");
    const elementHookObject: Record<string, Element | Element[]> = {};

    for (const elementHook of elementHookList) {
        const attribute = elementHook.getAttribute("jsmvcfw-elementHook");

        if (attribute) {
            const matchList = attribute.match(/^([a-zA-Z0-9]+)_\d+$/);
            const baseKey = matchList ? matchList[1] : attribute;

            if (elementHookObject[baseKey]) {
                if (Array.isArray(elementHookObject[baseKey])) {
                    (elementHookObject[baseKey] as Element[]).push(elementHook);
                } else {
                    elementHookObject[baseKey] = [elementHookObject[baseKey] as Element, elementHook];
                }
            } else {
                if (matchList) {
                    elementHookObject[baseKey] = [elementHook];
                } else {
                    elementHookObject[attribute] = elementHook;
                }
            }
        }
    }

    controllerValue.elementHookObject = elementHookObject;
};

export const getIsDebug = () => isDebug;
export const getElementRoot = () => elementRoot;
export const getUrlRoot = () => urlRoot;
export const getControllerList = () => controllerList;

export const frameworkInit = (isDebugValue: boolean, elementRootId: string, urlRootValue: string): void => {
    isDebug = isDebugValue;
    elementRoot = document.getElementById(elementRootId);
    urlRoot = urlRootValue;
};

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

    const renderTrigger = () => {
        const virtualNodeNew = controllerValue.view();

        if (!virtualNodeNew || typeof virtualNodeNew !== "object" || !virtualNodeNew.tag) {
            throw new Error(`@cimo/jsmvcfw - JsMvcFw.ts - renderTrigger() => Invalid virtual node returned by controller "${controllerName}"!`);
        }

        let elementContainer: Element | null = null;

        if (!controllerParent) {
            if (!elementRoot) {
                throw new Error("@cimo/jsmvcfw - JsMvcFw.ts - renderTrigger() => Root element #jsmvcfw_app not found!");
            }

            elementContainer = elementRoot;
        } else {
            const parentContainer = document.querySelector(`[jsmvcfw-controllerName="${controllerParent.constructor.name}"]`);

            if (!parentContainer) {
                throw new Error(
                    `@cimo/jsmvcfw - JsMvcFw.ts - renderTrigger() => Tag jsmvcfw-controllerName="${controllerParent.constructor.name}" not found!`
                );
            }

            elementContainer = parentContainer.querySelector(`[jsmvcfw-controllerName="${controllerName}"]`);

            if (!elementContainer) {
                throw new Error(
                    `@cimo/jsmvcfw - JsMvcFw.ts - renderTrigger() => Tag jsmvcfw-controllerName="${controllerName}" not found inside jsmvcfw-controllerName="${controllerParent.constructor.name}"!`
                );
            }
        }

        const virtualNodeOld = virtualNodeObject[controllerName];

        if (!virtualNodeOld) {
            if (elementContainer) {
                const elementVirtualNode = createVirtualNode(virtualNodeNew);

                elementContainer.innerHTML = "";

                elementContainer.appendChild(elementVirtualNode);

                if (callback) {
                    callback();
                }
            }
        } else {
            if (elementContainer) {
                const elementFirstChild = elementContainer.firstElementChild;

                if (elementFirstChild) {
                    updateVirtualNode(elementFirstChild, virtualNodeOld, virtualNodeNew);
                }
            }
        }

        virtualNodeObject[controllerName] = virtualNodeNew;

        elementHook(elementContainer, controllerValue);
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

            const variableLoadedLength = variableLoadedList[controllerName].length;
            const isRendering = variableRenderUpdateObject[controllerName];

            if (variableLoadedLength > 0 && !isRendering) {
                resolve();
            } else {
                Promise.resolve().then(check);
            }
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
            if (!variableEditedList[controllerName].includes(label)) {
                variableEditedList[controllerName].push(label);
            }

            variableHookObject[controllerName] = variableProxy(label, value, controllerName);

            variableRenderUpdate(controllerName);
        }
    };
};

export const variableBind = <T extends Record<string, unknown>>(
    variableObject: T,
    controllerName: string
): { [A in keyof T]: IvariableBind<T[A]> } => {
    const result = {} as { [A in keyof T]: IvariableBind<T[A]> };

    if (!variableLoadedList[controllerName]) {
        variableLoadedList[controllerName] = [];
        variableEditedList[controllerName] = [];
    }

    for (const key in variableObject) {
        if (Object.prototype.hasOwnProperty.call(variableObject, key)) {
            if (variableLoadedList[controllerName].includes(key)) {
                throw new Error(`@cimo/jsmvcfw - JsMvcFw.ts - variableBind() => The method variableBind use existing label "${key}"!`);
            }

            variableLoadedList[controllerName].push(key);

            result[key] = variableBindItem(key, variableObject[key] as T[typeof key], controllerName);
        }
    }

    return result;
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
