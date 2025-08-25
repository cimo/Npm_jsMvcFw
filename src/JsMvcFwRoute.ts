// Source
import { Iroute, Icontroller, IhistoryPushStateData } from "./JsMvcFwInterface";
import { getControllerList, renderTemplate, renderAfter, getUrlRoot, frameworkReset } from "./JsMvcFw";

let routeList: Iroute[] = [];
let controller: Icontroller;

const cleanUrl = (urlNext: string): string => {
    const [path, queryString] = urlNext.split("?");
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

    return urlCleaned;
};

const historyPush = (urlNext: string, parameterObject?: Record<string, unknown>, parameterSearch?: string, title = ""): void => {
    const data: IhistoryPushStateData = {
        urlPrevious: window.location.pathname,
        parameterObject,
        parameterSearch
    };

    window.history.pushState(data, title, cleanUrl(urlNext));
};

const removeController = (): void => {
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

const populatePage = (urlNext: string, isSoft: boolean, parameterObject?: Record<string, unknown>, parameterSearch?: string): void => {
    const urlNextSlice = urlNext.endsWith("/") && urlNext.length > 1 ? urlNext.slice(0, -1) : urlNext;

    if (!isSoft) {
        if (parameterSearch) {
            window.location.search = parameterSearch;
        }

        window.location.href = cleanUrl(urlNextSlice);
    } else {
        let isNotFound = true;

        for (const route of routeList) {
            if (route.path === urlNextSlice) {
                isNotFound = false;

                frameworkReset();

                historyPush(urlNextSlice, parameterObject, parameterSearch, route.title);

                document.title = route.title;

                removeController();

                controller = route.controller();

                renderTemplate(controller, undefined, () => {
                    controller.event();

                    renderAfter(controller).then(() => {
                        controller.rendered();
                    });
                });

                break;
            }
        }

        if (isNotFound) {
            historyPush(`${getUrlRoot()}/404`, parameterObject, parameterSearch, "404");

            document.title = "404";

            const elementRoot = document.getElementById("jsmvcfw_app");

            if (elementRoot) {
                elementRoot.innerHTML = "Route not found!";
            }
        }
    }
};

export const route = (routeListValue: Iroute[]): void => {
    routeList = routeListValue;

    window.onload = (event: Event) => {
        if (event) {
            populatePage(window.location.pathname, true);
        }
    };

    window.onpopstate = (event: PopStateEvent) => {
        const data = event.state as IhistoryPushStateData;

        if (data.urlPrevious) {
            populatePage(data.urlPrevious, true);
        } else {
            populatePage(window.location.pathname, true);
        }
    };

    window.onbeforeunload = () => {
        removeController();
    };
};

export const navigateTo = (urlNext: string, isSoft = true, parameterObject?: Record<string, unknown>, parameterSearch?: string): void => {
    populatePage(urlNext, isSoft, parameterObject, parameterSearch);
};
