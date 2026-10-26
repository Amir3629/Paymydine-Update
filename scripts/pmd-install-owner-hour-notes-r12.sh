#!/usr/bin/env bash
# R12 Owner Calendar: tenant setup guidance, bounded polling, remove empty-slot dots.
# Derived from installed PR551 R11; DOES NOT change database schemas.
set -Eeuo pipefail
cd /var/www/paymydine
BASE=4d7c245daef99e74da78e1b12560250db028e228
BRANCH=codex/owner-hour-notes-r12-tenant-ux-rate-limit-20261026
FILES=(
  app/Services/PmdOwnerStaffHourNotesR11.php
  app/Http/Controllers/PmdOwnerStaffHourNotesR11Controller.php
  app/admin/assets/js/pmd-owner-hour-team-notes-r11.js
  app/admin/assets/css/pmd-owner-hour-team-notes-r11.css
  app/admin/views/dashboardlab/index.blade.php
)
echo "== FETCH R12 =="
git -c gc.auto=0 -c maintenance.auto=false fetch --no-tags origin "refs/heads/${BRANCH}"
HEAD_SHA="$(git rev-parse FETCH_HEAD)"
git cat-file -e "${BASE}^{commit}"
STAGE="$(mktemp -d -t pmd-r12-stage-XXXXXXXX)"
BACKUP="$HOME/pmd-owner-hour-r12-backup-$(date +%Y%m%d_%H%M%S)-$$"
mkdir -p "$BACKUP/originals"
trap 'rm -rf "$STAGE"' EXIT
echo "== PREFLIGHT: PRESERVE VPS CHANGES =="
CHANGED=()
for f in "${FILES[@]}"; do
  test -f "$f" && test ! -L "$f" || { echo "STOP missing/unsafe $f"; exit 2; }
  mkdir -p "$STAGE/$(dirname "$f")"
  git show "${BASE}:$f" > "$STAGE/base"
  git show "${HEAD_SHA}:$f" > "$STAGE/new"
  if cmp -s "$f" "$STAGE/new"; then
    echo "ALREADY CURRENT: $f"
    continue
  elif cmp -s "$f" "$STAGE/base"; then
    cp "$STAGE/new" "$STAGE/$f"
  else
    if ! git merge-file -p "$f" "$STAGE/base" "$STAGE/new" > "$STAGE/$f"; then
      echo "STOP: manual merge required; no live files modified: $f"
      exit 3
    fi
  fi
  CHANGED+=("$f")
done
echo "== CHECK SYNTAX =="
for f in "${CHANGED[@]}"; do
 case "$f" in
   *.php) php -l "$STAGE/$f" ;;
   *.js) node --check "$STAGE/$f" ;;
 esac
done
grep -q 'R12: Owner Calendar empty rows' "$STAGE/app/admin/assets/css/pmd-owner-hour-team-notes-r11.css" 2>/dev/null || grep -q 'R12: Owner Calendar empty rows' app/admin/assets/css/pmd-owner-hour-team-notes-r11.css
if [ "${#CHANGED[@]}" -eq 0 ]; then
  echo "ALREADY INSTALLED; nothing to do."
  exit 0
fi
printf '%s\n' "${CHANGED[@]}" > "$BACKUP/files"
printf '%s\n' "$PWD" > "$BACKUP/root"
for f in "${CHANGED[@]}"; do
 mkdir -p "$BACKUP/originals/$(dirname "$f")"
 cp -p "$f" "$BACKUP/originals/$f"
done
cat > "$BACKUP/rollback.sh" <<'ROLLBACK'
#!/usr/bin/env bash
set -Eeuo pipefail
B="$(cd "$(dirname "$0")" && pwd -P)"
ROOT="$(cat "$B/root")"
while IFS= read -r f; do
 test -z "$f" || cp -p "$B/originals/$f" "$ROOT/$f"
done < "$B/files"
cd "$ROOT"
php artisan view:clear
echo "R12 rollback complete."
ROLLBACK
chmod 700 "$BACKUP/rollback.sh"
echo "== INSTALL ${#CHANGED[@]} FILES =="
for f in "${CHANGED[@]}"; do cp -p "$STAGE/$f" "$f"; done
php artisan view:clear
echo "SUCCESS: R12 installed."
echo "BACKUP: $BACKUP"
echo "ROLLBACK: bash $BACKUP/rollback.sh"
echo "NEXT: hard-refresh Owner Calendar and verify a new tenant and an existing tenant."
