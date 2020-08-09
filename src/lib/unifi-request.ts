/** @format */

import * as request from 'request';
import * as requestdebug from 'request-debug';
import { debug } from 'debug'; // let debug = require('debug')('UnifiRequest');
import { DefaultOptionsIntf } from './interfaces';

let defaultOptions: DefaultOptionsIntf = {
    username: 'unifi',
    password: 'unifi',
    loggedIn: false,
    baseUrl: 'https://127.0.0.1:8443',
    debug: false,
    debugNet: false,
    headers: {
        'Content-type': 'application/json',
        'Referer': '/login',
    },
    gzip: true,
};

export class UnifiRequest {
    options: DefaultOptionsIntf;
    request: any;
    __q: any = {};
    loggedIn = false;

    constructor(options: DefaultOptionsIntf) {
        this.options = { ...options, ...defaultOptions };
        if (this.options.debug) debug.enabled('true'); // TODO: check debug module in typescrupt
        this.request = this.options.request ?? request.defaults({ jar: true });
        if (this.options.debugNet) {
            this.request.debug = true;
            requestdebug(this.request);
        }
        this.__q = {
            login: [],
        };
        debug(`UnifiAPI-request Initialized with options ${options}`);
    }

    /**
     * Enable or disable debugging
     * @param {boolean} enabled Enable or Disable debugging
     * @return {undefined}
     */
    debugging(enabled) {
        this.options.debug = enabled;
        debug.enabled(this.options.debug ? 'true' : 'false');
        debug(`Debug is ${this.options.debug}`);
    }

    _request(
        url = '',
        jsonParams?: any,
        headers: any = {},
        method?: string,
        baseUrl?: string
    ) {
        if (typeof method === 'undefined') {
            if (typeof jsonParams === 'undefined') method = 'GET';
            else method = 'POST';
        }
        return new Promise((resolve, reject) => {
            this.request(
                {
                    url: `${baseUrl ?? this.options.baseUrl}${url}`,
                    method,
                    headers: { ...headers, ...this.options.headers },
                    rejectUnauthorized: false,
                    json: jsonParams,
                },
                (err, resp, body) => {
                    if (err) return reject(err); // resp
                    if (resp.statusCode < 200 || resp.statusCode > 299)
                        return reject({ data: body, resp }); // resp
                    return resolve({ data: body, resp }); // resp
                }
            );
        });
    }

    login(username?: string, password?: string): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.loggedIn) {
                // Silent ignore if we are already in
                return resolve({
                    meta: { rc: 'ok' },
                });
            }
            this.__q.login.push({ resolve, reject });
            debug(
                `Trying to log in with username: ${
                    username ?? this.options.username
                } and password: ${password ?? this.options.password}`
            );
            if (this.__q.login.length > 1) {
                debug('Waiting login to be completed...');
                return;
            }
            this._request('/api/login', {
                username: username ?? this.options.username,
                password: password ?? this.options.password,
            })
                .then((data: any) => {
                    if (typeof data === 'object' && data.meta && data.meta) {
                        debug(`Successfuly logged in ${data.meta}`);
                        this.loggedIn = true;
                        this.__q.login.forEach((n) => n.resolve(data));
                        this.__q.login = [];
                    } else {
                        debug(`Error with the authentication ${data}`);
                        this.__q.login.forEach((n) =>
                            n.reject(data ?? 'Authentication error')
                        );
                        this.__q.login = [];
                        this.loggedIn = false;
                    }
                })
                .catch((e) => {
                    this.__q.login.forEach((n) =>
                        n.reject(`Authentication error ${e}`)
                    );
                    this.__q.login = [];
                    this.loggedIn = false;
                });
        });
    }

    logout(): Promise<any> {
        return new Promise((resolve, reject) => {
            this._request('/logout')
                .then((data) => {
                    this.loggedIn = false;
                    resolve(data);
                })
                .catch(reject);
        });
    }

    req(
        url = '/',
        jsonParams?: any,
        headers: any = {},
        method?: string,
        baseUrl?: string
    ): Promise<any> {
        if (typeof method === 'undefined') {
            if (typeof jsonParams === 'undefined') method = 'GET';
            else method = 'POST';
        }
        return new Promise((resolve, reject) => {
            let procFunc = ({ data, resp }): void => {
                if (typeof data === 'string' && data.charAt(0) === '{')
                    data = JSON.parse(data);
                if (
                    typeof data === 'object' &&
                    typeof data.meta === 'object' &&
                    data.meta.rc === 'ok'
                ) {
                    resolve(data);
                    return;
                } // data,resp
                reject({ data, resp }); // data,resp
            };
            this.login()
                .then(() => {
                    this._request(url, jsonParams, headers, method, baseUrl)
                        .then(procFunc)
                        .catch(({ data, resp }) => {
                            if (
                                (resp && resp.statusCode === 401) ||
                                (typeof data === 'string' &&
                                    data.match('api.err.LoginRequired'))
                            ) {
                                // We have problem with the Login for some reason
                                debug(
                                    `We have to reauthenticate again ${data} ${resp}`
                                );
                                this.loggedIn = false; // Reset the login and repeat once more
                                this.login()
                                    .then(() =>
                                        this._request(
                                            url,
                                            jsonParams,
                                            headers,
                                            method,
                                            baseUrl
                                        )
                                    )
                                    .then(procFunc)
                                    .catch(reject);
                            } else reject(data);
                        });
                })
                .catch(reject);
        });
    }
}
