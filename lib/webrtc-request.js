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
    this.peer.onicecandidate = function(candidate) {
        debug('I see candidate', candidate);
        if (!candidate.candidate) return;
        // The other peer must get the candidate
    };
};

WebRTCRequest.prototype.setRemoteDescription = function(desc) {
    return new Promise((resolve, reject) => {
        debug('Setting Remote Description', desc);
        if (!this.peer) {
            debug('No RTC peer defined');
            return reject('No RTC peer defined');
        }
        this.peer.setRemoteDescription(
            new wrtc.RTCSessionDescription(desc),
            () => { // Create Answer
                debug('WEBRTC_CREATE_ANSWER');
                this.peer.createAnswer(
                    (desc) => { // Set my local description
                        this.peer.setLocalDescription(
                            new wrtc.RTCSessionDescription(desc),
                            () => {
                                // Here we have to send my description to the remote side
                                debug('Send descr', desc);
                            },
                            reject
                        );
                    },
                    reject
                );
            },
            reject
        );
    });
};

module.exports = WebRTCRequest;
