#!/usr/bin/env bash
# PMD R42: restore native Floor colors/corners, smooth table flights,
# compact Staff Note and Notifications, frameless long Range rails.
# Target: dirty VPS with successful R41 install; no checkout/reset/pull.
set -euo pipefail
[[ "${1:-}" == "--apply" ]] || {
  echo "Usage: pmd-floor-note-range-r42-deploy.sh --apply"
  exit 2
}
cd /var/www/paymydine || exit 1

BASE=d73287ea19fad6dd6ea8c9cadc3c77334db6d481
REF=FETCH_HEAD
stamp="$(date +%Y%m%d-%H%M%S)"
backup="$HOME/pmd-backups/platform-r42-$stamp"
stage="$(mktemp -d)"
installed=0

changed=(
  app/admin/assets/css/pmd-notification-floor-range-r41.css
  app/admin/assets/js/fix-history-button-centering.js
  app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js
  app/admin/widgets/menu/top_menu.blade.php
)
new_assets=(
  app/admin/assets/css/pmd-floor-note-range-r42.css
  app/admin/assets/js/pmd-floor-note-range-r42-audit.js
)
layout=app/admin/views/_layouts/default.blade.php
read_only=(
  app/admin/assets/css/pmd-floor-v1-native-smart-v20.css
  app/admin/views/_partials/pmd_dashboard_lab_analytics_v1.blade.php
  app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js
)
test_file=scripts/test-pmd-floor-note-range-r42.cjs

cleanup_and_rollback() {
  local code=$?
  trap - EXIT
  if [[ "$code" -ne 0 && "$installed" == 1 ]]; then
    echo "ERROR: R42 installation failed; restoring changed files from $backup"
    for file in "${changed[@]}" "$layout"; do
      [[ ! -f "$backup/$file" ]] || cp -p "$backup/$file" "$file"
    done
    for file in "${new_assets[@]}"; do
      if [[ -f "$backup/$file" ]]; then
        cp -p "$backup/$file" "$file"
      else
        rm -f "$file"
      fi
    done
    php artisan view:clear || true
  fi
  rm -rf "$stage"
  exit "$code"
}
trap cleanup_and_rollback EXIT

git cat-file -e "$BASE^{commit}"
git cat-file -e "$REF^{commit}"
for file in "${changed[@]}" "$layout" "${read_only[@]}"; do
  [[ -f "$file" ]] || {
    echo "STOP: expected live R41 prerequisite missing: $file"
    exit 1
  }
  mkdir -p "$stage/root/$(dirname "$file")"
  cp -p "$file" "$stage/root/$file"
done

grep -q 'PMD_NOTIFICATION_FLOOR_RANGE_R41_REAL_HEAD' "$layout" || {
  echo "STOP: R41 not detected in the current real Admin head."
  exit 1
}
grep -q 'PMD_USER_FLOOR_FLIP_R41' app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js || {
  echo "STOP: expected installed R41 floor animation is absent."
  exit 1
}
grep -q 'class="btn-close pmd-note-close-r41"' app/admin/widgets/menu/top_menu.blade.php || {
  echo "STOP: expected R41 Staff Note close button not found."
  exit 1
}
if grep -q 'PMD_FLOOR_NOTE_RANGE_R42_REAL_HEAD' "$layout"; then
  echo "STOP: R42 already present in real Admin head; refusing duplicate install."
  exit 1
fi

# Apply only the four R41->R42 changed files to a copy of the CURRENT VPS
# files. Any mismatch is a fail-closed preflight; never overwrite by checkout.
git diff --binary "$BASE" "$REF" -- "${changed[@]}" > "$stage/r42.patch"
test -s "$stage/r42.patch"
(
  cd "$stage/root"
  git apply --check "$stage/r42.patch"
  git apply "$stage/r42.patch"
)
for file in "${new_assets[@]}"; do
  mkdir -p "$stage/root/$(dirname "$file")"
  git show "$REF:$file" > "$stage/root/$file"
  test -s "$stage/root/$file"
done

# Add only the R42 linked assets. All existing R29-R41 local head changes
# remain in place; never replace the dirty default.blade.php from GitHub.
python3 - "$stage/root/$layout" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1])
text=p.read_text()
anchor='<!-- /PMD_NOTIFICATION_FLOOR_RANGE_R41_REAL_HEAD -->'
if text.count(anchor)!=1 or 'PMD_FLOOR_NOTE_RANGE_R42_REAL_HEAD' in text:
    raise SystemExit('STOP: ambiguous R41 head marker or duplicate R42.')
if text.count('</head>')!=1:
    raise SystemExit('STOP: ambiguous Admin head in live layout.')
block="""<!-- PMD_FLOOR_NOTE_RANGE_R42_REAL_HEAD -->
<link rel="stylesheet" href="{{ asset('app/admin/assets/css/pmd-floor-note-range-r42.css') }}?v={{ (int)(@filemtime(base_path('app/admin/assets/css/pmd-floor-note-range-r42.css')) ?: 20261026) }}" data-pmd-ui-r42="css">
<script defer src="{{ asset('app/admin/assets/js/pmd-floor-note-range-r42-audit.js') }}?v={{ (int)(@filemtime(base_path('app/admin/assets/js/pmd-floor-note-range-r42-audit.js')) ?: 20261026) }}" data-pmd-ui-r42="audit"></script>
<!-- /PMD_FLOOR_NOTE_RANGE_R42_REAL_HEAD -->"""
p.write_text(text.replace(anchor,anchor+'\n'+block,1))
PY

mkdir -p "$stage/root/scripts"
git show "$REF:$test_file" > "$stage/root/$test_file"
for file in \
  app/admin/assets/js/fix-history-button-centering.js \
  app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js \
  app/admin/assets/js/pmd-floor-note-range-r42-audit.js; do
  node --check "$stage/root/$file"
done
node --check "$stage/root/$test_file"
node "$stage/root/$test_file" "$stage/root"
echo "PREFLIGHT PASS: R42 fully staged on CURRENT dirty VPS; no live files changed yet."

mkdir -p "$backup"
for file in "${changed[@]}" "$layout"; do
  mkdir -p "$backup/$(dirname "$file")"
  cp -p "$file" "$backup/$file"
done
for file in "${new_assets[@]}"; do
  if [[ -f "$file" ]]; then
    mkdir -p "$backup/$(dirname "$file")"
    cp -p "$file" "$backup/$file"
  fi
done

installed=1
for file in "${changed[@]}" "$layout" "${new_assets[@]}"; do
  mkdir -p "$(dirname "$file")"
  cp -p "$stage/root/$file" "$file"
done

# Cache-bust all changed styles/scripts including an existing untracked R41 CSS.
for file in "${changed[@]}" "${new_assets[@]}"; do
  touch "$file"
done
php artisan view:clear
installed=0

echo "SUCCESS: R42 native Floor color, visual table movement, Staff Note and frameless sales ranges installed."
echo "Backup: $backup"
echo "Browser: window.PMDFloorNoteRangeR42.audit()"
echo "Safari refresh: Cmd + Shift + R"
git status --short
