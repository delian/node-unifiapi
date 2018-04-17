# node-unifiapi
UniFi API ported to Node.JS

This library is a rewrite of the PHP based UniFi-API-Browser written in JavaScript for Node-JS.

It is mimicking the UniFi-API-Browser API calls (the same commands the same effects) for Ubiquiti Unifi Controller versions 4 and 5 with addition of few more generic calls.

## Major features

* Implements the major (if not all) calls to the REST API of the Ubiquiti for Unifi Controller
* Supports WebRTC (over the Ubiquiti Unifi Cloud) protocol. If you have your devices registerred in the Unifi Cloud you can access them and execute the same REST API calls over WebRTC
* Supports SSH access to the devices that support it (mostly UAP) over WebRTC
* Supports Plug-in replacement for the WebRTC module (tested with electron-webrtc) in case wrtc doesn't work for you for some reason

## Warning
Quite unstable mostly due to the instability of the WebRTC implementation in Node.JS.
Also highly incompleted and untested. Any help appreciated!

## Installation
To install run:

    npm install node-unifiapi --save

The installation DOES NOT depend on the Node's wrtc module anymore.
If you want to use the WebRTC functionality (Unifi cloudapi and SSH tunnels to device) you have to install webrtc module, and if this module is not node-webrtc you have to explicitly specify it according to the documentation.

To install node-webrtc do:

    npm install node-webrtc --save

