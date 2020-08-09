/** @format */

import { debug } from 'debug';
import * as pako from 'pako';
import { wait } from './wait';
import { WrtcOptions, OpenApiChannelIntf } from './interfaces';

const defaultOptions: WrtcOptions = {
    waiter: 10,
    webrtc: undefined,
    messageId: 1,
    debugName: 'WebRTCRequest',
    debug: false,
};

export class WRTC {
    options: WrtcOptions;
    private _q = {};
    private _channel = {};
    private _icecandidates: any;

    peer: any;
    log: any;
    messageId = 1;

    constructor(options: WrtcOptions) {
        this.options = { ...defaultOptions, ...options };
        this.log = debug(this.options.debugName); // TODO: check that the log works as expected
        if (this.options.debug) {
            this.log.enabled = true;
        }
        if (
            this.options.webrtc !== undefined &&
            this.options.webrtc.on !== undefined
        ) {
            this.options.webrtc.on('error', (error) => {
                throw new Error(`WRTC Error ${error}`);
            });
        } else {
            console.log(
                'WebRTC module is not provided as parameter! As a result, all WebRTC operations will be disabled!'
            );
        }
    }

    debugging(enabled: boolean = false) {
        this.options.debug = enabled;
        this.log.enabled = enabled;
        this.log('Debug is', this.options.debug ? 'Enabled' : 'Disabled'); // TODO: This could be better written
    }

    registerQ(q: string, fn: Function): void {
        if (typeof this._q[q] !== 'object') this._q[q] = [];
        if (this._q[q].indexOf(fn) < 0) this._q[q].push(fn);
    }

    deregisterQ(q: string, fn: Function): void {
        if (this._q[q].indexOf(fn) >= 0)
            this._q[q].splice(this._q[q].indexOf(fn), 1);
    }

    fireQ(q: string, msg: any): void {
        if (this._q[q]) this._q[q].forEach((n) => n(msg));
    }

    dropQ(q: string) {
        delete this._q[q];
    }

    RTCPeerConnection(options: any, conditions: any): void {
        if (!this.options.webrtc) {
            console.log(
                'WebRTC has not been provided as parameter! This operation is ignored!'
            );
            return;
        }
        this.log('WRTC_PEER_OPEN', options, conditions);
        this.peer = new this.options.webrtc.RTCPeerConnection(
            options,
            conditions
        );
        [
            'onicecandidate',
            'onsignalingstatechange',
            'oniceconnectionstatechange',
            'onicegatheringstatechange',
            'ondatachannel',
            'onnegotiationneeded',
            'onaddstream',
        ].forEach((n) => {
            this.peer[n] = (event) => {
                this.log(n, event);
                this.fireQ(n, event);
            };
        });

        this._icecandidates = [];
        this.registerQ('onicecandidate', (candidate) => {
            this._icecandidates.push(
                candidate ? candidate.candidate || null : null
            );
        });

        this.registerQ('onsignalingstatechange', () => {
            this.log('SIGNALING STATE', this.peer.signalingState);
        });

        this.registerQ('onicegatheringstatechange', () => {
            this.log('ICEGATHERING STATE', this.peer.iceGatheringState);
        });

        this.registerQ('oniceconnectionstatechange', () => {
            this.log('ICECONNECTION STATE', this.peer.iceConnectionState);
        });

        this.registerQ('ondatachannel', (event) => {
            this.log('We have channel open', event.channel);
        });
    }

    setCallback(event: string, fn: Function): void {
        const c = (msg) => {
            fn(msg);
            this.deregisterQ(event, c);
        };
        this.registerQ(event, c);
    }

