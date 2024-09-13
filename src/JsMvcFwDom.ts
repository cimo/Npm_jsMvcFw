import { writeLog } from "./JsMvcFw";

export const parseView = (html: string): string => {
    /*let target = document.querySelector('#jsmvcfw_app');

    let p = document.createElement('p');
    p.innerHTML = 'Your content, markup, etc.';

    if (target) {
        //p.insertAdjacentElement("beforeend", p);
        p.insertAdjacentText("beforeend", "a");
        p.insertAdjacentText("beforeend", "b");
        p.insertAdjacentText("beforeend", "c");
        target.insertAdjacentElement("beforeend", p);

        console.log("cimo", p.childNodes[0]);
    }*/
    const parser = new DOMParser();
    const test = parser.parseFromString(html, "text/html");

    writeLog("JsMvcFwDom.ts - parseView", { test });

    const result = html;

    return result;
};

/*const clearHtml = (html: string) => {
    const parser = new DOMParser();
    const text = parser.parseFromString(html, "text/html");

    return text.body;
};*/
