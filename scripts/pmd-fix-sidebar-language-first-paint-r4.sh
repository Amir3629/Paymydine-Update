#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-$(pwd)}"
MENU="$ROOT/app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php"

if [ ! -f "$MENU" ]; then
  echo "ERROR: Missing $MENU"
  exit 1
fi

if [ ! -w "$MENU" ] && [ "$(id -u)" -ne 0 ]; then
  echo "Production Blade file is not writable by $(id -un). Re-running patch with sudo..."
  exec sudo env PMD_ROOT="$ROOT" bash "$0"
fi

cd "$ROOT"

TS="$(date +%Y%m%d_%H%M%S)"
BACKUP="$ROOT/storage/pmd-patch-backups/sidebar-language-first-paint-r4-$TS"
mkdir -p "$BACKUP"
cp -a "$MENU" "$BACKUP/pmd_side_menu2_single_menu.blade.php"

echo "Backup created: $BACKUP"

python3 - <<'PY'
from pathlib import Path

path = Path('app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php')
text = path.read_text(encoding='utf-8')

if 'PMD_SM2_LANGUAGE_FIRST_PAINT_R4' in text:
    print('PMD sidebar language first-paint R4 is already applied.')
    raise SystemExit(0)

locale_anchor = "    $pmdSm2IsDe = $pmdSm2Locale === 'de';\n"
if locale_anchor not in text:
    raise SystemExit('ERROR: Could not find sidebar locale authority.')

first_paint_php = r'''    // PMD_SM2_LANGUAGE_FIRST_PAINT_R4
    // Render the DE/EN target on the server so the collapsed button never
    // paints the old "--" placeholder before the market-aware runtime hydrates.
    // The existing language bridge still replaces this with the authoritative
    // market-aware target when the page runtime is ready.
    $pmdSm2LanguageFirstPaintCode = $pmdSm2IsDe ? 'EN' : 'DE';
    $pmdSm2LanguageFirstPaintLabel = $pmdSm2IsDe ? 'English' : 'Deutsch';
'''
text = text.replace(locale_anchor, locale_anchor + first_paint_php, 1)

start_marker = '<!-- PMD_SM2_INLINE_ACTIONS_R2_START -->'
end_marker = '<!-- PMD_SM2_INLINE_ACTIONS_R2_END -->'
start = text.find(start_marker)
end = text.find(end_marker, start if start >= 0 else 0)

if start < 0 or end < 0:
    raise SystemExit('ERROR: R2 inline language block was not found. Apply R2 first.')

end += len(end_marker)
block = text[start:end]

block = block.replace(
    'aria-label="Switch language"\n            title="Switch language"\n            hidden',
    'aria-label="Switch language to {{ $pmdSm2LanguageFirstPaintCode }}"\n            title="Switch language to {{ $pmdSm2LanguageFirstPaintCode }}"'
)
block = block.replace(
    '<span class="pmd-sm2__language-code" aria-hidden="true">--</span>',
    '<span class="pmd-sm2__language-code" aria-hidden="true">{{ $pmdSm2LanguageFirstPaintCode }}</span>'
)
block = block.replace(
    '<span class="pmd-sm2__label" data-pmd-sm2-language-label>Language</span>',
    '<span class="pmd-sm2__label" data-pmd-sm2-language-label>{{ $pmdSm2LanguageFirstPaintLabel }}</span>'
)

if 'hidden' in block.split('</button>', 1)[0]:
    raise SystemExit('ERROR: Could not remove hidden attribute from language button.')
if '>--</span>' in block:
    raise SystemExit('ERROR: Could not replace old -- language placeholder.')

text = text[:start] + block + text[end:]
path.write_text(text, encoding='utf-8')
print('PMD sidebar language first-paint R4 applied successfully.')
PY

grep -q 'PMD_SM2_LANGUAGE_FIRST_PAINT_R4' "$MENU"
if grep -A16 'data-pmd-sm2-language-inline' "$MENU" | grep -q -- '>--</span>'; then
  echo "ERROR: Old -- placeholder is still present. Restoring backup."
  cp -a "$BACKUP/pmd_side_menu2_single_menu.blade.php" "$MENU"
  exit 1
fi

php artisan view:clear >/dev/null 2>&1 || true

echo
echo "SUCCESS"
echo "Changed file:"
echo "  app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php"
echo
echo "The language target is now server-rendered on first paint; the existing"
echo "market-aware JavaScript bridge still confirms/corrects it after load."
echo
echo "Backup: $BACKUP"
echo "Rollback:"
echo "  sudo cp -a '$BACKUP/pmd_side_menu2_single_menu.blade.php' '$MENU'"
echo "  cd '$ROOT' && sudo php artisan view:clear"
