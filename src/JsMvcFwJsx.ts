// Source
import { IvirtualNode, TvirtualNodeChildren } from "./JsMvcFwInterface.js";

const stackErrorDetail = (): string => {
    const stack = new Error().stack;

    if (!stack) {
        return "unknown";
    }

    const stackSplit = stack.split("\n");

    const callerLine = stackSplit[2].trim() || "unknown";

    return callerLine.charAt(0).toUpperCase() + callerLine.slice(1).toLowerCase();
};

const checkDynamicElement = (childrenListValue: TvirtualNodeChildren[]): void => {
    let isDynamic = false;

    for (let a = 0; a < childrenListValue.length; a++) {
        if (Array.isArray(childrenListValue[a])) {
            isDynamic = true;

            break;
        }
    }

    if (isDynamic) {
        const tagObject: Record<string, { node: IvirtualNode; isFromArray: boolean }[]> = {};

        for (let a = 0; a < childrenListValue.length; a++) {
            const childEntry = childrenListValue[a];
            const isFromArray = Array.isArray(childEntry);

            const childrenList = isFromArray ? childEntry : [childEntry];

            for (const children of childrenList) {
                const node = typeof children === "number" ? String(children) : children;

                if (typeof node === "object" && "tag" in node) {
                    if (!tagObject[node.tag]) {
                        tagObject[node.tag] = [];
                    }

                    tagObject[node.tag].push({ node, isFromArray });
                }
            }
        }

        const errorDetail = stackErrorDetail();

        for (const tag in tagObject) {
            const group = tagObject[tag];
            const keyMissingList = group.filter(({ node }) => node.key === undefined);
            const isAllFromArray = group.every(({ isFromArray }) => isFromArray);

            if (group.length > 1 && keyMissingList.length > 0 && isAllFromArray) {
                throw new Error(
                    `@cimo/jsmvcfw - JsMvcFwJsx.ts - checkDynamicElement() => ${errorDetail}, multiple <${tag}> elements missing key tag!`
                );
            }
        }
    }
};

const flattenChildren = (input: unknown, out: Array<IvirtualNode | string>): void => {
    if (input == null) {
        return;
    }

    if (Array.isArray(input)) {
        for (let i = 0; i < input.length; i++) {
            flattenChildren(input[i], out);
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

    if (typeof input === "object" && "tag" in (input as Record<string, unknown>)) {
        out.push(input as IvirtualNode);
    }
};

export const jsxFactory = (
    tag: string | ((props: { children: Array<IvirtualNode | string> }) => Array<IvirtualNode | string>),
    propertyObjectValue: IvirtualNode["propertyObject"] = {},
    ...childrenListValue: TvirtualNodeChildren[]
): IvirtualNode | Array<IvirtualNode | string> => {
    const childrenList: Array<IvirtualNode | string> = [];

    for (let a = 0; a < childrenListValue.length; a++) {
        flattenChildren(childrenListValue[a], childrenList);
    }

    checkDynamicElement(childrenListValue);

    const { key, ...propertyObject } = propertyObjectValue || {};

    if (typeof tag === "function") {
        return tag({ children: childrenList });
    }

    return {
        tag,
        propertyObject,
        childrenList,
        key: key !== undefined ? String(key) : undefined
    };
};

export const jsxFragment = ({ children }: { children: Array<IvirtualNode | string> }) => children;
