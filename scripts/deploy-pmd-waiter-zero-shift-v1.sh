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
STAGE="$LIVE/storage/deploy-backups/pmd-waiter-zero-shift-v3-$TS/stage"
BACKUP="$LIVE/storage/deploy-backups/pmd-waiter-zero-shift-v3-$TS"
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
echo "PMD Waiter Dashboard — Zero Shift V3"
echo "ROUTE-TARGETED COMPLETE-STACK GUARD"
echo "========================================================"

test -s "$BLADE"
grep -Fq "PMD-WAITER-NEW2-ISOLATED-START" "$BLADE"
grep -Fq "@else" "$BLADE"
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

# Repository metadata belongs to ubuntu. Never fetch as root.
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
echo "===== PREFLIGHT COMPLETE-STACK GUARD ====="
node --check "$STAGE/$JS"
grep -Fq "PMD WAITER DASHBOARD — ZERO SHIFT V2" "$STAGE/$CSS"
grep -Fq "pmd-waiter-zero-shift-ready-v2" "$STAGE/$CSS"
grep -Fq "REQUIRED_STABLE_FRAMES = 8" "$STAGE/$JS"
grep -Fq "v241Ready" "$STAGE/$JS"
grep -Fq "v274Ready" "$STAGE/$JS"
grep -Fq "v280Ready" "$STAGE/$JS"
grep -Fq "serviceEventSeen" "$STAGE/$JS"
grep -Fq "2.0.0-complete-stack" "$STAGE/$JS"

echo "PASS: complete-stack guard verified."

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
    "href=\"{{ asset('" + css_asset + "') }}?v=20260810-v3-" + stamp + "\">"
)

js_line = (
    "<script src=\"{{ asset('" + js_asset + "') }}?v=20260810-v3-" + stamp + "\"></script>"
)

css_pattern = re.compile(
    r'^\s*<link[^>]*pmd-waiter-zero-shift-v1\.css[^>]*>\s*$',
    re.M,
)
js_pattern = re.compile(
    r'^\s*<script[^>]*pmd-waiter-zero-shift-v1\.js[^>]*>\s*</script>\s*$',
    re.M,
)

# CRITICAL ROOT-CAUSE FIX:
# waiter_dashboard_new.blade.php contains TWO complete HTML documents:
#   1) @if admin/dashboardwaiternew2
#   2) @else admin/dashboardwaiternew
# Previous deployers used text.replace(..., 1), which always patched the FIRST
# </head> and FIRST </body>. That installed the guard into dashboardwaiternew2,
# while the user's /admin/dashboardwaiternew route never loaded it at all.
route_boundary = re.search(
    r'\n@else\s*\n<!doctype html>\s*\n<html\s+lang="en"[^>]*>',
    text,
    flags=re.I,
)

if not route_boundary:
    raise SystemExit(
        'ERROR: dashboardwaiternew @else HTML boundary not found; nothing changed'
    )

first_route = text[:route_boundary.start()]
second_route = text[route_boundary.start():]

# Remove accidental zero-shift tags from BOTH route branches first. This cleans
# the prior V1/V2 mis-install from dashboardwaiternew2 and prevents duplicates.
first_route = css_pattern.sub('', first_route)
first_route = js_pattern.sub('', first_route)
second_route = css_pattern.sub('', second_route)
second_route = js_pattern.sub('', second_route)

if second_route.count('</head>') != 1:
    raise SystemExit(
        'ERROR: dashboardwaiternew branch must contain exactly one </head>'
    )

if second_route.count('</body>') != 1:
    raise SystemExit(
        'ERROR: dashboardwaiternew branch must contain exactly one </body>'
    )

# Insert render-blocking CSS in the ACTUAL /admin/dashboardwaiternew branch.
second_route = second_route.replace(
    '</head>',
    css_line + '\n</head>',
    1,
)

