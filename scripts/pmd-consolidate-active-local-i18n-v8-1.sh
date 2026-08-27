#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="i18n/platform-catalog-consolidation"
REF="origin/${BRANCH}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$ROOT"

echo "============================================================"
echo " PMD ACTIVE LOCAL I18N CONSOLIDATION V8.1"
echo "============================================================"

git fetch origin "$BRANCH"
git show "$REF:scripts/pmd-consolidate-active-local-i18n-v8.sh" > "$TMP/v8.sh"

python3 - "$TMP/v8.sh" "$TMP/v8-fixed.sh" <<'PY'
from pathlib import Path
import sys

source = Path(sys.argv[1]).read_text(encoding='utf-8')
old = "    text, count = locale_pattern.subn(replacement, text, count=1)"
new = "    text, count = locale_pattern.subn(lambda _match: replacement, text, count=1)"

if source.count(old) != 1:
    raise SystemExit('ERROR=Could not patch the V8 Coupon regex replacement exactly once')

source = source.replace(old, new, 1)
source = source.replace(
    ' PMD ACTIVE LOCAL I18N CONSOLIDATION V8"',
    ' PMD ACTIVE LOCAL I18N CONSOLIDATION V8.1"',
    1,
)

Path(sys.argv[2]).write_text(source, encoding='utf-8')
print('V8_1_COUPON_REGEX_ESCAPE_PATCHED=1')
PY

bash -n "$TMP/v8-fixed.sh"
grep -Fq 'locale_pattern.subn(lambda _match: replacement, text, count=1)' "$TMP/v8-fixed.sh"
if grep -Fq 'locale_pattern.subn(replacement, text, count=1)' "$TMP/v8-fixed.sh"; then
  echo "ERROR=Unsafe Coupon regex replacement survived V8.1 patch" >&2
  exit 70
fi

echo "V8_1_WRAPPER_VALIDATED=1"
bash "$TMP/v8-fixed.sh"

echo "============================================================"
echo " PMD ACTIVE LOCAL I18N CONSOLIDATION V8.1 COMPLETE"
echo "============================================================"
echo "ACTIVE_LOCAL_I18N_V8_1_OK=1"
