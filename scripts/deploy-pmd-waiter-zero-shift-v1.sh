#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="/var/www/paymydine"
BRANCH="agent/waiter-dashboard-new-v23-operational-polish"
REF="origin/$BRANCH"
GIT_USER="ubuntu"
BLADE="$LIVE/app/admin/views/waiter_dashboard_new.blade.php"
CSS="app/admin/assets/css/pmd-waiter-zero-shift-v1.css"
JS="app/admin/assets/js/pmd-waiter-zero-shift-v1.js"
TS="$(date +%Y%m%d_%H%M%S)"
STAGE="$LIVE/storage/deploy-backups/pmd-waiter-zero-shift-v2-$TS/stage"
BACKUP="$LIVE/storage/deploy-backups/pmd-waiter-zero-shift-v2-$TS"
INSTALLED=0

rollback() {
  code=$?
  trap - EXIT
  set +e

  if [[ $code -ne 0 && $INSTALLED -eq 1 ]]; then
    echo "ERROR: restoring Waiter dashboard zero-shift backup..."

    [[ -f "$BACKUP/waiter_dashboard_new.blade.php.before" ]] \
      && cp -a "$BACKUP/waiter_dashboard_new.blade.php.before" "$BLADE"

    for path in "$CSS" "$JS"; do
      name="$(basename "$path")"
      target="$LIVE/$path"

      if [[ -f "$BACKUP/$name.before" ]]; then
        cp -a "$BACKUP/$name.before" "$target"
      else
        rm -f "$target"
      fi
    done

    cd "$LIVE"
    php artisan view:clear >/dev/null 2>&1 || true
    php artisan cache:clear >/dev/null 2>&1 || true
  fi

  exit "$code"
}
trap rollback EXIT

cd "$LIVE"
mkdir -p "$STAGE"

echo "========================================================"
echo "PMD Waiter Dashboard — Zero Shift V2"
echo "COMPLETE PRODUCTION STACK GUARD"
echo "========================================================"

test -s "$BLADE"
grep -Fq "data-pmd-waiter-v2-root" "$BLADE"

echo "Base waiter view found."

echo
echo "===== LIVE LAYER AUDIT ====="
for marker in \
  "pmd-waiter-standard-v21.js" \
  "pmd-waiter-launcher-v233-unified-ui.js" \
  "pmd-waiter-v241-table-lifecycle-safe.js" \
  "pmd-waiter-v257-operations-rail.js" \
  "pmd-waiter-v263-area-search-calls.js" \
  "pmd-waiter-v271-service-inbox.js" \
  "pmd-waiter-v274-single-service-source.js" \
  "pmd-waiter-v280-exact-neutral-right-rail.js" \
  "pmd-waiter-v281-exact-edge-width.js"
do
  if grep -Fq "$marker" "$BLADE"; then
    echo "FOUND: $marker"
  else
    echo "NOTE: not present in live Blade: $marker"
  fi
done

# IMPORTANT: repository metadata belongs to ubuntu. Never fetch as root.
sudo -u "$GIT_USER" -H \
  git -C "$LIVE" fetch --no-tags origin \
  "$BRANCH:refs/remotes/origin/$BRANCH"

BRANCH_SHA="$(
  sudo -u "$GIT_USER" -H \
    git -C "$LIVE" rev-parse "$REF"
)"

echo
echo "Branch commit: $BRANCH_SHA"

for path in "$CSS" "$JS"; do
  mkdir -p "$STAGE/$(dirname "$path")"

  sudo -u "$GIT_USER" -H \
    git -C "$LIVE" show "$REF:$path" \
    > "$STAGE/$path"

  test -s "$STAGE/$path"
  echo "Extracted: $path"
done

echo
echo "===== PREFLIGHT V2 ====="
node --check "$STAGE/$JS"
grep -Fq "PMD WAITER DASHBOARD — ZERO SHIFT V2" "$STAGE/$CSS"
grep -Fq "pmd-waiter-zero-shift-ready-v2" "$STAGE/$CSS"
grep -Fq "REQUIRED_STABLE_FRAMES = 8" "$STAGE/$JS"
grep -Fq "v241Ready" "$STAGE/$JS"
grep -Fq "v274Ready" "$STAGE/$JS"
grep -Fq "v280Ready" "$STAGE/$JS"
grep -Fq "serviceEventSeen" "$STAGE/$JS"
grep -Fq "2.0.0-complete-stack" "$STAGE/$JS"

echo "PASS: V2 complete-stack guard verified."

mkdir -p "$BACKUP"
cp -a "$BLADE" "$BACKUP/waiter_dashboard_new.blade.php.before"

for path in "$CSS" "$JS"; do
  target="$LIVE/$path"
  name="$(basename "$path")"
  [[ -f "$target" ]] && cp -a "$target" "$BACKUP/$name.before" || true
done

cp "$BLADE" "$STAGE/waiter_dashboard_new.blade.php"

python3 - "$STAGE/waiter_dashboard_new.blade.php" "$TS" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
stamp = sys.argv[2]
text = path.read_text(encoding='utf-8')

