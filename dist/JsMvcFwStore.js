"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeRemove = exports.storeGet = exports.storeSet = void 0;
const JsMvcFw_1 = require("./JsMvcFw");
const storeSet = (tag, valueList) => {
    const resultList = (0, exports.storeGet)(tag);
    for (const [key, value] of Object.entries(valueList.data)) {
        resultList.data[key] = value;
    }
    (0, JsMvcFw_1.writeLog)("JsMvcFwStore.ts", "storeSet", { tag, valueList, resultList });
    localStorage.setItem(tag, JSON.stringify(resultList));
};
exports.storeSet = storeSet;
const storeGet = (tag) => {
    let resultList = { data: {} };
    const storageItem = localStorage.getItem(tag);
    if (storageItem) {
        resultList.data = JSON.parse(storageItem).data;
    }
    (0, JsMvcFw_1.writeLog)("JsMvcFwStore.ts", "storeGet", { tag, resultList });
    return resultList;
};
exports.storeGet = storeGet;
const storeRemove = (tag) => {
    (0, JsMvcFw_1.writeLog)("JsMvcFwStore.ts", "storeRemove", { tag });
    localStorage.removeItem(tag);
};
exports.storeRemove = storeRemove;
//# sourceMappingURL=JsMvcFwStore.js.map