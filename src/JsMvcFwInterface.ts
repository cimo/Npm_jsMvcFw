export interface IvariableState<T> {
    state: T;
    listener: (callback: (value: T) => void) => void;
}

export interface Irouter {
    title: string;
    path: string;
    controller(): Icontroller;
}

export interface Icontroller<T = Record<string, IvariableState<unknown>>> {
    variable: () => T;
    view: (variableList: T) => string;
    event: (variableList: T) => void;
    destroy: (variableList: T) => void;
}

export interface Iview {
    template: string;
}
