let request = require('./unifi-request');

let r = new request({ debug: true });

r.login('ubnt', 'UBNT2').then((data) => {
    console.log('Success', data);
}).catch((err) => {
    console.log('Error', err);
});