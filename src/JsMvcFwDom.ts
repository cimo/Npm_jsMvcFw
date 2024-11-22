import { IvariableState } from "./JsMvcFwInterface";
import { writeLog } from "./JsMvcFw";

export const updateDataBind = (template: string, variableList: Record<string, IvariableState<unknown>>, name: string): void => {
    const elementDataBind = document.querySelector<HTMLElement>(`[data-bind="${name}"]`);
    const elementDataSectionBind = document.querySelector<HTMLElement>(`[data-section-bind="${name}"]`);

    if (elementDataBind) {
        const attributeDataBind = elementDataBind.getAttribute("data-bind");

        if (attributeDataBind) {
            elementDataBind.textContent = variableList[attributeDataBind].state as string;
        }
    } else if (!elementDataBind && !elementDataSectionBind) {
        writeLog("@cimo/jsmvcfw => JsMvcFwDom.ts => updateDataBind()", `data-bind="${name}" don't exists in the DOM!`);
    }

    if (elementDataSectionBind) {
        const attributeDataBind = elementDataSectionBind.getAttribute("data-section-bind");

        if (attributeDataBind) {
            const regex = new RegExp(`<([a-zA-Z][a-zA-Z0-9]*)\\s[^>]*?data-section-bind="${attributeDataBind}"[^>]*>([\\s\\S]*?)<\\/\\1>`, "g");

            const match = template.match(regex);

            elementDataSectionBind.innerHTML = match ? match[0] : "";
        }
    } else {
        writeLog("@cimo/jsmvcfw => JsMvcFwDom.ts => updateDataBind()", `data-section-bind="${name}" don't exists in the DOM!`);
    }
};
