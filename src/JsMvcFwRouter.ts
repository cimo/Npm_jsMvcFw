import { Irouter, Icontroller, IvariableState } from "./JsMvcFwInterface";
import { writeLog, urlRoot } from "./JsMvcFw";
import { updateDataBind } from "./JsMvcFwDom";

let elementRoot: Element | null = null;
let routerList: Irouter[] = [];
const controllerList: Icontroller[] = [];
const variableList: Record<string, IvariableState<unknown>>[] = [];

export const routerInit = (routerListValue: Irouter[]) => {
    elementRoot = document.querySelector("#jsmvcfw_app");
    routerList = routerListValue;

    writeLog("JsMvcFwRouter.ts - routerInit", { routerList });

    window.onload = (event: Event) => {
        writeLog("JsMvcFwRouter.ts - onload", window.location.pathname);

        if (event) {
            for (const [key, value] of routerList.entries()) {
                controllerList.push(value.controller());
                variableList.push(controllerList[key].variable());

                for (const name of Object.keys(variableList[key])) {
                    document.addEventListener(name, () => {
                        updateDataBind(variableList[key], name);
                    });
                }
            }

            populatePage(false, window.location.pathname, false);
        }
    };

    window.onpopstate = (event: PopStateEvent) => {
        writeLog("JsMvcFwRouter.ts - onpopstate", window.location.pathname);

        if (event) {
            populatePage(false, window.location.pathname, false);
        }
    };

    window.onbeforeunload = (event: Event) => {
        writeLog("JsMvcFwRouter.ts - onbeforeunload", { event });

        if (event) {
            for (const [key, value] of controllerList.entries()) {
                value.destroy(variableList[key]);
            }
        }
    };
};

export const navigateTo = (nextUrl: string, soft = false, parameterList?: Record<string, unknown>, parameterSearch?: string) => {
    writeLog("JsMvcFwRouter.ts - navigateTo", { nextUrl, parameterList, parameterSearch });

    populatePage(true, nextUrl, soft, parameterList, parameterSearch);
};

const populatePage = (
    isHistoryPushEnabled: boolean,
    nextUrl: string,
    soft: boolean,
    parameterList?: Record<string, unknown>,
    parameterSearch?: string
) => {
    let isNotFound = false;

    if (elementRoot) {
        for (const [key, value] of routerList.entries()) {
            if (value.path === nextUrl) {
                if (urlRoot && isHistoryPushEnabled) {
                    const urlRootReplace = urlRoot.replace(/\/+$/, "");

                    routerHistoryPush(`${urlRootReplace}${nextUrl}`, soft, value.title, parameterList);

                    if (parameterSearch) {
                        window.location.search = parameterSearch;
                    }
                }

                if (!isHistoryPushEnabled || soft) {
                    document.title = value.title;

                    elementRoot.innerHTML = controllerList[key].view(variableList[key]);
                }

                controllerList[key].event(variableList[key]);

                isNotFound = false;

                break;
            } else {
                isNotFound = true;
            }
        }

        if (isNotFound) {
            if (isHistoryPushEnabled) {
                routerHistoryPush("/404", soft, "404", parameterList);
            }

            if (!isHistoryPushEnabled || soft) {
                document.title = "404";

                elementRoot.innerHTML = "Route not found!";
            }
        }
    } else {
        throw new Error("#jsmvcfw_app not found!");
    }
};

const routerHistoryPush = (nextUrl: string, soft: boolean, title = "", parameterListValue?: Record<string, unknown>): void => {
    let url = nextUrl;

    if (nextUrl.charAt(0) === "/") {
        url = nextUrl.slice(1);
    }

    if (url === "") {
        url = "/";
    }

    const [path, queryString] = url.split("?");
    const queryStringCleanedList: string[] = [];

    if (queryString) {
        const params = queryString.split("&");

        params.forEach((param) => {
            const [key, value] = param.split("=");

            if (value) {
                const cleanedValue = encodeURIComponent(decodeURIComponent(value));

                queryStringCleanedList.push(`${key}=${cleanedValue}`);
            } else {
                queryStringCleanedList.push(key);
            }
        });
    }

    const urlCleaned = path + (queryStringCleanedList.length > 0 ? "?" + queryStringCleanedList.join("&") : "");

    window.history.pushState(
        {
            prevUrl: window.location.pathname,
            parameterList: parameterListValue
        },
        title,
        urlCleaned
    );

    if (!soft) {
        window.location.href = urlCleaned;
    }
};
