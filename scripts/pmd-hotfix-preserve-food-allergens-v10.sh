#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
CONTROLLER="app/admin/controllers/Menus.php"
MODAL="app/admin/views/pmdmenus/_modal_host.blade.php"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-food-allergen-v10-backups/$STAMP"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$ROOT"
mkdir -p "$BACKUP"

for path in "$CONTROLLER" "$MODAL"; do
  [ -f "$path" ] || { echo "ERROR=Missing $path" >&2; exit 100; }
done

cp -a "$CONTROLLER" "$BACKUP/Menus.php.before"
cp -a "$MODAL" "$BACKUP/pmdmenus-modal-host.blade.php.before"
sha256sum "$CONTROLLER" "$MODAL" > "$BACKUP/hashes.before"

cp -a "$CONTROLLER" "$TMP/Menus.php"
cp -a "$MODAL" "$TMP/modal.blade.php"

echo "============================================================"
echo " PMD FOOD ALLERGEN PRESERVATION HOTFIX V10"
echo "============================================================"
echo "ROOT=$ROOT"
echo "BACKUP=$BACKUP"

echo "[1/5] Building guarded live-derived candidates..."
python3 - "$TMP/Menus.php" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding='utf-8')
marker = 'PMD_MENU_ALLERGEN_PRESERVE_ON_MISSING_V10'

if marker in text:
    print('CONTROLLER_ALREADY_PATCHED=1')
    raise SystemExit(0)

validation_anchor = "            'allergen_ids' => ['nullable', 'array'],\n            'allergen_ids.*' => ['integer', 'min:1', 'distinct'],\n"
validation_replacement = "            'allergen_ids_present' => ['nullable', 'boolean'],\n            'allergen_ids' => ['nullable', 'array'],\n            'allergen_ids.*' => ['integer', 'min:1', 'distinct'],\n"
if text.count(validation_anchor) != 1:
    raise SystemExit('ERROR=Allergen validation anchor mismatch')
text = text.replace(validation_anchor, validation_replacement, 1)

ids_anchor = "        $allergenIds = array_values(array_unique(array_map('intval', (array)($clean['allergen_ids'] ?? []))));\n"
ids_replacement = ids_anchor + "        // PMD_MENU_ALLERGEN_PRESERVE_ON_MISSING_V10\n        // Missing field is not permission to erase persisted allergen relations.\n        // The active PMD Menu form sends allergen_ids_present=1 so an intentional\n        // all-unchecked state still clears relations explicitly.\n        $allergenIdsPresent = filter_var(\n            $clean['allergen_ids_present'] ?? false,\n            FILTER_VALIDATE_BOOLEAN\n        );\n"
if text.count(ids_anchor) != 1:
    raise SystemExit('ERROR=Allergen ID normalization anchor mismatch')
text = text.replace(ids_anchor, ids_replacement, 1)

use_anchor = "DB::transaction(function () use ($clean, $menuId, $categoryIds, $allergenIds, $uploadedRelative) {"
use_replacement = "DB::transaction(function () use ($clean, $menuId, $categoryIds, $allergenIds, $allergenIdsPresent, $uploadedRelative) {"
if text.count(use_anchor) != 1:
    raise SystemExit('ERROR=Menu save transaction use-list anchor mismatch')
text = text.replace(use_anchor, use_replacement, 1)

sync_anchor = "                $menu->addMenuCategories($categoryIds);\n                $menu->addMenuAllergens($allergenIds);\n"
sync_replacement = "                $menu->addMenuCategories($categoryIds);\n\n                if ($allergenIdsPresent) {\n                    // Explicit active-form ownership: selected IDs sync; an\n                    // explicit empty selection intentionally clears all.\n                    $menu->addMenuAllergens($allergenIds);\n                } elseif ($menuId) {\n                    // Legacy/partial callers may omit allergen_ids entirely.\n                    // Preserve persisted relations instead of sync([]).\n                    \\Log::warning('PMD_MENU_ALLERGEN_SYNC_SKIPPED_MISSING_MARKER_V10', [\n                        'menu_id' => (int)$menuId,\n                        'path' => request()->path(),\n                        'handler' => (string)request()->header('X-IGNITER-REQUEST-HANDLER', ''),\n                    ]);\n                }\n"
if text.count(sync_anchor) != 1:
    raise SystemExit('ERROR=Allergen sync anchor mismatch')
