/** @format */

import { WRTC as wrtc } from './webrtc-request';
import { v4 } from 'uuid';
import { debug } from 'debug'; // let debug = require('debug')('Unifi SSH');
import { WrtcOptions } from './interfaces';

export class SSHSession {
    buffer = '';
    status = 'closed';
    inClosing = false;
    private _q: any = {};
    private _qqq: any = { connect: [] };
    debug: string;
    wrtc: wrtc;
    private _autoclose: any;
    private lastBuff: any;
    private lastMatch: any;

    constructor(
        public unifi: any, // TODO check
        public mac: string,
        public uuid: string = v4(),
        public stun: string | string[],
        public turn: string | string[],
        public username: string,
        public password: string,
        public site: string,
        public autoclose: number = 30000,
        public webrtc?: any,
        public waiter?: any,
        public channel?: any,
        public connectTimeout = 15000
    ) {
        this.debug = this.unifi.debug;
        debug.enabled(this.debug);
    }

    /**
     * Enable or disable debugging
     * @param {boolean} enabled Enable or Disable debugging
     * @return {undefined}
     */
    debugging(enabled): void {
        this.debug = enabled;
        debug.enabled(this.debug ? 'true' : 'false');
        debug(`Debug is ${this.debug ? 'enabled' : 'disabled'}`); // TODO: this is not working, because the check is boolean and the output must be a string. It shall be fixed
    }

    /**
     * @param {number} connectTimeout How much time to wait for connection. Default 15000ms
     * @param {Function} closeCallBack Function which will be called in case of close
     * @return {Promise}
     */
    connect(connectTimeout, closeCallBack) {
        return new Promise((resolve, reject) => {
            let timeoutChannel = null;
            const me = this;

            function myResolve(data) {
                clearTimeout(timeoutChannel);
                me._qqq.connect.forEach((n) => n.resolve(data));
                me._qqq.connect = [];
            }

            function myReject(data) {
                clearTimeout(timeoutChannel);
                me._qqq.connect.forEach((n) => n.reject(data));
                me._qqq.connect = [];
                if (typeof closeCallBack === 'function') closeCallBack(data);
            }

            if (this.status === 'open') return resolve(this);
            this._qqq.connect.push({ resolve, reject });
            if (this._qqq.connect.length > 1) return; // Something is waiting
            this.inClosing = false;
            let firstCall;
            if (this.stun || this.turn) {
                firstCall = this.unifi.buildSSHSession(
                    this.mac,
                    this.uuid,
                    '-1',
                    this.stun,
                    this.turn,
                    this.username || '',
                    this.password || '',
                    this.site
                );
            } else {
                firstCall = this.unifi.getTurnCredentials().then((data) => {
                    debug(`Turn credentials are ${data?.data}`);
                    if (data && data.data) {
                        const d = data.data.shift() ?? {};
                        if (d.uris) {
                            this.stun = d.uris
                                .filter((n) => n.match(/stun:/))
                                .map((n) => n.replace(/\?.*/, ''));
                            this.turn = d.uris
                                .filter((n) => n.match(/turn:/))
                                .map((n) => n.replace(/\?.*/, ''));
                            this.username = d.username;
                            this.password = d.password;
                        }
                    }
                    return this.unifi.buildSSHSession(
                        this.mac,
                        this.uuid,
                        '-1',
                        this.stun instanceof Array && this.stun[0]
                            ? this.stun[0].replace(/stun:/, '')
                            : this.stun,
                        this.turn instanceof Array && this.turn[0]
                            ? this.turn[0].replace(/turn:/, '')
                            : this.turn,
                        this.username,
                        this.password,
                        this.site
                    );
                });
            }
            firstCall
                .then(() => {
                    const o: WrtcOptions = {
                        debug: this.debug ? true : false, // TODO: fix the debug
                        waiter: this.waiter,
                        webrtc: this.webrtc,
                    };
                    this.wrtc = new wrtc(o);
                    debug(
                        `Will open peer connection with stun ${this.stun} turn ${this.stun}`
                    );
                    this.wrtc.RTCPeerConnection(
                        {
                            iceServers: [
                                {
                                    urls: this.stun,
                                    url: this.stun,
                                },
                                {
                                    urls: this.turn,
                                    url: this.turn,
                                    username: this.username,
                                    credential: this.password,
                                },
                            ],
                        },
                        {
                            optional: [
                                { DtlsSrtpKeyAgreement: true },
                                { RtpDataChannels: true },
                            ],
                        }
                    ); // ICE Servers
                    const connStateChange = () => {
                        debug('CAREFUL, Connection state changed');
                        const state = this.wrtc.peer.iceConnectionState;
                        if (state === 'disconnected' || state === 'failed') {
                            debug('We are notified for session disconnection');
                            const rej = state !== 'open';
                            this.close();
                            if (typeof closeCallBack === 'function')
                                closeCallBack(state);
                            if (rej) myReject('SSH Connection fail');
                        }
                        if (
                            [
                                /*'open',*/ 'failed',
                                'error',
                                'disconnected' /*'connected'*/,
                            ].includes(state)
                        ) {
                            // Unless we have a termination, we need to check again the state
                            debug('Connection state will be checked again');
                            this.wrtc.setCallback(
                                'oniceconnectionstatechange',
                                connStateChange
                            );
                        }
                    };
                    this.wrtc.setCallback(
                        'oniceconnectionstatechange',
                        connStateChange
                    );
                    this.wrtc.setCallback('ondatachannel', (event) => {
                        debug(
                            `GREAT, we have the session channel ${event.channel}`
                        );
                        this.channel = event.channel;
                        this.channel.onopen = () => {
                            debug('SSH session is open');
                            this.status = 'open';
                            clearTimeout(timeoutChannel);
                            this.fireQ('onopen');
                            this.touchAutoClose();
                            myResolve(this);
                        };
                        this.channel.onclose = () => {
                            debug('SSH session is closed');
                            this.fireQ('onclose');
                        };
                        this.channel.onmessage = (ev: any) => {
                            const u = new Uint8Array(ev.data);
                            let s = '';
                            for (let i = 0; i < u.byteLength; i++)
                                s += String.fromCharCode(u[i]);
                            debug(`SSHChannel message ${s}`);
                            this.buffer += s;
                            this.fireQ('onmessage', ev);
                        };
                    });
                    return this.unifi.getSDPOffer(
                        this.mac,
                        this.uuid,
                        this.site
                    );
                })
                .then((data) => {
                    const sdpOffer = data.data.shift().ssh_sdp_offer;
                    debug(`SSH SDP Offer is ${sdpOffer}`);
                    return this.wrtc.setRemoteDescription({
                        type: 'offer',
                        sdp: sdpOffer,
                    });
                })
                .then((data) => {
                    return this.wrtc.createAnswer(/* data */);
                })
                .then((data) => {
                    return this.wrtc.setLocalDescription(data);
                })
                .then((sdpData) => {
                    return this.wrtc.collectIceCandidates(sdpData);
                })
                .then((data) => {
                    debug(`LocalData to send ${data}`);
                    const sdp = data.sdp;
                    let line = sdp.match(/^a=candidate:.+udp\s(\d+).+$/gim);
                    debug(`line ${line}`);
                    line = line
                        .sort((a, b) => {
                            const x = a.match(/udp\s+(\d+)\s/)[1];
                            const y = b.match(/udp\s+(\d+)\s/)[1];
                            return x > y;
                        })
                        .shift();
                    const ip = line.match(/udp\s+\d+\s+(\S+)\s/)[1];
                    return this.unifi.sshSDPAnswer(
                        this.mac,
                        this.uuid,
                        /*sdp.replace("c=IN IP4 0.0.0.0", "c=IN IP4 " + ip) */ sdp,
                        this.site
                    );
                })
                //            .then((data) => {
                //                return this.wrtc.openDataChannel('ssh');
                //            })
                .then((data) => {
                    debug('Channel is supposed to be open now. Lets wait');
                    timeoutChannel = setTimeout(() => {
                        debug(
                            'Timeout has passed without response, the channel is not open'
                        );
                        this.unifi
                            .closeSSHSession(this.mac, this.uuid, this.site)
                            .then(() => {
                                myReject('WebRTC Session Timeout');
                            })
                            .catch(myReject);
                    }, connectTimeout || this.connectTimeout || 15000);
                })
                .catch(myReject);
        });
    }

