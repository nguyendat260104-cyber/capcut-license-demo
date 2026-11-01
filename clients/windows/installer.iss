#define AppName "PresetKey CapCut Installer"
#define AppVersion "1.0.0"
#define Publisher "PresetKey"

[Setup]
AppId={{3BE475A8-3D5C-4C77-A4E2-92A55D9204C5}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#Publisher}
DefaultDirName={localappdata}\PresetKey
PrivilegesRequired=lowest
DisableProgramGroupPage=yes
OutputDir=..\..\artifacts
OutputBaseFilename=PresetKey-CapCut-Windows
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
Uninstallable=yes

[Files]
Source: "PresetKey.Installer\bin\Release\net8.0-windows\win-x64\publish\PresetKeyInstaller.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\PresetKey CapCut Installer"; Filename: "{app}\PresetKeyInstaller.exe"

[Run]
Filename: "{app}\PresetKeyInstaller.exe"; Description: "Kích hoạt và cài preset"; Flags: nowait postinstall skipifsilent
