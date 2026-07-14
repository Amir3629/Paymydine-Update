#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="${LIVE:-/var/www/paymydine}"
BRANCH="${BRANCH:-agent/waiter-pos-new-mobile-v1}"
REF="${REF:-origin/$BRANCH}"

TS="$(date +%Y%m%d_%H%M%S)"
TMP="/tmp/pmd-waiter-dashboard-new-v1-$TS"
BACKUP="/var/backups/pmd-waiter-dashboard-new-v1-$TS"

CONTROLLER="app/admin/controllers/PmdWaiterDashboardNewV1.php"
VIEW="app/admin/views/waiter_dashboard_new.blade.php"
CSS="app/admin/assets/css/pmd-waiter-dashboard-new-v1.css"
JS="app/admin/assets/js/pmd-waiter-dashboard-new-v1.js"
ROUTES="routes/admin-quick-mode.php"

FILES=(
  "$CONTROLLER"
  "$VIEW"
  "$CSS"
  "$JS"
)

cleanup() {
  rm -rf "$TMP"
}
trap cleanup EXIT

cd "$LIVE"

printf '%s\n' \
  "======================================================" \
  "PMD Waiter Dashboard New V1 — selective deployment" \
  "======================================================"

echo
echo "== Fetching the isolated GitHub branch =="
git fetch --no-tags origin \
  "$BRANCH:refs/remotes/origin/$BRANCH"

echo "Branch commit:"
git rev-parse "$REF"

mkdir -p "$TMP"
sudo mkdir -p "$BACKUP"

echo
echo "== Extracting only the new waiter page files =="

for FILE in "${FILES[@]}"; do
  DEST="$TMP/$FILE"
  mkdir -p "$(dirname "$DEST")"

  if ! git cat-file -e "$REF:$FILE" 2>/dev/null; then
    echo "ERROR: Missing branch file: $FILE"
    exit 1
  fi

  git show "$REF:$FILE" > "$DEST"
  echo "Extracted: $FILE"
done

echo
echo "== Validating extracted files =="

php -l "$TMP/$CONTROLLER"
php -l "$TMP/$VIEW"
node --check "$TMP/$JS"

python3 - "$TMP/$CSS" <<'PY'
from pathlib import Path
import sys

text = Path(sys.argv[1]).read_text(encoding="utf-8")

if text.count("{") != text.count("}"):
    raise SystemExit("ERROR: CSS brace count is invalid")

required = [
    ".pmd-waiter-table-grid",
    ".pmd-waiter-mobile-nav",
    ".pmd-waiter-pos-layer",
    "@media (max-width: 470px)",
]

for marker in required:
    if marker not in text:
        raise SystemExit(f"ERROR: Missing CSS marker: {marker}")

print("PMD_WAITER_NEW_CSS_OK")
PY

grep -Fq \
  "class PmdWaiterDashboardNewV1" \
  "$TMP/$CONTROLLER"

grep -Fq \
  "data-pmd-waiter-new-root" \
  "$TMP/$VIEW"

grep -Fq \
  "PMDWaiterDashboardNewV1" \
  "$TMP/$JS"

grep -Fq \
  "PMDWaiterPOSApp.mount" \
  "$TMP/$JS"

grep -Fq \
  "pmd-waiter-pos-payment-v2.js" \
  "$TMP/$VIEW"

echo "PMD_WAITER_NEW_FILES_VALIDATION_OK"

echo
echo "== Backing up live targets =="

for FILE in "${FILES[@]}"; do
  if [[ -e "$LIVE/$FILE" ]]; then
    sudo mkdir -p "$BACKUP/$(dirname "$FILE")"
    sudo cp -a "$LIVE/$FILE" "$BACKUP/$FILE.before"
  fi
done

sudo mkdir -p "$BACKUP/$(dirname "$ROUTES")"
sudo cp -a "$LIVE/$ROUTES" "$BACKUP/$ROUTES.before"

echo "Backup: $BACKUP"

echo
echo "== Installing four isolated page files =="

for FILE in "${FILES[@]}"; do
  sudo mkdir -p "$LIVE/$(dirname "$FILE")"
  sudo install -m 0644 "$TMP/$FILE" "$LIVE/$FILE"
  echo "Installed: $FILE"
