import { writeLog } from "./JsMvcFw";

export const sendRequest = async<T extends unknown>(url: string, method: string, data?: Record<string, unknown>, headersValue?: HeadersInit, modeValue?: RequestMode, cacheValue?: RequestCache, credentialsValue?: RequestCredentials, redirectValue?: RequestRedirect, referrerPolicyValue?: ReferrerPolicy): Promise<T> => {
    const headers = headersValue ? headersValue : { "Content-Type": "application/json" };
    const mode = modeValue ? modeValue : "cors";
    const cache = cacheValue ? cacheValue : "no-cache";
    const credentials = credentialsValue ? credentialsValue : "same-origin";
    const redirect = redirectValue ? redirectValue : "follow";
    const referrerPolicy = referrerPolicyValue ? referrerPolicyValue : "no-referrer";

    if (data) {
        const result = await fetch(url, {method, mode, cache, credentials, headers, redirect, referrerPolicy, body: JSON.stringify(data)});

        return result.json();
    }

    const result = await fetch(url, {method, mode, cache, credentials, headers: headers, redirect, referrerPolicy});

    writeLog("JsMvcFwRequest.ts", "sendRequest", { result });

    return result.json();
};
