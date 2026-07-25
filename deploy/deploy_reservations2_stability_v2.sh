#!/usr/bin/env bash
set -euo pipefail

REPO="/var/www/paymydine/frontend/Paymydine-Update"
LIVE="/var/www/paymydine"
BRANCH="origin/agent/reservations2-runtime-cleanup"

BLADE="app/admin/views/reservations2/index.blade.php"
JS="app/admin/assets/js/pmd-reservations2-stability-v2.js"
CSS="app/admin/assets/css/pmd-reservations2-stability-v2.css"
CAL_JS="app/admin/assets/js/pmd-reservations2-calendar-toggle-v1.js"
CAL_CSS="app/admin/assets/css/pmd-reservations2-calendar-toggle-v1.css"

for FILE in "$LIVE/$BLADE" "$LIVE/$CAL_JS" "$LIVE/$CAL_CSS"; do
  if [ ! -f "$FILE" ]; then
    echo "STOP: Required live file is missing: $FILE"
    exit 2
  fi
done

cd "$REPO"
git fetch origin agent/reservations2-runtime-cleanup

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for FILE in "$JS" "$CSS"; do
  mkdir -p "$TMP/$(dirname "$FILE")"
  git show "$BRANCH:$FILE" > "$TMP/$FILE"
done

node --check "$TMP/$JS"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="/var/backups/paymydine-r2-stability-v2-$STAMP"
sudo mkdir -p "$BACKUP/$(dirname "$BLADE")"
sudo mkdir -p "$BACKUP/$(dirname "$JS")"
sudo mkdir -p "$BACKUP/$(dirname "$CSS")"

sudo cp -a "$LIVE/$BLADE" "$BACKUP/$BLADE"
sudo cp -a "$LIVE/$CAL_JS" "$BACKUP/$CAL_JS"
sudo cp -a "$LIVE/$CAL_CSS" "$BACKUP/$CAL_CSS"
[ -f "$LIVE/$JS" ] && sudo cp -a "$LIVE/$JS" "$BACKUP/$JS" || true
[ -f "$LIVE/$CSS" ] && sudo cp -a "$LIVE/$CSS" "$BACKUP/$CSS" || true

sudo install -m 0644 -o www-data -g www-data "$TMP/$JS" "$LIVE/$JS"
sudo install -m 0644 -o www-data -g www-data "$TMP/$CSS" "$LIVE/$CSS"

TMP_BLADE="$TMP/index.blade.php"
python3 - "$LIVE/$BLADE" "$TMP_BLADE" "$STAMP" <<'PY'
import re
import sys
from pathlib import Path

source = Path(sys.argv[1])
output = Path(sys.argv[2])
stamp = sys.argv[3]
text = source.read_text(encoding='utf-8')

# Remove an older Stability V2 reference, making deployment idempotent.
text = re.sub(
    r'\s*<link[^>]+pmd-reservations2-stability-v2\.css[^>]*>\s*',
    '\n',
    text,
    flags=re.I,
)
text = re.sub(
    r'\s*<script[^>]+pmd-reservations2-stability-v2\.js[^>]*>\s*</script>\s*',
    '\n',
    text,
    flags=re.I,
)

css_tag = (
    '<link rel="stylesheet" '
    'href="/app/admin/assets/css/pmd-reservations2-stability-v2.css'
    f'?v=2.0.0-{stamp}">'
)
js_tag = (
    '<script defer '
    'src="/app/admin/assets/js/pmd-reservations2-stability-v2.js'
    f'?v=2.0.0-{stamp}"></script>'
)

# Put final sizing CSS directly before the preserved calendar CSS.
calendar_css = re.search(
    r'<link[^>]+pmd-reservations2-calendar-toggle-v1\.css[^>]*>',
    text,
    flags=re.I,
)
if not calendar_css:
    raise SystemExit('STOP: Calendar V1.19 CSS reference was not found in Blade.')
text = text[:calendar_css.start()] + css_tag + '\n' + text[calendar_css.start():]

# Run the guard after preserved Calendar V1.16 so it can wrap final APIs.
calendar_js = list(re.finditer(
    r'<script[^>]+pmd-reservations2-calendar-toggle-v1\.js[^>]*>\s*</script>',
    text,
    flags=re.I,
))
if not calendar_js:
    raise SystemExit('STOP: Calendar V1.16 JS reference was not found in Blade.')
match = calendar_js[-1]
text = text[:match.end()] + '\n' + js_tag + text[match.end():]

# Do not alter Calendar V1.16/V1.19 asset files or tokens.
if 'pmd-reservations2-calendar-toggle-v1.js' not in text:
    raise SystemExit('STOP: Calendar JS reference was lost.')
if 'pmd-reservations2-calendar-toggle-v1.css' not in text:
    raise SystemExit('STOP: Calendar CSS reference was lost.')

output.write_text(text, encoding='utf-8')
PY

sudo install -m 0644 -o www-data -g www-data "$TMP_BLADE" "$LIVE/$BLADE"

cd "$LIVE"
php artisan view:clear || true

CAL_JS_AFTER="$(git hash-object "$LIVE/$CAL_JS")"
CAL_CSS_AFTER="$(git hash-object "$LIVE/$CAL_CSS")"

echo
echo "Reservations2 Stability V2 deployed."
echo "Calendar JS preserved:  $CAL_JS_AFTER"
echo "Calendar CSS preserved: $CAL_CSS_AFTER"
echo "Stability JS:  $(git hash-object "$LIVE/$JS")"
echo "Stability CSS: $(git hash-object "$LIVE/$CSS")"
echo "Backup: $BACKUP"
echo
echo "Open:"
echo "https://mimoza.paymydine.com/admin/reservations2?stability_v2=$STAMP"
echo
echo "Console audit:"
echo "window.PMDReservations2StabilityV2.audit()"
