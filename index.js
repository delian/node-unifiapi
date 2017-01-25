let debug = require('debug')('UnifiAPI');
let merge = require('merge');
let UnifiRequest = require('./lib/unifi-request');

let defaultOptions = {
    'username': 'unifi',
    'password': 'unifi',
    'baseUrl': 'https://127.0.0.1:8443',
    'debug': false,
    'debugNet': false,
    'gzip': true,
    'site': 'default'
};

function UnifiAPI(options) {
    if (!(this instanceof UnifiAPI)) return new UnifiAPI(options);
    merge(this, defaultOptions, options);
    if (this.debug) debug.enabled = true;
    if (typeof this.net === 'undefined') {
        this.net = new UnifiRequest(merge(true, defaultOptions, options));
    }
    debug('Initialize with options %o', options);
}

UnifiAPI.prototype.netsite = function(url = '', jsonParams = undefined, headers = {}, method = 'POST', site = undefined) {
    site = site || this.site;
    return this.net.req('/api/s/' + site + url, jsonParams, headers, method);
};

UnifiAPI.prototype.stat_sessions = function(start = undefined, end = undefined, site = undefined) {
    return this.netsite('/stat/sessions', {
        type: 'all',
        start: start || parseInt((new Date()).getTime() / 1000 - 7 * 24 * 3600),
        end: end || parseInt((new Date()).getTime() / 1000)
    }, site = site);
};

UnifiAPI.prototype.authorize_guest = function(mac, minutes = 60, up = undefined, down = undefined, mbytes = undefined, apmac = undefined, site = undefined) {
    return this.netsite('/cmd/stamgr', {
        cmd: 'authorize_guest',
        mac: mac.toLowerCase(),
        minutes: minutes,
        up: up,
        down: down,
        bytes: mbytes,
        ap_mac: apmac.toLowerCase()
    });
};

UnifiAPI.prototype.unauthorize_guest = function(mac) {
    return this.netsite('/cmd/stamgr', {
        cmd: 'uauthorize_guest',
        mac: mac.toLowerCase()
    });
};

UnifiAPI.prototype.kick_sta = function(mac) {
    return this.netsite('/cmd/stamgr', {
        cmd: 'kick_sta',
        mac: mac.toLowerCase()
    });
};

module.exports = UnifiAPI;