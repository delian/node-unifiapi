let unifi = require('./index');

let r = unifi({
    debug: true,
    debugNet: true,
    username: 'ubnt',
    password: 'UBNT'
});

console.log(r.site);

r.stat_sessions().then((data) => {
    console.log('Success', data);
    r.stat_sessions().then((data) => {
        console.log('Received', data);
    }).catch((err) => {});
}).catch((err) => {
    console.log('Error', err);
});