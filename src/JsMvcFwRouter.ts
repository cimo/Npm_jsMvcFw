import { JSMVCFW_PUBLIC_PATH } from "./JsMvcFwConstant";
import { Router, Controller, VariableState } from "./JsMvcFwInterface";
import { writeLog } from "./JsMvcFw";

let elementRoot: Element | null = null;
let routerList: Router[] = [];
const controllerList: Controller[] = [];
const variableList: Record<string, VariableState>[] = [];

export const routerInit = (value: Router[]) => {
    elementRoot = document.querySelector("#jsmvcfw_app");
    routerList = value;

    writeLog("JsMvcFwRouter.ts", "routerInit", { routerList });

    for (const [key, value] of routerList.entries()) {
        controllerList.push(value.controller());
        variableList.push(controllerList[key].variableList());
    }

    window.onload = (event: Event) => {
        writeLog("JsMvcFwRouter.ts", "onload", { pathname: window.location.pathname });

        if (event) {
            for (const [key, value] of controllerList.entries()) {
                value.create(variableList[key]);

                /*for (const [keySub, valueSub] of Object.entries(variableList[key])) {
                    valueSub.listener(() => {
                        populatePage(false, window.location.pathname);
                    });
                }*/
            }

            populatePage(false, window.location.pathname);
        }
    }

    window.onpopstate = (event: PopStateEvent) => {
        writeLog("JsMvcFwRouter.ts", "onpopstate", { pathname: window.location.pathname });

        if (event) {
            populatePage(false, window.location.pathname);
        }
    };

    window.onunload = (event: Event) => {
        writeLog("JsMvcFwRouter.ts", "onunload", {});

        if (event) {
            for (const [key, value] of controllerList.entries()) {
                value.destroy(variableList[key]);
            }
        }
    };
};

export const navigateTo = (event: Event | undefined, nextUrl: string, parameterList?: Record<string, unknown>, parameterSearch?: string) => {
    writeLog("JsMvcFwRouter.ts", "navigateTo", { event, nextUrl, parameterList, parameterSearch });

    if (event) {
        event.preventDefault();
    }

    populatePage(true, nextUrl, parameterList, parameterSearch);
};

export const checkPreviousUrl = (): boolean => {
    let result = false;

    result = routerList.includes(window.history.state.previousUrl);

    writeLog("JsMvcFwRouter.ts", "checkPreviousUrl", { result });

    return result;
};

const populatePage = (isHistoryPushEnabled: boolean, nextUrl: string, parameterList?: Record<string, unknown>, parameterSearch?: string) => {
    let isNotFound = false;

    if (elementRoot) {
        for (const [key, value] of routerList.entries()) {
            if (value.path === nextUrl) {
                if (isHistoryPushEnabled && JSMVCFW_PUBLIC_PATH) {
                    const publicPathReplace = JSMVCFW_PUBLIC_PATH.replace(/\/+$/, "");
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
            } else {
                isNotFound = true;
            }
        }

        if (isNotFound) {
            window.history.pushState({ previousUrl: window.location.pathname, parameterList }, "", "/404");

            document.title = "404";

            elementRoot.innerHTML = "Route not found!";
        }
    } else {
        throw new Error("#jsmvcfw_app not found!");
    }
};
