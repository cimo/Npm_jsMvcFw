"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.navigateTo = exports.routerInit = void 0;
const JsMvcFwConstant_1 = require("./JsMvcFwConstant");
const JsMvcFw_1 = require("./JsMvcFw");
let elementRoot = null;
let routerList = [];
const controllerList = [];
const variableList = [];
const routerInit = (value) => {
    elementRoot = document.querySelector("#jsmvcfw_app");
    routerList = value;
    (0, JsMvcFw_1.writeLog)("JsMvcFwRouter.ts", "routerInit", { routerList });
    for (const [key, value] of routerList.entries()) {
        controllerList.push(value.controller());
        variableList.push(controllerList[key].variableList());
    }
    window.onload = (event) => {
        (0, JsMvcFw_1.writeLog)("JsMvcFwRouter.ts", "onload", { pathname: window.location.pathname });
        if (event) {
            for (const [key, value] of controllerList.entries()) {
                value.create(variableList[key]);
            }
            populatePage(false, window.location.pathname);
        }
    };
    window.onpopstate = (event) => {
        (0, JsMvcFw_1.writeLog)("JsMvcFwRouter.ts", "onpopstate", { pathname: window.location.pathname });
        if (event) {
            populatePage(false, window.location.pathname);
        }
    };
    window.onunload = (event) => {
        (0, JsMvcFw_1.writeLog)("JsMvcFwRouter.ts", "onunload", {});
        if (event) {
            for (const [key, value] of controllerList.entries()) {
                value.destroy(variableList[key]);
            }
        }
    };
};
exports.routerInit = routerInit;
const navigateTo = (event, nextUrl, parameterList, parameterSearch) => {
    (0, JsMvcFw_1.writeLog)("JsMvcFwRouter.ts", "navigateTo", { event, nextUrl, parameterList, parameterSearch });
    if (event) {
        event.preventDefault();
    }
    populatePage(true, nextUrl, parameterList, parameterSearch);
};
exports.navigateTo = navigateTo;
const populatePage = (isHistoryPushEnabled, nextUrl, parameterList, parameterSearch) => {
    let isNotFound = false;
    if (elementRoot) {
        for (const [key, value] of routerList.entries()) {
            if (value.path === nextUrl) {
                if (isHistoryPushEnabled && JsMvcFwConstant_1.JSMVCFW_PUBLIC_PATH) {
                    const publicPathReplace = JsMvcFwConstant_1.JSMVCFW_PUBLIC_PATH.replace(/\/+$/, "");
                    const newUrl = publicPathReplace + nextUrl;
                    window.history.pushState({ previousUrl: window.location.pathname, parameterList }, "", newUrl);
                    if (parameterSearch) {
                        window.location.search = parameterSearch;
                    }
                }
                document.title = value.title;
                elementRoot.innerHTML = controllerList[key].view(variableList[key]);
                controllerList[key].event(variableList[key]);
                isNotFound = false;
                break;
            }
            else {
                isNotFound = true;
            }
        }
        if (isNotFound) {
            window.history.pushState({ previousUrl: window.location.pathname, parameterList }, "", "/404");
            document.title = "404";
            elementRoot.innerHTML = "Route not found!";
        }
    }
    else {
        throw new Error("#jsmvcfw_app not found!");
    }
};
//# sourceMappingURL=JsMvcFwRouter.js.map