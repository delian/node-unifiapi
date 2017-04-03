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
    this.__q = {
        login: []
    };
    debug('UnifiAPI-request Initialized with options %o', options);
}

/**
 * Enable or disable debugging
 * @param {boolean} enabled Enable or Disable debugging
 * @return {undefined}
 */
UnifiRequest.prototype.debugging = function(enabled) {
    this.debug = enabled;
    debug.enabled = this.debug ? true : false;
    debug('Debug is', this.debug ? 'enabled' : 'disabled');
};


UnifiRequest.prototype._request = function(url = '', jsonParams = undefined, headers = {}, method = undefined, baseUrl = undefined) {
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
                if (err) return reject(err, resp);
                if (resp.statusCode < 200 || resp.statusCode > 299) return reject(body, resp);
                return resolve(body, resp);
            });
    });
};

UnifiRequest.prototype.login = function(username, password) {
    return new Promise((resolve, reject) => {
        if (this.loggedIn) { // Silent ignore if we are already in
            return resolve({
                meta: { rc: 'ok' }
            });
        }
        this.__q.login.push({ resolve: resolve, reject: reject });
        debug('Trying to log in with username: %s and password: %s', username || this.username, password || this.password);
        if (this.__q.login.length > 1) {
            debug('Waiting login to be completed...');
            return;
        }
        this._request('/api/login', {
            username: username || this.username,
            password: password || this.password
        }).then((data) => {
            if (typeof data === 'object' && data.meta && data.meta) {
                debug('Successfuly logged in', data.meta);
                this.loggedIn = true;
                this.__q.login.forEach(n => n.resolve(data));
                this.__q.login = [];
            } else {
                debug('Error with the authentication', data);
                this.__q.login.forEach(n => n.reject(data || 'Authentication error'));
                this.__q.login = [];
                this.loggedIn = false;
            }
        }).catch(e => {
            this.__q.login.forEach(n => n.reject('Authentication error ' + e));
            this.__q.login = [];
            this.loggedIn = false;
        });
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

UnifiRequest.prototype.req = function(url = '/', jsonParams = undefined, headers = {}, method = undefined, baseUrl = undefined) {
    if (typeof method === 'undefined') {
        if (typeof jsonParams === 'undefined') method = 'GET';
        else method = 'POST';
    }
    return new Promise((resolve, reject) => {
        let procFunc = (data, resp) => {
            if (typeof data === 'string' && data.charAt(0) === '{') data = JSON.parse(data);
            if (typeof data === 'object' &&
                typeof data.meta === 'object' &&
                data.meta.rc === 'ok') return resolve(data, resp);
            reject(data, resp);
        };
        this.login()
            .then(() => {
                this._request(url, jsonParams, headers, method, baseUrl)
                    .then(procFunc)
                    .catch((error, resp) => {
                        if ((resp && resp.statusCode == 401) || (typeof error == 'string' && error.match('api.err.LoginRequired'))) {
                            // We have problem with the Login for some reason
                            debug('We have to reauthenticate again', error, resp);
                            this.loggedIn = false; // Reset the login and repeat once more
                            this.login()
                                .then(() => this._request(url, jsonParams, headers, method, baseUrl))
                                .then(procFunc)
                                .catch(reject);
                        } else reject(error, resp);
                    });
            })
            .catch(reject);
    });
};

module.exports = UnifiRequest;