css_asset = "app/admin/assets/css/pmd-waiter-zero-shift-v1.css"
js_asset = "app/admin/assets/js/pmd-waiter-zero-shift-v1.js"

css_line = (
    "    <link rel=\"stylesheet\" "
    "href=\"{{ asset('" + css_asset + "') }}?v=20260810-v2-" + stamp + "\">"
)

js_line = (
    "<script src=\"{{ asset('" + js_asset + "') }}?v=20260810-v2-" + stamp + "\"></script>"
)

# IMPORTANT: V1 deployer only inserted the asset the first time and left the
# original query string forever. V2 ALWAYS replaces the existing tags so the
# browser/proxy cannot continue serving the previous guard from cache.
css_pattern = re.compile(
    r'^\s*<link[^>]*pmd-waiter-zero-shift-v1\.css[^>]*>\s*$',
    re.M,
)
js_pattern = re.compile(
    r'^\s*<script[^>]*pmd-waiter-zero-shift-v1\.js[^>]*>\s*</script>\s*$',
    re.M,
)

text, css_count = css_pattern.subn(css_line, text)
text, js_count = js_pattern.subn(js_line, text)

if css_count == 0:
    if '</head>' not in text:
        raise SystemExit('ERROR: </head> anchor missing')
    text = text.replace('</head>', css_line + '\n</head>', 1)
elif css_count > 1:
    raise SystemExit('ERROR: duplicate zero-shift CSS tags detected')

if js_count == 0:
    if '</body>' not in text:
        raise SystemExit('ERROR: </body> anchor missing')
    text = text.replace('</body>', js_line + '\n</body>', 1)
elif js_count > 1:
    raise SystemExit('ERROR: duplicate zero-shift JS tags detected')

path.write_text(text, encoding='utf-8')

print('PASS: CSS cache key forced to V2 ' + stamp)
print('PASS: JS cache key forced to V2 ' + stamp)
PY

php -l "$STAGE/waiter_dashboard_new.blade.php"
grep -Fq "pmd-waiter-zero-shift-v1.css?v=20260810-v2-$TS" "$STAGE/waiter_dashboard_new.blade.php"
grep -Fq "pmd-waiter-zero-shift-v1.js?v=20260810-v2-$TS" "$STAGE/waiter_dashboard_new.blade.php"

echo
echo "===== BACKUP ====="
echo "$BACKUP"

install -D -m 0644 "$STAGE/$CSS" "$LIVE/$CSS"
install -D -m 0644 "$STAGE/$JS" "$LIVE/$JS"
install -m 0644 "$STAGE/waiter_dashboard_new.blade.php" "$BLADE"
INSTALLED=1

php -l "$BLADE"
node --check "$LIVE/$JS"

echo
echo "===== LIVE MARKERS ====="
grep -n "ZERO SHIFT V2" "$LIVE/$CSS" | head
grep -n "2.0.0-complete-stack" "$LIVE/$JS" | head
grep -n "20260810-v2-$TS" "$BLADE"

php artisan view:clear
php artisan cache:clear || true

PAGE="$(curl -k -sS -o /dev/null -w '%{http_code}' https://mimoza.paymydine.com/admin/dashboardwaiternew)"
CSS_HTTP="$(curl -k -sS -o /dev/null -w '%{http_code}' https://mimoza.paymydine.com/app/admin/assets/css/pmd-waiter-zero-shift-v1.css)"
JS_HTTP="$(curl -k -sS -o /dev/null -w '%{http_code}' https://mimoza.paymydine.com/app/admin/assets/js/pmd-waiter-zero-shift-v1.js)"

echo "Page HTTP: $PAGE | CSS: $CSS_HTTP | JS: $JS_HTTP"
[[ "$PAGE" == 200 || "$PAGE" == 302 ]]
[[ "$CSS_HTTP" == 200 && "$JS_HTTP" == 200 ]]

cat <<EOF
========================================================
PMD Waiter Dashboard Zero Shift V2 installed
========================================================
✓ Git fetch/show executed as ubuntu
✓ browser cache key forcibly changed
✓ whole page is never hidden
✓ transient NO TABLES state is hidden
✓ obsolete MY TABLES / ALL / OPEN rail is not shown
✓ left rail stays measurable for V2.8 final rail cloning
✓ V2.1 IN KITCHEN / DUE intermediate cards are not shown
✓ V2.4.1 lifecycle rewrite must finish before reveal
✓ V2.7.1 service data event must finish before reveal
✓ V2.7.4 NOTE/CALL card decoration must finish before reveal
✓ V2.8.0 exact right rail must exist before reveal
✓ V2.8.1 final rail edge layer must exist before reveal
✓ at least 8 identical final geometry frames are required
✓ minimum boot settle window protects V2.3.3 delayed mounts
✓ loading skeleton is the only visible loading state
✓ final reveal has NO fade / slide / scale
✓ POS/payment/order logic untouched
Backup: $BACKUP
Console audit: PMDWaiterZeroShiftV2.audit()
========================================================
EOF

INSTALLED=0
trap - EXIT
