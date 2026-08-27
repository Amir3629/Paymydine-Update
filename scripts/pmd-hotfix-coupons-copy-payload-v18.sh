#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-coupons-copy-v18-backups/$STAMP"
TMP="$(mktemp -d)"
CANDIDATE="$TMP/index.blade.php"
TARGET="app/admin/views/pmdcoupons/index.blade.php"
MARKER="PMD_COUPON_COPY_PAYLOAD_SCOPE_FIX_V18"
trap 'rm -rf "$TMP"' EXIT

cd "$ROOT"
mkdir -p "$BACKUP"

echo "============================================================"
echo " PMD COUPONS COPY PAYLOAD SCOPE HOTFIX V18"
echo "============================================================"
echo "ROOT=$ROOT"
echo "BACKUP=$BACKUP"

[ -f "$TARGET" ] || { echo "ERROR=Missing target: $TARGET" >&2; exit 100; }
cp "$TARGET" "$BACKUP/index.blade.php.before"
cp "$TARGET" "$CANDIDATE"

echo "[1/5] Building guarded live-derived candidate..."
python3 - "$CANDIDATE" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding='utf-8')
marker = 'PMD_COUPON_COPY_PAYLOAD_SCOPE_FIX_V18'

if marker in text:
    raise SystemExit('ERROR=V18 marker already present')

anchor = "    $pmdT = static fn(string $key) => $pmdCouponCopy[$pmdCouponLocale][$key] ?? $pmdCouponCopy['en'][$key] ?? $key;\n"
if text.count(anchor) != 1:
    raise SystemExit(f'ERROR=V18 pmdT anchor mismatch: {text.count(anchor)}')

injection = anchor + """    // PMD_COUPON_COPY_PAYLOAD_SCOPE_FIX_V18
    // Precompute the JS copy while the local bilingual catalogue is definitely in scope.
    $pmdCouponClientCopyJson = json_encode(
        $pmdCouponCopy[$pmdCouponLocale] ?? $pmdCouponCopy['en'] ?? [],
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );
"""
text = text.replace(anchor, injection, 1)

old = '<script type="application/json" id="pmd-coupon-manager-copy">{!! json_encode($pmdCouponCopy[$pmdCouponLocale], JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE) !!}</script>'
new = '<script type="application/json" id="pmd-coupon-manager-copy">{!! $pmdCouponClientCopyJson ?: \'{}\' !!}</script>'
if text.count(old) != 1:
    raise SystemExit(f'ERROR=V18 direct JSON payload anchor mismatch: {text.count(old)}')
text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
print('V18_PRECOMPUTED_COPY_CANDIDATE=1')
print('V18_DIRECT_COPY_ACCESS_REMOVED=1')
PY

grep -Fq "$MARKER" "$CANDIDATE"
grep -Fq '$pmdCouponClientCopyJson = json_encode(' "$CANDIDATE"
grep -Fq 'id="pmd-coupon-manager-copy">{!! $pmdCouponClientCopyJson' "$CANDIDATE"
if grep -Fq 'id="pmd-coupon-manager-copy">{!! json_encode($pmdCouponCopy[$pmdCouponLocale]' "$CANDIDATE"; then
  echo "ERROR=Direct late pmdCouponCopy access still exists in candidate" >&2
  exit 110
fi
grep -Fq 'id="pmd-coupon-manager-catalog">{!! json_encode($catalog' "$CANDIDATE"
echo "COUPONS_V18_CANDIDATE_OK=1"

echo "[2/5] Verifying live target did not change during candidate build..."
cmp -s "$TARGET" "$BACKUP/index.blade.php.before" || {
  echo "ERROR=LIVE_COUPONS_VIEW_CHANGED_DURING_V18_BUILD" >&2
  echo "NOTE=No V18 write was performed." >&2
  exit 120
}
echo "COUPONS_V18_CONCURRENCY_GUARD_OK=1"
echo "ALL_V18_GUARDS_OK=1"

echo "[3/5] Installing validated view-only candidate..."
sudo tee "$TARGET" < "$CANDIDATE" >/dev/null

php artisan view:clear >/dev/null 2>&1 || true
FPM_SERVICES="$(systemctl list-units --type=service --state=running --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1}')"
for svc in $FPM_SERVICES; do
  echo "RELOADING_FPM=$svc"
  sudo systemctl reload "$svc"
done

echo "[4/5] Verifying installed source contract..."
grep -Fq "$MARKER" "$TARGET"
grep -Fq '$pmdCouponClientCopyJson = json_encode(' "$TARGET"
grep -Fq 'id="pmd-coupon-manager-copy">{!! $pmdCouponClientCopyJson' "$TARGET"
if grep -Fq 'id="pmd-coupon-manager-copy">{!! json_encode($pmdCouponCopy[$pmdCouponLocale]' "$TARGET"; then
  echo "ERROR=Direct late pmdCouponCopy access remains live" >&2
  exit 130
fi
echo "COUPONS_COPY_SCOPE_FIX_INSTALLED=1"

echo "[5/5] V18 complete."
echo "============================================================"
echo " PMD COUPONS COPY PAYLOAD SCOPE HOTFIX V18 COMPLETE"
echo "============================================================"
echo "COUPONS_500_SCOPE_HOTFIX_V18_OK=1"
echo "BACKUP=$BACKUP"
echo "NOTE=Only the Coupons view copy-payload scope was changed. Coupon data, save/delete behavior, permissions, Settings V17, and payment logic were not modified."
