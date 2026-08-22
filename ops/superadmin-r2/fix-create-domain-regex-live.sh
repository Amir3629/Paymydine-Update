#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
PAYLOAD_REF="1db713758de9e20f0eabd55fa9958eaab3da9976"
RAW_BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${PAYLOAD_REF}"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/storage/pmd-superadmin-create-regex-fix-$TS"
TMP="$(mktemp -d)"
RESTORE=0

FILES=(
  "app/admin/controllers/SuperAdminR2Controller.php"
  "app/Http/Middleware/SuperAdminTenantIdentityBaseline.php"
)

cleanup() { rm -rf "$TMP"; }
rollback() {
  rc=$?
  if [ "$RESTORE" -eq 1 ]; then
    echo
    echo "FIX FAILED - restoring previous files..."
    for rel in "${FILES[@]}"; do
      if [ -f "$BACKUP/$rel" ]; then
        sudo -n mkdir -p "$ROOT/$(dirname "$rel")"
        sudo -n cp -a "$BACKUP/$rel" "$ROOT/$rel"
      fi
    done
    if systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
      sudo -n systemctl reload php8.3-fpm >/dev/null 2>&1 || true
    fi
    echo "Rollback complete: $BACKUP"
  fi
  cleanup
  exit "$rc"
}
trap rollback ERR INT TERM
trap cleanup EXIT

cd "$ROOT"

echo "============================================================"
echo " PMD SUPER ADMIN - RESTAURANT CREATE REGEX FIX"
echo " Payload: $PAYLOAD_REF"
echo "============================================================"

echo
echo "1) Checking sudo..."
sudo -n true
echo "PASS"

echo
echo "2) Current failure evidence - READ ONLY..."
LOG="$ROOT/storage/logs/system.log"
if [ -f "$LOG" ]; then
  grep -E "pmd_superadmin_r2_store_http_failed|preg_replace\(\): Unknown modifier" "$LOG" | tail -n 10 || true
fi

echo
echo "3) Downloading patched authority files..."
for rel in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$rel")"
  echo "GET  $rel"
  curl -fsSL "$RAW_BASE/$rel" -o "$TMP/$rel"
done

echo
echo "4) Pre-validating PHP + exact regex..."
for rel in "${FILES[@]}"; do
  php -l "$TMP/$rel"
  if grep -Fq "preg_replace('#[/?#].*$#'" "$TMP/$rel"; then
    echo "FAIL: broken delimiter pattern still exists in $rel"
    exit 21
  fi
  grep -Fq "preg_replace('~[/?#].*$~'" "$TMP/$rel"
done
php -r '$v="rusty.paymydine.com"; $v=preg_replace("~[/?#].*$~", "", $v); if ($v!=="rusty.paymydine.com") {fwrite(STDERR,"regex smoke test failed\n"); exit(1);} echo "REGEX_SMOKE_PASS $v\n";'
echo "PASS"

echo
echo "5) Backing up current production files..."
mkdir -p "$BACKUP"
for rel in "${FILES[@]}"; do
  mkdir -p "$BACKUP/$(dirname "$rel")"
  cp -a "$ROOT/$rel" "$BACKUP/$rel" 2>/dev/null || sudo -n cp -a "$ROOT/$rel" "$BACKUP/$rel"
done
echo "Backup: $BACKUP"
RESTORE=1

echo
echo "6) Installing patched files..."
for rel in "${FILES[@]}"; do
  sudo -n install -o root -g root -m 0644 "$TMP/$rel" "$ROOT/$rel"
  echo "OK   $rel"
done

echo
echo "7) Final production validation..."
for rel in "${FILES[@]}"; do
  php -l "$ROOT/$rel"
  if grep -Fq "preg_replace('#[/?#].*$#'" "$ROOT/$rel"; then
    echo "FAIL: broken regex remains in production: $rel"
    exit 31
  fi
  grep -Fq "preg_replace('~[/?#].*$~'" "$ROOT/$rel"
done
echo "PASS"

echo
echo "8) Gracefully reloading PHP-FPM..."
if systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
  sudo -n systemctl reload php8.3-fpm
  echo "PASS"
else
  echo "php8.3-fpm is not active; no reload performed."
fi

echo
echo "9) Route observation - READ ONLY..."
curl -skS -o /dev/null -D - "https://paymydine.com/superadmin/new" | awk 'BEGIN{IGNORECASE=1}/^HTTP\//{code=$2}/^location:/{loc=$2}END{gsub("\r","",loc);printf "/superadmin/new -> HTTP %s%s\n",code,(loc!=""?" redirect=" loc:"")}'

RESTORE=0

echo
echo "============================================================"
echo " CREATE REGEX FIX COMPLETE"
echo "============================================================"
echo "Backup: $BACKUP"
echo
echo "Root cause fixed:"
echo " - invalid PHP PCRE delimiter in restaurant-domain normalization"
echo " - fixed in both the active R2 controller and the legacy identity-baseline guard"
echo
echo "NOT changed:"
echo " - central database rows"
echo " - restaurant databases"
echo " - Nginx"
echo " - Certbot"
echo " - PM2"
echo " - Git checkout"
echo
echo "Now retry creating the restaurant once. If it still fails, run:"
echo "grep -E 'pmd_superadmin_r2_store_http_failed|pmd_superadmin_r2_tenant_create_failed' $ROOT/storage/logs/system.log | tail -n 12"
