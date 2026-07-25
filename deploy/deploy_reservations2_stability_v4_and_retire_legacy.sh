#!/usr/bin/env bash
set -euo pipefail

LIVE="/var/www/paymydine"

LAYOUT="app/admin/views/_layouts/default.blade.php"
R2_BLADE="app/admin/views/reservations2/index.blade.php"
RES_CONTROLLER="app/admin/controllers/Reservations.php"
CAL_JS="app/admin/assets/js/pmd-reservations2-calendar-toggle-v1.js"
CAL_CSS="app/admin/assets/css/pmd-reservations2-calendar-toggle-v1.css"

EXPECTED_CAL_JS="cd62e190ea53ceca19c7274b983c573803303ee5"
EXPECTED_CAL_CSS="34c5f20a590e9d770b2ff2a009ea5a966a1631da"

for FILE in "$LAYOUT" "$R2_BLADE" "$RES_CONTROLLER" "$CAL_JS" "$CAL_CSS"; do
  if [ ! -f "$LIVE/$FILE" ]; then
    echo "STOP: Required live file is missing: $LIVE/$FILE"
    exit 2
  fi
done

CAL_JS_BEFORE="$(git -C "$LIVE" hash-object "$LIVE/$CAL_JS")"
CAL_CSS_BEFORE="$(git -C "$LIVE" hash-object "$LIVE/$CAL_CSS")"

if [ "$CAL_JS_BEFORE" != "$EXPECTED_CAL_JS" ] || [ "$CAL_CSS_BEFORE" != "$EXPECTED_CAL_CSS" ]; then
  echo "STOP: Calendar V1.16/V1.19 hashes are not the protected live versions."
  echo "Calendar JS:  $CAL_JS_BEFORE"
  echo "Calendar CSS: $CAL_CSS_BEFORE"
  exit 3
fi

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="/var/backups/paymydine-r2-stability-v4-$STAMP"
sudo mkdir -p "$BACKUP"

for FILE in "$LAYOUT" "$R2_BLADE" "$RES_CONTROLLER" "$CAL_JS" "$CAL_CSS"; do
  sudo mkdir -p "$BACKUP/$(dirname "$FILE")"
  sudo cp -a "$LIVE/$FILE" "$BACKUP/$FILE"
done

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# ------------------------------------------------------------------
# 1. Retire only the obsolete /admin/reservations INDEX page.
#    Create/edit/delete routes remain available for Reservations2 cards.
# ------------------------------------------------------------------
python3 - "$LIVE/$RES_CONTROLLER" "$TMP/Reservations.php" <<'PY'
import re
import sys
from pathlib import Path

source = Path(sys.argv[1])
out = Path(sys.argv[2])
text = source.read_text(encoding='utf-8')

pattern = re.compile(
    r"public function index\(\)\s*\{\s*"
    r"\$this->asExtension\('ListController'\)->index\(\);\s*"
    r"\$this->vars\['statusesOptions'\]\s*=\s*"
    r"\\Admin\\Models\\Statuses_model::getDropdownOptionsForReservation\(\);\s*"
    r"\}",
    re.S,
)

replacement = """public function index()
    {
        // The legacy Reservations list has been retired.
        // Keep create/edit endpoints intact for Reservations2 workflows.
        return redirect(admin_url('reservations2'));
    }"""

text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    if "return redirect(admin_url('reservations2'));" not in text:
        raise SystemExit('STOP: Could not safely patch Reservations::index().')

out.write_text(text, encoding='utf-8')
PY

php -l "$TMP/Reservations.php"

# ------------------------------------------------------------------
# 2. Clean the global layout only for Reservations2.
#    - remove obsolete waiter authorities from this route
#    - prevent irrelevant vendor assets from loading on this route
# ------------------------------------------------------------------
python3 - "$LIVE/$LAYOUT" "$TMP/default.blade.php" <<'PY'
import re
import sys
from pathlib import Path

source = Path(sys.argv[1])
out = Path(sys.argv[2])
text = source.read_text(encoding='utf-8')
original = text

obsolete_ids = [
    'pmd-waiter-dashboard-v6',
    'pmd-waiter-dashboard-v7',
    'pmd-waiter-dashboard-v17',
    'pmd-waiter-dashboard-v19',
    'pmd-waiter-dashboard-v20',
    'pmd-waiter-dashboard-v21',
    'pmd-waiter-dashboard-v175',
    'pmd-waiter-dashboard-v180',
    'pmd-waiter-dashboard-v183',
    'pmd-waiter-dashboard-v190',
    'pmd-waiter-floor-controls-v191',
]

