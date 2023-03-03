export interface Router {
    title: string;
    path: string;
    controller(): Controller;
}
export interface Controller {
    variableList: <VariableState>() => Record<string, VariableState>;
    create: (variableList: Record<string, VariableState>) => void;
    view: (variableList: Record<string, VariableState>) => string;
    event: (variableList: Record<string, VariableState>) => void;
    destroy: (variableList: Record<string, VariableState>) => void;
}
export interface View {
    content: string;
}
export interface ItemList {
    data: Record<string, any>;
}
