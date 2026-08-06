#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
FRONTEND="$ROOT/frontend"
PM2_NAME="paymydine-frontend"

KAZEN_TSX="$FRONTEND/app/themes/kazen-japanese/KazenStandalonePage.tsx"
KAZEN_CSS="$FRONTEND/app/themes/kazen-japanese/kazen-standalone.css"
FORM_TABS="$ROOT/app/admin/views/orders/form/form_tabs.blade.php"
ORDER_DETAILS="$ROOT/app/admin/views/orders/form/order_details.blade.php"
ADMIN_I18N="$ROOT/app/admin/views/_partials/pmd_admin_i18n.blade.php"
ORDER_EDIT_CSS="$ROOT/app/admin/assets/css/pmd-order-edit-v2.css"
ORDER_EDIT_JS="$ROOT/app/admin/assets/js/pmd-order-edit-v2.js"

EXPECTED_KAZEN_TSX_SHA="9944714c79fd9e11c8784141966daa6f0105cc1abcc0aa39013e01c80a3e3c95"
EXPECTED_KAZEN_CSS_SHA="cbc21e88a4a65508e78636124c64c2ecb7c8ea5e4885b60ba4adc7f7a4e06de9"
EXPECTED_FORM_TABS_SHA="fb120d6893c8a6cc112c26572524a5cde8df637e9ad9db9f0c33f3cf88bcc18a"
EXPECTED_ORDER_DETAILS_SHA="b3a9b30dbed0a749b3bf0e1b207b439393b6450e0e8a92f63e7f5a4e24ee1fb6"
EXPECTED_ADMIN_I18N_SHA="d303e69632d52c0f7389eddce3a95fb44bc7b423f8913c298bb7c86b48dbb2e9"

ASSET_COMMIT="e22f9ad067b90a2232724393c7d010afffda68fc"
RAW_BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/$ASSET_COMMIT"
MARKER="PMD_KAZEN_ORDER_EDIT_V2_DEPLOY"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="$ROOT/storage/deploy-backups/kazen-order-edit-v2-$STAMP"
TMP="$(mktemp -d /tmp/pmd-kazen-order-edit-v2.XXXXXX)"
OLD_NEXT="$BACKUP/.next.previous"
ABSENT_MANIFEST="$BACKUP/absent-files.txt"

INSTALL_STARTED=0
NEXT_MOVED=0
SUCCESS=0

cleanup() {
  rm -rf "$TMP"
}

detect_fpm() {
  systemctl list-units \
    --type=service \
    --state=active \
    --no-legend 2>/dev/null |
  awk '$1 ~ /^php[0-9.]+-fpm\.service$/ { print $1; exit }'
}

reload_backend() {
  cd "$ROOT"
  php artisan view:clear || true

  local service
  service="$(detect_fpm || true)"
  if [ -n "$service" ]; then
    echo "Reloading PHP-FPM: $service"
    sudo systemctl reload "$service"
  else
    echo "WARNING: active PHP-FPM service was not detected."
  fi
}

restore_target() {
  local target="$1"
  local relative="${target#$ROOT/}"
  local saved="$BACKUP/files/$relative"

  if [ -f "$saved" ]; then
    sudo mkdir -p "$(dirname "$target")"
    sudo cp -a "$saved" "$target"
  elif [ -f "$ABSENT_MANIFEST" ] && grep -Fxq "$relative" "$ABSENT_MANIFEST"; then
    sudo rm -f "$target"
  fi
}

rollback() {
  local code="${1:-1}"

  if [ "$INSTALL_STARTED" -ne 1 ]; then
    return "$code"
  fi

  echo
  echo "============================================================"
  echo "ROLLBACK STARTED"
  echo "============================================================"

  restore_target "$KAZEN_TSX"
  restore_target "$KAZEN_CSS"
  restore_target "$FORM_TABS"
  restore_target "$ORDER_DETAILS"
  restore_target "$ADMIN_I18N"
  restore_target "$ORDER_EDIT_CSS"
  restore_target "$ORDER_EDIT_JS"

  if [ "$NEXT_MOVED" -eq 1 ]; then
    sudo rm -rf "$FRONTEND/.next"
    if [ -d "$OLD_NEXT" ]; then
      sudo mv "$OLD_NEXT" "$FRONTEND/.next"
    fi
  fi

  reload_backend || true
  pm2 restart "$PM2_NAME" --update-env || true

  echo "Rollback completed."
  return "$code"
}

