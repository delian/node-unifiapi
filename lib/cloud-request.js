let debug = require('debug')('CloudAPI');
let merge = require('merge');
let request = require('request');

let defaultOptions = {
    'username': 'unifi',
    'password': 'unifi',
    'baseUrl': 'https://sso.ubnt.com/api/sso/v1',
    'debug': false,
    'debugNet': false,
    'gzip': true,
    'site': 'default',
    'headers': {
        'Content-type': 'application/json',
        'Referer': 'https://account.ubnt.com/login?redirect=https%3A%2F%2Funifi.ubnt.com',
        'Origin': 'https://account.ubnt.com',
        'dnt': 1
    },
};

function CloudRequest(options) {
    if (!(this instanceof CloudRequest)) return new CloudRequest(options);
    merge(this, defaultOptions, options);
    if (this.debug) debug.enabled = true;
    if (typeof this.request === 'undefined') {
        this.request = request.defaults({jar: true});
        if (this.debugNet) {
            this.request.debug = true;
            require('request-debug')(this.request);
        }
    }
    debug('CloudAPI-request initialized with options %o', options);
}

CloudRequest.prototype._request = function(url = '', jsonParams = undefined, headers = {}, method = undefined, baseUrl = undefined) {
    if (typeof method === 'undefined') {
        if (typeof jsonParams === 'undefined') method='GET'; else method='POST';
    }
    return new Promise((resolve, reject) => {
        this.request({
                url: (baseUrl || this.baseUrl) + url,
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

CloudRequest.prototype.login = function(username, password) {
    return new Promise((resolve, reject) => {
        if (this.loggedIn) { // Silent ignore if we are already in
            return resolve();
        }
        debug('Trying to log in with username: %s and password: %s', username || this.username, password || this.password);
        this._request('/login', {
            user: username || this.username,
            password: password || this.password
        }).then((data) => {
            if (typeof data === 'object') {
                debug('Successfuly logged in', data);
                this.loggedIn = true;
                return resolve(data);
            } else {
                debug('Error with the authorization', data);
                return reject(data);
            }
        }).catch(reject);
    });
};

CloudRequest.prototype.logout = function() {
    return new Promise((resolve, reject) => {
        this._request('/logout', {}, method='POST')
            .then((data) => {
                this.loggedIn = false;
                resolve(data);
            })
            .catch(reject);
    });
};

CloudRequest.prototype.req = function(url = '/', jsonParams = undefined, headers = {}, method = undefined, baseUrl = undefined) {
    if (typeof method === 'undefined') {
        if (typeof jsonParams === 'undefined') method = 'GET'; else method = 'POST';
    }
    return new Promise((resolve, reject) => {
        this.login().then(() => this._request(url, jsonParams, headers, method, baseUrl))
            .then((data, resp) => {
                debug('Received response:', typeof data);
                if (typeof data === 'string') {
                    if (data.length>1 && data.charAt(0) === '{')
                        data = JSON.parse(data);
                    debug('now we have', typeof data);
                }
                if (typeof data === 'object') return resolve(data, resp);
                return reject(data);
            })
            .catch(reject);
    });
};

module.exports = CloudRequest;