/** @format */

import { debug } from 'debug'; // let debug = require('debug')('WssAPI');
import { WebSocket } from 'ws'; // let WebSocket = require('ws');
import { v1 } from 'uuid'; // let uuid = require('uuid/v1');
import { DefaultWssOptionsIntf } from './interfaces';

const defaultOptions: DefaultWssOptionsIntf = {
    url: 'wss://device-airos.svc.ubnt.com/api/airos/v1/unifi/events',
    connected: false,
    perMessageDeflate: true,
    origin: 'https://unifi.ubnt.com',
    rejectUnauthorized: false,
    cookie: '',
    pingInterval: 10000,
};

export class WssRequest {
    options: DefaultWssOptionsIntf;
    private _reqStates: any = {};
    private _qqq: any = { connect: [] };
    ws: WebSocket;
    private pingPong: any;

    constructor(options: DefaultWssOptionsIntf) {
        this.options = { ...options, ...defaultOptions };
        if (this.options.debug)
            debug.enabled(this.options.debug ? 'true' : 'false'); // TODO: Double check this
        debug(`WssAPI-request initialized with options ${this.options}`);
    }

    /**
     * Enable or disable debugging
     * @param {boolean} enabled Enable or Disable debugging
     * @return {undefined}
     */
    debugging(enabled: boolean): void {
        this.options.debug = enabled;
        debug.enabled(this.options.debug ? 'true' : 'false');
        debug(`Debug is ${this.options.debug ? 'enabled' : 'disabled'}`);
    }

    connect(url?: string): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.options.connected) return resolve(this.ws);
            this.options.url = url ?? this.options.url;
            clearInterval(this.pingPong);
            this._qqq.connect.push({ resolve, reject });
            if (this._qqq.connect.length > 1) return;
            this.ws = new WebSocket(this.options.url, {
                perMessageDeflate: this.options.perMessageDeflate,
                origin: this.options.origin,
                headers: {
                    Cookie: this.options.cookie,
                },
                // rejectUnauthorized: this.rejectUnauthorized
            });
            this.ws.on('open', () => {
                debug(`Connected ${this.options.url}`);
                this.options.connected = true;
                this.pingPong = setInterval(
                    () => this.ping(),
                    this.options.pingInterval
                );
                this.ping();
                this._qqq.connect.forEach((n) => n.resolve(this.ws));
                this._qqq.connect = [];
            });
            this.ws.on('close', () => {
                debug(`Disconnected ${this.options.url}`);
                this.options.connected = false;
                this.ws = undefined;
                this._reqStates = {};
                clearInterval(this.pingPong);
                this._qqq.connect.forEach((n) => n.reject('disconnect'));
                this._qqq.connect = [];
            });
            this.ws.on('error', (e) => {
                debug(`Error ${e} ${this.options.url}`);
                this.options.connected = false;
                this.ws = undefined;
                this._reqStates = {};
                clearInterval(this.pingPong);
                this._qqq.connect.forEach((n) => n.reject(e));
                this._qqq.connect = [];
            });
            this.ws.on('message', (msg) => {
                debug(`Message Received: ${msg}`);
                this._inmessage(msg);
            });
        });
    }

    disconnect(code, msg): void {
        if (this.options.connected) {
            this.ws.close(code || 1000, msg || 'Disconnect');
        }
    }

    ping(): void {
        this.send('ping')
            .then(() => {
                return;
            })
            .catch(() => {
                return;
            });
    }

    _inmessage(msg: string | any) {
        if (msg === 'ping')
            return this.send('pong').then(() => {
                return;
            });
        if (msg === 'pong') return; // Ignore pongs
        if (typeof msg === 'object' || msg.charAt(0) === '{') {
            if (typeof msg === 'string') msg = JSON.parse(msg);
            if (msg.message === 'action:response') this.actionResponse(msg);
        }
    }

    uniqueId(): string {
        return v1();
    }

    send(msg): Promise<any> {
        return new Promise((resolve, reject) => {
            this.connect()
                .then((ws) => {
                    debug(`Message Sending: ${msg}`);
                    if (typeof msg === 'object') msg = JSON.stringify(msg);
                    ws.send(msg);
                    resolve();
                })
                .catch(reject);
        });
    }

    _register(id: string, cb): void {
        if (typeof this._reqStates[id] === 'undefined')
            this._reqStates[id] = [];
        if (this._reqStates[id].indexOf(cb) < 0) {
            this._reqStates[id].push(cb);
        }
    }

    _deregister(id: string, cb): void {
        if (typeof this._reqStates[id] === 'object') {
            if (this._reqStates[id].indexOf(cb) >= 0)
                this._reqStates[id].splice(this._reqStates[id].indexOf(cb), 1);
        }
    }

    actionRequest(action, args): Promise<any> {
        return new Promise((resolve, reject) => {
            const actionId = this.uniqueId();
            this._register(actionId, (msg) => {
                debug(`Action Response ${msg}`);
                resolve(msg);
            });
            this.send({
                message: 'action:request',
                action,
                action_id: actionId,
                args,
            })
                .then(() => {
                    return;
                })
                .catch(reject);
        });
    }

    actionResponse(msg): void {
        if (this._reqStates[msg.action_id]) {
            this._reqStates[msg.action_id].forEach((cb) => cb(msg));
        }
    }
}
