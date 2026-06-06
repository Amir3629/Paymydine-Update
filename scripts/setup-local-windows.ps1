$ErrorActionPreference = "Stop"

$ProjectName = "Paymydine-Local"
$RepoUrl = "https://github.com/Amir3629/Paymydine-Update.git"

$ServerUser = "ubuntu"
$ServerHost = "57.129.43.190"
$RemoteAppDir = "/var/www/paymydine"

$LocalBase = "D:\Work\GIT"
$ProjectDir = Join-Path $LocalBase $ProjectName

$DbNames = @("paymydine", "mimoza", "rosana", "persian")

function Fail($Message) {
    Write-Host ""
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

function Assert-LastExit($Message) {
    if ($LASTEXITCODE -ne 0) {
        Fail "$Message failed with exit code $LASTEXITCODE"
    }
}

function Find-CommandPath($Name, $Fallbacks = @()) {
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    foreach ($path in $Fallbacks) {
        if (Test-Path $path) {
            return $path
        }
    }

    Fail "$Name not found. Please install it first."
}

Write-Host "========================================"
Write-Host "PayMyDine Windows local setup"
Write-Host "This will clone GitHub code, install Composer, copy real VPS .env, import DBs, sync media, and start localhost."
Write-Host "Target folder: $ProjectDir"
Write-Host "========================================"
Write-Host ""

$SecurePassword = Read-Host "Local MySQL root password" -AsSecureString
$BSTR = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
$LocalMySqlPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($BSTR)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

Write-Host "==> Checking tools"

$Git = Find-CommandPath "git"
$Composer = Find-CommandPath "composer"
$Php = Find-CommandPath "php"
$Ssh = Find-CommandPath "ssh"
$Scp = Find-CommandPath "scp"
$Tar = Find-CommandPath "tar"

$Mysql = Find-CommandPath "mysql" @(
    "C:\Program Files\MySQL\MySQL Server 9.4\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.3\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.2\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
)

if (-not (Test-Path $LocalBase)) {
    Write-Host "==> Creating base folder: $LocalBase"
    New-Item -ItemType Directory -Force -Path $LocalBase | Out-Null
}

$currentPath = (Get-Location).Path
if ($currentPath.StartsWith($ProjectDir, [System.StringComparison]::OrdinalIgnoreCase)) {
    Fail "Do not run this script from inside $ProjectDir. Run it from D:\Work\GIT or Desktop."
}

Write-Host "==> Removing old local folder"
if (Test-Path $ProjectDir) {
    Remove-Item -Recurse -Force $ProjectDir
}

Write-Host "==> Cloning GitHub"
& $Git clone $RepoUrl $ProjectDir
Assert-LastExit "git clone"

Set-Location $ProjectDir

Write-Host "==> Installing Composer dependencies"
& $Composer install
Assert-LastExit "composer install"

Write-Host "==> Restoring custom PayMyDine files after Composer"
& $Git reset --hard HEAD
Assert-LastExit "git reset"

& $Git clean -fd -- app/admin app/main app/system
Assert-LastExit "git clean"

Write-Host "==> Creating required storage folders"
$folders = @(
    "storage\framework\cache",
    "storage\framework\sessions",
    "storage\framework\views",
    "storage\system\cache",
    "storage\logs",
    "storage\temp",
    "storage\app\public",
    "bootstrap\cache"
)

foreach ($folder in $folders) {
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
}

Write-Host "==> Testing SSH to VPS"
& $Ssh "$ServerUser@$ServerHost" "echo SSH_OK"
Assert-LastExit "SSH test"

Write-Host "==> Copying real .env from VPS"
$envContent = & $Ssh "$ServerUser@$ServerHost" "cat '$RemoteAppDir/.env'"
Assert-LastExit "copy .env from VPS"

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $ProjectDir ".env"), (($envContent -join "`n") + "`n"), $utf8NoBom)

Write-Host "==> Localizing .env for this computer"

$envPath = Join-Path $ProjectDir ".env"
$text = Get-Content $envPath -Raw

$overrides = [ordered]@{
    "APP_ENV" = "local"
    "APP_DEBUG" = "true"
    "APP_URL" = "http://127.0.0.1:8000"

    "DB_CONNECTION" = "mysql"
    "DB_HOST" = "127.0.0.1"
    "DB_PORT" = "3306"
    "DB_DATABASE" = "paymydine"
    "DB_USERNAME" = "root"
    "DB_PASSWORD" = $LocalMySqlPassword

    "TENANT_DB_HOST" = "127.0.0.1"
    "TENANT_DB_PORT" = "3306"
    "TENANT_DB_USERNAME" = "root"
    "TENANT_DB_PASSWORD" = $LocalMySqlPassword

    "DB_TENANT_HOST" = "127.0.0.1"
    "DB_TENANT_PORT" = "3306"
    "DB_TENANT_USERNAME" = "root"
    "DB_TENANT_PASSWORD" = $LocalMySqlPassword

    "TENANCY_DB_HOST" = "127.0.0.1"
    "TENANCY_DB_PORT" = "3306"
    "TENANCY_DB_USERNAME" = "root"
    "TENANCY_DB_PASSWORD" = $LocalMySqlPassword

    "CACHE_DRIVER" = "file"
    "SESSION_DRIVER" = "file"
    "QUEUE_CONNECTION" = "sync"
    "BROADCAST_DRIVER" = "log"
    "FILESYSTEM_DISK" = "local"
}

