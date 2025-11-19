// Source
import { getAppLabel } from "./JsMvcFw";

export const writeStorage = <T>(tag: string, value: T): void => {
    const encodedData = window.btoa(encodeURIComponent(JSON.stringify(value)));

    localStorage.setItem(`${getAppLabel()}_${tag}`, encodedData);
};

export const readStorage = <T>(tag: string): T | undefined => {
    let result: T | undefined;

    const storage = localStorage.getItem(`${getAppLabel()}_${tag}`);

    if (storage) {
        result = JSON.parse(decodeURIComponent(window.atob(storage))) as T;
    }

    return result;
};

export const removeStorage = (tag: string): void => {
    localStorage.removeItem(`${getAppLabel()}_${tag}`);
};
