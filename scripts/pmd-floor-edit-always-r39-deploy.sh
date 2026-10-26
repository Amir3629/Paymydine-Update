#!/usr/bin/env bash
# PMD R39: authorized Edit floor for new tenants / default Floor, matched toolbar geometry.
# Patch ONLY the current dirty VPS files; never reset/checkout/pull/merge/migrate.
set -euo pipefail
[[ "${1:-}" == "--apply" ]] || { echo "Usage: bash pmd-floor-edit-always-r39-deploy.sh --apply"; exit 2; }
cd /var/www/paymydine || exit 1
BASE=a49b9145a1993cd26ddf4dd81d9b45501560c61b
REF=FETCH_HEAD
stamp="$(date +%Y%m%d-%H%M%S)"
backup="$HOME/pmd-backups/dashboard-r39-$stamp"
stage="$(mktemp -d)"
installed=0

changed=(
  app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php
  app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js
)
assets=(
  app/admin/assets/css/pmd-floor-manage-size-parity-r39.css
  app/admin/assets/js/pmd-floor-manage-audit-r39.js
)
layout=app/admin/views/_layouts/default.blade.php

cleanup() {
  local result=$?
  trap - EXIT
  if [[ "$result" -ne 0 && "$installed" == 1 ]]; then
    echo "R39 INSTALL ERROR: reverting only files changed by R39."
    for path in "${changed[@]}" "$layout"; do
      [[ ! -f "$backup/$path" ]] || cp -p "$backup/$path" "$path"
    done
    for path in "${assets[@]}"; do
      if [[ -f "$backup/$path" ]]; then
        cp -p "$backup/$path" "$path"
      else
        rm -f "$path"
      fi
    done
    php artisan view:clear || true
  fi
  rm -rf "$stage"
  exit "$result"
}
trap cleanup EXIT

git cat-file -e "$BASE^{commit}"
git cat-file -e "$REF^{commit}"
[[ -f app/admin/assets/css/pmd-owner-floor-stability-r38.css ]] || { echo "R38 CSS prerequisite not installed."; exit 1; }
grep -q 'PMD_OWNER_FLOOR_STABILITY_R38_REAL_HEAD' "$layout" || { echo "R38 head prerequisite missing."; exit 1; }

mkdir -p "$stage/root"
for path in "${changed[@]}" "$layout"; do
  [[ -f "$path" ]] || { echo "Missing live source: $path"; exit 1; }
  mkdir -p "$stage/root/$(dirname "$path")"
  cp -p "$path" "$stage/root/$path"
done

git diff --binary "$BASE" "$REF" -- "${changed[@]}" > "$stage/r39.patch"
test -s "$stage/r39.patch"
(
  cd "$stage/root"
  git apply --check "$stage/r39.patch"
  git apply "$stage/r39.patch"
)

for path in "${assets[@]}"; do
  mkdir -p "$stage/root/$(dirname "$path")"
  git show "$REF:$path" > "$stage/root/$path"
  test -s "$stage/root/$path"
done

# The live Admin layout includes numerous earlier R29-R38 custom additions.
# Insert one new head block without overwriting any existing content.
python3 - "$stage/root/$layout" <<'PY'
from pathlib import Path
import sys
path=Path(sys.argv[1])
s=path.read_text()
anchor="<!-- /PMD_OWNER_FLOOR_STABILITY_R38_REAL_HEAD -->"
if s.count(anchor)!=1 or "PMD_FLOOR_EDIT_ALWAYS_R39_REAL_HEAD" in s:
    raise SystemExit("STOP: R38 Admin marker missing/duplicated or R39 already installed.")
if s.count("</head>")!=1:
    raise SystemExit("STOP: ambiguous live Admin head.")
snippet="""<!-- PMD_FLOOR_EDIT_ALWAYS_R39_REAL_HEAD -->
@if(request()->is('admin/ownerdashboard*') || request()->is('admin/dashboardlab*')
    || request()->is('admin/managerdashboard*') || request()->is('admin/managerlab*'))
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-floor-manage-size-parity-r39.css') }}?v={{ (int)(@filemtime(base_path('app/admin/assets/css/pmd-floor-manage-size-parity-r39.css')) ?: 20261026) }}" data-pmd-floor-r39="css">
<script defer src="{{ asset('app/admin/assets/js/pmd-floor-manage-audit-r39.js') }}?v={{ (int)(@filemtime(base_path('app/admin/assets/js/pmd-floor-manage-audit-r39.js')) ?: 20261026) }}" data-pmd-floor-r39="js"></script>
@endif
<!-- /PMD_FLOOR_EDIT_ALWAYS_R39_REAL_HEAD -->"""
path.write_text(s.replace(anchor,anchor+"\n"+snippet,1))
PY

# The registry and controller are READ ONLY dependencies for regression tests.
for path in \
  app/admin/Services/PmdSharedFloorRegistryV1.php \
  app/admin/classes/PmdCleanWorkspaceControllerV1.php; do
  [[ -f "$path" ]] || { echo "Missing backend prerequisite: $path"; exit 1; }
  mkdir -p "$stage/root/$(dirname "$path")"
  cp -p "$path" "$stage/root/$path"
done
mkdir -p "$stage/root/scripts"
git show "$REF:scripts/test-pmd-edit-floor-r39.cjs" > "$stage/root/scripts/test-pmd-edit-floor-r39.cjs"

node --check "$stage/root/app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js"
node --check "$stage/root/app/admin/assets/js/pmd-floor-manage-audit-r39.js"
node "$stage/root/scripts/test-pmd-edit-floor-r39.cjs" "$stage/root"

echo "PREFLIGHT PASS: R39 staged on current VPS source and regression tests passed."
mkdir -p "$backup"
for path in "${changed[@]}" "$layout"; do
  mkdir -p "$backup/$(dirname "$path")"
  cp -p "$path" "$backup/$path"
done
for path in "${assets[@]}"; do
  if [[ -f "$path" ]]; then
    mkdir -p "$backup/$(dirname "$path")"
    cp -p "$path" "$backup/$path"
  fi
done

installed=1
for path in "${changed[@]}" "$layout" "${assets[@]}"; do
  mkdir -p "$(dirname "$path")"
  cp -p "$stage/root/$path" "$path"
done
php artisan view:clear
installed=0

echo "SUCCESS: R39 Edit floor now visible for authorized Owner/Manager on one and multiple Floors."
echo "Backup: $backup"
echo "Verification: window.PMDEditFloorR39.audit()"
git status --short
