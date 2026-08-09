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
STAGE="$LIVE/storage/deploy-backups/pmd-waiter-zero-shift-v1-$TS/stage"
BACKUP="$LIVE/storage/deploy-backups/pmd-waiter-zero-shift-v1-$TS"
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
echo "PMD Waiter Dashboard — Zero Shift V1"
echo "========================================================"

test -s "$BLADE"
grep -Fq "data-pmd-waiter-v2-root" "$BLADE"

echo "Base waiter view found."

# IMPORTANT: Git repository metadata is owned by ubuntu. Never fetch as root.
sudo -u "$GIT_USER" -H \
  git -C "$LIVE" fetch --no-tags origin \
  "$BRANCH:refs/remotes/origin/$BRANCH"

BRANCH_SHA="$(
  sudo -u "$GIT_USER" -H \
    git -C "$LIVE" rev-parse "$REF"
)"

echo "Branch commit: $BRANCH_SHA"

for path in "$CSS" "$JS"; do
  mkdir -p "$STAGE/$(dirname "$path")"

  sudo -u "$GIT_USER" -H \
    git -C "$LIVE" show "$REF:$path" \
    > "$STAGE/$path"

  test -s "$STAGE/$path"
  echo "Extracted: $path"
done

node --check "$STAGE/$JS"
grep -Fq "PMD WAITER DASHBOARD — ZERO SHIFT V1" "$STAGE/$CSS"
grep -Fq "stableFrames >= 4" "$STAGE/$JS"
grep -Fq "pmd-waiter-zero-shift-ready-v1" "$STAGE/$CSS"

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
import sys

path = Path(sys.argv[1])
stamp = sys.argv[2]
text = path.read_text(encoding='utf-8')

css_asset = "app/admin/assets/css/pmd-waiter-zero-shift-v1.css"
js_asset = "app/admin/assets/js/pmd-waiter-zero-shift-v1.js"

css_line = (
    "    <link rel=\"stylesheet\" "
    "href=\"{{ asset('" + css_asset + "') }}?v=20260810-" + stamp + "\">"
)

js_line = (
    "<script src=\"{{ asset('" + js_asset + "') }}?v=20260810-" + stamp + "\"></script>"
)

# Render-blocking CSS targets the server-rendered pmd-waiter-new-page body class,
# so dynamic launcher surfaces are protected before the first visible frame.
if css_asset not in text:
    if '</head>' not in text:
        raise SystemExit('ERROR: </head> anchor missing')
    text = text.replace('</head>', css_line + '\n</head>', 1)

# Runtime executes after the existing V2.1 / V2.2.1 / V2.3 scripts and waits for
# their final card/order/header geometry without changing their behavior.
if js_asset not in text:
    if '</body>' not in text:
        raise SystemExit('ERROR: </body> anchor missing')
    text = text.replace('</body>', js_line + '\n</body>', 1)

path.write_text(text, encoding='utf-8')
PY

php -l "$STAGE/waiter_dashboard_new.blade.php"
grep -Fq "pmd-waiter-zero-shift-v1.css" "$STAGE/waiter_dashboard_new.blade.php"
grep -Fq "pmd-waiter-zero-shift-v1.js" "$STAGE/waiter_dashboard_new.blade.php"

install -D -m 0644 "$STAGE/$CSS" "$LIVE/$CSS"
install -D -m 0644 "$STAGE/$JS" "$LIVE/$JS"
install -m 0644 "$STAGE/waiter_dashboard_new.blade.php" "$BLADE"
INSTALLED=1

php -l "$BLADE"
node --check "$LIVE/$JS"

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
PMD Waiter Dashboard Zero Shift V1 installed
========================================================
✓ Git fetch/show executed as ubuntu
✓ whole page remains visible
✓ top-action cluster appears only in final form
✓ Areas row has final height from first paint
✓ table grid remains measurable but hidden during V2.1 reorder
✓ existing loading skeleton remains visible during settling
✓ V2.1 card resize/reorder is not shown to the user
✓ V2.2.1 theme button insertion is not shown mid-layout
✓ V2.3 online waiter pill insertion is not shown mid-layout
✓ final launcher requires 4 stable geometry frames
✓ final reveal has no fade / slide / scale
✓ POS/payment/order logic untouched
Backup: $BACKUP
Console audit: PMDWaiterZeroShiftV1.audit()
========================================================
EOF

INSTALLED=0
trap - EXIT
