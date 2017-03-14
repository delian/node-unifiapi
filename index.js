let debug = require('debug')('UnifiAPI')
let merge = require('merge')
let UnifiRequest = require('./lib/unifi-request')
let SSHSession = require('./lib/ssh-session')

let defaultOptions = {
    'username': 'unifi',
    'password': 'unifi',
    'baseUrl': 'https://127.0.0.1:8443',
    'debug': false,
    'debugNet': false,
    'gzip': true,
    'site': 'default'
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
function UnifiAPI(options) {
    if (!(this instanceof UnifiAPI)) return new UnifiAPI(options)
    merge(this, defaultOptions, options);
    if (this.debug) debug.enabled = true;
    if (typeof this.net === 'undefined') {
        this.net = new UnifiRequest(merge(true, defaultOptions, options));
    }
    debug('UnifiAPI Initialized with options %o', options);
}

UnifiAPI.prototype.netsite = function(url = '', jsonParams = undefined, headers = {}, method = undefined, site = undefined) {
    site = site || this.site;
    if (typeof method === 'undefined') {
        if (typeof jsonParams === 'undefined') method = 'GET';
        else method = 'POST';
    }
    return this.net.req('/api/s/' + site + url, jsonParams, headers, method)
};

/**
 * @description Explicit login to the controller. It is not necessary, as every other method calls implicid login (with the default username and password) before execution
 * @param {string} username The username
 * @param {string} password The password
 * @return {Promise} success or failure
 * @example unifi.login(username, password)
 *     .then((data) => console.log('success', data))
 *     .catch((err) => console.log('Error', err))
 */
UnifiAPI.prototype.login = function(username, password) {
    return this.net.login(username, password);
};

/**
 * Logout of the controller
 * @example unifi.logout()
 *     .then(() => console.log('Success'))
 *     .catch((err) => console.log('Error', err))
 */
UnifiAPI.prototype.logout = function() {
    return this.net.logout();
};

/**
 * Authorize guest by a MAC address
 * @param {string} mac mac address of the guest - mandatory
 * @param {string} minutes minutes for the authorization - optional, default 60 min
 * @param {string} up upstream bandwidth in Kbps. Default no limit
 * @param {string} down downstream bandwidth in Kbps. Default no _limit
 * @param {string} mbytes download limit in Mbytes. Default no limit
 * @param {string} apmac to which mac address the authorization belongs. Default any
 * @param {string} site to which site (Ubiquiti) the command will be applied if it is different than the default
 * @return {Promise} Promise
 * @example unifi.authorize_guest('01:02:aa:bb:cc')
 *     .then((data) => console.log('Successful authorization'))
 *     .catch((err) => console.log('Error', err))
 */
UnifiAPI.prototype.authorize_guest = function(mac = '', minutes = 60, up = undefined, down = undefined, mbytes = undefined, apmac = undefined, site = undefined) {
    return this.netsite('/cmd/stamgr', {
        cmd: 'authorize_guest',
        mac: mac.toLowerCase(),
        minutes: minutes,
        up: up,
        down: down,
        bytes: mbytes,
        ap_mac: apmac.toLowerCase()
    }, {}, undefined, site);
};

/**
 * De-authorize guest by a MAC address
 * @param {string} mac the mac address
 * @param {site} site Ubiquiti site, if different from default - optional
 * @return {Promise} Promise
 * @example unifi.unauthorize_guest('00:01:02:03:aa:bb')
 *     .then((done) => console.log('Success', done))
 *     .catch((err) => console.log('Error', err))
 */
UnifiAPI.prototype.unauthorize_guest = function(mac = '', site = undefined) {
    return this.netsite('/cmd/stamgr', {
        cmd: 'uauthorize_guest',
        mac: mac.toLowerCase()
    }, {}, undefined, site);
};

/**
 * Kick a client (station) of the network. This will disconnect a wireless user if it is connected
 * @param {string} mac Mac address
 * @param {string} site Ubiquiti site, if different from default - optional
 * @return {Promise} Promise
 * @example unifi.kick_sta('00:00:11:22:33:44')
 *     .then(done => console.log('Success', done))
 *     .catch(err => console.log('Error', err))
 */
UnifiAPI.prototype.kick_sta = function(mac = '', site = undefined) {
    return this.netsite('/cmd/stamgr', {
        cmd: 'kick_sta',
        mac: mac.toLowerCase()
    }, {}, undefined, site);
};

/**
 * Terminate access of a Guest (logged in via Guest Authorization). It kicks it out of the wireless and authroization
 * @param {string} id the ID of the guest that have to be kicked out
 * @param {string} site Ubiquiti site, if different from default - optional
 * @return {Promise} Promise
 * @example unifi.terminate_guest('aa01af0133d334d77d')
 *     .this(done => console.log('Success', done))
 *     .catch(err => console.log('Error', err))
 */
UnifiAPI.prototype.terminate_guest = function(id = '', site = undefined) {
    return this.netsite('/cmd/hotspot', {
        _id: id,
        cmd: 'terminate'
    }, {}, undefined, site);
};

/**
 * Block station of the network
 * @param {string} mac Mac address
 * @param {string} site Ubiquiti site, if different from default - optional
 * @return {Promise} Promise
 * @example unifi.block_sta('00:01:02:03:04:05')
 *     .then(done => console.log('Success',done))
 *     .catch(err => console.log('Error', err))
 */
UnifiAPI.prototype.block_sta = function(mac = '', site = undefined) {
    return this.netsite('/cmd/stamgr', {
        cmd: 'block-sta',
        mac: mac.toLowerCase()
    }, {}, undefined, site);
};

/**
 * Unblock station of the network
 * @param {string} mac Mac address
 * @param {string} site Ubiquiti site, if different from default - optional
 * @return {Promise} Promise
 * @example unifi.block_sta('00:01:02:03:04:05')
 *     .then(done => console.log('Success',done))
 *     .catch(err => console.log('Error', err))
 */
UnifiAPI.prototype.unblock_sta = function(mac = '', site = undefined) {
    return this.netsite('/cmd/stamgr', {
        cmd: 'unblock-sta',
        mac: mac.toLowerCase()
    }, {}, undefined, site);
};

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
UnifiAPI.prototype.set_sta_note = function(user = '', note = '', site = undefined) {
    return this.netsite('/upd/user/' + user, {
        note: note,
        noted: note ? true : false
    }, {}, undefined, site);
};

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
UnifiAPI.prototype.set_sta_name = function(user = '', name = '', site = undefined) {
    return this.netsite('/upd/user/' + user, {
        name: name
    }, {}, undefined, site);
};

/**
 * List client sessions
 * @param {number} start Start time in Unix Timestamp - Optional. Default 7 days ago
 * @param {number} end End time in Unix timestamp - Optional. Default - now
 * @param {string} site Ubiquiti site, if different from default - optional
 * @return {Promise} Promise
 * @example unifi.stat_sessions()
 *     .then(done => console.log('Success',done))
 *     .catch(err => console.log('Error',err))
 */
UnifiAPI.prototype.stat_sessions = function(start = undefined, end = undefined, site = undefined) {
    return this.netsite('/stat/sessions', {
        type: 'all',
        start: start || (new Date()).getTime() / 1000 - 7 * 24 * 3600 * 1000,
        end: end || (new Date()).getTime()
    }, {}, undefined, site);
};

/**
 * List daily site statistics
 * @param {number} start Start time in Unix Timestamp - Optional. Default 7 days ago
 * @param {number} end End time in Unix timestamp - Optional. Default - now
 * @param {string} site Ubiquiti site, if different from default - optional
 * @return {Promise} Promise
 * @example unifi.stat_daily_site()
 *     .then(done => console.log('Success',done))
 *     .catch(err => console.log('Error',err))
 */
UnifiAPI.prototype.stat_daily_site = function(start = undefined, end = undefined, site = undefined) {
    return this.netsite('/stat/report/daily.site', {
        start: start ? start : (new Date()).getTime() - 52 * 7 * 24 * 3600 * 1000,
        end: end ? end : (new Date()).getTime(),
        attrs: [
            'bytes', 'wan-tx_bytes', 'wan-rx_bytes', 'wlan_bytes',
            'num_sta', 'lan-num_sta', 'wlan-num_sta', 'time'
        ]
    }, {}, undefined, site);
};

/**
 * List hourly site statistics
 * @param {number} start Start time in Unix Timestamp - Optional. Default 7 days ago
 * @param {number} end End time in Unix timestamp - Optional. Default - now
 * @param {string} site Ubiquiti site, if different from default - optional
 * @return {Promise} Promise
 * @example unifi.stat_hourly_site()
 *     .then(done => console.log('Success',done))
 *     .catch(err => console.log('Error',err))
 */
UnifiAPI.prototype.stat_hourly_site = function(start = undefined, end = undefined, site = undefined) {
    return this.netsite('/stat/report/hourly.site', {
        start: start ? start : (new Date()).getTime() - 7 * 24 * 3600 * 1000,
        end: end ? end : (new Date()).getTime(),
        attrs: [
            'bytes', 'wan-tx_bytes', 'wan-rx_bytes', 'wlan_bytes', 'num_sta', 'lan-num_sta', 'wlan-num_sta',
            'time'
        ]
    }, {}, undefined, site);
};

/**
 * List hourly site statistics for ap
 * @param {number} start Start time in Unix Timestamp - Optional. Default 7 days ago
 * @param {number} end End time in Unix timestamp - Optional. Default - now
 * @param {string} site Ubiquiti site, if different from default - optional
 * @return {Promise} Promise
 * @example unifi.stat_hourly_ap()
 *     .then(done => console.log('Success',done))
 *     .catch(err => console.log('Error',err))
 */
UnifiAPI.prototype.stat_hourly_ap = function(start = undefined, end = undefined, site = undefined) {
    return this.netsite('/stat/report/hourly.ap', {
        start: start ? start : (new Date()).getTime() - 7 * 24 * 3600 * 1000,
        end: end ? end : (new Date()).getTime(),
        attrs: [
            'bytes', 'num_sta', 'time'
        ]
    }, {}, undefined, site);
};

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
UnifiAPI.prototype.stat_sta_sessions_latest = function(mac = '', limit = 5, sort = '-asoc-time', site = undefined) {
    return this.netsite('/stat/sessions', {
        mac: mac.toLowerCase(),
        '_limit': limit,
        '_sort': sort
    }, {}, undefined, site);
};


UnifiAPI.prototype.stat_auths = function(start = undefined, end = undefined, site = undefined) {
    return this.netsite('/stat/authorization', {
        end: end || (new Date()).getTime(),
        start: start || (new Date()).getTime() - 7 * 24 * 3600000
    }, {}, undefined, site);
};

UnifiAPI.prototype.stat_allusers = function(historyhours = 8670, site = undefined) {
    return this.netsite('/stat/alluser', {
        type: 'all',
        conn: 'all',
        within: historyhours
    }, {}, undefined, site)
}

UnifiAPI.prototype.list_guests = function(historyhours = 8670, site = undefined) {
    return this.netsite('/stat/guest', {
        within: historyhours
    }, {}, undefined, site)
}

UnifiAPI.prototype.list_guests2 = function(historyhours = 8670, site = undefined) {
    return this.netsite('/stat/guest?within=' + historyhours, undefined, {}, undefined, site)
}

UnifiAPI.prototype.list_clients = function(mac = '', site = undefined) {
    return this.netsite('/stat/sta/' + mac, undefined, {}, undefined, site)
}

UnifiAPI.prototype.stat_client = function(mac = '', site = undefined) {
    return this.netsite('/stat/user/' + mac, undefined, {}, undefined, site)
}

UnifiAPI.prototype.list_usergroup = function(site = undefined) {
    return this.netsite('/list/usergroup', undefined, {}, undefined, site)
}

UnifiAPI.prototype.set_usergroup = function(userid = '', groupid = '', site = undefined) {
    return this.netsite('/upd/user/' + userid, {
        usergroup_id: groupid
    }, {}, undefined, site)
}

UnifiAPI.prototype.list_health = function(site = undefined) {
    return this.netsite('/stat/health', undefined, {}, undefined, site)
}

UnifiAPI.prototype.list_dashboard = function(site = undefined) {
    return this.netsite('/stat/dashboard', undefined, {}, undefined, site)
}

UnifiAPI.prototype.list_users = function(site = undefined) {
    return this.netsite('/list/user', undefined, {}, undefined, site)
}

UnifiAPI.prototype.list_aps = function(mac = '', site = undefined) { // TODO: not working with mac different than none
    return this.netsite('/stat/device/' + mac, undefined, {}, undefined, site)
}

UnifiAPI.prototype.list_rogueaps = function(within = 24, site = undefined) {
    return this.netsite('/stat/rogueap', {
        within: within
    }, {}, undefined, site)
}

UnifiAPI.prototype.list_sites = function() {
    return this.net.req('/api/self/sites')
}

UnifiAPI.prototype.stat_sites = function() {
    return this.net.req('/api/stat/sites')
}

UnifiAPI.prototype.add_site = function(name = 'default', description = '', site = undefined) {
    return this.netsite('/cmd/sitemgr', site = site, {
        cmd: 'add-site',
        name: name,
        desc: description
    }, {}, undefined, site)
}

UnifiAPI.prototype.remove_site = function(name = 'none', site = undefined) { // TODO: test it
    return this.netsite('/cmd/sitemgr', site = site, {
        cmd: 'remove-site',
        name: name
    }, {}, undefined, site)
}

UnifiAPI.prototype.list_wlan_groups = function(site = undefined) {
    return this.netsite('/list/wlangroup', undefined, {}, undefined, site)
}

UnifiAPI.prototype.stat_sysinfo = function(site = undefined) {
    return this.netsite('/stat/sysinfo', undefined, {}, undefined, site)
}

UnifiAPI.prototype.list_self = function(site = undefined) { // TODO: test
    return this.netsite('/self', undefined, {}, undefined, site)
}

UnifiAPI.prototype.list_networkconf = function(site = undefined) {
    return this.netsite('/list/networkconf', undefined, {}, undefined, site)
}

UnifiAPI.prototype.stat_voucher = function(createtime = undefined, site = undefined) {
    return this.netsite('/stat/voucher', {
        create_time: createtime
    }, {}, undefined, site)
}

UnifiAPI.prototype.stat_payment = function(within = undefined, site = undefined) {
    return this.netsite('/stat/payment', { // TODO: test it, is it payment or voucher
        within: within
    }, {}, undefined, site)
}

UnifiAPI.prototype.create_hotspot = function(name = '', password = '', note = '', site = undefined) {
    return this.netsite('/stat/voucher', {
        name: name,
        note: note,
        x_password: password
    }, {}, undefined, site)
}

UnifiAPI.prototype.list_hotspot = function(site = undefined) {
    return this.netsite('/list/hotspotop', undefined, {}, undefined, site)
}

UnifiAPI.prototype.create_voucher = function(minutes = 60, count = 1, quota = 0, note = undefined, up = undefined, down = undefined, mbytes = undefined, site = undefined) {
    return this.netsite('/cmd/hotspot', {
        note: note,
        up: up,
        down: down,
        bytes: mbytes,
        cmd: 'create-voucher',
        expire: minutes,
        n: count,
        quota: quota
    }, {}, undefined, site)
}

UnifiAPI.prototype.revoke_voucher = function(voucher_id, site = undefined) {
    return this.netsite('/cmd/hotspot', {
        cmd: 'delete-voucher',
        _id: voucher_id
    }, {}, undefined, site)
}

UnifiAPI.prototype.list_portforwarding = function(site = undefined) {
    return this.netsite('/list/portforward', undefined, {}, undefined, site)
}

UnifiAPI.prototype.list_dynamicdns = function(site = undefined) {
    return this.netsite('/list/dynamicdns', undefined, {}, undefined, site)
}

UnifiAPI.prototype.list_portconf = function(site = undefined) {
    return this.netsite('/list/portconf', undefined, {}, undefined, site)
}

UnifiAPI.prototype.list_extension = function(site = undefined) {
    return this.netsite('/list/extension', undefined, {}, undefined, site)
}

UnifiAPI.prototype.list_settings = function(site = undefined) {
    return this.netsite('/get/setting', undefined, {}, undefined, site)
}

UnifiAPI.prototype.restart_ap = function(mac = '', site = undefined) {
    return this.netsite('/cmd/devmgr', {
        cmd: 'restart',
        mac: mac.toLowerCase()
    }, {}, undefined, site)
}

UnifiAPI.prototype.disable_ap = function(ap_id = '', disable = true, site = undefined) {
    return this.netsite('/rest/device/' + ap_id, {
        disabled: disable
    }, {}, undefined, site)
}

UnifiAPI.prototype.enable_ap = function(ap_id = '', disable = false, site = undefined) {
    return this.disable_ap(ap_id, disable, site)
}

UnifiAPI.prototype.set_locate_ap = function(mac = '', site = undefined) {
    return this.netsite('/cmd/devmgr', {
        mac: mac.toLowerCase(),
        cmd: 'set-locate'
    }, {}, undefined, site)
}

UnifiAPI.prototype.unset_locate_ap = function(mac = '', site = undefined) {
    return this.netsite('/cmd/devmgr', {
        mac: mac.toLowerCase(),
        cmd: 'unset-locate'
    }, {}, undefined, site)
}

UnifiAPI.prototype.site_ledson = function(site = undefined) {
    return this.netsite('/set/setting/mgmt', {
        led_enabled: true
    }, {}, undefined, site)
}

UnifiAPI.prototype.site_ledson = function(site = undefined) {
    return this.netsite('/set/setting/mgmt', {
        led_enabled: false
    }, {}, undefined, site)
}

UnifiAPI.prototype.set_ap_radiosettings = function(ap_id = '', radio = 'ng', channel = 1, ht = '20', tx_power_mode = 0, tx_power = 0) {
    return this.netsite('/upd/device/' + ap_id, {
        radio: radio,
        channel: channel,
        ht: ht,
        tx_power_mode: tx_power_mode,
        tx_power: tx_power
    }, {}, undefined, site)
}

UnifiAPI.prototype.get_settings = function(site = undefined) {
    return this.netsite('/get/setting', undefined, {}, undefined, site)
}

UnifiAPI.prototype.get_settings_by_key = function(key, site = undefined) {
    return new Promise((resolve, reject) => {
        this.get_settings(site)
            .then((data) => {
                data.data = data.data.filter(n => n.key == key)
                resolve(data)
            })
            .catch(reject)
    })
}

UnifiAPI.prototype.set_settings = function(key, obj, site = undefined) {
    return new Promise((resolve, reject) => {
        this.get_settings_by_key(key, site)
            .then((data) => {
                if (data.data.length < 1) return reject({ msg: 'No such key', meta: { rc: 'error' } })
                let o = merge(true, data.data[0], obj)
                return this.netsite('/set/setting/' + o.key + '/' + o._id, o, {}, undefined, site)
            })
            .then(resolve)
            .catch(reject)
    })
}

UnifiAPI.prototype.set_guest_access = function(obj, guest_id, site_id, site = undefined) {
    let o = merge({}, {
        _id: guest_id || obj._id,
        site_id: site_id || obj.site_id,
        'auth': 'hotspot',
        'expire': '480',
        'facebook_enabled': false,
        'google_enabled': false,
        'key': 'guest_access',
        'payment_enabled': false,
        'payment_fields_address_enabled': true,
        'payment_fields_address_required': true,
        'payment_fields_city_enabled': true,
        'payment_fields_city_required': true,
        'payment_fields_country_default': '',
        'payment_fields_country_enabled': true,
        'payment_fields_country_required': true,
        'payment_fields_first_name_enabled': true,
        'payment_fields_first_name_required': true,
        'payment_fields_last_name_enabled': true,
        'payment_fields_last_name_required': true,
        'payment_fields_state_enabled': true,
        'payment_fields_state_required': true,
        'payment_fields_zip_enabled': true,
        'payment_fields_zip_required': true,
        'portal_customized': false,
        'portal_customized_bg_color': '#cccccc',
        'portal_customized_bg_image_enabled': false,
        'portal_customized_bg_image_tile': true,
        'portal_customized_box_color': '#ffffff',
        'portal_customized_box_link_color': '#1379b7',
        'portal_customized_box_opacity': 90,
        'portal_customized_box_text_color': '#000000',
        'portal_customized_button_color': '#1379b7',
        'portal_customized_button_text_color': '#ffffff',
        'portal_customized_languages': ['en'],
        'portal_customized_link_color': '#1379b7',
        'portal_customized_logo_enabled': false,
        'portal_customized_text_color': '#000000',
        'portal_customized_title': 'Hotspot portal',
        'portal_customized_tos': 'Terms of Use\n\nBy accessing the wireless network, you acknowledge that you\'re of legal age, you have read and understood and agree to be bound by this agreement.\n\nThe wireless network service is provided by the property owners and is completely at their discretion. Your access to the network may be blocked, suspended, or terminated at any time for any reason.\n\nYou agree not to use the wireless network for any purpose that is unlawful and take full responsibility of your acts.\n\nThe wireless network is provided "as is" without warranties of any kind, either expressed or implied.',
        'portal_customized_tos_enabled': true,
        'portal_customized_welcome_text_enabled': true,
        'portal_customized_welcome_text_position': 'under_logo',
        'portal_enabled': true,
        'redirect_enabled': false,
        'redirect_https': false,
        'redirect_to_https': false,
        'redirect_url': '',
        'restricted_subnet_1': '192.168.0.0/16',
        'restricted_subnet_2': '172.16.0.0/12',
        'restricted_subnet_3': '10.0.0.0/8',
        'template_engine': 'angular',
        'voucher_customized': false,
        'voucher_enabled': true,
        'x_facebook_app_secret': 'UBNT',
        'x_google_client_secret': 'UBNT',
        'x_password': 'UBNT'
    }, obj)
    return this.netsite('/set/setting/guest_access/' + o._id, o, {}, undefined, site)
}

UnifiAPI.prototype.set_guestlogin_settings = function(portal_enabled = true, portal_customized = true, redirect_enabled = false, redirect_url = '', x_password = '', expire_number = undefined, expire_unit = undefined, site_id = undefined, site = undefined) {
    return this.netsite('/set/setting/guest_access', {
        portal_enabled: portal_enabled,
        portal_customized: portal_customized,
        redirect_enabled: redirect_enabled,
        redirect_url: redirect_url,
        x_password: x_password,
        expire_number: expire_number,
        expire_unit: expire_unit,
        site_id: site_id
    }, {}, undefined, site)
}

UnifiAPI.prototype.rename_ap = function(ap_id = '', ap_name = '', site = undefined) {
    return this.netsite('/upd/device/' + ap_id, {
        name: ap_name
    }, {}, undefined, site)
}

UnifiAPI.prototype.set_wlansettings = function(wlan_id = '', x_password = undefined, name = undefined, site = undefined) { // TODO: test it
    return this.netsite('/upd/wlanconf/' + wlan_id, {
        x_passphrase: x_password,
        name: name
    }, {}, undefined, site)
}

UnifiAPI.prototype.list_events = function(site = undefined) {
    return this.netsite('/stat/event', undefined, {}, undefined, site)
}

UnifiAPI.prototype.list_wlanconf = function(site = undefined) {
    return this.netsite('/list/wlanconf', undefined, {}, undefined, site)
}

UnifiAPI.prototype.get_wlanconf = function(site = undefined) {
    return this.netsite('/rest/wlanconf', undefined, {}, undefined, site)
}

UnifiAPI.prototype.list_alarms = function(site = undefined) {
    return this.netsite('/list/alarm', undefined, {}, undefined, site)
}

UnifiAPI.prototype.set_ap_let = function(ap_id = '', led_override = 'default', site = undefined) {
    return this.netsite('/rest/device/' + ap_id, {
        led_override: led_override
    }, {}, undefined, site)
}

UnifiAPI.prototype.set_ap_name = function(ap_id, name = '', site = undefined) {
    return this.netsite('/rest/device/' + ap_id, {
        name: name
    }, {}, 'PUT', site)
}

UnifiAPI.prototype.set_ap_wireless = function(ap_id, radio = 'ng', channel = 'auto', ht = 20, min_rssi = -94, min_rssi_enabled = false, antenna_gain = 6, tx_power_mode = 'auto') {
    return this.netsite('/rest/device/' + ap_id, {
        'radio_table': [{
            'antenna_gain': antenna_gain,
            'channel': channel,
            'radio': radio,
            'ht': ht,
            'min_rssi': min_rssi,
            'min_rssi_enabled': min_rssi_enabled,
            'tx_power_mode': tx_power_mode
        }]
    }, {}, 'PUT', site)
}

UnifiAPI.prototype.status = function() {
    return this.net.req('/status', undefined, {}, undefined, site)
}

UnifiAPI.prototype.set_ap_network = function(ap_id = '', type = 'dhcp', ip = '192.168.1.6', netmask = '255.255.255.0', gateway = '192.168.1.1', dns1 = '8.8.8.8', dns2 = '8.8.4.4', site = undefined) {
    return this.netsite('/rest/device/' + ap_id, {
        'config_network': [{
            'type': type,
            'ip': ip,
            'netmask': netmask,
            'gateway': gateway,
            'dns1': dns1,
            'dns2': dns2
        }]
    }, {}, 'PUT', site)
}

UnifiAPI.prototype.request_spectrumscan = function(mac = '', site = undefined) {
    return this.netsite('/cmd/devmgr', {
        cmd: 'spectrum-scan',
        mac: mac.toLowerCase()
    }, {}, undefined, site)
}

UnifiAPI.prototype.set_site_descr = function(description = '', site = undefined) {
    return this.netsite('/cmd/sitemgr', {
        cmd: 'update-site',
        desc: description
    }, {}, undefined, site)
}

UnifiAPI.prototype.set_site_settings = function(gen_id = '', site_id = '', advanced = true, alerts = true, auto_upgrade = true, key = 'mgmt', led_enabled = true, x_ssh_username = 'ubnt', x_ssh_password = 'ubnt', x_ssh_md5passwd = '$1$PiGDOzRF$GX49UVoQSqwaLgXu/Cuvb/', site = undefined) {
    return this.netsite('/set/setting/mgmt/' + gen_id, {
        '_id': gen_id,
        'advanced_feature_enabled': advanced,
        'alert_enabled': alerts,
        'auto_upgrade': auto_upgrade,
        'key': key,
        'led_enabled': led_enabled,
        'site_id': site_id,
        'x_ssh_username': x_ssh_username,
        'x_ssh_password': x_ssh_password,
        'x_ssh_md5passwd': x_ssh_md5passwd
    }, {}, undefined, site)
}

UnifiAPI.prototype.add_hotspot2 = function(name = 'hotspot', network_access_internet = undefined, network_type = 2, venue_group = 2, venue_type = 0, site = undefined) {
    return this.netsite('/rest/hotspot2conf', {
        name: name,
        network_access_internet: network_access_internet,
        network_type: network_type,
        venue_group: venue_group,
        venue_type: venue_type
    }, {}, undefined, site)
}

UnifiAPI.prototype.list_hotspot2 = function(site = undefined) {
    return this.netsite('/rest/hotspot2conf', undefined, {}, undefined, site)
}

UnifiAPI.prototype.delete_hotspot2 = function(hs_id, site = undefined) {
    return this.netsite('/rest/hotspot2conf/' + hs_id, undefined, {}, 'DELETE', site)
}

UnifiAPI.prototype.set_hotspot2 = function(hs_id = '', name = undefined, network_access_internet = undefined, network_type = undefined, venue_type = undefined, venue_group = undefined, site = undefined) {
    return this.netsite('/rest/hotspot2conf/' + hs_id, {
        name: name,
        network_access_internet: network_access_internet,
        _id: hs_id,
        network_type: network_type,
        venue_type: venue_type,
        venue_group: venue_group
    }, {}, 'PUT', site)
}

UnifiAPI.prototype.remove_wlanconf = function(id, site = undefined) {
    return this.netsite('/rest/wlanconf/' + id, undefined, {}, 'DELETE', site)
}

UnifiAPI.prototype.add_wlanconf = function(name, is_guest = true, usergroup_id = undefined, wlangroup_id = undefined, security = 'open', enabled = true, dtim_mode = 'default', dtim_na = 1, dtim_ng = 1, mac_filter_enabled = false, mac_filter_list = [], mac_filter_policy = 'deny', radius_port_1 = 1812, schedule = [], schedule_enabled = false, usergroup = 'Default', wlangroup = 'Default', wep_idx = 1, wpa_enc = 'ccmp', wpa_mode = 'wpa2', ratectrl_na_6 = 'basic', ratectrl_na_9 = 'supported', ratectrl_na_12 = 'basic', ratectrl_na_18 = 'supported', ratectrl_na_24 = 'basic', ratectrl_na_36 = 'supported', ratectrl_na_48 = 'supported', ratectrl_na_54 = 'supported', ratectrl_na_mode = 'default', ratectrl_ng_6 = 'basic', ratectrl_ng_9 = 'supported', ratectrl_ng_12 = 'basic', ratectrl_ng_18 = 'supported', ratectrl_ng_24 = 'basic', ratectrl_ng_36 = 'supported', ratectrl_ng_48 = 'supported', ratectrl_ng_54 = 'supported', ratectrl_ng_cck_1 = 'disabled', ratectrl_ng_cck_2 = 'disabled', ratectrl_ng_cck_5_5 = 'disabled', ratectrl_ng_cck_11 = 'disabled', ratectrl_ng_mode = 'default', site = undefined) {
    return this.netsite('/rest/wlanconf', {
        'name': name,
        'is_guest': is_guest,
        'security': security,
        'dtim_mode': dtim_mode,
        'dtim_na': dtim_na,
        'dtim_ng': dtim_ng,
        'enabled': enabled,
        'mac_filter_enabled': mac_filter_enabled,
        'mac_filter_list': mac_filter_list,
        'mac_filter_policy': mac_filter_policy,
        'radius_port_1': radius_port_1,
        'schedule': schedule,
        'schedule_enabled': schedule_enabled,
        'usergroup_id': usergroup_id,
        'wlangroup_id': wlangroup_id,
        'wep_idx': wep_idx,
        'wpa_enc': wpa_enc,
        'wpa_mode': wpa_mode,
        'ratectrl_na_6': ratectrl_na_6,
        'ratectrl_na_9': ratectrl_na_9,
        'ratectrl_na_12': ratectrl_na_12,
        'ratectrl_na_18': ratectrl_na_18,
        'ratectrl_na_24': ratectrl_na_24,
        'ratectrl_na_36': ratectrl_na_36,
        'ratectrl_na_48': ratectrl_na_48,
        'ratectrl_na_54': ratectrl_na_54,
        'ratectrl_na_mode': ratectrl_na_mode,
        'ratectrl_ng_6': ratectrl_ng_6,
        'ratectrl_ng_9': ratectrl_ng_9,
        'ratectrl_ng_12': ratectrl_ng_12,
        'ratectrl_ng_18': ratectrl_ng_18,
        'ratectrl_ng_24': ratectrl_ng_24,
        'ratectrl_ng_36': ratectrl_ng_36,
        'ratectrl_ng_48': ratectrl_ng_48,
        'ratectrl_ng_54': ratectrl_ng_54,
        'ratectrl_ng_cck_1': ratectrl_ng_cck_1,
        'ratectrl_ng_cck_2': ratectrl_ng_cck_2,
        'ratectrl_ng_cck_5_5': ratectrl_ng_cck_5_5,
        'ratectrl_ng_cck_11': ratectrl_ng_cck_11,
        'ratectrl_ng_mode': ratectrl_ng_mode
    }, {}, undefined, site)
}

UnifiAPI.prototype.sdn_unregister = function(site = undefined) {
    return this.netsite('/cmd/sdn', {
        cmd: 'register',
        ubic_username: username,
        ubic_password: password
    }, {}, undefined, site)
}

UnifiAPI.prototype.sdn_register = function(username, password, site = undefined) {
    return this.netsite('/cmd/sdn', {
        cmd: 'unregister'
    }, {}, undefined, site)
}

UnifiAPI.prototype.sdn_stat = function(site = undefined) {
    return this.netsite('/stat/sdn', undefined, {}, undefined, site)
}

UnifiAPI.prototype.sdn_onoff = function(enabled = true, site_id = '', site = undefined) {
    return this.netsite('/set/setting/super_sdn', {
        key: 'super_sdn',
        enabled: enabled,
        site_id: site_id
    }, {}, undefined, site)
}

UnifiAPI.prototype.extend_voucher = function(voucher_id = '', site = undefined) {
    return this.netsite('/set/setting/super_sdn', {
        cmd: 'extend',
        _id: voucher_id
    }, {}, undefined, site)
}

UnifiAPI.prototype.buildSSHSession = function(mac, uuid, ttl = '-1', stun = undefined, turn = undefined, username = undefined, password = undefined, site = undefined) {
    return this.netsite('/cmd/devmgr', {
        cmd: 'build-ssh-session',
        mac: mac,
        uuid: uuid,
        ttl: ttl,
        stun: stun,
        turn: turn,
        username: username,
        password: password
    }, {}, undefined, site)
}

UnifiAPI.prototype.getSDPOffer = function(mac, uuid, site = undefined) {
    return new Promise((resolve, reject) => {
        let count = 10
        let retry = () => {
            this.netsite('/cmd/devmgr', {
                    cmd: 'get-sdp-offer',
                    mac: mac,
                    uuid: uuid
                }, {}, undefined, site)
                .then((data) => {
                    if (data && data.data && data.data instanceof Array && data.data.length === 0) {
                        // Empty response
                        if (--count >= 0) {
                            debug('Empty offer, wait and retry')
                            return setTimeout(retry, 2000)
                        } else reject('SDP Offer timeout')
                    }
                    resolve(data)
                })
                .catch(reject)
        }
        retry()
    })
}

UnifiAPI.prototype.sshSDPAnswer = function(mac, uuid, sdpanswer, site = undefined) {
    return this.netsite('/cmd/devmgr', {
        cmd: 'ssh-sdp-answer',
        mac: mac,
        uuid: uuid,
        sdpanswer: sdpanswer
    }, {}, undefined, site)
}

UnifiAPI.prototype.closeSSHSession = function(mac, uuid, site = undefined) {
    if (this.wrtc) this.wrtc.close()
    return this.netsite('/cmd/devmgr', {
        cmd: 'close-ssh-session',
        mac: mac,
        uuid: uuid
    }, {}, undefined, site)
}

UnifiAPI.prototype.connectSSH = function(mac, uuid, stun, turn, username, password, site, autoclose, webrtc, waiter) {
    return new SSHSession(this, mac, uuid, stun, turn, username, password, site, autoclose, webrtc || this.webrtc, waiter || this.waiter)
}

UnifiAPI.prototype.getSshTurnServers = function() {
    return new Promise((resolve, reject) => {
        debug('Respond with stun/turn servers')
        resolve({
            stun: 'stun:stun.l.google.com:19302',
            turn: 'turn:numb.viagenie.ca',
            username: 'webrtc@live.com',
            password: 'muazkh'
        })
    })
}

UnifiAPI.prototype.getTurnCredentials = function(site = undefined) {
    return this.netsite('/cmd/sdn', {
        cmd: 'get-turn-credentials'
    }, {}, undefined, site)
}

module.exports = UnifiAPI