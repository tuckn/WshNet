/* globals Wsh: false */
/* globals process: false */

(function () {
  if (Wsh && Wsh.Net.SMB) return;

  /**
   * This module provides useful WSH (Windows Script Host) functions that handle SMB (Server Message Block), CIFS(Common Internet File System) on Windows.
   *
   * @namespace SMB
   * @memberof Wsh.Net
   * @requires ./Net.js
   */
  Wsh.Net.SMB = {};

  // Shorthands
  var util = Wsh.Util;
  var os = Wsh.OS;
  var fs = Wsh.FileSystem;
  var child_process = Wsh.ChildProcess;
  var net = Wsh.Net;

  var insp = util.inspect;
  var obtain = util.obtainPropVal;
  var isSolidArray = util.isSolidArray;
  var isSolidString = util.isSolidString;
  var isSameMeaning = util.isSameMeaning;
  var NET = os.exefiles.net;
  var srrPath = os.surroundPath;
  var execFile = child_process.execFile;
  var execFileSync = child_process.execFileSync;

  /** @constant {string} */
  var MODULE_TITLE = 'WshNet/SMB.js';

  var throwErrNonStr = function (functionName, typeErrVal) {
    util.throwTypeError('string', MODULE_TITLE, functionName, typeErrVal);
  };

  var throwErrNonExist = function (functionName, typeErrVal) {
    fs.throwTypeErrorNonExisting(MODULE_TITLE, functionName, typeErrVal);
  };

  /**
   * Windows system-specific end-of-line marker. Similar to {@link https://nodejs.org/api/os.html#os_os_eol|Node.js OS}.
   *
   * @name IPC
   * @memberof Wsh.Net.SMB
   * @constant {string}
   */
  net.SMB.IPC = 'IPC$';

  // Share

  // net.SMB.shareDirectory {{{
  /**
   * [Requires admin rights] Shares the directory of this Windows.
   *
   * @example
   * var smb = Wsh.Net.SMB; // Shorthand
   *
   * smb.shareDirectory('MyShareName', 'D:\\sharedFolder', {
   *   grant: 'READ',
   *   remark: 'Share for example'
   * });
   * // Returns a result object executed `net share` command.
   * @function shareDirectory
   * @memberof Wsh.Net.SMB
   * @param {string} shareName - The share name.
   * @param {string} dirPath - The directory path to share.
   * @param {object} [options] - Optional parameters.
   * @param {string} [options.userName='Everyone'] - The user name with which to access.
   * @param {string} [options.grant='READ'] - READ, CHANGE(Can not controll authority), FULL.
   * @param {string} [options.remark=''] - Annotation.
   * @param {boolean} [options.isDryRun=false] - No execute, returns the string of command.
   * @returns {object|string} - See {@link https://docs.tuckn.net/WshChildProcess/global.html#typeRunSyncReturn|typeRunSyncReturn}. If options.isDryRun is true, returns string.
   */
  net.SMB.shareDirectory = function (shareName, dirPath, options) {
    var FN = 'net.SMB.shareDirectory';
    if (!isSolidString(shareName)) throwErrNonStr(FN, shareName);
    if (!isSolidString(dirPath)) throwErrNonStr(FN, dirPath);
    if (!fs.statSync(dirPath).isDirectory()) {
      throwErrNonExist(FN, dirPath);
    }

    var args = ['share', srrPath(shareName) + '=' + srrPath(dirPath)];

    var userName = obtain(options, 'userName', 'Everyone');
    var grant = obtain(options, 'grant', 'READ');
    if (isSolidString(userName) && isSolidString(grant)) {
      args.push('/GRANT:' + userName + ',' + grant);
    }

    var remark = obtain(options, 'remark', '');
    if (isSolidString(remark)) {
      args.push('/REMARK:' + remark);
    }

    var isDryRun = obtain(options, 'isDryRun', false);

    /*
     * @note net share Cdrive=C:\ /GRANT:UserName,read
     *  [Success]
          ExitCode: 0,
          StdOut: "Cdrv が共有されました。"
          StdErr: ""
     *  [Error: Permission]
          ExitCode: ?,
          StdOut: ""
          StdErr: "システム エラー 5 が発生しました。"
     *  [Error: The existing share name]
          ExitCode: 2,
          StdOut: ""
          StdErr: "名前は既に共有されています。
            NET HELPMSG 2118 と入力すると、より詳しい説明が得られます。"
     */
    return execFileSync(NET, args, {
      runsAdmin: true,
      winStyle: 'hidden',
      isDryRun: isDryRun
    });
  }; // }}}

  // net.SMB.showLocalShares {{{
  /**
   * Shows a window of the local shared folders.
   *
   * @example
   * var smb = Wsh.Net.SMB; // Shorthand
   *
   * smb.showLocalShares(); // Shows a window
   * @function showLocalShares
   * @memberof Wsh.Net.SMB
   * @returns {void}
   */
  net.SMB.showLocalShares = function () {
    execFile(NET, ['share'], { shell: true, closes: false });
  }; // }}}

  // net.SMB.getLocalSharesSWbemObjs {{{
  /**
   * Gets an Array of Enumerated-SWbemObjectSet of shared resources on the Windows. See {@link https://docs.microsoft.com/en-us/windows/win32/cimwin32prov/win32-share|Win32_Share class}.
   *
   * @example
   * var smb = Wsh.Net.SMB; // Shorthand
   *
   * smb.getLocalSharesSWbemObjs();
   * // Returns: An Array of {@link https://docs.microsoft.com/en-us/windows/win32/cimwin32prov/win32-share|Win32_Share class}.
   * @function getLocalSharesSWbemObjs
   * @memberof Wsh.Net.SMB
   * @returns {sWbemObjectSet[]} - Enumerated SWbemObjectSets. See {@link https://docs.microsoft.com/en-us/windows/win32/cimwin32prov/win32-share|Win32_Share class}.
   */
  net.SMB.getLocalSharesSWbemObjs = function () {
    // var FN = 'net.SMB.getLocalSharesSWbemObjs';
    var query = 'SELECT * FROM Win32_Share';
    var sWbemObjSets = os.WMI.execQuery(query);
    return sWbemObjSets;
  }; // }}}

  // net.SMB.getLocalSharesObjs {{{
  /**
   * @typedef {object} typeWin32ShareClassProps
   * @property {string} Caption
   * @property {string} Description
   * @property {Date|null} InstallDate
   * @property {string} Status
   * @property {number|null} AccessMask
   * @property {boolean}  AllowMaximum
   * @property {number|null} MaximumAllowed
   * @property {string} Name
   * @property {string} Path
   * @property {number} Type
   */

  /**
   * Gets an Array of the shared resource objects on the Windows.
   *
   * @example
   * var smb = Wsh.Net.SMB; // Shorthand
   *
   * var resources = smb.getLocalSharesObjs();
   * console.dir(resources);
   * // Outputs: [
   * // {
   * //   AccessMask: null,
   * //   AllowMaximum: true,
   * //   Caption: "Remote Admin",
   * //   Description: "Remote Admin",
   * //   InstallDate: null,
   * //   MaximumAllowed: null,
   * //   Name: "ADMIN$",
   * //   Path: "C:\WINDOWS",
   * //   Status: "OK",
   * //   Type: -2147483648
   * // }, {
   * //   ...
   * //   ..
   * // }, {
   * //   AccessMask: null,
   * //   AllowMaximum: true,
   * //   Caption: "shareDirectory",
   * //   Description: "shareDirectory",
   * //   InstallDate: null,
   * //   MaximumAllowed: null,
   * //   Name: "shareDirectory",
   * //   Path: "C:\Users\UserName\AppData\Local\Temp\shareDirectory_testDir",
   * //   Status: "OK",
   * //   Type: 0 }]
   * @function getLocalSharesObjs
   * @memberof Wsh.Net.SMB
   * @returns {typeWin32ShareClassProps[]} - An Array of the shared resource objects.
   */
  net.SMB.getLocalSharesObjs = function () {
    var sWbemObjSets = net.SMB.getLocalSharesSWbemObjs();
    return os.WMI.toJsObjects(sWbemObjSets);
  }; // }}}

  // net.SMB.existsShareName {{{
  /**
   * Checks whether the shared name is defined.
   *
   * @example
   * var smb = Wsh.Net.SMB; // Shorthand
   *
   * smb.existsShareName('MyShareName'); // Returns: true
   * @function existsShareName
   * @memberof Wsh.Net.SMB
   * @param {string} shareName - The shared name to check.
   * @returns {boolean} - If defined, returns true.
   */
  net.SMB.existsShareName = function (shareName) {
    var FN = 'net.SMB.existsShareName';
    if (!isSolidString(shareName)) throwErrNonStr(FN, shareName);

    var shareObjs = net.SMB.getLocalSharesObjs();

    return shareObjs.some(function (shareObj) {
      return isSameMeaning(shareObj.Name, shareName);
    });
  }; // }}}

  // net.SMB.delSharedDirectory {{{
  /**
   * [Requires admin rights] Deletes the share directory in this PC.
   *
   * @example
   * var smb = Wsh.Net.SMB; // Shorthand
   *
   * smb.delSharedDirectory('MyShareName');
   * // Returns a result object executed `net share` command.
   * @function delSharedDirectory
   * @memberof Wsh.Net.SMB
   * @param {string} shareName - The share name to delete.
   * @param {object} [options] - Optional parameters.
   * @param {boolean} [options.isDryRun=false] - No execute, returns the string of command.
   * @returns {object|string} - See {@link https://docs.tuckn.net/WshChildProcess/global.html#typeRunSyncReturn|typeRunSyncReturn}. If options.isDryRun is true, returns string.
   */
  net.SMB.delSharedDirectory = function (shareName, options) {
    var FN = 'net.SMB.delSharedDirectory';
    if (!isSolidString(shareName)) throwErrNonStr(FN, shareName);

    /*
     * @note /yesで強制的に共有を削除する(help(/?)には載っていない!
     * これ入れないと
C:\>net share Cdrv /delete
ユーザーは Cdrv でファイルを開いています。操作を続行すると、
強制的にファイルを閉じます。
この操作を続行しますか? (Y/N) [N]:
     * に応答できずスクリプトが終了しなくなる。
     */
    var args = ['share', shareName, '/DELETE', '/YES'];

    var isDryRun = obtain(options, 'isDryRun', false);

    /*
     * @note `net share Rdrv /delete`
     *  [成功時]
          ExitCode: 0,
          StdOut: "Rdrv が削除されました。"
          StdErr: ""
     *  [その共有が存在しない時]
          ExitCode: 2,
          StdOut: ""
          StdErr: "この共有リソースは存在しません。
            NET HELPMSG 2310 と入力すると、より詳しい説明が得られます。"
     */
    return execFileSync(NET, args, {
      runsAdmin: true,
      winStyle: 'hidden',
      isDryRun: isDryRun
    });
  }; // }}}

  // Connection

  // net.SMB._getNetUseArgsToConnect {{{
  /**
   * Gets net use args to connect a comp to the share resource. {@link https://technet.microsoft.com/ja-jp/library/gg651155(v=ws.10).aspx|Microsoft Docs}. {@link https://docs.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/gg651155(v%3Dws.11)|Microsoft Docs}
   *
   * @private
   * @param {string} comp - The computer name.
   * @param {string} [shareName='IPC$'] - The share name.
   * @param {string} [domain=''] - The domain name. If it is empty, uses the current logged on domain.
   * @param {string} [user] - The user name with which to log on.
   * @param {string} [pwd] - The password. *: produce a prompt for the password.
   * @returns {string[]}
   */
  net.SMB._getNetUseArgsToConnect = function (comp, shareName, domain, user, pwd) {
    var FN = 'net.SMB._getNetUseArgsToConnect';
    if (!isSolidString(comp)) throwErrNonStr(FN, comp);

    var args = ['use'];

    if (isSolidString(shareName)) {
      args.push('\\\\' + comp + '\\' + shareName); // Shared Name
    } else {
      args.push('\\\\' + comp + '\\' + net.SMB.IPC);
    }

    // @TODO Get a password with a hidden dialog?
    // if (!isSolidString(pwd)) {
    //   throwErrNonStr(FN, pwd);
    // }

    if (isSolidString(pwd)) args.push(pwd);

    if (isSolidString(user)) {
      if (isSolidString(domain)) {
        args.push('/user:' + domain + '\\' + user);
      } else {
        args.push('/user:' + user);
      }
    }

    args.push('/persistent:no'); // presistent: ->Save this connection
    // console.log(args); // Debug

    return args;
  }; // }}}

  // net.SMB.connect {{{
  /**
   * Asynchronously connects the Windows to the network shared resource.
   *
   * @example
   * var smb = Wsh.Net.SMB; // Shorthand
   *
   * smb.connect('MyNas', null, null, 'nas-user1', 'usrP@ss');
   * // Returns a number immediately and asynchronously executes:
   * // `net.exe use \\\\MyNas\\IPC$ usrP@ss /user:nas-user1`
   *
   * smb.connect('11.22.33.44', 'public', 'PCNAME', 'UserId', 'usrP@ss');
   * // Returns a number immediately and asynchronously executes:
   * // `net.exe use \\\\11.22.33.44\\public usrP@ss /user:PCNAME\UserId`
   * @function connect
   * @memberof Wsh.Net.SMB
   * @param {string} comp - The computer name or IP address.
   * @param {string} [shareName='IPC$'] - The share name.
   * @param {string} [domain=''] - The domain name. If it is empty, uses the current logged on domain.
   * @param {string} [user] - The user name with which to log on.
   * @param {string} [pwd] - The password. @TODO If * produce a prompt for the password.
   * @param {object} [options] - Optional parameters.
   * @param {boolean} [options.isDryRun=false] - No execute, returns the string of command.
   * @returns {number|string} - The result code from `net use`. If options.isDryRun is true, returns string.
   */
  net.SMB.connect = function (comp, shareName, domain, user, pwd, options) {
    var args = net.SMB._getNetUseArgsToConnect(comp, shareName, domain, user, pwd);
    var isDryRun = obtain(options, 'isDryRun', false);

    return execFile(NET, args, {
      winStyle: 'hidden',
      isDryRun: isDryRun
    });
  }; // }}}

  // net.SMB.connectSync {{{
  /**
   * Synchronously connects the Windows to the network shared resource.
   *
   * @example
   * var smb = Wsh.Net.SMB; // Shorthand
   *
   * var retObj = smb.connectSync('MyNas', null, null, 'nas-user1', 'usrP@ss');
   * // Synchronously executes:
   * // `net.exe use \\\\MyNas\\IPC$ usrP@ss /user:nas-user1`
   * // Returns: { error: false, stdout: '...', stderr: '' }
   *
   * var retObj = smb.connectSync('11.22.33.44', 'public', 'PCNAME', 'UserId', 'usrP@ss');
   * // Synchronously Executes:
   * // `net.exe use \\\\11.22.33.44\\public usrP@ss /user:PCNAME\UserId`
   * // Returns: { error: false, stdout: '...', stderr: '' }
   * @function connectSync
   * @memberof Wsh.Net.SMB
   * @param {string} comp - The computer name.
   * @param {string} [shareName='IPC$'] - The share name.
   * @param {string} [domain=''] - The domain name. If it is empty, uses the current logged on domain.
   * @param {string} [user] - The user name with which to log on.
   * @param {string} [pwd] - The password. *: produce a prompt for the password.
   * @param {object} [options] - Optional parameters.
   * @param {boolean} [options.isDryRun=false] - No execute, returns the string of command.
   * @returns {object|string} - See {@link https://docs.tuckn.net/WshChildProcess/global.html#typeRunSyncReturn|typeRunSyncReturn}. If options.isDryRun is true, returns string.
   */
  net.SMB.connectSync = function (comp, shareName, domain, user, pwd, options) {
    var args = net.SMB._getNetUseArgsToConnect(comp, shareName, domain, user, pwd);
    var isDryRun = obtain(options, 'isDryRun', false);

    /*
     * @note Error Pattern 1
     *
command: "net use \\SmbServer\IPC$ MyPwd /user:MyUserName /persistent:no"
exitCode: 2,
error: true,
stdout: "",
stderr: "システム エラー 1219 が発生しました。
同じユーザーによる、サーバーまたは共有リソースへの複数のユーザー名での複数の接続は許可されません。サーバーまたは共有リソースへの以前の接続をすべて切断してから、再試行してください。",
     */
    return execFileSync(NET, args, {
      winStyle: 'hidden',
      isDryRun: isDryRun
    });
  }; // }}}

  // net.SMB.showCurrentSession {{{
  /**
   * Shows the current network session on a window.
   *
   * @example
   * var smb = Wsh.Net.SMB; // Shorthand
   *
   * smb.showCurrentSession(); // Shows a `net use` window
   * @function showCurrentSession
   * @memberof Wsh.Net.SMB
   * @returns {void}
   */
  net.SMB.showCurrentSession = function () {
    execFile(NET, ['use'], { shell: true, closes: false });
  }; // }}}

  // net.SMB.getActiveConnectionsSwbemObjs {{{
  /**
   * Gets an Array of Enumerated-SWbemObjectSet of network connections on the Windows. See {@link https://docs.microsoft.com/en-us/windows/win32/cimwin32prov/win32-networkconnection|Win32_NetworkConnection class}.
   *
   * @example
   * var smb = Wsh.Net.SMB; // Shorthand
   *
   * var swbemObjs = smb.getActiveConnectionsSwbemObjs();
   * // Returns: An Array of {@link https://docs.microsoft.com/en-us/windows/win32/cimwin32prov/win32-networkconnection|Win32_NetworkConnection class}.
   * @function getActiveConnectionsSwbemObjs
   * @memberof Wsh.Net.SMB
   * @param {string} [matched] - The Regular expression that matches the Name property. e.g. '^\\\\\\\\MyNas'
   * @returns {sWbemObjectSet[]} - Enumerated SWbemObjectSets. See {@link https://docs.microsoft.com/en-us/windows/win32/cimwin32prov/win32-networkconnection|Win32_NetworkConnection class}.
   */
  net.SMB.getActiveConnectionsSwbemObjs = function (matched) {
    var query = 'SELECT * FROM Win32_NetworkConnection';
    var sWbemObjSets = os.WMI.execQuery(query);

    if (!isSolidString(matched)) return sWbemObjSets;
    var matchedRE = new RegExp(matched, 'i');

    return sWbemObjSets.filter(function (sWbemObjSet) {
      return matchedRE.test(sWbemObjSet.Name);
    });
  }; // }}}

  // net.SMB.getActiveConnectionsObjs {{{
  /**
   * {@link https://docs.microsoft.com/en-us/windows/win32/cimwin32prov/win32-networkconnection|Win32_NetworkConnection class}
   *
   * @typedef {object} typeWin32NetworkConnectionClassProps
   * @property {string} Caption
   * @property {string} Description
   * @property {Date} InstallDate
   * @property {string} Status
   * @property {number} AccessMask
   * @property {string} Comment
   * @property {string} ConnectionState
   * @property {string} ConnectionType
   * @property {string} DisplayType
   * @property {string} LocalName
   * @property {string} Name
   * @property {boolean} Persistent
   * @property {string} ProviderName
   * @property {string} RemoteName
   * @property {string} RemotePath
   * @property {string} ResourceType
   * @property {string} UserName
   */

  /**
   * Gets an Array of objects of network connections on the Windows.
   *
   * @example
   * var smb = Wsh.Net.SMB; // Shorthand
   *
   * var connections = smb.getActiveConnectionsObjs();
   * console.dir(connections);
   * // Outputs: [
   * // {
   * //   AccessMask: 1179785,
   * //   Caption: "RESOURCE CONNECTED",
   * //   Comment: " ",
   * //   ConnectionState: "Connected",
   * //   ConnectionType: "Current Connection",
   * //   Description: "RESOURCE CONNECTED - Microsoft Windows Network",
   * //   DisplayType: "Share",
   * //   InstallDate: null,
   * //   LocalName: null,
   * //   Name: "\\MyNas\Public",
   * //   Persistent: false,
   * //   ProviderName: "Microsoft Windows Network",
   * //   RemoteName: "\\MyNas\Public",
   * //   RemotePath: "\\MyNas\Public",
   * //   ResourceType: "Disk",
   * //   Status: "OK",
   * //   UserName: "MyNas\UserName"
   * // }, {
   * //   ...
   * //   ..
   * // }]
   * @function getActiveConnectionsObjs
   * @memberof Wsh.Net.SMB
   * @param {string} [matched] - The Regular expression that matches the Name property. e.g. '^\\\\\\\\MyNas'
   * @returns {typeWin32NetworkConnectionClassProps[]} - An Array of the network connections objects.
   */
  net.SMB.getActiveConnectionsObjs = function (matched) {
    var sWbemObjSets = net.SMB.getActiveConnectionsSwbemObjs(matched);
    return os.WMI.toJsObjects(sWbemObjSets);
  }; // }}}

  // net.SMB.hasConnection {{{
  /**
   * @example
   * var smb = Wsh.Net.SMB; // Shorthand
   *
   * smb.hasConnection('\\\\192.168.12.34\\myPrivate'); // Returns: true
   * @function hasConnection
   * @memberof Wsh.Net.SMB
   * @param {string} [connectionName] - The connection Name.
   * @returns {boolean}
   */
  net.SMB.hasConnection = function (connectionName) {
    var FN = 'net.SMB.hasConnection';
    if (!isSolidString(connectionName)) {
      throwErrNonStr(FN, connectionName);
    }

    var connections = net.SMB.getActiveConnectionsObjs();
    if (!isSolidArray(connections)) return false;

    return connections.some(function (connection) {
      if (connection.Name !== connectionName) return false;
      return /^(OK|Degraded)$/i.test(connection.Status);
    });
  }; // }}}

  // net.SMB._getNetUseArgsToDisconnect {{{
  /**
   * Gets net use args to disconnect a comp from the share resource
   *
   * @private
   * @param {string} [comp] - The computer name. * is all
   * @param {string} [shareName] - The share Name
   * @returns {string[]}
   */
  net.SMB._getNetUseArgsToDisconnect = function (comp, shareName) {
    var args = ['use'];

    if (isSolidString(comp)) {
      if (isSolidString(shareName)) {
        args.push('\\\\' + comp + '\\' + shareName);
      } else {
        args.push('\\\\' + comp);
      }
    } else {
      // *\IPC$ という指定は不可なので、compが空なら * にする
      args.push('*');
    }

    args.push('/delete');
    args.push('/yes');

    return args;
  }; // }}}

  // net.SMB.disconnect {{{
  /**
   * Asynchronously disconnects the Windows from the network shared resource.
   *
   * @example
   * var smb = Wsh.Net.SMB; // Shorthand
   *
   * smb.disconnect('11.22.33.44', 'C$');
   * // Returns a number immediately and asynchronously executes:
   * // `net.exe use \\\\11.22.33.44\\C$ /delete`
   * @function disconnect
   * @memberof Wsh.Net.SMB
   * @param {string} [comp] - The computer name or IP address. * is all
   * @param {string} [shareName] - The share Name
   * @param {object} [options] - Optional parameters.
   * @param {boolean} [options.isDryRun=false] - No execute, returns the string of command.
   * @returns {number|string} - The result code from `net use`. If options.isDryRun is true, returns string.
   */
  net.SMB.disconnect = function (comp, shareName, options) {
    var args = net.SMB._getNetUseArgsToDisconnect(comp, shareName);
    var isDryRun = obtain(options, 'isDryRun', false);

    return execFile(NET, args, {
      winStyle: 'hidden',
      isDryRun: isDryRun
    });
  }; // }}}

  // net.SMB.disconnectSync {{{
  /**
   * Synchronously disconnects the Windows from the network shared resource.
   *
   * @example
   * var smb = Wsh.Net.SMB; // Shorthand
   *
   * var retObj = smb.disconnectSync('11.22.33.44', 'public');
   * // Synchronously executes:
   * // `net.exe use \\\\11.22.33.44\\public /delete`
   * // Returns: { error: false, stdout: '...', stderr: '' }
   * @function disconnectSync
   * @memberof Wsh.Net.SMB
   * @param {string} [comp] - The computer name. * is all
   * @param {string} [shareName] - The share Name
   * @param {object} [options] - Optional parameters.
   * @param {boolean} [options.isDryRun=false] - No execute, returns the string of command.
   * @returns {object|string} - See {@link https://docs.tuckn.net/WshChildProcess/global.html#typeRunSyncReturn|typeRunSyncReturn}. If options.isDryRun is true, returns string.
   */
  net.SMB.disconnectSync = function (comp, shareName, options) {
    var FN = 'net.SMB.disconnectSync';
    var args = net.SMB._getNetUseArgsToDisconnect(comp, shareName);
    var isDryRun = obtain(options, 'isDryRun', false);

    /*
     * note
     * [Success]
     * command: "net use \\SmbServer\IPC$ /delete /yes"
     * exitCode: 0,
     * stdout: "\\SmbServer\IPC$ が削除されました。",
     * stderr: ""
     *
     * [Error Pattern 1]
     * command: "net use \\SmbServer\IPC$ /delete /yes",
     * exitCode: 1, (or 2?)
     * error: true,
     * stdout: "",
     * stderr: "ネットワーク接続が見つかりませんでした。
     * NET HELPMSG 2250 と入力すると、より詳しい説明が得られます。",
     */
    var rtnVal = execFileSync(NET, args, {
      winStyle: 'hidden',
      isDryRun: isDryRun
    });

    if (isDryRun) return 'dry-run [' + FN + ']: ' + rtnVal;

    // @note 接続が見つからないなら成功でいいよね？
    if (/NET HELPMSG 2250/i.test(rtnVal.stderr)) rtnVal.error = false;

    return rtnVal;
  }; // }}}

  // net.SMB.connectSyncSurely {{{
  /**
   * Connects the Windows to the network shared resource. The following points are different from connectSync. (1). If you already have the connection, do nothing. (2). Connect, and if error 1219 is returned, disconnect and reconnect.
   *
   * @example
   * var smb = Wsh.Net.SMB; // Shorthand
   *
   * var retObj = smb.connectSyncSurely('MYPC1234', 'C$', null, 'UserId', 'usrP@ss');
   * @function connectSyncSurely
   * @memberof Wsh.Net.SMB
   * @param {string} comp - The computer name.
   * @param {string} [shareName='IPC$'] - The share name.
   * @param {string} [domain=''] - The domain name. If it is empty, uses the current logged on domain.
   * @param {string} [user] - The user name with which to log on.
   * @param {string} [pwd] - The password. *: produce a prompt for the password.
   * @param {object} [options] - Optional parameters.
   * @param {boolean} [options.isDryRun=false] - No execute, returns the string of command.
   * @returns {void|string} - If options.isDryRun is true, returns string.
   */
  net.SMB.connectSyncSurely = function (comp, shareName, domain, user, pwd, options) {
    var FN = 'net.SMB.connectSyncSurely';

    if (!isSolidString(comp)) throwErrNonStr(FN, comp);

    var remotePath = '\\\\' + comp;
    if (isSolidString(shareName)) {
      remotePath += '\\' + shareName;
    } else {
      remotePath += '\\' + net.SMB.IPC;
    }

    // Already connecting
    if (net.SMB.hasConnection(remotePath)) return;

    var isDryRun = obtain(options, 'isDryRun', false);
    var retLog = '';
    var retVal;

    // Disconnect the current connection
    retVal = net.SMB.disconnectSync(comp, shareName, options);
    if (isDryRun) retLog = 'dry-run [' + FN + ']: ' + retVal;

    retVal = net.SMB.connectSync(comp, shareName, domain, user, pwd, options);
    if (isDryRun) return retLog + '\n' + retVal;

    if (retVal.error) {
      // システムエラー 1219 「同じユーザーによる～の場合、接続を削除して再実行
      if (/1219/.test(retVal.stderr)) {
        if (net.SMB.disconnectSync(comp, shareName)) {
          retVal = net.SMB.connectSync(comp, shareName, domain, user, pwd);

          if (!retVal.error) return;
        }
      }

      throw new Error('Error [ExitCode Not 0]\n'
          + '  at ' + FN + ' (' + MODULE_TITLE + ')\n'
          + '  comp: ' + comp + '\n'
          + '  shareName: ' + shareName + '\n'
          + '  domain: ' + domain + '\n'
          + '  user: ' + user + '\n'
          + '  retVal: ' + insp(retVal));
    }
  }; // }}}
})();

// vim:set foldmethod=marker commentstring=//%s :
