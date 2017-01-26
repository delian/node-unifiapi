let debug = require('debug')('UnifiAPI');
let merge = require('merge');
let UnifiRequest = require('./lib/unifi-request');

let defaultOptions = {
    'username': 'unifi',
    'password': 'unifi',
    'baseUrl': 'https://127.0.0.1:8443',
    'debug': false,
    'debugNet': false,
    'gzip': true,
    'site': 'default'
};

function UnifiAPI(options) {
    if (!(this instanceof UnifiAPI)) return new UnifiAPI(options);
    merge(this, defaultOptions, options);
    if (this.debug) debug.enabled = true;
    if (typeof this.net === 'undefined') {
        this.net = new UnifiRequest(merge(true, defaultOptions, options));
    }
    debug('Initialize with options %o', options);
}

UnifiAPI.prototype.netsite = function(url = '', jsonParams = undefined, headers = {}, method = 'POST', site = undefined) {
    site = site || this.site;
    return this.net.req('/api/s/' + site + url, jsonParams, headers, method);
};

UnifiAPI.prototype.authorize_guest = function(mac = '', minutes = 60, up = undefined, down = undefined, mbytes = undefined, apmac = undefined, site = undefined) {
    return this.netsite('/cmd/stamgr', {
        cmd: 'authorize_guest',
        mac: mac.toLowerCase(),
        minutes: minutes,
        up: up,
        down: down,
        bytes: mbytes,
        ap_mac: apmac.toLowerCase()
    }, site = site);
};

UnifiAPI.prototype.unauthorize_guest = function(mac = '', site = undefined) {
    return this.netsite('/cmd/stamgr', {
        cmd: 'uauthorize_guest',
        mac: mac.toLowerCase()
    }, site = site);
};

UnifiAPI.prototype.kick_sta = function(mac = '', site = undefined) {
    return this.netsite('/cmd/stamgr', {
        cmd: 'kick_sta',
        mac: mac.toLowerCase()
    }, site = site);
};

UnifiAPI.prototype.block_sta = function(mac = '', site = undefined) {
    return this.netsite('/cmd/stamgr', {
        cmd: 'block-sta',
        mac: mac.toLowerCase()
    }, site = site);
};

UnifiAPI.prototype.unblock_sta = function(mac = '', site = undefined) {
    return this.netsite('/cmd/stamgr', {
        cmd: 'unblock-sta',
        mac: mac.toLowerCase()
    }, site = site);
};

UnifiAPI.prototype.set_sta_note = function(user = '', note = '', site = undefined) {
    return this.netsite('/upd/user/' + user, {
        note: note,
        noted: note ? true : false
    }, site = site);
};

UnifiAPI.prototype.set_sta_name = function(user = '', name = '', site = undefined) {
    return this.netsite('/upd/user/' + user, {
        name: name
    }, site = site);
};

UnifiAPI.prototype.stat_sessions = function(start = undefined, end = undefined, site = undefined) {
    return this.netsite('/stat/sessions', {
        type: 'all',
        start: start || (new Date()).getTime() / 1000 - 7 * 24 * 3600 * 1000,
        end: end || (new Date()).getTime()
    }, site = site);
};

UnifiAPI.prototype.stat_daily_site = function(start = undefined, end = undefined, site = undefined) {
    return this.netsite('/stat/report/daily.site', {
        start: start ? start : (new Date()).getTime() - 52 * 7 * 24 * 3600 * 1000,
        end: end ? end : (new Date()).getTime(),
        attrs: [
            'bytes', 'wan-tx_bytes', 'wan-rx_bytes', 'wlan_bytes',
            'num_sta', 'lan-num_sta', 'wlan-num_sta', 'time'
        ]
    }, site = site);
};

