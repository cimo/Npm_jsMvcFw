// Source
import { getAppLabel } from "./JsMvcFw.js";

const isJson = (value: string): boolean => {
    try {
        JSON.parse(value);

        return true;
    } catch {
        return false;
    }
};

export const writeStorage = <T>(tag: string, value: T): void => {
    const encodedData = window.btoa(encodeURIComponent(JSON.stringify(value)));

    localStorage.setItem(`${getAppLabel()}_${tag}`, encodedData);
};

export const readStorage = <T>(tag: string): T | undefined => {
    let result: T | undefined;

    const storage = localStorage.getItem(`${getAppLabel()}_${tag}`);

    if (storage) {
        const decoded = decodeURIComponent(window.atob(storage));

        if (isJson(decoded)) {
            result = JSON.parse(decoded) as T;
        }
    }

    return result;
};

export const deleteStorage = (tag: string): void => {
    localStorage.removeItem(`${getAppLabel()}_${tag}`);
};
