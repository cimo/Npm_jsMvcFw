// Source
import { TvirtualNodeProperty, IvirtualNode } from "./JsMvcFwInterface.js";

interface Ibinding {
    node: Node;
    apply: () => void;
    keyList: string[];
    childList: Ibinding[];
    isDisposed: boolean;
    nodeList: Node[];
    anchor?: Node;
    thunk?: () => unknown;
    isRegion?: boolean;
}

let bindingActive: Ibinding | null = null;
const bindingSubscriberObject = {} as Record<string, Ibinding[]>;
const bindingFlushSet = new Set<string>();
let isBindingFlushScheduled = false;
let bindingFlushCallback: (() => void) | null = null;

export const bindingSetFlushCallback = (callback: () => void): void => {
    bindingFlushCallback = callback;
};

export const bindingTrack = (key: string): void => {
    if (!bindingActive) {
        return;
    }

    let bindingList = bindingSubscriberObject[key];

    if (!bindingList) {
        bindingList = [];
        bindingSubscriberObject[key] = bindingList;
    }

    if (bindingList.indexOf(bindingActive) === -1) {
        bindingList.push(bindingActive);
        bindingActive.keyList.push(key);
    }
};

const bindingUnsubscribe = (binding: Ibinding): void => {
    for (let a = 0; a < binding.keyList.length; a++) {
        const bindingList = bindingSubscriberObject[binding.keyList[a]];

        if (bindingList) {
            const index = bindingList.indexOf(binding);

            if (index !== -1) {
                bindingList.splice(index, 1);
            }
        }
    }

    binding.keyList = [];
};

const bindingDisposeChildren = (binding: Ibinding): void => {
    for (let a = 0; a < binding.childList.length; a++) {
        bindingDispose(binding.childList[a]);
    }

    binding.childList = [];
};

const bindingDispose = (binding: Ibinding): void => {
    if (binding.isDisposed) {
        return;
    }

    binding.isDisposed = true;
    bindingUnsubscribe(binding);
    bindingDisposeChildren(binding);
};

const bindingRun = (binding: Ibinding): void => {
    if (binding.isDisposed) {
        return;
    }

    bindingUnsubscribe(binding);
    bindingDisposeChildren(binding);

    const bindingPrevious = bindingActive;
    bindingActive = binding;

    binding.apply();

    bindingActive = bindingPrevious;
};

const bindingCreate = (node: Node, apply: () => void): Ibinding => {
    const binding: Ibinding = { node, apply, keyList: [], childList: [], isDisposed: false, nodeList: [] };

    if (bindingActive) {
        bindingActive.childList.push(binding);
    }

    bindingRun(binding);

    return binding;
};

const regionFlatten = (input: unknown, out: Array<IvirtualNode | string | (() => unknown)>): void => {
    if (input === null || input === undefined || input === false || input === true) {
        return;
    }

    if (Array.isArray(input)) {
        for (let a = 0; a < input.length; a++) {
            regionFlatten(input[a], out);
        }

        return;
    }

    if (typeof input === "number") {
        out.push(String(input));

        return;
    }

    if (typeof input === "string") {
        out.push(input);

        return;
    }

    if (typeof input === "function") {
        out.push(input as () => unknown);

        return;
    }

    if (typeof input === "object" && "tag" in input) {
        out.push(input as IvirtualNode);
    }
};

const regionApply = (binding: Ibinding): void => {
    if (!binding.anchor || !binding.thunk) {
        return;
    }

    const parent = binding.anchor.parentNode;

    if (!parent) {
        return;
    }

    const vnodeListNew: Array<IvirtualNode | string | (() => unknown)> = [];
    regionFlatten(binding.thunk(), vnodeListNew);

    const isTextFast =
        vnodeListNew.length === 1 &&
        typeof vnodeListNew[0] === "string" &&
        binding.nodeList.length === 1 &&
        binding.nodeList[0].nodeType === Node.TEXT_NODE;

    if (isTextFast) {
        if (binding.nodeList[0].textContent !== vnodeListNew[0]) {
            binding.nodeList[0].textContent = vnodeListNew[0] as string;
        }

        return;
    }

    for (let a = 0; a < binding.nodeList.length; a++) {
        const node = binding.nodeList[a];

        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }

    binding.nodeList = [];

    const reference = binding.anchor.nextSibling;

    for (let a = 0; a < vnodeListNew.length; a++) {
        const vnode = vnodeListNew[a];

        if (typeof vnode === "function") {
            const anchorChild = document.createComment("");
            parent.insertBefore(anchorChild, reference);
            binding.nodeList.push(anchorChild);

            const bindingChild: Ibinding = {
                node: anchorChild,
                anchor: anchorChild,
                thunk: vnode,
                nodeList: [],
                keyList: [],
                childList: [],
                isDisposed: false,
                isRegion: true,
                apply: () => undefined
            };
            bindingChild.apply = () => regionApply(bindingChild);
            binding.childList.push(bindingChild);
            bindingRun(bindingChild);

            for (let b = 0; b < bindingChild.nodeList.length; b++) {
                binding.nodeList.push(bindingChild.nodeList[b]);
            }

            continue;
        }

        let domNode: Node;

        if (typeof vnode === "string") {
            domNode = document.createTextNode(vnode);
        } else {
            domNode = createVirtualNode(vnode);
        }

        parent.insertBefore(domNode, reference);
        binding.nodeList.push(domNode);
    }
};

