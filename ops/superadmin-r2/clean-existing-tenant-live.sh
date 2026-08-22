#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
DOMAIN="${1:-kult.paymydine.com}"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/storage/pmd-superadmin-r2-tenant-clean-$TS"
TMP="$(mktemp -d)"
META="$TMP/tenant.json"
CNF="$TMP/mysql.cnf"

cleanup(){ rm -rf "$TMP"; }
trap cleanup EXIT

[[ "$DOMAIN" =~ ^[a-z0-9-]+\.paymydine\.com$ ]] || { echo "Invalid tenant domain: $DOMAIN" >&2; exit 1; }
[[ -f "$ROOT/.env" ]] || { echo "Missing $ROOT/.env" >&2; exit 1; }
command -v php >/dev/null 2>&1 || { echo "php missing" >&2; exit 1; }
command -v mysqldump >/dev/null 2>&1 || { echo "mysqldump missing - refusing destructive cleanup without backup" >&2; exit 1; }
command -v gzip >/dev/null 2>&1 || { echo "gzip missing" >&2; exit 1; }

mkdir -p "$BACKUP"
chmod 700 "$BACKUP"

export PMD_ROOT="$ROOT" PMD_DOMAIN="$DOMAIN" PMD_META="$META" PMD_CNF="$CNF"

php <<'PHP'
<?php
$root = getenv('PMD_ROOT');
$domain = strtolower(trim((string)getenv('PMD_DOMAIN')));
$metaPath = getenv('PMD_META');
$cnfPath = getenv('PMD_CNF');

