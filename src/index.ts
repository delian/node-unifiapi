/** @format */

const debug = require('debug')('UnifiAPI');
const UnifiRequest = require('./lib/unifi-request');
const SSHSession = require('./lib/ssh-session');

import { DefaultOptionsIntf } from './lib/interfaces';

const defaultOptions: DefaultOptionsIntf = {
    username: 'unifi',
    password: 'unifi',
    baseUrl: 'https://127.0.0.1:8443',
    debug: false,
    debugNet: false,
    gzip: true,
    site: 'default',
};

/**
 * The main class and the initialization of the Unifi Access
 * @param {object} options the options during initialization
 * @param {string} options.baseUrl the URL where the Unifi controller is. Default https://127.0.0.1:8443
 * @param {string} options.username default username
 * @param {string} options.password default password
 * @param {string} options.site default site. Default is "default"
 * @param {boolean} options.debug if the debug log is enabled
 * @param {boolean} options.debugNet if the debug of the request module is enabled
 * @returns this
 * @example let UnifiAPI = require('node-unifiapi');
 * let unifi = UnifiAPI({
 *    baseUrl: 'https://127.0.0.1:8443', // The URL of the Unifi Controller
 *    username: 'ubnt',
 *    password: 'ubnt',
 *    // debug: true, // More debug of the API (uses the debug module)
 *    // debugNet: true // Debug of the network requests (uses request module)
 * });
 */

export class UnifiAPI {
    options: DefaultOptionsIntf;
    site: string = '';
    net: UnifiRequest;

    constructor(options: DefaultOptionsIntf) {
        this.options = { ...defaultOptions, ...options };
        this.debugging(this.options.debug);

        this.net = this.options.net ?? new UnifiRequest({ ...this.options });
        debug('UnifiAPI Initialized with options %o', options);
    }

    /**
     * Enable or disable the debug of the module
     * @param {boolean} enable Enable or disable the debugging
     * @returns {void}
     */

    debugging(enabled: boolean): void {
        this.options.debug = enabled;
        debug.enabled = this.options.debug ? true : false;
        debug('Debug is', this.options.debug ? 'enabled' : 'disabled');
    }

    /**
     * Generic network operation, executing Ubiquiti command under /api/s/{site}/... rest api
     * @param {string} url The right part of the URL (/api/s/{site}/ is automatically added)
     * @param {object} jsonParams optional. Default undefined. If it is defined and it is object, those will be the JSON POST attributes sent to the URL and the the default method is changed from GET to POST
     * @param {object} headers optional. Default {}. HTTP headers that we require to be sent in the request
     * @param {string} method optional. Default undefined. The HTTP request method. If undefined, then it is automatic. If no jsonParams specified, it will be GET. If jsonParams are specified it will be POST
     * @param {string} site optional. The {site} atribute of the request. If not specified, it is taken from the UnifiAPI init options, where if it is not specified, it is "default"
     * @return {Promise}
     * @example unifi.netsite('/cmd/stamgr', { cmd: 'authorize-guest', mac: '00:01:02:03:04:05', minutes: 60 }, {}, 'POST', 'default')
     *     .then(data => console.log('Success', data))
     *     .catch(error => console.log('Error', error));
     */
    netsite(
        url: string = '',
        jsonParams: any = undefined,
        headers = {},
        method: string = 'GET',
        site?: string
    ) {
        site = site ?? this.site; // TODO: check if this is a correct rewrite
        if (typeof method === 'undefined') {
            if (typeof jsonParams === 'undefined') method = 'GET';
            else method = 'POST';
        }
        return this.net.req(
            '/api/s/ + site + url, jsonParams, headers, method'
        );
    }

    /**
     * @description Explicit login to the controller. It is not necessary, as every other method calls implicid login (with the default username and password) before execution
     * @param {string} username The username
     * @param {string} password The password
     * @return {Promise} success or failure
     * @example unifi.login(username, password)
     *     .then(data => console.log('success', data))
     *     .catch(err => console.log('Error', err))
     */
    login(username: string, password: string) {
        return this.net.login(username, password);
    }

    /**
     * Logout of the controller
     * @example unifi.logout()
     *     .then(() => console.log('Success'))
     *     .catch(err => console.log('Error', err))
     */
    logout() {
        return this.net.logout();
    }

