#!/usr/bin/env bash
# PMD_OWNER_HOUR_NOTES_R14_INCREMENTAL_SAFE_INSTALLER
# R13 was deployed successfully; R14 changes ONLY UI files and adds no schema.
set -Eeuo pipefail
cd /var/www/paymydine

BASE=5d8689927c23585f8374d99a501435d9cff3a828
BRANCH=codex/owner-hour-notes-r14-modal-interaction-notification-ux-20261026
FILES=(
  app/admin/assets/js/pmd-owner-hour-team-notes-r11.js
  app/admin/assets/css/pmd-owner-hour-team-notes-r11.css
  app/admin/views/dashboardlab/index.blade.php
  app/admin/widgets/menu/top_menu.blade.php
  app/admin/assets/css/pmd-general-note-notification-r14.css
  app/admin/assets/js/pmd-general-note-notification-r14.js
  scripts/test-pmd-owner-hour-notes-r14.cjs
)

echo "== FETCH R14; NO RESET, NO REBASE =="
git -c gc.auto=0 -c maintenance.auto=false fetch --no-tags origin "refs/heads/${BRANCH}"
HEAD_SHA="$(git rev-parse FETCH_HEAD)"
git cat-file -e "${BASE}^{commit}" || { echo 'STOP: R13 base commit not in local Git objects'; exit 2; }
STAGE="$(mktemp -d -t pmd-r14-stage-XXXXXXXX)"
BACKUP="$HOME/pmd-owner-hour-r14-backup-$(date +%Y%m%d_%H%M%S)-$$"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$BACKUP/originals"
: > "$BACKUP/files"
CHANGED=()

echo "== PREFLIGHT: preserve all local VPS changes =="
for f in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$f")"
  git show "${HEAD_SHA}:$f" > "$STAGE/new"
  if [ -L "$f" ]; then echo "STOP: unsafe symlink: $f"; exit 3; fi

  if git cat-file -e "${BASE}:$f" 2>/dev/null; then
    test -f "$f" || { echo "STOP: existing R13 source missing: $f"; exit 3; }
    git show "${BASE}:$f" > "$STAGE/base"
    if cmp -s "$f" "$STAGE/new"; then
      echo "ALREADY CURRENT: $f"
      continue
    fi
    if cmp -s "$f" "$STAGE/base"; then
      cp "$STAGE/new" "$STAGE/$f"
    elif ! git merge-file -p "$f" "$STAGE/base" "$STAGE/new" > "$STAGE/$f"; then
      echo "STOP: local VPS customization needs a manual merge: $f"
      echo "No live application file was changed."
      exit 3
    fi
    printf 'E\t%s\n' "$f" >> "$BACKUP/files"
  else
    if [ -e "$f" ]; then
      if cmp -s "$f" "$STAGE/new"; then
        echo "ALREADY CURRENT: $f"
        continue
      fi
      echo "STOP: R14's new file already has different local content: $f"
      exit 3
    fi
    cp "$STAGE/new" "$STAGE/$f"
    printf 'N\t%s\n' "$f" >> "$BACKUP/files"
  fi
  CHANGED+=("$f")
done

echo "== PREFLIGHT: syntax + exact UI targets =="
for f in "${FILES[@]}"; do
  target="$STAGE/$f"
  if [ ! -f "$target" ]; then target="$f"; fi
  case "$f" in
    *.js|*.cjs) node --check "$target" ;;
    *.php) php -l "$target" ;;
  esac
done
grep -q 'var slotNote = !!(slot' "$STAGE/app/admin/assets/js/pmd-owner-hour-team-notes-r11.js" 2>/dev/null ||
  grep -q 'var slotNote = !!(slot' app/admin/assets/js/pmd-owner-hour-team-notes-r11.js
grep -q 'pmd-general-note-notification-r14.css' "$STAGE/app/admin/widgets/menu/top_menu.blade.php" 2>/dev/null ||
  grep -q 'pmd-general-note-notification-r14.css' app/admin/widgets/menu/top_menu.blade.php

if [ "${#CHANGED[@]}" -eq 0 ]; then
  echo 'ALREADY INSTALLED: R14 has no further file changes.'
  node scripts/test-pmd-owner-hour-notes-r14.cjs
  exit 0
fi

printf '%s\n' "$PWD" > "$BACKUP/root"
while IFS="$(printf '\t')" read -r kind f; do
  if [ "$kind" = E ]; then
    mkdir -p "$BACKUP/originals/$(dirname "$f")"
    cp -p "$f" "$BACKUP/originals/$f"
  fi
done < "$BACKUP/files"
cat > "$BACKUP/rollback.sh" <<'ROLLBACK'
#!/usr/bin/env bash
set -Eeuo pipefail
B="$(cd "$(dirname "$0")" && pwd -P)"
ROOT="$(cat "$B/root")"
while IFS="$(printf '\t')" read -r kind f; do
  if [ "$kind" = E ]; then cp -p "$B/originals/$f" "$ROOT/$f"
  elif [ "$kind" = N ]; then rm -f -- "$ROOT/$f"
  fi
done < "$B/files"
cd "$ROOT"
php artisan view:clear
echo "R14 files restored; no tenant data was changed."
ROLLBACK
chmod 700 "$BACKUP/rollback.sh"

echo "== INSTALL ${#CHANGED[@]} FILES =="
for f in "${CHANGED[@]}"; do
  mkdir -p "$(dirname "$f")"
  cp -p "$STAGE/$f" "$f"
done

echo "== RUN R14 REGRESSION CONTRACT =="
if ! node scripts/test-pmd-owner-hour-notes-r14.cjs; then
  echo "TEST FAILED: restoring the R13 files from backup."
  bash "$BACKUP/rollback.sh"
  exit 5
fi
php artisan view:clear
echo "SUCCESS: R14 installed. Database, tenant registry and R13 schema unchanged."
echo "BACKUP: $BACKUP"
echo "ROLLBACK: bash $BACKUP/rollback.sh"
echo "NEXT: hard-refresh test5 Owner Calendar; verify green role chips, slot note navigation, blur/scroll lock and notification Note/History UI."
