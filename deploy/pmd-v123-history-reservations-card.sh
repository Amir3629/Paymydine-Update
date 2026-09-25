#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="f2017e460fc1807fa64fea57c3a249c135cc7989"

FILES=(
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/assets/js/pmd-qpos-web-parity-v112.js"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/css/pmd-qpos-web-parity-v112.css"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/Http/Controllers/PmdMobileWorkspaceAuthController.php"
  "app/Services/PmdMobileSync/PmdMobileStaffGrantService.php"
  "app/Http/Controllers/PmdMobileWorkspaceSessionController.php"
  "app/Services/PmdMobileSync/PmdMobilePairingService.php"
)

log(){ printf '\n[PayMyDine V123] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V123][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V123 source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}"   || fail "V123 source commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v123-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v123-history-reservations-card-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

for rel in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel"
done

JS="$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
PARITY_JS="$STAGE/app/admin/assets/js/pmd-qpos-web-parity-v112.js"
CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
PARITY_CSS="$STAGE/app/admin/assets/css/pmd-qpos-web-parity-v112.css"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
AUTH="$STAGE/app/Http/Controllers/PmdMobileWorkspaceAuthController.php"
GRANT="$STAGE/app/Services/PmdMobileSync/PmdMobileStaffGrantService.php"
SESSION="$STAGE/app/Http/Controllers/PmdMobileWorkspaceSessionController.php"
PAIRING="$STAGE/app/Services/PmdMobileSync/PmdMobilePairingService.php"

log "Validating V123 before touching live files"

grep -Fq "name: 'Card'" "$JS"   || fail "Payment Card label missing"
if grep -Fq "name: 'Terminal'" "$JS"; then
  fail "Old visible Terminal payment label still present"
fi

grep -Fq "PMD_QPOS_HISTORY_INLINE_V123" "$JS"   || fail "Inline mobile History runtime missing"
grep -Fq "renderHistoryInlineDetailV123" "$JS"   || fail "Inline History renderer missing"
grep -Fq "sameOrder ? null : (orderId || null)" "$JS"   || fail "Inline History toggle behavior missing"

grep -Fq "PMD_QPOS_HISTORY_DATE_RANGE_V123" "$JS"   || fail "V123 date-range runtime missing"
grep -Fq "historyUsesCustomDatePickerV123" "$JS"   || fail "Desktop safe date picker missing"
grep -Fq "positionHistoryDatePickerV123" "$JS"   || fail "Desktop date picker viewport positioning missing"

grep -Fq "PMD_QPOS_HISTORY_INLINE_MOBILE_V123" "$CSS"   || fail "V123 History CSS missing"
grep -Fq "grid-template-columns: repeat(4,minmax(0,1fr)) !important" "$CSS"   || fail "Full-width four-button mobile date presets missing"
grep -Fq ".pmd-qpos-history-inline-detail-v123" "$CSS"   || fail "Inline History detail styling missing"
grep -Fq ".pmd-qpos-history-date-picker-v123" "$CSS"   || fail "Desktop date picker styling missing"

cmp -s "$JS" "$PARITY_JS"   || fail "Android/Web JS parity differs"
cmp -s "$CSS" "$PARITY_CSS"   || fail "Android/Web CSS parity differs"

grep -Fq "pmd-qpos-web-parity-v112.css?v=20260925-v123" "$VIEW"   || fail "Android V123 CSS cache-bust missing"
grep -Fq "pmd-quick-pos-v1.css?v=20260925-v123" "$VIEW"   || fail "Web V123 CSS cache-bust missing"
grep -Fq "pmd-qpos-web-parity-v112.js?v=20260925-v123" "$VIEW"   || fail "Android V123 JS cache-bust missing"
grep -Fq "pmd-quick-pos-v1.js?v=20260925-v123" "$VIEW"   || fail "Web V123 JS cache-bust missing"

grep -Fq "PMD_MOBILE_REQUESTED_SURFACE_AUTHORITY_V123" "$AUTH"   || fail "Reservations requested-surface authority missing"
grep -Fq "\$route = 'reservations2'" "$AUTH"   || fail "Reservations2 auth route missing"
grep -Fq "PMD_MOBILE_GRANT_SURFACE_V123" "$GRANT"   || fail "Signed mobile surface claim missing"
grep -Fq "'surface' => \$surface" "$GRANT"   || fail "Signed surface payload missing"
grep -Fq "PMD_MOBILE_RESERVATIONS_ROUTE_V123" "$SESSION"   || fail "Reservations session routing missing"
grep -Fq "\$legacySurface === 'auto'" "$SESSION"   || fail "Existing-APK surface=auto compatibility missing"
grep -Fq "\$route = 'reservations2'" "$SESSION"   || fail "Canonical Reservations2 session route missing"
grep -Fq "\$surface" "$PAIRING"   || fail "Initial pairing grant surface binding missing"

grep -Fq "PMD_QPOS_BATCH_MAIN_PAY_V122" "$JS"   || fail "V122 combined Pay behavior was lost"
grep -Fq "PMD_QPOS_SERVER_ROUND_AUTHORITY_V121" "$JS"   || fail "V121 Kitchen round authority was lost"
grep -Fq "PMD_QPOS_MOBILE_PAYMENT_STACK_V120" "$CSS"   || fail "V120 mobile payment layout was lost"

if command -v node >/dev/null 2>&1; then
  node --check "$JS" >/dev/null     || fail "Quick POS JavaScript syntax failed"
fi

for php_file in "$AUTH" "$GRANT" "$SESSION" "$PAIRING"; do
  php -l "$php_file" >/dev/null     || fail "PHP syntax failed: $php_file"
done

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$rel" ]] && EXISTING+=("$rel")
done

sudo tar -czf "$BACKUP" "${EXISTING[@]}"
sudo chmod 0640 "$BACKUP" || true

log "Installing validated V123 files"
for rel in "${FILES[@]}"; do
  src="$STAGE/$rel"
  dst="$PMD_ROOT/$rel"

  if [[ -f "$dst" ]]; then
    uid="$(stat -c '%u' "$dst")"
    gid="$(stat -c '%g' "$dst")"
    mode="$(stat -c '%a' "$dst")"
  else
    parent_dir="$(dirname "$dst")"
    sudo mkdir -p "$parent_dir"
    uid="$(stat -c '%u' "$PMD_ROOT/app/admin/controllers/PmdQuickPosV1.php")"
    gid="$(stat -c '%g' "$PMD_ROOT/app/admin/controllers/PmdQuickPosV1.php")"
    mode="644"
  fi

  sudo install -m "$mode" -o "$uid" -g "$gid" "$src" "$dst"
  echo "UPDATED: $rel"
done

sudo -u www-data php artisan view:clear >/dev/null 2>&1   || php artisan view:clear >/dev/null 2>&1   || true
sudo -u www-data php artisan cache:clear >/dev/null 2>&1   || php artisan cache:clear >/dev/null 2>&1   || true

cmp -s   app/admin/assets/js/pmd-quick-pos-v1.js   app/admin/assets/js/pmd-qpos-web-parity-v112.js   || fail "Live Android/Web JS parity verification failed"

cmp -s   app/admin/assets/css/pmd-quick-pos-v1.css   app/admin/assets/css/pmd-qpos-web-parity-v112.css   || fail "Live Android/Web CSS parity verification failed"

cat <<'EOF'

============================================================
 PAYMYDINE QUICK POS V123 COMPLETE
============================================================

RESERVATIONS
  Reservations workspace request
    = remains Reservations
    = opens canonical Reservations2
    = no fallback to Owner / Manager user dashboard

  Existing Android builds using surface=auto
    = signed staff grant carries requested surface
    = server restores Reservations correctly

PAYMENT
  Visible payment method
    Terminal -> Card

HISTORY / MOBILE
  Today / 7 days / 30 days / All time
    = four equal controls across the full available width

  All time
    = no fake blank From / To fields
    = date controls hide because there is no date boundary

  Tap a history order
    = detail expands directly underneath that order
    = later order cards move downward
    = tap the same order again to collapse it

HISTORY / DESKTOP
  Date field
    = uses PayMyDine in-frame calendar
    = opens above or below as space allows
    = clamps inside the visible browser frame

PRESERVED
  V122 KDS append refresh + combined multi-order Pay
  V121 server-side Kitchen round authority
  V121 floating payment keypad
  V120 clean mobile payment layout
  Android/Web JS + CSS parity

============================================================
EOF

printf 'Backup: %s\n' "$BACKUP"
