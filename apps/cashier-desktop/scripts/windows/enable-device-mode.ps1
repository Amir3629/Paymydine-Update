param(
    [Parameter(Mandatory = $true)][string]$AppPath,
    [Parameter(Mandatory = $true)][string]$UserSid
)

$ErrorActionPreference = 'Stop'

function Assert-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'PayMyDine Device Mode setup must run with administrator approval.'
    }
}

function Get-ReturnCode($Result) {
    if ($null -eq $Result) { return 0 }
    if ($Result -is [int]) { return [int]$Result }
    if ($null -ne $Result.ReturnValue) { return [int]$Result.ReturnValue }
    return 0
}

function Assert-WmiResult($Result, [string]$Operation) {
    $code = Get-ReturnCode $Result
    if ($code -ne 0) {
        throw "$Operation failed with WMI return code $code."
    }
}

Assert-Administrator

if (-not (Test-Path -LiteralPath $AppPath -PathType Leaf)) {
    throw "PayMyDine executable was not found: $AppPath"
}
if ($UserSid -notmatch '^S-\d-\d+(?:-\d+)+$') {
    throw 'The Windows user SID is invalid.'
}

$caption = [string](Get-CimInstance Win32_OperatingSystem).Caption
if ($caption -notmatch '(Enterprise|Education|IoT)') {
    throw "Strict PayMyDine Device Mode requires Windows Enterprise, Education, or IoT Enterprise. Detected: $caption"
}

$feature = Get-WindowsOptionalFeature -Online -FeatureName Client-EmbeddedShellLauncher
if ($feature.State -ne 'Enabled') {
    Enable-WindowsOptionalFeature -Online -FeatureName Client-DeviceLockdown,Client-EmbeddedShellLauncher -All -NoRestart | Out-Null
}

$namespace = 'root\standardcimv2\embedded'
$shellClass = $null
$lastProviderError = $null
for ($attempt = 0; $attempt -lt 12; $attempt++) {
    try {
        $shellClass = [wmiclass]"\\localhost\$namespace`:WESL_UserSetting"
        if ($null -ne $shellClass) { break }
    } catch {
        $lastProviderError = $_
    }
    Start-Sleep -Milliseconds 750
}
if ($null -eq $shellClass) {
    throw "Windows enabled the Shell Launcher feature but its WMI provider is not ready yet. Reboot Windows once, open PayMyDine, and enable Device Mode again. $lastProviderError"
}

$restartShell = 0
$shellCommand = '"' + $AppPath + '" --pmd-device-mode'

try { $shellClass.RemoveCustomShell($UserSid) | Out-Null } catch {}
Assert-WmiResult ($shellClass.SetCustomShell($UserSid, $shellCommand, $null, $null, $restartShell)) 'SetCustomShell'
Assert-WmiResult ($shellClass.SetEnabled($true)) 'SetEnabled'

$configured = Get-WmiObject -Namespace $namespace -Class WESL_UserSetting | Where-Object { $_.Sid -eq $UserSid } | Select-Object -First 1
if ($null -eq $configured -or [string]$configured.Shell -notmatch 'PayMyDine') {
    throw 'Shell Launcher did not report the PayMyDine shell after configuration.'
}

$root = Join-Path $env:ProgramData 'PayMyDine'
New-Item -ItemType Directory -Force -Path $root | Out-Null
$marker = Join-Path $root 'device-mode.json'
$payload = [ordered]@{
    enabled = $true
    mode = 'strict-shell-launcher'
    userSid = $UserSid
    appPath = $AppPath
    shell = $shellCommand
    windows = $caption
    configuredAt = (Get-Date).ToUniversalTime().ToString('o')
}
$payload | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $marker -Encoding UTF8

Write-Output 'PMD_DEVICE_MODE_ENABLED=YES'
Write-Output "PMD_DEVICE_MODE_USER_SID=$UserSid"
Write-Output "PMD_DEVICE_MODE_SHELL=$shellCommand"
Write-Output 'PMD_DEVICE_MODE_REBOOT_OR_SIGNIN_REQUIRED=YES'