finish() {
  local code=$?

  if [ "$code" -ne 0 ] && [ "$SUCCESS" -ne 1 ]; then
    rollback "$code" || true
  fi

  cleanup
  exit "$code"
}
trap finish EXIT

sha_of() {
  sudo sha256sum "$1" | awk '{print $1}'
}

assert_sha() {
  local file="$1"
  local expected="$2"
  local actual

  sudo test -f "$file" || {
    echo "ERROR: Required file missing: $file"
    exit 1
  }

  actual="$(sha_of "$file")"
  echo
  echo "File: $file"
  echo "Expected SHA: $expected"
  echo "Current SHA:  $actual"

  if [ "$actual" != "$expected" ]; then
    echo "ERROR: Live baseline changed. Nothing modified."
    exit 1
  fi
}

install_preserving_target() {
  local source="$1"
  local target="$2"
  local uid gid mode

  uid="$(stat -c '%u' "$target")"
  gid="$(stat -c '%g' "$target")"
  mode="$(stat -c '%a' "$target")"
  sudo install -o "$uid" -g "$gid" -m "$mode" "$source" "$target"
}

install_new_asset() {
  local source="$1"
  local target="$2"
  local parent uid gid

  parent="$(dirname "$target")"
  sudo mkdir -p "$parent"
  uid="$(stat -c '%u' "$parent")"
  gid="$(stat -c '%g' "$parent")"
  sudo install -o "$uid" -g "$gid" -m 0644 "$source" "$target"
}

compile_blade() {
  local source="$1"
  local output="$2"

  SOURCE_FILE="$source" OUTPUT_FILE="$output" php <<'PHP'
<?php
require '/var/www/paymydine/vendor/autoload.php';
$app = require '/var/www/paymydine/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$source = file_get_contents(getenv('SOURCE_FILE'));
if ($source === false) {
    throw new RuntimeException('Unable to read Blade source.');
}
file_put_contents(
    getenv('OUTPUT_FILE'),
    app('blade.compiler')->compileString($source)
);
PHP

  php -l "$output" >/dev/null
}

echo "============================================================"
echo "PayMyDine — Stable Kazen Counts + Order Edit V2"
echo "Guarded deployment with automatic rollback"
echo "============================================================"

for command in curl python3 php npm pm2; do
  command -v "$command" >/dev/null || {
    echo "ERROR: Required command not found: $command"
    exit 1
  }
done

assert_sha "$KAZEN_TSX" "$EXPECTED_KAZEN_TSX_SHA"
assert_sha "$KAZEN_CSS" "$EXPECTED_KAZEN_CSS_SHA"
assert_sha "$FORM_TABS" "$EXPECTED_FORM_TABS_SHA"
assert_sha "$ORDER_DETAILS" "$EXPECTED_ORDER_DETAILS_SHA"
assert_sha "$ADMIN_I18N" "$EXPECTED_ADMIN_I18N_SHA"

if sudo grep -q 'PMD_KAZEN_MENU_ITEM_SELECTED_COUNT_STABLE_V2' "$KAZEN_TSX" || \
   sudo grep -q 'PMD_ORDER_EDIT_V2_LOADER' "$ADMIN_I18N"; then
  echo "ERROR: V2 markers already exist while baseline SHAs are still expected."
  echo "Nothing modified."
  exit 1
fi

mkdir -p \
  "$TMP/frontend" \
  "$TMP/admin" \
  "$TMP/assets" \
  "$TMP/compiled"

sudo cat "$KAZEN_TSX" > "$TMP/frontend/KazenStandalonePage.tsx"
sudo cat "$KAZEN_CSS" > "$TMP/frontend/kazen-standalone.css"
sudo cat "$FORM_TABS" > "$TMP/admin/form_tabs.blade.php"
sudo cat "$ORDER_DETAILS" > "$TMP/admin/order_details.blade.php"
sudo cat "$ADMIN_I18N" > "$TMP/admin/pmd_admin_i18n.blade.php"

echo
echo "Downloading immutable Order Edit V2 assets..."
curl -fsSL --retry 3 --retry-delay 2 \
  "$RAW_BASE/app/admin/assets/css/pmd-order-edit-v2.css" \
  -o "$TMP/assets/pmd-order-edit-v2.css"