UnifiAPI.prototype.stat_hourly_site = function(start = undefined, end = undefined, site = undefined) {
    return this.netsite('/stat/report/hourly.site', {
        start: start ? start : (new Date()).getTime() - 7 * 24 * 3600 * 1000,
        end: end ? end : (new Date()).getTime(),
        attrs: [
            'bytes', 'wan-tx_bytes', 'wan-rx_bytes', 'wlan_bytes', 'num_sta', 'lan-num_sta', 'wlan-num_sta',
            'time'
        ]
    }, site = site);
};

UnifiAPI.prototype.stat_hourly_ap = function(start = undefined, end = undefined, site = undefined) {
    return this.netsite('/stat/report/hourly.ap', {
        start: start ? start : (new Date()).getTime() - 7 * 24 * 3600 * 1000,
        end: end ? end : (new Date()).getTime(),
        attrs: [
            'bytes', 'num_sta', 'time'
        ]
    }, site = site);
};

UnifiAPI.prototype.stat_sta_sessions_latest = function(mac = '', limit = 5, sort = '-asoc-time', site = undefined) {
    return this.netsite('/stat/sessions', {
        mac: mac.toLowerCase(),
        '_limit': limit,
        '_sort': sort
    }, site = site);
};

UnifiAPI.prototype.stat_auths = function(start = undefined, end = undefined, site = undefined) {
    return this.netsite('/stat/authorization', {
        end: end || (new Date()).getTime(),
        start: start || (new Date()).getTime() - 7 * 24 * 3600000
    }, site = site);
};

UnifiAPI.prototype.stat_allusers = function(historyhours = 8670, site = undefined) {
    return this.netsite('/stat/alluser', {
        type: 'all',
        conn: 'all',
        within: historyhours
    }, site = site);
};

UnifiAPI.prototype.list_guests = function(historyhours = 8670, site = undefined) {
    return this.netsite('/stat/guest', {
        within: historyhours
    }, site = site);
};

UnifiAPI.prototype.list_clients = function(mac = '', site = undefined) {
    return this.netsite('/stat/sta/' + mac, site = site);
};

UnifiAPI.prototype.stat_client = function(mac = '', site = undefined) {
    return this.netsite('/stat/user/' + mac, site = site);
};

UnifiAPI.prototype.list_usergroup = function(site = undefined) {
    return this.netsite('/list/usergroup', site = site);
};

UnifiAPI.prototype.set_usergroup = function(userid = '', groupid = '', site = undefined) {
    return this.netsite('/upd/user/' + userid, {
        usergroup_id: groupid
    }, site = site);
};

UnifiAPI.prototype.list_health = function(site = undefined) {
    return this.netsite('/stat/health', site = site);
};

UnifiAPI.prototype.list_dashboard = function(site = undefined) {
    return this.netsite('/stat/dashboard', site = site);
};

UnifiAPI.prototype.list_users = function(site = undefined) {
    return this.netsite('/list/user', site = site);
};

UnifiAPI.prototype.list_aps = function(site = undefined) { // TODO: not working with mac different than none
    return this.netsite('/stat/device/' + mac, site = site);
};

UnifiAPI.prototype.list_rogueaps = function(within = 24, site = undefined) {
    return this.netsite('/stat/rogueap', {
        within: within
    }, site = site);
};

UnifiAPI.prototype.list_sites = function() {
    return this.net.req('/api/self/sites');
};

UnifiAPI.prototype.stat_sites = function() {
    return this.net.req('/api/stat/sites');
};

UnifiAPI.prototype.add_site = function(name = 'default', description = '', site = undefined) {
    return this.netsite('/cmd/sitemgr', {
        cmd: 'add-site',
        name: name,
        desc: description
    }, site = site);
};

UnifiAPI.prototype.remove_site = function(name = 'none', site = undefined) { // TODO: test it
    return this.netsite('/cmd/sitemgr', {
        cmd: 'remove-site',
        name: name
    }, site = site);
};

UnifiAPI.prototype.list_wlan_groups = function(site = undefined) {
    return this.netsite('/list/wlangroup', site = site);
};

UnifiAPI.prototype.stat_sysinfo = function(site = undefined) {
    return this.netsite('/stat/sysinfo', site = site);
};

