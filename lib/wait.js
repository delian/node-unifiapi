module.exports = function(data,timeout) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(data);
        }, timeout || 100);
    })
}