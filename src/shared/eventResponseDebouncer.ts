export type EventResponseDebouncer<T> = {
    dispatch: (fired: Promise<T>, cb: (event: T) => any) => void;
    invalidate: () => void;
}

export function eventResponseDebouncerFactory<T>(): EventResponseDebouncer<T> {
    let lastId = 0;

    return {
        dispatch: async (fired, cb) => {
            lastId++;
            const thisId = lastId;
            const resp = await fired;
            // Only fire callback if this was the last request
            if (thisId === lastId) {
                cb(resp);
            }
        },
        invalidate: () => {
            lastId++;
        }
    }
}