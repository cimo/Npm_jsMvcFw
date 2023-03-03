import { ItemList } from "./JsMvcFwInterface";
import { writeLog } from "./JsMvcFw";

export const storeSet = (tag: string, valueList: ItemList) => {
    const resultList = storeGet(tag);

    for (const [key, value] of Object.entries(valueList.data)) {
        resultList.data[key] = value;
    }

    writeLog("JsMvcFwStore.ts", "storeSet", { tag, valueList, resultList });

    localStorage.setItem(tag, JSON.stringify(resultList));
};

export const storeGet = (tag: string): ItemList => {
    let resultList: ItemList = { data: {} };

    const storageItem = localStorage.getItem(tag);

    if (storageItem) {
        resultList.data = JSON.parse(storageItem).data;
    }

    writeLog("JsMvcFwStore.ts", "storeGet", { tag, resultList });

    return resultList;
};

export const storeRemove = (tag: string) => {
    writeLog("JsMvcFwStore.ts", "storeRemove", { tag });

    localStorage.removeItem(tag);
};
