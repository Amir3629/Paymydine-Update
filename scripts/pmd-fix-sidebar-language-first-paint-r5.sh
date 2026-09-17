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
BACKUP="$ROOT/storage/pmd-patch-backups/sidebar-language-first-paint-r5-$TS"
mkdir -p "$BACKUP"
cp -a "$MENU" "$BACKUP/pmd_side_menu2_single_menu.blade.php"

echo "Backup created: $BACKUP"

python3 - <<'PY'
from pathlib import Path
import re

path = Path('app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php')
text = path.read_text(encoding='utf-8')

# Add a server-first DE/EN target once. This matches the existing current-locale
# authority already present in this Side Menu partial and removes the temporary
# "--" paint before the market-aware runtime confirms the value.
if 'PMD_SM2_LANGUAGE_FIRST_PAINT_R5' not in text:
    locale_anchor = "    $pmdSm2IsDe = $pmdSm2Locale === 'de';\n"
    if locale_anchor not in text:
        raise SystemExit('ERROR: Could not find sidebar locale authority.')

    first_paint_php = r'''    // PMD_SM2_LANGUAGE_FIRST_PAINT_R5
    // First-paint value for the inline language item. The existing market-aware
    // bridge remains runtime authority and may confirm/correct this after load.
    $pmdSm2LanguageFirstPaintCode = $pmdSm2IsDe ? 'EN' : 'DE';
    $pmdSm2LanguageFirstPaintLabel = $pmdSm2IsDe ? 'English' : 'Deutsch';
'''
    text = text.replace(locale_anchor, locale_anchor + first_paint_php, 1)

start_marker = '<!-- PMD_SM2_INLINE_ACTIONS_R2_START -->'
end_marker = '<!-- PMD_SM2_INLINE_ACTIONS_R2_END -->'
start = text.find(start_marker)
end = text.find(end_marker, start if start >= 0 else 0)

if start < 0 or end < 0:
    raise SystemExit('ERROR: R2 inline actions block was not found. Apply R2 first.')

end += len(end_marker)
block = text[start:end]

# Locate only the inline language button opening tag. Do not confuse aria-hidden
# on child spans with the button's boolean hidden attribute.
button_match = re.search(
    r'(<button\b[^>]*\bdata-pmd-sm2-language-inline\b[^>]*>)',
    block,
    flags=re.S,
)
if not button_match:
    raise SystemExit('ERROR: Inline language button was not found.')

button_tag = button_match.group(1)
new_button_tag = re.sub(r'\s+hidden(?=\s|>)', '', button_tag, count=1)
new_button_tag = re.sub(
    r'aria-label="[^"]*"',
    'aria-label="Switch language to {{ $pmdSm2LanguageFirstPaintCode }}"',
    new_button_tag,
    count=1,
)
new_button_tag = re.sub(
    r'title="[^"]*"',
    'title="Switch language to {{ $pmdSm2LanguageFirstPaintCode }}"',
    new_button_tag,
    count=1,
)
block = block.replace(button_tag, new_button_tag, 1)

block = re.sub(
    r'(<span\s+class="pmd-sm2__language-code"\s+aria-hidden="true">).*?(</span>)',
    r'\1{{ $pmdSm2LanguageFirstPaintCode }}\2',
    block,
    count=1,
    flags=re.S,
)
block = re.sub(
    r'(<span\s+class="pmd-sm2__label"\s+data-pmd-sm2-language-label>).*?(</span>)',
    r'\1{{ $pmdSm2LanguageFirstPaintLabel }}\2',
    block,
    count=1,
    flags=re.S,
)

# Validate the opening button tag specifically.
check_match = re.search(
    r'(<button\b[^>]*\bdata-pmd-sm2-language-inline\b[^>]*>)',
    block,
    flags=re.S,
)
if not check_match:
    raise SystemExit('ERROR: Inline language button disappeared during patch.')
check_tag = check_match.group(1)
if re.search(r'\s+hidden(?=\s|>)', check_tag):
    raise SystemExit('ERROR: Boolean hidden attribute is still present on language button.')
if '{{ $pmdSm2LanguageFirstPaintCode }}' not in block:
    raise SystemExit('ERROR: Server-rendered language code was not installed.')
if '>--</span>' in block:
    raise SystemExit('ERROR: Old -- placeholder is still present.')

text = text[:start] + block + text[end:]
path.write_text(text, encoding='utf-8')
print('PMD sidebar language first-paint R5 applied successfully.')
PY

if ! grep -q 'PMD_SM2_LANGUAGE_FIRST_PAINT_R5' "$MENU"; then
  echo "ERROR: R5 marker missing. Restoring backup."
  cp -a "$BACKUP/pmd_side_menu2_single_menu.blade.php" "$MENU"
  exit 1
fi

if grep -A18 'data-pmd-sm2-language-inline' "$MENU" | grep -q -- '>--</span>'; then
  echo "ERROR: Old -- placeholder still present. Restoring backup."
  cp -a "$BACKUP/pmd_side_menu2_single_menu.blade.php" "$MENU"
  exit 1
fi

php artisan view:clear >/dev/null 2>&1 || true

echo
echo "SUCCESS"
echo "Changed file:"
echo "  app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php"
echo
echo "Backup: $BACKUP"
echo "Rollback:"
echo "  sudo cp -a '$BACKUP/pmd_side_menu2_single_menu.blade.php' '$MENU'"
echo "  cd '$ROOT' && sudo php artisan view:clear"
