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
    'wss': null,
    'site': 'default',
    'headers': {
        'Content-type': 'application/json',
        'Referer': 'https://account.ubnt.com/login?redirect=https%3A%2F%2Funifi.ubnt.com',
        'Origin': 'https://account.ubnt.com',
        'dnt': 1
    },
};

/**
 * Unifi Cloud API interface
 * @param {object} options Default settings for the cloud access
 * @param {string} options.deviceId defailt device id. Optional
 * @param {string} options.username cloud username
 * @param {string} options.password cloud password
 * @param {string} options.baseUrl default url for the cloud. Optional
 * @param {boolean} options.debug debug log. Optional. default false
 * @param {boolean} options.gzip If gzip is enabled for the cloud messages. Optional. default true
 * @returns CloudRequest
 */
function CloudRequest(options) {
    if (!(this instanceof CloudRequest)) return new CloudRequest(options);
    merge(this, defaultOptions, options);
    if (this.debug) debug.enabled = true;
    if (typeof this.request === 'undefined') {
        this.jar = request.jar();
        this.request = request.defaults({ jar: this.jar });
        if (this.debugNet) {
            this.request.debug = true;
            require('request-debug')(this.request);
        }
    }
    debug('CloudAPI-request initialized with options %o', options);
}

/**
 * Enable or disable debugging
 * @param {boolean} enabled Enable or Disable debugging
 * @return {undefined}
 */
CloudRequest.prototype.debugging = function(enabled) {
    this.debug = enabled;
    debug.enabled = this.debug ? true : false;
    debug('Debug is', this.debug ? 'enabled' : 'disabled');
};

CloudRequest.prototype._request = function(url = '', jsonParams = undefined, headers = {}, method = undefined, baseUrl = undefined) {
    if (typeof method === 'undefined') {
        if (typeof jsonParams === 'undefined') method = 'GET';
        else method = 'POST';
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
                debug('Error with the authentication', data);
                return reject(data || 'Authentication error');
            }
        }).catch(reject);
    });
};

CloudRequest.prototype.logout = function() {
    return new Promise((resolve, reject) => {
        this._request('/logout', {}, method = 'POST')
            .then((data) => {
                this.loggedIn = false;
                resolve(data);
            })
            .catch(reject);
    });
};

CloudRequest.prototype.req = function(url = '/', jsonParams = undefined, headers = {}, method = undefined, baseUrl = undefined) {
    if (typeof method === 'undefined') {
        if (typeof jsonParams === 'undefined') method = 'GET';
        else method = 'POST';
    }
    return new Promise((resolve, reject) => {
        this.login().then(() => this._request(url, jsonParams, headers, method, baseUrl))
            .then((data, resp) => {
                debug('Received response:', typeof data);
                if (typeof data === 'string') {
                    if (data.length > 1 && data.charAt(0) === '{')
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