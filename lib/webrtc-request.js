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

module.exports = WebRTCRequest;
