param(
    [string]$UserSid = ''
)

$ErrorActionPreference = 'Stop'

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Disabling PayMyDine Device Mode requires administrator approval.'
}

$marker = Join-Path (Join-Path $env:ProgramData 'PayMyDine') 'device-mode.json'
if ([string]::IsNullOrWhiteSpace($UserSid) -and (Test-Path -LiteralPath $marker)) {
    try {
        $saved = Get-Content -LiteralPath $marker -Raw | ConvertFrom-Json
        $UserSid = [string]$saved.userSid
    } catch {}
}

$namespace = 'root\standardcimv2\embedded'
$shellClass = [wmiclass]"\\localhost\$namespace`:WESL_UserSetting"
if (-not [string]::IsNullOrWhiteSpace($UserSid)) {
    try { $shellClass.RemoveCustomShell($UserSid) | Out-Null } catch {}
}
$shellClass.SetEnabled($false) | Out-Null

if (Test-Path -LiteralPath $marker) {
    Remove-Item -LiteralPath $marker -Force
}

Write-Output 'PMD_DEVICE_MODE_DISABLED=YES'
Write-Output 'Sign out or reboot Windows to return permanently to Explorer.'
