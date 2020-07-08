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

var insp = util.inspect;
var isSolidArray = util.isSolidArray;
var isSolidString = util.isSolidString;
var includes = util.includes;
var endsWith = util.startsWith;
var hasContent = util.hasContent;
var isSameMeaning = util.isSameMeaning;
var srr = os.surroundPath;
var CSCRIPT = os.exefiles.cscript;
var NET = os.exefiles.net;
var execSync = child_process.execSync;
var execFileSync = child_process.execFileSync;

var noneStrVals = [true, false, undefined, null, 0, 1, NaN, Infinity, [], {}];
var noneObjVals = [true, false, undefined, null, 0, 1, NaN, Infinity, [], ''];
var testCmd = srr(CSCRIPT) + ' ' + srr(__filename) + ' //job:test:SMB';

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
    // console.dir(retObj);

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
    // console.dir(retObj);

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
  // console.dir(retObj);

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

  testName = 'shareDirectory_READ';
  test(testName, function () {
    var cmd, retObj;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), testName + '_testDir');
    var SHARED_NAME = 'ShareName_' + testName;
    var REMARK = 'Share for ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(SHARED_NAME, sharedDir, 'READ', REMARK);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(SHARED_NAME, sharedDir);
    }

    // Shares
    // Checks throwing error
    noneStrVals.forEach(function (val) {
      expect(_cb(net.SMB.shareDirectory, val)).toThrowError();
      expect(_cb(net.SMB.shareDirectory, 'SharedName', val)).toThrowError();
    });
    // Checks whether throwing an error if non-admin
    if (!process.isAdmin()) {
      expect(_cb(net.SMB.shareDirectory, SHARED_NAME, sharedDir,
        { grant: 'READ', remark: testName })).toThrowError();
    }

    // Runs the admin process and Do the test function in it
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);

    // Checks to access
    var smbDirPath = '\\\\' + process.env.COMPUTERNAME + '\\' + SHARED_NAME;
    expect(fs.existsSync(smbDirPath)).toBe(true);

    var smbNewDir = path.join(smbDirPath, 'NewDir');
    expect(_cb(fs.mkdirSync, smbNewDir)).toThrowError();

    // Clearn
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);
  });

  testName = 'shareDirectory_CHANGE';
  test(testName, function () {
    var cmd, retObj;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), testName + '_testDir');
    var SHARED_NAME = 'ShareName_' + testName;
    var REMARK = 'Share for ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(SHARED_NAME, sharedDir, 'CHANGE', REMARK);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(SHARED_NAME, sharedDir);
    }

    // Shares
    // Checks throwing error
    noneStrVals.forEach(function (val) {
      expect(_cb(net.SMB.shareDirectory, val)).toThrowError();
      expect(_cb(net.SMB.shareDirectory, 'SharedName', val)).toThrowError();
    });
    // Checks whether throwing an error if non-admin
    if (!process.isAdmin()) {
      expect(_cb(net.SMB.shareDirectory, SHARED_NAME, sharedDir,
        { grant: 'CHANGE', remark: testName })).toThrowError();
    }

    // Runs the admin process and Do the test function in it
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);

    // Checks to access
    var smbDirPath = '\\\\' + process.env.COMPUTERNAME + '\\' + SHARED_NAME;
    expect(fs.existsSync(smbDirPath)).toBe(true);

    var smbNewDir = path.join(smbDirPath, 'NewDir');
    fs.mkdirSync(smbNewDir);
    expect(fs.existsSync(smbNewDir)).toBe(true);

    fs.rmdirSync(smbNewDir);
    expect(fs.existsSync(smbNewDir)).toBe(false);

    // Clearn
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

    var sharedDir = path.join(os.tmpdir(), testName + '_testDir');
    var SHARED_NAME = 'ShareName_' + testName;
    var REMARK = 'Share for ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(SHARED_NAME, sharedDir, 'READ', REMARK);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(SHARED_NAME, sharedDir);
    }

    // Checks the share non-existing
    var shareObjs = net.SMB.getLocalSharesObjs();

    var idx = shareObjs.findIndex(function (shareObj) {
      return shareObj.Name === SHARED_NAME;
    });
    expect(idx).toBe(-1);

    // Shares
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);

    // Tests
    shareObjs = net.SMB.getLocalSharesObjs();
    expect(isSolidArray(shareObjs)).toBe(true);
    // console.dir(shareObjs);

    idx = shareObjs.findIndex(function (shareObj) {
      return shareObj.Name === SHARED_NAME;
    });
    expect(idx).not.toBe(-1);

    expect(shareObjs[idx].Caption).toBe(REMARK);
    expect(shareObjs[idx].Description).toBe(REMARK);
    expect(shareObjs[idx].Name).toBe(SHARED_NAME);
    expect(shareObjs[idx].Path).toBe(sharedDir);
    expect(shareObjs[idx].Status).toBe('OK');

    // Clearn
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);

    // Checks the share removed
    shareObjs = net.SMB.getLocalSharesObjs();

    idx = shareObjs.findIndex(function (shareObj) {
      return shareObj.Name === SHARED_NAME;
    });
    expect(idx).toBe(-1);
  });

  testName = 'existsShareName';
  test(testName, function () {
    var cmd, retObj;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), testName + '_testDir');
    var SHARED_NAME = 'ShareName_' + testName;
    var REMARK = 'Share for ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(SHARED_NAME, sharedDir, 'READ', REMARK);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(SHARED_NAME, sharedDir);
    }

    // Checks the share non-existing
    expect(net.SMB.existsShareName(SHARED_NAME)).toBe(false);

    // Shares
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);

    // Tests
    expect(net.SMB.existsShareName(SHARED_NAME)).toBe(true);
    expect(net.SMB.existsShareName('admin$')).toBe(true);
    expect(net.SMB.existsShareName('c$')).toBe(true);
    expect(net.SMB.existsShareName('C$')).toBe(true);
    expect(net.SMB.existsShareName('MaybeNoneShared')).toBe(false);

    // Clearn
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);

    // Checks the share removed
    expect(net.SMB.existsShareName(SHARED_NAME)).toBe(false);
  });

  testName = 'delSharedDirectory';
  test(testName, function () {
    var cmd, retObj;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), testName + '_testDir');
    var SHARED_NAME = 'ShareName_' + testName;
    var REMARK = 'Share for ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(SHARED_NAME, sharedDir, 'READ', REMARK);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return net.SMB.delSharedDirectory(SHARED_NAME);
    }

    // Shares
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);

    // Tests
    // Checks throwing error
    noneStrVals.forEach(function (val) {
      expect(_cb(net.SMB.delSharedDirectory, val)).toThrowError();
    });
    // Checks whether throwing an error if non-admin
    if (!process.isAdmin()) {
      expect(_cb(net.SMB.shareDirectory, SHARED_NAME, sharedDir,
        { grant: 'READ', remark: testName })).toThrowError();
    }

    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);

    expect(net.SMB.existsShareName(SHARED_NAME)).toBe(false);

    // Removes the directory
    fse.removeSync(sharedDir);
    expect(fs.existsSync(sharedDir)).toBe(false);
  });

  // Connection

  testName = 'connect';
  test(testName, function () {
    var cmd, retObj;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), testName + '_testDir');
    var SHARED_NAME = 'ShareName_' + testName;
    var REMARK = 'Share for ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(SHARED_NAME, sharedDir, 'READ', REMARK);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(SHARED_NAME, sharedDir);
    }

    // Shares
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);

    // Connects
    retObj = net.SMB.connect(process.env.COMPUTERNAME, SHARED_NAME);
    // console.dir(retObj);

    // Checks
    var smbPath = '\\\\' + process.env.COMPUTERNAME + '\\' + SHARED_NAME;
    while (!fs.existsSync(smbPath)) WScript.Sleep(300); // Waiting the finished
    expect(fs.existsSync(smbPath)).toBe(true);

    retObj = execFileSync(NET, ['use']);
    // console.dir(retObj);
    expect(retObj.stdout.indexOf(smbPath)).not.toBe(-1); // @TODO

    // Cleans
    // Disconnect
    _disconnect(testName, sharedDir, smbPath);
    // Delete share
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);
  });

  testName = 'connectSync';
  test(testName, function () {
    var cmd, retObj;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), testName + '_testDir');
    var SHARED_NAME = 'ShareName_' + testName;
    var REMARK = 'Share for ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(SHARED_NAME, sharedDir, 'READ', REMARK);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(SHARED_NAME, sharedDir);
    }

    // Shares
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);

    // Connects
    retObj = net.SMB.connectSync(process.env.COMPUTERNAME, SHARED_NAME);
    // console.dir(retObj);

    // Checks
    var smbPath = '\\\\' + process.env.COMPUTERNAME + '\\' + SHARED_NAME;

    retObj = execFileSync(NET, ['use']);
    expect(retObj.stdout.indexOf(smbPath)).not.toBe(-1); // @TODO

    // Cleans
    // Disconnect
    _disconnect(testName, sharedDir, smbPath);
    // Delete share
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);
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
    var cmd, retObj;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), testName + '_testDir');
    var SHARED_NAME = 'ShareName_' + testName;
    var REMARK = 'Share for ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(SHARED_NAME, sharedDir, 'READ', REMARK);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(SHARED_NAME, sharedDir);
    }

    // Shares
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);
    // Connects
    var smbPath = _connect(testName, sharedDir, SHARED_NAME);

    // Tests
    var sWbemObjSets = net.SMB.getActiveConnectionsSwbemObjs();
    expect(isSolidArray(sWbemObjSets)).toBe(true);
    // console.dir(sWbemObjSets);

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

    // Test specifying argument
    sWbemObjSets = net.SMB.getActiveConnectionsSwbemObjs(SHARED_NAME + '$');
    expect(isSolidArray(sWbemObjSets)).toBe(true);
    // console.dir(sWbemObjSets);

    expect(sWbemObjSets[0].Caption).toBe('RESOURCE CONNECTED');
    expect(isSolidString(sWbemObjSets[0].Description)).toBe(true);
    expect(sWbemObjSets[0].Name).toBe(smbPath);
    expect(sWbemObjSets[0].RemoteName).toBe(smbPath);
    expect(sWbemObjSets[0].RemotePath).toBe(smbPath);

    // Cleans
    // Disconnect
    _disconnect(testName, sharedDir, smbPath);
    // Delete share
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);
  });

  testName = 'getActiveConnectionsObjs';
  test(testName, function () {
    var cmd, retObj;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), testName + '_testDir');
    var SHARED_NAME = 'ShareName_' + testName;
    var REMARK = 'Share for ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(SHARED_NAME, sharedDir, 'READ', REMARK);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(SHARED_NAME, sharedDir);
    }

    // Shares
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);
    // Connects
    var smbPath = _connect(testName, sharedDir, SHARED_NAME);

    // Tests
    var connections = net.SMB.getActiveConnectionsObjs();
    expect(isSolidArray(connections)).toBe(true);
    // console.dir(connections);

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

    // Test specifying argument
    connections = net.SMB.getActiveConnectionsObjs(SHARED_NAME + '$');
    expect(isSolidArray(connections)).toBe(true);
    // console.dir(connections);

    expect(connections[0].Caption).toBe('RESOURCE CONNECTED');
    expect(isSolidString(connections[0].Description)).toBe(true);
    expect(connections[0].Name).toBe(smbPath);
    expect(connections[0].RemoteName).toBe(smbPath);
    expect(connections[0].RemotePath).toBe(smbPath);

    // Cleans
    // Disconnect
    _disconnect(testName, sharedDir, smbPath);
    // Delete share
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);
  });

  testName = 'hasConnection';
  test(testName, function () {
    var cmd, retObj;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), testName + '_testDir');
    var SHARED_NAME = 'ShareName_' + testName;
    var REMARK = 'Share for ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(SHARED_NAME, sharedDir, 'READ', REMARK);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(SHARED_NAME, sharedDir);
    }

    // Checks throwing error
    noneStrVals.forEach(function (val) {
      expect(_cb(net.SMB.hasConnection, val)).toThrowError();
    });
    // Checks the connection non-existing
    expect(net.SMB.hasConnection(SHARED_NAME)).toBe(false);

    // Shares
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);
    // Connects
    var smbPath = _connect(testName, sharedDir, SHARED_NAME);

    // Tests
    expect(net.SMB.hasConnection(smbPath)).toBe(true);

    // Cleans
    // Disconnect
    _disconnect(testName, sharedDir, smbPath);
    // Delete share
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);

    // Checks the connection removed
    expect(net.SMB.hasConnection(SHARED_NAME)).toBe(false);
  });

  testName = 'disconnect';
  test(testName, function () {
    var cmd, retObj;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), testName + '_testDir');
    var SHARED_NAME = 'ShareName_' + testName;
    var REMARK = 'Share for ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(SHARED_NAME, sharedDir, 'READ', REMARK);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(SHARED_NAME);
    }

    // Shares
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);
    // Connects
    var smbPath = _connect(testName, sharedDir, SHARED_NAME);
    expect(net.SMB.hasConnection(smbPath)).toBe(true);

    // Tests
    net.SMB.disconnect(process.env.COMPUTERNAME, SHARED_NAME);

    while (!net.SMB.hasConnection(smbPath)) WScript.Sleep(300); // Waiting

    // Cleans
    // Deletes the share directory
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);
  });

  testName = 'disconnectSync';
  test(testName, function () {
    var cmd, retObj;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), testName + '_testDir');
    var SHARED_NAME = 'ShareName_' + testName;
    var REMARK = 'Share for ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(SHARED_NAME, sharedDir, 'READ', REMARK);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(SHARED_NAME);
    }

    // Shares
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);
    // Connects
    var smbPath = _connect(testName, sharedDir, SHARED_NAME);
    expect(net.SMB.hasConnection(smbPath)).toBe(true);

    // Tests
    net.SMB.disconnectSync(process.env.COMPUTERNAME, SHARED_NAME);
    expect(net.SMB.hasConnection(smbPath)).toBe(false);

    // Cleans
    // Deletes the share directory
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);
  });

  testName = 'connectSyncSurely';
  test(testName, function () {
    var cmd, retObj;

    var ARG_SHARE_PROCESS = '/SHARE_PROCESS' + testName;
    var ARG_DELTE_PROCESS = '/DELTE_PROCESS' + testName;

    var sharedDir = path.join(os.tmpdir(), testName + '_testDir');
    var SHARED_NAME = 'ShareName_' + testName;
    var REMARK = 'Share for ' + testName;

    if (includes(process.argv, ARG_SHARE_PROCESS)) {
      return _shareDir(SHARED_NAME, sharedDir, 'READ', REMARK);
    } else if (includes(process.argv, ARG_DELTE_PROCESS)) {
      return _delShareDir(SHARED_NAME, sharedDir);
    }

    // Shares
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_SHARE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);

    // Connects
    net.SMB.connectSyncSurely(process.env.COMPUTERNAME, SHARED_NAME);

    // Checks
    var smbPath = '\\\\' + process.env.COMPUTERNAME + '\\' + SHARED_NAME;
    expect(net.SMB.hasConnection(smbPath)).toBe(true);

    // Re-connects
    net.SMB.connectSyncSurely(process.env.COMPUTERNAME, SHARED_NAME);
    expect(net.SMB.hasConnection(smbPath)).toBe(true);

    // Cleans
    // Disconnect
    _disconnect(testName, sharedDir, smbPath);
    // Delete share
    cmd = testCmd + ' -t ' + testName + ' ' + ARG_DELTE_PROCESS;
    retObj = execSync(cmd, { runsAdmin: true });
    expect(retObj.error).toBe(false);
  });
});
