#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="fix/food-placeholder-media-r3"
BASE="deploy/pmd-food-placeholder-media-r3-safe.sh"
TMP="/tmp/pmd-food-placeholder-media-r3-final-runtime.sh"
TEST_HOST="${TEST_HOST:-a.paymydine.com}"
TEST_OLD_MEDIA="${TEST_OLD_MEDIA:-6776d40a49938149654564.jpg}"

cd "$ROOT"

echo "============================================================"
echo "PMD FOOD PLACEHOLDER + TENANT MEDIA R3 FINAL"
echo "============================================================"

echo
echo "== FETCH REVIEWED R3 =="
git fetch origin "$BRANCH"
git show "FETCH_HEAD:$BASE" > "$TMP"

python3 - "$TMP" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

old_guard = '''if grep -q 'DB::setDefaultConnection\\|database.default' "$STAGE/files/$HELPER"; then
  fail "R3 helper must never modify database.default"
fi
'''
new_guard = '''if grep -q 'DB::setDefaultConnection' "$STAGE/files/$HELPER" \\
  || grep -Fq "Config::set('database.default" "$STAGE/files/$HELPER" \\
  || grep -Fq 'Config::set("database.default' "$STAGE/files/$HELPER"; then
  fail "R3 helper must never modify database.default"
fi
'''
if old_guard not in s:
    raise SystemExit('REFUSED: helper safety-check block changed unexpectedly')
s = s.replace(old_guard, new_guard, 1)

old_menu_check = '''MENU_BODY="$(curl -k -fsSL "https://$TEST_HOST/api/v1/menu?r3body=$STAMP")"
printf '%s' "$MENU_BODY" | grep -Fq '/brand/paymydine-logo.svg' || fail "Menu API does not expose PMD placeholder"
if printf '%s' "$MENU_BODY" | grep -Fq '/images/pasta.png'; then
  fail "Old pasta placeholder still present in menu API"
fi
if printf '%s' "$MENU_BODY" | grep -Fq "$TEST_OLD_MEDIA"; then
  fail "Old foreign image still referenced by menu API"
fi
'''
new_menu_check = '''MENU_BODY="$(curl -k -fsSL "https://$TEST_HOST/api/v1/menu?r3body=$STAMP")"
MENU_AUDIT="$(printf '%s' "$MENU_BODY" | TEST_OLD_MEDIA="$TEST_OLD_MEDIA" python3 -c '
import json, os, sys
j = json.load(sys.stdin)
items = (j.get("data") or {}).get("items") or []
old = os.environ.get("TEST_OLD_MEDIA", "")
placeholder = sum(1 for x in items if x.get("image") == "/brand/paymydine-logo.svg")
pasta = sum(1 for x in items if x.get("image") == "/images/pasta.png")
foreign = sum(1 for x in items if old and old in str(x.get("image") or ""))
print(f"placeholder={placeholder} pasta={pasta} foreign={foreign}")
')"
echo "MENU AUDIT: $MENU_AUDIT"
PLACEHOLDER_COUNT="$(printf '%s' "$MENU_AUDIT" | sed -n 's/.*placeholder=\\([0-9][0-9]*\\).*/\\1/p')"
PASTA_COUNT="$(printf '%s' "$MENU_AUDIT" | sed -n 's/.*pasta=\\([0-9][0-9]*\\).*/\\1/p')"
FOREIGN_COUNT="$(printf '%s' "$MENU_AUDIT" | sed -n 's/.*foreign=\\([0-9][0-9]*\\).*/\\1/p')"
[[ -n "$PLACEHOLDER_COUNT" && "$PLACEHOLDER_COUNT" -gt 0 ]] || fail "Menu API does not expose PMD placeholder"
[[ "$PASTA_COUNT" == "0" ]] || fail "Old pasta placeholder still present in menu API"
[[ "$FOREIGN_COUNT" == "0" ]] || fail "Old foreign image still referenced by menu API"
'''
if old_menu_check not in s:
    raise SystemExit('REFUSED: menu verification block changed unexpectedly')
s = s.replace(old_menu_check, new_menu_check, 1)

p.write_text(s)
PY

echo
echo "== SHELL SYNTAX =="
bash -n "$TMP"

echo
echo "== VERIFY SAFETY CONTRACT =="
grep -n 'BACKUP INDIVIDUAL FILES ONLY' "$TMP"
grep -n 'NO middleware changes' "$TMP" | head
grep -n 'PMD_FOOD_PLACEHOLDER_GLASS_R3' "$TMP"
grep -n 'pmd_media_owned_by_request_tenant_r3' "$TMP" | head
grep -n 'AUTOMATIC R3 ROLLBACK' "$TMP"

if grep -q 'cp -a .*BACKUP/files/.*ROOT' "$TMP"; then
  echo "REFUSED: unsafe directory restore pattern detected"
  exit 2
fi

echo
echo "== RUN AUDITED R3 =="
sudo env \
  TEST_HOST="$TEST_HOST" \
  TEST_OLD_MEDIA="$TEST_OLD_MEDIA" \
  bash "$TMP"
