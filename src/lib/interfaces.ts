/** @format */

import { UnifiRequest } from './unifi-request';

export interface DefaultOptionsIntf {
    username: string;
    password: string;
    baseUrl?: string;
    loggedIn?: boolean;
    debug?: boolean;
    debugNet?: boolean;
    gzip?: boolean;
    site?: string;
    headers?: any;
    wrtc?: any;
    webrtc?: any;
    waiter?: any;
    net?: UnifiRequest;
    request?: any;
}

export interface WrtcOptions {
    waiter?: number;
    webrtc?: any;
    messageId?: number;
    debugName?: string;
    debug?: boolean;
}

export interface OpenApiChannelIntf {
    id: number;
    totalLen: number;
    reqLen: number;
    requestStr: string;
    request: any;
    data: Uint8Array | string | Blob;
}
