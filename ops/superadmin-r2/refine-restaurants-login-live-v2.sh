#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
PAYLOAD_REF="7548b1fc2b686eaac6708e08d8e9c1255c093974"
RAW_BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${PAYLOAD_REF}"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/storage/pmd-superadmin-ui-refine-$TS"
TMP="$(mktemp -d)"
RESTORE=0

FILES=(
  "app/admin/views/superadmin_r2/restaurants.blade.php"
  "app/admin/views/superadmin_r2/login.blade.php"
)

on_exit() {
  rc=$?
  if [[ "$rc" -ne 0 && "$RESTORE" -eq 1 ]]; then
    echo
    echo "!!! UI INSTALL FAILED - RESTORING BACKUP !!!"
    for rel in "${FILES[@]}"; do
      if [[ -f "$BACKUP/$rel" ]]; then
        sudo -n mkdir -p "$ROOT/$(dirname "$rel")"
        sudo -n cp -a "$BACKUP/$rel" "$ROOT/$rel" || true
      fi
    done
    if systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
      sudo -n systemctl reload php8.3-fpm >/dev/null 2>&1 || true
    fi
    echo "Rollback complete: $BACKUP"
  fi
  rm -rf "$TMP"
  exit "$rc"
}
trap on_exit EXIT

fail() { echo "FAIL: $*" >&2; return 1; }

mkdir -p "$BACKUP" "$TMP"

echo "============================================================"
echo " PMD SUPER ADMIN R2 - CLEAN RESTAURANTS + ADMIN LOGIN UI"
echo " Payload: $PAYLOAD_REF"
echo "============================================================"

echo
echo "1) Checking passwordless sudo..."
sudo -n true
echo "PASS"

echo
echo "2) Downloading ONLY the two UI files..."
for rel in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$rel")"
  echo "GET  $rel"
  curl -fsSL "$RAW_BASE/$rel" -o "$TMP/$rel"
done

echo
echo "3) Pre-validating UI..."
grep -Fq '<th>From</th>' "$TMP/app/admin/views/superadmin_r2/restaurants.blade.php"
grep -Fq '<th>To</th>' "$TMP/app/admin/views/superadmin_r2/restaurants.blade.php"
grep -Fq 'data-pmd-open-create' "$TMP/app/admin/views/superadmin_r2/restaurants.blade.php"
grep -Fq 'data-pmd-create-modal' "$TMP/app/admin/views/superadmin_r2/restaurants.blade.php"
grep -Fq 'pmd-auth-shell' "$TMP/app/admin/views/superadmin_r2/login.blade.php"
grep -Fq 'pmd-auth-right' "$TMP/app/admin/views/superadmin_r2/login.blade.php"
! grep -Fq 'scale(2.35)' "$TMP/app/admin/views/superadmin_r2/login.blade.php" || fail "old overlapping login scale is present"
echo "PASS"

echo
echo "4) Backing up current live UI..."
for rel in "${FILES[@]}"; do
  if sudo -n test -f "$ROOT/$rel"; then
    mkdir -p "$BACKUP/$(dirname "$rel")"
    sudo -n cp -a "$ROOT/$rel" "$BACKUP/$rel"
  fi
done
echo "Backup: $BACKUP"

RESTORE=1

echo
echo "5) Installing refined UI..."
for rel in "${FILES[@]}"; do
  sudo -n mkdir -p "$ROOT/$(dirname "$rel")"
  sudo -n install -o root -g root -m 0644 "$TMP/$rel" "$ROOT/$rel"
  echo "OK   $rel"
done

echo
echo "6) Verifying installed files..."
grep -Fq '<th>From</th>' "$ROOT/app/admin/views/superadmin_r2/restaurants.blade.php"
grep -Fq '<th>To</th>' "$ROOT/app/admin/views/superadmin_r2/restaurants.blade.php"
grep -Fq 'data-pmd-create-modal' "$ROOT/app/admin/views/superadmin_r2/restaurants.blade.php"
grep -Fq 'pmd-auth-shell' "$ROOT/app/admin/views/superadmin_r2/login.blade.php"
! grep -Fq 'scale(2.35)' "$ROOT/app/admin/views/superadmin_r2/login.blade.php"
echo "PASS"

