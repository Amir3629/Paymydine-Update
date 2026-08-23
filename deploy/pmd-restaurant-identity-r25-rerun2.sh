#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="fix/restaurant-identity-r25"
BASE_SCRIPT="deploy/pmd-restaurant-identity-r25-surgical.sh"
TMP="/tmp/pmd-restaurant-identity-r25-surgical-rerun2.sh"

cd "$ROOT"

echo "============================================"
echo "RESTAURANT IDENTITY R25 SAFE RERUN 2"
echo "============================================"

echo
echo "== FETCH REVIEWED R25 BRANCH =="
git fetch origin "$BRANCH"
git show "FETCH_HEAD:$BASE_SCRIPT" > "$TMP"

python3 - "$TMP" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()

# Fix 1: root-owned STAGE is created under umask 077. The ubuntu build user
# needs traverse permission on this one ephemeral parent directory only.
old_stage = 'mkdir -p "$STAGE/files" "$BACKUP/files"\n'
new_stage = '''mkdir -p "$STAGE/files" "$BACKUP/files"\n# R25.0.2: allow the PM2/build user to traverse only the ephemeral stage root.\n# Backup remains root-private and production permissions are untouched.\nchmod 0711 "$STAGE"\n'''
if text.count(old_stage) != 1:
    raise SystemExit('REFUSED: expected staging mkdir marker not found exactly once')
text = text.replace(old_stage, new_stage, 1)

# Fix 2: always bind npm to the staged V2 package explicitly.
old_build = '  sudo -u "$PM2_USER" -H npm run build\n'
new_build = '''  # R25.0.2: bind npm to the staged V2 package explicitly.\n  [[ -f "$V2_STAGE/package.json" ]] || fail "Staged V2 package.json missing"\n  sudo -u "$PM2_USER" -H npm --prefix "$V2_STAGE" run build\n'''
if text.count(old_build) != 1:
    raise SystemExit('REFUSED: expected npm build command not found exactly once')
text = text.replace(old_build, new_build, 1)

path.write_text(text)
PY

echo
echo "== VERIFY RERUN SCRIPT =="
bash -n "$TMP"
grep -n 'chmod 0711 "$STAGE"' "$TMP"
grep -n 'npm --prefix "$V2_STAGE" run build' "$TMP"
grep -n 'PMD_THEME_IDENTITY_ISOLATION_R25' "$TMP"
grep -n 'PMD_PUBLIC_RESTAURANT_IDENTITY_R25' "$TMP"

echo
echo "== VERIFY LIVE V2 PACKAGE BEFORE DEPLOY =="
V2_PACKAGE="$ROOT/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/package.json"
[[ -f "$V2_PACKAGE" ]]
node -e 'const p=require(process.argv[1]); if (!p.scripts || p.scripts.build !== "next build") { console.error("REFUSED: V2 build script mismatch"); process.exit(2); } console.log("V2 BUILD SCRIPT:", p.scripts.build)' "$V2_PACKAGE"

echo
echo "== DEPLOY =="
sudo bash "$TMP"
