"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRequest = void 0;
const tslib_1 = require("tslib");
const JsMvcFw_1 = require("./JsMvcFw");
const sendRequest = (url, method, data, headersValue, modeValue, cacheValue, credentialsValue, redirectValue, referrerPolicyValue) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const headers = headersValue ? headersValue : { "Content-Type": "application/json" };
    const mode = modeValue ? modeValue : "cors";
    const cache = cacheValue ? cacheValue : "no-cache";
    const credentials = credentialsValue ? credentialsValue : "same-origin";
    const redirect = redirectValue ? redirectValue : "follow";
    const referrerPolicy = referrerPolicyValue ? referrerPolicyValue : "no-referrer";
    if (data) {
        const result = yield fetch(url, { method, mode, cache, credentials, headers, redirect, referrerPolicy, body: JSON.stringify(data) });
        return result.json();
    }
    const result = yield fetch(url, { method, mode, cache, credentials, headers: headers, redirect, referrerPolicy });
    (0, JsMvcFw_1.writeLog)("JsMvcFwRequest.ts", "sendRequest", { result });
    return result.json();
});
exports.sendRequest = sendRequest;
//# sourceMappingURL=JsMvcFwRequest.js.map