/* globals Wsh: false */
/* globals __filename: false */
/* globals process: false */

/* globals describe: false */
/* globals test: false */
/* globals expect: false */

// Shorthand
var util = Wsh.Util;
var path = Wsh.Path;
var os = Wsh.OS;
var fs = Wsh.FileSystem;
var fse = Wsh.FileSystemExtra;
var child_process = Wsh.ChildProcess;
var net = Wsh.Net;

var insp = util.inspect;
var isSolidArray = util.isSolidArray;
var isBoolean = util.isBoolean;
var isSolidString = util.isSolidString;
var includes = util.includes;
var CSCRIPT = os.exefiles.cscript;
var execFileSync = child_process.execFileSync;

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
    var RUN_SUBPROCESS = '/RUN_SUBPROCESS' + testName;

    var fwPath = os.makeTmpPath('net_test_exportfwset', '.wfw');

    if (includes(process.argv, RUN_SUBPROCESS)) {
      if (!process.isAdmin()) {
        console.error('Rejected administration auth');
        process.exit(1);
      }

      var firewallPath = process.argv.find(function (arg) {
        return path.extname(arg) === '.wfw';
      });

      try {
        net.exportWinFirewallSettings(firewallPath);
      } catch (e) {
        console.error(insp(e));
        process.exit(1);
      }
      process.exit(0);
    }

    fse.removeSync(fwPath);
    expect(fs.existsSync(fwPath)).toBe(false);

    var args = ['//nologo', __filename, '-t', testName, RUN_SUBPROCESS, fwPath];
    var opt = { runsAdmin: true, shell: true, winStyle: 'hidden' };

    var rtnObj = execFileSync(CSCRIPT, args, opt);

    expect(rtnObj.error).not.toBe(true);
    expect(fs.existsSync(fwPath)).toBe(true);

    // Cleans
    fse.removeSync(fwPath);
    expect(fs.existsSync(fwPath)).toBe(false);

    noneStrVals.forEach(function (val) {
      expect(_cb(net.exportWinFirewallSettings, val)).toThrowError();
    });
  });

  // Update

  testName = 'setDnsServers';
  test(testName, function () {
    expect('@TODO').toBe('tested');
  });

  testName = 'setDnsServersWithWMI';
  test(testName, function () {
    expect('@TODO').toBe('tested');
  });

  testName = 'setIpAddress';
  test(testName, function () {
    expect('@TODO').toBe('tested');
  });

  testName = 'importWinFirewallSettings';
  test(testName, function () {
    // @TODO Run in a virtual Windows
    expect('@TODO').toBe('tested');

    noneStrVals.forEach(function (val) {
      expect(_cb(net.exportWinFirewallSettings, val)).toThrowError();
    });
  });

  // Delete
});
