#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="fix/restaurant-identity-r25"
BASE_SCRIPT="deploy/pmd-restaurant-identity-r25-surgical.sh"
TMP="/tmp/pmd-restaurant-identity-r25-surgical-rerun.sh"

cd "$ROOT"

echo "============================================"
echo "RESTAURANT IDENTITY R25 SAFE RERUN"
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
old = '  sudo -u "$PM2_USER" -H npm run build\n'
new = '''  # R25.0.1: bind npm to the staged V2 package explicitly.\n  # Some sudo policies retain HOME but not the caller cwd; --prefix prevents\n  # npm from ever resolving the repository-root package.json by mistake.\n  [[ -f "$V2_STAGE/package.json" ]] || fail "Staged V2 package.json missing"\n  sudo -u "$PM2_USER" -H npm --prefix "$V2_STAGE" run build\n'''
if old not in text:
    raise SystemExit('REFUSED: expected npm build command not found exactly once')
if text.count(old) != 1:
    raise SystemExit('REFUSED: ambiguous npm build command count')
text = text.replace(old, new, 1)
path.write_text(text)
PY

echo
echo "== VERIFY RERUN SCRIPT =="
bash -n "$TMP"
grep -n 'npm --prefix "$V2_STAGE" run build' "$TMP"
grep -n 'PMD_THEME_IDENTITY_ISOLATION_R25' "$TMP"
grep -n 'PMD_PUBLIC_RESTAURANT_IDENTITY_R25' "$TMP"

echo
echo "== VERIFY LIVE V2 PACKAGE BEFORE DEPLOY =="
[[ -f "$ROOT/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/package.json" ]]
node -e 'const p=require(process.argv[1]); if (!p.scripts || p.scripts.build !== "next build") { console.error("REFUSED: V2 build script mismatch"); process.exit(2); } console.log("V2 BUILD SCRIPT:", p.scripts.build)' "$ROOT/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/package.json"

echo
echo "== DEPLOY =="
sudo bash "$TMP"
