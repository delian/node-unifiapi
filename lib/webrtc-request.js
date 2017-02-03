let wrtc = require('wrtc');
let debug = require('debug')('WebRTCRequest');
let merge = require('merge');

let defaultOptions = {

};

function WebRTCRequest(options) {
    if (!(this instanceof WebRTCRequest)) return new WebRTCRequest(options);
    merge(this, defaultOptions, options);
    if (this.debug) debug.enabled = true;
    debug('WebRTC-request initialized with options %o', options);
}

WebRTCRequest.prototype.RTCPeerConnection = function(iceServers) {
    this.peer = new wrtc.RTCPeerConnection();
    this._icecandidateevent = [];
    this._icesignalingevent = [];
    this._iceconnectionevent = [];
    this._icegatheringevent = [];

    this.peer.onicecandidate = (candidate) => {
        debug('I see candidate', candidate);
        this._icecandidateevent.forEach((n) => n(candidate)); // Callback all ice waiters
    };
    this.peer.onsignalingstatechange = (event, a, b, c) => {
        debug('On signalling change', event, a, b, c);
        this._icesignalingevent.forEach((n) => n(event)); // Callback all waiters
    };
    this.peer.oniceconnectionstatechange = (event, a, b, c) => {
        debug('oniceconnectionstatechange', event, a, b, c);
        this._iceconnectionevent.forEach((n) => n(event)); // Callback all waiters
    };
    this.peer.onicegatheringstatechange = (event, a, b, c) => {
        debug('onicegatheringstatechange', event, a, b, c);
        this._icegatheringevent.forEach((n) => n(event)); // Callback all waiters
    };
};

WebRTCRequest.prototype.reqisterQ = function(q, fn) {
    if (q.indexOf(fn)<0) {
        q.push(fn);
    }
};

WebRTCRequest.prototype.deregisterQ = function(q, fn) {
    if (q.indexOf(fn)>=0) {
        q.splice(q.indexOf(fn),1);
    }
};

WebRTCRequest.prototype.addIceWaiter = function(fn) {
    this.reqisterQ(this._icecandidateevent, fn);
};

WebRTCRequest.prototype.removeIceWaiter = function(fn) {
    this.deregisterQ(this._icecandidateevent, fn);
};

WebRTCRequest.prototype.setLocalDescription = function(desc) {
    return new Promise((resolve, reject) => {
        debug('WEBRTC_SET_LOCALDESCR', desc);
        this.peer.setLocalDescription(
            new wrtc.RTCSessionDescription(desc),
            (data) => {
                resolve(data || desc);
            },
            reject
        );
    });
};

WebRTCRequest.prototype.createAnswer = function(desc) {
    return new Promise((resolve, reject) => {
        debug('WEBRTC_CREATE_ANSWER', desc);
        this.peer.createAnswer(
            (data) => { // Set my local description
                resolve(data || desc);
            },
            reject
        );        
    });
};

WebRTCRequest.prototype.setRemoteDescription = function(desc) {
    return new Promise((resolve, reject) => {
        debug('WEBRTC_SET_REMOTEDESC', desc);
        if (!this.peer) {
            debug('No RTC peer defined');
            return reject('No RTC peer defined');
        }
        this.peer.setRemoteDescription(
            new wrtc.RTCSessionDescription(desc),
            (data) => { // Create Answer
                resolve(data || desc);
            },
            reject
        );
    });
};

WebRTCRequest.prototype.waitForIceCandidates = function(data) {
    return new Promise((resolve, reject) => {
        // Here we have to implement waiting for iceServers
        debug('WEBRTC_WAIT_ICECANDIDATES', data);
        let sdp = data.sdp.replace(/\r/,'');
        this.addIceWaiter((candidate) => {
            debug('Ive got', candidate, sdp);
            if (candidate === null || candidate.candidate === null) {
                debug('Candidate is empty, terminate the gathering');
                data.sdp = sdp;
                return resolve(data);
            } // TODO: implement reject
            if (candidate && candidate.candidate) {
                let cand = candidate.candidate;
                // We have to add this candidate to the data (SDP)
                if (cand.candidate.match(/tcp/)) return; // Ignore TCP candidates
                for (var b, c, d = sdp, e = 0, f = 0, g = /m=[^\n]*\n/g; null !== (b = g.exec(d)); ) {
                    if (f === cand.sdpMLineIndex) {
                        return c = b.index,
                        b = g.exec(d),
                        e = null !== b ? b.index : -1,
                        e >= 0 ? sdp = [d.slice(0, e), "a=" + cand.candidate + "\n", d.slice(e)].join("") : sdp = d + "a=" + cand.candidate + "\n",
                        sdp;
                    }
                    f++;
                }
            }
        });
    });
};

module.exports = WebRTCRequest;
