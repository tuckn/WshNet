/* globals Wsh: false */
/* globals __filename: false */
/* globals process: false */

/* globals describe: false */
/* globals test: false */
/* globals expect: false */

// Shorthand
var CD = Wsh.Constants;
var util = Wsh.Util;
var path = Wsh.Path;
var os = Wsh.OS;
var fs = Wsh.FileSystem;
var fse = Wsh.FileSystemExtra;
var child_process = Wsh.ChildProcess;
var net = Wsh.Net;

var isSolidArray = util.isSolidArray;
var isSolidString = util.isSolidString;
var includes = util.includes;
var srrd = os.surroundCmdArg;
var escapeForCmd = os.escapeForCmd;
var CMD = os.exefiles.cmd;
var CSCRIPT = os.exefiles.cscript;
var NET = os.exefiles.net;
var execSync = child_process.execSync;
var execFileSync = child_process.execFileSync;

var noneStrVals = [true, false, undefined, null, 0, 1, NaN, Infinity, [], {}];
var testCmd = srrd(CSCRIPT) + ' ' + srrd(__filename) + ' //job:test:SMB';

var _cb = function (fn/* , args */) {
  var args = Array.from(arguments).slice(1);
  return function () { fn.apply(null, args); };
};

var _shareDir = function (shareName, sharedDir, grant, remark) {
  if (process.isAdmin()) {
    // Creates the directory to share
    fse.ensureDirSync(sharedDir);

    var retObj = net.SMB.shareDirectory(shareName, sharedDir,
      { grant: grant, remark: remark });

    process.exit(CD.runs.ok);
  }

  console.error('Prevented the infinite loop');
  process.exit(CD.runs.err);
};

var _delShareDir = function (shareName, sharedDir) {
  if (process.isAdmin()) {
    // Delete the share
    var args = ['share', shareName, '/DELETE', '/YES'];
    var retObj = execFileSync(NET, args, { winStyle: 'hidden' });

    // Removes the directory
    fse.removeSync(sharedDir);

    process.exit(CD.runs.ok);
  }

  console.error('Prevented the infinite loop');
  process.exit(CD.runs.err);
};

var _connect = function (testName, sharedDir, sharedName) {
  // Connects
  var retObj = net.SMB.connectSync(process.env.COMPUTERNAME, sharedName);

  // Checks
  var smbPath = '\\\\' + process.env.COMPUTERNAME + '\\' + sharedName;

  retObj = execFileSync(NET, ['use']);
  expect(retObj.stdout.indexOf(smbPath)).not.toBe(-1); // @TODO

  return smbPath;
};

var _disconnect = function (testName, sharedDir, smbPath) {
  // Disconnects
  var args = ['use', smbPath, '/delete', '/yes'];
  var retObj = execFileSync(NET, args, { winStyle: 'hidden' });

  // Checks
  retObj = execFileSync(NET, ['use']);
  expect(retObj.stdout.indexOf(smbPath)).toBe(-1); // @TODO
};

