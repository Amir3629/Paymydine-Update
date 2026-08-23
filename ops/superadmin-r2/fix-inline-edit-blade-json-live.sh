#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
FILE="$ROOT/app/admin/views/superadmin_r2/restaurants.blade.php"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/storage/pmd-superadmin-inline-edit-blade-json-$TS.blade.php"
TMP="$(mktemp)"

cleanup() {
    rm -f "$TMP"
}
trap cleanup EXIT

echo "============================================================"
echo " PMD SUPER ADMIN - INLINE EDIT BLADE JSON HOTFIX"
echo "============================================================"
echo

echo "1) Checking file and sudo..."
sudo -n true
test -f "$FILE"
echo "PASS"
echo

echo "2) Confirming the known Laravel 8 Blade failure pattern..."
if ! grep -Fq 'fillEdit(@json([' "$FILE"; then
    echo "FAIL: expected broken @json([ ... ]) pattern was not found."
    echo "Refusing to patch an unexpected file."
    exit 1
fi
echo "PASS"
echo

echo "3) Backing up current production view..."
sudo -n cp -a "$FILE" "$BACKUP"
echo "Backup: $BACKUP"
echo

echo "4) Building patched view..."
python3 - "$FILE" "$TMP" <<'PY'
from pathlib import Path
import sys

src = Path(sys.argv[1]).read_text()
old = """    @elseif(old('_pmd_form') === 'edit')
        fillEdit(@json([
            'id' => old('id'),
            'name' => old('name'),
            'domain' => old('domain'),
            'email' => old('email'),
            'phone' => old('phone'),
            'country' => old('country'),
            'start' => old('start'),
            'end' => old('end'),
            'type' => old('type','People'),
            'description' => old('description'),
        ]));
        openModal(editModal,editField('[data-pmd-edit-name]'));
"""
new = """    @elseif(old('_pmd_form') === 'edit')
        @php
            $pmdOldEdit = [
                'id' => old('id'),
                'name' => old('name'),
                'domain' => old('domain'),
                'email' => old('email'),
                'phone' => old('phone'),
                'country' => old('country'),
                'start' => old('start'),
                'end' => old('end'),
                'type' => old('type','People'),
                'description' => old('description'),
            ];
        @endphp
        fillEdit(@json($pmdOldEdit));
        openModal(editModal,editField('[data-pmd-edit-name]'));
"""

if src.count(old) != 1:
    raise SystemExit(f"FAIL: expected exactly one matching block, found {src.count(old)}")

patched = src.replace(old, new, 1)
Path(sys.argv[2]).write_text(patched)
PY

grep -Fq 'fillEdit(@json($pmdOldEdit));' "$TMP"
if grep -Fq 'fillEdit(@json([' "$TMP"; then
    echo "FAIL: unsafe direct-array @json pattern remains."
    exit 1
fi
echo "PASS"
echo

echo "5) Blade compile smoke test BEFORE install..."
cd "$ROOT"
php -r '
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$compiler = $app->make("blade.compiler");
$compiler->compileString(file_get_contents($argv[1]));
echo "BLADE_COMPILE_PASS\n";
' "$TMP"
echo

echo "6) Installing patched view..."
sudo -n install -o root -g root -m 0644 "$TMP" "$FILE"
echo "PASS"
echo

echo "7) Clearing compiled Blade views and reloading PHP-FPM..."
php artisan view:clear >/dev/null
if systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
    sudo -n systemctl reload php8.3-fpm
fi
echo "PASS"
echo

echo "8) Final fingerprints..."
grep -Fq 'data-pmd-edit-modal' "$FILE"
grep -Fq 'fillEdit(@json($pmdOldEdit));' "$FILE"
if grep -Fq 'fillEdit(@json([' "$FILE"; then
    echo "FAIL: unsafe direct-array @json pattern remains in production."
    exit 1
fi
echo "PASS"
echo

echo "============================================================"
echo " INLINE EDIT BLADE JSON HOTFIX COMPLETE"
echo "============================================================"
echo "Backup: $BACKUP"
echo "Changed: Super Admin Restaurants Blade view only"
echo "Not changed: DB, restaurant DBs, Nginx, Certbot, provisioning, PM2"
