param(
    [string]$MysqlExe = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
    [string]$MysqlUser = "root",
    [string]$MysqlPassword = "P@ssw0rd@123",
    [string]$PhpExe = "php",
    [switch]$SkipComposer
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

Write-Host "=== PayMyDine local snapshot setup for Windows ==="

function Require-File($Path) {
    if (-not (Test-Path $Path)) {
        throw "Missing required file: $Path"
    }
}

function Run-Cmd($Command) {
    Write-Host ">> $Command"
    cmd.exe /c $Command
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code $LASTEXITCODE"
    }
}

Write-Host "==> Checking snapshot files"
Require-File "local-snapshot\dbs\paymydine.sql"
Require-File "local-snapshot\dbs\mimoza.sql"
Require-File "local-snapshot\dbs\rosana.sql"
Require-File "local-snapshot\dbs\persian.sql"
Require-File "local-snapshot\media\assets-media.tar.gz"
Require-File "local-snapshot\media\storage-public.tar.gz"

if (-not (Test-Path ".env")) {
    if (Test-Path "local-snapshot\env\.env.local.example") {
        Copy-Item "local-snapshot\env\.env.local.example" ".env"
        Write-Host "Copied local-snapshot\env\.env.local.example to .env"
    } elseif (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "Copied .env.example to .env"
    } else {
        throw "Missing .env and no env example was found"
    }
}

if (-not (Test-Path $MysqlExe)) {
    throw "MySQL executable not found at: $MysqlExe"
}

if (-not $SkipComposer) {
    if (-not (Test-Path "vendor\autoload.php")) {
        Write-Host "==> Installing composer dependencies"
        composer install
    } else {
        Write-Host "==> Composer vendor already exists"
    }
}

Write-Host "==> Creating local databases"
$CreateSql = @"
CREATE DATABASE IF NOT EXISTS paymydine CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS mimoza CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS rosana CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS persian CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
"@

$TempSql = Join-Path $env:TEMP "pmd-create-dbs.sql"
Set-Content -Path $TempSql -Value $CreateSql -Encoding UTF8

$MysqlCmd = '"' + $MysqlExe + '"'
Run-Cmd "$MysqlCmd -u $MysqlUser -p$MysqlPassword < `"$TempSql`""

Write-Host "==> Importing database snapshots"
Run-Cmd "$MysqlCmd -u $MysqlUser -p$MysqlPassword paymydine < `"local-snapshot\dbs\paymydine.sql`""
Run-Cmd "$MysqlCmd -u $MysqlUser -p$MysqlPassword mimoza < `"local-snapshot\dbs\mimoza.sql`""
Run-Cmd "$MysqlCmd -u $MysqlUser -p$MysqlPassword rosana < `"local-snapshot\dbs\rosana.sql`""
Run-Cmd "$MysqlCmd -u $MysqlUser -p$MysqlPassword persian < `"local-snapshot\dbs\persian.sql`""

Write-Host "==> Restoring media snapshot"
tar -xzf "local-snapshot\media\assets-media.tar.gz"
tar -xzf "local-snapshot\media\storage-public.tar.gz"

Write-Host "==> Restoring Git-tracked custom app files overwritten by composer packages"
git checkout HEAD -- app/admin app/main app/system
git clean -fd -- app/admin app/main app/system

Write-Host "==> Regenerating autoload"
composer dump-autoload

Write-Host "==> Clearing Laravel/TastyIgniter cache"
& $PhpExe artisan config:clear
& $PhpExe artisan cache:clear
& $PhpExe artisan view:clear

Write-Host ""
Write-Host "DONE."
Write-Host "Start server with:"
Write-Host "php -S 127.0.0.1:8000 server.php"
Write-Host ""
Write-Host "Open:"
Write-Host "http://mimoza.lvh.me:8000/admin"
