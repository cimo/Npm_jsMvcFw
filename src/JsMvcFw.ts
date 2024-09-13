import { IvariableState } from "./JsMvcFwInterface";

let isDebug = false;

export let urlRoot = "";

export const mainInit = (isDebugValue = false, urlRootValue = "/") => {
    isDebug = isDebugValue;
    urlRoot = urlRootValue;

    writeLog("JsMvcFw.ts - mainInit", { isDebug, urlRoot });
};

export const writeLog = (tag: string, value: string | Record<string, unknown>) => {
    if (isDebug) {
        // eslint-disable-next-line no-console
        console.log(`WriteLog => ${tag}: `, value);
    }
};

export const checkEnv = (key: string, value: string): string => {
    writeLog("JsMvcFw.ts - checkEnv", { key, value });

    if (value === undefined) {
        const text = `${key} is not defined!`;

        document.body.innerHTML = text;
        throw new Error(text);
    }

    return value;
};

export const writeCookie = <T>(tag: string, value: T, expire = "", httpOnly = "", path = "/"): void => {
    const encodedData = window.btoa(encodeURIComponent(JSON.stringify(value)));

    document.cookie = `${tag}=${encodedData};expires=${expire};${httpOnly};path=${path};Secure`;
};

export const readCookie = <T>(tag: string): T | undefined => {
    let result: T | undefined;

    const name = escapeRegExp(tag);
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

export const variableState = <T>(variableValue: T): IvariableState => {
    writeLog("JsMvcFw.ts - variableState", { this: this, variableValue });

    const randomTag = Math.floor(Math.random() * 1000000).toString();

    let privateValue: T = variableValue;
    const privateEvent = new Event(randomTag);

    return {
        set state(stateValue) {
            privateValue = stateValue;

            document.dispatchEvent(privateEvent);
        },
        get state() {
            return privateValue;
        },
        listener: (callback: (privateValue: T) => void) => {
            document.addEventListener(randomTag, () => {
                if (callback) {
                    callback(privateValue);
                }
            });
        }
    } as IvariableState;
};

const escapeRegExp = (value: string): string => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const isBase64 = (value: string): boolean => {
    return /^[A-Za-z0-9+/]*={0,2}$/.test(value) && value.length % 4 === 0;
};

const isJson = (value: string): boolean => {
    return /^[\],:{}\s]*$/.test(
        value
            .replace(/\\["\\/bfnrtu]/g, "@")
            .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?/g, "]")
            .replace(/(?:^|:|,)(?:\s*\[)+/g, "")
    );
};
