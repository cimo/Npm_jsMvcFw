// Source
import { TvirtualNodeProperty, IvirtualNode } from "./JsMvcFwInterface.js";

const applyProperty = (element: Element, key: string, valueNew: TvirtualNodeProperty, valueOld?: TvirtualNodeProperty): void => {
    if (key.startsWith("on") && typeof valueNew === "function") {
        const eventName = key.slice(2).toLowerCase();

        if (typeof valueOld === "function") {
            element.removeEventListener(eventName, valueOld);
        }

        element.addEventListener(eventName, valueNew);
    } else if (typeof valueNew === "boolean") {
        valueNew ? element.setAttribute(key, "") : element.removeAttribute(key);
    } else if (typeof valueNew === "string" || typeof valueNew === "number") {
        element.setAttribute(key, valueNew.toString());
    } else if (Array.isArray(valueNew)) {
        let stringValue = "";

        for (const value of valueNew) {
            if (typeof value === "string") {
                stringValue += value + " ";
            }
        }

        element.setAttribute(key, stringValue.trim());
    } else if (valueNew == null) {
        element.removeAttribute(key);
    }
};

const updateProperty = (element: Element, oldList: Record<string, TvirtualNodeProperty>, newList: Record<string, TvirtualNodeProperty>): void => {
    for (const key in oldList) {
        if (!(key in newList)) {
            if (key.startsWith("on") && typeof oldList[key] === "function") {
                element.removeEventListener(key.slice(2).toLowerCase(), oldList[key]);
            } else {
                element.removeAttribute(key);
            }
        }
    }

    for (const [key, value] of Object.entries(newList)) {
        const valueOld = oldList[key];

        if (value !== valueOld) {
            applyProperty(element, key, value, valueOld);
        }
    }
};

const updateChildren = (element: Element, nodeOldListValue: IvirtualNode["childrenList"], nodeNewListValue: IvirtualNode["childrenList"]): void => {
    const nodeOldList = Array.isArray(nodeOldListValue) ? nodeOldListValue : [];
    const nodeNewList = Array.isArray(nodeNewListValue) ? nodeNewListValue : [];
    const keyOldObject: Record<string, { node: IvirtualNode; dom: Element }> = {};

    for (let a = 0; a < nodeOldList.length; a++) {
        const node = nodeOldList[a];

        if (typeof node === "object" && node.key) {
            keyOldObject[node.key] = { node, dom: element.childNodes[a] as Element };
        }
    }

    const nodeMaxLength = Math.max(nodeOldList.length, nodeNewList.length);

    for (let a = 0; a < nodeMaxLength; a++) {
        const nodeOld = nodeOldList[a];
        const nodeNew = nodeNewList[a];
        const nodeDom = element.childNodes[a];

        if (!nodeNew && nodeDom) {
            const isControllerName = nodeDom.nodeType === Node.ELEMENT_NODE && (nodeDom as Element).hasAttribute("jsmvcfw-controllername");

            if (!isControllerName) {
                element.removeChild(nodeDom);
            }

            continue;
        }

        if (typeof nodeNew === "string") {
            if (!nodeDom) {
                element.appendChild(document.createTextNode(nodeNew));
            } else if (nodeDom.nodeType === Node.TEXT_NODE) {
                if (nodeDom.textContent !== nodeNew) {
                    nodeDom.textContent = nodeNew;
                }
            } else {
                element.replaceChild(document.createTextNode(nodeNew), nodeDom);
            }
        } else if (typeof nodeNew === "object") {
            const isControllerName = nodeDom?.nodeType === Node.ELEMENT_NODE && (nodeDom as Element).hasAttribute("jsmvcfw-controllername");

            if (isControllerName && !nodeNew.key) {
                continue;
            }

            if (nodeNew.key && keyOldObject[nodeNew.key]) {
                const { node, dom } = keyOldObject[nodeNew.key];

                updateVirtualNode(dom, node, nodeNew);

                if (nodeDom !== dom) {
                    element.insertBefore(dom, nodeDom);
                }
            } else if (typeof nodeOld === "object" && nodeOld.tag === nodeNew.tag && nodeDom) {
                updateVirtualNode(nodeDom as Element, nodeOld, nodeNew);
            } else {
                const domNew = createVirtualNode(nodeNew);

                if (nodeDom) {
                    element.replaceChild(domNew, nodeDom);
                } else {
                    element.appendChild(domNew);
                }
            }
        }
    }

    while (element.childNodes.length > nodeNewList.length) {
        const nodeExtra = element.childNodes[nodeNewList.length];
        const isControllerName = nodeExtra.nodeType === Node.ELEMENT_NODE && (nodeExtra as Element).hasAttribute("jsmvcfw-controllername");

        if (!isControllerName) {
            element.removeChild(nodeExtra);
        } else {
            break;
        }
    }
};

export const createVirtualNode = (node: IvirtualNode): HTMLElement => {
    const element = document.createElement(node.tag);

    for (const [key, value] of Object.entries(node.propertyObject || {})) {
        applyProperty(element, key, value);
    }

    if (Array.isArray(node.childrenList)) {
        for (const child of node.childrenList) {
            if (typeof child === "string") {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(createVirtualNode(child));
            }
        }
    }

    return element;
};

export const updateVirtualNode = (element: Element, nodeOld: IvirtualNode, nodeNew: IvirtualNode): void => {
    if (nodeOld.tag !== nodeNew.tag) {
        const elementNew = createVirtualNode(nodeNew);

        element.replaceWith(elementNew);

        return;
    }

    updateProperty(element, nodeOld.propertyObject || {}, nodeNew.propertyObject || {});

    updateChildren(element, nodeOld.childrenList, nodeNew.childrenList);
};
