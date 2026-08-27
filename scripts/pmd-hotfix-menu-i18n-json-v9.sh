#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
TARGET="app/admin/views/pmdmenus/index.blade.php"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-menu-i18n-v9-backups/$STAMP"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$ROOT"
mkdir -p "$BACKUP"

[ -f "$TARGET" ] || { echo "ERROR=Missing $TARGET" >&2; exit 90; }
cp -a "$TARGET" "$BACKUP/pmdmenus-index.blade.php.before"
sha256sum "$TARGET" > "$BACKUP/hash.before"

python3 - "$TARGET" "$TMP/candidate.blade.php" <<'PY'
from pathlib import Path
import sys

src = Path(sys.argv[1])
out = Path(sys.argv[2])
text = src.read_text(encoding='utf-8')

if 'PMD_MENU_MANAGER_PLATFORM_I18N_GLOBAL_V1' not in text:
    raise SystemExit('ERROR=Central Menu i18n marker missing; refusing hotfix')

broken = "json_encode($pmdMenuCopy[$pmdMenuLocale], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT)"
fixed = "json_encode($pmdMenuCopy, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT)"

count = text.count(broken)
if count == 0 and fixed in text:
    print('MENU_JSON_ALREADY_FIXED=1')
    out.write_text(text, encoding='utf-8')
    raise SystemExit(0)
if count != 1:
    raise SystemExit(f'ERROR=Expected exactly one broken Menu JSON payload, found {count}')

text = text.replace(broken, fixed, 1)
if '$pmdMenuCopy[$pmdMenuLocale]' in text:
    raise SystemExit('ERROR=Locale-indexed Menu copy survived candidate patch')

out.write_text(text, encoding='utf-8')
print('MENU_JSON_CANDIDATE_OK=1')
PY

grep -q 'PMD_MENU_MANAGER_PLATFORM_I18N_GLOBAL_V1' "$TMP/candidate.blade.php"
if grep -Fq '$pmdMenuCopy[$pmdMenuLocale]' "$TMP/candidate.blade.php"; then
  echo "ERROR=Broken locale-indexed Menu copy still present" >&2
  exit 91
fi

echo "ALL_V9_GUARDS_OK=1"
sudo tee "$TARGET" < "$TMP/candidate.blade.php" >/dev/null

php artisan view:clear >/dev/null 2>&1 || true
FPM_SERVICES="$(systemctl list-units --type=service --state=running --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1}')"
for svc in $FPM_SERVICES; do
  echo "RELOADING_FPM=$svc"
  sudo systemctl reload "$svc"
done

if grep -Fq '$pmdMenuCopy[$pmdMenuLocale]' "$TARGET"; then
  echo "ERROR=Broken Menu JSON payload still live" >&2
  exit 92
fi
grep -Fq 'json_encode($pmdMenuCopy, JSON_UNESCAPED_UNICODE' "$TARGET"

echo "MENU_500_HOTFIX_OK=1"
echo "BACKUP=$BACKUP"
echo "NEXT=Hard refresh /admin/pmdmenus in German. The page should render instead of HTTP 500."
