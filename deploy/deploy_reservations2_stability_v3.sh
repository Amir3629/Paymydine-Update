#!/usr/bin/env bash
set -euo pipefail

REPO="/var/www/paymydine/frontend/Paymydine-Update"
LIVE="/var/www/paymydine"
BRANCH="origin/agent/reservations2-runtime-cleanup"

BLADE="app/admin/views/reservations2/index.blade.php"
JS="app/admin/assets/js/pmd-reservations2-stability-v3.js"
CSS="app/admin/assets/css/pmd-reservations2-stability-v3.css"
OLD_JS="app/admin/assets/js/pmd-reservations2-stability-v2.js"
OLD_CSS="app/admin/assets/css/pmd-reservations2-stability-v2.css"
CAL_JS="app/admin/assets/js/pmd-reservations2-calendar-toggle-v1.js"
CAL_CSS="app/admin/assets/css/pmd-reservations2-calendar-toggle-v1.css"

EXPECTED_CAL_JS="cd62e190ea53ceca19c7274b983c573803303ee5"
EXPECTED_CAL_CSS="34c5f20a590e9d770b2ff2a009ea5a966a1631da"

for FILE in "$LIVE/$BLADE" "$LIVE/$CAL_JS" "$LIVE/$CAL_CSS"; do
  if [ ! -f "$FILE" ]; then
    echo "STOP: Required live file is missing: $FILE"
    exit 2
  fi
done

CAL_JS_BEFORE="$(git -C "$LIVE" hash-object "$LIVE/$CAL_JS")"
CAL_CSS_BEFORE="$(git -C "$LIVE" hash-object "$LIVE/$CAL_CSS")"

if [ "$CAL_JS_BEFORE" != "$EXPECTED_CAL_JS" ] || [ "$CAL_CSS_BEFORE" != "$EXPECTED_CAL_CSS" ]; then
  echo "STOP: Calendar V1.16/V1.19 does not match the preserved production version."
  echo "Calendar JS:  $CAL_JS_BEFORE"
  echo "Expected JS:  $EXPECTED_CAL_JS"
  echo "Calendar CSS: $CAL_CSS_BEFORE"
  echo "Expected CSS: $EXPECTED_CAL_CSS"
  exit 3
fi

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
BACKUP="/var/backups/paymydine-r2-stability-v3-$STAMP"

for FILE in "$BLADE" "$JS" "$CSS" "$OLD_JS" "$OLD_CSS" "$CAL_JS" "$CAL_CSS"; do
  if [ -f "$LIVE/$FILE" ]; then
    sudo mkdir -p "$BACKUP/$(dirname "$FILE")"
    sudo cp -a "$LIVE/$FILE" "$BACKUP/$FILE"
  fi
done

sudo mkdir -p "$LIVE/$(dirname "$JS")" "$LIVE/$(dirname "$CSS")"
sudo install -m 0644 -o www-data -g www-data "$TMP/$JS" "$LIVE/$JS"
sudo install -m 0644 -o www-data -g www-data "$TMP/$CSS" "$LIVE/$CSS"

TMP_BLADE="$TMP/index.blade.php"
python3 - "$LIVE/$BLADE" "$TMP_BLADE" "$STAMP" <<'PY'
import html
import re
import subprocess
import sys
import tempfile
from pathlib import Path

source = Path(sys.argv[1])
output = Path(sys.argv[2])
stamp = sys.argv[3]
text = source.read_text(encoding='utf-8')

stats = {
    'vendor_tags': 0,
    'obsolete_inline': 0,
    'malformed_inline': 0,
}

# Remove previous stability references so deployment is idempotent.
for version in ('v2', 'v3'):
    text = re.sub(
        rf'\s*<link[^>]+pmd-reservations2-stability-{version}\.css[^>]*>\s*',
        '\n', text, flags=re.I)
    text = re.sub(
        rf'\s*<script[^>]+pmd-reservations2-stability-{version}\.js[^>]*>\s*</script>\s*',
        '\n', text, flags=re.I)

# These assets are form/media-manager dependencies and are not used by Reservations2.
blocked_assets = (
    'dropzone.min.css', 'dropzone.min.js', 'sortable.min.js', 'jquery-sortable.js',
    'selectonic.min.js', 'moment.min.js', 'daterangepicker.css', 'daterangepicker.js',
    'tempusdominus-bootstrap-4.min.js', 'bootstrap-treeview.min.css',
    'bootstrap-treeview.min.js', 'jquery-clockpicker.min.js', 'mediamanager.js'
)

def external_tag_filter(match):
    tag = match.group(0)
    lower = html.unescape(tag).lower()
    if any(name in lower for name in blocked_assets):
        stats['vendor_tags'] += 1
        return '\n'
    return tag

text = re.sub(r'<(?:script|link)\b[^>]*?(?:>.*?</script>|/?>)', external_tag_filter, text,
              flags=re.I | re.S)

obsolete_markers = (
    'Waiter Dashboard V6 cleanup active',
    'Waiter Dashboard V7 soft floor',
    'Waiter Dashboard V17 order card cleanup active',
    'Waiter Dashboard V19 clean cards',
    'Waiter Dashboard V20 unmerge hotfix active',
    'Waiter Dashboard V21 stable floor/order cleanup active',
    'V175c no-dupe no-blink active',
    'V180 final floor authority runs last active',
    'V183.2 source-aligned no-ring script authority active',
    'V190 container-only floor compact active',
    'Waiter floor controls V191 vertical map dock active',
)

