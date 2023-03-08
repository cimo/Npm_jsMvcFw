"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readCookieDecoded = exports.writeCookieEncoded = exports.variableState = exports.checkEnvVariable = exports.writeLog = exports.mainInit = void 0;
const JsMvcFwConstant_1 = require("./JsMvcFwConstant");
const TIME_COOKIE = 60 * 60 * 24 * 365;
let isDebug = false;
const mainInit = (isDebugValue = false) => {
    isDebug = isDebugValue;
    (0, exports.writeLog)("JsMvcFw.ts", "mainInit", { isDebug });
};
exports.mainInit = mainInit;
const writeLog = (file, tag, value) => {
    if (JsMvcFwConstant_1.JSMVCFW_DEBUG && isDebug) {
        console.log(`writeLog => ${file} - ${tag}: `, value);
    }
};
exports.writeLog = writeLog;
const checkEnvVariable = (key, value) => {
    (0, exports.writeLog)("JsMvcFw.ts", "checkEnvVariable", { key, value });
    if (value === undefined) {
        const text = `${key} is not defined!`;
        document.body.innerHTML = text;
        throw new Error(text);
    }
    return value;
};
exports.checkEnvVariable = checkEnvVariable;
const variableState = (variableValue) => {
    (0, exports.writeLog)("JsMvcFw.ts", "variableState", { this: this, variableValue });
    const randomTag = Math.floor(Math.random() * 1000000).toString();
    let privateValue = variableValue;
    const privateEvent = new Event(randomTag);
    return {
        set state(stateValue) {
            privateValue = stateValue;
            document.dispatchEvent(privateEvent);
        },
        get state() {
            return privateValue;
        },
        listener: (callback) => {
            document.addEventListener(randomTag, () => {
                if (callback) {
                    callback(privateValue);
                }
            });
        }
    };
};
exports.variableState = variableState;
const writeCookieEncoded = (tag, value, path = "/", time = TIME_COOKIE) => {
    const valueEncoded = window.btoa(encodeURIComponent(JSON.stringify(value)));
    (0, exports.writeLog)("JsMvcFw.ts", "storeWriteCookie", { valueEncoded });
    document.cookie = `${tag}=${valueEncoded};path=${path};max-age=${time};secure;samesite`;
};
exports.writeCookieEncoded = writeCookieEncoded;
const readCookieDecoded = (tag) => {
    const result = document.cookie.match(new RegExp(`${tag}=([^;]+)`));
    if (result) {
        const valueDecoded = JSON.parse(decodeURIComponent(window.atob(result[1])));
        (0, exports.writeLog)("JsMvcFw.ts", "storeReadCookie", { valueDecoded });
        return valueDecoded;
    }
    return result;
};
exports.readCookieDecoded = readCookieDecoded;
//# sourceMappingURL=JsMvcFw.js.map