function readEnvFile(string $path): array {
    $out = [];
    foreach (file($path, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
        [$k,$v] = explode('=', $line, 2);
        $v = trim($v);
        if (strlen($v) >= 2 && (($v[0] === '"' && $v[-1] === '"') || ($v[0] === "'" && $v[-1] === "'"))) {
            $v = substr($v, 1, -1);
        }
        $out[trim($k)] = $v;
    }
    return $out;
}

$env = readEnvFile($root.'/.env');
$host = $env['DB_HOST'] ?? '127.0.0.1';
$port = $env['DB_PORT'] ?? '3306';
$user = $env['DB_USERNAME'] ?? '';
$pass = $env['DB_PASSWORD'] ?? '';
$central = $env['DB_DATABASE'] ?? 'paymydine';
$prefix = $env['DB_PREFIX'] ?? 'ti_';

$pdo = new PDO("mysql:host={$host};port={$port};dbname={$central};charset=utf8mb4", $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

$tenantTable = $prefix.'tenants';
$stmt = $pdo->prepare("SELECT id,name,domain,`database`,status FROM `{$tenantTable}` WHERE LOWER(domain)=? LIMIT 1");
$stmt->execute([$domain]);
$tenant = $stmt->fetch();
if (!$tenant) throw new RuntimeException('Tenant registry row not found for '.$domain);

$db = trim((string)$tenant['database']);
if (!preg_match('/^[A-Za-z0-9_]{1,64}$/', $db)) throw new RuntimeException('Unsafe tenant database identifier');
if (strcasecmp($db, $central) === 0 || strcasecmp($db, 'newtenantdb') === 0) {
    throw new RuntimeException('Refusing to clean central/template database');
}

$exists = $pdo->prepare('SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME=?');
$exists->execute([$db]);
if (!$exists->fetchColumn()) throw new RuntimeException('Tenant database does not exist: '.$db);

file_put_contents($metaPath, json_encode([
    'id'=>(int)$tenant['id'], 'name'=>(string)$tenant['name'], 'domain'=>(string)$tenant['domain'],
    'database'=>$db, 'status'=>(string)$tenant['status'], 'prefix'=>$prefix,
], JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));

$esc = static function(string $v): string {
    return '"'.str_replace(['\\','"'], ['\\\\','\\"'], $v).'"';
};
$cnf = "[client]\n".
    "host=".$esc($host)."\n".
    "port=".$esc((string)$port)."\n".
    "user=".$esc($user)."\n".
    "password=".$esc($pass)."\n".
    "default-character-set=utf8mb4\n";
file_put_contents($cnfPath, $cnf);
chmod($cnfPath, 0600);

echo "Tenant: {$tenant['name']}\nDomain: {$tenant['domain']}\nDatabase: {$db}\nStatus: {$tenant['status']}\n";
PHP

DB_NAME="$(php -r '$m=json_decode(file_get_contents($argv[1]),true); echo $m["database"];' "$META")"
TENANT_NAME="$(php -r '$m=json_decode(file_get_contents($argv[1]),true); echo $m["name"];' "$META")"

echo "============================================================"
echo " PMD R2 - CLEAN EXISTING TENANT BUSINESS DATA"
echo " Domain:   $DOMAIN"
echo " Database: $DB_NAME"
echo " Name:     $TENANT_NAME"
echo "============================================================"

echo
echo "1) Full database backup BEFORE cleanup..."
mysqldump \
  --defaults-extra-file="$CNF" \
  --single-transaction \
  --routines \
  --triggers \
  --hex-blob \
  "$DB_NAME" \
  | gzip -9 > "$BACKUP/${DB_NAME}-before-clean.sql.gz"

test -s "$BACKUP/${DB_NAME}-before-clean.sql.gz"
chmod 600 "$BACKUP/${DB_NAME}-before-clean.sql.gz"
echo "Backup OK: $BACKUP/${DB_NAME}-before-clean.sql.gz"

echo
echo "2) Cleaning ONLY restaurant/business/demo data..."
export PMD_META="$META"
php <<'PHP'
<?php
$root = getenv('PMD_ROOT');
$domain = strtolower(trim((string)getenv('PMD_DOMAIN')));
$meta = json_decode(file_get_contents(getenv('PMD_META')), true, 512, JSON_THROW_ON_ERROR);

function readEnvFile(string $path): array {
    $out=[];
    foreach (file($path, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
        $line=trim($line);
        if ($line==='' || str_starts_with($line,'#') || !str_contains($line,'=')) continue;
        [$k,$v]=explode('=',$line,2); $v=trim($v);
        if (strlen($v)>=2 && (($v[0]==='"'&&$v[-1]==='"')||($v[0]==="'"&&$v[-1]==="'"))) $v=substr($v,1,-1);
        $out[trim($k)]=$v;
    }
    return $out;
}

$env=readEnvFile($root.'/.env');
$host=$env['DB_HOST']??'127.0.0.1'; $port=$env['DB_PORT']??'3306';
$user=$env['DB_USERNAME']??''; $pass=$env['DB_PASSWORD']??'';
$db=(string)$meta['database']; $prefix=(string)$meta['prefix'];
$name=trim((string)$meta['name']);
$label=explode('.',$domain)[0]??'';
$display=$name!=='' ? $name : ($label!=='' ? $label : 'PayMyDine');

$pdo=new PDO("mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4",$user,$pass,[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
]);

$logicalTables=[
    'orders','order_menus','order_menu_options','order_totals','order_notes','payment_logs',
    'order_payment_transactions','order_payment_transaction_items','fiskaly_transactions','status_history','assignable_logs',
    'pmd_billing_groups','pmd_billing_group_orders','pmd_billing_group_payments',
    'reservations','reservation_tables','tables','table_notes','waiter_calls','valet_requests',
    'menus','menu_categories','menu_mealtimes','menus_specials','menu_images','menu_prices',
    'menu_item_options','menu_item_option_values','menu_options','menu_option_values',
    'categories','mealtimes','allergens','allergenables','stocks','stock_history',
    'igniter_coupons','coupons_history','gift_card_transactions',
    'customers','addresses','reviews','notifications'
];

$available=[];
foreach ($pdo->query('SHOW TABLES') as $row) $available[array_values($row)[0]]=true;
$before=[];

$pdo->exec('SET FOREIGN_KEY_CHECKS=0');
try {
    foreach ($logicalTables as $logical) {
        $physical=$prefix.$logical;
        if (!isset($available[$physical])) continue;
        $count=(int)$pdo->query('SELECT COUNT(*) FROM `'.str_replace('`','``',$physical).'`')->fetchColumn();
        $before[$logical]=$count;
        $pdo->exec('TRUNCATE TABLE `'.str_replace('`','``',$physical).'`');
        echo sprintf("CLEARED %-38s rows=%d\n", $logical, $count);
    }

    $locationables=$prefix.'locationables';
    if (isset($available[$locationables])) {
        $types=['tables','menus','categories','coupons','igniter_coupons','menu_options','allergens'];
        $quoted=implode(',',array_fill(0,count($types),'?'));
        $stmt=$pdo->prepare("DELETE FROM `{$locationables}` WHERE locationable_type IN ({$quoted})");
        $stmt->execute($types);
        echo "CLEANED locationables content links rows=".$stmt->rowCount()."\n";
    }
} finally {
    $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
}

// Restaurant identity: never inherit TastyIgniter/template branding.
$settings=$prefix.'settings';
if (isset($available[$settings])) {
    $stmt=$pdo->prepare("UPDATE `{$settings}` SET value=? WHERE item='site_name'");
    $stmt->execute([$display]);
    echo "IDENTITY site_name=".$display." rows=".$stmt->rowCount()."\n";
}

$locations=$prefix.'locations';
if (isset($available[$locations])) {
    $columns=[];
    foreach ($pdo->query("SHOW COLUMNS FROM `{$locations}`") as $col) $columns[$col['Field']]=true;
    if (isset($columns['location_name'])) {
        $id=$pdo->query("SELECT location_id FROM `{$locations}` ORDER BY location_id LIMIT 1")->fetchColumn();
        if ($id!==false) {
            $update=['location_name'=>$display];
            if (isset($columns['permalink_slug'])) {
                $slug=strtolower(trim(preg_replace('/[^a-z0-9]+/i','-',$label!==''?$label:$display),'-'));
                $update['permalink_slug']=$slug;
            }
            $sets=[]; $vals=[];
            foreach ($update as $k=>$v){$sets[]='`'.$k.'`=?';$vals[]=$v;}
            $vals[]=$id;
            $stmt=$pdo->prepare("UPDATE `{$locations}` SET ".implode(',',$sets)." WHERE location_id=?");
            $stmt->execute($vals);
            echo "IDENTITY location_name=".$display." location_id=".$id."\n";
        }
    }
}

$mustBeZero=['tables','menus','categories','igniter_coupons','orders','reservations','customers','order_payment_transactions'];
$failed=[];
foreach ($mustBeZero as $logical) {
    $physical=$prefix.$logical;
    if (!isset($available[$physical])) continue;
    $count=(int)$pdo->query('SELECT COUNT(*) FROM `'.str_replace('`','``',$physical).'`')->fetchColumn();
    echo "VERIFY {$logical}={$count}\n";
    if ($count!==0) $failed[]=$logical.'='.$count;
}
if ($failed) throw new RuntimeException('Cleanup verification failed: '.implode(', ',$failed));

echo "CLEAN_BASELINE_READY {$domain} database={$db}\n";
PHP

echo
echo "3) Final tenant identity + zero-data evidence..."
php -r '$m=json_decode(file_get_contents($argv[1]),true); echo "Registry name: ".$m["name"].PHP_EOL."Registry domain: ".$m["domain"].PHP_EOL."Database: ".$m["database"].PHP_EOL;' "$META"

echo
echo "============================================================"
echo " CLEANUP COMPLETE"
echo "============================================================"
echo "Backup: $BACKUP/${DB_NAME}-before-clean.sql.gz"
echo "Tenant: https://$DOMAIN"
echo "No other tenant database was modified."
