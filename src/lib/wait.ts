/** @format */

/**
 * Asynchronous wait implementation
 * @param {number} timeout the timeout to wait in miliseconds
 * @param {any} data optional data to return after the wait
 */
export function wait(timeout: number = 100, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(data);
        }, timeout);
    });
}