done

if [[ -f "$LIVE/app/admin/controllers/PmdWaiterPosV1.php" ]]; then
  sudo chown \
    --reference="$LIVE/app/admin/controllers/PmdWaiterPosV1.php" \
    "$LIVE/$CONTROLLER"
fi

if [[ -f "$LIVE/app/admin/views/waiter_pos.blade.php" ]]; then
  sudo chown \
    --reference="$LIVE/app/admin/views/waiter_pos.blade.php" \
    "$LIVE/$VIEW"
fi

if [[ -f "$LIVE/app/admin/assets/css/pmd-waiter-pos-v1.css" ]]; then
  sudo chown \
    --reference="$LIVE/app/admin/assets/css/pmd-waiter-pos-v1.css" \
    "$LIVE/$CSS"
fi

if [[ -f "$LIVE/app/admin/assets/js/pmd-waiter-pos-v1.js" ]]; then
  sudo chown \
    --reference="$LIVE/app/admin/assets/js/pmd-waiter-pos-v1.js" \
    "$LIVE/$JS"
fi

echo
echo "== Registering routes without replacing the route file =="

python3 - "$LIVE/$ROUTES" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

route_one = "Route::get('/admin/dashboardwaiternew', [\\Admin\\Controllers\\PmdWaiterDashboardNewV1::class, 'index'])"
route_two = "Route::get('/admin/waiter', [\\Admin\\Controllers\\PmdWaiterDashboardNewV1::class, 'index'])"

if route_one in text and route_two in text:
    print("PMD_WAITER_NEW_ROUTES_ALREADY_PRESENT")
    raise SystemExit(0)

if route_one in text or route_two in text:
    raise SystemExit("ERROR: Only one new waiter route exists; refusing a partial patch")

anchor = "Route::middleware(['web'])->group(function () {\n"

if text.count(anchor) < 1:
    raise SystemExit("ERROR: Admin web route group anchor was not found")

block = r"""    // PMD_WAITER_DASHBOARD_NEW_V1_ROUTES_START
    // Independent button-first waiter workstation. The existing floor
    // operations dashboard at /admin/dashboardwaiter remains untouched.
    Route::get('/admin/dashboardwaiternew', [\Admin\Controllers\PmdWaiterDashboardNewV1::class, 'index'])
        ->name('pmd.waiter-dashboard-new');
    Route::get('/admin/waiter', [\Admin\Controllers\PmdWaiterDashboardNewV1::class, 'index'])
        ->name('pmd.waiter-dashboard');
    // PMD_WAITER_DASHBOARD_NEW_V1_ROUTES_END

"""

text = text.replace(anchor, anchor + block, 1)
path.write_text(text, encoding="utf-8")

print("PMD_WAITER_NEW_ROUTES_PATCHED")
PY

php -l "$LIVE/$ROUTES"

grep -Fq \
  "PMD_WAITER_DASHBOARD_NEW_V1_ROUTES_START" \
  "$LIVE/$ROUTES"

grep -Fq \
  "'/admin/dashboardwaiternew'" \
  "$LIVE/$ROUTES"

grep -Fq \
  "'/admin/waiter'" \
  "$LIVE/$ROUTES"

echo "PMD_WAITER_NEW_ROUTES_OK"

echo
echo "== Clearing Laravel/TastyIgniter caches =="

php artisan view:clear
php artisan route:clear 2>/dev/null || true
php artisan config:clear 2>/dev/null || true

echo
echo "== Final installed-file validation =="

php -l "$LIVE/$CONTROLLER"
php -l "$LIVE/$VIEW"
node --check "$LIVE/$JS"

grep -n \
  "Waiter dashboard new V1 mobile table launcher active" \
  "$LIVE/$JS"

echo
echo "======================================================"
echo "PMD Waiter Dashboard New V1 installed"
echo "======================================================"
echo "Preview URL: /admin/dashboardwaiternew"
echo "Short URL:   /admin/waiter"
echo "Old URL:     /admin/dashboardwaiter (untouched)"
echo
echo "Backup:"
echo "$BACKUP"
echo "======================================================"
