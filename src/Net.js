/* globals Wsh: false */

(function () {
  if (Wsh && Wsh.Net) return;

  /**
   * This module provides useful WSH (Windows Script Host) functions that handle network on Windows.
   *
   * @namespace Net
   * @memberof Wsh
   * @requires {@link https://github.com/tuckn/WshChildProcess|tuckn/WshChildProcess}
   */
  Wsh.Net = {};

  // Shorthands
  var util = Wsh.Util;
  var sh = Wsh.Shell;
  var path = Wsh.Path;
  var os = Wsh.OS;
  var fs = Wsh.FileSystem;
  var child_process = Wsh.ChildProcess;

  var insp = util.inspect;
  var obtain = util.obtainPropVal;
  var isSameStr = util.isSameMeaning;
  var hasIn = util.hasIn;
  var isSolidArray = util.isSolidArray;
  var isSolidString = util.isSolidString;
  var srrd = os.surroundCmdArg;
  var NETSH_EXE = os.exefiles.netsh;
  var exec = child_process.exec;
  var execSync = child_process.execSync;

  var net = Wsh.Net;

  /** @constant {string} */
  var MODULE_TITLE = 'WshNet/Net.js';

  var throwErrNonStr = function (functionName, typeErrVal) {
    util.throwTypeError('string', MODULE_TITLE, functionName, typeErrVal);
  };

  var throwErrNonExist = function (functionName, typeErrVal) {
    fs.throwTypeErrorNonExisting(MODULE_TITLE, functionName, typeErrVal);
  };

  // Create

  // Read

  // net.respondsHost {{{
  /**
   * Checks if the host responds to ping.
   *
   * @example
   * var net = Wsh.Net; // Shorthand
   *
   * net.respondsHost('127.0.0.1'); // Returns: true
   * @function respondsHost
   * @memberof Wsh.Net
   * @param {string} [host] - The host address to check.
   * @returns {boolean}
   */
  net.respondsHost = function (host) {
    var FN = 'net.respondsHost';
    if (!isSolidString(host)) throwErrNonStr(FN, host);

    var retObj = execSync(os.exefiles.ping + ' ' + host);

    /**
     * Windows7_JP  127.0.0.1 からの応答: バイト数 =32 時間 =12ms TTL=123
     * Windows7_EN  Reply from 127.0.0.1: bytes=32 time=12ms TTL=123
     * Windows10_JP 127.0.0.1 からの応答: バイト数 =32 時間 <11ms TTL=118
     * Windows10_JP ::1 からの応答: <11ms
     */
    if (/(time|時間 )[=<]\d+ms/.test(retObj.stdout)) return true;
    return false;
  }; // }}}

  // net.showIpConfigAll {{{
  /**
   * Shows the result of `ipconfig /all` on a window.
   *
   * @example
   * var net = Wsh.Net; // Shorthand
   *
   * net.showIpConfigAll(); // Displays a DOS window
   * @function showIpConfigAll
   * @memberof Wsh.Net
   * @param {object} [options] - Optional parameters.
   * @param {(number|string)} [options.winStyle='activeDef'] - See {@link https://docs.tuckn.net/WshUtil/Wsh.Constants.windowStyles.html|Wsh.Constants.windowStyles}.
   * @returns {void}
   */
  net.showIpConfigAll = function (options) {
    var winStyle = obtain(options, 'winStyle', 'activeDef');
    var command = 'ipconfig /all';

    exec(command, { closes: false, winStyle: winStyle });
  }; // }}}

  // net.getAdaptersPropsSWbemObjs {{{
  /**
   * Gets an Array of Enumerated-SWbemObjectSet of network adapteres on the Windows. See {@link https://docs.microsoft.com/en-us/windows/win32/cimwin32prov/win32-networkadapter|Win32_NetworkAdapter class}.
   *
   * @example
   * var net = Wsh.Net; // Shorthand
   *
   * var adapters = net.getAdaptersPropsSWbemObjs();
   * // Returns: An Array of {@link https://docs.microsoft.com/en-us/windows/win32/cimwin32prov/win32-networkadapter|Win32_NetworkAdapter class}.
   * @function getAdaptersPropsSWbemObjs
   * @memberof Wsh.Net
   * @param {string} [macAddress] - If empty, gets all adapters.
   * @param {object} [options] - Optional parameters.
   * @param {boolean} [options.excludesVirtual=true]
   * @param {boolean} [options.excludesWireless=false]
   * @param {boolean} [options.isConnecting=false]
   * @returns {sWbemObjectSet[]} - Enumerated SWbemObjectSets. See {@link https://docs.microsoft.com/en-us/windows/win32/cimwin32prov/win32-networkadapter|Win32_NetworkAdapter class}.
   */
  net.getAdaptersPropsSWbemObjs = function (macAddress, options) {
    var query = 'SELECT * FROM Win32_NetworkAdapter'
      + ' WHERE PhysicalAdapter = True';

    if (isSolidString(macAddress) && macAddress !== '*') {
      query += ' AND MACAddress = "' + macAddress + '"';
    } else {
      if (!isSolidString(macAddress)) query += ' AND NOT MACAddress = null';

      var excludesVirtual = obtain(options, 'excludesVirtual', true);
      if (excludesVirtual) query += ' AND NOT Description LIKE "%virtual%"';

      var excludesWireless = obtain(options, 'excludesWireless', false);
      if (excludesWireless) query += ' AND NOT Description LIKE "%wireless%"';
    }

    var sWbemObjSets = os.WMI.execQuery(query);

    var isConnecting = obtain(options, 'isConnecting', null);
    if (isConnecting === null) return sWbemObjSets;

    return sWbemObjSets.filter(function (sWbemObjSet) {
      try {
        return (0 <= sWbemObjSet.NetConnectionStatus
            && sWbemObjSet.NetConnectionStatus <= 3);
      } catch (e) {
        return false;
      }
    });
  }; // }}}

  // net.getAdaptersPropsObjs {{{
  /**
   * Gets an Array of objects of network adapteres on the Windows.
   *
   * @example
   * var net = Wsh.Net; // Shorthand
   *
   * var adapters = net.getAdaptersPropsObjs();
   * console.dir(adapters);
   * // Outputs: [
   * // {
   * //   AdapterType: "イーサネット 802.3",
   * //   AdapterTypeId: 0,
   * //   AutoSense: null,
   * //   Availability: 3,
   * //   Caption: "[00000001] Intel(R) Ethernet Connection (7) I999-V",
   * //   ConfigManagerErrorCode: 0,
   * //   ConfigManagerUserConfig: false,
   * //   CreationClassName: "Win32_NetworkAdapter",
   * //   Description: "Intel(R) Ethernet Connection (7) I999-V",
   * //   DeviceID: "1",
   * //   ErrorCleared: null,
   * //   ErrorDescription: null,
   * //   GUID: "{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}",
   * //   Index: 1,
   * //   InstallDate: null,
   * //   Installed: true,
   * //   InterfaceIndex: 11,
   * //   LastErrorCode: null,
   * //   MACAddress: "XX:XX:XX:XX:XX:XX",
   * //   Manufacturer: "Intel Corporation",
   * //   MaxNumberControlled: 0,
   * //   MaxSpeed: null,
   * //   Name: "Intel(R) Ethernet Connection (7) I999-V",
   * //   NetConnectionID: "イーサネット",
   * //   NetConnectionStatus: 2,
   * //   NetEnabled: true,
   * //   NetworkAddresses: null,
   * //   PermanentAddress: null,
   * //   PhysicalAdapter: true,
   * //   PNPDeviceID: "PCI\XXX_111X&XXX_1111&...",
   * //   PowerManagementCapabilities: null,
   * //   PowerManagementSupported: false,
   * //   ProductName: "Intel(R) Ethernet Connection (7) I999-V",
   * //   ServiceName: "xxxxxx64",
   * //   Speed: null,
   * //   Status: null,
   * //   StatusInfo: null,
   * //   SystemCreationClassName: "Win32_ComputerSystem",
   * //   SystemName: "MYPC123456"
   * //   TimeOfLastReset: "20161108082314.125599+540"
   * // }, {
   * //    ...
   * //    ..
   * // }]
   * @function getAdaptersPropsObjs
   * @memberof Wsh.Net
   * @param {string} [macAddress] - If empty, gets all adapters.
   * @param {object} [options] - Optional parameters.
   * @param {boolean} [options.excludesVirtual=true]
   * @param {boolean} [options.excludesWireless=false]
   * @param {boolean} [options.isConnecting=false]
   * @returns {object[]} - An Array of the network adapters properties objects.
   */
  net.getAdaptersPropsObjs = function (macAddress, options) {
    var sWbemObjSets = net.getAdaptersPropsSWbemObjs(macAddress, options);
    return os.WMI.toJsObjects(sWbemObjSets);
  }; // }}}

  // net.enablesDHCP {{{
  /**
   * Checks if the network adapter has DHCP enabled.
   *
   * @example
   * var net = Wsh.Net; // Shorthand
   *
   * net.enablesDHCP('XX:XX:XX:XX:XX:XX'); // Returns: true
   * @function enablesDHCP
   * @memberof Wsh.Net
   * @param {string} macAddress - The adapter MACAddress to check.
   * @param {object} [options] - See {@link Wsh.Net.getAdaptersPropsObjs}
   * @returns {boolean} - If DHCP enabling, returns true.
   */
  net.enablesDHCP = function (macAddress, options) {
    var FN = 'net.enablesDHCP';
    if (!isSolidString(macAddress)) throwErrNonStr(FN, macAddress);

    var adapters = net.getAdaptersPropsObjs(macAddress, options);
    var adapterObjs = os.WMI.toJsObjects(adapters);

    if (!isSolidArray(adapterObjs)) return false;

    var adapterGUID = adapterObjs[0].GUID;
    var regVal = sh.RegRead('HKEY_LOCAL_MACHINE\\SYSTEM'
        + '\\ControlSet001\\services\\Tcpip\\Parameters\\Interfaces'
        + '\\' + adapterGUID + '\\EnableDHCP');

    return regVal === 1;
  }; // }}}

  // net.getAdaptersConfsSWbemObjs {{{
  /**
   * Gets an Array of Enumerated-SWbemObjectSet of network adapter configurations on the Windows. See {@link https://msdn.microsoft.com/ja-jp/library/aa394217(v=vs.85).aspx|Win32 Network Adapter Configuration Properties}.
   *
   * @example
   * var net = Wsh.Net; // Shorthand
   *
   * var adapterConfs = net.getAdaptersConfsSWbemObjs();
   * // Returns: An Array of {@link https://msdn.microsoft.com/ja-jp/library/aa394217(v=vs.85).aspx|Win32 Network Adapter Configuration Properties}.
   * @function getAdaptersConfsSWbemObjs
   * @memberof Wsh.Net
   * @param {string} [macAddress] - If empty, gets all adapters.
   * @param {object} [options] - Optional parameters.
   * @param {boolean} [options.excludesVirtual=true]
   * @param {boolean} [options.excludesWireless=false]
   * @returns {sWbemObjectSet[]} - Enumerated SWbemObjectSets. See {@link https://msdn.microsoft.com/ja-jp/library/aa394217(v=vs.85).aspx|Win32 Network Adapter Configuration Properties}.
   */
  net.getAdaptersConfsSWbemObjs = function (macAddress, options) {
    // @note "RAS Async Adapter"はリモートデスクトップ接続用らしいので除外
    var query = 'SELECT * FROM Win32_NetworkAdapterConfiguration'
      + ' WHERE NOT Description LIKE "RAS Async Adapter"';
      // + ' Win32_NetworkAdapterConfiguration WHERE PhysicalAdapter = True';

    if (isSolidString(macAddress) && macAddress !== '*') {
      query += ' AND MACAddress = "' + macAddress + '"';
    } else {
      query += ' AND NOT MACAddress = null';
    }

    var excludesVirtual = obtain(options, 'excludesVirtual', true);
    if (excludesVirtual) query += ' AND NOT Description LIKE "%virtual%"';

    var excludesWireless = obtain(options, 'excludesWireless', false);
    if (excludesWireless) query += ' AND NOT Description LIKE "%wireless%"';

    var sWbemObjSets = os.WMI.execQuery(query);
    return sWbemObjSets;
  }; // }}}

  // net.getAdaptersConfsObjs {{{
  /**
   * Gets an Array of the network adapter configurations.
   *
   * @example
   * var net = Wsh.Net; // Shorthand
   *
   * var adapterConfs = net.getAdaptersConfsObjs();
   * console.dir(adapterConfs);
   * // Outputs: [
   * // {
   * //   ArpAlwaysSourceRoute: null,
   * //   ArpUseEtherSNAP: null,
   * //   Caption: "[00000014] Intel(R) 123456V Gigabit Network Connection",
   * //   DatabasePath: null,
   * //   DeadGWDetectEnabled: null,
   * //   DefaultIPGateway: "11.22.33.44",
   * //   DefaultTOS: null,
   * //   DefaultTTL: null,
   * //   Description: "Intel(R) 123456V Gigabit Network Connection",
   * //   DHCPEnabled: true,
   * //   DHCPLeaseExpires: "20161115082325.000000+540",
   * //   DHCPLeaseObtained: "20161108082325.000000+540",
   * //   DHCPServer: "11.22.33.44",
   * //   DNSDomain: "mypc.local",
   * //   DNSDomainSuffixSearchOrder: "mypc.local",
   * //   DNSEnabledForWINSResolution: false,
   * //   DNSHostName: "MYPC123456"
   * //   DNSServerSearchOrder: ["11.22.33.44", "11.22.33.55"],
   * //   DomainDNSRegistrationEnabled: false,
   * //   ForwardBufferMemory: null,
   * //   FullDNSRegistrationEnabled: true,
   * //   GatewayCostMetric: 0,
   * //   IGMPLevel: null,
   * //   Index: 14,
   * //   InterfaceIndex: 14,
   * //   IPAddress: ["11.22.33.44", "ab12::cd23:ef45:gh67:ij89"],
   * //   IPConnectionMetric: 10,
   * //   IPEnabled: true,
   * //   IPFilterSecurityEnabled: false,
   * //   IPPortSecurityEnabled: null,
   * //   IPSecPermitIPProtocols: null,
   * //   IPSecPermitTCPPorts: null,
   * //   IPSecPermitUDPPorts: null,
   * //   IPSubnet: "255.255.255.0,64",
   * //   IPUseZeroBroadcast: null,
   * //   IPXAddress: null,
   * //   IPXEnabled: null,
   * //   IPXFrameType: null,
   * //   IPXMediaType: null,
   * //   IPXNetworkNumber: null,
   * //   IPXVirtualNetNumber: null,
   * //   KeepAliveInterval: null,
   * //   KeepAliveTime: null,
   * //   MACAddress: "XX:XX:XX:XX:XX:XX",
   * //   MTU: null,
   * //   NumForwardPackets: null,
   * //   PMTUBHDetectEnabled: null,
   * //   PMTUDiscoveryEnabled: null,
   * //   ServiceName: "xxxxxx64",
   * //   SettingID: "{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}",
   * //   TcpipNetbiosOptions: null,
   * //   TcpMaxConnectRetransmissions: null,
   * //   TcpMaxDataRetransmissions: null,
   * //   TcpNumConnections: null,
   * //   TcpUseRFC1122UrgentPointer: null,
   * //   TcpWindowSize: 65432,
   * //   WINSEnableLMHostsLookup: null,
   * //   WINSHostLookupFile: null,
   * //   WINSPrimaryServer: "11.22.33.44",
   * //   WINSScopeID: null,
   * //   WINSSecondaryServer: "11.22.33.44"
   * // }, {
   * //    ...
   * //    ..
   * // }]
   * @function getAdaptersConfsObjs
   * @memberof Wsh.Net
   * @param {string} [macAddress] - If empty, gets all adapters.
   * @param {object} [options] - Optional parameters.
   * @param {boolean} [options.excludesVirtual=true]
   * @param {boolean} [options.excludesWireless=false]
   * @returns {object[]} - An Array of the network adapters configurations objects.
   */
  net.getAdaptersConfsObjs = function (macAddress, options) {
    var sWbemObjSets = net.getAdaptersConfsSWbemObjs(macAddress, options);
    return os.WMI.toJsObjects(sWbemObjSets);
  }; // }}}

  // net.getIpSetInAdapters {{{
  /**
   * Gets the IP address set in adapters.
   *
   * @example
   * var net = Wsh.Net; // Shorthand
   *
   * net.getIpSetInAdapters('XX:XX:XX:XX:XX:XX'); // Returns: ['11.22.33.44']
   * @function getIpSetInAdapters
   * @memberof Wsh.Net
   * @param {string} [macAddress] - If empty, gets all adapters.
   * @param {object} [options] - other options, See {@link Wsh.Net.getAdaptersConfsObjs}.
   * @param {string} [options.ipVer='IPv4'] - IPv4 or IPv6.
   * @returns {string[]} - The Array of the network adapters IP addresses.
   */
  net.getIpSetInAdapters = function (macAddress, options) {
    var adapters = net.getAdaptersConfsObjs(macAddress, options);
    var adapterObjs = os.WMI.toJsObjects(adapters);

    var ipVer = obtain(options, 'ipVer', 'IPv4');
    var iIpVer = isSameStr(ipVer, 'IPv6') ? 1 : 0;
    var rtnIPs = [];

    adapterObjs.forEach(function (adapter) {
      if (hasIn(adapter, 'IPAddress') && adapter.IPAddress !== null) {
        rtnIPs.push(adapter.IPAddress[iIpVer].toString());
      }
    });

    return rtnIPs;
  }; // }}}

  // net.getDefaultGateways {{{
  /**
   * Gets the IP address of default gateway set in adapters.
   *
   * @example
   * var net = Wsh.Net; // Shorthand
   *
   * net.getDefaultGateways('XX:XX:XX:XX:XX:XX'); // Returns: ['11.22.33.44']
   * @function getDefaultGateways
   * @memberof Wsh.Net
   * @param {string} [macAddress] - If empty, gets all adapters.
   * @param {object} [options] - See {@link Wsh.Net.getAdaptersConfsObjs}
   * @returns {string[]} - An Array of the default gateway IP addresses.
   */
  net.getDefaultGateways = function (macAddress, options) {
    var adapters = net.getAdaptersConfsObjs(macAddress, options);
    var adapterObjs = os.WMI.toJsObjects(adapters);
    var rtnIPs = [];

    adapterObjs.forEach(function (adapter) {
      if (hasIn(adapter, 'DefaultIPGateway') && adapter.DefaultIPGateway !== null) {
        rtnIPs.push(adapter.DefaultIPGateway.toString());
      }
    });

    return rtnIPs;
  }; // }}}

  // net.getDnsIPsSetInAdapters {{{
  /**
   * Gets the IP addresses of DNS set in adapters.
   *
   * @example
   * var net = Wsh.Net; // Shorthand
   *
   * net.getDnsIPsSetInAdapters('XX:XX:XX:XX:XX:XX'); // Returns: ['11.22.33.44']
   * @function getDnsIPsSetInAdapters
   * @memberof Wsh.Net
   * @param {string} [macAddress] - If empty, gets all adapters.
   * @param {object} [options] - See {@link Wsh.Net.getAdaptersPropsObjs}
   * @returns {string[]} - [0]:Primary DNS Server Address [1]:Secondary-
   */
  net.getDnsIPsSetInAdapters = function (macAddress, options) {
    var adapters = net.getAdaptersPropsObjs(macAddress, options);

    if (!isSolidArray(adapters)) return [];

    var adapterGUID = adapters[0].GUID;
    var regVal = sh.RegRead('HKEY_LOCAL_MACHINE\\SYSTEM'
        + '\\ControlSet001\\services\\Tcpip\\Parameters\\Interfaces'
        + '\\' + adapterGUID + '\\NameServer');

    return regVal.split(',');
  }; // }}}

  // net.exportWinFirewallSettings {{{
  /**
   * [Requires admin rights] Exports the binary file of Windows firewall settings.
   *
   * @example
   * var net = Wsh.Net; // Shorthand
   *
   * net.exportWinFirewallSettings('D:\\backup.wfw');
   * @function exportWinFirewallSettings
   * @memberof Wsh.Net
   * @param {string} destPath - Recommend the extension .wfw
   * @param {object} [options] - Optional parameters.
   * @param {boolean} [options.isDryRun=false] - No execute, returns the string of command.
   * @param {(boolean|undefined)} [options.runsAdmin=true] - true: as Admin, false: as User
   * @returns {object|string} - See {@link https://docs.tuckn.net/WshChildProcess/global.html#typeRunSyncReturn|typeRunSyncReturn}. If options.isDryRun is true, returns string.
   */
  net.exportWinFirewallSettings = function (destPath, options) {
    var FN = 'net.exportWinFirewallSettings';
    if (!isSolidString(destPath)) throwErrNonStr(FN, destPath);

    var pathToExport = path.resolve(destPath);
    var command = srrd(NETSH_EXE) + ' advfirewall export ' + srrd(pathToExport);
    var runsAdmin = obtain(options, 'runsAdmin', true);
    var isDryRun = obtain(options, 'isDryRun', false);

    return execSync(command, {
      runsAdmin: runsAdmin,
      winStyle: 'hidden',
      isDryRun: isDryRun
    });
  }; // }}}

  // Update

  // net.setIpAddress {{{
  /**
   * Sets the IP address, SubNetMask, DefaultGateway.
   *
   * @example
   * var net = Wsh.Net; // Shorthand
   *
   * net.setIpAddress('Ethernet 1', '11.22.33.44', '255.255.0.0', '11.22.33.1')
   * // Returns: { err, stdout, stderr }
   * @function setIpAddress
   * @memberof Wsh.Net
   * @param {string} netName - The NetConnectionID of the network adapter.
   * @param {string} [ip] - If empty, enable DHCP.
   * @param {string} [mask='255.255.255.0']
   * @param {string} [defGw='']
   * @param {object} [options] - Optional parameters.
   * @param {(boolean|undefined)} [options.runsAdmin] - true: as Admin, false: as User
   * @param {boolean} [options.isDryRun=false] - No execute, returns the string of command.
   * @returns {object|string} - See {@link https://docs.tuckn.net/WshChildProcess/global.html#typeRunSyncReturn|typeRunSyncReturn}. If options.isDryRun is true, returns string.
   */
  net.setIpAddress = function (netName, ip, mask, defGw, options) {
    var FN = 'net.setIpAddress';
    if (!isSolidString(netName)) throwErrNonStr(FN, netName);

    var argsStr = 'interface ipv4 set address name="' + netName + '"';
    if (isSolidString(ip)) {
      argsStr += ' source=static address=' + ip;

      if (isSolidString(mask)) {
        argsStr += ' mask=' + mask;
      } else {
        argsStr += ' mask=255.255.255.0';
      }

      if (isSolidString(defGw)) {
        argsStr += ' gateway=' + defGw + ' gwmetric=1';
      }
    } else {
      argsStr += ' source=dhcp';
    }

    var command = srrd(NETSH_EXE) + ' ' + argsStr;
    var runsAdmin = obtain(options, 'runsAdmin', null);
    var isDryRun = obtain(options, 'isDryRun', false);

    /**
     *  netshコマンドの返値
     *  [成功時]
          ExitCode: 0,
          StdOut: "",
          StdErr: ""
    *  [失敗時]
          ExitCode: 1,
          StdOut: "ファイル名、ディレクトリ名、またはボリューム
          ラベルの構文が間違っています。",
          StdErr: ""
    *  [DHCP有効の状態から、さらに有効を指定した時]
          netsh interface ipv4 set address name="LAN Cable" source=dhcp
          DHCP はこのインターフェイスで既に有効です。
     */
    return execSync(command, {
      runsAdmin: runsAdmin,
      winStyle: 'hidden',
      isDryRun: isDryRun
    });
  }; // }}}

  // net.setIpAddressesWithWMI {{{
  /**
   * Set the IP address and the SubNetMask.
   *
   * @function setIpAddressesWithWMI
   * @memberof Wsh.Net
   * @param {string} netName - The Network Adapter Index. 誤爆が怖いので操作するNetworkアダプタをIndexで指定する
   * @param {string} [ip] - 指定なしでDHCPを有効にする
   * @param {string} [mask='255.255.255.0']
   * @param {string} [defGw='']
   * @returns {boolean}
   */
  net.setIpAddressesWithWMI = function (netName, ip, mask, defGw) {
    var FN = 'net.setIpAddressesWithWMI';

    if (!isSolidString(netName)) {
      netName = net.getAdaptersPropsObjs()[0].NetConnectionID;
    }

    var query = 'SELECT * FROM Win32_NetworkAdapterConfiguration'
        + ' WHERE Index = ' + netName;
    var wmiObjs = os.WMI.execQuery(query);

    if (wmiObjs.length === 0) {
      throw new Error('Error [EmptyWMI Object Return]\n'
          + '  at ' + FN + ' (' + MODULE_TITLE + ')\n'
          + '  query: ' + insp(query));
    }

    // Set DHCP
    if (!wmiObjs[0].DHCPEnabled) {
      // @FIXME IPアドレスの指定があってもまずはDHCPを有効にする
      //   そうしないとDefault Gatewayを空にできない！
      // @FIXME ↓これ動かない・・・、netshで代替え処理
      rtnCode = wmiObjs[0].EnableDHCP();

      // netAdps = _fn.getPropertiesInNetworkPhysicalAdapters(
      //     wmiObjs[0].Caption);
      //
      // if (netAdps.length > 0) {
      //   sh.Run('cmd.exe /S /C"netsh interface ip set address ' +
      //       'name="' + netAdps[0].NetConnectionID + '" dhcp"',
      //       'hidden', CD.waits.yes);
      // }
    } else {
      console.log(FN + ': already DCHP.');
    }

    if (!isSolidString(ip)) {
      if (isSolidString(defGw)) rtnCode = wmiObjs[0].SetGateways([defGw]);
      return true;
    }

    // Set a specified IP address
    var newMask = isSolidString(mask) ? mask : '255.255.255.0';
    var rtnCode = wmiObjs[0].EnableStatic([ip], [newMask]);

    if (rtnCode === 0) {
      if (isSolidString(defGw)) rtnCode = wmiObjs[0].SetGateways([defGw]);
      return true;
    }

    if (rtnCode === 1) {
      console.log(FN + ':\n'
          + '  Successful completion, reboot required.');
      if (isSolidString(defGw)) rtnCode = wmiObjs[0].SetGateways([defGw]);
      return true;
    }

    if (rtnCode === -66) {
      throw new Error('Error [Invalid SubnetMask]\n'
          + '  at ' + FN + ' (' + MODULE_TITLE + ')\n'
          + '  newMask: ' + insp(newMask));
    }

    if (rtnCode === -2147180508) {
      throw new Error('Error [WindowOfNetConfig]\n'
          + '  at ' + FN + ' (' + MODULE_TITLE + ')\n'
          + '  ネットワーク設定画面を閉じて再試行してください。');
    }

    throw new Error('Error [Not Code 0]\n'
        + '  at ' + FN + ' (' + MODULE_TITLE + ')\n'
        + '  rtnCode: ' + rtnCode);
  }; // }}}

  // net.setDnsServers {{{
  /**
   * Sets DNS addresses. Must closed the Windows network config window.
   *
   * @example
   * var net = Wsh.Net; // Shorthand
   *
   * net.setDnsServers('Ethernet 1', '11.22.33.1', '11.22.33.2');
   * @function setDnsServers
   * @memberof Wsh.Net
   * @param {string} netName - The NetConnectionID of the network adapter.
   * @param {string} [dns1] - If empty, enables DHCP.
   * @param {string} [dns2='']
   * @param {object} [options] - Optional parameters.
   * @param {(boolean|undefined)} [options.runsAdmin] - true: as Admin, false: as User
   * @param {boolean} [options.isDryRun=false] - No execute, returns the string of command.
   * @returns {void|string} - If options.isDryRun is true, returns string.
   */
  net.setDnsServers = function (netName, dns1, dns2, options) {
    var FN = 'net.setDnsServers';
    if (!isSolidString(netName)) throwErrNonStr(FN, netName);

    var argsStr1 = 'interface ipv4 set dnsservers name="' + netName + '"';
    if (isSolidString(dns1)) {
      argsStr1 += ' source=static address=' + dns1 + ' register=non validate=no';
    } else {
      argsStr1 += ' source=dhcp';
    }

    var command1 = srrd(NETSH_EXE) + ' ' + argsStr1;
    var runsAdmin = obtain(options, 'runsAdmin', null);
    var isDryRun = obtain(options, 'isDryRun', false);

    var rtnVal1 = execSync(command1, {
      runsAdmin: runsAdmin,
      winStyle: 'hidden',
      isDryRun: isDryRun
    });

    if (!isDryRun && rtnVal1.error) {
      throw new Error('Error: [StdErrNotEmpty]\n'
        + '  at ' + FN + ' (' + MODULE_TITLE + ')\n'
        + '  exefile: "' + NETSH_EXE + '"\n  args: ' + insp(argsStr1) + '\n'
        + '  rtnVal: ' + insp(rtnVal1));
    }

    if (!isSolidString(dns2)) {
      if (isDryRun) return 'dry-run [' + FN + ']: ' + rtnVal1;
      return;
    }

    var argsStr2 = 'interface ipv4 add dnsservers name="' + netName + '" address=' + dns2 + ' index=2 validate=no';

    var command2 = srrd(NETSH_EXE) + ' ' + argsStr2;
    var rtnVal2 = execSync(command2, {
      runsAdmin: runsAdmin,
      winStyle: 'hidden',
      isDryRun: isDryRun
    });

    if (isDryRun) return 'dry-run [' + FN + ']: ' + rtnVal1 + '\n' + rtnVal2;

    if (rtnVal2.error) {
      throw new Error('Error: [StdErrNotEmpty]\n'
        + '  at ' + FN + ' (' + MODULE_TITLE + ')\n'
        + '  exefile: "' + NETSH_EXE + '"\n  args: ' + insp(argsStr2) + '\n'
        + '  rtnVal: ' + insp(rtnVal2));
    }
  }; // }}}

  // net.setDnsServersWithWMI {{{
  /**
   * Sets the DNS server with {@link https://docs.microsoft.com/en-us/windows/win32/wmisdk/wmi-start-page|WMI} (Windows Management Instrumentation. WBEM for Windows).
   *
   * @function setDnsServersWithWMI
   * @memberof Wsh.Net
   * @param {string} netadpIndex - The network adapter index.
   * @param {Array} [dnsAdds] - If empty, enable DHCP.
   * @returns {boolean}
   */
  net.setDnsServersWithWMI = function (netadpIndex, dnsAdds) {
    var FN = 'net.setDnsServersWithWMI';
    var query = 'SELECT * FROM Win32_NetworkAdapterConfiguration'
        + ' WHERE IPEnabled = True AND Index = ' + netadpIndex;
    var wmiObjs = os.WMI.execQuery(query);

    if (wmiObjs.length === 0) {
      throw new Error('Error [EmptyWMI Object Return]\n'
          + '  at ' + FN + ' (' + MODULE_TITLE + ')\n'
          + '  query: ' + insp(query));
    }

    // Set a specified IP address
    var rtnCode = wmiObjs[0].SetDNSServerSearchOrder(dnsAdds);

    if (rtnCode === 0) return true;

    if (rtnCode === 1) {
      console.log(FN + ':\n'
          + '  Successful completion, reboot required.');
      return true;
    }

    if (rtnCode === -2147180508) {
      throw new Error('Error [WindowOfNetConfig]\n'
          + '  at ' + FN + ' (' + MODULE_TITLE + ')\n'
          + '  ネットワーク設定画面を閉じて再試行してください。');
    }

    throw new Error('Error [Failed to set SetDNSServerSearchOrder]\n'
        + '  at ' + FN + ' (' + MODULE_TITLE + ')\n'
        + '  rtnCode: ' + insp(rtnCode));
  }; // }}}

  // net.importWinFirewallSettings {{{
  /**
   * [Requires admin rights] Import file(binary) of Windows firewall settings.
   *
   * @example
   * var net = Wsh.Net; // Shorthand
   *
   * net.importWinFirewallSettings('D:\\backup.wfw');
   * @function exportWinFirewallSettings
   * @memberof Wsh.Net
   * @param {string} srcPath
   * @param {object} [options] - Optional parameters.
   * @param {(boolean|undefined)} [options.runsAdmin=true] - true: as Admin, false: as User
   * @param {boolean} [options.isDryRun=false] - No execute, returns the string of command.
   * @returns {object|string} - See {@link https://docs.tuckn.net/WshChildProcess/global.html#typeRunSyncReturn|typeRunSyncReturn}. If options.isDryRun is true, returns string.
   */
  net.importWinFirewallSettings = function (srcPath, options) {
    var FN = 'net.importWinFirewallSettings';
    if (!isSolidString(srcPath)) throwErrNonStr(FN, srcPath);

    var pathToImport = path.resolve(srcPath);

    if (!fs.statSync(pathToImport).isFile()) {
      throwErrNonExist(FN, pathToImport);
    }

    var argsStr = 'advfirewall import ' + srrd(pathToImport);

    var command = srrd(NETSH_EXE) + ' ' + argsStr;
    var runsAdmin = obtain(options, 'runsAdmin', true);
    var isDryRun = obtain(options, 'isDryRun', false);

    return execSync(command, {
      runsAdmin: runsAdmin,
      winStyle: 'hidden',
      isDryRun: isDryRun
    });
  }; // }}}

  // Delete
})();

// vim:set foldmethod=marker commentstring=//%s :