UnifiAPI.prototype.list_self = function(site = undefined) { // TODO: test
    return this.netsite('/self', site = site);
};

UnifiAPI.prototype.list_networkconf = function(site = undefined) {
    return this.netsite('/list/networkconf', site = site);
};

UnifiAPI.prototype.stat_voucher = function(createtime = undefined, site = undefined) {
    return this.netsite('/stat/voucher', {
        create_time: createtime
    }, site = site);
};

UnifiAPI.prototype.stat_payment = function(within = undefined, site = undefined) {
    return this.netsite('/stat/payment', { // TODO: test it, is it payment or voucher
        within: within
    }, site = site);
};

UnifiAPI.prototype.create_hotspot = function(name = '', password = '', note = '', site = undefined) {
    return this.netsite('/stat/voucher', {
        name: name,
        note: note,
        x_password: password
    }, site = site);
};
/*
    def list_hotspot(self):
        """
        List hotspots
        :return:
        """
        content = self.sitecmdjson('/list/hotspotop')
        return self.response(content, inspect.stack()[0].function, 'List hotspot')

    def create_voucher(self, minutes, count=1, quota=0, note=None, up=None, down=None, mbytes=None):
        """
        Adding some vouchers
        :param minutes:
        :param count:
        :param quota:
        :param note:
        :param up:
        :param down:
        :param mbytes:
        :return:
        """
        content = self.sitecmdjson('/cmd/hotspot', {
            'note': note,
            'up': up,
            'down': down,
            'bytes': mbytes,
            'cmd': 'create-voucher',
            'expire': minutes,
            'n': count,
            'quota': quota
        })
        return self.response(content, inspect.stack()[0].function, 'Create voucher')

    def revoke_voucher(self, voucher_id):
        """
        Revoking a voucher
        :param voucher_id:
        :return:
        """
        content = self.sitecmdjson('/cmd/hotspot', {
            'cmd': 'delete-voucher',
            '_id': voucher_id
        })
        return self.response(content, inspect.stack()[0].function, 'Revoke Voucher')

    def list_portforwarding(self):
        """
        List portforwarding
        :return:
        """
        content = self.sitecmdjson('/list/portforward')
        return self.response(content, inspect.stack()[0].function, 'List Port Forwarding')

    def list_dynamicdns(self):
        """
        List Dynamic DNS
        :return:
        """
        content = self.sitecmdjson('/list/dynamicdns')
        return self.response(content, inspect.stack()[0].function, 'List Dynamic DNS')

    def list_portconf(self):
        """
        List Port Conf
        :return:
        """
        content = self.sitecmdjson('/list/portconf')
        return self.response(content, inspect.stack()[0].function, 'List Port Config')

    def list_extension(self):
        """
        List Extension
        :return:
        """
        content = self.sitecmdjson('/list/extension')
        return self.response(content, inspect.stack()[0].function, 'List Extension')

    def list_settings(self):
        """
        List Settings
        :return:
        """
        # TODO: Set settings to be implemented
        content = self.sitecmdjson('/get/setting')
        return self.response(content, inspect.stack()[0].function, 'List settings')

    def restart_ap(self, mac):
        """
        Restart AP
        :param mac:
        :return:
        """
        content = self.sitecmdjson('/cmd/devmgr', {
            'cmd': 'restart',
            'mac': mac.lower()
        })
        return self.response(content, inspect.stack()[0].function, 'Restart AP')

    def disable_ap(self, ap_id, disable=True):
        """
        Disable AP
        :param ap_id: id of the AP
        :param disable:
        :return:
        """
        # TODO: Test it
        content = self.sitecmdjson('/rest/device/' + urllib.parse.quote(ap_id), {
            'disabled': disable
        })
        return self.response(content, inspect.stack()[0].function, 'Disable AP')

    def enable_ap(self, ap_id, disable=False):
        return self.disable_ap(ap_id, disable)

    def set_locate_ap(self, mac):
        """
        Locate AP (flashing)
        :param mac:
        :return:
        """
        content = self.sitecmdjson('/cmd/devmgr', {
            'mac': mac.lower(),
            'cmd': 'set-locate'
        })
        return self.response(content, inspect.stack()[0].function, 'Locate AP')

    def unset_locate_ap(self, mac):
        """
        Locate AP (disable flashing)
        :param mac:
        :return:
        """
        content = self.sitecmdjson('/cmd/devmgr', {
            'mac': mac.lower(),
            'cmd': 'unset-locate'
        })
        return self.response(content, inspect.stack()[0].function, 'Locate AP')

    def site_ledson(self):
        """
        All AP Leds on
        :return:
        """
        content = self.sitecmdjson('/set/setting/mgmt', {
            'led_enabled': True
        })
        return self.response(content, inspect.stack()[0].function, 'Site Leds on')

    def site_ledsoff(self):
        """
        All AP Leds off
        :return:
        """
        content = self.sitecmdjson('/set/setting/mgmt', {
            'led_enabled': False
        })
        return self.response(content, inspect.stack()[0].function, 'Site Leds off')

    def set_ap_radiosettings(self, ap_id, radio='ng', channel=1, ht='20', tx_power_mode=0, tx_power=0):
        """
        Set AP settings
        :param ap_id:
        :param radio:
        :param channel:
        :param ht:
        :param tx_power_mode:
        :param tx_power:
        :return:
        """
        content = self.sitecmdjson('/upd/device/' + urllib.parse.quote(ap_id), {
            'radio': radio,
            'channel': channel,
            'ht': ht,
            'tx_power_mode': tx_power_mode,
            'tx_power': tx_power
        })
        return self.response(content, inspect.stack()[0].function, 'AP Radio Settings')

    def set_guestlogin_settings(self, portal_enabled, portal_customized,
                                redirect_enabled, redirect_url, x_password, expire_number, expire_unit, site_id):
        """
        Set settings for guest login
        :param portal_enabled:
        :param portal_customized:
        :param redirect_enabled:
        :param redirect_url:
        :param x_password:
        :param expire_number:
        :param expire_unit:
        :param site_id:
        :return:
        """
        content = self.sitecmdjson('/set/setting/guest_access', {
            'portal_enabled': portal_enabled,
            'portal_customized': portal_customized,
            'redirect_enabled': redirect_enabled,
            'redirect_url': redirect_url,
            'x_password': x_password,
            'expire_number': expire_number,
            'expire_unit': expire_unit,
            'site_id': site_id
        })
        # TODO: Test it
        return self.response(content, inspect.stack()[0].function, 'Guest Login Settings')

    def rename_ap(self, ap_id, ap_name):
        """
        Rename one AP to another name
        :param ap_id:
        :param ap_name:
        :return:
        """
        # TODO: test
        content = self.sitecmdjson('/upd/device/' + str(ap_id), {
            'name': ap_name
        })
        return self.response(content, inspect.stack()[0].function, 'Rename AP')

    def set_wlansettings(self, wlan_id, x_password, name=None):
        """
        Set wlan settings
        :param wlan_id:
        :param x_password:
        :param name:
        :return:
        """
        # TODO: test
        content = self.sitecmdjson('/upd/wlanconf/' + str(wlan_id), {
            'x_passphrase': x_password,
            'name': name
        })
        return self.response(content, inspect.stack()[0].function, 'Set WLAN Settings')

    def list_events(self):
        """
        List the events
        :return:
        """
        content = self.sitecmdjson('/stat/event')
        return self.response(content, inspect.stack()[0].function, 'List Events')

    def list_wlanconf(self):
        """
        List wlan config
        :return:
        """
        content = self.sitecmdjson('/list/wlanconf')
        return self.response(content, inspect.stack()[0].function, 'List WLAN Conf')

    def get_wlanconf(self):
        """
        get wlan config
        :return:
        """
        content = self.sitecmdjson('/rest/wlanconf')
        return self.response(content, inspect.stack()[0].function, 'Get WLAN Conf')


    def list_alarms(self):
        """
        List the alarms
        :return:
        """
        content = self.sitecmdjson('/list/alarm')
        return self.response(content, inspect.stack()[0].function, 'List Alarms')

    def set_ap_led(self, ap_id, led_override="default"):
        """
        Override led per device
        :param led_override: options on, off, default
        :param ap_id:
        :return:
        """
        content = self.sitecmdjson('/rest/device/'+str(ap_id), {
            'led_override': led_override
        })
        return self.response(content, inspect.stack()[0].function, 'AP Led')

    def set_ap_name(self, ap_id, name=None):
        """
        Override name per device
        :param name:
        :param ap_id:
        :return:
        """
        content = self.sitecmdjson('/rest/device/'+str(ap_id), {
            'name': name
        }, method='PUT')
        return self.response(content, inspect.stack()[0].function, 'Set AP Name')

    def set_ap_wireless(self, ap_id, radio="ng", channel="auto", ht=20, min_rssi=-94, min_rssi_enabled=False,
                        antenna_gain=6, tx_power_mode="auto"):
        """
        Set parameters to a wireless AP
        :param ap_id:
        :param radio:
        :param channel:
        :param min_rssi:
        :param ht:
        :param min_rssi_enabled:
        :param antenna_gain:
        :param tx_power_mode:
        :return:
        """
        content = self.sitecmdjson('/rest/device/'+str(ap_id), {
            "radio_table": [
                {
                    "antenna_gain": antenna_gain,
                    "channel": channel,
                    "radio": radio,
                    "ht": ht,
                    "min_rssi": min_rssi,
                    "min_rssi_enabled": min_rssi_enabled,
                    "tx_power_mode": tx_power_mode
                }
            ]
        }, method='PUT')
        return self.response(content, inspect.stack()[0].function, 'Set AP Wireless Settings')

    def status(self):
        """
        Retrieve status
        :return:
        """
        content = self.reqjson('/status')
        return self.response(content, inspect.stack()[0].function, 'Status')

    def set_ap_network(self, ap_id, type="dhcp", ip="192.168.1.6", netmask="255.255.255.0", gateway="192.168.1.1", dns1="8.8.8.8", dns2="8.8.4.4"):
        """
        Configure network
        :param ap_id:
        :param type:
        :param ip:
        :param netmask:
        :param gateway:
        :param dns1:
        :param dns2:
        :return:
        """
        content = self.sitecmdjson('/rest/device/' + str(ap_id), {
            "config_network": [
                {
                    "type": type,
                    "ip": ip,
                    "netmask": netmask,
                    "gateway": gateway,
                    "dns1": dns1,
                    "dns2": dns2
                }
            ]
        }, method='PUT')
        return self.response(content, inspect.stack()[0].function, 'AP Network Config')

    def request_spectrumscan(self, mac):
        """
        Request spectrum scan
        :param mac:
        :return:
        """
        content = self.sitecmdjson('/cmd/devmgr', {
            "cmd": "spectrum-scan",
            "mac": mac
        })
        return self.response(content, inspect.stack()[0].function, 'Request Spectrum Scan')

    def set_site_descr(self, description):
        """
        Set site description
        :param description:
        :return:
        """
        content = self.sitecmdjson('/cmd/sitemgr', {
            "cmd": "update-site",
            "desc": description
        })
        return self.response(content, inspect.stack()[0].function, 'Site Description')

    def set_site_settings(self, gen_id, site_id, advanced=True, alerts=True, auto_upgrade=True, key="mgmt",
                          led_enabled=True, x_ssh_username="ubnt", x_ssh_password="UBNT",
                          x_ssh_md5passwd = "$1$PiGDOzRF$GX49UVoQSqwaLgXu/Cuvb/"):
        """
        Site settings
        :param gen_id:
        :param site_id:
        :param advanced:
        :param alerts:
        :param auto_upgrade:
        :param key:
        :param led_enabled:
        :param x_ssh_username:
        :param x_ssh_password:
        :param x_ssh_md5passwd:
        :return:
        """
        content = self.sitecmdjson('/set/setting/mgmt/'+str(gen_id), {
            "_id": str(gen_id),
            "advanced_feature_enabled": advanced,
            "alert_enabled": alerts,
            "auto_upgrade": auto_upgrade,
            "key": key,
            "led_enabled": led_enabled,
            "site_id": site_id,
            "x_ssh_username": x_ssh_username,
            "x_ssh_password": x_ssh_password,
            "x_ssh_md5passwd": x_ssh_md5passwd
        })
        return self.response(content, inspect.stack()[0].function, 'Set Site Settings')

    def add_hotspot2(self, name, network_access_internet=True, network_type=2, venue_group=2, venue_type=0):
        """
        Add HotSpot 2.0, simple settings
        :param name:
        :param network_access_internet:
        :param network_type:
        :param venue_group:
        :param venue_type:
        :return:
        """
        content = self.sitecmdjson('/rest/hotspot2conf', {
            "name": name,
            "network_access_internet": network_access_internet,
            "network_type": network_type,
            "venue_group": venue_group,
            "venue_type": venue_type
        })
        return self.response(content, inspect.stack()[0].function, 'Add Hotspot 2.0')

    def list_hotspot2(self):
        """
        List the hotspot2.0 sites
        :return:
        """
        content = self.sitecmdjson('/rest/hotspot2conf')
        return self.response(content, inspect.stack()[0].function, 'List Hotspot 2.0 sites')

    def delete_hotspot2(self, hs_id):
        """
        Delete hotspot 2.0
        :param hs_id:
        :return:
        """
        content = self.sitecmdjson('/rest/hotspot2conf/'+str(hs_id), {}, method='DELETE')
        return self.response(content, inspect.stack()[0].function, 'Delete Hotspot 2.0 sites')

    def set_hotspot2(self, hs_id, name=None, network_access_internet=None, network_type=None, venue_group=None, venue_type=None):
        """
        Modify Hotspot 2.0
        :param hs_id:
        :param name:
        :param network_access_internet:
        :param network_type:
        :param venue_group:
        :param venue_type:
        :return:
        """
        content = self.sitecmdjson('/rest/hotspot2conf/'+str(hs_id), {
            "_id": hs_id,
            "name": name,
            "network_access_internet": network_access_internet,
            "network_type": network_type,
            "venue_group": venue_group,
            "venue_type": venue_type
        }, method="PUT")
        return self.response(content, inspect.stack()[0].function, 'Modify Hotspot 2.0 sites')

    def add_wlanconf(self,
                     name,
                     security = "open",
                     enabled = True,
                     dtim_mode = "default",
                     dtim_na = 1,
                     dtim_ng = 1,
                     mac_filter_enabled = False,
                     mac_filter_list = [],
                     mac_filter_policy = "deny",
                     radius_port_1 = 1812,
                     schedule = [],
                     schedule_enabled = False,
                     usergroup_id = None,
                     wlangroup_id = None,
                     usergroup = "Default",
                     wlangroup = "Default",
                     wep_idx = 1,
                     wpa_enc = "ccmp",
                     wpa_mode = "wpa2",
                     ratectrl_na_6 = "basic",
                     ratectrl_na_9 = "supported",
                     ratectrl_na_12 = "basic",
                     ratectrl_na_18 = "supported",
                     ratectrl_na_24 = "basic",
                     ratectrl_na_36 = "supported",
                     ratectrl_na_48 = "supported",
                     ratectrl_na_54 = "supported",
                     ratectrl_na_mode = "default",
                     ratectrl_ng_6 = "basic",
                     ratectrl_ng_9 = "supported",
                     ratectrl_ng_12 = "basic",
                     ratectrl_ng_18 = "supported",
                     ratectrl_ng_24 = "basic",
                     ratectrl_ng_36 = "supported",
                     ratectrl_ng_48 = "supported",
                     ratectrl_ng_54 = "supported",
                     ratectrl_ng_cck_1 = "disabled",
                     ratectrl_ng_cck_2 = "disabled",
                     ratectrl_ng_cck_5_5 = "disabled",
                     ratectrl_ng_cck_11 = "disabled",
                     ratectrl_ng_mode = "default"
                     ):
        if not wlangroup_id:
            wg = self.list_wlan_groups()

        content = self.sitecmdjson('/rest/wlanconf', {
            "name": name,
            "security": security,
            "dtim_mode": dtim_mode,
            "dtim_na": dtim_na,
            "dtim_ng": dtim_ng,
            "enabled": enabled,
            "mac_filter_enabled": mac_filter_enabled,
            "mac_filter_list": mac_filter_list,
            "mac_filter_policy": mac_filter_policy,
            "radius_port_1": radius_port_1,
            "schedule": schedule,
            "schedule_enabled": schedule_enabled,
            "usergroup_id": usergroup_id,
            "wlangroup_id": wlangroup_id,
            "wep_idx": wep_idx,
            "wpa_enc": wpa_enc,
            "wpa_mode": wpa_mode,
            "ratectrl_na_6": ratectrl_na_6,
            "ratectrl_na_9": ratectrl_na_9,
            "ratectrl_na_12": ratectrl_na_12,
            "ratectrl_na_18": ratectrl_na_18,
            "ratectrl_na_24": ratectrl_na_24,
            "ratectrl_na_36": ratectrl_na_36,
            "ratectrl_na_48": ratectrl_na_48,
            "ratectrl_na_54": ratectrl_na_54,
            "ratectrl_na_mode": ratectrl_na_mode,
            "ratectrl_ng_6": ratectrl_ng_6,
            "ratectrl_ng_9": ratectrl_ng_9,
            "ratectrl_ng_12": ratectrl_ng_12,
            "ratectrl_ng_18": ratectrl_ng_18,
            "ratectrl_ng_24": ratectrl_ng_24,
            "ratectrl_ng_36": ratectrl_ng_36,
            "ratectrl_ng_48": ratectrl_ng_48,
            "ratectrl_ng_54": ratectrl_ng_54,
            "ratectrl_ng_cck_1": ratectrl_ng_cck_1,
            "ratectrl_ng_cck_2": ratectrl_ng_cck_2,
            "ratectrl_ng_cck_5_5": ratectrl_ng_cck_5_5,
            "ratectrl_ng_cck_11": ratectrl_ng_cck_11,
            "ratectrl_ng_mode": ratectrl_ng_mode
        })
        return self.response(content, inspect.stack()[0].function, 'Modify WlanConf')

    def sdn_unregister(self):
        """
        Disable and remove cloud access
        :return:
        """
        content = self.sitecmdjson("/cmd/sdn", {
            "cmd": "unregister"
        })
        return self.response(content, inspect.stack()[0].function, 'Unregister SDN')

    def sdn_register(self, username, password):
        """
        Register into SDN
        :param username:
        :param password:
        :return:
        """
        content = self.sitecmdjson("/cmd/sdn", {
            "cmd": "register",
            "ubic_username": username,
            "ubic_password": password
        })
        return self.response(content, inspect.stack()[0].function, 'Register SDN')

    def sdn_stat(self):
        """
        Get the SDN status
        :return:
        """
        content = self.sitecmdjson("/stat/sdn")
        return self.response(content, inspect.stack()[0].function, 'Status SDN')

    def sdn_onoff(self, enabled=True, site_id = None):
        """
        Change the status
        :param enabled:
        :param site_id:
        :return:
        """
        content = self.sitecmdjson("/set/setting/super_sdn", {
            "key": "super_sdn",
            "enabled": enabled,
            "site_id": site_id
        })
 */
module.exports = UnifiAPI;