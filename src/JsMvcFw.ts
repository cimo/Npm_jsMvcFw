import { IvariableState } from "./JsMvcFwInterface";

let isDebug = false;
const variableStateEventList = new Set<string>();

export let urlRoot = "";
export let systemLabel = "";

export const mainInit = (isDebugValue = false, urlRootValue = "/", labelValue = "") => {
    isDebug = isDebugValue;
    urlRoot = urlRootValue;
    systemLabel = labelValue;

    writeLog("JsMvcFw.ts - mainInit", { isDebug, urlRoot, labelValue });
};

export const variableState = <T>(name: string, value: T): IvariableState<T> => {
    if (variableStateEventList.has(name)) {
        throw new Error(`JsMvcFw.ts - variableState: Event "${name}" already exists!`);
    }

    let currentValue: T = value;
    const eventPrivate = new Event(name);

    variableStateEventList.add(name);

    return {
        set state(newValue: T) {
            currentValue = newValue;

            writeLog("JsMvcFw.ts - variableState - set state", { name, currentValue });

            document.dispatchEvent(eventPrivate);
        },
        get state(): T {
            return currentValue;
        },
        listener: (callback: (callbackValue: T) => void) => {
            document.addEventListener(name, () => {
                writeLog("JsMvcFw.ts - variableState - listener", { name, currentValue });

                if (callback) {
                    callback(currentValue);
                }
            });
        }
    };
};

export const writeLog = (tag: string, value: string | Record<string, unknown> | Error): void => {
    if (isDebug) {
        // eslint-disable-next-line no-console
        console.log(`WriteLog => ${tag}: `, value);
    }
};

export const checkEnv = (key: string, value: string | undefined): string => {
    if (typeof process !== "undefined" && value === undefined) {
        writeLog("JsMvcFw.ts - checkEnv", `${key} is not defined!`);
    }

    return value ? value : "";
};

export const writeCookie = <T>(tag: string, value: T, expire = "", httpOnly = "", path = "/"): void => {
    const encodedData = window.btoa(encodeURIComponent(JSON.stringify(value)));

    document.cookie = `${systemLabel}_${tag}=${encodedData};expires=${expire};${httpOnly};path=${path};Secure`;
};

export const readCookie = <T>(tag: string): T | undefined => {
    let result: T | undefined;

    const name = escapeRegExp(`${systemLabel}_${tag}`);
    const resultMatch = document.cookie.match(new RegExp(`${name}=([^;]+)`));

    if (resultMatch) {
        let cookie = resultMatch[1];

        if (isBase64(cookie.replaceAll('"', ""))) {
            cookie = window.atob(cookie.replaceAll('"', ""));
        }

        const decodeUriCookie = decodeURIComponent(cookie);

        if (isJson(decodeUriCookie)) {
            result = JSON.parse(decodeUriCookie) as T;
        } else {
            result = decodeUriCookie as T;
        }
    }

    return result;
};

export const removeCookie = (tag: string): void => {
    document.cookie = `${systemLabel}_${tag}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

export const writeStorage = <T>(tag: string, value: T): void => {
    const encodedData = window.btoa(encodeURIComponent(JSON.stringify(value)));

    localStorage.setItem(`${systemLabel}_${tag}`, encodedData);
};

export const readStorage = <T>(tag: string): T | undefined => {
    let result: T | undefined;

    const storage = localStorage.getItem(`${systemLabel}_${tag}`);

    if (storage) {
        result = JSON.parse(decodeURIComponent(window.atob(storage))) as T;
    }

    return result;
};

export const removeStorage = (tag: string): void => {
    localStorage.removeItem(`${systemLabel}_${tag}`);
};

export const isJson = (value: string): boolean => {
    return /^[\],:{}\s]*$/.test(
        value
            .replace(/\\["\\/bfnrtu]/g, "@")
            .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/g, "]")
            .replace(/(?:^|:|,)(?:\s*\[)+/g, "")
    );
};

export const isBase64 = (value: string): boolean => {
    return /^[A-Za-z0-9+/]*={0,2}$/.test(value) && value.length % 4 === 0;
};

export const escapeRegExp = (value: string): string => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