removed_authorities = 0
for prefix in obsolete_ids:
    # Remove matching script/style blocks only when the block explicitly targets reservations2.
    block_pattern = re.compile(
        r'(?P<block><(?:script|style)\b[^>]*\bid=["\']'
        + re.escape(prefix)
        + r'[^"\']*["\'][^>]*>.*?</(?:script|style)>)',
        re.I | re.S,
    )

    def drop(match):
        nonlocal_marker = match.group('block')
        if '/admin/reservations2' in nonlocal_marker or 'reservations2' in nonlocal_marker:
            return '\n'
        return nonlocal_marker

    before = text
    text = block_pattern.sub(drop, text)
    if text != before:
        removed_authorities += 1

# Remove known marker-wrapped obsolete sections that explicitly include Reservations2.
marker_pattern = re.compile(
    r'<!--\s*(PMD_[A-Z0-9_\-.]+)_START\s*-->(.*?)<!--\s*\1_END\s*-->',
    re.I | re.S,
)

def marker_filter(match):
    global removed_authorities
    body = match.group(2)
    marker = match.group(1).upper()
    obsolete = any(token in marker for token in (
        'WAITER_DASHBOARD_V6', 'WAITER_DASHBOARD_V7', 'WAITER_DASHBOARD_V17',
        'WAITER_DASHBOARD_V19', 'WAITER_DASHBOARD_V20', 'WAITER_DASHBOARD_V21',
        'V175', 'V180', 'V183', 'V190', 'V191'
    ))
    if obsolete and 'reservations2' in body.lower():
        removed_authorities += 1
        return '\n'
    return match.group(0)

text = marker_pattern.sub(marker_filter, text)

vendor_names = (
    'dropzone', 'selectonic', 'sortable', 'jquery-sortable', 'moment.min',
    'daterangepicker', 'bootstrap-treeview', 'jquery-clockpicker',
    'tempusdominus-bootstrap-4', 'pmd-mediafinder-autofix', 'mediamanager.js'
)

wrapped_vendor_tags = 0
for tag_match in list(re.finditer(r'<(?:script|link)\b[^>]*(?:>\s*</script>|>)', text, re.I | re.S)):
    tag = tag_match.group(0)
    lowered = tag.lower()
    if not any(name in lowered for name in vendor_names):
        continue
    if "request()->is('admin/reservations2')" in lowered:
        continue
    wrapped = "@unless(request()->is('admin/reservations2'))\n" + tag + "\n@endunless"
    text = text.replace(tag, wrapped, 1)
    wrapped_vendor_tags += 1

if text == original:
    print('Layout already had no additional matching cleanup targets.')

print(f'Removed obsolete layout authorities: {removed_authorities}')
print(f'Route-guarded vendor tags: {wrapped_vendor_tags}')
out.write_text(text, encoding='utf-8')
PY

# Blade/PHP syntax check catches malformed directives and PHP.
php -l "$TMP/default.blade.php"

# ------------------------------------------------------------------
# 3. Install guarded files.
# ------------------------------------------------------------------
sudo install -m 0644 -o www-data -g www-data \
  "$TMP/Reservations.php" "$LIVE/$RES_CONTROLLER"

sudo install -m 0644 -o www-data -g www-data \
  "$TMP/default.blade.php" "$LIVE/$LAYOUT"

cd "$LIVE"
php artisan view:clear || true
php artisan route:clear || true

CAL_JS_AFTER="$(git hash-object "$LIVE/$CAL_JS")"
CAL_CSS_AFTER="$(git hash-object "$LIVE/$CAL_CSS")"

if [ "$CAL_JS_AFTER" != "$EXPECTED_CAL_JS" ] || [ "$CAL_CSS_AFTER" != "$EXPECTED_CAL_CSS" ]; then
  echo "STOP: Protected Calendar files changed unexpectedly. Restoring backup."
  sudo install -m 0644 -o www-data -g www-data "$BACKUP/$CAL_JS" "$LIVE/$CAL_JS"
  sudo install -m 0644 -o www-data -g www-data "$BACKUP/$CAL_CSS" "$LIVE/$CAL_CSS"
  exit 4
fi

echo
echo "Reservations2 Stability V4 deployed."
echo "Calendar V1.16 JS preserved:  $CAL_JS_AFTER"
echo "Calendar V1.19 CSS preserved: $CAL_CSS_AFTER"
echo "Legacy /admin/reservations now redirects to /admin/reservations2."
echo "Create/edit reservation endpoints remain intact."
echo "Backup: $BACKUP"
echo
echo "Open:"
echo "https://mimoza.paymydine.com/admin/reservations2?stability_v4=$STAMP"
echo
echo "Legacy redirect test:"
echo "https://mimoza.paymydine.com/admin/reservations"
