let wrtc = require('wrtc');
let debug = require('debug')('WRTCTest');
let merge = require('merge');
debug.enabled = true;

class WRTC {
    constructor(options) {
        merge(this, options);
        this._q = {};
        this._channel = {};
        this.log = require('debug')(this.debugName || 'WRTC');
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

    RTCPeerConnection(options) {
        debug('WRTC_PEER_OPEN', options)
        this.peer = new wrtc.RTCPeerConnection(options);
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

let a = new WRTC({
    debug: true,
    debugName: 'WRTC A'
});
let b = new WRTC({
    debug: true,
    debugName: 'WRTC B'
});

// Caller
a.RTCPeerConnection({
    iceServers: [
      'stun:turn.ubnt.com:3478?transport=udp'
    ]
});

// Called
b.RTCPeerConnection({
    iceServers: [
      'stun:turn.ubnt.com:3478?transport=udp'
    ]
});
let channelA;

a.openDataChannel('test')
    .then((channel) => {
        //debug('Data channel for A is initiated', channel);
        channelA = channel;
        a.registerQ('onicecandidate', (c) => {
            debug('A ICE, add to B', c.candidate);
            b.addIcePeer(c.candidate);
        });
        b.registerQ('onicecandidate', (c) => {
            debug('B ICE, add to A', c.candidate);
            a.addIcePeer(c.candidate);
        });
        return a.createOffer();
    })
    .then((data) => {
        // Create offer response
        return a.setLocalDescription(data);
    })
    .then((data) => {
        // Now we have the remote description to be set
        return b.setRemoteDescription(data);
    })
    .then((data) => {
        return b.createAnswer(data); // Check the answer
    })
    .then((data) => {
        // Fix the local description
        return b.setLocalDescription(data);
    })
    .then((data) => {
        // Set the remote remote description
        return a.setRemoteDescription(data);
    })
    .then((data) => {
        // Set the datachannel for b
        return b.openDataChannel('test');
    })
    // .then(() => {
    //     return a.waitForIceCandidates();
    // })
    // .then((ices) => {
    //     return a.addIcePeers(ices);
    // })
    // .then((ices) => {
    //     return b.waitForIceCandidates();
    // })
    // .then((ices) => {
    //     return b.addIcePeers(ices);
    // })
    .then(() => {
        debug('Data channel is supposed to be open');
        channelA.send('test');
    })
    .catch((event) => {
        debug('ERROR, Data channel', event);
    });
