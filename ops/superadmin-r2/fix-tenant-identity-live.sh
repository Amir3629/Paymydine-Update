#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
DOMAIN="${1:-asd.paymydine.com}"
PAYLOAD_REF="4573b22ac49ce789d11a46dae55ed8d03c2b031b"
RAW="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${PAYLOAD_REF}"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/storage/pmd-superadmin-r2-identity-$TS"
TMP="$(mktemp -d)"

cleanup(){ rm -rf "$TMP"; }
trap cleanup EXIT

[[ "$DOMAIN" =~ ^[a-z0-9-]+\.paymydine\.com$ ]] || { echo "Invalid tenant domain: $DOMAIN" >&2; exit 1; }
sudo -n true
mkdir -p "$BACKUP/files"

FILES=(
  "app/Services/SuperAdminTenantIdentityService.php"
  "app/Http/Middleware/SuperAdminTenantIdentityBaseline.php"
  "routes/pmd-superadmin-r2.php"
)

echo "============================================================"
echo " PMD SUPER ADMIN R2 - TENANT IDENTITY BASELINE"
echo " Tenant:  $DOMAIN"
echo " Payload: $PAYLOAD_REF"
echo "============================================================"

echo
echo "1) Downloading immutable identity baseline..."
for rel in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$rel")"
  echo "GET  $rel"
  curl -fsSL "$RAW/$rel" -o "$TMP/$rel"
done

echo
echo "2) PHP syntax validation..."
php -l "$TMP/app/Services/SuperAdminTenantIdentityService.php"
php -l "$TMP/app/Http/Middleware/SuperAdminTenantIdentityBaseline.php"
php -l "$TMP/routes/pmd-superadmin-r2.php"

echo
echo "3) Backing up current production files..."
for rel in "${FILES[@]}"; do
  if sudo -n test -f "$ROOT/$rel"; then
    mkdir -p "$BACKUP/files/$(dirname "$rel")"
    sudo -n cp -a "$ROOT/$rel" "$BACKUP/files/$rel"
  fi
done

echo
echo "4) Installing future-tenant identity baseline..."
for rel in "${FILES[@]}"; do
  sudo -n mkdir -p "$ROOT/$(dirname "$rel")"
  sudo -n install -o root -g root -m 0644 "$TMP/$rel" "$ROOT/$rel"
  echo "OK   $rel"
done

php -l "$ROOT/app/Services/SuperAdminTenantIdentityService.php"
php -l "$ROOT/app/Http/Middleware/SuperAdminTenantIdentityBaseline.php"
php -l "$ROOT/routes/pmd-superadmin-r2.php"

if systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
  sudo -n systemctl reload php8.3-fpm
fi

echo
echo "5) Repairing EXISTING tenant identity..."
export PMD_ROOT="$ROOT" PMD_DOMAIN="$DOMAIN" PMD_BACKUP="$BACKUP"
php <<'PHP'
<?php
$root = getenv('PMD_ROOT');
$domain = strtolower(trim((string)getenv('PMD_DOMAIN')));
$backup = getenv('PMD_BACKUP');