curl -fsSL --retry 3 --retry-delay 2 \
  "$RAW_BASE/app/admin/assets/js/pmd-order-edit-v2.js" \
  -o "$TMP/assets/pmd-order-edit-v2.js"

python3 - \
  "$TMP/frontend/KazenStandalonePage.tsx" \
  "$TMP/frontend/kazen-standalone.css" \
  "$TMP/admin/form_tabs.blade.php" \
  "$TMP/admin/order_details.blade.php" \
  "$TMP/admin/pmd_admin_i18n.blade.php" <<'PY'
from pathlib import Path
import re
import sys

kazen_tsx = Path(sys.argv[1])
kazen_css = Path(sys.argv[2])
form_tabs = Path(sys.argv[3])
order_details = Path(sys.argv[4])
admin_i18n = Path(sys.argv[5])

# ---------------------------------------------------------------------------
# Frontend: stable child tree for the add/count control.
# React must never remove/replace a child that a legacy DOM helper may touch.
# ---------------------------------------------------------------------------
text = kazen_tsx.read_text()
marker = "PMD_KAZEN_MENU_ITEM_SELECTED_COUNT_STABLE_V2"
if marker in text:
    raise SystemExit("stable Kazen marker already present")

pattern = re.compile(
    r'\{selectedQuantity > 0 \? \(\s*'
    r'<span className="kazen-add-count" aria-hidden="true">\{selectedQuantity\}</span>\s*'
    r'\) : \(\s*'
    r'<Plus className="h-5 w-5" />\s*'
    r'\)\}'
)

replacement = (
    '<span className="kazen-add-plus" aria-hidden="true">+</span>\n'
    '                          <span className="kazen-add-count" aria-hidden="true">\n'
    '                            {selectedQuantity > 0 ? selectedQuantity : ""}\n'
    '                          </span>'
)

text, count = pattern.subn(replacement, text)
if count != 2:
    raise SystemExit(f"expected two unstable add/count render blocks; found {count}")

anchor = "// PMD_KAZEN_MENU_ITEM_SELECTED_COUNT_V1"
if text.count(anchor) != 1:
    raise SystemExit("Kazen selected-count V1 marker guard failed")
text = text.replace(
    anchor,
    anchor + "\n  // PMD_KAZEN_MENU_ITEM_SELECTED_COUNT_STABLE_V2",
    1,
)
kazen_tsx.write_text(text)

css = kazen_css.read_text()
if "PMD_KAZEN_MENU_ITEM_SELECTED_COUNT_STYLE_V2" in css:
    raise SystemExit("stable Kazen count CSS already present")

css += r'''

/* PMD_KAZEN_MENU_ITEM_SELECTED_COUNT_STYLE_V2
   Keep the add button child tree stable: visibility changes, DOM nodes do not. */
html body .kazen-page .kazen-item > button.kazen-add .kazen-add-plus {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  height: 100% !important;
  color: currentColor !important;
  font-family: Arial, sans-serif !important;
  font-size: 2rem !important;
  font-weight: 300 !important;
  line-height: 1 !important;
}

html body .kazen-page .kazen-item > button.kazen-add .kazen-add-count {
  display: none !important;
}

html body .kazen-page .kazen-item > button.kazen-add.has-selected-count .kazen-add-plus {
  display: none !important;
}

html body .kazen-page .kazen-item > button.kazen-add.has-selected-count .kazen-add-count {
  display: inline-flex !important;
}
'''
kazen_css.write_text(css)

# ---------------------------------------------------------------------------
# Admin Form Tabs: remove the old giant inline style/script authority.
# The new route-scoped CSS is the single layout authority.
# ---------------------------------------------------------------------------
text = form_tabs.read_text()
if "PMD_ORDER_EDIT_V2_BASE_STYLE_MOVED_TO_ASSET" in text:
    raise SystemExit("Order Edit V2 form-tabs marker already present")

loop_anchor = "@if ($loop->iteration == 1)"
if text.count(loop_anchor) != 1:
    raise SystemExit("form-tabs first-tab anchor guard failed")
loop_index = text.index(loop_anchor)
style_start = text.find("<style>", loop_index)
layout_start = text.find('<div class="order-edit-pos-layout"', loop_index)
style_end = text.find("</style>", style_start)

if min(style_start, style_end, layout_start) < 0 or not (style_start < style_end < layout_start):
    raise SystemExit("unable to isolate legacy Order Edit inline style block")

