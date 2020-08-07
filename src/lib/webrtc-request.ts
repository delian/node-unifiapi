/** @format */

import { debug } from 'debug';
import * as pako from 'pako';
import { wait } from './wait';

interface WrtcOptions {
    waiter: number;
    webrtc?: any;
    messageId: number;
    debugName?: string;
    debug?: boolean;
}

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

    log: any;

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
}
