import { Router } from "./JsMvcFwInterface";
export declare const routerInit: (value: Router[]) => void;
export declare const navigateTo: (event: Event | undefined, nextUrl: string, parameterList?: Record<string, unknown>, parameterSearch?: string) => void;
export declare const checkPreviousUrl: () => boolean;
