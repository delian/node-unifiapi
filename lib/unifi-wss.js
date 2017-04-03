let debug = require('debug')('WssAPI');
let merge = require('merge');
let WebSocket = require('ws');
let uuid = require('uuid/v1');

let defaultOptions = {
    url: 'wss://device-airos.svc.ubnt.com/api/airos/v1/unifi/events',
    connected: false,
    perMessageDeflate: true,
    origin: 'https://unifi.ubnt.com',
    rejectUnauthorized: false,
    cookie: '',
    pingInterval: 10000
};

function WssRequest(options) {
    if (!(this instanceof WssRequest)) return new WssRequest(options);
    merge(this, defaultOptions, options);
    if (this.debug) debug.enabled = true;
    this._reqStates = {};
    this._qqq = {
        connect: []
    };
    debug('WssAPI-request initialized with options %o', options);
}

/**
 * Enable or disable debugging
 * @param {boolean} enabled Enable or Disable debugging
 * @return {undefined}
 */
WssRequest.prototype.debugging = function(enabled) {
    this.debug = enabled;
    debug.enabled = this.debug ? true : false;
    debug('Debug is', this.debug ? 'enabled' : 'disabled');
};

WssRequest.prototype.connect = function(url) {
    return new Promise((resolve, reject) => {
        if (this.connected) return resolve(this.ws);
        this.url = url || this.url;
        clearInterval(this.pingPong);
        this._qqq.connect.push({ resolve: resolve, reject: reject });
        if (this._qqq.connect.length > 1) return;
        this.ws = new WebSocket(this.url, {
            perMessageDeflate: this.perMessageDeflate,
            origin: this.origin,
            headers: {
                Cookie: this.cookie
            },
            //rejectUnauthorized: this.rejectUnauthorized
        });
        this.ws.on('open', () => {
            debug('Connected', this.url);
            this.connected = true;
            this.pingPong = setInterval(() => this.ping(), this.pingInterval);
            this.ping();
            this._qqq.connect.forEach(n => n.resolve(this.ws));
            this._qqq.connect = [];
        });
        this.ws.on('close', () => {
            debug('Disconnected', this.url);
            this.connected = false;
            this.ws = null;
            this._reqStates = {};
            clearInterval(this.pingPong);
            this._qqq.connect.forEach(n => n.reject('disconnect'));
            this._qqq.connect = [];
        });
        this.ws.on('error', e => {
            debug('Error', e, this.url);
            this.connected = false;
            this.ws = null;
            this._reqStates = {};
            clearInterval(this.pingPong);
            this._qqq.connect.forEach(n => n.reject(e));
            this._qqq.connect = [];
        });
        this.ws.on('message', (msg) => {
            debug('Message Received:', msg);
            this._inmessage(msg);
        });
    });
};

WssRequest.prototype.disconnect = function(code, msg) {
    if (this.connected) {
        this.ws.close(code || 1000, msg || 'Disconnect');
    }
};

WssRequest.prototype.ping = function() {
    this.send('ping').then(() => {}).catch(() => {});
};

WssRequest.prototype._inmessage = function(msg) {
    if (msg == 'ping') return this.send('pong').then(() => {});
    if (msg == 'pong') return; // Ignore pongs
    if (typeof msg === 'object' || msg.charAt(0) === '{') {
        if (typeof msg === 'string') msg = JSON.parse(msg);
        if (msg.message === 'action:response') this.actionResponse(msg);
    }
};

WssRequest.prototype.uniqueId = function() {
    return uuid();
};

WssRequest.prototype.send = function(msg) {
    return new Promise((resolve, reject) => {
        this.connect().then((ws) => {
            debug('Message Sending: ', msg);
            if (typeof msg == 'object') msg = JSON.stringify(msg);
            ws.send(msg);
            resolve();
        }).catch(reject);
    });
};

WssRequest.prototype._register = function(id, cb) {
    if (typeof this._reqStates[id] === 'undefined') this._reqStates[id] = [];
    if (this._reqStates[id].indexOf(cb) < 0) {
        this._reqStates[id].push(cb);
    }
};

WssRequest.prototype._deregister = function(id, cb) {
    if (typeof this._reqStates[id] === 'object') {
        if (this._reqStates[id].indexOf(cb) >= 0)
            this._reqStates[id].splice(this._reqStates[id].indexOf(cb), 1);
    }
};

WssRequest.prototype.actionRequest = function(action, args) {
    return new Promise((resolve, reject) => {
        let actionId = this.uniqueId();
        this._register(actionId, (msg) => {
            debug('Action Response', msg);
            resolve(msg);
        });
        this.send({
            message: 'action:request',
            action: action,
            action_id: actionId,
            args: args
        }).then(() => {}).catch(reject);
    });
};

WssRequest.prototype.actionResponse = function(msg) {
    if (this._reqStates[msg.action_id]) {
        this._reqStates[msg.action_id].forEach((cb) => cb(msg));
    }
};

module.exports = WssRequest;