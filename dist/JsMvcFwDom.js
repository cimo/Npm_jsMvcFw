"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseView = void 0;
const JsMvcFw_1 = require("./JsMvcFw");
const parseView = (html) => {
    const parser = new DOMParser();
    const test = parser.parseFromString(html, "text/html");
    (0, JsMvcFw_1.writeLog)("JsMvcFwDom.ts", "parseView", { test });
    const result = html;
    return result;
};
exports.parseView = parseView;
const clearHtml = (html) => {
    const parser = new DOMParser();
    const text = parser.parseFromString(html, "text/html");
    return text.body;
};
//# sourceMappingURL=JsMvcFwDom.js.map