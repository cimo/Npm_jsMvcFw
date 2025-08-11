export default class Emitter<Events extends Record<string, unknown>> {
    private listenerObject: {
        [K in keyof Events]?: Array<(payload: Events[K]) => void>;
    } = {};

    on<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): void {
        if (!this.listenerObject[event]) {
            this.listenerObject[event] = [];
        }

        this.listenerObject[event]!.push(listener);
    }

    emit<K extends keyof Events>(event: K, ...[payload]: Events[K] extends undefined ? [] : [Events[K]]): void {
        const listenerEventList = this.listenerObject[event];

        if (listenerEventList) {
            for (const listener of listenerEventList) {
                listener(payload as Events[K]);
            }
        }
    }

    off<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void, isRemoveAll: boolean = false): void {
        const listenerEventList = this.listenerObject[event];

        if (listenerEventList) {
            if (isRemoveAll) {
                for (let a = listenerEventList.length - 1; a >= 0; a--) {
                    if (listenerEventList[a] === listener) {
                        listenerEventList.splice(a, 1);
                    }
                }
            } else {
                const index = listenerEventList.indexOf(listener);

                if (index !== -1) {
                    listenerEventList.splice(index, 1);
                }
            }
        }
    }
}