    setLocalDescription(desc: string): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.options.webrtc) {
                console.log(
                    'WebRTC has not been provided! This operation is ignored!'
                );
                return reject('No WebRTC module provided!');
            }
            this.log('WEBRTC_SET_LOCALDESCR', desc);
            wait(this.options.waiter).then(() => {
                this.peer.setLocalDescription(
                    new this.options.webrtc.RTCSessionDescription(desc),
                    (data: any) => {
                        resolve(data || desc); // Data is always null
                    },
                    reject
                );
            });
        });
    }

    setRemoteDescription(desc: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.options.webrtc) {
                console.log(
                    'WebRTC has not been provided! This operation is ignored!'
                );
                return reject('No WebRTC module provided!');
            }
            this.log('WEBRTC_SET_REMOTEDESC', desc);
            let w = new this.options.webrtc.RTCSessionDescription(desc);
            wait(this.options.waiter).then(() => {
                this.peer.setRemoteDescription(
                    w,
                    (data) => {
                        // Create Answer
                        resolve(data /*|| desc*/);
                    },
                    reject
                );
            });
        });
    }

    createAnswer(/*desc:string*/): Promise<any> {
        return new Promise((resolve, reject) => {
            this.log('WEBRTC_CREATE_ANSWER' /*, desc*/);
            wait(this.options.waiter).then(() => {
                this.peer.createAnswer((data) => {
                    // Set my local description
                    resolve(data /*|| desc*/);
                }, reject);
            });
        });
    }

    createOffer(config: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.log('WEBRTC_CREATE_OFFER');
            wait(this.options.waiter).then(() => {
                this.peer.createOffer(resolve, reject, config);
            });
        });
    }

    waitForIceCandidates(data: any, timeout: number = 30): Promise<any> {
        const d = new Date().getTime();
        return new Promise((resolve, reject) => {
            this.log('WEBRTC_WAIT_ICECANDIDATES', data);
            const test = () => {
                if (this._icecandidates.indexOf(null) >= 0)
                    return resolve(this._icecandidates);
                if (new Date().getTime() - d > timeout * 1000) return reject();
                setTimeout(test, 100); // Retry again in a moment
                // TODO: check the timeout or move it into an option
            };
            test();
        });
    }

    collectIceCandidates(data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            // Here we have to implement waiting for iceServers
            this.log('WEBRTC_WAIT_ICECANDIDATES', data);
            let sdp = data.sdp.replace(/\r/, '');
            this.registerQ('onicecandidate', (candidate) => {
                this.log('Ive got', candidate, sdp);
                //if (candidate && candidate.candidate && candidate.candidate.candidate) candidate = candidate.candidate;
                if (
                    candidate === null ||
                    candidate.candidate === null ||
                    (typeof candidate === 'object' &&
                        typeof candidate.candidate === 'undefined')
                ) {
                    this.log('Candidate is empty, terminate the gathering');
                    data.sdp = sdp;
                    return resolve(data);
                } // TODO: implement reject
                if (candidate && candidate.candidate) {
                    const cand = candidate.candidate;
                    // We have to add this candidate to the data (SDP)
                    if (cand.candidate.match(/tcp/)) return; // Ignore TCP candidates
                    //if (cand.candidate.match(/fd13/)) return; // Ignore IPv6 for the moment
                    sdp = sdp.replace(/\r\n/g, '\n');
                    for (
                        var b, c, d = sdp, e = 0, f = 0, g = /m=[^\n]*\n/g;
                        null !== (b = g.exec(d));

                    ) {
                        if (f === cand.sdpMLineIndex) {
                            return (
                                (c = b.index),
                                (b = g.exec(d)),
                                (e = null !== b ? b.index : -1),
                                e >= 0
                                    ? (sdp = [
                                          d.slice(0, e),
                                          'a=' + cand.candidate + '\n',
                                          d.slice(e),
                                      ].join(''))
                                    : (sdp = d + 'a=' + cand.candidate + '\n'),
                                sdp
                            );
                        }
                        f++;
                    }
                }
            });
        });
    }

    addIcePeer(peer: any): void {
        if (peer) this.peer.addIceCandidate(peer);
    }

    addIcePeers(list: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            this.log('Add ICE peers');
            list.forEach((n) => this.addIcePeer(n));
            resolve(list);
        });
    }

    openDataChannel(name: string, half: boolean = false): Promise<any> {
        return new Promise((resolve, reject) => {
            this.log('WEBRTC_OPEN_CHANNEL', name);
            const channel = this.peer.createDataChannel(name, {
                reliable: true,
            });
            this._channel[name] = channel;

            const onopen = (event): void => {
                this.log('CHANNEL IS OPEN', name, event, channel.readyState);
                if (channel.readyState === 'open') {
                    this.log('Channel is open', name);
                    if (half) resolve(channel);
                }
            };

            const iceconn = (): void => {
                if (
                    this.peer.iceConnectionState == 'failed' ||
                    this.peer.iceConnectionState == 'disconnected'
                ) {
                    this.log('Cannot open ICE, reject');
                    myReject('Failed to open ICE');
                }
            };

            const clean = (): void => {
                this.deregisterQ(name + '_onopen', onopen);
                this.deregisterQ('iceconnectionstatechange', iceconn);
            };

            const myReject = (data): void => {
                clean();
                reject(data);
            };

            const myResolve = (data): void => {
                clean();
                resolve(data);
            };

            this.registerQ('iceconnectionstatechange', iceconn);

            this.registerQ(name + '_onopen', onopen);

            ['onopen', 'onmessage', 'onerror', 'onclose'].forEach((n) => {
                channel[n] = (event) => {
                    this.log('CHANNEL', name, n, event);
                    this.fireQ(name + '_' + n, event);
                };
            });

            if (!half) myResolve(channel); // If half is not clear, wait
        });
    }

    buildApiMessage(id: number, uri: string, content: any): ArrayBuffer {
        this.log('BUILD Message', uri, content);
        const data = { ...content };
        if (uri.match(/^\/upload/)) {
            data.data = null; // TODO: check, do I need it?
            delete data.data;
        }
        const method: string = data.type || data.method;
        const obj = {
            'path': uri,
            'method': method ? method.toUpperCase() : 'GET',
            'contentType': content.contentType,
            'Accept-Encoding': 'gzip',
            'queryString': '',
        };
        if (uri.indexOf('?') >= 0) {
            obj.path = uri.split('?')[0];
            obj.queryString = uri.split('?')[1];
        }
        if (method === 'GET' || method === 'DELETE') {
            if (content.data) obj.queryString = content.data; // Encoding check
            return this.encodeApiMessage(id, obj);
        } else {
            return this.encodeApiMessage(id, obj, content.data);
        }
    }

    convertNumToUint8(num: number, bytes: number): Uint8Array {
        const a = new ArrayBuffer(bytes);
        const u = new Uint8Array(a);
        for (bytes--; num; bytes--) {
            u[bytes] = num % 256;
            num = Math.trunc(num / 256);
        }
        return u;
    }

    convertUint8ToNum(u: Uint8Array, start: number, count: number): number {
        let o = 0;
        for (let i = 0; i < count; i++) o = o * 256 + u[start + i];
        return o;
    }

    encodeApiMessage(
        id: number,
        req: any,
        data: string | object | ArrayBuffer = ''
    ): ArrayBuffer {
        // TODO: implement multiple chunks
        // Format, 16 bytes in front of the message
        // 4 bytes total length, 8 bytes ID, 4 bytes request length, charcode
        this.log('Encode Message', id, req, data);
        const reqS = JSON.stringify(req);
        const reqSLen = reqS.length;
        let dataS: string = '';
        let dataSLen: number;
        if (typeof data === 'string') {
            dataS = data;
            dataSLen = dataS.length;
        }
        if (typeof data === 'object') {
            dataS = JSON.stringify(data);
            dataSLen = dataS.length;
        }
        if (data instanceof ArrayBuffer) {
            dataSLen = data.byteLength;
        }
        const a = new ArrayBuffer(16 + reqSLen + dataSLen);
        const u = new Uint8Array(a);
        const totalLen = 12 + reqSLen + dataSLen; // Total len without itself
        u.set(this.convertNumToUint8(totalLen, 4), 0); // Data have to be fixed
        u.set(this.convertNumToUint8(id, 8), 4);
        u.set(this.convertNumToUint8(reqSLen, 4), 12);
        let i;
        for (i = 0; i < reqSLen; i++) u[16 + i] = reqS.charCodeAt(i);
        //this.log('Encoded', u);
        if (data instanceof ArrayBuffer) {
            let uu = new Uint8Array(data);
            for (let j = 0; j < uu.byteLength; j++) u[16 + i++] = data[j];
        } else {
            for (let j = 0; j < dataSLen; j++)
                u[16 + i++] = dataS.charCodeAt(j);
        }
        return a;
    }

    sendMsgToChannel(name: string, msg: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (typeof this._channel[name] === 'undefined')
                return reject('No such channel');
            this._channel[name].send(msg);
            resolve(this._channel[name]);
        });
    }

    sendApiMsg(
        uri: string,
        content: any,
        nowait: boolean,
        channelName = 'api',
        timeout = 30000
    ): Promise<any> {
        const id = this.messageId++;
        const channel = this._channel[channelName];
        if (nowait)
            return this.sendMsgToChannel(
                channelName,
                this.buildApiMessage(id, uri, content)
            );
        return new Promise((resolve, reject) => {
            let kill;
            if (typeof channel === 'undefined')
                return reject('No such channel');
            channel._queue[id] = (event) => {
                clearTimeout(kill);
                resolve(event);
            };
            const wait = () => {
                if (timeout < 0) return reject('Timeout');
                if (channel.readyState !== 'open') {
                    this.log(
                        'The channel',
                        channelName,
                        'is not yet open. Wait...'
                    );
                    timeout -= 1000;
                    return setTimeout(wait, 1000);
                }
                this.sendMsgToChannel(
                    channelName,
                    this.buildApiMessage(id, uri, content)
                )
                    .then(() => {
                        kill = setTimeout(() => {
                            delete channel._queue[id];
                            reject('Timeout');
                        }, timeout);
                    }) // the message is sent, wait for reply
                    .catch(reject);
            };
            wait();
        });
    }

    openApiChannel(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.openDataChannel('api')
                .then((channel) => {
                    channel._queue = {};
                    this.registerQ('api_onmessage', (event) => {
                        if (event.data && event.data instanceof ArrayBuffer) {
                            const data = new Uint8Array(event.data);
                            const totalLen = this.convertUint8ToNum(data, 0, 4);
                            const id = this.convertUint8ToNum(data, 4, 8);
                            const reqLen = this.convertUint8ToNum(data, 12, 4);
                            const obj: OpenApiChannelIntf = {
                                id,
                                totalLen,
                                reqLen,
                                requestStr: '',
                                request: undefined,
                                data: undefined,
                            };
                            let i = 0;
                            for (i = 0; i < reqLen; i++)
                                obj.requestStr += String.fromCharCode(
                                    data[16 + i]
                                );
                            obj.request = JSON.parse(obj.requestStr); // TODO: RequestStr is not needed, can be a temp variable
                            let content = data.slice(16 + i, totalLen + 4);
                            if (obj.request['Content-Encoding'] === 'gzip') {
                                this.log(
                                    'The message is GZIP compressed, decompress'
                                );
                                content = pako.inflate(content);
                            }
                            if (
                                obj.request.contentType ===
                                'application/octet-stream'
                            ) {
                                obj.data = content;
                            } else {
                                if (
                                    obj.request.contentType ===
                                    'application/json'
                                ) {
                                    for (i = 0; i < content.byteLength; i++)
                                        obj.data += String.fromCharCode(
                                            content[i]
                                        );
                                    if (obj.data)
                                        obj.data = JSON.parse(obj.data);
                                } else {
                                    obj.data = new Blob(
                                        [content],
                                        obj.request.contentType
                                    );
                                }
                            }
                            this.log('API ONMESSAGE', obj);
                            if (channel._queue[obj.id]) {
                                channel._queue[obj.id](obj);
                                delete channel._queue[obj.id]; // free memory
                            }
                        }
                    });
                    resolve(channel);
                })
                .catch(reject);
        });
    }

    close(): void {
        this.peer.close();
    }
}
