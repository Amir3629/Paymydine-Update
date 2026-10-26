#!/usr/bin/env bash
# PMD_PLATFORM_BUTTONS_R32_SAFE_DEPLOY
# Prerequisite: R31 locally installed on VPS.
# Surgical patch to CURRENT global focus JS + new audit/regression files.
# Does not alter backend, R19, R28/R31 business logic, DB, login or MFA.
# Does not checkout, merge, reset or pull code over active VPS changes.
set -Eeuo pipefail
if [ "$#" -ne 1 ] || [ "$1" != "--apply" ]; then
  echo "Usage: bash scripts/pmd-platform-buttons-r32-deploy.sh --apply" >&2
  exit 2
fi
cd /var/www/paymydine || exit 1
revision="$(git rev-parse --verify 'FETCH_HEAD^{commit}')"
focus=app/admin/assets/js/fix-form-field-focus-colors.js
audit=scripts/pmd-platform-button-audit-r32.cjs
testfile=scripts/test-pmd-platform-buttons-r32.cjs
fixtures=(
  app/admin/views/pmdinventory/index.blade.php
  app/admin/views/_layouts/default.blade.php
  app/admin/assets/css/pmd-inventory-barcode-floor-r31.css
)
for file in "$focus" "${fixtures[@]}"; do
  test -s "$file" || { echo "STOP: Missing prerequisite $file" >&2; exit 1; }
done
grep -Fq 'PMD_INVENTORY_BARCODE_FLOOR_R31_ASSETS' \
  app/admin/views/_layouts/default.blade.php || {
    echo "STOP: R31 real layout asset wiring missing." >&2; exit 1;
  }
if grep -Fq 'PMD_INVENTORY_BARCODE_SINGLE_FOCUS_R32' "$focus"; then
  if [ -s "$audit" ] && [ -s "$testfile" ]; then
    echo "ALREADY INSTALLED: R32 focus bypass and audit are present."
    exit 0
  fi
  echo "STOP: Partial R32 detected; manual inspection needed." >&2
  exit 1
fi
for file in "$audit" "$testfile"; do
  if [ -e "$file" ]; then
    echo "STOP: Refusing to overwrite local $file" >&2
    exit 1
  fi
done

backup="$HOME/pmd-backups/platform-buttons-r32-$(date +%Y%m%d-%H%M%S)"
stage="$backup/staged"
mkdir -p "$backup/original/$(dirname "$focus")" "$stage/$(dirname "$focus")"
cp -p "$focus" "$backup/original/$focus"
cp -p "$focus" "$stage/$focus"
before_sha="$(sha256sum "$focus" | awk '{print $1}')"
for file in "${fixtures[@]}"; do
  mkdir -p "$stage/$(dirname "$file")"
  cp -p "$file" "$stage/$file"
done
for file in "$audit" "$testfile"; do
  mkdir -p "$stage/$(dirname "$file")"
  git show "$revision:$file" > "$stage/$file"
  test -s "$stage/$file"
done

# Patch only exact anchors in CURRENT VPS focus code (never overwrite it
# wholesale with the Github version, because VPS contains other live patches).
python3 - "$stage/$focus" <<'PY'
from pathlib import Path
import sys

file=Path(sys.argv[1])
src=file.read_text(encoding='utf-8')
start="    function fixFormFieldFocusColors() {"
helper="""    // PMD_INVENTORY_BARCODE_SINGLE_FOCUS_R32
    // The scanner's outer label already owns its focus border. This legacy
    // Admin script used to overwrite the focused INNER input inline with
    // !important (and again every 100ms), defeating the R31 stylesheet.
    // Scope this exception solely to the R19 barcode textbox; normal
    // Admin form field focus styling is unchanged.
    function isInventoryBarcodeScanner(control) {
        return Boolean(
            control && control.matches &&
            control.matches('input[data-r19-barcode-input]') &&
            control.closest('.pmd-inv-r23-barcode__input') &&
            control.closest('.pmd-inv-r23-barcode')
        );
    }

    function clearLegacyScannerFocus(control) {
        if (!isInventoryBarcodeScanner(control)) return false;
        const border = control.style.getPropertyValue('border-color');
        const shadow = control.style.getPropertyValue('box-shadow');
        if (/rgb\\(\\s*54\\s*,\\s*74\\s*,\\s*99\\s*\\)|#364a63/i.test(border)) {
            control.style.removeProperty('border-color');
        }
        if (/54\\s*,\\s*74\\s*,\\s*99|#364a63/i.test(shadow)) {
            control.style.removeProperty('box-shadow');
        }
        if (control.style.getPropertyValue('transition') === 'none' &&
            control.style.getPropertyPriority('transition') === 'important') {
            control.style.removeProperty('transition');
        }
        return true;
    }
    // /PMD_INVENTORY_BARCODE_SINGLE_FOCUS_R32

"""
patches=[
 (start, helper+start),
 ("        formControls.forEach(control => {\n            const isFocused = document.activeElement === control;",
  "        formControls.forEach(control => {\n            if (clearLegacyScannerFocus(control)) return;\n            const isFocused = document.activeElement === control;"),
 ("    document.addEventListener('focusin', function(e) {\n        if (e.target.matches('.form-control, input, textarea, select, .form-select')) {",
  "    document.addEventListener('focusin', function(e) {\n        if (clearLegacyScannerFocus(e.target)) return;\n        if (e.target.matches('.form-control, input, textarea, select, .form-select')) {"),
 ("    document.addEventListener('focusout', function(e) {\n        if (e.target.matches('.form-control, input, textarea, select, .form-select')) {",
  "    document.addEventListener('focusout', function(e) {\n        if (clearLegacyScannerFocus(e.target)) return;\n        if (e.target.matches('.form-control, input, textarea, select, .form-select')) {")
]
if 'PMD_INVENTORY_BARCODE_SINGLE_FOCUS_R32' in src:
    raise SystemExit('STOP: R32 already present in staged script')
for old,new in patches:
    if src.count(old)!=1:
        raise SystemExit('STOP: Legacy focus anchor mismatch; NO live files changed: '+old[:95])
    src=src.replace(old,new,1)
file.write_text(src,encoding='utf-8')
PY

node --check "$stage/$focus"
node --check "$stage/$audit"
node --check "$stage/$testfile"
node "$stage/$testfile"
echo "PREFLIGHT PASS: R32 scanner single-frame focus and read-only platform audit."

if [ "$(sha256sum "$focus" | awk '{print $1}')" != "$before_sha" ]; then
  echo "STOP: Focus JS changed concurrently; refusing to overwrite." >&2
  exit 1
fi

applied=0
rollback() {
  code=$?
  if [ "$code" -ne 0 ] && [ "$applied" -eq 1 ]; then
    echo "ERROR: Restoring original VPS focus JS from $backup" >&2
    cp -p "$backup/original/$focus" "$focus" || true
    rm -f "$audit" "$testfile"
    php artisan view:clear || true
  fi
}
trap rollback EXIT
applied=1
cp -p "$stage/$focus" "$focus"
install -m 644 "$stage/$audit" "$audit"
install -m 644 "$stage/$testfile" "$testfile"
node "$testfile"
php artisan view:clear
applied=0

echo "SUCCESS: R32 removes legacy double focus ring from Barcode only."
echo "The read-only Playwright platform button auditor is installed (requires local interactive Chromium/MFA)."
echo "Backup: $backup"
echo "Run the browser audit on your MAC, not the VPS headless process."
git status --short -- "$focus" "$audit" "$testfile"
