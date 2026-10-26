#!/usr/bin/env bash
# PMD_GENERAL_STAFF_NOTE_CALENDAR_CARD_R15
# Incremental UI fix on top of the user's SUCCESSFULLY deployed R14.
# No composer changes, no DB changes, no git reset/rebase.
set -Eeuo pipefail
cd /var/www/paymydine

BASE=ae8d1ba34cf24ad65774cf6a188253a1533f40d8
BRANCH=codex/general-staff-note-r15-calendar-card-stable-20261026
FILES=(
  app/admin/assets/js/pmd-general-note-notification-r14.js
  app/admin/assets/css/pmd-general-note-notification-r14.css
  app/admin/widgets/menu/top_menu.blade.php
  scripts/test-pmd-general-staff-note-r15.cjs
)

echo '== FETCH R15 UI ONLY =='
git -c gc.auto=0 -c maintenance.auto=false fetch --no-tags origin "refs/heads/${BRANCH}"
HEAD_SHA="$(git rev-parse FETCH_HEAD)"
git cat-file -e "${BASE}^{commit}" || { echo 'STOP: R14 base commit missing from local repository'; exit 2; }

STAGE="$(mktemp -d -t pmd-note-r15-stage-XXXXXXXX)"
BACKUP="$HOME/pmd-general-note-r15-backup-$(date +%Y%m%d_%H%M%S)-$$"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$BACKUP/originals"
: > "$BACKUP/files"
CHANGED=()

echo '== PREFLIGHT: preserve dirty VPS files and R42/R14 integrations =='
for f in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$f")"
  git show "${HEAD_SHA}:$f" > "$STAGE/new"
  if [ -L "$f" ]; then echo "STOP: unsafe symlink: $f"; exit 3; fi
  if git cat-file -e "${BASE}:$f" 2>/dev/null; then
    test -f "$f" || { echo "STOP: expected R14 installed file missing: $f"; exit 3; }
    git show "${BASE}:$f" > "$STAGE/base"
    if cmp -s "$f" "$STAGE/new"; then
      echo "ALREADY CURRENT: $f"
      continue
    fi
    if cmp -s "$f" "$STAGE/base"; then
      cp "$STAGE/new" "$STAGE/$f"
    elif ! git merge-file -p "$f" "$STAGE/base" "$STAGE/new" > "$STAGE/$f"; then
      echo "STOP: local VPS edit conflicts with R15; no live files changed: $f"
      exit 3
    fi
    printf 'E\t%s\n' "$f" >> "$BACKUP/files"
  else
    if [ -e "$f" ]; then
      if cmp -s "$f" "$STAGE/new"; then
        echo "ALREADY CURRENT: $f"
        continue
      fi
      echo "STOP: new R15 file already exists with different content: $f"
      exit 3
    fi
    cp "$STAGE/new" "$STAGE/$f"
    printf 'N\t%s\n' "$f" >> "$BACKUP/files"
  fi
  CHANGED+=("$f")
done

echo '== CHECK R15 SOURCE SYNTAX / REAL EXISTING FORM =='
for f in "${FILES[@]}"; do
  target="$STAGE/$f"
  if [ ! -f "$target" ]; then target="$f"; fi
  case "$f" in
    *.js|*.cjs) node --check "$target" ;;
    *.php) php -l "$target" ;;
  esac
done
if [ -f "$STAGE/app/admin/widgets/menu/top_menu.blade.php" ]; then
  VIEW="$STAGE/app/admin/widgets/menu/top_menu.blade.php"
else
  VIEW="app/admin/widgets/menu/top_menu.blade.php"
fi
grep -q 'id="addGeneralStaffNoteModal"' "$VIEW" ||
  { echo 'STOP: original General Staff Note Bootstrap dialog missing'; exit 4; }
grep -q 'id="generalStaffNoteSubmitBtn"' "$VIEW" ||
  { echo 'STOP: original save button missing'; exit 4; }
grep -q 'pmd-general-note-notification-r14.js.*v=20261026-r15' "$VIEW" ||
  { echo 'STOP: R15 script asset not registered'; exit 4; }

if [ "${#CHANGED[@]}" -eq 0 ]; then
  echo 'ALREADY INSTALLED: R15 files unchanged.'
  node scripts/test-pmd-general-staff-note-r15.cjs
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
echo 'R15 UI rollback complete. Tenant databases and note content were untouched.'
ROLLBACK
chmod 700 "$BACKUP/rollback.sh"

echo "== INSTALL ${#CHANGED[@]} R15 FILES =="
for f in "${CHANGED[@]}"; do
  mkdir -p "$(dirname "$f")"
  cp -p "$STAGE/$f" "$f"
done

echo '== VERIFY REAL INSTALLED SOURCE =='
if ! node scripts/test-pmd-general-staff-note-r15.cjs; then
  echo 'R15 regression test failed; restoring the previous application files.'
  bash "$BACKUP/rollback.sh"
  exit 5
fi
php artisan view:clear
echo 'SUCCESS R15: static Owner-style General Staff Note card, visible Close/Cancel, no opening animation.'
echo 'Other Owner Calendar/Reservations APIs, Floor safety and tenant databases: UNCHANGED.'
echo "BACKUP: $BACKUP"
echo "ROLLBACK: bash $BACKUP/rollback.sh"
echo 'BROWSER: hard-refresh Owner Dashboard, open Notifications > Note, verify visible X, Cancel, suggestions and Save Note.'
echo 'AUDIT: window.PMDGeneralStaffNoteR15.audit()'