# Runtime goes after the complete production stack in that same route branch.
second_route = second_route.replace(
    '</body>',
    js_line + '\n</body>',
    1,
)

text = first_route + second_route
path.write_text(text, encoding='utf-8')

# Prove the route targeting before any live installation happens.
final_text = path.read_text(encoding='utf-8')
final_boundary = re.search(
    r'\n@else\s*\n<!doctype html>\s*\n<html\s+lang="en"[^>]*>',
    final_text,
    flags=re.I,
)

if not final_boundary:
    raise SystemExit('ERROR: route boundary disappeared after patch')

first_final = final_text[:final_boundary.start()]
second_final = final_text[final_boundary.start():]

if css_asset in first_final or js_asset in first_final:
    raise SystemExit(
        'ERROR: zero-shift asset still exists in dashboardwaiternew2 branch'
    )

if second_final.count(css_asset) != 1:
    raise SystemExit(
        'ERROR: dashboardwaiternew must contain exactly one zero-shift CSS tag'
    )

if second_final.count(js_asset) != 1:
    raise SystemExit(
        'ERROR: dashboardwaiternew must contain exactly one zero-shift JS tag'
    )

print('PASS: dashboardwaiternew2 branch contains ZERO guard assets')
print('PASS: dashboardwaiternew branch contains exactly ONE CSS guard')
print('PASS: dashboardwaiternew branch contains exactly ONE JS guard')
print('PASS: CSS cache key forced to V3 ' + stamp)
print('PASS: JS cache key forced to V3 ' + stamp)
PY

php -l "$STAGE/waiter_dashboard_new.blade.php"

echo
echo "===== ROUTE-TARGET VERIFY ====="
python3 - "$STAGE/waiter_dashboard_new.blade.php" "$TS" <<'PY'
from pathlib import Path
import re
import sys

text = Path(sys.argv[1]).read_text(encoding='utf-8')
stamp = sys.argv[2]
match = re.search(
    r'\n@else\s*\n<!doctype html>\s*\n<html\s+lang="en"[^>]*>',
    text,
    flags=re.I,
)
if not match:
    raise SystemExit('ERROR: @else boundary missing')

first = text[:match.start()]
second = text[match.start():]
key = '20260810-v3-' + stamp

print('dashboardwaiternew2 CSS guards:', first.count('pmd-waiter-zero-shift-v1.css'))
print('dashboardwaiternew2 JS guards:', first.count('pmd-waiter-zero-shift-v1.js'))
print('dashboardwaiternew CSS guards:', second.count('pmd-waiter-zero-shift-v1.css'))
print('dashboardwaiternew JS guards:', second.count('pmd-waiter-zero-shift-v1.js'))

if key not in second:
    raise SystemExit('ERROR: V3 cache key not present in dashboardwaiternew branch')
PY

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
grep -n "20260810-v3-$TS" "$BLADE"

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
PMD Waiter Dashboard Zero Shift V3 installed
========================================================
✓ ROOT CAUSE fixed: guard now targets /admin/dashboardwaiternew @else branch
✓ accidental guard tags removed from /admin/dashboardwaiternew2 branch
✓ browser cache key forcibly changed again
✓ whole page is never hidden
✓ transient NO TABLES state is hidden
✓ obsolete MY TABLES / ALL / OPEN rail is not shown
✓ V2.1 IN KITCHEN / DUE intermediate cards are not shown
✓ V2.4.1 lifecycle rewrite must finish before reveal
✓ V2.7.1 service data must finish before reveal
✓ V2.7.4 NOTE/CALL decoration must finish before reveal
✓ V2.8.0/V2.8.1 final right rail must finish before reveal
✓ at least 8 identical final geometry frames are required
✓ final reveal has NO fade / slide / scale
✓ POS/payment/order logic untouched
Backup: $BACKUP
Console audit after refresh: PMDWaiterZeroShiftV2.audit()
========================================================
EOF

INSTALLED=0
trap - EXIT
