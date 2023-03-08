import { IvariableState } from "./JsMvcFwInterface";
export declare const mainInit: (isDebugValue?: boolean) => void;
export declare const writeLog: (file: string, tag: string, value: Record<string, unknown>) => void;
export declare const checkEnvVariable: (key: string, value: string) => string;
export declare const variableState: <T>(variableValue: T) => IvariableState;
export declare const writeCookieEncoded: (tag: string, value: Record<string, unknown>, path?: string, time?: number) => void;
export declare const readCookieDecoded: <T>(tag: string) => T;
