let debug = require('debug')('CloudAPI');
let merge = require('merge');
let CloudRequest = require('./lib/cloud-request');
let wss = require('./lib/unifi-wss');
let wrtc = require('./lib/webrtc-request');
let UnifiAPI = require('./index');

let defaultOptions = {
    'username': 'unifi',
    'password': 'unifi',
    'baseUrl': 'https://sso.ubnt.com/api/sso/v1',
    'debug': false,
    'wss': null,
    'api': null,
    'deviceId': '',
    'debugNet': false,
    'gzip': true,
    'wrtcOpen': false,
    'site': 'default'
};

/**
 * Cloud API interface. Under the .api method there will be all of the UnifiAPI calls (over WebRTC)
 * @param {object} options default parameters to access Unifi Cloud
 * @param {string} options.username Cloud username
 * @param {string} options.password Cloud password
 * @param {boolean} options.debug Debug the module. Optional. Default false
 * @param {string} options.deviceId Default Device Id
 * @param {boolean} options.gzip If gzip is enabled for the cloud messages. Optional. default true
 * @param {object} options.webrtc Reference to WebRTC module for NodeJS. If non specified, wrtc is used. Tested with electron-webrtc
 * @param {object} options.waiter How many ms to wait before WebRTC API call. Necessary for electron-webrtc as too fast calls crash the communication (values > 1000ms must be set for electron-webrtc)
 * @returns CloudAPI
 * @example let CloudAPI = require('node-unifiapi/cloudapi');
 * let cloud = CloudAPI({ deviceId: 'aaaffaad0121212', username: 'clouduser', password: 'cloudpass'});
 * cloud.self()
 *     .then(() => cloud.devices())
 *     .then(data => { console.log('Devices', data); return cloud.api.stat_sessions(); })
 *     .then(data => console.log('Sessions', data))
 *     .catch(err => console.log('Error', err))
 */
function CloudAPI(options) {
    if (!(this instanceof CloudAPI)) return new CloudAPI(options);
    merge(this, defaultOptions, options);
    if (this.debug) debug.enabled = true;
    if (typeof this.net === 'undefined') {
        this.net = new CloudRequest(merge(true, defaultOptions, options));
    }
    let o = {
        baseUrl: '',
        debug: this.debug,
        net: {
            login: () => this.cloudLogin(),
            logout: () => this.cloudLogout(),
            req: (url, jsonParams, headers, method, baseUrl) => this.cloudReq(url, jsonParams, headers, method, baseUrl)
        }
    };
    if (this.webrtc) o.webrtc = this.webrtc;
    if (this.waiter) o.waiter = this.waiter;
    this.api = new UnifiAPI(o);
    this._qqq = {
        openWebRtcAsCalled: []
    };

    debug('CloudAPI Initialized with options %o', options);
}

/**
 * Enable or disable debugging
 * @param {boolean} enabled Enable or Disable debugging
 * @return {undefined}
 */
CloudAPI.prototype.debugging = function(enabled) {
    this.debug = enabled;
    debug.enabled = this.debug ? true : false;
    if (this.api && this.api.debugging) this.api.debugging(this.debug);
    debug('Debug is', this.debug ? 'enabled' : 'disabled');
};


/**
 * Explicit login. Optional call as implicit login is always in place
 * @param {string} username username if different from default. 
 * @param {string} password password if different from default. 
 * @return {Promise} Promise
 * @example cloud.login()
 *     .then(done => console.log('Success', done))
 *     .catch(err => console.log('Error', err))
 */
CloudAPI.prototype.login = function(username, password) {
    return this.net.login(username, password);
};

/**
 * Explicit logout
 * @return {Promise} Promise
 * @example cloud.logout()
 *     .then(done => console.log('Success', done))
 *     .catch(err => console.log('Error', err))
 */
CloudAPI.prototype.logout = function() {
    this.closeWebRtc();
    return this.net.logout();
};

/**
 * Check information about self
 * @return {Promise} Promise
 * @example cloud.self()
 *     .then(done => console.log('Success', done))
 *     .catch(err => console.log('Error', err))
 */
CloudAPI.prototype.self = function() {
    return this.net.req('/user/self');
};

/**
 * List registered devices / controllers
 * @return {Promise} Promise
 * @example cloud.devices()
 *     .then(done => console.log('Success', done))
 *     .catch(err => console.log('Error', err))
 */
CloudAPI.prototype.devices = function() {
    return this.net.req('/devices', undefined, undefined, undefined,
        baseUrl = "https://device-airos.svc.ubnt.com/api/airos/v1/unifi");
};

/**
 * Forget device/controller
 * @param {string} device_id ID of the device
 * @return {Promise} Promise
 * @example cloud.delete_device('aa8181092821922221a')
 *     .then(done => console.log('Success', done))
 *     .catch(err => console.log('Error', err))
 */
CloudAPI.prototype.delete_device = function(device_id = '') {
    return this.net.req('/devices/' + device_id, undefined, undefined, method = 'DELETE',
        baseUrl = "https://device-airos.svc.ubnt.com/api/airos/v1/unifi");
};

CloudAPI.prototype.turn_creds = function(device_id) {
    return this.net.req('/turn/creds?username=' + device_id, undefined, undefined, undefined,
        baseUrl = "https://device-airos.svc.ubnt.com/api/airos/v1/unifi"
    );
};

CloudAPI.prototype.filterTcpCandidates = function(sdp) {
    return sdp.replace(/a=candidate[^\n]*tcp[^\n]*\n/g, "");
};

