/** @format */

import { debug } from 'debug'; // let debug = require('debug')('CloudAPI');
import * as request from 'request';
import * as requestdebug from 'request-debug';
import { DefaultOptionsIntf } from './interfaces';

let defaultOptions: DefaultOptionsIntf = {
    username: 'unifi',
    password: 'unifi',
    baseUrl: 'https://sso.ubnt.com/api/sso/v1',
    debug: false,
    debugNet: false,
    gzip: true,
    wss: null,
    site: 'default',
    headers: {
        'Content-type': 'application/json',
        'Referer':
            'https://account.ubnt.com/login?redirect=https%3A%2F%2Funifi.ubnt.com',
        'Origin': 'https://account.ubnt.com',
        'dnt': 1,
    },
};

/**
 * Unifi Cloud API interface
 * @param {object} options Default settings for the cloud access
 * @param {string} options.deviceId defailt device id. Optional
 * @param {string} options.username cloud username
 * @param {string} options.password cloud password
 * @param {string} options.baseUrl default url for the cloud. Optional
 * @param {boolean} options.debug debug log. Optional. default false
 * @param {boolean} options.gzip If gzip is enabled for the cloud messages. Optional. default true
 * @returns CloudRequest
 */

export class CloudRequest {
    options: DefaultOptionsIntf;
    jar: any;
    loggedIn = false;

    constructor(options: DefaultOptionsIntf) {
        this.options = { ...options, ...defaultOptions };
        if (typeof this.options.request === 'undefined') {
            this.jar = request.jar();
            this.options.request = request.defaults({ jar: this.jar });
            if (this.options.debugNet) {
                this.options.request.debug = true;
                requestdebug(this.options.request);
            }
        }
        debug(`CloudAPI-request initialized with options ${this.options}`);
    }

    /**
     * Enable or disable debugging
     * @param {boolean} enabled Enable or Disable debugging
     * @return {undefined}
     */
    debugging(enabled: boolean) {
        this.options.debug = enabled;
        debug.enabled(this.options.debug ? 'true' : 'false');
        debug(`Debug is ${this.options.debug ? 'enabled' : 'disabled'}`);
    }

    _request(
        url = '',
        jsonParams: any,
        headers = {},
        method?: string,
        baseUrl: string = this.options.baseUrl
    ): Promise<any> {
        if (typeof method === 'undefined') {
            if (typeof jsonParams === 'undefined') method = 'GET';
            else method = 'POST';
        }
        return new Promise((resolve, reject) => {
            this.options.request(
                {
                    url: baseUrl + url,
                    method,
                    headers: { ...headers, ...this.options.headers },
                    rejectUnauthorized: false,
                    json: jsonParams,
                },
                (err, resp, body) => {
                    if (err) return reject(err);
                    if (resp.statusCode < 200 || resp.statusCode > 299)
                        return reject(null);
                    return resolve(body /*, resp*/); // body, resp
                }
            );
        });
    }

    login(username?: string, password?: string): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.loggedIn) {
                // Silent ignore if we are already in
                return resolve();
            }
            debug(
                `Trying to log in with username: ${
                    username ?? this.options.username
                } and password: ${password ?? this.options.password}`
            );
            this._request('/login', {
                user: username ?? this.options.username,
                password: password ?? this.options.password,
            })
                .then((data) => {
                    if (typeof data === 'object') {
                        debug(`Successfuly logged in ${data}`);
                        this.loggedIn = true;
                        return resolve(data);
                    } else {
                        debug(`Error with the authentication ${data}`);
                        return reject(data ?? 'Authentication error');
                    }
                })
                .catch(reject);
        });
    }

    logout(): Promise<any> {
        return new Promise((resolve, reject) => {
            this._request('/logout', {}, undefined, 'POST')
                .then((data) => {
                    this.loggedIn = false;
                    resolve(data);
                })
                .catch(reject);
        });
    }

    req(
        url = '/',
        jsonParams: any,
        headers = {},
        method?: string,
        baseUrl?: string
    ): Promise<any> {
        if (typeof method === 'undefined') {
            if (typeof jsonParams === 'undefined') method = 'GET';
            else method = 'POST';
        }
        return new Promise((resolve, reject) => {
            this.login()
                .then(() =>
                    this._request(url, jsonParams, headers, method, baseUrl)
                )
                .then((data /*, resp*/) => {
                    debug(`Received response: ${typeof data}`);
                    if (typeof data === 'string') {
                        if (data.length > 1 && data.charAt(0) === '{')
                            data = JSON.parse(data);
                        debug(`now we have ${typeof data}`);
                    }
                    if (typeof data === 'object')
                        return resolve(data /*, resp*/);
                    return reject(data);
                })
                .catch(reject);
        });
    }
}