    touchAutoClose() {
        if (this._autoclose) clearTimeout(this._autoclose);
        if (this.autoclose) {
            this._autoclose = setTimeout(() => {
                debug('Closing due no activity');
                this.close();
            }, this.autoclose);
        }
    }

    registerQ(q, fn) {
        if (typeof this._q[q] !== 'object') this._q[q] = [];
        if (this._q[q].indexOf(fn) < 0) this._q[q].push(fn);
    }

    deregisterQ(q: string, fn: any): void {
        if (this._q[q].indexOf(fn) >= 0)
            this._q[q].splice(this._q[q].indexOf(fn), 1);
    }

    dropQ(q: string): void {
        delete this._q[q];
    }

    fireQ(q: string, msg?: any): void {
        if (this._q[q]) this._q[q].forEach((n) => n(msg));
    }

    send(msg: any): void {
        this.touchAutoClose();
        debug(`send ${msg}`);
        this.channel.send(msg);
    }

    recv() {
        this.touchAutoClose();
        const buf = this.buffer;
        this.buffer = '';
        // debug('recv:', buf);
        return buf;
    }

    close(): Promise<any> {
        this.status = 'closed';
        return new Promise((resolve, reject) => {
            if (this.inClosing) resolve();
            this.inClosing = true;
            if (this._autoclose) clearTimeout(this._autoclose);
            this.unifi
                .closeSSHSession(this.mac, this.uuid, this.site)
                .then(resolve)
                .catch(reject);
        });
    }

    wait(timeout): Promise<any> {
        // TODO: This duplicates the global wait, shall be replaced
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(this);
            }, timeout);
        });
    }

    expect(
        test: any | any[],
        timeout = 10000,
        errormsg = 'timeout for expect'
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            test = test instanceof Array ? test.slice() : [test];
            const tList = test.map((n) =>
                n instanceof RegExp ? n : new RegExp(n)
            );
            let c = null;
            debug(`Expecting ${tList} ${timeout} ${errormsg}`);
            const check = () => {
                const out = tList.filter((t: RegExp) => t.test(this.buffer));
                if (out.length > 0) {
                    clearTimeout(c);
                    this.deregisterQ('onmessage', check);
                    debug(`Match found ${out} in ${this.buffer}`);
                    this.lastBuff = this.recv();
                    this.lastMatch = out;
                    resolve(this); // Clear the buffer
                }
            };
            c = setTimeout(() => {
                this.deregisterQ('onmessage', check);
                reject(errormsg);
            }, timeout);
            this.registerQ('onmessage', check);
        });
    }
}
