#!/usr/bin/env bash
# PMD_DASHBOARD_SWITCHER_FIRSTPAINT_R34_SAFE_DEPLOY
# Keeps the VPS's locally applied R19-R33 patches. Never pull/merge/reset
# live code or edit backend routes, Floor state, POS/KDS, purchases or DB.
set -Eeuo pipefail
if [ "$#" -ne 1 ] || [ "$1" != "--apply" ]; then
  echo "Usage: bash scripts/pmd-dashboard-switcher-firstpaint-r34-deploy.sh --apply" >&2
  exit 2
fi
cd /var/www/paymydine || exit 1
revision="$(git rev-parse --verify 'FETCH_HEAD^{commit}')"
layout=app/admin/views/_layouts/default.blade.php
css=app/admin/assets/css/pmd-dashboard-switcher-firstpaint-r34.css
tests=scripts/test-pmd-dashboard-switcher-firstpaint-r34.cjs
fixtures=(
  app/admin/assets/css/pmd-dashboard-lab-analytics-v1.css
  app/admin/assets/css/pmd-admin-control-language-r29.css
  app/admin/assets/js/pmd-admin-control-language-r29.js
  app/admin/views/_partials/pmd_dashboard_lab_analytics_v1.blade.php
  app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php
  app/admin/assets/css/pmd-dashboard-lab-exact-floor-v1.css
)
test -s "$layout" || { echo "STOP: real AdminController layout unavailable" >&2; exit 1; }
for f in "${fixtures[@]}"; do
  test -s "$f" || { echo "STOP: missing current VPS prerequisite: $f" >&2; exit 1; }
done
for marker in 'PMD_ADMIN_CONTROL_LANGUAGE_R30_REAL_LAYOUT' \
              'PMD_PLATFORM_UI_REPORT_R33_ASSET' \
              'PMD_INVENTORY_BARCODE_FLOOR_R31_ASSETS'; do
  grep -Fq "$marker" "$layout" || {
    echo "STOP: $marker not found in current real layout" >&2
    exit 1
  }
done
if grep -Fq 'PMD_DASHBOARD_SWITCHER_FIRSTPAINT_R34_ASSET' "$layout"; then
  if [ -s "$css" ] && [ -s "$tests" ]; then
    echo "ALREADY INSTALLED: R34 dashboard segmented controls."
    exit 0
  fi
  echo "STOP: partial R34 installation; inspect before retrying" >&2
  exit 1
fi
for f in "$css" "$tests"; do
  if [ -e "$f" ]; then
    echo "STOP: refusing to overwrite preexisting $f" >&2
    exit 1
  fi
done

backup="$HOME/pmd-backups/dashboard-switcher-firstpaint-r34-$(date +%Y%m%d-%H%M%S)"
stage="$backup/staged"
mkdir -p "$backup/original/$(dirname "$layout")" "$stage/$(dirname "$layout")"
cp -p "$layout" "$backup/original/$layout"
cp -p "$layout" "$stage/$layout"
layout_sha="$(sha256sum "$layout" | awk '{print $1}')"
for f in "${fixtures[@]}"; do
  mkdir -p "$stage/$(dirname "$f")"
  cp -p "$f" "$stage/$f"
done
for f in "$css" "$tests"; do
  mkdir -p "$stage/$(dirname "$f")"
  git show "$revision:$f" > "$stage/$f"
  test -s "$stage/$f"
done

python3 - "$stage/$layout" <<'PY'
from pathlib import Path
import sys
file=Path(sys.argv[1])
source=file.read_text(encoding='utf-8')
anchor='<!-- /PMD_PLATFORM_UI_REPORT_R33_ASSET -->'
if source.count(anchor)!=1 or source.count('</head>')!=1:
    raise SystemExit('STOP: R33 anchor/head not unique; nothing changed on VPS.')
if source.index(anchor) > source.index('</head>'):
    raise SystemExit('STOP: R33 block is outside the real Admin <head>.')
if 'PMD_DASHBOARD_SWITCHER_FIRSTPAINT_R34_ASSET' in source:
    raise SystemExit('STOP: R34 already present in staged layout.')
block="""<!-- PMD_DASHBOARD_SWITCHER_FIRSTPAINT_R34_ASSET: blocking CSS before any Dashboard paint -->
<link rel="stylesheet"
      href="{{ asset('app/admin/assets/css/pmd-dashboard-switcher-firstpaint-r34.css') }}?v={{ (int)(@filemtime(base_path('app/admin/assets/css/pmd-dashboard-switcher-firstpaint-r34.css')) ?: 20261026) }}"
      data-pmd-dashboard-switcher-firstpaint-r34="css">
<!-- /PMD_DASHBOARD_SWITCHER_FIRSTPAINT_R34_ASSET -->"""
file.write_text(source.replace(anchor,anchor+'\n'+block,1),encoding='utf-8')
PY

node --check "$stage/$tests"
PMD_R34_TEST_ROOT="$stage" node "$stage/$tests"
echo "PREFLIGHT PASS: R34 chart-selected state, 28px segmented controls, stable Floor and no global edits."
test "$(sha256sum "$layout" | awk '{print $1}')" = "$layout_sha" || {
  echo "STOP: live layout changed during R34 staging" >&2
  exit 1
}

applied=0
rollback() {
  status=$?
  if [ "$status" -ne 0 ] && [ "$applied" -eq 1 ]; then
    echo "ERROR: restoring original real Admin layout. Backup: $backup" >&2
    cp -p "$backup/original/$layout" "$layout" || true
    rm -f "$css" "$tests"
    php artisan view:clear || true
  fi
}
trap rollback EXIT
applied=1
install -m 644 "$stage/$css" "$css"
install -m 644 "$stage/$tests" "$tests"
cp -p "$stage/$layout" "$layout"
PMD_R34_TEST_ROOT="$PWD" node "$tests"
php artisan view:clear
applied=0
echo "SUCCESS: R34 Dashboard L/B/D/W/M switcher frames and floor first-paint visual stabilized."
echo "Backup: $backup"
echo "Dashboard: /admin/ownerdashboard"
echo "Check link[data-pmd-dashboard-switcher-firstpaint-r34=css] in browser."
git status --short -- "$layout" "$css" "$tests"