const bindingCreateRegion = (parentElement: Element, thunk: () => unknown): Ibinding => {
    const anchor = document.createComment("");
    parentElement.appendChild(anchor);

    const binding: Ibinding = {
        node: anchor,
        anchor,
        thunk,
        nodeList: [],
        keyList: [],
        childList: [],
        isDisposed: false,
        isRegion: true,
        apply: () => undefined
    };
    binding.apply = () => regionApply(binding);

    if (bindingActive) {
        bindingActive.childList.push(binding);
    }

    bindingRun(binding);

    return binding;
};

const bindingFlush = (): void => {
    isBindingFlushScheduled = false;

    const keyList = [...bindingFlushSet];
    bindingFlushSet.clear();

    const runList: Ibinding[] = [];

    for (let a = 0; a < keyList.length; a++) {
        const bindingList = bindingSubscriberObject[keyList[a]];

        if (!bindingList) {
            continue;
        }

        const bindingListCopy = [...bindingList];

        for (let b = 0; b < bindingListCopy.length; b++) {
            const binding = bindingListCopy[b];

            if (runList.indexOf(binding) === -1) {
                runList.push(binding);
            }
        }
    }

    for (let a = 0; a < runList.length; a++) {
        const binding = runList[a];

        if (binding.isDisposed) {
            continue;
        }

        if (binding.node && !binding.node.isConnected) {
            bindingDispose(binding);

            continue;
        }

        bindingRun(binding);
    }

    if (bindingFlushCallback) {
        bindingFlushCallback();
    }
};

export const bindingNotify = (key: string): boolean => {
    const bindingList = bindingSubscriberObject[key];

    if (!bindingList || bindingList.length === 0) {
        return false;
    }

    bindingFlushSet.add(key);

    if (!isBindingFlushScheduled) {
        isBindingFlushScheduled = true;

        Promise.resolve().then(bindingFlush);
    }

    return true;
};

export const bindingHasController = (controllerName: string): boolean => {
    const prefix = `${controllerName}::`;
    const keyList = Object.keys(bindingSubscriberObject);

    for (let a = 0; a < keyList.length; a++) {
        if (keyList[a].indexOf(prefix) === 0 && bindingSubscriberObject[keyList[a]].length > 0) {
            return true;
        }
    }

    return false;
};

export const bindingReset = (): void => {
    const keyList = Object.keys(bindingSubscriberObject);

    for (let a = 0; a < keyList.length; a++) {
        delete bindingSubscriberObject[keyList[a]];
    }

    bindingFlushSet.clear();
    isBindingFlushScheduled = false;
    bindingActive = null;
};

const safeHtml = (html: string): string => {
    const template = document.createElement("template");
    template.innerHTML = html;

    const blockElementList = ["script", "iframe", "object", "embed", "applet", "meta", "link", "style"].join(",");

    const blockElementNodeList = template.content.querySelectorAll(blockElementList);

    for (let a = 0; a < blockElementNodeList.length; a++) {
        blockElementNodeList[a].remove();
    }

    const elementList = template.content.querySelectorAll("*");

    for (let a = 0; a < elementList.length; a++) {
        const element = elementList[a];

        const attributeList = [...element.attributes];

        for (let b = 0; b < attributeList.length; b++) {
            const attribute = attributeList[b];

            const name = attribute.name.toLowerCase();
            const value = attribute.value.trim();

            if (name.startsWith("on")) {
                element.removeAttribute(attribute.name);

                continue;
            }

            if (name === "href" || name === "src" || name === "xlink:href" || name === "action" || name === "formaction") {
                const normalized = value.replace(/\s+/g, "").toLowerCase();

                const isJs = normalized.startsWith("javascript:");
                const isHtmlData = normalized.startsWith("data:text/html");
                const isUnsafeData = normalized.startsWith("data:") && !normalized.startsWith("data:image/");

                if (isJs || isHtmlData || isUnsafeData) {
                    element.removeAttribute(attribute.name);
                }
            }

            if (name === "srcdoc") {
                element.removeAttribute(attribute.name);
            }
        }
    }

    return template.innerHTML;
};

