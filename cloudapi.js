let debug = require('debug')('CloudAPI');
let merge = require('merge');
let CloudRequest = require('./lib/cloud-request');
let wss = require('./lib/unifi-wss');
let wrtc = require('./lib/webrtc-request');

let defaultOptions = {
    'username': 'unifi',
    'password': 'unifi',
    'baseUrl': 'https://sso.ubnt.com/api/sso/v1',
    'debug': false,
    'wss': null,
    'debugNet': false,
    'gzip': true,
    'site': 'default'
};

function CloudAPI(options) {
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

CloudAPI.prototype.openWebRtcAsCaller = function(device_id) {
    return new Promise((resolve, reject) => {
        let webRtcId;
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
                this.wrtc = new wrtc({ debug: this.debug });
                this.wrtc.RTCPeerConnection([
                    { url: stunUri },
                    { url: turnUri }
                ]);
                debug('WEBRTC_WS_SENDING');
                this.wrtc = new wrtc({ debug: this.debug });
                this.wrtc.RTCPeerConnection({
                    iceServers: [
                        {
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
<<<<<<< HEAD
                debug('WEBRTC_SDP_RECEIVING');
=======
                debug('WEBRTC_SDP_RECEIVING', data);
                webRtcId = data.response.webRtcId;
>>>>>>> c56bf889065b5b1806e1013cf2ab624be02074a7
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
                return this.wrtc.waitForIceCandidates(data);
            })
            .then((data) => {
                debug('LocalData to send', data);
                return this.wss.actionRequest('sdp_exchange', {
                    device_id: device_id,
                    payload: {
                        sdpAnswer: data.sdp,
                        type: 'ANSWER',
                        webRtcId: webRtcId
                    }
                });
            })
            .then((data) => {
                resolve(data);
            })
            .catch(reject);
    });
};

CloudAPI.prototype.closeWebRtc = function() {
    if (this.wss) this.wss.disconnect();
};

module.exports = CloudAPI;