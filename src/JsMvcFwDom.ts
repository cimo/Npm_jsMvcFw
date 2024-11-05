import { IvariableState } from "./JsMvcFwInterface";
import { writeLog } from "./JsMvcFw";

export const updateDataBind = (variableList: Record<string, IvariableState<unknown>>, name: string): void => {
    const elementDataBind = document.querySelector<HTMLElement>(`[data-bind="${name}"]`);

    if (elementDataBind) {
        const attributeDataBind = elementDataBind.getAttribute("data-bind");

        if (attributeDataBind) {
            elementDataBind.textContent = variableList[attributeDataBind].state as string;
        }
    } else {
        writeLog("JsMvcFwDom.ts - updateDataBind", `data-bind="${name}" don't exists in the DOM!`);
    }
};
