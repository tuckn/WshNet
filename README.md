# WshNet

This module provides useful WSH (Windows Script Host) functions that handle network on Windows.

## tuckn/Wsh series dependency

[WshModeJs](https://github.com/tuckn/WshModeJs)  
└─ WshNet - This repository  
&emsp;└─ [WshChildProcess](https://github.com/tuckn/WshChildProcess)  
&emsp;&emsp;└─ [WshProcess](https://github.com/tuckn/WshProcess)  
&emsp;&emsp;&emsp;&emsp;└─ [WshFileSystem](https://github.com/tuckn/WshFileSystem)  
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;└─ [WshOS](https://github.com/tuckn/WshOS)  
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;└─ [WshPath](https://github.com/tuckn/WshPath)  
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;└─ [WshUtil](https://github.com/tuckn/WshUtil)  
&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;└─ [WshPolyfill](https://github.com/tuckn/WshPolyfill)

The upper layer module can use all the functions of the lower layer module.

## Operating environment

Works on JScript in Windows.

## Installation

(1) Create a directory of your WSH project.

```console
D:\> mkdir MyWshProject
D:\> cd MyWshProject
```

(2) Download this ZIP and unzipping or Use bellowing `git` command.

```console
> git clone https://github.com/tuckn/WshNet.git ./WshModules/WshNet
or
> git submodule add https://github.com/tuckn/WshNet.git ./WshModules/WshNet
```

(3) Include _.\WshNet\dist\bundle.js_ into your .wsf file.
For Example, if your file structure is

```console
D:\MyWshProject\
├─ Run.wsf
├─ MyScript.js
└─ WshModules\
    └─ WshNet\
        └─ dist\
          └─ bundle.js
```

The content of above _Run.wsf_ is

```xml
<package>
  <job id = "run">
    <script language="JScript" src="./WshModules/WshNet/dist/bundle.js"></script>
    <script language="JScript" src="./MyScript.js"></script>
  </job>
</package>
```

I recommend this .wsf file encoding to be UTF-8 [BOM, CRLF].
This allows the following functions to be used in _.\MyScript.js_.

## Usage

Now _.\MyScript.js_ (JScript) can use the useful functions to handle file system.
for example,

```js
var net = Wsh.Net; // Shorthand

var adapters = net.getAdaptersPropsSWbemObjs();
// Returns: An Array of Win32_NetworkAdapter class.

var adapters = net.getAdaptersPropsObjs();
console.dir(adapters); //
// Outputs: [
// {
//    AdapterType: "イーサネット 802.3",
//    AdapterTypeId: 0,
//    AutoSense: null,
//    Availability: 3,
//    Caption: "[00000001] Intel(R) Ethernet Connection (7) I999-V",
//    ConfigManagerErrorCode: 0,
//    ConfigManagerUserConfig: false,
//    CreationClassName: "Win32_NetworkAdapter",
//    Description: "Intel(R) Ethernet Connection (7) I999-V",
//    DeviceID: "1",
//    ErrorCleared: null,
//    ErrorDescription: null,
//    GUID: "{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}",
//    Index: 1,
//    InstallDate: null,
//    Installed: true,
//    InterfaceIndex: 11,
//    LastErrorCode: null,
//    MACAddress: "XX:XX:XX:XX:XX:XX",
//    Manufacturer: "Intel Corporation",
//    MaxNumberControlled: 0,
//    MaxSpeed: null,
//    Name: "Intel(R) Ethernet Connection (7) I999-V",
//    NetConnectionID: "イーサネット",
//    NetConnectionStatus: 2,
//    NetEnabled: true,
//    NetworkAddresses: null,
//    PermanentAddress: null,
//    PhysicalAdapter: true,
//    PNPDeviceID: "PCI\XXX_111X&XXX_1111&...",
//    PowerManagementCapabilities: null,
//    PowerManagementSupported: false,
//    ProductName: "Intel(R) Ethernet Connection (7) I999-V",
//    ServiceName: "xxxxxx64",
//    Speed: null,
//    Status: null,
//    StatusInfo: null,
//    SystemCreationClassName: "Win32_ComputerSystem",
//    SystemName: "MYPC123456"
//    TimeOfLastReset: "20161108082314.125599+540"
//  }, {
//     ...
//     ..
//  }]

// Checks if the host responds to ping.
net.respondsHost('127.0.0.1'); // Returns: true
// Shows the window of `ipconfig /all`
net.showIpConfigAll();
// Checks if the network adapter has DHCP enabled.
net.enablesDHCP('XX:XX:XX:XX:XX:XX'); // Returns: true
// Gets/Sets the IP address set in adapters.
net.getIpSetInAdapters('XX:XX:XX:XX:XX:XX'); // Returns: ['xx.xx.xx.xx']
net.getDefaultGateways('XX:XX:XX:XX:XX:XX'); // Returns: ['xx.xx.xx.xx']
net.setIpAddress('Ethernet 1', ip, mask, defGw);
// Gets/Sets the IP addresses of DNS set in adapters.
net.getDnsIPsSetInAdapters('XX:XX:XX:XX:XX:XX'); // Returns: ['xx.xx.xx.xx', 'xx.xx.xx.xx']
net.setDnsServers('Ethernet 1', ip, mask, defGw);

// Exports the Windows firewall settings (Requires admin rights)..
net.exportWinFirewallSettings('D:\\backup.wfw');
// Imports the Windows firewall settings (Requires admin rights)..
net.importWinFirewallSettings('D:\\backup.wfw');

// and so on...
```

### SMB (Server Message Block)

```js
var smb = Wsh.Net.SMB; // Shorthand

// Shares the directory of this Windows (Requires admin rights).
smb.shareDirectory('MyShareName', 'D:\\sharedFolder', {
  grant: 'READ',
  remark: 'Share for example'
});
// Removes
smb.delSharedDirectory('MyShareName');

// Shows a window of the local shared folders.
smb.showLocalShares();

// Gets an Array of the shared resource objects on the Windows.
var resources = smb.getLocalSharesObjs();
console.dir(resources);
// Outputs: [
// {
//   AccessMask: null,
//   AllowMaximum: true,
//   Caption: "Remote Admin",
//   Description: "Remote Admin",
//   InstallDate: null,
//   MaximumAllowed: null,
//   Name: "ADMIN$",
//   Path: "C:\WINDOWS",
//   Status: "OK",
//   Type: -2147483648
// }, {
//   ...
//   ..
// }, {
//   AccessMask: null,
//   AllowMaximum: true,
//   Caption: "shareDirectory",
//   Description: "shareDirectory",
//   InstallDate: null,
//   MaximumAllowed: null,
//   Name: "shareDirectory",
//   Path: "C:\Users\UserName\AppData\Local\Temp\shareDirectory_testDir",
//   Status: "OK",
//   Type: 0 }]


// Checks whether the shared name is defined.
smb.existsShareName('MyShareName'); // Returns: true

// Connects the Windows to the network shared resource.
smb.connectSync('11.22.33.44', 'public', 'PCNAME', 'UserId', 'usrP@ss');
// Disconnects
smb.disconnectSync('11.22.33.44', 'public');

// Gets an Array of objects of network connections on the Windows.
var connections = smb.getActiveConnectionsObjs();
console.dir(connections);
// Outputs: [
// {
//   AccessMask: 1179785,
//   Caption: "RESOURCE CONNECTED",
//   Comment: " ",
//   ConnectionState: "Connected",
//   ConnectionType: "Current Connection",
//   Description: "RESOURCE CONNECTED - Microsoft Windows Network",
//   DisplayType: "Share",
//   InstallDate: null,
//   LocalName: null,
//   Name: "\\MyNas\Public",
//   Persistent: false,
//   ProviderName: "Microsoft Windows Network",
//   RemoteName: "\\MyNas\Public",
//   RemotePath: "\\MyNas\Public",
//   ResourceType: "Disk",
//   Status: "OK",
//   UserName: "MyNas\UserName"
// }, {
//   ...
//   ..
// }]

// and so on...
```

Many other functions are added.
See the [documentation](https://docs.tuckn.net/WshNet) for more details.

And you can also use all functions of [tuckn/WshPolyfill](https://github.com/tuckn/WshPolyfill), [tuckn/WshUtil](https://github.com/tuckn/WshUtil), [tuckn/WshPath](https://github.com/tuckn/WshPath), [tuckn/WshOS](https://github.com/tuckn/WshOS), [tuckn/WshFileSystem](https://github.com/tuckn/WshFileSystem), [tuckn/WshProcess](https://github.com/tuckn/WshProcess)  and [tuckn/WshChildProcess](https://github.com/tuckn/WshChildProcess).

## Documentation

See all specifications [here](https://docs.tuckn.net/WshNet) and also below.

- [WshPolyfill](https://docs.tuckn.net/WshPolyfill)
- [WshUtil](https://docs.tuckn.net/WshUtil)
- [WshPath](https://docs.tuckn.net/WshPath)
- [WshOS](https://docs.tuckn.net/WshOS)
- [WshFileSystem](https://docs.tuckn.net/WshFileSystem)
- [WshProcess](https://docs.tuckn.net/WshProcess)
- [WshChildProcess](https://docs.tuckn.net/WshChildProcess)

## TODO

* Test the functions of setting network.

## License

MIT

Copyright (c) 2020 [Tuckn](https://github.com/tuckn)
