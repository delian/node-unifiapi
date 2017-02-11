let wrtc = require('wrtc');
let debug = require('debug')('WebRTCRequest');
let merge = require('merge');

let defaultOptions = {

};

class WRTC {
    constructor(options) {
        merge(this, defaultOptions, options);
        this._q = {};
        this._channel = {};
        this.log = require('debug')(this.debugName || 'WRTCRequest');
        if (this.debug) this.log.enabled = true;
    }

    registerQ(q, fn) {
        if (typeof this._q[q] !== 'object') this._q[q] = [];
        if (this._q[q].indexOf(fn) < 0) this._q[q].push(fn);
    }

    deregisterQ(q, fn) {
        if (this._q[q].indexOf[fn] >= 0) this._q[q].splice(this._q[q].indexOf(fn, 1));
    }

    fireQ(q, msg) {
        if (this._q[q]) this._q[q].forEach((n) => n(msg));
    }

    dropQ(q) {
        delete this._q[q];
    }

    RTCPeerConnection(options, conditions) {
        debug('WRTC_PEER_OPEN', options, conditions);
        this.peer = new wrtc.RTCPeerConnection(options, conditions);
        [
            'onicecandidate', 'onsignalingstatechange', 'oniceconnectionstatechange',
            'onicegatheringstatechange', 'ondatachannel', 'onnegotiationneeded',
            'onaddstream'
        ].forEach((n) => {
            this.peer[n] = (event) => {
                this.log(n, event);
                this.fireQ(n, event);
            };
        });

        this._icecandidates = [];
        this.registerQ('onicecandidate', (candidate) => {
            this._icecandidates.push(candidate.candidate);
        });

        this.registerQ('onsignalingstatechange', () => {
            this.log('SIGNALING STATE',this.peer.signalingState);
        });

        this.registerQ('onicegatheringstatechange', () => {
            this.log('ICEGATHERING STATE', this.peer.iceGatheringState);
        });

        this.registerQ('oniceconnectionstatechange', () => {
            this.log('ICECONNECTION STATE', this.peer.iceConnectionState);
        });
    }

    setLocalDescription(desc) {
        return new Promise((resolve, reject) => {
            this.log('WEBRTC_SET_LOCALDESCR', desc);
            this.peer.setLocalDescription(
                new wrtc.RTCSessionDescription(desc),
                (data) => {
                    resolve(data  || desc); // Data is always null
                },
                reject
            );
        });
    }

    setRemoteDescription(desc) {
        return new Promise((resolve, reject) => {
            this.log('WEBRTC_SET_REMOTEDESC', desc);
            this.peer.setRemoteDescription(
                new wrtc.RTCSessionDescription(desc),
                (data) => { // Create Answer
                    resolve(data /*|| desc*/);
                },
                reject
            );
        });
    }

    createAnswer(/*desc*/) {
        return new Promise((resolve, reject) => {
            this.log('WEBRTC_CREATE_ANSWER'/*, desc*/);
            this.peer.createAnswer(
                (data) => { // Set my local description
                    resolve(data /*|| desc*/);
                },
                reject
            );
        });
    }

    createOffer() {
        return new Promise((resolve, reject) => {
            this.log('WEBRTC_CREATE_OFFER');
            this.peer.createOffer(resolve, reject);
        });
    }

    waitForIceCandidates(data, timeout) {
        timeout = timeout || 30;
        let d = new Date();
        return new Promise((resolve, reject) => {
            this.log('WEBRTC_WAIT_ICECANDIDATES', data);
            let test = () => {
                if (this._icecandidates.indexOf(null)>=0) return resolve(this._icecandidates);
                if (new Date() - d > timeout*1000) return reject();
                setTimeout(test, 100); // Retry again in 1 second
            };
            test();
        });
    }

    collectIceCandidates(data) {
        return new Promise((resolve, reject) => {
            // Here we have to implement waiting for iceServers
            debug('WEBRTC_WAIT_ICECANDIDATES', data);
            let sdp = data.sdp.replace(/\r/, '');
            this.registerQ('onicecandidate', (candidate) => {
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
                    sdp = sdp.replace(/\r\n/g,'\n');
                    for (var b, c, d = sdp, e = 0, f = 0, g = /m=[^\n]*\n/g; null !== (b = g.exec(d));) {
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
    }

    addIcePeer(peer) {
        if (peer) this.peer.addIceCandidate(peer);
    }

    addIcePeers(list) {
        return new Promise((resolve, reject) => {
            this.log('Add ICE peers');
            list.forEach((n) => this.addIcePeer(n));
            resolve(list);
        });
    }

    openDataChannel(name, half) {
        return new Promise((resolve, reject) => {
            this.log('WEBRTC_OPEN_CHANNEL', name);
            let channel = this.peer.createDataChannel(name);
            this._channel[name] = channel;
            channel.onopen = (event) => {
                this.log('channel, on open', name, event, channel.readyState);
                if (channel.readyState === "open") resolve(channel);
            };
            channel.onmessage = (msg) => {
                this.log('channel, on message', msg);
            };
            channel.onerror = (event) => {
                this.log('channel, on error', event);
                reject();
            };
            channel.onclose = (event) => {
                this.log('channel, on close', event);
                reject(); // Is it correct?
            };
            resolve(channel);
        });        
    }

    close() {
        this.peer.close();
    }
}

module.exports = WRTC;