$lines = $text -split "`r?`n"
$out = New-Object System.Collections.Generic.List[string]
$seen = @{}

foreach ($line in $lines) {
    $trimmed = $line.Trim()

    if ($trimmed -ne "" -and -not $trimmed.StartsWith("#") -and $line.Contains("=")) {
        $key = $line.Split("=", 2)[0].Trim()

        if ($overrides.Contains($key)) {
            if (-not $seen.ContainsKey($key)) {
                $out.Add("$key=$($overrides[$key])")
                $seen[$key] = $true
            }
            continue
        }
    }

    $out.Add($line)
}

foreach ($key in $overrides.Keys) {
    if (-not $seen.ContainsKey($key)) {
        $out.Add("$key=$($overrides[$key])")
    }
}

[System.IO.File]::WriteAllText($envPath, (($out -join "`n") + "`n"), $utf8NoBom)

Write-Host "==> Preparing local MySQL login"
$LocalCnf = Join-Path $env:TEMP "pmd-local-mysql-$PID.cnf"

@"
[client]
host=127.0.0.1
port=3306
user=root
password=$LocalMySqlPassword
default-character-set=utf8mb4
"@ | Set-Content -Path $LocalCnf -Encoding ASCII

try {
    Write-Host "==> Testing local MySQL"
    & $Mysql "--defaults-extra-file=$LocalCnf" -e "SELECT VERSION();"
    Assert-LastExit "local MySQL test"

    Write-Host "==> Dumping production DBs from VPS"

$remoteDumpScript = @'
set -Eeuo pipefail

REMOTE_APP_DIR="/var/www/paymydine"

cd "$REMOTE_APP_DIR"

rm -rf /tmp/pmd-local-sync
mkdir -p /tmp/pmd-local-sync

php <<'PHP' > /tmp/pmd_db_creds.env
<?php
function read_env_file($path) {
    $env = [];

    if (!is_file($path)) {
        fwrite(STDERR, "ERROR: .env not found at {$path}\n");
        exit(1);
    }

    foreach (file($path, FILE_IGNORE_NEW_LINES) as $line) {
        $line = trim($line);

        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);

        $key = trim($key);
        $value = trim($value);

        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }

        $env[$key] = $value;
    }

    return $env;
}

function shell_value($value) {
    return "'" . str_replace("'", "'\\''", $value) . "'";
}

$env = read_env_file('/var/www/paymydine/.env');

echo "DB_HOST=" . shell_value($env['DB_HOST'] ?? '127.0.0.1') . PHP_EOL;
echo "DB_PORT=" . shell_value($env['DB_PORT'] ?? '3306') . PHP_EOL;
echo "DB_USERNAME=" . shell_value($env['DB_USERNAME'] ?? '') . PHP_EOL;
echo "DB_PASSWORD=" . shell_value($env['DB_PASSWORD'] ?? '') . PHP_EOL;
PHP

source /tmp/pmd_db_creds.env
rm -f /tmp/pmd_db_creds.env

CNF="$(mktemp)"
chmod 600 "$CNF"

cat > "$CNF" <<EOF
[client]
host=$DB_HOST
port=$DB_PORT
user=$DB_USERNAME
password=$DB_PASSWORD
default-character-set=utf8mb4
EOF

trap 'rm -f "$CNF"' EXIT

for db in paymydine mimoza rosana persian; do
  echo "Dumping $db..."

  if mysql --defaults-extra-file="$CNF" -N -B -e "SHOW DATABASES LIKE '$db';" | grep -Fxq "$db"; then
    mysqldump --defaults-extra-file="$CNF" --single-transaction "$db" > "/tmp/pmd-local-sync/$db.sql"
  else
    echo "ERROR: Database $db not found on VPS"
    exit 1
  fi
done

