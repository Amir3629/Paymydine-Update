#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
REMOTE="origin/sumup-terminal-e2e"
BASE_SCRIPT="/tmp/deploy-pmd-sumup-final-v7-base.sh"
PATCHED_SCRIPT="/tmp/deploy-pmd-sumup-final-v7-webpack.sh"

cd "$ROOT"

echo "=========================================="
echo " PAYMYDINE SUMUP FINAL V7.1"
echo " NEXT 16 STAGED-BUILD COMPATIBILITY FIX"
echo "=========================================="

git fetch origin sumup-terminal-e2e
REMOTE_SHA="$(git rev-parse "$REMOTE")"
echo "REMOTE=$REMOTE_SHA"

git show "$REMOTE:scripts/deploy-pmd-sumup-final-v7.sh" > "$BASE_SCRIPT"

python3 - "$BASE_SCRIPT" "$PATCHED_SCRIPT" <<'PY'
from pathlib import Path
import sys

src = Path(sys.argv[1])
dst = Path(sys.argv[2])
text = src.read_text()

old = '''(
  cd "$FRONT_STAGE"
  npm run build
)
'''
new = '''(
  cd "$FRONT_STAGE"
  # Next.js 16 defaults to Turbopack. The isolated build intentionally uses a
  # symlink to the already-installed live node_modules, and Turbopack rejects
  # symlinks whose target is outside its project filesystem root. Webpack is a
  # supported Next.js production-build opt-out and resolves dependencies through
  # this symlink without copying or mutating the live node_modules tree.
  echo "STAGED_FRONTEND_BUNDLER=webpack"
  npm run build -- --webpack
)
'''

if old not in text:
    raise SystemExit('ERROR: expected V7 frontend build marker was not found; nothing executed')

text = text.replace(old, new, 1)

if 'npm run build -- --webpack' not in text:
    raise SystemExit('ERROR: Webpack build patch verification failed')

# Make the runtime output distinguish this corrected deployment from the
# original V7 preflight failure while leaving the underlying deployment logic
# unchanged.
text = text.replace(' PAYMYDINE SUMUP FINAL V7\n', ' PAYMYDINE SUMUP FINAL V7.1\n', 1)
text = text.replace(' SUCCESS - SUMUP FINAL V7 INSTALLED\n', ' SUCCESS - SUMUP FINAL V7.1 INSTALLED\n', 1)

dst.write_text(text)
PY

chmod 755 "$PATCHED_SCRIPT"

grep -q 'npm run build -- --webpack' "$PATCHED_SCRIPT"
echo "V7.1 PATCH READY"
echo "Starting audited deployment..."

exec bash "$PATCHED_SCRIPT"