The install requirements for node-webrtc are visible here [node-webrtc](https://github.com/js-platform/node-webrtc). Please consult with the installation requirements of this module in order to be able to install it.

### XOpenDisplay Error
A frequent error caused by node-webrtc module is the one defined in issue [#281](https://github.com/js-platform/node-webrtc/issues/281)

    node: symbol lookup error: [local-path]/build/wrtc/v0.0.61/Release/node-v47-linux-x64/wrtc.node: undefined symbol: XOpenDisplay

It happens mostly on Linux, almost exquisively if the Linux have X11 subsystem, although it is not caused directly by it (but a bad linking).
The easiest method to avoid it is to use non desktop (non X11 based) Linux distribution, like Ubuntu Server. We all hope that in version 0.0.62 of the node-webrtc module this issue will be fixed.

### Segmentation errors
Again, the node-wrtc module is quite unstable sometimes. I find it best working on OSX or Linux (Linux Server, without X11 libraries) with the
prebuilt binary images (which for the moment requires node version 6.9 maximum for Linux).
The problem with this instability seems to be well known to the wrtc community but I cannot predict when it will be fixed.

However, the unifiapi module uses the standart webrtc api, so it could work with any webrtc module with the standard api.

Following is an example with electron-webrtc module:

   npm install electron-webrtc

And then a test (example) code:

    let cloud = require('node-unifiapi/cloudapi');
    let wrtc = require('electron-webrtc')({ headless: true });

    let r = cloud({ device-id: 'xxx-xxx-xx-xx-xx-xx', username: 'myuser', password: 'mypass', webrtc: wrtc, waiter: 1000 }).api;

    r.stat_sessions().then(data => console.log('Success', data).catch(err => console.log('Error', err);


The waiter property sets delay between every command sent to the webrtc in ms. I found electron-webrtc working better, if there is at least 500ms delay between the calls.

## Test from CLI
There is a sister project available here [https://github.com/delian/unificli](https://github.com/delian/unificli) which provides CLI tool where all (or most) of the calls of this API are exposed as REPL CLI commands one could use to test.

## Usage

All the API are Promises

### Direct access to Ubiquiti Unifi Controller
If you have a direct access to Ubiquiti Unifi Controller, you could use the following API:

    let unifi = require('node-unifiapi');
    let r = unifi({
        baseUrl: 'https://127.0.0.1:8443', // The URL of the Unifi Controller
        username: 'ubnt',
        password: 'ubnt',
        // debug: true, // More debug of the API (uses the debug module)
        // debugNet: true // Debug of the network requests (uses request module)
    });
    r.stat_sessions()
        .then((data) => {
            console.log('Stat sessions', data);
            return r.stat_allusers();
        })
        .then((data) => {
            console.log('AP data', data);
        })
        .catch((err) => {
            console.log('Error', err);
        })

### Access via Unifi Cloud and WebRTC
If you have to access the Unifi Controller if it is behind NAT and you need to use WebRTC to access it or known only via Unifi Cloud:

    let cloud = require('node-unifiapi/cloudapi');
    let r = cloud({
        deviceId: '801bb78e12c80000000001a22aea000000000203c905000000066660aaaa', // The cloud id of the device
        username: 'clouduser',
        password: 'cloudpass',
        // debug: true, // More debug of the API (uses the debug module)
        // debugNet: true // Debug of the network requests
    });
    r.api.stat_sessions()
        .then((data) => {
            console.log('Stat sessions', data);
            return r.api.stat_allusers();
        })
        .then((data) => {
            console.log('AP data', data);
        })
        .catch((err) => {
            console.log('Error', err);
        })

Be careful - when we use the cloud access all the Unifi calls are available under the .api property, to not confuse with the API calls that are related to the cloud management itself.

# Rebuild Readme.md
If you want to modify the README.md file for any reason (added jsdoc comment somewhere or have done change to README.hbs) please run

    npm run readme

# API

## Functions

<dl>
<dt><a href="#UnifiAPI">UnifiAPI(options)</a> ⇒</dt>
<dd><p>The main class and the initialization of the Unifi Access</p>
</dd>
<dt><a href="#list_settings">list_settings(site)</a> ⇒ <code>Promise</code></dt>
<dd><p>Alias to list_settings. Retrieve array with settings defined by setting key.</p>
</dd>
<dt><a href="#SSH">SSH(mac, uuid, stun, turn, username, password, site, autoclose, webrtc, waiter)</a> ⇒ <code>SSHSession</code></dt>
<dd><p>Open SSH tunnel to a device managed by the controller (currently only Unifi AP) using WebRTC</p>
</dd>
<dt><a href="#CloudAPI">CloudAPI(options)</a> ⇒</dt>
<dd><p>Cloud API interface. Under the .api method there will be all of the UnifiAPI calls (over WebRTC)</p>
</dd>
</dl>

<a name="UnifiAPI"></a>

## UnifiAPI(options) ⇒
The main class and the initialization of the Unifi Access

**Kind**: global function  
**Returns**: this  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | the options during initialization |
| options.baseUrl | <code>string</code> | the URL where the Unifi controller is. Default https://127.0.0.1:8443 |
| options.username | <code>string</code> | default username |
| options.password | <code>string</code> | default password |
| options.site | <code>string</code> | default site. Default is "default" |
| options.debug | <code>boolean</code> | if the debug log is enabled |
| options.debugNet | <code>boolean</code> | if the debug of the request module is enabled |

**Example**  
```js
let UnifiAPI = require('node-unifiapi');
let unifi = UnifiAPI({
   baseUrl: 'https://127.0.0.1:8443', // The URL of the Unifi Controller
   username: 'ubnt',
   password: 'ubnt',
   // debug: true, // More debug of the API (uses the debug module)
   // debugNet: true // Debug of the network requests (uses request module)
});
```

* [UnifiAPI(options)](#UnifiAPI) ⇒
    * [.debugging(enable)](#UnifiAPI+debugging) ⇒ <code>undefined</code>
    * [.netsite(url, jsonParams, headers, method, site)](#UnifiAPI+netsite) ⇒ <code>Promise</code>
    * [.login(username, password)](#UnifiAPI+login) ⇒ <code>Promise</code>
    * [.logout()](#UnifiAPI+logout)
    * [.authorize_guest(mac, minutes, up, down, mbytes, apmac, site)](#UnifiAPI+authorize_guest) ⇒ <code>Promise</code>
    * [.unauthorize_guest(mac, site)](#UnifiAPI+unauthorize_guest) ⇒ <code>Promise</code>
    * [.kick_sta(mac, site)](#UnifiAPI+kick_sta) ⇒ <code>Promise</code>
    * [.terminate_guest(id, site)](#UnifiAPI+terminate_guest) ⇒ <code>Promise</code>
    * [.block_sta(mac, site)](#UnifiAPI+block_sta) ⇒ <code>Promise</code>
    * [.unblock_sta(mac, site)](#UnifiAPI+unblock_sta) ⇒ <code>Promise</code>
    * [.set_sta_note(user, note, site)](#UnifiAPI+set_sta_note) ⇒ <code>Promise</code>
    * [.set_sta_name(user, name, site)](#UnifiAPI+set_sta_name) ⇒ <code>Promise</code>
    * [.stat_sessions(start, end, type, site)](#UnifiAPI+stat_sessions) ⇒ <code>Promise</code>
    * [.stat_daily_site(start, end, attrs, site)](#UnifiAPI+stat_daily_site) ⇒ <code>Promise</code>
    * [.stat_hourly_site(start, end, attrs, site)](#UnifiAPI+stat_hourly_site) ⇒ <code>Promise</code>
    * [.stat_hourly_ap(start, end, attrs, site)](#UnifiAPI+stat_hourly_ap) ⇒ <code>Promise</code>
    * [.stat_sta_sessions_latest(mac, limit, sort, site)](#UnifiAPI+stat_sta_sessions_latest) ⇒ <code>Promise</code>
    * [.stat_auths(start, end, site)](#UnifiAPI+stat_auths) ⇒ <code>Promise</code>
    * [.stat_allusers(historyhours, site)](#UnifiAPI+stat_allusers) ⇒ <code>Promise</code>
    * [.list_guests(historyhours, site)](#UnifiAPI+list_guests) ⇒ <code>Promise</code>
    * [.list_guests2(historyhours, site)](#UnifiAPI+list_guests2) ⇒ <code>Promise</code>
    * [.list_clients(mac, site)](#UnifiAPI+list_clients) ⇒ <code>Promise</code>
    * [.list_some_clients(macs, ap, site)](#UnifiAPI+list_some_clients) ⇒ <code>Promise</code>
    * [.stat_client(mac, site)](#UnifiAPI+stat_client) ⇒ <code>Promise</code>
    * [.list_usergroup(site)](#UnifiAPI+list_usergroup) ⇒ <code>Promise</code>
    * [.set_usergroup(userid, groupid, site)](#UnifiAPI+set_usergroup) ⇒ <code>Promise</code>
    * [.list_health(site)](#UnifiAPI+list_health) ⇒ <code>Promise</code>
    * [.list_dashboard(site)](#UnifiAPI+list_dashboard) ⇒ <code>Promise</code>
    * [.list_users(site)](#UnifiAPI+list_users) ⇒ <code>Promise</code>
    * [.list_aps(mac, site)](#UnifiAPI+list_aps) ⇒ <code>Promise</code>
    * [.list_rogueaps(within, site)](#UnifiAPI+list_rogueaps) ⇒ <code>Promise</code>
    * [.list_sites()](#UnifiAPI+list_sites) ⇒ <code>Promise</code>
    * [.stat_sites()](#UnifiAPI+stat_sites) ⇒ <code>Promise</code>
    * [.add_site(name, description, site)](#UnifiAPI+add_site) ⇒ <code>Promise</code>
    * [.remove_site(name, site)](#UnifiAPI+remove_site) ⇒ <code>Promise</code>
    * [.list_wlan_groups(site)](#UnifiAPI+list_wlan_groups) ⇒ <code>Promise</code>
    * [.stat_sysinfo(site)](#UnifiAPI+stat_sysinfo) ⇒ <code>Promise</code>
    * [.list_self(site)](#UnifiAPI+list_self) ⇒ <code>Promise</code>
    * [.list_networkconf(site)](#UnifiAPI+list_networkconf) ⇒ <code>Promise</code>
    * [.stat_voucher(createtime, site)](#UnifiAPI+stat_voucher) ⇒ <code>Promise</code>
    * [.stat_payment(within, site)](#UnifiAPI+stat_payment) ⇒ <code>Promise</code>
    * [.create_hotspot(name, password, note, site)](#UnifiAPI+create_hotspot) ⇒ <code>Promise</code>
    * [.list_hotspot(site)](#UnifiAPI+list_hotspot) ⇒ <code>Promise</code>
    * [.create_voucher(count, minutes, quota, note, up, down, mbytes, site)](#UnifiAPI+create_voucher) ⇒ <code>Promise</code>
    * [.revoke_voucher(voucher_id, site)](#UnifiAPI+revoke_voucher) ⇒ <code>Promise</code>
    * [.list_portforwarding(site)](#UnifiAPI+list_portforwarding) ⇒ <code>Promise</code>
    * [.list_dynamicdns(site)](#UnifiAPI+list_dynamicdns) ⇒ <code>Promise</code>
    * [.list_portconf(site)](#UnifiAPI+list_portconf) ⇒ <code>Promise</code>
    * [.list_extension(site)](#UnifiAPI+list_extension) ⇒ <code>Promise</code>
    * [.list_settings(site)](#UnifiAPI+list_settings) ⇒ <code>Promise</code>
    * [.restart_ap(mac, site)](#UnifiAPI+restart_ap) ⇒ <code>Promise</code>
    * [.disable_ap(ap_id, disable, site)](#UnifiAPI+disable_ap) ⇒ <code>Promise</code>
    * [.enable_ap(ap_id, disable, site)](#UnifiAPI+enable_ap) ⇒ <code>Promise</code>
    * [.set_locate_ap(mac, site)](#UnifiAPI+set_locate_ap) ⇒ <code>Promise</code>
    * [.unset_locate_ap(mac, site)](#UnifiAPI+unset_locate_ap) ⇒ <code>Promise</code>
    * [.site_ledson(site)](#UnifiAPI+site_ledson) ⇒ <code>Promise</code>
    * [.site_ledsoff(site)](#UnifiAPI+site_ledsoff) ⇒ <code>Promise</code>
    * [.set_ap_radiosettings(ap_id, radio, channel, ht, tx_power_mode, tx_power, site)](#UnifiAPI+set_ap_radiosettings) ⇒ <code>Promise</code>
    * [.get_settings_by_key(key, site)](#UnifiAPI+get_settings_by_key) ⇒ <code>Promise</code>
    * [.set_settings(key, obj, site)](#UnifiAPI+set_settings) ⇒ <code>Promise</code>
    * [.set_guest_access(obj, guest_id, site_id, site)](#UnifiAPI+set_guest_access) ⇒ <code>Promise</code>
    * [.set_guestlogin_settings(portal_enabled, portal_customized, redirect_enabled, redirect_url, x_password, site)](#UnifiAPI+set_guestlogin_settings) ⇒ <code>Promise</code>
    * [.rename_ap(ap_id, ap_name, site)](#UnifiAPI+rename_ap) ⇒ <code>Promise</code>
    * [.set_wlansettings(wlan_id, x_password, name, site)](#UnifiAPI+set_wlansettings) ⇒ <code>Promise</code>
    * [.list_events(site)](#UnifiAPI+list_events) ⇒ <code>Promise</code>
    * [.list_wlanconf(site)](#UnifiAPI+list_wlanconf) ⇒ <code>Promise</code>
    * [.get_wlanconf(site)](#UnifiAPI+get_wlanconf) ⇒ <code>Promise</code>
    * [.list_alarms(site)](#UnifiAPI+list_alarms) ⇒ <code>Promise</code>
    * [.set_ap_led(ap_id, led_override, site)](#UnifiAPI+set_ap_led) ⇒ <code>Promise</code>
    * [.set_ap_name(ap_id, name, site)](#UnifiAPI+set_ap_name) ⇒ <code>Promise</code>
    * [.set_ap_wireless(ap_id, radio, channel, ht, min_rssi, min_rssi_enabled, antenna_gain, tx_power_mode, site)](#UnifiAPI+set_ap_wireless) ⇒ <code>Promise</code>
    * [.status(site)](#UnifiAPI+status) ⇒ <code>Promise</code>
    * [.set_ap_network(ap_id, type, ip, netmask, gateway, dns1, dns2, site)](#UnifiAPI+set_ap_network) ⇒ <code>Promise</code>
    * [.request_spectrumscan(mac, site)](#UnifiAPI+request_spectrumscan) ⇒ <code>Promise</code>
    * [.set_site_descr(description, site)](#UnifiAPI+set_site_descr) ⇒ <code>Promise</code>
    * [.set_site_settings(gen_id, site_id, advanced, alerts, auto_upgrade, key, led_enabled, x_ssh_username, x_ssh_password, site)](#UnifiAPI+set_site_settings) ⇒ <code>Promise</code>
    * [.add_hotspot2(name, network_access_internet, network_type, venue_group, venue_type, site)](#UnifiAPI+add_hotspot2) ⇒ <code>Promise</code>
    * [.list_hotspot2(site)](#UnifiAPI+list_hotspot2) ⇒ <code>Promise</code>
    * [.delete_hotspot2(site)](#UnifiAPI+delete_hotspot2) ⇒ <code>Promise</code>
    * [.set_hotspot2(hs_id, name, network_access_internet, network_type, venue_group, venue_type, site)](#UnifiAPI+set_hotspot2) ⇒ <code>Promise</code>
    * [.remove_wlanconf(id, site)](#UnifiAPI+remove_wlanconf) ⇒ <code>Promise</code>
    * [.sdn_register(username, password, site)](#UnifiAPI+sdn_register) ⇒ <code>Promise</code>
    * [.sdn_unregister(site)](#UnifiAPI+sdn_unregister) ⇒ <code>Promise</code>
    * [.sdn_stat(site)](#UnifiAPI+sdn_stat) ⇒ <code>Promise</code>
    * [.sdn_onoff(enabled, site_id, site)](#UnifiAPI+sdn_onoff) ⇒ <code>Promise</code>
    * [.extend_voucher(voucher_id, site)](#UnifiAPI+extend_voucher) ⇒ <code>Promise</code>

<a name="UnifiAPI+debugging"></a>

### unifiAPI.debugging(enable) ⇒ <code>undefined</code>
Enable or disable the debug of the module

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  

| Param | Type | Description |
| --- | --- | --- |
| enable | <code>boolean</code> | Enable or disable the debugging |

<a name="UnifiAPI+netsite"></a>

### unifiAPI.netsite(url, jsonParams, headers, method, site) ⇒ <code>Promise</code>
Generic network operation, executing Ubiquiti command under /api/s/{site}/... rest api

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | The right part of the URL (/api/s/{site}/ is automatically added) |
| jsonParams | <code>object</code> | optional. Default undefined. If it is defined and it is object, those will be the JSON POST attributes sent to the URL and the the default method is changed from GET to POST |
| headers | <code>object</code> | optional. Default {}. HTTP headers that we require to be sent in the request |
| method | <code>object</code> | optional. Default undefined. The HTTP request method. If undefined, then it is automatic. If no jsonParams specified, it will be GET. If jsonParams are specified it will be POST |
| site | <code>string</code> | optional. The {site} atribute of the request. If not specified, it is taken from the UnifiAPI init options, where if it is not specified, it is "default" |

**Example**  
```js
unifi.netsite('/cmd/stamgr', { cmd: 'authorize-guest', mac: '00:01:02:03:04:05', minutes: 60 }, {}, 'POST', 'default')
    .then(data => console.log('Success', data))
    .catch(error => console.log('Error', error));
```
<a name="UnifiAPI+login"></a>

### unifiAPI.login(username, password) ⇒ <code>Promise</code>
Explicit login to the controller. It is not necessary, as every other method calls implicid login (with the default username and password) before execution

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - success or failure  

| Param | Type | Description |
| --- | --- | --- |
| username | <code>string</code> | The username |
| password | <code>string</code> | The password |

**Example**  
```js
unifi.login(username, password)
    .then(data => console.log('success', data))
    .catch(err => console.log('Error', err))
```
<a name="UnifiAPI+logout"></a>

### unifiAPI.logout()
Logout of the controller

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Example**  
```js
unifi.logout()
    .then(() => console.log('Success'))
    .catch(err => console.log('Error', err))
```
<a name="UnifiAPI+authorize_guest"></a>

### unifiAPI.authorize_guest(mac, minutes, up, down, mbytes, apmac, site) ⇒ <code>Promise</code>
Authorize guest by a MAC address

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| mac | <code>string</code> | mac address of the guest - mandatory |
| minutes | <code>string</code> | minutes for the authorization - optional, default 60 min |
| up | <code>string</code> | upstream bandwidth in Kbps. Default no limit |
| down | <code>string</code> | downstream bandwidth in Kbps. Default no _limit |
| mbytes | <code>string</code> | download limit in Mbytes. Default no limit |
| apmac | <code>string</code> | to which mac address the authorization belongs. Default any |
| site | <code>string</code> | to which site (Ubiquiti) the command will be applied if it is different than the default |

**Example**  
```js
unifi.authorize_guest('01:02:aa:bb:cc')
    .then(data => console.log('Successful authorization'))
    .catch(err => console.log('Error', err))
```
<a name="UnifiAPI+unauthorize_guest"></a>

### unifiAPI.unauthorize_guest(mac, site) ⇒ <code>Promise</code>
De-authorize guest by a MAC address

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| mac | <code>string</code> | the mac address |
| site | <code>site</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.unauthorize_guest('00:01:02:03:aa:bb')
    .then(done => console.log('Success', done))
    .catch(err => console.log('Error', err))
```
<a name="UnifiAPI+kick_sta"></a>

### unifiAPI.kick_sta(mac, site) ⇒ <code>Promise</code>
Kick a client (station) of the network. This will disconnect a wireless user if it is connected

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| mac | <code>string</code> | Mac address |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.kick_sta('00:00:11:22:33:44')
    .then(done => console.log('Success', done))
    .catch(err => console.log('Error', err))
```
<a name="UnifiAPI+terminate_guest"></a>

### unifiAPI.terminate_guest(id, site) ⇒ <code>Promise</code>
Terminate access of a Guest (logged in via Guest Authorization). It kicks it out of the wireless and authroization

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | the ID of the guest that have to be kicked out |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.terminate_guest('aa01af0133d334d77d')
    .this(done => console.log('Success', done))
    .catch(err => console.log('Error', err))
```
<a name="UnifiAPI+block_sta"></a>

### unifiAPI.block_sta(mac, site) ⇒ <code>Promise</code>
Block station of the network

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| mac | <code>string</code> | Mac address |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.block_sta('00:01:02:03:04:05')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error', err))
```
<a name="UnifiAPI+unblock_sta"></a>

### unifiAPI.unblock_sta(mac, site) ⇒ <code>Promise</code>
Unblock station of the network

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| mac | <code>string</code> | Mac address |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.block_sta('00:01:02:03:04:05')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error', err))
```
<a name="UnifiAPI+set_sta_note"></a>

### unifiAPI.set_sta_note(user, note, site) ⇒ <code>Promise</code>
Set or remove Note to a station

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| user | <code>string</code> | User ID |
| note | <code>string</code> | Note |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.set_sta_note('aabbaa0102aa03aa3322','Test note')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
**Example**  
```js
unifi.set_sta_note('aabbaa0102aa03aa3322','') // remove note
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+set_sta_name"></a>

### unifiAPI.set_sta_name(user, name, site) ⇒ <code>Promise</code>
Set or remove Name to a station

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| user | <code>string</code> | User ID |
| name | <code>string</code> | Name |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.set_sta_name('aabbaa0102aa03aa3322','Central Access Point')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
**Example**  
```js
unifi.set_sta_name('aabbaa0102aa03aa3322','') // remove name
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+stat_sessions"></a>

### unifiAPI.stat_sessions(start, end, type, site) ⇒ <code>Promise</code>
List client sessions

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| start | <code>number</code> | Start time in Unix Timestamp - Optional. Default 7 days ago |
| end | <code>number</code> | End time in Unix timestamp - Optional. Default - now |
| type | <code>string</code> | Sessions type. Optional. Default all |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.stat_sessions()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+stat_daily_site"></a>

### unifiAPI.stat_daily_site(start, end, attrs, site) ⇒ <code>Promise</code>
List daily site statistics

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| start | <code>number</code> | Start time in Unix Timestamp - Optional. Default 7 days ago |
| end | <code>number</code> | End time in Unix timestamp - Optional. Default - now |
| attrs | <code>array</code> | What attributes we are quering for. Optional. Default [ 'bytes', 'wan-tx_bytes', 'wan-rx_bytes', 'wlan_bytes', 'num_sta', 'lan-num_sta', 'wlan-num_sta', 'time' ] |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.stat_daily_site()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+stat_hourly_site"></a>

### unifiAPI.stat_hourly_site(start, end, attrs, site) ⇒ <code>Promise</code>
List hourly site statistics

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| start | <code>number</code> | Start time in Unix Timestamp - Optional. Default 7 days ago |
| end | <code>number</code> | End time in Unix timestamp - Optional. Default - now |
| attrs | <code>array</code> | What attributes we are quering for. Optional. Default [ 'bytes', 'wan-tx_bytes', 'wan-rx_bytes', 'wlan_bytes', 'num_sta', 'lan-num_sta', 'wlan-num_sta', 'time' ] |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.stat_hourly_site()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+stat_hourly_ap"></a>

### unifiAPI.stat_hourly_ap(start, end, attrs, site) ⇒ <code>Promise</code>
List hourly site statistics for ap

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| start | <code>number</code> | Start time in Unix Timestamp - Optional. Default 7 days ago |
| end | <code>number</code> | End time in Unix timestamp - Optional. Default - now |
| attrs | <code>array</code> | What attributes we are quering for. Optional. Default [ 'bytes', 'num_sta', 'time' ] |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.stat_hourly_ap()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+stat_sta_sessions_latest"></a>

### unifiAPI.stat_sta_sessions_latest(mac, limit, sort, site) ⇒ <code>Promise</code>
Last station sessions

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| mac | <code>string</code> | Mac address |
| limit | <code>number</code> | How many sessions. Optional. Default 5 |
| sort | <code>string</code> | Sorting. Optional. Default Ascending (asc) |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.stat_sta_sessions_latest('00:01:02:03:04:05', 10)
    .then(done => console.log('Success', done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+stat_auths"></a>

### unifiAPI.stat_auths(start, end, site) ⇒ <code>Promise</code>
List authorizations

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| start | <code>number</code> | Start time in Unix Timestamp - Optional. Default 7 days ago |
| end | <code>number</code> | End time in Unix timestamp - Optional. Default - now |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.stat_auths()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+stat_allusers"></a>

### unifiAPI.stat_allusers(historyhours, site) ⇒ <code>Promise</code>
List all users

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| historyhours | <code>number</code> | How many hours back to query. Optional. Default 8670 |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.stat_allusers()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_guests"></a>

### unifiAPI.list_guests(historyhours, site) ⇒ <code>Promise</code>
List of guests (authorized via the guest portal)

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| historyhours | <code>number</code> | How many hours back to query. Optional. Default 8670 |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.list_guests()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_guests2"></a>

### unifiAPI.list_guests2(historyhours, site) ⇒ <code>Promise</code>
List of guests (authorized via the guest portal) but with modern internal api

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| historyhours | <code>number</code> | How many hours back to query. Optional. Default 8670 |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.list_guests2()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_clients"></a>

### unifiAPI.list_clients(mac, site) ⇒ <code>Promise</code>
List of (all) clients per station

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| mac | <code>string</code> | Mac address |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.list_clients()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_some_clients"></a>

### unifiAPI.list_some_clients(macs, ap, site) ⇒ <code>Promise</code>
List of group of clients per station

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| macs | <code>string</code> | String mac or array of mac addresses as strings, to get information about them |
| ap | <code>string</code> | Station man address |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.list_some_clients()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+stat_client"></a>

### unifiAPI.stat_client(mac, site) ⇒ <code>Promise</code>
Statistics of (all) clients per station

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| mac | <code>string</code> | Mac address |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.stat_client()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_usergroup"></a>

### unifiAPI.list_usergroup(site) ⇒ <code>Promise</code>
List of the usergroups

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.list_usergroup()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+set_usergroup"></a>

### unifiAPI.set_usergroup(userid, groupid, site) ⇒ <code>Promise</code>
Add user to a group

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| userid | <code>string</code> | ID of the user |
| groupid | <code>string</code> | ID of the group |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.set_usergroup('11aa22bb33cc44dd55ee66ff', '112233445566778899aabb')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_health"></a>

### unifiAPI.list_health(site) ⇒ <code>Promise</code>
List health

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.list_health()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_dashboard"></a>

### unifiAPI.list_dashboard(site) ⇒ <code>Promise</code>
List dashboard

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.list_dashboard()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_users"></a>

### unifiAPI.list_users(site) ⇒ <code>Promise</code>
List users

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.list_users()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_aps"></a>

### unifiAPI.list_aps(mac, site) ⇒ <code>Promise</code>
List APs

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| mac | <code>string</code> | AP mac/id, Optional |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.list_aps()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_rogueaps"></a>

### unifiAPI.list_rogueaps(within, site) ⇒ <code>Promise</code>
List Rogue APs

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| within | <code>number</code> | For how many hours back. Optional. Default 24h |
| site | <code>string</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.list_rogueaps()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_sites"></a>

### unifiAPI.list_sites() ⇒ <code>Promise</code>
List sites

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  
**Example**  
```js
unifi.list_sites()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+stat_sites"></a>

### unifiAPI.stat_sites() ⇒ <code>Promise</code>
Sites stats

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  
**Example**  
```js
unifi.stat_sites()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+add_site"></a>

### unifiAPI.add_site(name, description, site) ⇒ <code>Promise</code>
Add new site

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | name |
| description | <code>string</code> | description - optional |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.add_site('mysite','Experimental site')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+remove_site"></a>

### unifiAPI.remove_site(name, site) ⇒ <code>Promise</code>
Remove site

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | name |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.remove_site('mysite')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_wlan_groups"></a>

### unifiAPI.list_wlan_groups(site) ⇒ <code>Promise</code>
List WLANGroups

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.list_wlan_groups()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+stat_sysinfo"></a>

### unifiAPI.stat_sysinfo(site) ⇒ <code>Promise</code>
Stat Sysinfo

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.stat_sysinfo()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_self"></a>

### unifiAPI.list_self(site) ⇒ <code>Promise</code>
Get information aboult self (username, etc)

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.list_self()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_networkconf"></a>

### unifiAPI.list_networkconf(site) ⇒ <code>Promise</code>
Get information aboult the network configuration

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.list_networkconf()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+stat_voucher"></a>

### unifiAPI.stat_voucher(createtime, site) ⇒ <code>Promise</code>
Get accounting / status of the vouchers

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| createtime | <code>number</code> | Unixtimestamp since when we return information about the vouchers. Optional. Default any |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.stat_voucher()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+stat_payment"></a>

### unifiAPI.stat_payment(within, site) ⇒ <code>Promise</code>
Get accounting / status of the payments

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| within | <code>number</code> | how many hours back we query. Optional. Default any |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.stat_payment()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+create_hotspot"></a>

### unifiAPI.create_hotspot(name, password, note, site) ⇒ <code>Promise</code>
Create HotSpot (version 1)

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  
**Todo**

- [ ] Check if the URL of the rest service is correct
- [ ] Test that it is working


| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | name |
| password | <code>string</code> | password |
| note | <code>string</code> | Note (optional) |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.create_hotspot('myhotspot', 'password', 'note')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_hotspot"></a>

### unifiAPI.list_hotspot(site) ⇒ <code>Promise</code>
List all of the hotspots (v1)

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.list_hotspot()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+create_voucher"></a>

### unifiAPI.create_voucher(count, minutes, quota, note, up, down, mbytes, site) ⇒ <code>Promise</code>
Create vouchers. Generate a set of vouchers

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| count | <code>number</code> | how many vouchers to generate. Optional. default is 1 |
| minutes | <code>number</code> | how long the voucher may be active after activation in minutes. Optional. default is 60 minutes |
| quota | <code>number</code> | how many times a user may reuse (login with) this voucher. Default 0 = unlimited. 1 means only once. 2 means two times and so on |
| note | <code>string</code> | the note of the voucher. Optional |
| up | <code>number</code> | Upstream bandwidth rate limit in Kbits. Optional. Default - no limit |
| down | <code>number</code> | Downstream bandwidth rate limit in Kbits. Optional. Default - no limit |
| mbytes | <code>number</code> | Limit of the maximum download traffic in Mbytes. Optional. Default - no limit |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.create_voucher(10, 2880, 1, 'Test vouchers', 1000, 2000, 250)
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+revoke_voucher"></a>

### unifiAPI.revoke_voucher(voucher_id, site) ⇒ <code>Promise</code>
Revoke Voucher. Voucher revoking is the same as deleting the voucher. In most of the cases the authorized user is kicked out of the network too

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| voucher_id | <code>string</code> | description |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.revoke_voucher('9912982aaff182728a0f03')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_portforwarding"></a>

### unifiAPI.list_portforwarding(site) ⇒ <code>Promise</code>
List port forwarding configuration

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.list_portforwarding()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_dynamicdns"></a>

### unifiAPI.list_dynamicdns(site) ⇒ <code>Promise</code>
List dynamic dns configuration

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.list_dynamicdns()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_portconf"></a>

### unifiAPI.list_portconf(site) ⇒ <code>Promise</code>
List network port configuration

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  
**Todo**

- [ ] Test it


| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.list_portconf()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_extension"></a>

### unifiAPI.list_extension(site) ⇒ <code>Promise</code>
List extensions

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  
**Todo**

- [ ] Learn more what exactly is this


| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.list_extension()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_settings"></a>

### unifiAPI.list_settings(site) ⇒ <code>Promise</code>
Get array with all the settings refered by settings key

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.list_settings()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+restart_ap"></a>

### unifiAPI.restart_ap(mac, site) ⇒ <code>Promise</code>
Restart Wireless Access Point

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| mac | <code>string</code> | mac address of the AP |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.restart_ap('00:01:02:03:aa:04')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+disable_ap"></a>

### unifiAPI.disable_ap(ap_id, disable, site) ⇒ <code>Promise</code>
Disable Wireless Access Point

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| ap_id | <code>string</code> | The internal ID of the AP |
| disable | <code>boolean</code> | Shall we disable it. Optional. Default true. If false, the AP is enabled |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.disable_ap('001fa98a00a22328123')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+enable_ap"></a>

### unifiAPI.enable_ap(ap_id, disable, site) ⇒ <code>Promise</code>
Enable Wireless Access Point

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| ap_id | <code>string</code> | The internal ID of the AP |
| disable | <code>boolean</code> | Shall we disable it. Optional. Default true. If false, the AP is enabled |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.enable_ap('001fa98a00a22328123')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+set_locate_ap"></a>

### unifiAPI.set_locate_ap(mac, site) ⇒ <code>Promise</code>
Locate Wireless Access Point. The Access Point will start blinking

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| mac | <code>string</code> | mac of the AP |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.set_locate_ap('00:01:aa:03:04:05')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+unset_locate_ap"></a>

### unifiAPI.unset_locate_ap(mac, site) ⇒ <code>Promise</code>
Turn off Locate Wireless Access Point. The Access Point will stop blinking

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| mac | <code>string</code> | mac of the AP |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.unset_locate_ap('00:01:aa:03:04:05')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+site_ledson"></a>

### unifiAPI.site_ledson(site) ⇒ <code>Promise</code>
All devices in the site group will start blinking

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.site_ledson()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+site_ledsoff"></a>

### unifiAPI.site_ledsoff(site) ⇒ <code>Promise</code>
All devices in the site group will stop blinking

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.site_ledsoff()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+set_ap_radiosettings"></a>

### unifiAPI.set_ap_radiosettings(ap_id, radio, channel, ht, tx_power_mode, tx_power, site) ⇒ <code>Promise</code>
Change AP wireless settings

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| ap_id | <code>string</code> | internal id of the AP |
| radio | <code>string</code> | The radio type. Supports ng or ac. Default ng. Optional |
| channel | <code>number</code> | Wireless channel. Optional. Default 1. Could be string 'auto' |
| ht | <code>number</code> | HT width in MHz. 20, 40, 80, 160. Optional. Default 20 |
| tx_power_mode | <code>number</code> | TX Power Mode. Optional. Default 0 |
| tx_power | <code>number</code> | TX Power. Optional. Default 0 |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.set_ap_radiosettings('aa0101023faabbaacc0c0', 'ng', 3, 20)
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+get_settings_by_key"></a>

### unifiAPI.get_settings_by_key(key, site) ⇒ <code>Promise</code>
Retrieve settings by a specific settings key. Only elements with this settings key will be returned in the array. Usually 1 or 0
Typical keys are mgmt, snmp, porta, locale, rsyslogd, auto_speedtest, country, connectivity

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> | key |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.get_settings_by_key('mgmt')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+set_settings"></a>

### unifiAPI.set_settings(key, obj, site) ⇒ <code>Promise</code>
Set settings by key modifies properties of the settings, defined by key

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> | key |
| obj | <code>object</code> | object of properties that overwrite the original values |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.set_settings_by_key('mgmt', { auto_upgrade: true })
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+set_guest_access"></a>

### unifiAPI.set_guest_access(obj, guest_id, site_id, site) ⇒ <code>Promise</code>
Set Guest Settings and Guest Access Portal are created with this method

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| obj | <code>object</code> | Object of properties that modify the original values |
| obj.auth | <code>string</code> | Optional. Type of authentication. hotspot, radius, none, .... Default hotspot |
| obj.expire | <code>string</code> | Optional. How long the authentication is valid in minutes. Default 480 (8h) |
| obj.facebook_enabled | <code>boolean</code> | Optional. Allow authentication with facebook. Default false |
| obj.google_enabled | <code>boolean</code> | Optional. Allow authentication with google+. Default false |
| obj.payment | <code>boolean</code> | Optional. Allow payments for authentication. Default false |
| obj.portal_customized | <code>boolean</code> | Optional. Customize the auth portal. Default false |
| obj.portal_enabled | <code>boolean</code> | Optional. Enable the portal. Default true |
| obj.redirect_enabled | <code>boolean</code> | Optional. Redirect after authentication. Default false |
| obj.redirect_url | <code>string</code> | Optional. Redirect URL after successful authentication. Default empty |
| obj.voucher_enabled | <code>boolean</code> | Optional. If voucher authentication is enabled. Default false |
| guest_id | <code>string</code> | From the get_settings, the ID of the guest settings |
| site_id | <code>string</code> | The ID of the current site |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.set_guest_access({ auth: 'hotspot', payment_enabled: true }, 'aabbaa01010203','ccffee0102030303')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+set_guestlogin_settings"></a>

### unifiAPI.set_guestlogin_settings(portal_enabled, portal_customized, redirect_enabled, redirect_url, x_password, site) ⇒ <code>Promise</code>
Set Guest Login Settings (simplified version)

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| portal_enabled | <code>boolean</code> | If the portal is enabled. Optional. Default true |
| portal_customized | <code>boolean</code> | If the portal is customized. Optional. Default true |
| redirect_enabled | <code>boolean</code> | If the redirection is enabled. Optional. Default false |
| redirect_url | <code>string</code> | The url for redirection. Optional. Default '' |
| x_password | <code>string</code> | Password for the portal. Optional. Default '' |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.set_guestlogin_settings(true, true, true, 'http://news.com')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+rename_ap"></a>

### unifiAPI.rename_ap(ap_id, ap_name, site) ⇒ <code>Promise</code>
Rename Access Point

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| ap_id | <code>string</code> | Id of the AP |
| ap_name | <code>string</code> | New name of the AP |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.rename_ap('ccffee0102030303','My Access Point')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+set_wlansettings"></a>

### unifiAPI.set_wlansettings(wlan_id, x_password, name, site) ⇒ <code>Promise</code>
Set WLAN Settings

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| wlan_id | <code>strings</code> | ID of the Wlan |
| x_password | <code>string</code> | Password of the WLAN |
| name | <code>string</code> | Name of the WLAN |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.set_wlansettings('ccffee0102030303', 'guest', 'GuestWLAN')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_events"></a>

### unifiAPI.list_events(site) ⇒ <code>Promise</code>
List the Events

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.list_events()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_wlanconf"></a>

### unifiAPI.list_wlanconf(site) ⇒ <code>Promise</code>
Get WLAN Config. Respond with Array of Wlan configurations

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.list_wlanconf()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+get_wlanconf"></a>

### unifiAPI.get_wlanconf(site) ⇒ <code>Promise</code>
Get WLAN Config. Second REST option. Respond with Array of Wlan configurations

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.get_wlanconf()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_alarms"></a>

### unifiAPI.list_alarms(site) ⇒ <code>Promise</code>
List the Alarms

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.list_alarms()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+set_ap_led"></a>

### unifiAPI.set_ap_led(ap_id, led_override, site) ⇒ <code>Promise</code>
Set the access point LED

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| ap_id | <code>string</code> | AP ID |
| led_override | <code>string</code> | Do we follow the standard LED config. Options default and overwrite |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.set_ap_led('12312312312','default')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+set_ap_name"></a>

### unifiAPI.set_ap_name(ap_id, name, site) ⇒ <code>Promise</code>
Change the name of an Access Point

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| ap_id | <code>string</code> | the ID of the AP |
| name | <code>string</code> | the new name |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.set_ap_name('12312312312','new ap')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+set_ap_wireless"></a>

### unifiAPI.set_ap_wireless(ap_id, radio, channel, ht, min_rssi, min_rssi_enabled, antenna_gain, tx_power_mode, site) ⇒ <code>Promise</code>
Set wireless properties per AP

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| ap_id | <code>string</code> | the ID of the AP |
| radio | <code>string</code> | radio type. ng/ac/bg. Optional. Default ng |
| channel | <code>number</code> | The channel number or auto. Optional. Default auto. |
| ht | <code>number</code> | channel width. 20/40/80/160. Optional. Default 20. |
| min_rssi | <code>number</code> | Minimal RSSI accepted in dbi. Optional. Default -94 |
| min_rssi_enabled | <code>boolean</code> | If enabled, drops users bellow that rssi valur. Optional. Default false |
| antenna_gain | <code>number</code> | The antenna gain. Optional. Default 6 dbi |
| tx_power_mode | <code>string</code> | TX Power Mode. Optional. Default auto |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.set_ap_wireless('12312312312','ng', 3)
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+status"></a>

### unifiAPI.status(site) ⇒ <code>Promise</code>
Check status

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.status()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+set_ap_network"></a>

### unifiAPI.set_ap_network(ap_id, type, ip, netmask, gateway, dns1, dns2, site) ⇒ <code>Promise</code>
Configure the network settings of AP/device

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| ap_id | <code>string</code> | ID of the AP |
| type | <code>string</code> | static or dhcp. Optional. Default dhcp |
| ip | <code>string</code> | IP address. Optional |
| netmask | <code>string</code> | netmask. Optional |
| gateway | <code>string</code> | gateway. Optional |
| dns1 | <code>string</code> | dns. Optional |
| dns2 | <code>string</code> | dns. Optional |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.set_ap_network('00:01:02:03:04:05', 'dhcp')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+request_spectrumscan"></a>

### unifiAPI.request_spectrumscan(mac, site) ⇒ <code>Promise</code>
Request a spectrum scan

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| mac | <code>string</code> | Mac of the AP |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.request_spectrumscan('00:01:02:03:04:05')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+set_site_descr"></a>

### unifiAPI.set_site_descr(description, site) ⇒ <code>Promise</code>
Set description to the site

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| description | <code>string</code> | description |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.set_site_descr('My site')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+set_site_settings"></a>

### unifiAPI.set_site_settings(gen_id, site_id, advanced, alerts, auto_upgrade, key, led_enabled, x_ssh_username, x_ssh_password, site) ⇒ <code>Promise</code>
Set settings of the site (optional)

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  
**Todo**

- [ ] To be tested and completed


| Param | Type | Description |
| --- | --- | --- |
| gen_id | <code>string</code> | The id of the settings |
| site_id | <code>string</code> | The id of the site |
| advanced | <code>boolean</code> | advanced options enabled. Optional. default true |
| alerts | <code>boolean</code> | alerts enabled. Optional. default true |
| auto_upgrade | <code>boolean</code> | auto upgrade of the AP enabled. Optional. default true |
| key | <code>string</code> | always mgmt. Optional. default mgmt |
| led_enabled | <code>boolean</code> | Led enabled. Optional. default true |
| x_ssh_username | <code>string</code> | SSH username. Optional. Default ubnt |
| x_ssh_password | <code>string</code> | SSH password. Optional. Default ubnt |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.set_site_settings('0101923920a3a4fbff', '3333923920a3a4fbff', false)
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+add_hotspot2"></a>

### unifiAPI.add_hotspot2(name, network_access_internet, network_type, venue_group, venue_type, site) ⇒ <code>Promise</code>
Add HotSpot 2.0 configuration

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | hotspot name. Default hotspot |
| network_access_internet | <code>string</code> | Network access |
| network_type | <code>number</code> | Network type. Optional. Default 2 |
| venue_group | <code>number</code> | Venue group. Optional. Default 2 |
| venue_type | <code>number</code> | Venue type. Optional. Default 0 |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.add_hotspot2('hotspot2.0 config')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+list_hotspot2"></a>

### unifiAPI.list_hotspot2(site) ⇒ <code>Promise</code>
List hotspot 2.0 configurations

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.list_hotspot2()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+delete_hotspot2"></a>

### unifiAPI.delete_hotspot2(site) ⇒ <code>Promise</code>
Delete hotspot 2.0 configuration

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.delete_hotspot2('112233445566778899aabb')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
**Example**  
```js
unifi.list_hotspot2()
    .then(data => unifi.delete_hotspot2(data.data.shift()._id))
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+set_hotspot2"></a>

### unifiAPI.set_hotspot2(hs_id, name, network_access_internet, network_type, venue_group, venue_type, site) ⇒ <code>Promise</code>
Modify Hotspot 2.0 configuration

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| hs_id | <code>string</code> | Hotspot2.0 config id |
| name | <code>string</code> | name. Optional |
| network_access_internet | <code>string</code> | Network access. Optional |
| network_type | <code>number</code> | Network type. Optional |
| venue_group | <code>number</code> | Venue group. Optional |
| venue_type | <code>number</code> | Venue type. Optional |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.set_hotspot2('112323322aaaffa191', 'new name')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+remove_wlanconf"></a>

### unifiAPI.remove_wlanconf(id, site) ⇒ <code>Promise</code>
Remove WLAN configuration

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>string</code> | wlan config id |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.remove_wlanconf('112323322aaaffa191')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+sdn_register"></a>

### unifiAPI.sdn_register(username, password, site) ⇒ <code>Promise</code>
Register to the SDN (Ubiquiti cloud)

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| username | <code>string</code> | Cloud username |
| password | <code>string</code> | Cloud password |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.sdn_register('unifi_user', 'unifi_pass')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+sdn_unregister"></a>

### unifiAPI.sdn_unregister(site) ⇒ <code>Promise</code>
Deregister of the SDN (Ubiquiti cloud)

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.sdn_unregister()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+sdn_stat"></a>

### unifiAPI.sdn_stat(site) ⇒ <code>Promise</code>
Get information about the Ubiquiti cloud registration

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.sdn_stat()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+sdn_onoff"></a>

### unifiAPI.sdn_onoff(enabled, site_id, site) ⇒ <code>Promise</code>
SDN on, off, deregistration

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| enabled | <code>boolean</code> | Enable SDN or disable it. Default true |
| site_id | <code>string</code> | Site id |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.sdn_onoff(true, '00010102221adffaa03')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="UnifiAPI+extend_voucher"></a>

### unifiAPI.extend_voucher(voucher_id, site) ⇒ <code>Promise</code>
Extend voucher

**Kind**: instance method of [<code>UnifiAPI</code>](#UnifiAPI)  
**Returns**: <code>Promise</code> - Promise  
**Todo**

- [ ] Test it and verify that the REST url is correct


| Param | Type | Description |
| --- | --- | --- |
| voucher_id | <code>string</code> | voucher id |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |

**Example**  
```js
unifi.extend_voucher('00010102221adffaa03')
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="list_settings"></a>

## list_settings(site) ⇒ <code>Promise</code>
Alias to list_settings. Retrieve array with settings defined by setting key.

**Kind**: global function  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optional |

**Example**  
```js
unifi.get_settings()
    .then(done => console.log('Success',done))
    .catch(err => console.log('Error',err))
```
<a name="SSH"></a>

## SSH(mac, uuid, stun, turn, username, password, site, autoclose, webrtc, waiter) ⇒ <code>SSHSession</code>
Open SSH tunnel to a device managed by the controller (currently only Unifi AP) using WebRTC

**Kind**: global function  
**Returns**: <code>SSHSession</code> - Return SSHSession object with connect, send, recv, expect, close methods  

| Param | Type | Description |
| --- | --- | --- |
| mac | <code>string</code> | The mac address of the AP |
| uuid | <code>string</code> | Unique UUID of the session. Optional. Auto generated if undefined |
| stun | <code>string</code> | Stun server url. Optional. If undefined, automatically populated |
| turn | <code>string</code> | Turn server url. Optional. If undefined, automatically populated |
| username | <code>string</code> | Turn username. Optional |
| password | <code>string</code> | Turn password. Optional |
| site | <code>string</code> | Ubiquiti site to query, if different from default - optonal |
| autoclose | <code>number</code> | Timeout (milisec) of inactivity before the session is automatically closed. Optional. Default 30000 |
| webrtc | <code>object</code> | Object containing initialized WebRTC module. Optional. If not specified wrtc module is used or the one set in the UnifiAPI initialization. Tested with electron-webrtc |
| waiter | <code>number</code> | How many ms to wait before the next webrtc API call. Optionl. With wrtc is 100ms. However with electron-webrtc must be more than 1500 to avoid crashing on MAC and sometimes on Linux |

**Example**  
```js
let ssh = unifi.connectSSH('00:01:02:03:04:05');
ssh.connect()
    .then((data) => {
        ssh.send('\nls -al\n');
        return ssh.expect('#')
    })
    .then(data => console.log(data))
    .catch(err => console.log('Error', err))
```
<a name="CloudAPI"></a>

## CloudAPI(options) ⇒
Cloud API interface. Under the .api method there will be all of the UnifiAPI calls (over WebRTC)

**Kind**: global function  
**Returns**: CloudAPI  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>object</code> | default parameters to access Unifi Cloud |
| options.username | <code>string</code> | Cloud username |
| options.password | <code>string</code> | Cloud password |
| options.debug | <code>boolean</code> | Debug the module. Optional. Default false |
| options.deviceId | <code>string</code> | Default Device Id |
| options.gzip | <code>boolean</code> | If gzip is enabled for the cloud messages. Optional. default true |
| options.webrtc | <code>object</code> | Reference to WebRTC module for NodeJS. If non specified, wrtc is used. Tested with electron-webrtc |
| options.waiter | <code>object</code> | How many ms to wait before WebRTC API call. Necessary for electron-webrtc as too fast calls crash the communication (values > 1000ms must be set for electron-webrtc) |

**Example**  
```js
let CloudAPI = require('node-unifiapi/cloudapi');
let cloud = CloudAPI({ deviceId: 'aaaffaad0121212', username: 'clouduser', password: 'cloudpass'});
cloud.self()
    .then(() => cloud.devices())
    .then(data => { console.log('Devices', data); return cloud.api.stat_sessions(); })
    .then(data => console.log('Sessions', data))
    .catch(err => console.log('Error', err))
```

* [CloudAPI(options)](#CloudAPI) ⇒
    * [.debugging(enabled)](#CloudAPI+debugging) ⇒ <code>undefined</code>
    * [.login(username, password)](#CloudAPI+login) ⇒ <code>Promise</code>
    * [.logout()](#CloudAPI+logout) ⇒ <code>Promise</code>
    * [.self()](#CloudAPI+self) ⇒ <code>Promise</code>
    * [.devices()](#CloudAPI+devices) ⇒ <code>Promise</code>
    * [.delete_device(device_id)](#CloudAPI+delete_device) ⇒ <code>Promise</code>

<a name="CloudAPI+debugging"></a>

### cloudAPI.debugging(enabled) ⇒ <code>undefined</code>
Enable or disable debugging

**Kind**: instance method of [<code>CloudAPI</code>](#CloudAPI)  

| Param | Type | Description |
| --- | --- | --- |
| enabled | <code>boolean</code> | Enable or Disable debugging |

<a name="CloudAPI+login"></a>

### cloudAPI.login(username, password) ⇒ <code>Promise</code>
Explicit login. Optional call as implicit login is always in place

**Kind**: instance method of [<code>CloudAPI</code>](#CloudAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| username | <code>string</code> | username if different from default. |
| password | <code>string</code> | password if different from default. |

**Example**  
```js
cloud.login()
    .then(done => console.log('Success', done))
    .catch(err => console.log('Error', err))
```
<a name="CloudAPI+logout"></a>

### cloudAPI.logout() ⇒ <code>Promise</code>
Explicit logout

**Kind**: instance method of [<code>CloudAPI</code>](#CloudAPI)  
**Returns**: <code>Promise</code> - Promise  
**Example**  
```js
cloud.logout()
    .then(done => console.log('Success', done))
    .catch(err => console.log('Error', err))
```
<a name="CloudAPI+self"></a>

### cloudAPI.self() ⇒ <code>Promise</code>
Check information about self

**Kind**: instance method of [<code>CloudAPI</code>](#CloudAPI)  
**Returns**: <code>Promise</code> - Promise  
**Example**  
```js
cloud.self()
    .then(done => console.log('Success', done))
    .catch(err => console.log('Error', err))
```
<a name="CloudAPI+devices"></a>

### cloudAPI.devices() ⇒ <code>Promise</code>
List registered devices / controllers

**Kind**: instance method of [<code>CloudAPI</code>](#CloudAPI)  
**Returns**: <code>Promise</code> - Promise  
**Example**  
```js
cloud.devices()
    .then(done => console.log('Success', done))
    .catch(err => console.log('Error', err))
```
<a name="CloudAPI+delete_device"></a>

### cloudAPI.delete_device(device_id) ⇒ <code>Promise</code>
Forget device/controller

**Kind**: instance method of [<code>CloudAPI</code>](#CloudAPI)  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| device_id | <code>string</code> | ID of the device |

**Example**  
```js
cloud.delete_device('aa8181092821922221a')
    .then(done => console.log('Success', done))
    .catch(err => console.log('Error', err))
```