    /**
     * Authorize guest by a MAC address
     * @param {string} mac mac address of the guest - mandatory
     * @param {number} minutes minutes for the authorization - optional, default 60 min
     * @param {number} up upstream bandwidth in Kbps. Default no limit
     * @param {number} down downstream bandwidth in Kbps. Default no _limit
     * @param {number} mbytes download limit in Mbytes. Default no limit
     * @param {string} apmac to which mac address the authorization belongs. Default any
     * @param {string} site to which site (Ubiquiti) the command will be applied if it is different than the default
     * @return {Promise} Promise
     * @example unifi.authorize_guest('01:02:aa:bb:cc')
     *     .then(data => console.log('Successful authorization'))
     *     .catch(err => console.log('Error', err))
     */
    authorize_guest(
        mac = '',
        minutes = 60,
        up?: number,
        down?: number,
        mbytes?,
        apmac?: string,
        site?: string
    ) {
        return this.netsite(
            '/cmd/stamgr',
            {
                cmd: 'authorize-guest',
                mac: mac.toLowerCase(),
                minutes,
                up,
                down,
                bytes: mbytes,
                ap_mac: apmac ? apmac.toLowerCase() : undefined,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * De-authorize guest by a MAC address
     * @param {string} mac the mac address
     * @param {site} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.unauthorize_guest('00:01:02:03:aa:bb')
     *     .then(done => console.log('Success', done))
     *     .catch(err => console.log('Error', err))
     */
    unauthorize_guest(mac = '', site?: string) {
        return this.netsite(
            '/cmd/stamgr',
            {
                cmd: 'uauthorize-guest',
                mac: mac.toLowerCase(),
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Kick a client (station) of the network. This will disconnect a wireless user if it is connected
     * @param {string} mac Mac address
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.kick_sta('00:00:11:22:33:44')
     *     .then(done => console.log('Success', done))
     *     .catch(err => console.log('Error', err))
     */
    kick_sta(mac = '', site?: string) {
        return this.netsite(
            '/cmd/stamgr',
            {
                cmd: 'kick-sta',
                mac: mac.toLowerCase(),
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Terminate access of a Guest (logged in via Guest Authorization). It kicks it out of the wireless and authroization
     * @param {string} id the ID of the guest that have to be kicked out
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.terminate_guest('aa01af0133d334d77d')
     *     .this(done => console.log('Success', done))
     *     .catch(err => console.log('Error', err))
     */
    terminate_guest(id = '', site?: string) {
        return this.netsite(
            '/cmd/hotspot',
            {
                _id: id,
                cmd: 'terminate',
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Block station of the network
     * @param {string} mac Mac address
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.block_sta('00:01:02:03:04:05')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error', err))
     */
    block_sta(mac = '', site?: string) {
        return this.netsite(
            '/cmd/stamgr',
            {
                cmd: 'block-sta',
                mac: mac.toLowerCase(),
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Unblock station of the network
     * @param {string} mac Mac address
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.block_sta('00:01:02:03:04:05')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error', err))
     */
    unblock_sta(mac = '', site?: string) {
        return this.netsite(
            '/cmd/stamgr',
            {
                cmd: 'unblock-sta',
                mac: mac.toLowerCase(),
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Set or remove Note to a station
     * @param {string} user User ID
     * @param {string} note Note
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.set_sta_note('aabbaa0102aa03aa3322','Test note')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     * @example unifi.set_sta_note('aabbaa0102aa03aa3322','') // remove note
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    set_sta_note(user = '', note = '', site?: string) {
        return this.netsite(
            `/upd/user/${user}`,
            {
                note: note,
                noted: note ? true : false,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Set or remove Name to a station
     * @param {string} user User ID
     * @param {string} name Name
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.set_sta_name('aabbaa0102aa03aa3322','Central Access Point')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     * @example unifi.set_sta_name('aabbaa0102aa03aa3322','') // remove name
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    set_sta_name(user = '', name = '', site?: string) {
        return this.netsite(
            `/upd/user/${user}`,
            {
                name,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * List client sessions
     * @param {number} start Start time in Unix Timestamp - Optional. Default 7 days ago
     * @param {number} end End time in Unix timestamp - Optional. Default - now
     * @param {string} type Sessions type. Optional. Default all
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.stat_sessions()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */

    stat_sessions(
        start = new Date().getTime() / 1000 - 7 * 24 * 3600 * 1000,
        end = new Date().getTime(),
        type = 'all',
        site?: string
    ) {
        return this.netsite(
            '/stat/sessions',
            {
                type,
                start,
                end,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * List daily site statistics
     * @param {number} start Start time in Unix Timestamp - Optional. Default 7 days ago
     * @param {number} end End time in Unix timestamp - Optional. Default - now
     * @param {array} attrs What attributes we are quering for. Optional. Default [ 'bytes', 'wan-tx_bytes', 'wan-rx_bytes', 'wlan_bytes', 'num_sta', 'lan-num_sta', 'wlan-num_sta', 'time' ]
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.stat_daily_site()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    stat_daily_site(
        start = new Date().getTime() - 52 * 7 * 24 * 3600 * 1000,
        end = new Date().getTime(),
        attrs: any = [
            'bytes',
            'wan-tx_bytes',
            'wan-rx_bytes',
            'wlan_bytes',
            'num_sta',
            'lan-num_sta',
            'wlan-num_sta',
            'time',
        ],
        site?: string
    ) {
        return this.netsite(
            '/stat/report/daily.site',
            {
                start,
                end,
                attrs,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * List hourly site statistics
     * @param {number} start Start time in Unix Timestamp - Optional. Default 7 days ago
     * @param {number} end End time in Unix timestamp - Optional. Default - now
     * @param {array} attrs What attributes we are quering for. Optional. Default [ 'bytes', 'wan-tx_bytes', 'wan-rx_bytes', 'wlan_bytes', 'num_sta', 'lan-num_sta', 'wlan-num_sta', 'time' ]
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.stat_hourly_site()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    stat_hourly_site(
        start = new Date().getTime() - 7 * 24 * 3600 * 1000,
        end = new Date().getTime(),
        attrs: any = [
            'bytes',
            'wan-tx_bytes',
            'wan-rx_bytes',
            'wlan_bytes',
            'num_sta',
            'lan-num_sta',
            'wlan-num_sta',
            'time',
        ],
        site?: string
    ) {
        return this.netsite(
            '/stat/report/hourly.site',
            {
                start,
                end,
                attrs,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * List hourly site statistics for ap
     * @param {number} start Start time in Unix Timestamp - Optional. Default 7 days ago
     * @param {number} end End time in Unix timestamp - Optional. Default - now
     * @param {array} attrs What attributes we are quering for. Optional. Default [ 'bytes', 'num_sta', 'time' ]
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.stat_hourly_ap()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    stat_hourly_ap(
        start = new Date().getTime() - 7 * 24 * 3600 * 1000,
        end = new Date().getTime(),
        attrs: string[] = ['bytes', 'num_sta', 'time'],
        site?: string
    ) {
        return this.netsite(
            '/stat/report/hourly.ap',
            {
                start,
                end,
                attrs,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Last station sessions
     * @param {string} mac Mac address
     * @param {number} limit How many sessions. Optional. Default 5
     * @param {string} sort Sorting. Optional. Default Ascending (asc)
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.stat_sta_sessions_latest('00:01:02:03:04:05', 10)
     *     .then(done => console.log('Success', done))
     *     .catch(err => console.log('Error',err))
     */
    stat_sta_sessions_latest(
        mac = '',
        limit = 5,
        sort = '-asoc-time',
        site?: string
    ) {
        return this.netsite(
            '/stat/sessions',
            {
                mac: mac.toLowerCase(),
                _limit: limit,
                _sort: sort,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * List authorizations
     * @param {number} start Start time in Unix Timestamp - Optional. Default 7 days ago
     * @param {number} end End time in Unix timestamp - Optional. Default - now
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.stat_auths()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    stat_auths(
        start = new Date().getTime() - 7 * 24 * 3600000,
        end = new Date().getTime(),
        site?: string
    ) {
        return this.netsite(
            '/stat/authorization',
            {
                end,
                start,
            },
            {},
            undefined,
            site
        );
    }
    /**
     * List all users
     * @param {number} historyhours How many hours back to query. Optional. Default 8670
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.stat_allusers()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    stat_allusers(
        historyhours = 8670,
        type = 'all',
        conn = 'all',
        site?: string
    ) {
        return this.netsite(
            '/stat/alluser',
            {
                type,
                conn,
                within: historyhours,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * List of guests (authorized via the guest portal)
     * @param {number} historyhours How many hours back to query. Optional. Default 8670
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.list_guests()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_guests(historyhours = 8670, site?: string) {
        return this.netsite(
            '/stat/guest',
            {
                within: historyhours,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * List of guests (authorized via the guest portal) but with modern internal api
     * @param {number} historyhours How many hours back to query. Optional. Default 8670
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.list_guests2()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_guests2(historyhours = 8670, site?: string) {
        return this.netsite(
            `/stat/guest?within=${historyhours}`,
            undefined,
            {},
            undefined,
            site
        );
    }

    /**
     * List of (all) clients per station
     * @param {string} mac Mac address
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.list_clients()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_clients(mac = '', site?: string) {
        return this.netsite('/stat/sta/${mac}', undefined, {}, undefined, site);
    }

    /**
     * List of group of clients per station
     * @param {string} macs String mac or array of mac addresses as strings, to get information about them
     * @param {string} ap Station man address
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.list_some_clients()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_some_clients(macs?: string | string[], ap = '', site?: string) {
        let clients;
        if (typeof macs !== 'undefined') {
            if (typeof macs == 'string') clients = { macs: [macs] };
            else if (macs instanceof Array) clients = { macs: macs };
        }
        return this.netsite(`/stat/sta/${ap}`, clients, {}, undefined, site);
    }

    /**
     * Statistics of (all) clients per station
     * @param {string} mac Mac address
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.stat_client()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    stat_client(mac = '', site?: string) {
        return this.netsite(
            '/stat/user/${mac}',
            undefined,
            {},
            undefined,
            site
        );
    }

    /**
     * List of the usergroups
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.list_usergroup()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_usergroup(site?: string) {
        return this.netsite('/list/usergroup', undefined, {}, undefined, site);
    }
    /**
     * Add user to a group
     * @param {string} userid ID of the user
     * @param {string} groupid ID of the group
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.set_usergroup('11aa22bb33cc44dd55ee66ff', '112233445566778899aabb')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    set_usergroup(userid = '', groupid = '', site?: string) {
        return this.netsite(
            `/upd/user/${userid}`,
            {
                usergroup_id: groupid,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * List health
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.list_health()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_health(site?: string) {
        return this.netsite('/stat/health', undefined, {}, undefined, site);
    }

    /**
     * List dashboard
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.list_dashboard()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_dashboard(site?: string) {
        return this.netsite('/stat/dashboard', undefined, {}, undefined, site);
    }

    /**
     * List users
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.list_users()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_users(site?: string) {
        return this.netsite('/list/user', undefined, {}, undefined, site);
    }

    /**
     * List APs
     * @param {string} mac AP mac/id, Optional
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.list_aps()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_aps(mac = '', site?: string) {
        // TODO: not working with mac different than none
        return this.netsite(
            `/stat/device/${mac}`,
            undefined,
            {},
            undefined,
            site
        );
    }

    /**
     * List Rogue APs
     * @param {number} within For how many hours back. Optional. Default 24h
     * @param {string} site Ubiquiti site, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.list_rogueaps()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_rogueaps(within = 24, site?: string) {
        return this.netsite(
            '/stat/rogueap',
            {
                within: within,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * List sites
     * @return {Promise} Promise
     * @example unifi.list_sites()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_sites() {
        return this.net.req('/api/self/sites');
    }

    /**
     * Sites stats
     * @return {Promise} Promise
     * @example unifi.stat_sites()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    stat_sites() {
        return this.net.req('/api/stat/sites');
    }

    /**
     * Add new site
     * @param {string} name name
     * @param {string} description description - optional
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.add_site('mysite','Experimental site')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    add_site(name = 'default', description = '', site?: string) {
        return this.netsite(
            '/cmd/sitemgr',
            {
                cmd: 'add-site',
                name: name,
                desc: description,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Remove site
     * @param {string} name name
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.remove_site('mysite')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    remove_site(name = 'none', site?: string) {
        // TODO: test it
        return this.netsite(
            '/cmd/sitemgr',
            {
                cmd: 'remove-site',
                name: name,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * List WLANGroups
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.list_wlan_groups()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_wlan_groups(site?: string) {
        return this.netsite('/list/wlangroup', undefined, {}, undefined, site);
    }

    /**
     * Stat Sysinfo
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.stat_sysinfo()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    stat_sysinfo(site?: string) {
        return this.netsite('/stat/sysinfo', undefined, {}, undefined, site);
    }

    /**
     * Get information aboult self (username, etc)
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.list_self()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_self(site?: string) {
        // TODO: test
        return this.netsite('/self', undefined, {}, undefined, site);
    }

    /**
     * Get information aboult the network configuration
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.list_networkconf()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_networkconf(site?: string) {
        return this.netsite(
            '/list/networkconf',
            undefined,
            {},
            undefined,
            site
        );
    }

    /**
     * Get accounting / status of the vouchers
     * @param {number} createtime Unixtimestamp since when we return information about the vouchers. Optional. Default any
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.stat_voucher()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    stat_voucher(createtime?: number, site?: string) {
        return this.netsite(
            '/stat/voucher',
            {
                create_time: createtime,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Get accounting / status of the payments
     * @param {number} within how many hours back we query. Optional. Default any
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.stat_payment()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    stat_payment(within?: number, site?: string) {
        return this.netsite(
            '/stat/payment',
            {
                // TODO: test it, is it payment or voucher
                within: within,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Create HotSpot (version 1)
     * @todo Check if the URL of the rest service is correct
     * @todo Test that it is working
     * @param {string} name name
     * @param {string} password password
     * @param {string} note Note (optional)
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.create_hotspot('myhotspot', 'password', 'note')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    create_hotspot(name = '', password = '', note = '', site?: string) {
        return this.netsite(
            '/stat/voucher',
            {
                name,
                note,
                x_password: password,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * List all of the hotspots (v1)
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.list_hotspot()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_hotspot(site?: string) {
        return this.netsite('/list/hotspotop', undefined, {}, undefined, site);
    }

    /**
     * Create vouchers. Generate a set of vouchers
     * @param {number} count how many vouchers to generate. Optional. default is 1
     * @param {number} minutes how long the voucher may be active after activation in minutes. Optional. default is 60 minutes
     * @param {number} quota how many times a user may reuse (login with) this voucher. Default 0 = unlimited. 1 means only once. 2 means two times and so on
     * @param {string} note the note of the voucher. Optional
     * @param {number} up Upstream bandwidth rate limit in Kbits. Optional. Default - no limit
     * @param {number} down Downstream bandwidth rate limit in Kbits. Optional. Default - no limit
     * @param {number} mbytes Limit of the maximum download traffic in Mbytes. Optional. Default - no limit
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.create_voucher(10, 2880, 1, 'Test vouchers', 1000, 2000, 250)
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    create_voucher(
        count = 1,
        minutes = 60,
        quota = 0,
        note?: string,
        up?: number,
        down?: number,
        mbytes?: number,
        site?: string
    ) {
        return this.netsite(
            '/cmd/hotspot',
            {
                note,
                up,
                down,
                bytes: mbytes,
                cmd: 'create-voucher',
                expire: minutes,
                n: count,
                quota,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Revoke Voucher. Voucher revoking is the same as deleting the voucher. In most of the cases the authorized user is kicked out of the network too
     * @param {string} voucher_id description
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.revoke_voucher('9912982aaff182728a0f03')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    revoke_voucher(voucher_id: string, site?: string) {
        return this.netsite(
            '/cmd/hotspot',
            {
                cmd: 'delete-voucher',
                _id: voucher_id,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * List port forwarding configuration
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.list_portforwarding()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_portforwarding(site?: string) {
        return this.netsite(
            '/list/portforward',
            undefined,
            {},
            undefined,
            site
        );
    }

    /**
     * List dynamic dns configuration
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.list_dynamicdns()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_dynamicdns(site?: string) {
        return this.netsite('/list/dynamicdns', undefined, {}, undefined, site);
    }

    /**
     * List network port configuration
     * @todo Test it
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.list_portconf()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_portconf(site?: string) {
        return this.netsite('/list/portconf', undefined, {}, undefined, site);
    }

    /**
     * List extensions
     * @todo Learn more what exactly is this
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.list_extension()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_extension(site?: string) {
        return this.netsite('/list/extension', undefined, {}, undefined, site);
    }

    /**
     * Get array with all the settings refered by settings key
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.list_settings()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_settings(site?: string) {
        return this.netsite('/get/setting', undefined, {}, undefined, site);
    }

    /**
     * Restart Wireless Access Point
     * @param {string} mac mac address of the AP
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.restart_ap('00:01:02:03:aa:04')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    restart_ap(mac = '', site?: string) {
        return this.netsite(
            '/cmd/devmgr',
            {
                cmd: 'restart',
                mac: mac.toLowerCase(),
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Disable Wireless Access Point
     * @param {string} ap_id The internal ID of the AP
     * @param {boolean} disable Shall we disable it. Optional. Default true. If false, the AP is enabled
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.disable_ap('001fa98a00a22328123')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    disable_ap(ap_id = '', disable = true, site?: string) {
        return this.netsite(
            `/rest/device/${ap_id}`,
            {
                disabled: disable,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Enable Wireless Access Point
     * @param {string} ap_id The internal ID of the AP
     * @param {boolean} disable Shall we disable it. Optional. Default true. If false, the AP is enabled
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.enable_ap('001fa98a00a22328123')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    enable_ap(ap_id = '', disable = false, site?: string) {
        return this.disable_ap(ap_id, disable, site);
    }

    /**
     * Locate Wireless Access Point. The Access Point will start blinking
     * @param {string} mac mac of the AP
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.set_locate_ap('00:01:aa:03:04:05')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    set_locate_ap(mac = '', site?: string) {
        return this.netsite(
            '/cmd/devmgr',
            {
                mac: mac.toLowerCase(),
                cmd: 'set-locate',
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Turn off Locate Wireless Access Point. The Access Point will stop blinking
     * @param {string} mac mac of the AP
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.unset_locate_ap('00:01:aa:03:04:05')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    unset_locate_ap(mac = '', site?: string) {
        return this.netsite(
            '/cmd/devmgr',
            {
                mac: mac.toLowerCase(),
                cmd: 'unset-locate',
            },
            {},
            undefined,
            site
        );
    }

    /**
     * All devices in the site group will start blinking
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.site_ledson()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    site_ledson(site?: string) {
        return this.netsite(
            '/set/setting/mgmt',
            {
                led_enabled: true,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * All devices in the site group will stop blinking
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.site_ledsoff()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    site_ledsoff(site?: string) {
        return this.netsite(
            '/set/setting/mgmt',
            {
                led_enabled: false,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Change AP wireless settings
     * @param {string} ap_id internal id of the AP
     * @param {string} radio The radio type. Supports ng or ac. Default ng. Optional
     * @param {number} channel Wireless channel. Optional. Default 1. Could be string 'auto'
     * @param {number} ht HT width in MHz. 20, 40, 80, 160. Optional. Default 20
     * @param {number} tx_power_mode TX Power Mode. Optional. Default 0
     * @param {number} tx_power TX Power. Optional. Default 0
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.set_ap_radiosettings('aa0101023faabbaacc0c0', 'ng', 3, 20)
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    set_ap_radiosettings(
        ap_id = '',
        radio = 'ng',
        channel = 1,
        ht = '20',
        tx_power_mode = 0,
        tx_power = 0,
        site?: string
    ) {
        return this.netsite(
            `/upd/device/${ap_id}`,
            {
                radio,
                channel,
                ht,
                tx_power_mode,
                tx_power,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Alias to list_settings. Retrieve array with settings defined by setting key.
     * @alias list_settings
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.get_settings()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    get_settings(site?: string) {
        return this.netsite('/get/setting', undefined, {}, undefined, site);
    }

    /**
     * Retrieve settings by a specific settings key. Only elements with this settings key will be returned in the array. Usually 1 or 0
     * Typical keys are mgmt, snmp, porta, locale, rsyslogd, auto_speedtest, country, connectivity
     * @param {string} key key
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.get_settings_by_key('mgmt')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    get_settings_by_key(key: string, site?: string) {
        return new Promise((resolve, reject) => {
            this.get_settings(site)
                .then((data: any) => {
                    data.data = data.data.filter((n) => n.key == key);
                    resolve(data);
                })
                .catch(reject);
        });
    }

    /**
     * Set settings by key modifies properties of the settings, defined by key
     * @param {string} key key
     * @param {object} obj object of properties that overwrite the original values
     * @param {string} site Ubiquiti site to query, if different from default - optional
     * @return {Promise} Promise
     * @example unifi.set_settings_by_key('mgmt', { auto_upgrade: true })
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    set_settings(key: string, obj: any, site?: string) {
        return new Promise((resolve, reject) => {
            this.get_settings_by_key(key, site)
                .then((data: any) => {
                    if (data?.data?.length < 1)
                        return reject({
                            msg: 'No such key',
                            meta: { rc: 'error' },
                        });
                    const o = { ...obj, ...data?.data[0] };
                    return this.netsite(
                        `/set/setting/${o.key}/${o._id}`,
                        o,
                        {},
                        undefined,
                        site
                    );
                })
                .then(resolve)
                .catch(reject);
        });
    }

    /**
     * Set Guest Settings and Guest Access Portal are created with this method
     * @param {object} obj Object of properties that modify the original values
     * @param {string} obj.auth Optional. Type of authentication. hotspot, radius, none, .... Default hotspot
     * @param {string} obj.expire Optional. How long the authentication is valid in minutes. Default 480 (8h)
     * @param {boolean} obj.facebook_enabled Optional. Allow authentication with facebook. Default false
     * @param {boolean} obj.google_enabled Optional. Allow authentication with google+. Default false
     * @param {boolean} obj.payment Optional. Allow payments for authentication. Default false
     * @param {boolean} obj.portal_customized Optional. Customize the auth portal. Default false
     * @param {boolean} obj.portal_enabled Optional. Enable the portal. Default true
     * @param {boolean} obj.redirect_enabled Optional. Redirect after authentication. Default false
     * @param {string} obj.redirect_url Optional. Redirect URL after successful authentication. Default empty
     * @param {boolean} obj.voucher_enabled Optional. If voucher authentication is enabled. Default false
     * @param {string} guest_id From the get_settings, the ID of the guest settings
     * @param {string} site_id The ID of the current site
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.set_guest_access({ auth: 'hotspot', payment_enabled: true }, 'aabbaa01010203','ccffee0102030303')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    set_guest_access(obj, guest_id, site_id, site = undefined) {
        const o = {
            ...obj,
            ...{
                _id: guest_id || obj._id,
                site_id: site_id || obj.site_id,
                auth: 'hotspot',
                expire: '480',
                facebook_enabled: false,
                google_enabled: false,
                key: 'guest_access',
                payment_enabled: false,
                payment_fields_address_enabled: true,
                payment_fields_address_required: true,
                payment_fields_city_enabled: true,
                payment_fields_city_required: true,
                payment_fields_country_default: '',
                payment_fields_country_enabled: true,
                payment_fields_country_required: true,
                payment_fields_first_name_enabled: true,
                payment_fields_first_name_required: true,
                payment_fields_last_name_enabled: true,
                payment_fields_last_name_required: true,
                payment_fields_state_enabled: true,
                payment_fields_state_required: true,
                payment_fields_zip_enabled: true,
                payment_fields_zip_required: true,
                portal_customized: false,
                portal_customized_bg_color: '#cccccc',
                portal_customized_bg_image_enabled: false,
                portal_customized_bg_image_tile: true,
                portal_customized_box_color: '#ffffff',
                portal_customized_box_link_color: '#1379b7',
                portal_customized_box_opacity: 90,
                portal_customized_box_text_color: '#000000',
                portal_customized_button_color: '#1379b7',
                portal_customized_button_text_color: '#ffffff',
                portal_customized_languages: ['en'],
                portal_customized_link_color: '#1379b7',
                portal_customized_logo_enabled: false,
                portal_customized_text_color: '#000000',
                portal_customized_title: 'Hotspot portal',
                portal_customized_tos:
                    'Terms of Use\n\nBy accessing the wireless network, you acknowledge that you\'re of legal age, you have read and understood and agree to be bound by this agreement.\n\nThe wireless network service is provided by the property owners and is completely at their discretion. Your access to the network may be blocked, suspended, or terminated at any time for any reason.\n\nYou agree not to use the wireless network for any purpose that is unlawful and take full responsibility of your acts.\n\nThe wireless network is provided "as is" without warranties of any kind, either expressed or implied.',
                portal_customized_tos_enabled: true,
                portal_customized_welcome_text_enabled: true,
                portal_customized_welcome_text_position: 'under_logo',
                portal_enabled: true,
                redirect_enabled: false,
                redirect_https: false,
                redirect_to_https: false,
                redirect_url: '',
                restricted_subnet_1: '192.168.0.0/16',
                restricted_subnet_2: '172.16.0.0/12',
                restricted_subnet_3: '10.0.0.0/8',
                template_engine: 'angular',
                voucher_customized: false,
                voucher_enabled: true,
                x_facebook_app_secret: 'UBNT',
                x_google_client_secret: 'UBNT',
                x_password: 'UBNT',
            },
        };
        return this.netsite(
            `/set/setting/guest_access/${o._id}`,
            o,
            {},
            undefined,
            site
        );
    }

    /**
     * Set Guest Login Settings (simplified version)
     * @param {boolean} portal_enabled If the portal is enabled. Optional. Default true
     * @param {boolean} portal_customized If the portal is customized. Optional. Default true
     * @param {boolean} redirect_enabled If the redirection is enabled. Optional. Default false
     * @param {string} redirect_url The url for redirection. Optional. Default ''
     * @param {string} x_password Password for the portal. Optional. Default ''
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.set_guestlogin_settings(true, true, true, 'http://news.com')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    set_guestlogin_settings(
        portal_enabled = true,
        portal_customized = true,
        redirect_enabled = false,
        redirect_url = '',
        x_password = '',
        expire_number?: string,
        expire_unit?: string,
        site_id?: string,
        site?: string
    ) {
        return this.netsite(
            '/set/setting/guest_access',
            {
                portal_enabled,
                portal_customized,
                redirect_enabled,
                redirect_url,
                x_password,
                expire_number,
                expire_unit,
                site_id,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Rename Access Point
     * @param {string} ap_id Id of the AP
     * @param {string} ap_name New name of the AP
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.rename_ap('ccffee0102030303','My Access Point')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    rename_ap(ap_id = '', ap_name = '', site?: string) {
        return this.netsite(
            `/upd/device/${ap_id}`,
            {
                name: ap_name,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Set WLAN Settings
     * @param {strings} wlan_id ID of the Wlan
     * @param {string} x_password Password of the WLAN
     * @param {string} name Name of the WLAN
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.set_wlansettings('ccffee0102030303', 'guest', 'GuestWLAN')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    set_wlansettings(
        wlan_id = '',
        x_password?: string,
        name?: string,
        site?: string
    ) {
        // TODO: test it
        return this.netsite(
            `/upd/wlanconf/${wlan_id}`,
            {
                x_passphrase: x_password,
                name,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * List the Events
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.list_events()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_events(site?: string) {
        return this.netsite('/stat/event', undefined, {}, undefined, site);
    }

    /**
     * Get WLAN Config. Respond with Array of Wlan configurations
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.list_wlanconf()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_wlanconf(site?: string) {
        return this.netsite('/list/wlanconf', undefined, {}, undefined, site);
    }

    /**
     * Get WLAN Config. Second REST option. Respond with Array of Wlan configurations
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.get_wlanconf()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    get_wlanconf(site?: string) {
        return this.netsite('/rest/wlanconf', undefined, {}, undefined, site);
    }

    /**
     * List the Alarms
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.list_alarms()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_alarms(site?: string) {
        return this.netsite('/list/alarm', undefined, {}, undefined, site);
    }

    /**
     * Set the access point LED
     * @param {string} ap_id AP ID
     * @param {string} led_override Do we follow the standard LED config. Options default and overwrite
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.set_ap_led('12312312312','default')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    set_ap_led(ap_id = '', led_override = 'default', site?: string) {
        return this.netsite(
            `/rest/device/${ap_id}`,
            {
                led_override,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Change the name of an Access Point
     * @param {string} ap_id the ID of the AP
     * @param {string} name the new name
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.set_ap_name('12312312312','new ap')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    set_ap_name(ap_id, name = '', site?: string) {
        return this.netsite(
            `/rest/device/${ap_id}`,
            {
                name,
            },
            {},
            'PUT',
            site
        );
    }

    /**
     * Set wireless properties per AP
     * @param {string} ap_id the ID of the AP
     * @param {string} radio radio type. ng/ac/bg. Optional. Default ng
     * @param {number} channel The channel number or auto. Optional. Default auto.
     * @param {number} ht channel width. 20/40/80/160. Optional. Default 20.
     * @param {number} min_rssi Minimal RSSI accepted in dbi. Optional. Default -94
     * @param {boolean} min_rssi_enabled If enabled, drops users bellow that rssi valur. Optional. Default false
     * @param {number} antenna_gain The antenna gain. Optional. Default 6 dbi
     * @param {string} tx_power_mode TX Power Mode. Optional. Default auto
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.set_ap_wireless('12312312312','ng', 3)
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    set_ap_wireless(
        ap_id,
        radio = 'ng',
        channel = 'auto',
        ht = 20,
        min_rssi = -94,
        min_rssi_enabled = false,
        antenna_gain = 6,
        tx_power_mode = 'auto',
        site?: string
    ) {
        return this.netsite(
            `/rest/device/${ap_id}`,
            {
                radio_table: [
                    {
                        antenna_gain,
                        channel,
                        radio,
                        ht,
                        min_rssi,
                        min_rssi_enabled,
                        tx_power_mode,
                    },
                ],
            },
            {},
            'PUT',
            site
        );
    }

    /**
     * Check status
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.status()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    status(site?: string) {
        return this.net.req('/status', undefined, {}, undefined, site);
    }

    /**
     * Configure the network settings of AP/device
     * @param {string} ap_id ID of the AP
     * @param {string} type static or dhcp. Optional. Default dhcp
     * @param {string} ip IP address. Optional
     * @param {string} netmask netmask. Optional
     * @param {string} gateway gateway. Optional
     * @param {string} dns1 dns. Optional
     * @param {string} dns2 dns. Optional
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.set_ap_network('00:01:02:03:04:05', 'dhcp')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    set_ap_network(
        ap_id = '',
        type = 'dhcp',
        ip = '192.168.1.6',
        netmask = '255.255.255.0',
        gateway = '192.168.1.1',
        dns1 = '8.8.8.8',
        dns2 = '8.8.4.4',
        site?: string
    ) {
        return this.netsite(
            `/rest/device/${ap_id}`,
            {
                config_network: [
                    {
                        type,
                        ip,
                        netmask,
                        gateway,
                        dns1,
                        dns2,
                    },
                ],
            },
            {},
            'PUT',
            site
        );
    }

    /**
     * Request a spectrum scan
     * @param {string} mac Mac of the AP
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.request_spectrumscan('00:01:02:03:04:05')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    request_spectrumscan(mac = '', site?: string) {
        return this.netsite(
            '/cmd/devmgr',
            {
                cmd: 'spectrum-scan',
                mac: mac.toLowerCase(),
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Set description to the site
     * @param {string} description description
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.set_site_descr('My site')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    set_site_descr(description = '', site?: string) {
        return this.netsite(
            '/cmd/sitemgr',
            {
                cmd: 'update-site',
                desc: description,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Set settings of the site (optional)
     * @todo To be tested and completed
     * @param {string} gen_id The id of the settings
     * @param {string} site_id The id of the site
     * @param {boolean} advanced advanced options enabled. Optional. default true
     * @param {boolean} alerts alerts enabled. Optional. default true
     * @param {boolean} auto_upgrade auto upgrade of the AP enabled. Optional. default true
     * @param {string} key always mgmt. Optional. default mgmt
     * @param {boolean} led_enabled Led enabled. Optional. default true
     * @param {string} x_ssh_username SSH username. Optional. Default ubnt
     * @param {string} x_ssh_password SSH password. Optional. Default ubnt
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.set_site_settings('0101923920a3a4fbff', '3333923920a3a4fbff', false)
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    set_site_settings(
        gen_id = '',
        site_id = '',
        advanced = true,
        alerts = true,
        auto_upgrade = true,
        key = 'mgmt',
        led_enabled = true,
        x_ssh_username = 'ubnt',
        x_ssh_password = 'ubnt',
        x_ssh_md5passwd = '$1$PiGDOzRF$GX49UVoQSqwaLgXu/Cuvb/',
        site = undefined
    ) {
        return this.netsite(
            '/set/setting/mgmt/' + gen_id,
            {
                _id: gen_id,
                advanced_feature_enabled: advanced,
                alert_enabled: alerts,
                auto_upgrade,
                key,
                led_enabled,
                site_id,
                x_ssh_username,
                x_ssh_password,
                x_ssh_md5passwd,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Add HotSpot 2.0 configuration
     * @param {string} name hotspot name. Default hotspot
     * @param {string} network_access_internet Network access
     * @param {number} network_type Network type. Optional. Default 2
     * @param {number} venue_group Venue group. Optional. Default 2
     * @param {number} venue_type Venue type. Optional. Default 0
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.add_hotspot2('hotspot2.0 config')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    add_hotspot2(
        name = 'hotspot',
        network_access_internet?: string,
        network_type = 2,
        venue_group = 2,
        venue_type = 0,
        site?: string
    ) {
        return this.netsite(
            '/rest/hotspot2conf',
            {
                name,
                network_access_internet,
                network_type,
                venue_group,
                venue_type,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * List hotspot 2.0 configurations
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.list_hotspot2()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    list_hotspot2(site = undefined) {
        return this.netsite(
            '/rest/hotspot2conf',
            undefined,
            {},
            undefined,
            site
        );
    }

    /**
     * Delete hotspot 2.0 configuration
     * @param {string} hs_id Hotspot2 ID
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.delete_hotspot2('112233445566778899aabb')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     * @example unifi.list_hotspot2()
     *     .then(data => unifi.delete_hotspot2(data.data.shift()._id))
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    delete_hotspot2(hs_id, site = undefined) {
        return this.netsite(
            `/rest/hotspot2conf/${hs_id}`,
            undefined,
            {},
            'DELETE',
            site
        );
    }

    /**
     * Modify Hotspot 2.0 configuration
     * @param {string} hs_id Hotspot2.0 config id
     * @param {string} name name. Optional
     * @param {string} network_access_internet Network access. Optional
     * @param {number} network_type Network type. Optional
     * @param {number} venue_group Venue group. Optional
     * @param {number} venue_type Venue type. Optional
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.set_hotspot2('112323322aaaffa191', 'new name')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    set_hotspot2(
        hs_id = '',
        name?: string,
        network_access_internet?: string,
        network_type?: number,
        venue_type?: number,
        venue_group?: number,
        site?: string
    ) {
        return this.netsite(
            `/rest/hotspot2conf/${hs_id}`,
            {
                name,
                network_access_internet,
                _id: hs_id,
                network_type,
                venue_type,
                venue_group,
            },
            {},
            'PUT',
            site
        );
    }

    /**
     * Remove WLAN configuration
     * @param {string} id wlan config id
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.remove_wlanconf('112323322aaaffa191')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    remove_wlanconf(id: string, site?: string) {
        return this.netsite(
            `/rest/wlanconf/${id}`,
            undefined,
            {},
            'DELETE',
            site
        );
    }

    add_wlanconf(
        name,
        is_guest = true,
        usergroup_id?: string,
        wlangroup_id?: string,
        security = 'open',
        enabled = true,
        dtim_mode = 'default',
        dtim_na = 1,
        dtim_ng = 1,
        mac_filter_enabled = false,
        mac_filter_list = [],
        mac_filter_policy = 'deny',
        radius_port_1 = 1812,
        schedule = [],
        schedule_enabled = false,
        usergroup = 'Default',
        wlangroup = 'Default',
        wep_idx = 1,
        wpa_enc = 'ccmp',
        wpa_mode = 'wpa2',
        ratectrl_na_6 = 'basic',
        ratectrl_na_9 = 'supported',
        ratectrl_na_12 = 'basic',
        ratectrl_na_18 = 'supported',
        ratectrl_na_24 = 'basic',
        ratectrl_na_36 = 'supported',
        ratectrl_na_48 = 'supported',
        ratectrl_na_54 = 'supported',
        ratectrl_na_mode = 'default',
        ratectrl_ng_6 = 'basic',
        ratectrl_ng_9 = 'supported',
        ratectrl_ng_12 = 'basic',
        ratectrl_ng_18 = 'supported',
        ratectrl_ng_24 = 'basic',
        ratectrl_ng_36 = 'supported',
        ratectrl_ng_48 = 'supported',
        ratectrl_ng_54 = 'supported',
        ratectrl_ng_cck_1 = 'disabled',
        ratectrl_ng_cck_2 = 'disabled',
        ratectrl_ng_cck_5_5 = 'disabled',
        ratectrl_ng_cck_11 = 'disabled',
        ratectrl_ng_mode = 'default',
        site?: string
    ) {
        return this.netsite(
            '/rest/wlanconf',
            {
                name,
                is_guest,
                security,
                dtim_mode,
                dtim_na,
                dtim_ng,
                enabled,
                mac_filter_enabled,
                mac_filter_list,
                mac_filter_policy,
                radius_port_1,
                schedule,
                schedule_enabled,
                usergroup_id,
                wlangroup_id,
                wep_idx,
                wpa_enc,
                wpa_mode,
                ratectrl_na_6,
                ratectrl_na_9,
                ratectrl_na_12,
                ratectrl_na_18,
                ratectrl_na_24,
                ratectrl_na_36,
                ratectrl_na_48,
                ratectrl_na_54,
                ratectrl_na_mode,
                ratectrl_ng_6,
                ratectrl_ng_9,
                ratectrl_ng_12,
                ratectrl_ng_18,
                ratectrl_ng_24,
                ratectrl_ng_36,
                ratectrl_ng_48,
                ratectrl_ng_54,
                ratectrl_ng_cck_1,
                ratectrl_ng_cck_2,
                ratectrl_ng_cck_5_5,
                ratectrl_ng_cck_11,
                ratectrl_ng_mode,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Register to the SDN (Ubiquiti cloud)
     * @param {string} username Cloud username
     * @param {string} password Cloud password
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.sdn_register('unifi_user', 'unifi_pass')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    sdn_register(username: string, password: string, site?: string) {
        return this.netsite(
            '/cmd/sdn',
            {
                cmd: 'register',
                ubic_username: username,
                ubic_password: password,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Deregister of the SDN (Ubiquiti cloud)
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.sdn_unregister()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    sdn_unregister(site?: string) {
        return this.netsite(
            '/cmd/sdn',
            {
                cmd: 'unregister',
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Get information about the Ubiquiti cloud registration
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.sdn_stat()
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    sdn_stat(site?: string) {
        return this.netsite('/stat/sdn', undefined, {}, undefined, site);
    }

    /**
     * SDN on, off, deregistration
     * @param {boolean} enabled Enable SDN or disable it. Default true
     * @param {string} site_id Site id
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.sdn_onoff(true, '00010102221adffaa03')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    sdn_onoff(enabled = true, site_id = '', site?: string) {
        return this.netsite(
            '/set/setting/super_sdn',
            {
                key: 'super_sdn',
                enabled: enabled,
                site_id: site_id,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Extend voucher
     * @todo Test it and verify that the REST url is correct
     * @param {string} voucher_id voucher id
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @return {Promise} Promise
     * @example unifi.extend_voucher('00010102221adffaa03')
     *     .then(done => console.log('Success',done))
     *     .catch(err => console.log('Error',err))
     */
    extend_voucher(voucher_id = '', site?: string) {
        return this.netsite(
            '/set/setting/super_sdn',
            {
                cmd: 'extend',
                _id: voucher_id,
            },
            {},
            undefined,
            site
        );
    }

    buildSSHSession(
        mac: string,
        uuid: string,
        ttl = '-1',
        stun?: string,
        turn?: string,
        username?: string,
        password?: string,
        site?: string
    ) {
        return this.netsite(
            '/cmd/devmgr',
            {
                cmd: 'build-ssh-session',
                mac,
                uuid,
                ttl,
                stun,
                turn,
                username,
                password,
            },
            {},
            undefined,
            site
        );
    }

    getSDPOffer(mac: string, uuid: string, site?: string) {
        return new Promise((resolve, reject) => {
            let count = 10;
            let retry = () => {
                this.netsite(
                    '/cmd/devmgr',
                    {
                        cmd: 'get-sdp-offer',
                        mac,
                        uuid,
                    },
                    {},
                    undefined,
                    site
                )
                    .then((data) => {
                        if (
                            data?.data instanceof Array &&
                            data?.data.length === 0
                        ) {
                            // Empty response
                            if (--count >= 0) {
                                debug('Empty offer, wait and retry');
                                return setTimeout(retry, 2000);
                            } else reject('SDP Offer timeout');
                        }
                        resolve(data);
                    })
                    .catch(reject);
            };
            retry();
        });
    }

    sshSDPAnswer(mac: string, uuid: string, sdpanswer: string, site?: string) {
        return this.netsite(
            '/cmd/devmgr',
            {
                cmd: 'ssh-sdp-answer',
                mac: mac,
                uuid: uuid,
                sdpanswer: sdpanswer,
            },
            {},
            undefined,
            site
        );
    }

    closeSSHSession(mac: string, uuid: string, site?: string) {
        if (this.options.wrtc) this.options.wrtc.close();
        return this.netsite(
            '/cmd/devmgr',
            {
                cmd: 'close-ssh-session',
                mac,
                uuid,
            },
            {},
            undefined,
            site
        );
    }

    /**
     * Open SSH tunnel to a device managed by the controller (currently only Unifi AP) using WebRTC
     * @alias SSH
     * @param {string} mac The mac address of the AP
     * @param {string} uuid Unique UUID of the session. Optional. Auto generated if undefined
     * @param {string} stun Stun server url. Optional. If undefined, automatically populated
     * @param {string} turn Turn server url. Optional. If undefined, automatically populated
     * @param {string} username Turn username. Optional
     * @param {string} password Turn password. Optional
     * @param {string} site Ubiquiti site to query, if different from default - optonal
     * @param {number} autoclose Timeout (milisec) of inactivity before the session is automatically closed. Optional. Default 30000
     * @param {object} webrtc Object containing initialized WebRTC module. Optional. If not specified wrtc module is used or the one set in the UnifiAPI initialization. Tested with electron-webrtc
     * @param {number} waiter How many ms to wait before the next webrtc API call. Optionl. With wrtc is 100ms. However with electron-webrtc must be more than 1500 to avoid crashing on MAC and sometimes on Linux
     * @return {SSHSession} Return SSHSession object with connect, send, recv, expect, close methods
     * @example let ssh = unifi.connectSSH('00:01:02:03:04:05');
     * ssh.connect()
     *     .then((data) => {
     *         ssh.send('\nls -al\n');
     *         return ssh.expect('#')
     *     })
     *     .then(data => console.log(data))
     *     .catch(err => console.log('Error', err))
     */
    connectSSH(
        mac: string,
        uuid?: string,
        stun?: string,
        turn?: string,
        username?: string,
        password?: string,
        site?: string,
        autoclose: number = 30000,
        webrtc: any = this.options.webrtc,
        waiter: any = this.options.waiter
    ) {
        return new SSHSession(
            this,
            mac,
            uuid,
            stun,
            turn,
            username,
            password,
            site,
            autoclose,
            webrtc,
            waiter
        );
    }

    getSshTurnServers() {
        return new Promise((resolve, reject) => {
            debug('Respond with stun/turn servers');
            resolve({
                stun: 'stun:stun.l.google.com:19302',
                turn: 'turn:numb.viagenie.ca',
                username: 'webrtc@live.com',
                password: 'muazkh',
            });
        });
    }

    getTurnCredentials(site?: string) {
        return this.netsite(
            '/cmd/sdn',
            {
                cmd: 'get-turn-credentials',
            },
            {},
            undefined,
            site
        );
    }
}
