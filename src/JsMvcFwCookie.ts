// Source
import { getAppLabel } from "./JsMvcFw";

const isJson = (value: string): boolean => {
    try {
        JSON.parse(value);

        return true;
    } catch {
        return false;
    }
};

const isBase64 = (value: string): boolean => {
    return /^[A-Za-z0-9+/]*={0,2}$/.test(value) && value.length % 4 === 0;
};

const escapeRegExp = (value: string): string => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const writeCookie = <T>(tag: string, value: T, expire = "", httpOnly = "", path = "/"): void => {
    const encodedData = window.btoa(encodeURIComponent(JSON.stringify(value)));

    document.cookie = `${getAppLabel()}_${tag}=${encodedData};expires=${expire};${httpOnly};path=${path};Secure`;
};

export const readCookie = <T>(tag: string): T | undefined => {
    let result: T | undefined;

    const name = escapeRegExp(`${getAppLabel()}_${tag}`);
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
    document.cookie = `${getAppLabel()}_${tag}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};
