let wrtc = require('./webrtc-request');
let Uuid = require('uuid');
let debug = require('debug')('Unifi SSH');

function SSHSession(unifi, mac, uuid, stun, turn, username, password, site = undefined, autoclose) {
    this.unifi = unifi;
    this.mac = mac;
    this.uuid = uuid || Uuid.v4();
    this.stun = stun;
    this.turn = turn;
    this.username = username;
    this.password = password;
    this.site = site;
    this.channel = undefined;
    this.debug = this.unifi.debug;
    debug.enabled = this.debug;
    this.buffer = "";
    this.status = "closed";
    this.inClosing = false;
    this.autoclose = autoclose || 30000;
    this.connectTimeout = 15000;
    this._q = {};
    this._qqq = {
        connect: []
    };
}

SSHSession.prototype.connect = function() {
    return new Promise((resolve, reject) => {
        let timeoutChannel = null;
        let me = this;

        function myResolve(data) {
            clearTimeout(timeoutChannel);
            me._qqq.connect.forEach(n => n.resolve(data));
            me._qqq.connect = [];
        }

        function myReject(data) {
            clearTimeout(timeoutChannel);
            me._qqq.connect.forEach(n => n.reject(data));
            me._qqq.connect = [];
        }

        if (this.status == "open") return resolve(this);
        this._qqq.connect.push({ resolve: resolve, reject: reject });
        if (this._qqq.connect.length > 1) return; // Something is waiting
        this.inClosing = false;
        this.unifi.buildSSHSession(this.mac, this.uuid, "-1", this.stun, this.turn, this.username, this.password, this.site)
            .then(() => {
                this.wrtc = new wrtc({ debug: this.debug });
                this.wrtc.RTCPeerConnection(
                    //{
                    // iceServers: [
                    //     {
                    //         url: stun
                    //     },
                    //     {
                    //         url: turn
                    //     }
                    // ]},
                    // { optional: [] }
                ); // ICE Servers
                this.wrtc.setCallback('oniceconnectionstatechange', () => {
                    let state = this.wrtc.peer.iceConnectionState;
                    if (state == 'disconnected' || state == 'failed') {
                        debug('We are notified for session disconnection');
                        let rej = this.state != "open";
                        this.close();
                        if (rej) myReject('SSH Connection fail');
                    }
                });
                this.wrtc.setCallback('ondatachannel', (event) => {
                    debug('GREAT, we have the session channel', event.channel);
                    this.channel = event.channel;
                    this.channel.onopen = () => {
                        debug('SSH session is open');
                        this.status = "open";
                        clearTimeout(timeoutChannel);
                        this.fireQ('onopen');
                        this.touchAutoClose();
                        myResolve(this);
                    };
                    this.channel.onclose = () => {
                        debug('SSH session is closed');
                        this.fireQ('onclose');
                    };
                    this.channel.onmessage = (event) => {
                        let u = new Uint8Array(event.data);
                        let s = "";
                        for (let i = 0; i < u.byteLength; i++) s += String.fromCharCode(u[i]);
                        debug('SSHChannel message', s);
                        this.buffer += s;
                        this.fireQ('onmessage', event);
                    };
                });
                return this.unifi.getSDPOffer(this.mac, this.uuid, this.site);
            })
            .then((data) => {
                let sdpOffer = data.data.shift().ssh_sdp_offer;
                debug('SSH SDP Offer is', sdpOffer);
                return this.wrtc.setRemoteDescription({
                    type: 'offer',
                    sdp: sdpOffer
                });
            })
            .then((data) => {
                return this.wrtc.createAnswer(data);
            })
            .then((data) => {
                return this.wrtc.setLocalDescription(data);
            })
            .then((sdpData) => {
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
                return this.unifi.sshSDPAnswer(this.mac, this.uuid, sdp.replace("c=IN IP4 0.0.0.0", "c=IN IP4 " + ip), this.site);
            })
            .then((data) => {
                debug('Channel is supposed to be open now. Lets wait');
                timeoutChannel = setTimeout(() => {
                    debug('Timeout has passed without response, the channel is not open');
                    this.unifi.closeSSHSession(this.mac, this.uuid, this.site)
                        .then(myReject)
                        .catch(myReject);
                }, this.connectTimeout);
            })
            .catch(myReject);
    });
};

SSHSession.prototype.touchAutoClose = function() {
    if (this._autoclose) clearTimeout(this._autoclose);
    if (this.autoclose) {
        this._autoclose = setTimeout(() => {
            debug('Closing due no activity');
            this.close();
        }, this.autoclose);
    }
};

SSHSession.prototype.registerQ = function(q, fn) {
    if (typeof this._q[q] !== 'object') this._q[q] = [];
    if (this._q[q].indexOf(fn) < 0) this._q[q].push(fn);
};

SSHSession.prototype.deregisterQ = function(q, fn) {
    if (this._q[q].indexOf(fn) >= 0) this._q[q].splice(this._q[q].indexOf(fn), 1);
};

SSHSession.prototype.dropQ = function(q) {
    delete this._q[q];
};

SSHSession.prototype.fireQ = function(q, msg) {
    if (this._q[q]) this._q[q].forEach((n) => n(msg));
};

SSHSession.prototype.send = function(msg) {
    this.touchAutoClose();
    debug('send:', msg);
    this.channel.send(msg);
};

SSHSession.prototype.recv = function() {
    this.touchAutoClose();
    let buf = this.buffer;
    this.buffer = "";
    //debug('recv:', buf);
    return buf;
};

SSHSession.prototype.close = function() {
    this.status = "closed";
    return new Promise((resolve, reject) => {
        if (this.inClosing) resolve();
        this.inClosing = true;
        if (this._autoclose) clearTimeout(this._autoclose);
        this.unifi.closeSSHSession(this.mac, this.uuid, this.site)
            .then(resolve)
            .catch(reject);
    });
};

SSHSession.prototype.wait = function(timeout) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(this);
        }, timeout);
    });
};

SSHSession.prototype.expect = function(test, timeout, errormsg) {
    return new Promise((resolve, reject) => {
        let t = /.*/;
        if (test instanceof RegExp) t = test;
        if (typeof test == 'string') t = new RegExp(test);
        let c = null;
        timeout = timeout || 10000;
        errormsg = errormsg || 'timeout for ' + t;
        debug('Expecting', t, timeout, errormsg);
        let check = () => {
            if (t.test(this.buffer)) {
                clearTimeout(c);
                this.deregisterQ('onmessage', check);
                debug('Match found', t, 'in', this.buffer);
                resolve(this, this.recv()); // Clear the buffer
            }
        };
        c = setTimeout(() => {
            this.deregisterQ('onmessage', check);
            reject(errormsg);
        }, timeout);
        this.registerQ('onmessage', check);
    });
};

module.exports = SSHSession;