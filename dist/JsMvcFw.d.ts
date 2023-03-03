import { VariableState } from "./JsMvcFwInterface";
export declare const mainInit: (isDebugValue?: boolean) => void;
export declare const writeLog: (file: string, tag: string, value: Record<string, unknown>) => void;
export declare const checkEnvVariable: (key: string, value: string) => string;
export declare const variableState: <T extends unknown>(variableValue: T) => VariableState;
export declare const writeCookieEncoded: (tag: string, value: Record<string, unknown>, path?: string, time?: number) => void;
export declare const readCookieDecoded: <T extends unknown>(tag: string) => T;
