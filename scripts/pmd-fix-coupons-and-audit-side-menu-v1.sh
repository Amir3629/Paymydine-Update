#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
REF="origin/i18n/platform-catalog-consolidation"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$ROOT"

echo "============================================================"
echo " PMD COUPONS FIX + SIDE MENU AUDIT V1"
echo "============================================================"

git fetch origin i18n/platform-catalog-consolidation

git show "$REF:scripts/pmd-fix-coupons-owner-manager-access-v1.sh" > "$TMP/fix.sh"
git show "$REF:scripts/pmd-audit-live-side-menu-i18n-readonly.sh" > "$TMP/audit.sh"
chmod +x "$TMP/fix.sh" "$TMP/audit.sh"

bash "$TMP/fix.sh"
echo
bash "$TMP/audit.sh"

echo
echo "WRAPPER_OK=1"
echo "NEXT=Test Coupons once as the same PMD Owner/Manager account, then paste this full output."
