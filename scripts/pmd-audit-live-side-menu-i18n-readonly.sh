#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
FILE="app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php"
BRANCH_REF="origin/i18n/platform-catalog-consolidation"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
OUTPUT="${HOME}/pmd-platform-i18n-side-menu-audits/${STAMP}"

mkdir -p "$OUTPUT"
cd "$ROOT"

if [ ! -f "$FILE" ]; then
  echo "ERROR=Missing live file: $ROOT/$FILE" >&2
  exit 2
fi

if ! git rev-parse --verify "$BRANCH_REF" >/dev/null 2>&1; then
  git fetch origin i18n/platform-catalog-consolidation
fi

echo "============================================================"
echo " PMD SIDE MENU I18N LIVE READ-ONLY AUDIT"
echo "============================================================"
echo "ROOT=$ROOT"
echo "FILE=$FILE"
echo "OUTPUT=$OUTPUT"

git rev-parse HEAD > "$OUTPUT/head.txt"
git branch --show-current > "$OUTPUT/branch.txt"

sha256sum "$FILE" | tee "$OUTPUT/live.sha256"

git show "HEAD:$FILE" > "$OUTPUT/head-version.blade.php"
git show "$BRANCH_REF:$FILE" > "$OUTPUT/branch-version.blade.php"

sha256sum "$OUTPUT/head-version.blade.php" | tee "$OUTPUT/head-version.sha256"
sha256sum "$OUTPUT/branch-version.blade.php" | tee "$OUTPUT/branch-version.sha256"

git diff --no-index -- "$OUTPUT/head-version.blade.php" "$FILE" \
  > "$OUTPUT/live-vs-head.diff" || true

git diff --no-index -- "$OUTPUT/branch-version.blade.php" "$FILE" \
  > "$OUTPUT/live-vs-platform-branch.diff" || true

LATEST_AUDIT="$(ls -1dt "${HOME}"/pmd-platform-i18n-audits/* 2>/dev/null | head -n 1 || true)"
if [ -n "$LATEST_AUDIT" ] && [ -f "$LATEST_AUDIT/platform-i18n-candidates.tsv" ]; then
  awk -F '\t' -v target="$FILE" 'NR == 1 || $1 == target' \
    "$LATEST_AUDIT/platform-i18n-candidates.tsv" \
    > "$OUTPUT/side-menu-candidates.tsv"
else
  printf 'file\tline\tkind\tconfidence\ttext\n' > "$OUTPUT/side-menu-candidates.tsv"
fi

{
  echo "HEAD=$(cat "$OUTPUT/head.txt")"
  echo "BRANCH=$(cat "$OUTPUT/branch.txt")"
  echo "LIVE_SHA=$(awk '{print $1}' "$OUTPUT/live.sha256")"
  echo "HEAD_FILE_SHA=$(awk '{print $1}' "$OUTPUT/head-version.sha256")"
  echo "PLATFORM_BRANCH_FILE_SHA=$(awk '{print $1}' "$OUTPUT/branch-version.sha256")"
  echo "LIVE_VS_HEAD_DIFF_LINES=$(wc -l < "$OUTPUT/live-vs-head.diff")"
  echo "LIVE_VS_PLATFORM_BRANCH_DIFF_LINES=$(wc -l < "$OUTPUT/live-vs-platform-branch.diff")"
  echo "SIDE_MENU_CANDIDATES=$(( $(wc -l < "$OUTPUT/side-menu-candidates.tsv") - 1 ))"
} | tee "$OUTPUT/summary.txt"

echo
echo "--- I18N / NAV SOURCE MARKERS ---"
grep -nE \
  'pmdSm2Locale|pmdSm2IsDe|pmd_admin_locale|Dashboard|Manager|Accountant|Orders|Reservations|Coupons|Menu|Settings|Logout|Open navigation|Close navigation|Admin navigation|Expand menu|PMDPlatform|pmd-platform' \
  "$FILE" \
  | tee "$OUTPUT/source-markers.txt" || true

echo
echo "--- LIVE VS PLATFORM BRANCH DIFF (first 260 lines) ---"
sed -n '1,260p' "$OUTPUT/live-vs-platform-branch.diff"

echo
echo "--- SIDE MENU AUDIT CANDIDATES ---"
cat "$OUTPUT/side-menu-candidates.tsv"

echo
echo "READ_ONLY_OK=1"
echo "OUTPUT=$OUTPUT"
echo "SUMMARY=$OUTPUT/summary.txt"
echo "LIVE_VS_PLATFORM_DIFF=$OUTPUT/live-vs-platform-branch.diff"
echo "CANDIDATES=$OUTPUT/side-menu-candidates.tsv"