text = (
    text[:style_start]
    + "{{-- PMD_ORDER_EDIT_V2_BASE_STYLE_MOVED_TO_ASSET --}}\n                    "
    + text[style_end + len("</style>"):]
)

force_comment = "<!-- Force second card visible on mobile -->"
if text.count(force_comment) != 1:
    raise SystemExit("legacy mobile-force script guard failed")
force_start = text.index(force_comment)
script_start = text.find("<script>", force_start)
script_end = text.find("</script>", script_start)
if script_start < 0 or script_end < 0:
    raise SystemExit("legacy mobile-force script boundaries not found")
text = text[:force_start] + "{{-- PMD_ORDER_EDIT_V2_LEGACY_MOBILE_SCRIPT_REMOVED --}}\n" + text[script_end + len("</script>"):]

text, count = re.subn(
    r'<div class="order-edit-pos-layout"\s+style="[^"]*">',
    '<div class="order-edit-pos-layout">',
    text,
    count=1,
)
if count != 1:
    raise SystemExit("order-edit layout inline-style removal failed")

text, count = re.subn(
    r'<div class="pos-info-column"\s+style="[^"]*">',
    '<div class="pos-info-column">',
    text,
    count=1,
)
if count != 1:
    raise SystemExit("info-column inline-style removal failed")

text, count = re.subn(
    r'<div class="card bg-light shadow-sm pos-combined-info-card"\s+style="[^"]*">',
    '<div class="card bg-light shadow-sm pos-combined-info-card">',
    text,
    count=1,
)
if count != 1:
    raise SystemExit("combined-card inline-style removal failed")


def replace_after(source: str, anchor: str, old: str, new: str) -> str:
    if source.count(anchor) != 1:
        raise SystemExit(f"section anchor guard failed: {anchor}")
    start = source.index(anchor)
    found = source.find(old, start)
    if found < 0:
        raise SystemExit(f"section wrapper not found after: {anchor}")
    return source[:found] + new + source[found + len(old):]

text = replace_after(
    text,
    "<!-- Invoice/Order Details Section -->",
    '<div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 2px solid #e5e9f2;">',
    '<div class="pmd-order-section pmd-order-section-invoice">',
)
text = replace_after(
    text,
    "<!-- Customer Section -->",
    '<div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 2px solid #e5e9f2;">',
    '<div class="pmd-order-section pmd-order-section-customer">',
)
text = replace_after(
    text,
    "<!-- Location Section -->",
    '<div style="margin-bottom: 0;">',
    '<div class="pmd-order-section pmd-order-section-location">',
)

form_tabs.write_text(text)

# ---------------------------------------------------------------------------
# Admin payment summary: compact transaction cards, no duplicated item wall.
# ---------------------------------------------------------------------------
text = order_details.read_text()
if "PMD_ORDER_DETAILS_COMPACT_PAYMENTS_V2" in text:
    raise SystemExit("compact payment marker already present")

header_anchor = "{{-- PMD_ORDER_DETAILS_TRUE_PARTIAL_V1 --}}"
if text.count(header_anchor) != 1:
    raise SystemExit("order-details header marker guard failed")
text = text.replace(
    header_anchor,
    header_anchor + "\n{{-- PMD_ORDER_DETAILS_COMPACT_PAYMENTS_V2 --}}",
    1,
)

old = '<tr>\n<td class="text-muted align-top">Items</td>'
new = '<tr class="pmd-payment-history-row">\n<td class="text-muted align-top">Payments</td>'
if text.count(old) != 1:
    raise SystemExit("payment-history row guard failed")
text = text.replace(old, new, 1)

old = '<div style="border:1px solid #eceef4;border-radius:10px;padding:8px 10px;margin-bottom:8px;">'
if text.count(old) != 1:
    raise SystemExit("payment transaction wrapper guard failed")
text = text.replace(old, '<div class="pmd-payment-transaction">', 1)

old = '<div style="display:flex;justify-content:space-between;gap:10px;">'
if text.count(old) != 1:
    raise SystemExit("payment transaction header guard failed")
text = text.replace(old, '<div class="pmd-payment-transaction-head">', 1)

old = '<div style="margin-top:6px;font-size:12px;color:#5f6368;">'
if text.count(old) != 1:
    raise SystemExit("payment adjustment wrapper guard failed")
text = text.replace(old, '<div class="pmd-payment-adjustment">', 1)

order_details.write_text(text)

