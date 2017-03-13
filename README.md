# node-unifiapi
UniFi API ported to Node.JS

This library is a rewrite of the PHP based UniFi-API-Browser rewritten in JavaScript for Node-JS.

It is mimicking the UniFi-API-Browser API calls (the same commands the same effects) for Ubiquiti Unifi Controller versions 4 and 5.

## Major features

* Implements the major (if not all) calls to the REST API of the Ubiquiti for Unifi Controller
* Supports WebRTC (over the Ubiquiti Unifi Cloud) protocol. If you have your devices registerred in the Unifi Cloud you can access them and execute the same REST API calls over WebRTC
* Supports SSH access to the devices that support it (mostly UAP) over WebRTC

## Warning
Quite unstable mostly due to the instability of the WebRTC implementation in Node.JS.
Also highly uncompleted. Any help welcomed!

## Installation
To install run:

    npm install node-unifiapi --save

The installation depends on the Node's wrtc module. Therefore the instalation requirements are the same as for the [node-webrtc](https://github.com/js-platform/node-webrtc). Please consult with the installation requirements of this module in order to be able to install node-unifiapi.

### XOpenDisplay Error
A frequent error caused by node-webrtc module is the one defined in issue [#281](https://github.com/js-platform/node-webrtc/issues/281)

    node: symbol lookup error: [local-path]/build/wrtc/v0.0.61/Release/node-v47-linux-x64/wrtc.node: undefined symbol: XOpenDisplay

It happens mostly on Linux, almost exquisively if the Linux have X11 subsystem, although it is not caused directly by it (but a bad linking).
The easiest method to avoid it is to use non desktop (non X11 based) Linux distribution, like Ubuntu Server. We all hope that in version 0.0.62 of the node-webrtc module this issue will be fixed.

## Usage

All the API is based on Promises

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

# API

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
    * [.login(username, password)](#UnifiAPI+login) ⇒ <code>Promise</code>
    * [.logout()](#UnifiAPI+logout)
    * [.authorize_guest(mac, minutes, up, down, mbytes, apmac, site)](#UnifiAPI+authorize_guest) ⇒ <code>Promise</code>
    * [.unauthorize_guest(mac, site)](#UnifiAPI+unauthorize_guest) ⇒ <code>Promise</code>
    * [.kick_sta(mac, site)](#UnifiAPI+kick_sta) ⇒ <code>Promise</code>
    * [.terminate_guest(id, site)](#UnifiAPI+terminate_guest) ⇒ <code>Promise</code>

<a name="UnifiAPI+login"></a>

### unifiAPI.login(username, password) ⇒ <code>Promise</code>
Explicit login to the controller. It is not necessary, as every other method calls implicid login (with the default username and password) before execution

**Kind**: instance method of <code>[UnifiAPI](#UnifiAPI)</code>  
**Returns**: <code>Promise</code> - success or failure  

| Param | Type | Description |
| --- | --- | --- |
| username | <code>string</code> | The username |
| password | <code>string</code> | The password |

**Example**  
```js
unifi.login(username, password)
    .then((data) => console.log('success', data))
    .catch((err) => console.log('Error', err))
```
<a name="UnifiAPI+logout"></a>

### unifiAPI.logout()
Logout of the controller

**Kind**: instance method of <code>[UnifiAPI](#UnifiAPI)</code>  
**Example**  
```js
unifi.logout()
    .then(() => console.log('Success'))
    .catch((err) => console.log('Error', err))
```
<a name="UnifiAPI+authorize_guest"></a>

### unifiAPI.authorize_guest(mac, minutes, up, down, mbytes, apmac, site) ⇒ <code>Promise</code>
Authorize guest by a MAC address

**Kind**: instance method of <code>[UnifiAPI](#UnifiAPI)</code>  
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
    .then((data) => console.log('Successful authorization'))
    .catch((err) => console.log('Error', err))
```
<a name="UnifiAPI+unauthorize_guest"></a>

### unifiAPI.unauthorize_guest(mac, site) ⇒ <code>Promise</code>
De-authorize guest by a MAC address

**Kind**: instance method of <code>[UnifiAPI](#UnifiAPI)</code>  
**Returns**: <code>Promise</code> - Promise  

| Param | Type | Description |
| --- | --- | --- |
| mac | <code>string</code> | the mac address |
| site | <code>site</code> | Ubiquiti site, if different from default - optional |

**Example**  
```js
unifi.unauthorize_guest('00:01:02:03:aa:bb')
    .then((done) => console.log('Success', done))
    .catch((err) => console.log('Error', err))
```
<a name="UnifiAPI+kick_sta"></a>

### unifiAPI.kick_sta(mac, site) ⇒ <code>Promise</code>
Kick a client (station) of the network. This will disconnect a wireless user if it is connected

**Kind**: instance method of <code>[UnifiAPI](#UnifiAPI)</code>  
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

**Kind**: instance method of <code>[UnifiAPI](#UnifiAPI)</code>  
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
