#!/usr/bin/env bash
# PMD_R17E_NEXT_BIN_SYMLINK_REGRESSION
# Self-contained test: use fake packages; never touch production node_modules.
set -Eeuo pipefail
command -v rsync >/dev/null || exit 2
command -v node >/dev/null || exit 2
D="$(mktemp -d -t pmd-r17e-symlink-test-XXXXXXXX)"
trap 'rm -rf "$D"' EXIT
SRC="$D/source/node_modules"
DST="$D/stage/node_modules"
mkdir -p "$SRC/.bin" "$SRC/next/dist/bin" "$SRC/next/dist/server" "$DST" "$D/outside"
printf 'module.exports = {};\n' > "$SRC/next/dist/server/require-hook.js"
cat > "$SRC/next/dist/bin/next" <<'JS'
#!/usr/bin/env node
require('../server/require-hook')
console.log('R17E_MOCK_NEXT_OK')
JS
chmod 755 "$SRC/next/dist/bin/next"
ln -s ../next/dist/bin/next "$SRC/.bin/next"
printf 'EXTERNAL_TEST_FILE\n' > "$D/outside/unsafe-dependency"
ln -s "$D/outside/unsafe-dependency" "$SRC/unsafe-dependency"

# This is the important change: KEEP safe internal relative links (e.g.
# node_modules/.bin/next -> ../next/dist/bin/next); only materialize unsafe
# links pointing outside the copied source tree.
rsync -a --copy-unsafe-links "$SRC/" "$DST/"
[[ -L "$DST/.bin/next" ]] || {
  echo 'FAIL R17E: Next internal .bin symlink was unexpectedly dereferenced'
  exit 3
}
[[ "$(readlink "$DST/.bin/next")" == ../next/dist/bin/next ]] || {
  echo 'FAIL R17E: Next symlink target changed'
  exit 3
}
[[ ! -L "$DST/unsafe-dependency" && -f "$DST/unsafe-dependency" ]] || {
  echo 'FAIL R17E: external symlink was not safely copied'
  exit 3
}
RESULT="$(node "$DST/.bin/next")"
[[ "$RESULT" == R17E_MOCK_NEXT_OK ]] || {
  echo "FAIL R17E: CLI relative require failed: $RESULT"
  exit 3
}
echo 'PASS R17E: internal Next .bin symlink preserved; CLI relative require resolves.'
echo 'PASS R17E: external dependency symlink materialized inside isolated build.'