# ---------------------------------------------------------------------------
# Replace the old observer-based loader with CSS-before-paint + finite-run JS.
# ---------------------------------------------------------------------------
text = admin_i18n.read_text()
old_marker = "{{-- PMD_ORDER_EDIT_POLISH_LOADER_V1 --}}"
if text.count(old_marker) != 1:
    raise SystemExit("old Order Edit polish loader marker guard failed")

start = text.index(old_marker)
end = text.find("@endif", start)
if end < 0:
    raise SystemExit("old Order Edit loader closing @endif not found")
end += len("@endif")
old_block = text[start:end]
if "pmd-order-edit-polish-v1.js" not in old_block:
    raise SystemExit("old Order Edit loader block is not the expected block")

new_block = r'''{{-- PMD_ORDER_EDIT_V2_LOADER --}}
@php
    $pmdOrderEditV2Active = function_exists('request')
        && preg_match('#^admin/orders/edit/\d+$#', trim(request()->path(), '/'));
    $pmdOrderEditV2CssPath = base_path('app/admin/assets/css/pmd-order-edit-v2.css');
    $pmdOrderEditV2JsPath = base_path('app/admin/assets/js/pmd-order-edit-v2.js');
    $pmdOrderEditV2CssVersion = is_file($pmdOrderEditV2CssPath)
        ? (string)filemtime($pmdOrderEditV2CssPath)
        : '1';
    $pmdOrderEditV2JsVersion = is_file($pmdOrderEditV2JsPath)
        ? (string)filemtime($pmdOrderEditV2JsPath)
        : '1';
@endphp
@if ($pmdOrderEditV2Active)
<script>document.documentElement.classList.add('pmd-order-edit-v2');</script>
<link
    rel="stylesheet"
    href="/app/admin/assets/css/pmd-order-edit-v2.css?v={{ $pmdOrderEditV2CssVersion }}"
>
<script
    src="/app/admin/assets/js/pmd-order-edit-v2.js?v={{ $pmdOrderEditV2JsVersion }}"
    defer
></script>
@endif'''

text = text[:start] + new_block + text[end:]
admin_i18n.write_text(text)
PY

echo
echo "Validating prepared sources..."

grep -q 'PMD_KAZEN_MENU_ITEM_SELECTED_COUNT_STABLE_V2' "$TMP/frontend/KazenStandalonePage.tsx"
[ "$(grep -c 'className="kazen-add-plus"' "$TMP/frontend/KazenStandalonePage.tsx")" -eq 2 ]
[ "$(grep -c 'selectedQuantity > 0 ? selectedQuantity : ""' "$TMP/frontend/KazenStandalonePage.tsx")" -eq 2 ]
! grep -q '{selectedQuantity > 0 ? (' "$TMP/frontend/KazenStandalonePage.tsx"
grep -q 'PMD_KAZEN_MENU_ITEM_SELECTED_COUNT_STYLE_V2' "$TMP/frontend/kazen-standalone.css"

grep -q 'PMD_ORDER_EDIT_V2_BASE_STYLE_MOVED_TO_ASSET' "$TMP/admin/form_tabs.blade.php"
grep -q 'PMD_ORDER_EDIT_V2_LEGACY_MOBILE_SCRIPT_REMOVED' "$TMP/admin/form_tabs.blade.php"
! grep -q 'FINAL AGGRESSIVE MOBILE OVERRIDE' "$TMP/admin/form_tabs.blade.php"
! grep -q 'Force second card visible on mobile' "$TMP/admin/form_tabs.blade.php"
grep -q 'PMD_ORDER_DETAILS_COMPACT_PAYMENTS_V2' "$TMP/admin/order_details.blade.php"
grep -q 'class="pmd-payment-history-row"' "$TMP/admin/order_details.blade.php"
grep -q 'class="pmd-payment-transaction"' "$TMP/admin/order_details.blade.php"
grep -q 'PMD_ORDER_EDIT_V2_LOADER' "$TMP/admin/pmd_admin_i18n.blade.php"
! grep -q 'pmd-order-edit-polish-v1.js' "$TMP/admin/pmd_admin_i18n.blade.php"

grep -q 'PMD_ORDER_EDIT_V2' "$TMP/assets/pmd-order-edit-v2.css"
grep -q 'PMD_ORDER_EDIT_V2' "$TMP/assets/pmd-order-edit-v2.js"
! grep -Eq 'MutationObserver|setInterval' "$TMP/assets/pmd-order-edit-v2.js"

