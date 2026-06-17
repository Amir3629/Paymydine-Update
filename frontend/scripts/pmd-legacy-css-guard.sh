#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

failures=0

fail() {
  echo "❌ $1"
  failures=$((failures + 1))
}

pass() {
  echo "✅ $1"
}

if grep -q '../styles/global/paymydine-legacy-globals.css' app/globals.css; then
  pass "app/globals.css keeps the active legacy compatibility import"
else
  fail "app/globals.css no longer imports ../styles/global/paymydine-legacy-globals.css; this broke live visuals before"
fi

if [ -f styles/global/paymydine-legacy-globals.css ]; then
  pass "paymydine-legacy-globals.css exists"
else
  fail "styles/global/paymydine-legacy-globals.css missing"
fi

for n in 01 02 03 04 05 06 07 08 09 10; do
  file="styles/global/legacy/legacy-${n}.css"
  if [ -f "$file" ]; then
    pass "present: $file"
  else
    fail "missing: $file"
  fi
  if grep -q "./legacy/legacy-${n}.css" styles/global/paymydine-legacy-globals.css 2>/dev/null; then
    pass "imported: legacy-${n}.css"
  else
    fail "not imported by paymydine-legacy-globals.css: legacy-${n}.css"
  fi
done

if [ -f docs/LEGACY_CSS_COMPATIBILITY_LAYER.md ]; then
  pass "legacy CSS cleanup documentation exists"
else
  fail "docs/LEGACY_CSS_COMPATIBILITY_LAYER.md missing"
fi

if [ -f styles/global/legacy/README.md ]; then
  pass "legacy folder README exists"
else
  fail "styles/global/legacy/README.md missing"
fi

if grep -q 'Do not remove the whole legacy folder at once' docs/LEGACY_CSS_COMPATIBILITY_LAYER.md 2>/dev/null; then
  pass "documentation warns against one-shot legacy CSS removal"
else
  fail "legacy CSS docs missing one-shot removal warning"
fi

legacy_lines=$(find styles/global/legacy -type f -name '*.css' -exec cat {} + 2>/dev/null | wc -l | tr -d ' ')
echo "legacy CSS total lines: ${legacy_lines:-0}"

if [ "${legacy_lines:-0}" -lt 10000 ]; then
  fail "legacy CSS line count unexpectedly low; remove blocks only after scoped migration and visual QA"
else
  pass "legacy CSS compatibility layer still present for current live visuals"
fi

if [ "$failures" -ne 0 ]; then
  echo "❌ legacy CSS guard failed with $failures issue(s)"
  exit 1
fi

echo "✅ legacy CSS guard passed"
