// Source
import { Iroute, Icontroller } from "./JsMvcFwInterface";
import { getControllerList, renderTemplate, renderAfter, resetFramework } from "./JsMvcFw";

let routeList: Iroute[] = [];
let controller: Icontroller;

const cleanUrl = (urlNext: string): string => {
    let url = urlNext;

    if (urlNext !== "/" && urlNext.charAt(0) === "/") {
        url = urlNext.slice(1);
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

    return urlCleaned;
};

const historyPush = (urlNext: string, parameterObject?: Record<string, unknown>, parameterSearch?: string, title = ""): void => {
    window.history.pushState(
        {
            urlPrevious: window.location.pathname,
            parameterObject,
            parameterSearch
        },
        title,
        cleanUrl(urlNext)
    );
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
    if (!isSoft) {
        if (parameterSearch) {
            window.location.search = parameterSearch;
        }

        window.location.href = cleanUrl(urlNext);
    } else {
        let isNotFound = true;

        for (const route of routeList) {
            if (route.path === urlNext) {
                isNotFound = false;

                resetFramework();

                historyPush(urlNext, parameterObject, parameterSearch, route.title);

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
            let pathname = window.location.pathname;

            if (pathname.charAt(pathname.length - 1) === "/") {
                pathname = pathname.slice(0, -1);
            }

            historyPush(`${pathname}/404`, parameterObject, parameterSearch, "404");

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
        if (event) {
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