describe('SMB', function () {
  var testName;

  // Share

  testName = 'shareDirectory_dryRun';
  test(testName, function () {
    // Checks throwing error
    noneStrVals.forEach(function (val) {
      expect(_cb(net.SMB.shareDirectory, val)).toThrowError();
      expect(_cb(net.SMB.shareDirectory, 'SharedName', val)).toThrowError();
    });

    var sharedName = 'Temp shared ' + testName;
    var grantType = 'CHANGE';
    var remark = 'Shared dir for testing ' + testName;
    var sharedDir = os.makeTmpPath() + ' for testing ' + testName;

    expect(_cb(net.SMB.shareDirectory, sharedName, sharedDir)).toThrowError();

    fse.ensureDirSync(sharedDir);
    var rtn;

    // dry-run
    rtn = net.SMB.shareDirectory(sharedName, sharedDir, {
      grant: grantType,
      remark: remark,
      isDryRun: true
    });
    expect(rtn).toContain('dry-run');
    expect(rtn).toContain(CMD + ' /S /C"'
      + NET + ' share ' + srrd(sharedName) + '=' + srrd(sharedDir)
      + ' /GRANT:Everyone,' + grantType
      + ' /REMARK:' + srrd(remark) + ' 1>');

    // Cleans
    fse.removeSync(sharedDir);
    expect(fs.existsSync(sharedDir)).toBe(false);
  });

  testName = 'shareDirectory_READ';
  test(testName, function () {
    var cmd, rtn;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), 'Dir for testing ' + testName);
    var sharedName = 'Temp shared ' + testName;
    var remark = 'Shared dir for testing ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(sharedName, sharedDir, 'READ', remark);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(sharedName, sharedDir);
    }

    // Shares
    // Runs the admin process and Do the test function in it
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    rtn = execSync(cmd, { runsAdmin: true });
    expect(rtn.error).toBe(false);

    // Checks to access
    var smbDirPath = '\\\\' + process.env.COMPUTERNAME + '\\' + sharedName;
    expect(fs.existsSync(smbDirPath)).toBe(true);

    var smbNewDir = path.join(smbDirPath, 'NewDir');
    expect(_cb(fs.mkdirSync, smbNewDir)).toThrowError();

    // Clean
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    rtn = execSync(cmd, { runsAdmin: true });
    expect(rtn.error).toBe(false);
  });

  testName = 'shareDirectory_CHANGE';
  test(testName, function () {
    var cmd, retObj;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), 'Dir for testing ' + testName);
    var sharedName = 'Temp shared ' + testName;
    var remark = 'Shared dir for testing ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(sharedName, sharedDir, 'CHANGE', remark);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(sharedName, sharedDir);
    }

    // Shares
    // Runs the admin process and Do the test function in it
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);

    // Checks to access
    var smbDirPath = '\\\\' + process.env.COMPUTERNAME + '\\' + sharedName;
    expect(fs.existsSync(smbDirPath)).toBe(true);

    var smbNewDir = path.join(smbDirPath, 'NewDir');
    fs.mkdirSync(smbNewDir);
    expect(fs.existsSync(smbNewDir)).toBe(true);

    fs.rmdirSync(smbNewDir);
    expect(fs.existsSync(smbNewDir)).toBe(false);

    // Clean
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);
  });

  testName = 'showLocalShares';
  test(testName, function () {
    net.SMB.showLocalShares();

    WScript.Echo('Is a result of `net share` CMD window showning?/y or Not');
    var ans = WScript.StdIn.ReadLine();
    expect(ans.toUpperCase()).toBe('Y');
  });

  testName = 'getLocalSharesSWbemObjs';
  test(testName, function () {
    var sWbemObjSets = net.SMB.getLocalSharesSWbemObjs();

    expect(isSolidArray(sWbemObjSets)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].Caption)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].Description)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].Name)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].Path)).toBe(true);
    expect(isSolidString(sWbemObjSets[0].Status)).toBe(true);
    // @TODO test the methods
  });

  testName = 'getLocalSharesObjs';
  test(testName, function () {
    var cmd, retObj;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), 'Dir for testing ' + testName);
    var sharedName = 'Temp shared ' + testName;
    var remark = 'Shared dir for testing ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(sharedName, sharedDir, 'READ', remark);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(sharedName, sharedDir);
    }

    // Checks the share non-existing
    var shareObjs = net.SMB.getLocalSharesObjs();

    var idx = shareObjs.findIndex(function (shareObj) {
      return shareObj.Name === sharedName;
    });
    expect(idx).toBe(-1);

    // Shares
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);

    // Tests
    shareObjs = net.SMB.getLocalSharesObjs();
    expect(isSolidArray(shareObjs)).toBe(true);

    idx = shareObjs.findIndex(function (shareObj) {
      return shareObj.Name === sharedName;
    });
    expect(idx).not.toBe(-1);

    expect(shareObjs[idx].Caption).toBe(remark);
    expect(shareObjs[idx].Description).toBe(remark);
    expect(shareObjs[idx].Name).toBe(sharedName);
    expect(shareObjs[idx].Path).toBe(sharedDir);
    expect(shareObjs[idx].Status).toBe('OK');

    // Clean
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);

    // Checks the share removed
    shareObjs = net.SMB.getLocalSharesObjs();

    idx = shareObjs.findIndex(function (shareObj) {
      return shareObj.Name === sharedName;
    });
    expect(idx).toBe(-1);
  });

  testName = 'existsShareName';
  test(testName, function () {
    var cmd, retObj;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), 'Dir for testing ' + testName);
    var sharedName = 'Temp shared ' + testName;
    var remark = 'Shared dir for testing ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(sharedName, sharedDir, 'READ', remark);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(sharedName, sharedDir);
    }

    // Checks the share non-existing
    expect(net.SMB.existsShareName(sharedName)).toBe(false);

    // Shares
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);

    // Tests
    expect(net.SMB.existsShareName(sharedName)).toBe(true);
    expect(net.SMB.existsShareName('admin$')).toBe(true);
    expect(net.SMB.existsShareName('c$')).toBe(true);
    expect(net.SMB.existsShareName('C$')).toBe(true);
    expect(net.SMB.existsShareName('MaybeNoneShared')).toBe(false);

    // Clean
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);

    // Checks the share removed
    expect(net.SMB.existsShareName(sharedName)).toBe(false);
  });

  testName = 'delSharedDirectory_dryRun';
  test(testName, function () {
    // Checks throwing error
    noneStrVals.forEach(function (val) {
      expect(_cb(net.SMB.delSharedDirectory, val)).toThrowError();
    });

    var sharedName = 'Temp shared ' + testName;
    var rtn;

    // dry-run
    rtn = net.SMB.delSharedDirectory(sharedName, { isDryRun: true });
    expect(rtn).toContain('dry-run');
    expect(rtn).toContain(CMD + ' /S /C"'
      + NET + ' share ' + srrd(sharedName) + ' /DELETE /YES 1>');
  });

  testName = 'delSharedDirectory';
  test(testName, function () {
    var cmd, retObj;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), 'Dir for testing ' + testName);
    var sharedName = 'Temp shared ' + testName;
    var remark = 'Shared dir for testing ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(sharedName, sharedDir, 'READ', remark);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return net.SMB.delSharedDirectory(sharedName);
    }

    // Shares
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);

    // Tests
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);

    expect(net.SMB.existsShareName(sharedName)).toBe(false);

    // Removes the directory
    fse.removeSync(sharedDir);
    expect(fs.existsSync(sharedDir)).toBe(false);
  });

  // Connection

  testName = '_getNetUseArgsStrToConnect';
  test(testName, function () {
    // Checks throwing error
    noneStrVals.forEach(function (val) {
      expect(_cb(net.SMB._getNetUseArgsStrToConnect, val)).toThrowError();
    });

    var comp;
    var share;
    var domain;
    var user;
    var pwd;
    var retArgsStr;

    comp = '11.22.33.44';
    share = 'Temp shared ' + testName;
    domain = '';
    user = 'User1';
    pwd = 'My p@sswo^d >_<';
    retArgsStr = net.SMB._getNetUseArgsStrToConnect(
      comp,
      share,
      domain,
      user,
      pwd
    );

    expect(retArgsStr).toBe([
      'use',
      srrd('\\\\' + comp + '\\' + share),
      srrd(escapeForCmd(pwd)),
      '/user:' + user,
      '/persistent:no'
    ].join(' '));
  });

  testName = 'connect_dryRun';
  test(testName, function () {
    // Checks throwing error
    noneStrVals.forEach(function (val) {
      expect(_cb(net.SMB.connect, val)).toThrowError();
    });

    var comp = '11.22.33.44';
    var shareName = 'Temp shared ' + testName;
    var domain = 'PCNAME';
    var user = 'UserId';
    var pwd = 'My * P@ss wo^d >_<';
    var rtn;

    // dry-run
    rtn = net.SMB.connect(comp, shareName, domain, user, pwd, {
      isDryRun: true
    });
    expect(rtn).toContain(srrd(NET) + ' use'
      + ' ' + srrd('\\\\' + comp + '\\' + shareName)
      + ' ' + srrd(escapeForCmd(pwd)) + ' /user:' + domain + '\\' + user
      + ' /persistent:no'
    );
  });

  testName = 'connect';
  test(testName, function () {
    var cmd, rtn;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), 'Dir for testing ' + testName);
    var sharedName = 'Temp shared ' + testName;
    var remark = 'Shared dir for testing ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(sharedName, sharedDir, 'READ', remark);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(sharedName, sharedDir);
    }

    // Shares
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    rtn = execSync(cmd, { runsAdmin: true });
    expect(rtn.error).toBe(false);

    // Connects
    rtn = net.SMB.connect(process.env.COMPUTERNAME, sharedName);

    // Checks
    var smbPath = '\\\\' + process.env.COMPUTERNAME + '\\' + sharedName;
    while (!fs.existsSync(smbPath)) WScript.Sleep(300); // Waiting the finished
    expect(fs.existsSync(smbPath)).toBe(true);

    rtn = execFileSync(NET, ['use']);
    expect(rtn.stdout.indexOf(smbPath)).not.toBe(-1); // @TODO

    // Cleans
    // Disconnect
    _disconnect(testName, sharedDir, smbPath);
    // Delete share
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    rtn = execSync(cmd, { runsAdmin: true });
    expect(rtn.error).toBe(false);
  });

  testName = 'connectSync_dryRun';
  test(testName, function () {
    // Checks throwing error
    noneStrVals.forEach(function (val) {
      expect(_cb(net.SMB.connectSync, val)).toThrowError();
    });

    var comp = '11.22.33.44';
    var sharedName = 'Temp shared ' + testName;
    var sharedPath = srrd('\\\\' + comp + '\\' + sharedName);
    var domain = 'PCNAME';
    var user = 'UserId';
    var pwd = 'My * P@ss wo^d >_<';
    var rtn;

    // dry-run
    rtn = net.SMB.connectSync(comp, sharedName, domain, user, pwd, {
      isDryRun: true
    });
    expect(rtn).toContain('dry-run [_shRun]: ' + CMD + ' /S /C"'
      + srrd(NET) + ' use ' + srrd(sharedPath)
      + ' ' + srrd(escapeForCmd(pwd)) + ' /user:' + domain + '\\' + user
      + ' /persistent:no 1>'
    );
  });

  testName = 'connectSync';
  test(testName, function () {
    var cmd, rtn;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), 'Dir for testing ' + testName);
    var sharedName = 'Temp shared ' + testName;
    var remark = 'Shared dir for testing ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(sharedName, sharedDir, 'READ', remark);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(sharedName, sharedDir);
    }

    // Sharing
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    rtn = execSync(cmd, { runsAdmin: true });
    expect(rtn.error).toBe(false);

    // Connecting
    rtn = net.SMB.connectSync(process.env.COMPUTERNAME, sharedName);

    // Checking
    var smbPath = '\\\\' + process.env.COMPUTERNAME + '\\' + sharedName;

    rtn = execFileSync(NET, ['use']);
    expect(rtn.stdout.indexOf(smbPath)).not.toBe(-1); // @TODO

    // Cleaning
    // Disconnecting
    _disconnect(testName, sharedDir, smbPath);
    // Deleting shared
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    rtn = execSync(cmd, { runsAdmin: true });
    expect(rtn.error).toBe(false);
  });

  testName = 'showCurrentSession';
  test(testName, function () {
    net.SMB.showCurrentSession();

    WScript.Echo('Is a result of `net share` CMD window showning?/y or Not');
    var ans = WScript.StdIn.ReadLine();
    expect(ans.toUpperCase()).toBe('Y');
  });

  testName = 'getActiveConnectionsSwbemObjs';
  test(testName, function () {
    var cmd, rtn;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), 'Dir for testing ' + testName);
    var sharedName = 'Temp shared ' + testName;
    var remark = 'Shared dir for testing ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(sharedName, sharedDir, 'READ', remark);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(sharedName, sharedDir);
    }

    // Sharing
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    rtn = execSync(cmd, { runsAdmin: true });
    expect(rtn.error).toBe(false);
    // Connecting
    var smbPath = _connect(testName, sharedDir, sharedName);

    // Testing
    // @NOTE Require execution as the Admin
    var sWbemObjSets = net.SMB.getActiveConnectionsSwbemObjs();
    expect(isSolidArray(sWbemObjSets)).toBe(true);

    var idx = sWbemObjSets.findIndex(function (connection) {
      return connection.Name === smbPath;
    });
    expect(idx).not.toBe(-1);
    expect(sWbemObjSets[idx].Caption).toBe('RESOURCE CONNECTED');
    expect(isSolidString(sWbemObjSets[idx].Description)).toBe(true);
    expect(sWbemObjSets[idx].Name).toBe(smbPath);
    expect(sWbemObjSets[idx].RemoteName).toBe(smbPath);
    expect(sWbemObjSets[idx].RemotePath).toBe(smbPath);
    expect(sWbemObjSets[idx].Persistent).toBeDefined();
    expect(sWbemObjSets[idx].Status).toBe('OK');
    // @TODO test the methods

    // Testing specifying an argument
    // @NOTE Require execution as the Admin
    sWbemObjSets = net.SMB.getActiveConnectionsSwbemObjs(sharedName + '$');
    expect(isSolidArray(sWbemObjSets)).toBe(true);

    expect(sWbemObjSets[0].Caption).toBe('RESOURCE CONNECTED');
    expect(isSolidString(sWbemObjSets[0].Description)).toBe(true);
    expect(sWbemObjSets[0].Name).toBe(smbPath);
    expect(sWbemObjSets[0].RemoteName).toBe(smbPath);
    expect(sWbemObjSets[0].RemotePath).toBe(smbPath);

    // Cleaning
    // Disconnecting
    _disconnect(testName, sharedDir, smbPath);
    // Deleting shared
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    rtn = execSync(cmd, { runsAdmin: true });
    expect(rtn.error).toBe(false);
  });

  testName = 'getActiveConnectionsObjs';
  test(testName, function () {
    var cmd, rtn;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), 'Dir for testing ' + testName);
    var sharedName = 'Temp shared ' + testName;
    var remark = 'Shared dir for testing ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(sharedName, sharedDir, 'READ', remark);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(sharedName, sharedDir);
    }

    // Sharing
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    rtn = execSync(cmd, { runsAdmin: true });
    expect(rtn.error).toBe(false);
    // Connecting
    var smbPath = _connect(testName, sharedDir, sharedName);

    // Testing
    var connections = net.SMB.getActiveConnectionsObjs();
    expect(isSolidArray(connections)).toBe(true);

    var idx = connections.findIndex(function (connection) {
      return connection.Name === smbPath;
    });
    expect(idx).not.toBe(-1);

    expect(connections[idx].Caption).toBe('RESOURCE CONNECTED');
    expect(isSolidString(connections[idx].Description)).toBe(true);
    expect(connections[idx].Name).toBe(smbPath);
    expect(connections[idx].RemoteName).toBe(smbPath);
    expect(connections[idx].RemotePath).toBe(smbPath);
    expect(connections[idx].Persistent).toBeDefined();
    expect(connections[idx].Status).toBe('OK');

    // Testing specifying an argument
    connections = net.SMB.getActiveConnectionsObjs(sharedName + '$');
    expect(isSolidArray(connections)).toBe(true);

    expect(connections[0].Caption).toBe('RESOURCE CONNECTED');
    expect(isSolidString(connections[0].Description)).toBe(true);
    expect(connections[0].Name).toBe(smbPath);
    expect(connections[0].RemoteName).toBe(smbPath);
    expect(connections[0].RemotePath).toBe(smbPath);

    // Cleaning
    // Disconnecting
    _disconnect(testName, sharedDir, smbPath);
    // Deleting share
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    rtn = execSync(cmd, { runsAdmin: true });
    expect(rtn.error).toBe(false);
  });

  testName = 'hasConnection';
  test(testName, function () {
    var cmd, rtn;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), 'Dir for testing ' + testName);
    var sharedName = 'Temp shared ' + testName;
    var remark = 'Shared dir for testing ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(sharedName, sharedDir, 'READ', remark);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(sharedName, sharedDir);
    }

    // Checks throwing error
    noneStrVals.forEach(function (val) {
      expect(_cb(net.SMB.hasConnection, val)).toThrowError();
    });
    // Checks the connection non-existing
    expect(net.SMB.hasConnection(sharedName)).toBe(false);

    // Sharing
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    rtn = execSync(cmd, { runsAdmin: true });
    expect(rtn.error).toBe(false);
    // Connecting
    var smbPath = _connect(testName, sharedDir, sharedName);

    // Testing
    // @NOTE Require execution as the Admin
    expect(net.SMB.hasConnection(smbPath)).toBe(true);

    // Cleaning
    // Disconnecting
    _disconnect(testName, sharedDir, smbPath);
    // Deleting share
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    rtn = execSync(cmd, { runsAdmin: true });
    expect(rtn.error).toBe(false);

    // Checking the connection removed
    expect(net.SMB.hasConnection(sharedName)).toBe(false);
  });

  testName = '_getNetUseArgsStrToDisconnect';
  test(testName, function () {
    var args;

    args = net.SMB._getNetUseArgsStrToDisconnect();
    expect(args).toEqual('use * /delete /yes');

    args = net.SMB._getNetUseArgsStrToDisconnect('comp');
    expect(args).toEqual('use \\\\comp /delete /yes');

    args = net.SMB._getNetUseArgsStrToDisconnect('comp', 'shareName');
    expect(args).toEqual('use \\\\comp\\shareName /delete /yes');
  });

  testName = 'disconnect_dryRun';
  test(testName, function () {
    var comp = '11.22.33.44';
    var shareName = 'Temp shared ' + testName;
    var rtn;

    // dry-run
    rtn = net.SMB.disconnect(comp, shareName, { isDryRun: true });
    expect(rtn).toContain(srrd(NET) + ' use'
      + ' ' + srrd('\\\\' + comp + '\\' + shareName) + ' /delete /yes'
    );
  });

  testName = 'disconnect';
  test(testName, function () {
    var cmd, rtn;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), 'Dir for testing ' + testName);
    var sharedName = 'Temp shared ' + testName;
    var remark = 'Shared dir for testing ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(sharedName, sharedDir, 'READ', remark);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(sharedName);
    }

    // Sharing
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    rtn = execSync(cmd, { runsAdmin: true });
    expect(rtn.error).toBe(false);
    // Connecting
    var smbPath = _connect(testName, sharedDir, sharedName);
    // @NOTE Require execution as the Admin
    expect(net.SMB.hasConnection(smbPath)).toBe(true);

    // Testing
    net.SMB.disconnect(process.env.COMPUTERNAME, sharedName);

    while (!net.SMB.hasConnection(smbPath)) WScript.Sleep(300); // Waiting

    // Cleaning
    // Deleting the share directory
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    rtn = execSync(cmd, { runsAdmin: true });
    expect(rtn.error).toBe(false);
  });

  testName = 'disconnectSync_dryRun';
  test(testName, function () {
    var comp = '11.22.33.44';
    var sharedName = 'Temp shared ' + testName;
    var sharedPath = srrd('\\\\' + comp + '\\' + sharedName);
    var rtn;

    // dry-run
    rtn = net.SMB.disconnectSync(comp, sharedName, { isDryRun: true });
    expect(rtn).toContain('dry-run [_shRun]: ' + CMD + ' /S /C"'
      + srrd(NET) + ' use ' + srrd(sharedPath) + ' /delete /yes 1>'
    );
  });

  testName = 'disconnectSync';
  test(testName, function () {
    var cmd, rtn;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), 'Dir for testing ' + testName);
    var sharedName = 'Temp shared ' + testName;
    var remark = 'Shared dir for testing ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(sharedName, sharedDir, 'READ', remark);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(sharedName);
    }

    // Sharing
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    rtn = execSync(cmd, { runsAdmin: true });
    expect(rtn.error).toBe(false);
    // Connecting
    var smbPath = _connect(testName, sharedDir, sharedName);
    // @NOTE Require execution as the Admin
    expect(net.SMB.hasConnection(smbPath)).toBe(true);

    // Testing
    net.SMB.disconnectSync(process.env.COMPUTERNAME, sharedName);
    expect(net.SMB.hasConnection(smbPath)).toBe(false);

    // Cleaning
    // Deleting the share directory
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    rtn = execSync(cmd, { runsAdmin: true });
    expect(rtn.error).toBe(false);
  });

  testName = 'connectSyncSurely_dryRun';
  test(testName, function () {
    // Checks throwing error
    noneStrVals.forEach(function (val) {
      expect(_cb(net.SMB.connectSyncSurely, val)).toThrowError();
    });

    var comp = '11.22.33.44';
    var shareName = 'Temp shared ' + testName;
    var sharedPath = srrd('\\\\' + comp + '\\' + shareName);
    var domain = 'PCNAME';
    var user = 'UserId';
    var pwd = 'My * P@ss wo^d >_<';
    var rtn;

    // dry-run
    rtn = net.SMB.connectSyncSurely(comp, shareName, domain, user, pwd, {
      isDryRun: true
    });
    expect(rtn).toContain('dry-run [_shRun]: ' + CMD + ' /S /C"'
      + srrd(NET) + ' use ' + srrd(sharedPath) + ' /delete /yes 1>'
    );
    expect(rtn).toContain('dry-run [_shRun]: ' + CMD + ' /S /C"'
      + srrd(NET) + ' use ' + srrd(sharedPath)
      + ' ' + srrd(escapeForCmd(pwd)) + ' /user:' + domain + '\\' + user
      + ' /persistent:no 1>'
    );
  });

  testName = 'connectSyncSurely';
  test(testName, function () {
    var cmd, rtn;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), 'Dir for testing ' + testName);
    var sharedName = 'Temp shared ' + testName;
    var remark = 'Shared dir for testing ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(sharedName, sharedDir, 'READ', remark);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(sharedName, sharedDir);
    }

    // Sharing
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    rtn = execSync(cmd, { runsAdmin: true });
    expect(rtn.error).toBe(false);

    // Connecting
    net.SMB.connectSyncSurely(process.env.COMPUTERNAME, sharedName);

    // Checking
    var smbPath = '\\\\' + process.env.COMPUTERNAME + '\\' + sharedName;
    // @NOTE Require execution as the Admin
    expect(net.SMB.hasConnection(smbPath)).toBe(true);

    // Re-connecting
    net.SMB.connectSyncSurely(process.env.COMPUTERNAME, sharedName);
    expect(net.SMB.hasConnection(smbPath)).toBe(true);

    // Cleaning
    // Disconnecting
    _disconnect(testName, sharedDir, smbPath);
    // Deleting share
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    rtn = execSync(cmd, { runsAdmin: true });
    expect(rtn.error).toBe(false);
  });
});