text = text.replace(sync_anchor, sync_replacement, 1)

if "$menu->addMenuAllergens($allergenIds);" not in text:
    raise SystemExit('ERROR=Guarded allergen sync missing after patch')
if marker not in text:
    raise SystemExit('ERROR=V10 controller marker missing after patch')

path.write_text(text, encoding='utf-8')
print('CONTROLLER_CANDIDATE_OK=1')
PY

python3 - "$TMP/modal.blade.php" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding='utf-8')
marker = 'name="allergen_ids_present" value="1"'

if marker in text:
    print('MODAL_ALREADY_PATCHED=1')
    raise SystemExit(0)

anchor = '                    <input type="hidden" name="menu_id" value="" data-pmd-menu-id>\n'
replacement = anchor + '                    <input type="hidden" name="allergen_ids_present" value="1">\n'
if text.count(anchor) != 1:
    raise SystemExit('ERROR=Food form hidden menu_id anchor mismatch')
text = text.replace(anchor, replacement, 1)

if text.count(marker) != 1:
    raise SystemExit('ERROR=Expected exactly one allergen ownership marker in active food form')

path.write_text(text, encoding='utf-8')
print('MODAL_CANDIDATE_OK=1')
PY

echo "[2/5] Validating candidates before ANY write..."
php -l "$TMP/Menus.php"
grep -Fq 'PMD_MENU_ALLERGEN_PRESERVE_ON_MISSING_V10' "$TMP/Menus.php"
grep -Fq "'allergen_ids_present' => ['nullable', 'boolean']" "$TMP/Menus.php"
grep -Fq 'if ($allergenIdsPresent)' "$TMP/Menus.php"
grep -Fq 'PMD_MENU_ALLERGEN_SYNC_SKIPPED_MISSING_MARKER_V10' "$TMP/Menus.php"
grep -Fq 'name="allergen_ids_present" value="1"' "$TMP/modal.blade.php"
echo "ALL_V10_CANDIDATES_VALID=1"

echo "[3/5] Installing only validated candidates..."
sudo tee "$CONTROLLER" < "$TMP/Menus.php" >/dev/null
sudo tee "$MODAL" < "$TMP/modal.blade.php" >/dev/null

php -l "$CONTROLLER"
php artisan view:clear >/dev/null 2>&1 || true

FPM_SERVICES="$(systemctl list-units --type=service --state=running --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1}')"
for svc in $FPM_SERVICES; do
  echo "RELOADING_FPM=$svc"
  sudo systemctl reload "$svc"
done

echo "[4/5] Verifying live save contract..."
grep -Fq 'PMD_MENU_ALLERGEN_PRESERVE_ON_MISSING_V10' "$CONTROLLER"
grep -Fq "'allergen_ids_present' => ['nullable', 'boolean']" "$CONTROLLER"
grep -Fq 'if ($allergenIdsPresent)' "$CONTROLLER"
grep -Fq 'name="allergen_ids_present" value="1"' "$MODAL"
echo "ALLERGEN_MISSING_FIELD_PRESERVE_OK=1"
echo "ALLERGEN_EXPLICIT_CLEAR_CONTRACT_OK=1"

echo "[5/5] Read-only code assertions..."
python3 - "$CONTROLLER" "$MODAL" <<'PY'
from pathlib import Path
import sys
controller = Path(sys.argv[1]).read_text(encoding='utf-8')
modal = Path(sys.argv[2]).read_text(encoding='utf-8')
print('CONTROLLER_MARKER=' + ('1' if 'PMD_MENU_ALLERGEN_PRESERVE_ON_MISSING_V10' in controller else '0'))
print('FORM_MARKER=' + ('1' if 'name="allergen_ids_present" value="1"' in modal else '0'))
print('GUARDED_SYNC=' + ('1' if 'if ($allergenIdsPresent)' in controller else '0'))
print('READ_ONLY_ASSERTIONS_OK=1')
PY

echo "============================================================"
echo " PMD FOOD ALLERGEN HOTFIX V10 COMPLETE"
echo "============================================================"
echo "FOOD_ALLERGEN_PRESERVATION_V10_OK=1"
echo "BACKUP=$BACKUP"
echo "NOTE=This prevents future accidental detach. It does not guess or recreate allergen relations that were already deleted."