tar -czf /tmp/pmd-local-dbs.tar.gz -C /tmp/pmd-local-sync .
'@

    $remoteDumpScript | & $Ssh "$ServerUser@$ServerHost" "bash -s"
    Assert-LastExit "remote DB dump"

    $DbTar = Join-Path $LocalBase "pmd-local-dbs.tar.gz"
    $DbDir = Join-Path $LocalBase "pmd-local-dbs"

    Write-Host "==> Downloading DB dumps"
    & $Scp "$ServerUser@$ServerHost:/tmp/pmd-local-dbs.tar.gz" $DbTar
    Assert-LastExit "download DB dumps"

    Write-Host "==> Extracting DB dumps"
    if (Test-Path $DbDir) {
        Remove-Item -Recurse -Force $DbDir
    }
    New-Item -ItemType Directory -Force -Path $DbDir | Out-Null

    & $Tar -xzf $DbTar -C $DbDir
    Assert-LastExit "extract DB dumps"

    Write-Host "==> Resetting local databases"
    $resetSql = @"
DROP DATABASE IF EXISTS paymydine;
DROP DATABASE IF EXISTS mimoza;
DROP DATABASE IF EXISTS rosana;
DROP DATABASE IF EXISTS persian;

CREATE DATABASE paymydine CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE mimoza CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE rosana CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE persian CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
"@

    & $Mysql "--defaults-extra-file=$LocalCnf" -e $resetSql
    Assert-LastExit "reset local databases"

    Write-Host "==> Importing databases"
    foreach ($db in $DbNames) {
        $sqlFile = Join-Path $DbDir "$db.sql"

        if (-not (Test-Path $sqlFile)) {
            Fail "SQL file missing: $sqlFile"
        }

        Write-Host "Importing $db..."
        $cmd = "`"$Mysql`" --defaults-extra-file=`"$LocalCnf`" $db < `"$sqlFile`""
        & cmd.exe /c $cmd
        Assert-LastExit "import $db"
    }

    Write-Host "==> Verifying menu counts"
    foreach ($db in $DbNames) {
        Write-Host "--- $db ---"
        & $Mysql "--defaults-extra-file=$LocalCnf" $db -e "SELECT COUNT(*) AS menus FROM ti_menus;"
    }

    Write-Host "==> Packing media on VPS"

$remoteMediaScript = @'
set -Eeuo pipefail
cd /var/www/paymydine
rm -f /tmp/pmd-local-media.tar.gz
tar -czf /tmp/pmd-local-media.tar.gz assets/media storage/app/public 2>/dev/null
ls -lh /tmp/pmd-local-media.tar.gz
'@

    $remoteMediaScript | & $Ssh "$ServerUser@$ServerHost" "bash -s"
    Assert-LastExit "remote media pack"

    $MediaTar = Join-Path $LocalBase "pmd-local-media.tar.gz"

    Write-Host "==> Downloading media from VPS"
    & $Scp "$ServerUser@$ServerHost:/tmp/pmd-local-media.tar.gz" $MediaTar
    Assert-LastExit "download media"

    Write-Host "==> Restoring media locally"
    if (Test-Path "assets\media") {
        Remove-Item -Recurse -Force "assets\media"
    }

    if (Test-Path "storage\app\public") {
        Remove-Item -Recurse -Force "storage\app\public"
    }

    New-Item -ItemType Directory -Force -Path "assets" | Out-Null
    New-Item -ItemType Directory -Force -Path "storage\app" | Out-Null

    & $Tar -xzf $MediaTar -C $ProjectDir
    Assert-LastExit "extract media"

    Write-Host "==> Composer autoload and cache clear"
    & $Composer dump-autoload
    Assert-LastExit "composer dump-autoload"

    & $Php artisan config:clear
    Assert-LastExit "php artisan config:clear"

    & $Php artisan cache:clear
    Assert-LastExit "php artisan cache:clear"

    & $Php artisan view:clear
    Assert-LastExit "php artisan view:clear"

    Write-Host "==> Verifying important files"
    $important = @(
        "app\admin\models\Fiskaly_configs_model.php",
        "app\admin\models\Fiskaly_transactions_model.php",
        "app\admin\services\Fiskaly\FiskalyConfigResolver.php",
        "app\admin\assets\css\pmd-admin-theme-v1.css",
        "assets\media\attachments\public"
    )

    foreach ($item in $important) {
        if (-not (Test-Path $item)) {
            Fail "Missing required item: $item"
        }
    }

    Write-Host "==> Stopping old localhost server on port 8000"
    try {
        $connections = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
        $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique

        foreach ($processId in $processIds) {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    } catch {
    }

    Write-Host ""
    Write-Host "DONE." -ForegroundColor Green
    Write-Host "Open this URL:" -ForegroundColor Green
    Write-Host "http://mimoza.lvh.me:8000/admin/menus" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Do NOT open:" -ForegroundColor Red
    Write-Host "http://127.0.0.1:8000/admin/menus" -ForegroundColor Red
    Write-Host ""

    & $Php -S "127.0.0.1:8000" "server.php"
}
finally {
    if (Test-Path $LocalCnf) {
        Remove-Item -Force $LocalCnf
    }
}
