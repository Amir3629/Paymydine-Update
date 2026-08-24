#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="fix/food-placeholder-media-r3"
BASE="deploy/pmd-food-placeholder-media-r3-safe.sh"
TMP="/tmp/pmd-food-placeholder-media-r3-final2-runtime.sh"
TEST_HOST="${TEST_HOST:-a.paymydine.com}"
TEST_OLD_MEDIA="${TEST_OLD_MEDIA:-6776d40a49938149654564.jpg}"

cd "$ROOT"

echo "============================================================"
echo "PMD FOOD PLACEHOLDER + TENANT MEDIA R3 FINAL2"
echo "============================================================"

echo
echo "== FETCH REVIEWED R3 BASE =="
git fetch origin "$BRANCH"
git show "FETCH_HEAD:$BASE" > "$TMP"

python3 - "$TMP" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

# 1) Safety check: comments may mention database.default; only executable mutations are forbidden.
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

# 2) Turbopack cannot build when node_modules is a symlink outside project root.
old_build = '''ln -s "$V2_ROOT/node_modules" "$V2_BUILD/node_modules"
for envfile in .env .env.local .env.production; do
  [[ -f "$V2_ROOT/$envfile" ]] && cp "$V2_ROOT/$envfile" "$V2_BUILD/$envfile"
done

chown -R "$PM2_USER:$PM2_USER" "$V2_BUILD"

sudo -u "$PM2_USER" -H npm --prefix "$V2_BUILD" run build
'''
new_build = '''for envfile in .env .env.local .env.production; do
  [[ -f "$V2_ROOT/$envfile" ]] && cp "$V2_ROOT/$envfile" "$V2_BUILD/$envfile"
done

# R3 FINAL2: make the staged project writable before attaching dependencies.
# Never chown recursively after hardlinking node_modules, because hardlinks share inodes.
chown -R "$PM2_USER:$PM2_USER" "$V2_BUILD"

# Turbopack requires node_modules to live inside the project filesystem tree.
# Prefer hardlinks (same proven production bytes, no out-of-root symlink).
# If /var/tmp is a separate filesystem, fall back to a real copy -- never a symlink.
if ! cp -al "$V2_ROOT/node_modules" "$V2_BUILD/node_modules" 2>/dev/null; then
  rm -rf "$V2_BUILD/node_modules"
  cp -a "$V2_ROOT/node_modules" "$V2_BUILD/node_modules"
fi
[[ -d "$V2_BUILD/node_modules" ]] || fail "Staged node_modules missing"
[[ ! -L "$V2_BUILD/node_modules" ]] || fail "Staged node_modules must not be a symlink"

sudo -u "$PM2_USER" -H npm --prefix "$V2_BUILD" run build
'''
if old_build not in s:
    raise SystemExit('REFUSED: staged node_modules build block changed unexpectedly')
s = s.replace(old_build, new_build, 1)

# 3) Verify JSON semantically, not by raw escaped-slash grep.
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
MENU_AUDIT="$(printf '%s' "$MENU_BODY" | TEST_OLD_MEDIA="$TEST_OLD_MEDIA" python3 -c '\''
import json, os, sys
j = json.load(sys.stdin)
items = (j.get("data") or {}).get("items") or []
old = os.environ.get("TEST_OLD_MEDIA", "")
placeholder = sum(1 for x in items if x.get("image") == "/brand/paymydine-logo.svg")
pasta = sum(1 for x in items if x.get("image") == "/images/pasta.png")
foreign = sum(1 for x in items if old and old in str(x.get("image") or ""))
print(f"placeholder={placeholder} pasta={pasta} foreign={foreign}")
'\'')"
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
echo "== VERIFY FINAL2 BUILD SAFETY =="
grep -n 'cp -al "$V2_ROOT/node_modules" "$V2_BUILD/node_modules"' "$TMP"
grep -n 'must not be a symlink' "$TMP"
grep -n 'BACKUP INDIVIDUAL FILES ONLY' "$TMP"
grep -n 'AUTOMATIC R3 ROLLBACK' "$TMP"

if grep -n 'ln -s "$V2_ROOT/node_modules"' "$TMP"; then
  echo "REFUSED: out-of-root node_modules symlink still present"
  exit 2
fi

if grep -q 'cp -a .*BACKUP/files/.*ROOT' "$TMP"; then
  echo "REFUSED: unsafe directory restore pattern detected"
  exit 2
fi

echo
echo "== RUN AUDITED R3 FINAL2 =="
sudo env \
  TEST_HOST="$TEST_HOST" \
  TEST_OLD_MEDIA="$TEST_OLD_MEDIA" \
  bash "$TMP"