echo
echo "7) Gracefully reloading PHP-FPM..."
if systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
  sudo -n systemctl reload php8.3-fpm
  echo "PASS"
else
  echo "php8.3-fpm not active; reload skipped"
fi

# UI installation is complete. The following checks are observational and must
# never roll back a valid UI because they verify separate routing concerns.
RESTORE=0

echo
echo "8) Disabled/active gate observation - READ ONLY..."
STATUS_TSV="$TMP/tenant-status.tsv"
PMD_ROOT="$ROOT" php <<'PHP' > "$STATUS_TSV"
<?php
$root = getenv('PMD_ROOT') ?: '/var/www/paymydine';
$env = [];
foreach (file($root.'/.env', FILE_IGNORE_NEW_LINES) ?: [] as $line) {
    $line = trim($line);
    if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
    [$k,$v] = explode('=', $line, 2);
    $env[trim($k)] = trim(trim($v), "\"'");
}
$pdo = new PDO(
    'mysql:host='.($env['DB_HOST'] ?? '127.0.0.1').';port='.($env['DB_PORT'] ?? '3306').';dbname='.($env['DB_DATABASE'] ?? 'paymydine').';charset=utf8mb4',
    $env['DB_USERNAME'] ?? '',
    $env['DB_PASSWORD'] ?? '',
    [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]
);
$table = str_replace('`','``',($env['DB_PREFIX'] ?? 'ti_').'tenants');
foreach ($pdo->query("SELECT domain,status FROM `{$table}` ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $domain = strtolower(trim((string)$row['domain']));
    $status = strtolower(trim((string)$row['status']));
    if (preg_match('/^[a-z0-9-]+\\.paymydine\\.com$/', $domain)) echo $domain."\t".$status."\n";
}
PHP

ACTIVE_HOST="$(awk -F '\t' '$2=="active"{print $1; exit}' "$STATUS_TSV")"
BLOCKED_HOST="$(awk -F '\t' '$2!="active"{print $1; exit}' "$STATUS_TSV")"

if [[ -n "$ACTIVE_HOST" ]]; then
  RESULT="$(curl -skS --resolve "$ACTIVE_HOST:443:127.0.0.1" -o /dev/null -w '%{http_code}\t%{redirect_url}' "https://$ACTIVE_HOST/" || true)"
  echo "ACTIVE   $ACTIVE_HOST   $RESULT"
fi
if [[ -n "$BLOCKED_HOST" ]]; then
  RESULT="$(curl -skS --resolve "$BLOCKED_HOST:443:127.0.0.1" -o /dev/null -w '%{http_code}\t%{redirect_url}' "https://$BLOCKED_HOST/" || true)"
  echo "BLOCKED  $BLOCKED_HOST  $RESULT"
  if [[ "$RESULT" == $'302\thttps://paymydine.com/' ]]; then
    echo "GATE_OK disabled tenant redirects to PayMyDine"
  else
    echo "GATE_CHECK needed: expected 302 -> https://paymydine.com/"
  fi
fi

echo
echo "9) Root Super Admin login observation - READ ONLY..."
for host in paymydine.com www.paymydine.com; do
  HTML="$TMP/login-${host}.html"
  CODE="$(curl -skS --resolve "$host:443:127.0.0.1" -o "$HTML" -w '%{http_code}' "https://$host/superadmin/login" || true)"
  if grep -Fq 'pmd-auth-shell' "$HTML" 2>/dev/null; then
    echo "$host -> HTTP $CODE LOGIN_UI_READY"
  else
    REDIRECT="$(curl -skS --resolve "$host:443:127.0.0.1" -o /dev/null -w '%{redirect_url}' "https://$host/superadmin/login" || true)"
    echo "$host -> HTTP $CODE redirect=$REDIRECT"
  fi
done

echo
echo "10) UI evidence..."
grep -oE '<th>(From|To)</th>|data-pmd-(open-create|create-modal)' "$ROOT/app/admin/views/superadmin_r2/restaurants.blade.php" | sort -u

echo
echo "============================================================"
echo " SUPER ADMIN UI REFINE COMPLETE"
echo "============================================================"
echo "Backup: $BACKUP"
echo "No database rows changed."
echo "No tenant databases changed."
echo "No Nginx config changed."
echo "No git pull/reset/checkout."
