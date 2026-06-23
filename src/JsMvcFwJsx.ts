// Source
import { IvirtualNode, TvirtualNodeChildren, IvirtualNodeTag } from "./JsMvcFwInterface.js";

const stackErrorDetail = (): string => {
    const stack = new Error().stack;

    if (!stack) {
        return "unknown";
    }

    const stackSplit = stack.split("\n");

    if (!stackSplit[2]) {
        return "unknown";
    }

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
        const tagObject = {} as IvirtualNodeTag;

        for (let a = 0; a < childrenListValue.length; a++) {
            const childEntry = childrenListValue[a];
            const isFromArray = Array.isArray(childEntry);

            const childrenList = isFromArray ? childEntry : [childEntry];

            for (let b = 0; b < childrenList.length; b++) {
                const children = childrenList[b];

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
        const tagList = Object.keys(tagObject);

        for (let a = 0; a < tagList.length; a++) {
            const tag = tagList[a];
            const group = tagObject[tag];
            const keyMissingList = [];

            for (let b = 0; b < group.length; b++) {
                if (group[b].node.key === undefined) {
                    keyMissingList.push(group[b]);
                }
            }

            let isAllFromArray = true;

            for (let b = 0; b < group.length; b++) {
                if (!group[b].isFromArray) {
                    isAllFromArray = false;

                    break;
                }
            }

            if (group.length > 1 && keyMissingList.length > 0 && isAllFromArray) {
                throw new Error(
                    `@cimo/jsmvcfw - JsMvcFwJsx.ts - checkDynamicElement() => ${errorDetail}, multiple <${tag}> elements missing key tag!`
                );
            }
        }
    }
};

const flattenChildren = (input: unknown, out: Array<IvirtualNode | string | (() => unknown)>): void => {
    if (input == null) {
        return;
    }

    if (typeof input === "function") {
        out.push(input as () => unknown);

        return;
    }

    if (Array.isArray(input)) {
        for (let a = 0; a < input.length; a++) {
            flattenChildren(input[a], out);
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
    tag: string | ((props: { childrenList: Array<IvirtualNode | string | (() => unknown)> }) => Array<IvirtualNode | string | (() => unknown)>),
    propertyObjectValue: IvirtualNode["propertyObject"] = {},
    ...childrenListValue: TvirtualNodeChildren[]
): IvirtualNode | Array<IvirtualNode | string | (() => unknown)> => {
    const childrenList: Array<IvirtualNode | string | (() => unknown)> = [];

    for (let a = 0; a < childrenListValue.length; a++) {
        flattenChildren(childrenListValue[a], childrenList);
    }

    checkDynamicElement(childrenListValue);

    const { key, ...propertyObject } = propertyObjectValue || {};

    if (typeof tag === "function") {
        return tag({ childrenList: childrenList });
    }

    return {
        tag,
        propertyObject,
        childrenList,
        key: key !== undefined ? String(key) : undefined
    };
};

export const jsxFragment = ({ childrenList }: { childrenList: Array<IvirtualNode | string | (() => unknown)> }) => childrenList;