script_re = re.compile(r'<script\b(?P<attrs>[^>]*)>(?P<body>.*?)</script>', re.I | re.S)

def sanitize_blade(js):
    js = re.sub(r'\{!!.*?!!\}', 'null', js, flags=re.S)
    js = re.sub(r'\{\{.*?\}\}', 'null', js, flags=re.S)
    js = re.sub(r'@json\([^\n]*?\)', 'null', js)
    js = re.sub(r'@(?:if|elseif|else|endif|foreach|endforeach|php|endphp)[^\n]*', '', js)
    return js


def has_illegal_return(js):
    candidate = sanitize_blade(js)
    if not candidate.strip():
        return False
    try:
        with tempfile.NamedTemporaryFile('w', suffix='.js', encoding='utf-8', delete=False) as handle:
            handle.write(candidate)
            name = handle.name
        result = subprocess.run(['node', '--check', name], capture_output=True, text=True, timeout=8)
        Path(name).unlink(missing_ok=True)
    except Exception:
        return False
    error = (result.stderr or '') + (result.stdout or '')
    return result.returncode != 0 and (
        'Illegal return statement' in error or
        'Return statement is not allowed here' in error or
        'Return statements are only valid inside functions' in error
    )


def inline_filter(match):
    attrs = match.group('attrs') or ''
    body = match.group('body') or ''
    if re.search(r'\bsrc\s*=', attrs, flags=re.I):
        return match.group(0)
    if re.search(r'type\s*=\s*["\'](?:application/json|application/ld\+json)["\']', attrs, flags=re.I):
        return match.group(0)
    if any(marker in body for marker in obsolete_markers):
        stats['obsolete_inline'] += 1
        return '\n<!-- Removed obsolete Reservations2 waiter authority by Stability V3 -->\n'
    if has_illegal_return(body):
        stats['malformed_inline'] += 1
        return '\n<!-- Removed malformed inline JavaScript by Stability V3 -->\n'
    return match.group(0)

text = script_re.sub(inline_filter, text)

if stats['malformed_inline'] > 20:
    raise SystemExit('STOP: More than 20 malformed inline scripts were detected; refusing unsafe rewrite.')

calendar_css = re.search(r'<link[^>]+pmd-reservations2-calendar-toggle-v1\.css[^>]*>', text, flags=re.I)
if not calendar_css:
    raise SystemExit('STOP: Preserved Calendar V1.19 CSS reference was not found.')

early = (
    '<script id="pmd-r2-stability-v3-early">'
    "document.documentElement.classList.add('pmd-r2-stability-v3-active');"
    '</script>\n'
    '<link rel="stylesheet" href="/app/admin/assets/css/'
    f'pmd-reservations2-stability-v3.css?v=3.0.0-{stamp}">\n'
)
text = text[:calendar_css.start()] + early + text[calendar_css.start():]

calendar_js_matches = list(re.finditer(
    r'<script[^>]+pmd-reservations2-calendar-toggle-v1\.js[^>]*>\s*</script>',
    text, flags=re.I))
if not calendar_js_matches:
    raise SystemExit('STOP: Preserved Calendar V1.16 JS reference was not found.')

match = calendar_js_matches[-1]
js_tag = (
    '\n<script defer src="/app/admin/assets/js/'
    f'pmd-reservations2-stability-v3.js?v=3.0.0-{stamp}"></script>'
)
text = text[:match.end()] + js_tag + text[match.end():]

output.write_text(text, encoding='utf-8')
print('Removed irrelevant vendor tags:', stats['vendor_tags'])
print('Removed obsolete waiter authorities:', stats['obsolete_inline'])
print('Removed malformed inline scripts:', stats['malformed_inline'])
PY

sudo install -m 0644 -o www-data -g www-data "$TMP_BLADE" "$LIVE/$BLADE"
sudo rm -f "$LIVE/$OLD_JS" "$LIVE/$OLD_CSS"

cd "$LIVE"
php artisan view:clear || true

CAL_JS_AFTER="$(git hash-object "$LIVE/$CAL_JS")"
CAL_CSS_AFTER="$(git hash-object "$LIVE/$CAL_CSS")"

if [ "$CAL_JS_AFTER" != "$EXPECTED_CAL_JS" ] || [ "$CAL_CSS_AFTER" != "$EXPECTED_CAL_CSS" ]; then
  echo "STOP: Preserved Calendar files changed unexpectedly. Restore from: $BACKUP"
  exit 4
fi

echo
echo "Reservations2 Stability V3 deployed."
echo "Calendar V1.16 JS preserved:  $CAL_JS_AFTER"
echo "Calendar V1.19 CSS preserved: $CAL_CSS_AFTER"
echo "Stability V3 JS:  $(git hash-object "$LIVE/$JS")"
echo "Stability V3 CSS: $(git hash-object "$LIVE/$CSS")"
echo "Backup: $BACKUP"
echo
echo "Open:"
echo "https://mimoza.paymydine.com/admin/reservations2?stability_v3=$STAMP"
echo
echo "Console audit:"
echo "window.PMDReservations2StabilityV3.audit()"