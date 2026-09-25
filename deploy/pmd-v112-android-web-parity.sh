#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="54c601d20643c93d998e43351e6fe53e03168bfb"

FILES=(
  "app/admin/assets/css/pmd-qpos-web-parity-v112.css"
  "app/admin/assets/js/pmd-qpos-web-parity-v112.js"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)

CANONICAL_CSS="app/admin/assets/css/pmd-quick-pos-v1.css"
CANONICAL_JS="app/admin/assets/js/pmd-quick-pos-v1.js"

log(){ printf '\n[PayMyDine V112] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V112][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V112 Web-parity commit"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}"   || fail "V112 commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v112-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v112-web-parity-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

for rel in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel"
done

mkdir -p "$STAGE/$(dirname "$CANONICAL_CSS")"
mkdir -p "$STAGE/$(dirname "$CANONICAL_JS")"
"${GIT[@]}" show "${SOURCE_COMMIT}:$CANONICAL_CSS" > "$STAGE/$CANONICAL_CSS"
"${GIT[@]}" show "${SOURCE_COMMIT}:$CANONICAL_JS" > "$STAGE/$CANONICAL_JS"

PARITY_CSS="$STAGE/app/admin/assets/css/pmd-qpos-web-parity-v112.css"
PARITY_JS="$STAGE/app/admin/assets/js/pmd-qpos-web-parity-v112.js"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

cmp -s "$PARITY_CSS" "$STAGE/$CANONICAL_CSS"   || fail "Android parity CSS is not byte-identical to Web CSS"
cmp -s "$PARITY_JS" "$STAGE/$CANONICAL_JS"   || fail "Android parity JS is not byte-identical to Web JS"

grep -Fq "PMD_QPOS_WEB_PARITY_V112" "$VIEW"   || fail "V112 Web-parity view marker missing"
grep -Fq "pmd-qpos-web-parity-v112.css?v=20260925-v112" "$VIEW"   || fail "V112 parity CSS link missing"
grep -Fq "pmd-qpos-web-parity-v112.js?v=20260925-v112" "$VIEW"   || fail "V112 parity JS link missing"

for forbidden in   "pmd-qpos-android-form-factor-v107.css"   "pmd-qpos-android-tablet-v111.css"   "pmd-qpos-android-form-factor-v107.js"   "pmd-qpos-android-runtime-v108.js"   "pmd-qpos-android-pos-v107"
do
  if grep -Fq "$forbidden" "$VIEW"; then
    fail "Old Android-only layout/runtime is still referenced: $forbidden"
  fi
done

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$rel" ]] && EXISTING+=("$rel")
done
sudo tar -czf "$BACKUP" "${EXISTING[@]}"
sudo chmod 0640 "$BACKUP" || true

log "Installing exact Web CSS/JS parity for Android"
for rel in "${FILES[@]}"; do
  dst="$PMD_ROOT/$rel"

  if [[ -f "$dst" ]]; then
    uid="$(stat -c '%u' "$dst")"
    gid="$(stat -c '%g' "$dst")"
    mode="$(stat -c '%a' "$dst")"
  elif [[ "$rel" == *.css ]]; then
    ref="$PMD_ROOT/$CANONICAL_CSS"
    uid="$(stat -c '%u' "$ref")"
    gid="$(stat -c '%g' "$ref")"
    mode="$(stat -c '%a' "$ref")"
  elif [[ "$rel" == *.js ]]; then
    ref="$PMD_ROOT/$CANONICAL_JS"
    uid="$(stat -c '%u' "$ref")"
    gid="$(stat -c '%g' "$ref")"
    mode="$(stat -c '%a' "$ref")"
  else
    ref="$PMD_ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
    uid="$(stat -c '%u' "$ref")"
    gid="$(stat -c '%g' "$ref")"
    mode="$(stat -c '%a' "$ref")"
  fi

  sudo install -m "$mode" -o "$uid" -g "$gid" "$STAGE/$rel" "$dst"
  echo "UPDATED: $rel"
done

sudo -u www-data php artisan view:clear >/dev/null 2>&1   || php artisan view:clear >/dev/null 2>&1   || true
sudo -u www-data php artisan cache:clear >/dev/null 2>&1   || php artisan cache:clear >/dev/null 2>&1   || true

cmp -s   "app/admin/assets/css/pmd-qpos-web-parity-v112.css"   "$STAGE/$CANONICAL_CSS"   || fail "Live parity CSS verification failed"

cmp -s   "app/admin/assets/js/pmd-qpos-web-parity-v112.js"   "$STAGE/$CANONICAL_JS"   || fail "Live parity JS verification failed"

for forbidden in   "pmd-qpos-android-form-factor-v107.css"   "pmd-qpos-android-tablet-v111.css"   "pmd-qpos-android-form-factor-v107.js"   "pmd-qpos-android-runtime-v108.js"   "pmd-qpos-android-pos-v107"
do
  if grep -Fq "$forbidden" "app/admin/views/pmd_quick_pos_v1.blade.php"; then
    fail "Live View still references Android-only override: $forbidden"
  fi
done

cat <<'EOF'

============================================================
 PAYMYDINE QUICK POS V112 ANDROID = WEB PARITY COMPLETE
============================================================

ANDROID CASHIER APP
  Quick POS CSS = EXACT SAME FILE CONTENT AS WEB
  Quick POS JS  = EXACT SAME FILE CONTENT AS WEB

REMOVED FROM ACTIVE APP PAGE
  Android form-factor V107 stylesheet
  Android tablet V111 stylesheet
  Android form-factor V107 runtime
  Android-specific V108 runtime copy
  Android visual/layout class

NO TABLET-SPECIFIC CARD DESIGN IS ACTIVE.

The app now lets the SAME Web CSS/JS decide:
  Table cards
  Food cards
  Check cards
  Desktop/tablet/mobile breakpoints
  Portrait/landscape layout
  Checkout behavior

PRESERVED
  V108 Pay-before-Kitchen (it is already in canonical Web JS/backend)
  WebView viewport normalization
  native login/session
  offline/native transport
  payment/KDS backend
  database

After deploy:
  1. Force-stop Cashier App.
  2. Open while online.
  3. Compare directly with the Web Quick POS at the same viewport/orientation.

============================================================
EOF

printf 'Backup: %s\n' "$BACKUP"
