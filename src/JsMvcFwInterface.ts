export interface IvirtualNode {
    tag: string;
    propertyObject: { [key: string]: TvirtualNodeProperty };
    childrenList: Array<IvirtualNode | string>;
    key?: string;
}

export interface IvariableBind<T> {
    state: T;
    listener(callback: (value: T) => void): void;
}

export interface IvariableHook<T> {
    state: T;
    setState: (value: T) => void;
}

export interface IvariableLink {
    __jsmvcfwType: "variableLink";
    controllerNameSource: string;
}

export interface IvariableLinkPending {
    target: IvariableLink;
    label: string;
    targetBind: IvariableBind<unknown>;
}

export interface IvariableEffect {
    (groupObject: { list: string[]; action: () => void }[]): void;
}

export interface Icontroller {
    hookObject: Record<string, Element | Element[]>;
    variable(): void;
    variableEffect(watch: IvariableEffect): void;
    view(name?: string): IvirtualNode;
    event(): void;
    subControllerList(): Icontroller[];
    rendered(): void;
    destroy(): void;
}

export interface Iroute {
    title: string;
    path: string;
    controller(): Icontroller;
}

export interface IhistoryPushStateData {
    urlPrevious: string;
    parameterObject: Record<string, unknown> | undefined;
    parameterSearch: string | undefined;
}

export interface IcallbackObserver {
    (el: HTMLElement, mutation: MutationRecord): void;
}

export type TvirtualNodeProperty = string | number | boolean | (string | IvirtualNode)[] | ((event: Event) => void) | null | undefined;

export type TvirtualNodeChildren = IvirtualNode | string | number;

export type TvariableBindInput<T extends Record<string, unknown>> = {
    [A in keyof T]: T[A] | IvariableLink;
};

export type Temitter = {
    variableChanged: void;
};
