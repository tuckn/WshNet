/* globals Wsh: false */

/* globals describe: false */
/* globals test: false */
/* globals expect: false */

// Shorthand
var util = Wsh.Util;
var os = Wsh.OS;
var fs = Wsh.FileSystem;
var fse = Wsh.FileSystemExtra;
var net = Wsh.Net;

var isSolidArray = util.isSolidArray;
var isBoolean = util.isBoolean;
var isSolidString = util.isSolidString;
var CMD = os.exefiles.cmd;
var NETSH_EXE = os.exefiles.netsh;

var _cb = function (fn/* , args */) {
  var args = Array.from(arguments).slice(1);
  return function () { fn.apply(null, args); };
};

describe('Net', function () {
  var testName;
  var noneStrVals = [true, false, undefined, null, 0, 1, NaN, Infinity, [], {}];

  // Create

  // Read

  testName = 'respondsHost';
  test(testName, function () {
    expect(net.respondsHost('127.0.0.1')).toBe(true);
    expect(net.respondsHost('127.0.0.0')).toBe(false);

    noneStrVals.forEach(function (val) {
      expect(_cb(net.respondsHost, val)).toThrowError();
    });
  });

  testName = 'showIpConfigAll';
  test(testName, function () {
    net.showIpConfigAll();

    WScript.Echo('Is a result of `ipconfig` CMD window showning?/y or Not');
    var ans = WScript.StdIn.ReadLine();
    expect(ans.toUpperCase()).toBe('Y');
  });

  testName = 'getAdaptersPropsSWbemObjs';
  test(testName, function () {
    var sWbemObjSets = net.getAdaptersPropsSWbemObjs();
    // console.dir(os.WMI.toJsObjects(sWbemObjSets));

    expect(isSolidArray(sWbemObjSets)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].Caption)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].GUID)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].MACAddress)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].Name)).toBe(true);
    // @TODO more test
  });

  testName = 'getAdaptersPropsObjs';
  test(testName, function () {
    var adapters = net.getAdaptersPropsObjs();
    // console.dir(adapters);

    expect(isSolidArray(adapters)).toBe(true);
    expect(isSolidString(adapters[0].Caption)).toBe(true);
    expect(isSolidString(adapters[0].GUID)).toBe(true);
    expect(isSolidString(adapters[0].MACAddress)).toBe(true);
    expect(isSolidString(adapters[0].Name)).toBe(true);
    // @TODO more test
  });

  testName = 'enablesDHCP';
  test(testName, function () {
    expect('@TODO').toBe('tested');

    var macAddress = '@TODO';
    var ipDHCP = net.enablesDHCP(macAddress);

    expect(isBoolean(ipDHCP)).toBe(true);
  });

  testName = 'getAdaptersConfsSWbemObjs';
  test(testName, function () {
    var sWbemObjSets = net.getAdaptersConfsSWbemObjs();
    // console.dir(os.WMI.toJsObjects(sWbemObjSets));

    expect(isSolidArray(sWbemObjSets)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].Caption)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].Description)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].MACAddress)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].SettingID)).toBe(true);
    // @TODO more test
  });

  testName = 'getAdaptersConfsObjs';
  test(testName, function () {
    var adapterConfs = net.getAdaptersConfsObjs();
    // console.dir(adapterConfs);

    expect(isSolidArray(adapterConfs)).toBe(true);
    expect(isSolidString(adapterConfs[0].Caption)).toBe(true);
    expect(isSolidString(adapterConfs[0].Description)).toBe(true);
    expect(isSolidString(adapterConfs[0].MACAddress)).toBe(true);
    expect(isSolidString(adapterConfs[0].SettingID)).toBe(true);
    // @TODO more test
  });

  testName = 'getIpSetInAdapters';
  test(testName, function () {
    expect('@TODO').toBe('tested');

    var ipAddresses = net.getIpSetInAdapters();
    console.dir(ipAddresses);

    expect(isSolidArray(ipAddresses)).toBe(true);
    expect(isSolidString(ipAddresses[0])).toBe(true); // xxx.xxx.xxx.xxx
  });

  testName = 'getDefaultGateways';
  test(testName, function () {
    expect('@TODO').toBe('tested');

    var ipAddresses = net.getDefaultGateways();
    console.dir(ipAddresses);

    expect(isSolidArray(ipAddresses)).toBe(true);
    expect(isSolidString(ipAddresses[0])).toBe(true); // "<IPv4>,<Ipv6>"
  });

  testName = 'getDnsIPsSetInAdapters';
  test(testName, function () {
    expect('@TODO').toBe('tested');

    var ipAddresses = net.getDnsIPsSetInAdapters();
    console.dir(ipAddresses);

    expect(isSolidArray(ipAddresses)).toBe(true);
    expect(isSolidString(ipAddresses[0])).toBe(true);
  });

  testName = 'exportWinFirewallSettings';
  test(testName, function () {
    noneStrVals.forEach(function (val) {
      expect(_cb(net.exportWinFirewallSettings, val)).toThrowError();
    });

    var fwPath = os.makeTmpPath('net_test_exportfwset', '.wfw');
    var retVal;

    // dry-run
    retVal = net.exportWinFirewallSettings(fwPath, { isDryRun: true });
    expect(retVal).toContain(CMD + ' /S /C"'
      + NETSH_EXE + ' advfirewall export ' + fwPath + ' 1> ');

    retVal = net.exportWinFirewallSettings(fwPath);
    expect(retVal.error).toBeFalsy();
    expect(retVal.stdout).toContain('OK');
    expect(fs.existsSync(fwPath)).toBe(true);

    // Cleans
    fse.removeSync(fwPath);
    expect(fs.existsSync(fwPath)).toBe(false);
  });

  // Update

  testName = 'setIpAddress';
  test(testName, function () {
    noneStrVals.forEach(function (val) {
      expect(_cb(net.setIpAddress, val)).toThrowError();
    });

    var netName = 'Ethernet 1';
    var ip = '11.22.33.44';
    var mask = '255.255.0.0';
    var defGw = '11.22.33.1';
    var retVal;

    // dry-run
    retVal = net.setIpAddress(netName, ip, mask, defGw, { isDryRun: true });
    expect(retVal).toContain('dry-run [_shRun]: ' + CMD + ' /S /C"'
      + NETSH_EXE + ' "interface ipv4" "set address"'
      + ' "name=\\"' + netName + '\\""'
      + ' "source=static address=' + ip + '" mask=' + mask
      + ' gateway=' + defGw + ' gwmetric=1 1> ');

    expect('@TODO').toBe('Testing on virtual adapter');
  });

  testName = 'setDnsServers';
  test(testName, function () {
    noneStrVals.forEach(function (val) {
      expect(_cb(net.setDnsServers, val)).toThrowError();
    });

    var retVal;
    var netName = 'Ethernet 1';

    // dry-run
    retVal = net.setDnsServers(netName, null, null, { isDryRun: true });
    expect(retVal).toContain('dry-run [_shRun]: ' + CMD + ' /S /C"'
      + NETSH_EXE + ' "interface ipv4" "set dnsservers"'
      + ' "name=\\"' + netName + '\\""'
      + ' source=dhcp 1> ');

    var dns1 = '11.22.33.1';

    // dry-run
    retVal = net.setDnsServers(netName, dns1, dns2, { isDryRun: true });
    expect(retVal).toContain('dry-run [_shRun]: ' + CMD + ' /S /C"'
      + NETSH_EXE + ' "interface ipv4" "set dnsservers"'
      + ' "name=\\"' + netName + '\\""'
      + ' source=static address=' + dns1 + ' register=non validate=no 1> ');

    var dns2 = '11.22.33.2';

    // dry-run
    retVal = net.setDnsServers(netName, dns1, dns2, { isDryRun: true });
    expect(retVal).toContain(CMD + ' /S /C"'
      + NETSH_EXE + ' "interface ipv4" "add dnsservers"'
      + ' "name=\\"' + netName + '\\""'
      + ' address=' + dns2 + ' index=2 validate=no 1> ');

    expect('@TODO').toBe('Testing on virtual adapter');
  });

  testName = 'setDnsServersWithWMI';
  test(testName, function () {
    expect('@TODO').toBe('Testing on virtual adapter');
  });

  testName = 'importWinFirewallSettings';
  test(testName, function () {
    noneStrVals.forEach(function (val) {
      expect(_cb(net.importWinFirewallSettings, val)).toThrowError();
    });

    var fwPath = os.makeTmpPath('net_test_exportfwset', '.wfw');

    expect(_cb(net.importWinFirewallSettings, fwPath)).toThrowError();

    fs.writeFileSync(fwPath, 'Dummy FireWall Values');

    var retVal;

    // dry-run
    retVal = net.importWinFirewallSettings(fwPath, { isDryRun: true });
    expect(retVal).toContain(CMD + ' /S /C"'
      + NETSH_EXE + ' advfirewall import ' + fwPath + ' 1> ');

    // Cleans
    fse.removeSync(fwPath);
    expect(fs.existsSync(fwPath)).toBe(false);

    expect('@TODO').toBe('Testing on virtual Window');
  });

  // Delete
});