function readEnvFile(string $path): array {
    $out=[];
    foreach (file($path, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
        $line=trim($line);
        if ($line==='' || str_starts_with($line,'#') || !str_contains($line,'=')) continue;
        [$k,$v]=explode('=',$line,2);
        $v=trim($v);
        if (strlen($v)>=2 && (($v[0]==='"'&&$v[-1]==='"')||($v[0]==="'"&&$v[-1]==="'"))) $v=substr($v,1,-1);
        $out[trim($k)]=$v;
    }
    return $out;
}

$env=readEnvFile($root.'/.env');
$host=$env['DB_HOST']??'127.0.0.1';
$port=$env['DB_PORT']??'3306';
$user=$env['DB_USERNAME']??'';
$pass=$env['DB_PASSWORD']??'';
$central=$env['DB_DATABASE']??'paymydine';
$prefix=$env['DB_PREFIX']??'ti_';

$pdo=new PDO("mysql:host={$host};port={$port};dbname={$central};charset=utf8mb4",$user,$pass,[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
]);

$tenantTable=$prefix.'tenants';
$stmt=$pdo->prepare("SELECT id,name,domain,`database`,status FROM `{$tenantTable}` WHERE LOWER(domain)=? LIMIT 1");
$stmt->execute([$domain]);
$tenant=$stmt->fetch();
if (!$tenant) throw new RuntimeException('Tenant not found in central registry: '.$domain);

$db=trim((string)$tenant['database']);
if (!preg_match('/^[A-Za-z0-9_]{1,64}$/',$db)) throw new RuntimeException('Unsafe tenant DB identifier');

$label=explode('.',$domain)[0]??'';
if ($label==='') throw new RuntimeException('Unable to derive tenant name from domain');
$logo='https://'.$domain.'/brand/paymydine-logo.svg';

$tenantPdo=new PDO("mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4",$user,$pass,[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
]);

$settings=$prefix.'settings';
$locations=$prefix.'locations';

$before=['tenant'=>$tenant,'domain_label'=>$label,'logo'=>$logo,'settings'=>[],'location'=>null];
foreach (['site_name','site_logo'] as $item) {
    $q=$tenantPdo->prepare("SELECT * FROM `{$settings}` WHERE item=? LIMIT 1");
    $q->execute([$item]);
    $before['settings'][$item]=$q->fetch() ?: null;
}
try {
    $before['location']=$tenantPdo->query("SELECT * FROM `{$locations}` ORDER BY location_id LIMIT 1")->fetch() ?: null;
} catch (Throwable $e) {}
file_put_contents($backup.'/identity-before.json',json_encode($before,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));
chmod($backup.'/identity-before.json',0600);

$write=function(string $item,string $value) use ($tenantPdo,$settings) {
    $q=$tenantPdo->prepare("UPDATE `{$settings}` SET value=? WHERE item=?");
    $q->execute([$value,$item]);
    if ($q->rowCount()>0) return;

    $exists=$tenantPdo->prepare("SELECT COUNT(*) FROM `{$settings}` WHERE item=?");
    $exists->execute([$item]);
    if ((int)$exists->fetchColumn()>0) return;

    $insert=$tenantPdo->prepare("INSERT INTO `{$settings}` (item,value) VALUES (?,?)");
    $insert->execute([$item,$value]);
};

$tenantPdo->beginTransaction();
try {
    $write('site_name',$label);
    $write('site_logo',$logo);

    $cols=[];
    foreach ($tenantPdo->query("SHOW COLUMNS FROM `{$locations}`") as $col) $cols[$col['Field']]=true;
    $locationId=$tenantPdo->query("SELECT location_id FROM `{$locations}` ORDER BY location_id LIMIT 1")->fetchColumn();
    if ($locationId!==false && isset($cols['location_name'])) {
        if (isset($cols['permalink_slug'])) {
            $q=$tenantPdo->prepare("UPDATE `{$locations}` SET location_name=?, permalink_slug=? WHERE location_id=?");
            $q->execute([$label,$label,$locationId]);
        } else {
            $q=$tenantPdo->prepare("UPDATE `{$locations}` SET location_name=? WHERE location_id=?");
            $q->execute([$label,$locationId]);
        }
    }
    $tenantPdo->commit();
} catch (Throwable $e) {
    if ($tenantPdo->inTransaction()) $tenantPdo->rollBack();
    throw $e;
}

$name=$tenantPdo->prepare("SELECT value FROM `{$settings}` WHERE item='site_name' LIMIT 1");
$name->execute();
$logoQ=$tenantPdo->prepare("SELECT value FROM `{$settings}` WHERE item='site_logo' LIMIT 1");
$logoQ->execute();
$locationName=$tenantPdo->query("SELECT location_name FROM `{$locations}` ORDER BY location_id LIMIT 1")->fetchColumn();

$actualName=(string)$name->fetchColumn();
$actualLogo=(string)$logoQ->fetchColumn();
echo "VERIFY site_name={$actualName}\n";
echo "VERIFY location_name=".(string)$locationName."\n";
echo "VERIFY site_logo={$actualLogo}\n";
if ($actualName!==$label) throw new RuntimeException('site_name verification failed');
if ((string)$locationName!==$label) throw new RuntimeException('location_name verification failed');
if ($actualLogo!==$logo) throw new RuntimeException('site_logo verification failed');

echo "IDENTITY_READY {$domain} database={$db}\n";
PHP

echo
echo "6) Verifying canonical PayMyDine logo URL..."
curl -fsS --resolve "$DOMAIN:443:127.0.0.1" \
  -D "$TMP/logo.headers" \
  -o "$TMP/logo.svg" \
  "https://$DOMAIN/brand/paymydine-logo.svg"

grep -Ei '^(HTTP/|content-type:)' "$TMP/logo.headers" || true
test -s "$TMP/logo.svg"
echo "LOGO_READY https://$DOMAIN/brand/paymydine-logo.svg"

echo
echo "============================================================"
echo " TENANT IDENTITY BASELINE READY"
echo "============================================================"
echo "Backup: $BACKUP/identity-before.json"
echo "Restaurant name: ${DOMAIN%%.*}"
echo "Default logo: https://$DOMAIN/brand/paymydine-logo.svg"
echo "Future Super Admin tenant creation now enforces the same baseline."
