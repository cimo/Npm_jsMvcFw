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

export interface IvariableEffect {
    (groupObject: { list: string[]; action: () => void }[]): void;
}

export interface Icontroller {
    variable(): void;
    variableEffect(watch: IvariableEffect): void;
    view(): IvirtualNode;
    event(): void;
    subControllerList(): Icontroller[];
    rendered(): void;
    destroy(): void;
}

export interface Irouter {
    title: string;
    path: string;
    controller(): Icontroller;
}

export type TvirtualNodeProperty = string | number | boolean | (string | IvirtualNode)[] | ((event: Event) => void) | null | undefined;

export type TvirtualNodeChildren = IvirtualNode | string | number;
