#!/usr/bin/env bash
set -euo pipefail

REPO="/var/www/paymydine/frontend/Paymydine-Update"
LIVE="/var/www/paymydine"
BRANCH="origin/agent/reservations2-runtime-cleanup"

BASE_DEPLOY="deploy/deploy_reservations2_stability_v3.sh"
MEDIAFIX_JS="app/admin/assets/js/pmd-mediafinder-autofix.js"
MEDIA_WIDGET="app/main/widgets/MediaManager.php"
BLADE="app/admin/views/reservations2/index.blade.php"
CAL_JS="app/admin/assets/js/pmd-reservations2-calendar-toggle-v1.js"
CAL_CSS="app/admin/assets/css/pmd-reservations2-calendar-toggle-v1.css"

cd "$REPO"
git fetch origin agent/reservations2-runtime-cleanup

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# First run the audited V3 cleanup: malformed inline blocks, obsolete waiter
# authorities, irrelevant direct vendor tags, one header controller, no entrance effects.
git show "$BRANCH:$BASE_DEPLOY" > "$TMP/deploy_v3.sh"
chmod +x "$TMP/deploy_v3.sh"
"$TMP/deploy_v3.sh"

# Then disable the two remaining media loaders at their sources on Reservations2.
for FILE in "$MEDIAFIX_JS"; do
  mkdir -p "$TMP/$(dirname "$FILE")"
  git show "$BRANCH:$FILE" > "$TMP/$FILE"
done
node --check "$TMP/$MEDIAFIX_JS"

for FILE in "$LIVE/$MEDIA_WIDGET" "$LIVE/$BLADE" "$LIVE/$CAL_JS" "$LIVE/$CAL_CSS"; do
  if [ ! -f "$FILE" ]; then
    echo "STOP: Required file is missing after V3 deployment: $FILE"
    exit 2
  fi
done

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="/var/backups/paymydine-r2-stability-v31-$STAMP"
sudo mkdir -p "$BACKUP/$(dirname "$MEDIAFIX_JS")" "$BACKUP/$(dirname "$MEDIA_WIDGET")"
[ -f "$LIVE/$MEDIAFIX_JS" ] && sudo cp -a "$LIVE/$MEDIAFIX_JS" "$BACKUP/$MEDIAFIX_JS" || true
sudo cp -a "$LIVE/$MEDIA_WIDGET" "$BACKUP/$MEDIA_WIDGET"

CAL_JS_BEFORE="$(git -C "$LIVE" hash-object "$LIVE/$CAL_JS")"
CAL_CSS_BEFORE="$(git -C "$LIVE" hash-object "$LIVE/$CAL_CSS")"

sudo install -m 0644 -o www-data -g www-data "$TMP/$MEDIAFIX_JS" "$LIVE/$MEDIAFIX_JS"

TMP_WIDGET="$TMP/MediaManager.php"
python3 - "$LIVE/$MEDIA_WIDGET" "$TMP_WIDGET" <<'PY'
import re
import sys
from pathlib import Path

source = Path(sys.argv[1])
output = Path(sys.argv[2])
text = source.read_text(encoding='utf-8')

pattern = re.compile(
    r"    public function loadAssets\(\)\n    \{\n"
    r"(?:        if \(request\(\)->is\('admin/reservations2'\).*?\n        \}\n\n)?",
    re.S,
)

replacement = (
    "    public function loadAssets()\n"
    "    {\n"
    "        if (request()->is('admin/reservations2') || request()->is('admin/reservations2/*')) {\n"
    "            return;\n"
    "        }\n\n"
)

text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit('STOP: MediaManager::loadAssets() could not be patched safely.')

output.write_text(text, encoding='utf-8')
PY

php -l "$TMP_WIDGET"
sudo install -m 0644 -o www-data -g www-data "$TMP_WIDGET" "$LIVE/$MEDIA_WIDGET"

cd "$LIVE"
php artisan view:clear || true

CAL_JS_AFTER="$(git -C "$LIVE" hash-object "$LIVE/$CAL_JS")"
CAL_CSS_AFTER="$(git -C "$LIVE" hash-object "$LIVE/$CAL_CSS")"

if [ "$CAL_JS_BEFORE" != "$CAL_JS_AFTER" ] || [ "$CAL_CSS_BEFORE" != "$CAL_CSS_AFTER" ]; then
  echo "STOP: Calendar V1.16/V1.19 changed unexpectedly."
  exit 3
fi

echo
echo "Reservations2 full Stability V3.1 cleanup deployed."
echo "Calendar JS preserved:  $CAL_JS_AFTER"
echo "Calendar CSS preserved: $CAL_CSS_AFTER"
echo "Media fallback guard:   $(git -C "$LIVE" hash-object "$LIVE/$MEDIAFIX_JS")"
echo "Backup: $BACKUP"
echo
echo "Open:"
echo "https://mimoza.paymydine.com/admin/reservations2?stability_v31=$STAMP"
echo
echo "Console audit:"
echo "window.PMDReservations2StabilityV3.audit()"
