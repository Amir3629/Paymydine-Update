#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
JS="$ROOT/app/admin/assets/js/pmd-dashboard2-kpis-v1.js"
BLADE="$ROOT/app/admin/views/dashboard2_reservations2_exact.blade.php"
EXPECTED_JS_SHA="16cfc078ff2c3019588cce7862cff60a3507408559ff2f5e09c2c666b288f5f3"
EXPECTED_BLADE_SHA="43cba56ac8f4e1be7ef39b15897442944efdc8195df2422aeff14c9aace327f4"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="$ROOT/storage/pmd-backups/dashboard2-v1411-correct-date-binding-$STAMP"

cd "$ROOT"

actual_js="$(sha256sum "$JS" | awk '{print $1}')"
actual_blade="$(sha256sum "$BLADE" | awk '{print $1}')"

printf 'Current JS:    %s\nExpected JS:   %s\n' "$actual_js" "$EXPECTED_JS_SHA"
printf 'Current Blade: %s\nExpected Blade:%s\n' "$actual_blade" "$EXPECTED_BLADE_SHA"

if [[ "$actual_js" != "$EXPECTED_JS_SHA" || "$actual_blade" != "$EXPECTED_BLADE_SHA" ]]; then
  echo "ERROR: Production files are not the exact deployed V1410 files. Nothing changed."
  exit 1
fi

mkdir -p "$BACKUP"
cp -a "$JS" "$BACKUP/pmd-dashboard2-kpis-v1.js"
cp -a "$BLADE" "$BACKUP/dashboard2_reservations2_exact.blade.php"

cat > "$BACKUP/rollback.sh" <<ROLLBACK
#!/usr/bin/env bash
set -Eeuo pipefail
cp -a "$BACKUP/pmd-dashboard2-kpis-v1.js" "$JS"
cp -a "$BACKUP/dashboard2_reservations2_exact.blade.php" "$BLADE"
cd "$ROOT"
php artisan optimize:clear
node --check "$JS"
echo "Dashboard2 V1411 rollback completed."
ROLLBACK
chmod +x "$BACKUP/rollback.sh"

python3 - "$JS" "$BLADE" <<'PY'
from pathlib import Path
import sys

js_path = Path(sys.argv[1])
blade_path = Path(sys.argv[2])
js = js_path.read_text(encoding='utf-8')
blade = blade_path.read_text(encoding='utf-8')

old = """    var requestedInitialVisible = Number(initialVisibleCount);
    var initialVisible = Number.isFinite(requestedInitialVisible)
      ? Math.max(1, Math.min(requestedInitialVisible, rows.length))
      : rows.length;
    var initialWindowActive = initialVisible < rows.length;"""
new = """    /* PMD_DASHBOARD2_V1411_CORRECT_DATE_BINDING
     * Always create the SVG with one natural DOM group per real bucket.
     * The body is already hidden by render(), so V1375 can synchronously
     * select/reposition the requested window before the first visible paint.
     * Pre-shifting groups here detached bar values from their date labels.
     */
    var requestedInitialVisible = Number(initialVisibleCount);
    var initialVisible = rows.length;
    var initialWindowActive = false;"""

if js.count(old) != 1:
    raise SystemExit(f'ERROR: V1410 initial-window block count is {js.count(old)}, expected 1')
js = js.replace(old, new, 1)

old_key = 'dashboard2-v1410-zero-blink'
new_key = 'dashboard2-v1411-correct-date-binding'
if blade.count(old_key) != 1:
    raise SystemExit(f'ERROR: V1410 cache key count is {blade.count(old_key)}, expected 1')
blade = blade.replace(old_key, new_key, 1)

js_path.write_text(js, encoding='utf-8')
blade_path.write_text(blade, encoding='utf-8')
PY

node --check "$JS"
php -l "$BLADE"
grep -Fq 'PMD_DASHBOARD2_V1411_CORRECT_DATE_BINDING' "$JS"
grep -Fq 'dashboard2-v1411-correct-date-binding' "$BLADE"

php artisan optimize:clear

echo "============================================================"
echo "DASHBOARD2_V1411_CORRECT_DATE_BINDING_DEPLOYED"
echo "============================================================"
sha256sum "$JS" "$BLADE"
echo "Backup: $BACKUP"
echo "Rollback: sudo bash $BACKUP/rollback.sh"