CloudAPI.prototype.openWebRtcAsCalled = function(deviceId) {
    let device_id = deviceId || this.deviceId;
    return new Promise((resolve, reject) => {
        this._qqq.openWebRtcAsCalled.push({ resolve: resolve, reject: reject });
        if (this._qqq.openWebRtcAsCalled.length > 1) return; // We are having already one waiting
        let webRtcId;
        let sdpData;
        let apiChannel;
        this.login()
            .then(() => {
                let cookie = this.net.jar.getCookieString(this.baseUrl);
                this.wss = wss({
                    debug: this.debug,
                    cookie: cookie
                });
                return this.wss.connect();
            })
            .then(() => {
                debug('WebSocket is connected');
                return this.turn_creds(device_id);
            })
            .then((data) => {
                let stunUri = data.uris.filter((n) => n.match(/^stun/)).shift();
                let turnUri = data.uris.filter((n) => n.match(/^turn/)).shift();
                debug('WEBRTC_WS_SENDING');
                let o = { debug: this.debug };
                if (this.webrtc) o.webrtc = this.webrtc;
                if (this.waiter) o.waiter = this.waiter;
                this.wrtc = new wrtc(o);
                this.wrtc.RTCPeerConnection({
                    iceServers: [{
                            urls: stunUri,
                            url: this.stun
                        },
                        {
                            urls: turnUri,
                            url: this.turn,
                            username: data.username,
                            credential: data.password
                        }
                    ]
                }, {
                    optional: [
                        { DtlsSrtpKeyAgreement: true },
                        { RtpDataChannels: true }
                    ]
                });
                return this.wss.actionRequest('sdp_exchange', {
                    device_id: device_id,
                    payload: {
                        username: data.username,
                        password: data.password,
                        ttl: 86400,
                        type: 'OFFER',
                        stunUri: stunUri,
                        turnUri: turnUri
                    }
                });
            })
            .then((data) => {
                debug('WEBRTC_SDP_RECEIVING', data);
                webRtcId = data.response.webRtcId;
                return this.wrtc.setRemoteDescription({
                    type: 'offer',
                    sdp: this.filterTcpCandidates(data.response.sdp)
                });
            })
            .then((data) => {
                return this.wrtc.createAnswer(data);
            })
            .then((data) => {
                return this.wrtc.setLocalDescription(data);
            })
            .then((data) => {
                sdpData = data;
                return this.wrtc.openApiChannel();
            })
            .then((channel) => {
                apiChannel = channel;
                return this.wrtc.collectIceCandidates(sdpData);
            })
            .then((data) => {
                debug('LocalData to send', data);
                let sdp = data.sdp;
                let line = sdp
                    .match(/^a=candidate:.+udp\s(\d+).+$/mig);
                debug('line', line);
                line = line
                    .sort((a, b) => {
                        let x = a.match(/udp\s+(\d+)\s/)[1];
                        let y = b.match(/udp\s+(\d+)\s/)[1];
                        return x > y;
                    }).shift();
                let ip = line.match(/udp\s+\d+\s+(\S+)\s/)[1];
                return this.wss.actionRequest('sdp_exchange', {
                    device_id: device_id,
                    payload: {
                        sdpAnswer: sdp.replace("c=IN IP4 0.0.0.0", "c=IN IP4 " + ip),
                        type: 'ANSWER',
                        webRtcId: webRtcId
                    }
                });
            })
            .then((data) => {
                debug('Send test message');
                return this.wrtc.sendApiMsg('/api/self', {});
            })
            .then((data) => {
                debug('Received test response', data);
                this.wrtcOpen = device_id;
                this._qqq.openWebRtcAsCalled.forEach(n => n.resolve(this.api));
                this._qqq.openWebRtcAsCalled = [];
            })
            .catch(e => {
                debug('Error in opening webrtc');
                this._qqq.openWebRtcAsCalled.forEach(n => n.reject(this.api));
                this._qqq.openWebRtcAsCalled = [];
            });
    });
};

CloudAPI.prototype.cloudLogin = function() {
    return new Promise((resolve, reject) => {
        if (this.wrtcOpen) return resolve();
        debug('cloudLogin');
        this.openWebRtcAsCalled().then(resolve).catch(reject);
    });
};

CloudAPI.prototype.cloudLogout = function() {
    return new Promise((resolve, reject) => {
        debug('cloudLogout');
        this.closeWebRtc();
        this.wrtcOpen = null;
        resolve(); // I have to fix the response
    });
};

CloudAPI.prototype.cloudReq = function(url = '/', jsonParams = undefined, headers = {}, method = undefined, baseUrl = undefined) {
    if (typeof method === 'undefined') {
        if (typeof jsonParams === 'undefined') method = 'GET';
        else method = 'POST';
    }
    return new Promise((resolve, reject) => {
        debug('CloudRequest', url, jsonParams, headers, method, baseUrl);
        this.cloudLogin()
            .then(() => {
                return this.wrtc.sendApiMsg(url, {
                    contentType: headers ? headers['Content-Type'] || 'application/json' : 'application/json',
                    method: method,
                    data: jsonParams
                });
            })
            .then((data) => {
                if (data && data.request && data.request.rc == 'ok') {
                    resolve({
                        meta: {
                            rc: data.request.rc
                        },
                        data: data.data
                    });
                } else {
                    reject({
                        meta: {
                            rc: (data && data.request) ? data.request.rc || 'error' : 'error'
                        },
                        data: (data && data.data) ? data.data : null
                    });
                }
            })
            .catch(reject);
    });
};

CloudAPI.prototype.closeWebRtc = function() {
    if (this.wss) this.wss.disconnect();
    if (this.wrtc) this.wrtc.close();
};

module.exports = CloudAPI;