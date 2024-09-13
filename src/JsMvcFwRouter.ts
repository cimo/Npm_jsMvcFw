import { Irouter, Icontroller, IvariableState } from "./JsMvcFwInterface";
import { urlRoot, writeLog } from "./JsMvcFw";

let elementRoot: Element | null = null;
let routerList: Irouter[] = [];
const controllerList: Icontroller[] = [];
const variableList: Record<string, IvariableState>[] = [];

export const routerInit = (routerListValue: Irouter[]) => {
    elementRoot = document.querySelector("#jsmvcfw_app");
    routerList = routerListValue;

    writeLog("JsMvcFwRouter.ts - routerInit", { routerList });

    for (const [key, value] of routerList.entries()) {
        controllerList.push(value.controller());
        variableList.push(controllerList[key].variableList());
    }

    window.onload = (event: Event) => {
        writeLog("JsMvcFwRouter.ts - onload", window.location.pathname);

        if (event) {
            populatePage(false, window.location.pathname);

            for (const [key, value] of controllerList.entries()) {
                value.create(variableList[key]);
            }
        }
    };

    window.onpopstate = (event: PopStateEvent) => {
        writeLog("JsMvcFwRouter.ts - onpopstate", window.location.pathname);

        if (event) {
            populatePage(false, window.location.pathname);
        }
    };

    window.onunload = (event: Event) => {
        writeLog("JsMvcFwRouter.ts - onunload", { event });

        if (event) {
            for (const [key, value] of controllerList.entries()) {
                value.destroy(variableList[key]);
            }
        }
    };
};

export const navigateTo = (event: Event | undefined, nextUrl: string, parameterList?: Record<string, unknown>, parameterSearch?: string) => {
    writeLog("JsMvcFwRouter.ts - navigateTo", { event, nextUrl, parameterList, parameterSearch });

    if (event) {
        event.preventDefault();
    }

    populatePage(true, nextUrl, parameterList, parameterSearch);
};

const populatePage = (isHistoryPushEnabled: boolean, nextUrl: string, parameterList?: Record<string, unknown>, parameterSearch?: string) => {
    let isNotFound = false;

    if (elementRoot) {
        for (const [key, value] of routerList.entries()) {
            if (value.path === nextUrl) {
                if (isHistoryPushEnabled && urlRoot) {
                    const urlRootReplace = urlRoot.replace(/\/+$/, "");

                    routerHistoryPush(`${urlRootReplace}${nextUrl}`, parameterList);

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
            routerHistoryPush("/404", parameterList);

            document.title = "404";

            elementRoot.innerHTML = "Route not found!";
        }
    } else {
        throw new Error("#jsmvcfw_app not found!");
    }
};

const routerHistoryPush = (nextUrl: string, paramterListValue?: Record<string, unknown>, title = "", soft = false): void => {
    let url = nextUrl;

    if (nextUrl.charAt(0) === "/") {
        url = nextUrl.slice(1);
    }

    window.history.pushState(
        {
            previousUrl: window.location.pathname,
            parameterList: paramterListValue
        },
        title,
        url
    );

    if (!soft) {
        window.location.href = url;
    }
};
