module.exports = function(data, timeout) {
    if (typeof data == 'number' && typeof timeout == 'undefined') {
        timeout = data;
        data = undefined;
    }
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(data);
        }, timeout || 100);
    });
};