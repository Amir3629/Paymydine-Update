#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-dashboard-detail-icon-v15-backups/$STAMP"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

TARGETS=(
  "app/admin/views/_partials/pmd_dashboard_lab_analytics_v1.blade.php"
  "app/admin/views/_partials/pmd_role_dashboard_v1.blade.php"
  "app/admin/views/_partials/pmd_manager_dashboard_v1.blade.php"
)

cd "$ROOT"
mkdir -p "$BACKUP" "$TMP/candidate"

echo "============================================================"
echo " PMD DASHBOARD DETAIL ICON V15"
echo "============================================================"
echo "ROOT=$ROOT"
echo "BACKUP=$BACKUP"

for path in "${TARGETS[@]}"; do
  [ -f "$path" ] || { echo "ERROR=Missing $path" >&2; exit 100; }
  mkdir -p "$TMP/candidate/$(dirname "$path")"
  cp -a "$path" "$TMP/candidate/$path"
  cp -a "$path" "$BACKUP/$(basename "$path").before"
done
sha256sum "${TARGETS[@]}" > "$BACKUP/hashes.before"

echo "[1/4] Building guarded live-derived candidates..."
python3 - "$TMP/candidate" "${TARGETS[@]}" <<'PY'
from pathlib import Path
import sys

root = Path(sys.argv[1])
paths = [root / p for p in sys.argv[2:]]
old = '<span class="pmd-dashboard-lab-toolbar-icon" aria-hidden="true">&#8599;</span>'
new = (
    '<svg class="pmd-dashboard-lab-toolbar-detail-icon-v15" '
    'viewBox="0 0 24 24" aria-hidden="true" focusable="false" '
    'fill="none" stroke="currentColor" stroke-width="1.45" '
    'stroke-linecap="round" stroke-linejoin="round" '
    'style="display:block!important;width:16px!important;min-width:16px!important;max-width:16px!important;'
    'height:16px!important;min-height:16px!important;max-height:16px!important;flex:0 0 16px!important;'
    'margin:0!important;padding:0!important;">'
    '<path d="M9 4H4v5"></path>'
    '<path d="M15 4h5v5"></path>'
    '<path d="M20 15v5h-5"></path>'
    '<path d="M9 20H4v-5"></path>'
    '</svg>'
)

total = 0
for path in paths:
    text = path.read_text(encoding='utf-8')
    if 'pmd-dashboard-lab-toolbar-detail-icon-v15' in text:
        raise SystemExit(f'ERROR=V15 marker already present in {path}; refusing ambiguous re-run')
    count = text.count(old)
    if count < 1:
        raise SystemExit(f'ERROR=Expected dashboard arrow icon not found in {path}')
    text = text.replace(old, new)
    if old in text:
        raise SystemExit(f'ERROR=Old arrow span survived candidate replacement in {path}')
    if text.count(new) != count:
        raise SystemExit(f'ERROR=SVG replacement count mismatch in {path}')
    path.write_text(text, encoding='utf-8')
    total += count
    print(f'CANDIDATE_REPLACED={path}:{count}')

if total < 3:
    raise SystemExit('ERROR=Unexpectedly low total dashboard icon count')
print(f'DASHBOARD_DETAIL_ICONS_TOTAL={total}')
print('DASHBOARD_ICON_CANDIDATES_OK=1')
PY

echo "[2/4] Final validation before ANY write..."
for path in "${TARGETS[@]}"; do
  candidate="$TMP/candidate/$path"
  grep -Fq 'pmd-dashboard-lab-toolbar-detail-icon-v15' "$candidate"
  if grep -Fq '<span class="pmd-dashboard-lab-toolbar-icon" aria-hidden="true">&#8599;</span>' "$candidate"; then
    echo "ERROR=Old dashboard arrow span remains in candidate $path" >&2
    exit 110
  fi
  grep -Fq 'viewBox="0 0 24 24"' "$candidate"
  grep -Fq 'stroke-width="1.45"' "$candidate"
  grep -Fq 'width:16px!important' "$candidate"
  grep -Fq '<path d="M9 4H4v5"></path>' "$candidate"
  grep -Fq '<path d="M15 4h5v5"></path>' "$candidate"
  grep -Fq '<path d="M20 15v5h-5"></path>' "$candidate"
  grep -Fq '<path d="M9 20H4v-5"></path>' "$candidate"
done
echo "ALL_V15_GUARDS_OK=1"

echo "[3/4] Installing validated view-only candidates..."
for path in "${TARGETS[@]}"; do
  sudo tee "$path" < "$TMP/candidate/$path" >/dev/null
done

php artisan view:clear >/dev/null 2>&1 || true

FPM_SERVICES="$(systemctl list-units --type=service --state=running --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1}')"
for svc in $FPM_SERVICES; do
  echo "RELOADING_FPM=$svc"
  sudo systemctl reload "$svc"
done

echo "[4/4] Verifying installed dashboard icon contract..."
TOTAL_NEW=0
for path in "${TARGETS[@]}"; do
  if grep -Fq '<span class="pmd-dashboard-lab-toolbar-icon" aria-hidden="true">&#8599;</span>' "$path"; then
    echo "ERROR=Old dashboard arrow span remains live in $path" >&2
    exit 120
  fi
  COUNT_NEW="$(grep -o 'pmd-dashboard-lab-toolbar-detail-icon-v15' "$path" | wc -l | tr -d ' ')"
  [ "$COUNT_NEW" -ge 1 ] || { echo "ERROR=New SVG icon missing live in $path" >&2; exit 121; }
  TOTAL_NEW=$((TOTAL_NEW + COUNT_NEW))
  echo "LIVE_SVG_COUNT=$path:$COUNT_NEW"
done

OLD_SPAN_HITS="$(grep -RFl --include='*.blade.php' '<span class="pmd-dashboard-lab-toolbar-icon" aria-hidden="true">&#8599;</span>' app/admin/views/_partials 2>/dev/null || true)"
if [ -n "$OLD_SPAN_HITS" ]; then
  echo "ERROR=Old dashboard arrow span still exists in dashboard partials:" >&2
  printf '%s\n' "$OLD_SPAN_HITS" >&2
  exit 122
fi

echo "LIVE_DASHBOARD_DETAIL_SVGS_TOTAL=$TOTAL_NEW"
echo "OLD_DASHBOARD_ARROW_SPANS_REMAINING=0"
echo "DASHBOARD_LINK_BEHAVIOR_UNCHANGED=1"
echo "DASHBOARD_DETAIL_ICON_V15_OK=1"
echo "BACKUP=$BACKUP"
echo "NOTE=Only the inner visual icon was replaced. Dashboard links, hrefs, aria-labels, card data, analytics logic, and navigation behavior were not modified."
