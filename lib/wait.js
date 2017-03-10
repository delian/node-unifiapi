module.exports = function(data, timeout) {
    if (typeof data == 'number' && typeof timeout == 'undefined') {
        timeout = data;
        data = undefined;
    }
    return new Promise((resolve, reject) => {
//        console.log('Waiting',timeout,data);
        setTimeout(() => {
//            console.log('Execute');
            resolve(data);
        }, timeout || 100);
    });
};