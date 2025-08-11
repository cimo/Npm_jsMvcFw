// Source
import { Irouter, Icontroller } from "./JsMvcFwInterface";
import { getElementRoot, getUrlRoot, getControllerList, renderTemplate, renderAfter } from "./JsMvcFw";

let routerList: Irouter[] = [];
let controller: Icontroller;

const historyPush = (nextUrl: string, soft: boolean, title = "", parameterObjectValue?: Record<string, unknown>): void => {
    let url = nextUrl;

    if (nextUrl.charAt(0) === "/") {
        url = nextUrl.slice(1);
    }

    const [path, queryString] = url.split("?");
    const queryStringCleanedList: string[] = [];

    if (queryString) {
        const queryStringList = queryString.split("&");

        for (let a = 0; a < queryStringList.length; a++) {
            const param = queryStringList[a];
            const [key, value] = param.split("=");

            const keyCleaned = encodeURIComponent(
                decodeURIComponent(key.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"))
            );

            if (value) {
                const valueCleaned = encodeURIComponent(
                    decodeURIComponent(value.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"))
                );
                queryStringCleanedList.push(`${keyCleaned}=${valueCleaned}`);
            } else {
                queryStringCleanedList.push(keyCleaned);
            }
        }
    }

    const pathCleaned = path.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    const urlCleaned = pathCleaned + (queryStringCleanedList.length > 0 ? "?" + queryStringCleanedList.join("&") : "");

    window.history.pushState(
        {
            previousUrl: window.location.pathname,
            parameterObject: parameterObjectValue
        },
        title,
        urlCleaned
    );

    if (!soft) {
        window.location.href = urlCleaned;
    }
};

const populatePage = (
    isHistoryPushEnabled: boolean,
    nextUrl: string,
    isSoft: boolean,
    parameterObject?: Record<string, unknown>,
    parameterSearch?: string
): void => {
    let isNotFound = true;

    const urlRoot = getUrlRoot();
    const elementRoot = getElementRoot();

    if (!elementRoot) {
        throw new Error("JsMvcFwRouter.ts => Element root not found!");
    }

    for (const route of routerList) {
        if (route.path === nextUrl) {
            if (urlRoot && isHistoryPushEnabled) {
                historyPush(`${urlRoot.replace(/\/+$/, "")}${nextUrl}`, isSoft, route.title, parameterObject);

                if (parameterSearch) {
                    window.location.search = parameterSearch;
                }
            }

            if (!isHistoryPushEnabled || isSoft) {
                document.title = route.title;

                controller = route.controller();

                renderTemplate(controller, undefined, () => {
                    controller.event();

                    renderAfter(controller).then(() => {
                        controller.rendered();
                    });
                });
            }

            isNotFound = false;

            break;
        }
    }

    if (isNotFound) {
        if (isHistoryPushEnabled) {
            historyPush("/404", isSoft, "404", parameterObject);
        }

        if (!isHistoryPushEnabled || isSoft) {
            document.title = "404";
            elementRoot.innerHTML = "Route not found!";
        }
    }
};

export const routerInit = (routerListValue: Irouter[]): void => {
    routerList = routerListValue;

    window.onload = (event: Event) => {
        if (event) {
            populatePage(false, window.location.pathname, false);
        }
    };

    window.onpopstate = (event: PopStateEvent) => {
        if (event) {
            populatePage(false, window.location.pathname, false);
        }
    };

    window.onbeforeunload = () => {
        if (controller) {
            const controllerList = getControllerList();

            for (let a = controllerList.length - 1; a >= 0; a--) {
                for (const children of controllerList[a].childrenList) {
                    children.destroy();
                }
            }

            controller.destroy();
        }
    };
};

export const navigateTo = (nextUrl: string, isSoft = false, parameterObject?: Record<string, unknown>, parameterSearch?: string): void => {
    populatePage(true, nextUrl, isSoft, parameterObject, parameterSearch);
};
