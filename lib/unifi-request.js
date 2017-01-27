let request = require('request');
let merge = require('merge');
let debug = require('debug')('UnifiRequest');

let defaultOptions = {
    'username': 'unifi',
    'password': 'unifi',
    'loggedIn': false,
    'baseUrl': 'https://127.0.0.1:8443',
    'debug': false,
    'debugNet': false,
    'headers': {
        'Content-type': 'application/json',
        'Referer': '/login'
    },
    'gzip': true
};

function UnifiRequest(options) {
    if (!(this instanceof UnifiRequest)) return new UnifiRequest(options);
    merge(this, defaultOptions, options);
    if (this.debug) debug.enabled = true;
    if (typeof this.request === 'undefined') {
        this.request = request.defaults({ jar: true });
        if (this.debugNet) {
            this.request.debug = true;
            require('request-debug')(this.request);
        }
    }
    debug('Initialize with options %o', options);
}

UnifiRequest.prototype._request = function(url, jsonParams, headers = {}, method = 'POST') {
    return new Promise((resolve, reject) => {
        this.request({
                url: this.baseUrl + url,
                method: method,
                headers: merge(true, headers, this.headers),
                rejectUnauthorized: false,
                json: jsonParams
            },
            (err, resp, body) => {
                if (err) return reject(err);
                if (resp.statusCode < 200 || resp.statusCode > 299) return reject(null);
                return resolve(body, resp);
            });
    });
};

UnifiRequest.prototype.login = function(username, password) {
    return new Promise((resolve, reject) => {
        if (this.loggedIn) { // Silent ignore if we are already in
            return resolve();
        }
        debug('Trying to log in with username: %s and password: %s', username || this.username, password || this.password);
        this._request('/api/login', {
            username: username || this.username,
            password: password || this.password
        }).then((data) => {
            if (typeof data === 'object' && data.meta && data.meta) {
                debug('Successfuly logged in', data.meta);
                this.loggedIn = true;
                resolve(data);
            } else {
                debug('Error with the authorization', data);
                reject(data);
            }
        }).catch(reject);
    });
};

UnifiRequest.prototype.logout = function() {
    return new Promise((resolve, reject) => {
        this._request('/logout')
            .then((data) => {
                this.loggedIn = false;
                resolve(data);
            })
            .catch(reject);
    });
};

UnifiRequest.prototype.req = function(url = '/', jsonParams = undefined, headers = {}, method = undefined) {
    if (typeof method === 'undefined') {
        if (typeof jsonParams === 'undefined') method = 'GET'; else method = 'POST';
    }
    return new Promise((resolve, reject) => {
        this.login().then(() => this._request(url, jsonParams, headers, method))
            .then((data, resp) => {
                if (typeof data === 'object' &&
                    typeof data.meta === 'object' &&
                    data.meta.rc === 'ok') return resolve(data, resp);
                reject(data);
            })
            .catch(reject);
    });
};

module.exports = UnifiRequest;