const applyProperty = (element: Element, key: string, valueNew: TvirtualNodeProperty, valueOld?: TvirtualNodeProperty): void => {
    if (key === "jsmvcfw-html") {
        if (typeof valueNew === "string") {
            element.innerHTML = safeHtml(valueNew);
        } else {
            element.innerHTML = "";
        }

        return;
    }

    if (key.startsWith("on") && typeof valueNew === "function") {
        const eventName = key.slice(2).toLowerCase();

        if (typeof valueOld === "function") {
            element.removeEventListener(eventName, valueOld);
        }

        element.addEventListener(eventName, valueNew);
    } else if (typeof valueNew === "boolean") {
        if (key === "selected" && "selected" in element) {
            element.selected = valueNew;
        } else if (key === "checked" && "checked" in element) {
            element.checked = valueNew;
        }

        valueNew ? element.setAttribute(key, "") : element.removeAttribute(key);
    } else if (typeof valueNew === "string" || typeof valueNew === "number") {
        if (key === "value" && "value" in element) {
            element.value = valueNew.toString();
        }

        element.setAttribute(key, valueNew.toString());
    } else if (Array.isArray(valueNew)) {
        let stringValue = "";

        for (let a = 0; a < valueNew.length; a++) {
            const value = valueNew[a];

            if (typeof value === "string") {
                stringValue += value + " ";
            }
        }

        element.setAttribute(key, stringValue.trim());
    } else if (valueNew == null) {
        if (key === "selected" && "selected" in element) {
            element.selected = false;
        } else if (key === "checked" && "checked" in element) {
            element.checked = false;
        } else if (key === "value" && "value" in element) {
            element.value = "";
        }

        element.removeAttribute(key);
    }
};

const updateProperty = (element: Element, oldObject: Record<string, TvirtualNodeProperty>, newObject: Record<string, TvirtualNodeProperty>): void => {
    const oldKeyList = Object.keys(oldObject);

    for (let a = 0; a < oldKeyList.length; a++) {
        const key = oldKeyList[a];

        if (!(key in newObject)) {
            if (key === "jsmvcfw-html") {
                element.innerHTML = "";
            } else if (key.startsWith("on") && typeof oldObject[key] === "function") {
                element.removeEventListener(key.slice(2).toLowerCase(), oldObject[key]);
            } else {
                element.removeAttribute(key);
            }
        }
    }

    const entryList = Object.entries(newObject);

    for (let a = 0; a < entryList.length; a++) {
        const entry = entryList[a];
        const key = entry[0];
        const value = entry[1];

        const valueOld = oldObject[key];

        if (value !== valueOld) {
            applyProperty(element, key, value, valueOld);
        }
    }
};

const updateChildren = (element: Element, nodeOldListValue: IvirtualNode["childrenList"], nodeNewListValue: IvirtualNode["childrenList"]): void => {
    const nodeOldList = Array.isArray(nodeOldListValue) ? nodeOldListValue : [];
    const nodeNewList = Array.isArray(nodeNewListValue) ? nodeNewListValue : [];
    const controllerNameNewObject = {} as Record<string, boolean>;

    for (let a = 0; a < nodeNewList.length; a++) {
        const node = nodeNewList[a];

        if (typeof node === "object" && node.propertyObject) {
            const controllerName = node.propertyObject["jsmvcfw-controllerName"];

            if (typeof controllerName === "string") {
                controllerNameNewObject[controllerName] = true;
            }
        }
    }

    const isControllerNameRemovable = (nodeDom: Node): boolean => {
        if (nodeDom.nodeType !== Node.ELEMENT_NODE) {
            return true;
        }

        const elementDom = nodeDom as Element;

        if (!elementDom.hasAttribute("jsmvcfw-controllername")) {
            return true;
        }

        const controllerName = elementDom.getAttribute("jsmvcfw-controllername");

        return !controllerName || !controllerNameNewObject[controllerName];
    };

    const keyOldObject = {} as Record<string, { node: IvirtualNode; dom: Element }>;

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
            if (isControllerNameRemovable(nodeDom)) {
                element.removeChild(nodeDom);
            }

            continue;
        }

        if (typeof nodeNew === "function") {
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
            const isElementNode = nodeDom !== null && nodeDom !== undefined && nodeDom.nodeType === Node.ELEMENT_NODE;

            const isControllerName = isElementNode && (nodeDom as Element).hasAttribute("jsmvcfw-controllername");

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

        if (isControllerNameRemovable(nodeExtra)) {
            element.removeChild(nodeExtra);
        } else {
            break;
        }
    }
};

export const createVirtualNode = (node: IvirtualNode): HTMLElement => {
    const element = document.createElement(node.tag);

    const entryList = Object.entries(node.propertyObject || {});

    for (let a = 0; a < entryList.length; a++) {
        const [key, value] = entryList[a];

        if (typeof value === "function" && !key.startsWith("on")) {
            bindingCreate(element, () => {
                applyProperty(element, key, (value as () => TvirtualNodeProperty)());
            });
        } else {
            applyProperty(element, key, value);
        }
    }

    if (Array.isArray(node.childrenList)) {
        for (let a = 0; a < node.childrenList.length; a++) {
            const child = node.childrenList[a];

            if (typeof child === "function") {
                bindingCreateRegion(element, child);
            } else if (typeof child === "string") {
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

    const propertyOld = nodeOld.propertyObject || {};
    const propertyNew = nodeNew.propertyObject || {};

    updateProperty(element, propertyOld || {}, propertyNew || {});

    if ("jsmvcfw-html" in propertyNew) {
        return;
    }

    updateChildren(element, nodeOld.childrenList, nodeNew.childrenList);
};
