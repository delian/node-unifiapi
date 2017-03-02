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

function CloudAPI(options) {
    if (!(this instanceof CloudAPI)) return new CloudAPI(options);
    merge(this, defaultOptions, options);
    if (this.debug) debug.enabled = true;
    if (typeof this.net === 'undefined') {
        this.net = new CloudRequest(merge(true, defaultOptions, options));
    }
    this.api = new UnifiAPI({
        baseUrl: '',
        debug: this.debug,
        net: {
            login: () => this.cloudLogin(),
            logout: () => this.cloudLogout(),
            req: (url, jsonParams, headers, method, baseUrl) => this.cloudReq(url, jsonParams, headers, method, baseUrl)
        }
    });
    this._qqq = {
        openWebRtcAsCalled: []
    };

    debug('CloudAPI Initialized with options %o', options);
}

CloudAPI.prototype.login = function(username, password) {
    return this.net.login(username, password);
};

CloudAPI.prototype.logout = function() {
    this.closeWebRtc();
    return this.net.logout();
};

CloudAPI.prototype.self = function() {
    return this.net.req('/user/self');
};

CloudAPI.prototype.devices = function() {
    return this.net.req('/devices', undefined, undefined, undefined,
        baseUrl = "https://device-airos.svc.ubnt.com/api/airos/v1/unifi");
};

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
                this.wrtc = new wrtc({ debug: this.debug });
                this.wrtc.RTCPeerConnection({
                    iceServers: [{
                            url: stunUri
                        },
                        {
                            url: turnUri
                        }
                    ]
                }, { optional: [] });
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