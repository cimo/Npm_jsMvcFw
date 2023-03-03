import { JSMVCFW_DEBUG } from "./JsMvcFwConstant";
import { VariableState } from "./JsMvcFwInterface";

const TIME_COOKIE = 60 * 60 * 24 * 365;
let isDebug = false;

export const mainInit = (isDebugValue = false) => {
    isDebug = isDebugValue;

    writeLog("JsMvcFw.ts", "mainInit", { isDebug });
};

export const writeLog = (file: string, tag: string, value: Record<string, unknown>) => {
    if (JSMVCFW_DEBUG && isDebug) {
        console.log(`writeLog => ${file} - ${tag}: `, value);
    }
};

export const checkEnvVariable = (key: string, value: string): string => {
    writeLog("JsMvcFw.ts", "checkEnvVariable", { key, value });

    if (value === undefined) {
        const text = `${key} is not defined!`;

        document.body.innerHTML = text;
        throw new Error(text);
    }

    return value;
};

export const variableState = <T extends unknown>(variableValue: T): VariableState => {
    writeLog("JsMvcFw.ts", "variableState", { this: this, variableValue });

    const randomTag = Math.floor(Math.random() * 1000000).toString();
    //const randomTag = "test";

    let privateValue: T = variableValue;
    const privateEvent = new Event(randomTag);

    const x = {
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
    } as VariableState

    return x;
};

export const writeCookieEncoded = (tag: string, value: Record<string, unknown>, path = "/", time = TIME_COOKIE) => {
    const valueEncoded = window.btoa(encodeURIComponent(JSON.stringify(value)));

    writeLog("JsMvcFw.ts", "storeWriteCookie", { valueEncoded });

    document.cookie = `${tag}=${valueEncoded};path=${path};max-age=${time};secure;samesite`;
};

export const readCookieDecoded = <T extends unknown>(tag: string): T => {
    const result = document.cookie.match(new RegExp(`${tag}=([^;]+)`));

    if (result) {
        const valueDecoded = JSON.parse(decodeURIComponent(window.atob(result[1])));

        writeLog("JsMvcFw.ts", "storeReadCookie", { valueDecoded });

        return valueDecoded as T;
    }

    return result as T;
};
