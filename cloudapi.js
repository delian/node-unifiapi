let debug = require('debug')('CloudAPI');
let merge = require('merge');
let CloudRequest = require('./lib/cloud-request');

let defaultOptions = {
    'username': 'unifi',
    'password': 'unifi',
    'baseUrl': 'https://sso.ubnt.com/api/sso/v1',
    'debug': false,
    'debugNet': false,
    'gzip': true,
    'site': 'default'
};

function CloudAPI (options) {
    if (!(this instanceof CloudAPI)) return new CloudAPI(options);
    merge(this, defaultOptions, options);
    if (this.debug) debug.enabled = true;
    if (typeof this.net === 'undefined') {
        this.net = new CloudRequest(merge(true, defaultOptions, options));
    }
    debug('CloudAPI Initialized with options %o', options);
}

CloudAPI.prototype.login = function(username, password) {
    return this.net.login(username, password);
};

CloudAPI.prototype.logout = function() {
    return this.net.logout();
};

CloudAPI.prototype.self = function() {
    return this.net.req('/user/self');
};

CloudAPI.prototype.devices = function() {
    return this.net.req('/devices', undefined, undefined, undefined,
    baseUrl="https://device-airos.svc.ubnt.com/api/airos/v1/unifi");
};

CloudAPI.prototype.delete_device = function(device_id = '') {
    return this.net.req('/devices/'+device_id, undefined, undefined, method = 'DELETE',
        baseUrl="https://device-airos.svc.ubnt.com/api/airos/v1/unifi");
};

CloudAPI.prototype.launch_dashboard = function(dashboard) {
    return this.net.req('/turn/creds?username='+dashboard, undefined, undefined, undefined,
        baseUrl="https://device-airos.svc.ubnt.com/api/airos/v1/unifi"
    );
};

module.exports = CloudAPI;