compile_blade "$TMP/admin/form_tabs.blade.php" "$TMP/compiled/form_tabs.php"
compile_blade "$TMP/admin/order_details.blade.php" "$TMP/compiled/order_details.php"
compile_blade "$TMP/admin/pmd_admin_i18n.blade.php" "$TMP/compiled/pmd_admin_i18n.php"

echo "Prepared source validation: PASSED"
echo "Blade compilation: PASSED"
echo "Order Edit V2 observer/interval check: PASSED"

echo
echo "Creating safety backup..."
mkdir -p "$BACKUP/files"
: > "$ABSENT_MANIFEST"

TARGETS=(
  "$KAZEN_TSX"
  "$KAZEN_CSS"
  "$FORM_TABS"
  "$ORDER_DETAILS"
  "$ADMIN_I18N"
  "$ORDER_EDIT_CSS"
  "$ORDER_EDIT_JS"
)

for target in "${TARGETS[@]}"; do
  relative="${target#$ROOT/}"
  if sudo test -f "$target"; then
    mkdir -p "$BACKUP/files/$(dirname "$relative")"
    sudo cp -a "$target" "$BACKUP/files/$relative"
  else
    printf '%s\n' "$relative" >> "$ABSENT_MANIFEST"
  fi
done

echo "Backup directory: $BACKUP"

INSTALL_STARTED=1

echo
echo "Installing verified source updates..."
install_preserving_target "$TMP/frontend/KazenStandalonePage.tsx" "$KAZEN_TSX"
install_preserving_target "$TMP/frontend/kazen-standalone.css" "$KAZEN_CSS"
install_preserving_target "$TMP/admin/form_tabs.blade.php" "$FORM_TABS"
install_preserving_target "$TMP/admin/order_details.blade.php" "$ORDER_DETAILS"
install_preserving_target "$TMP/admin/pmd_admin_i18n.blade.php" "$ADMIN_I18N"

if sudo test -f "$ORDER_EDIT_CSS"; then
  install_preserving_target "$TMP/assets/pmd-order-edit-v2.css" "$ORDER_EDIT_CSS"
else
  install_new_asset "$TMP/assets/pmd-order-edit-v2.css" "$ORDER_EDIT_CSS"
fi

if sudo test -f "$ORDER_EDIT_JS"; then
  install_preserving_target "$TMP/assets/pmd-order-edit-v2.js" "$ORDER_EDIT_JS"
else
  install_new_asset "$TMP/assets/pmd-order-edit-v2.js" "$ORDER_EDIT_JS"
fi

echo
echo "Preparing clean production frontend build..."
if [ -d "$FRONTEND/.next" ]; then
  sudo mv "$FRONTEND/.next" "$OLD_NEXT"
  NEXT_MOVED=1
fi

cd "$FRONTEND"
npm run build

cd "$ROOT"
reload_backend

pm2 restart "$PM2_NAME" --update-env
sleep 5

curl -fsS --max-time 20 http://127.0.0.1:3001/menu >/dev/null
echo "Frontend health check: PASSED"

if [ "$NEXT_MOVED" -eq 1 ] && [ -d "$OLD_NEXT" ]; then
  sudo rm -rf "$OLD_NEXT"
  NEXT_MOVED=0
fi

SUCCESS=1

echo
echo "============================================================"
echo "KAZEN + ORDER EDIT V2 DEPLOYMENT COMPLETE"
echo "============================================================"
echo "Frontend plus/count crash: STABLE CHILD TREE INSTALLED"
echo "Quantity badge: PRESERVED"
echo "Admin Order Edit visual system: REBUILT"
echo "Legacy giant inline layout CSS: REMOVED"
echo "Legacy mobile force script: REMOVED"
echo "Legacy Order Edit MutationObserver: DISABLED"
echo "V2 CSS before paint: ENABLED"
echo "V2 JavaScript: FINITE RUN ONLY"
echo "Order/payment data: UNCHANGED"
echo "Database: UNCHANGED"
echo "Backup: $BACKUP"

echo
echo "Final file SHAs:"
sudo sha256sum \
  "$KAZEN_TSX" \
  "$KAZEN_CSS" \
  "$FORM_TABS" \
  "$ORDER_DETAILS" \
  "$ADMIN_I18N" \
  "$ORDER_EDIT_CSS" \
  "$ORDER_EDIT_JS"
