#!/usr/bin/env bash
# PMD_OWNER_HOUR_NOTES_R13_INCREMENTAL_SAFE_INSTALLER
# Installs R13 on top of user's successfully deployed R12 without resetting VPS.
set -Eeuo pipefail
cd /var/www/paymydine

BASE=e47a00bd17cf5758c432e5ebe2670b3243000e64
BRANCH=codex/owner-notes-r13-auto-tenant-staff-time-picker-20261026
FILES=(
  app/Services/PmdOwnerStaffNotesTenantSchemaR13.php
  app/Services/SuperAdminTenantLifecycleService.php
  app/Http/Middleware/PmdTenantRuntimeGuardR1.php
  app/admin/controllers/SuperAdminController.php
  app/Services/PmdOwnerStaffHourNotesR11.php
  app/Http/Controllers/PmdOwnerStaffHourNotesR11Controller.php
  app/admin/assets/js/pmd-owner-hour-team-notes-r11.js
  app/admin/assets/css/pmd-owner-hour-team-notes-r11.css
  app/admin/views/dashboardlab/index.blade.php
  scripts/pmd-owner-staff-notes-backfill-r13.php
)
echo "== FETCH R13 =="
git -c gc.auto=0 -c maintenance.auto=false fetch --no-tags origin "refs/heads/${BRANCH}"
HEAD_SHA="$(git rev-parse FETCH_HEAD)"
git cat-file -e "${BASE}^{commit}" || { echo 'STOP: R12 base commit missing'; exit 2; }
STAGE="$(mktemp -d -t pmd-r13-stage-XXXXXXXX)"
BACKUP="$HOME/pmd-owner-hour-r13-backup-$(date +%Y%m%d_%H%M%S)-$$"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$BACKUP/originals"
: > "$BACKUP/files"
CHANGED=()

echo "== PREFLIGHT: preserve all existing VPS customizations =="
for f in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$f")"
  git show "${HEAD_SHA}:$f" > "$STAGE/new"
  if [ -e "$f" ] && [ -L "$f" ]; then
    echo "STOP: unsafe symlink: $f"; exit 3
  fi
  if git cat-file -e "${BASE}:$f" 2>/dev/null; then
    test -f "$f" || { echo "STOP: expected R12 file missing: $f"; exit 3; }
    git show "${BASE}:$f" > "$STAGE/base"
    if cmp -s "$f" "$STAGE/new"; then
      echo "ALREADY CURRENT: $f"
      continue
    fi
    if cmp -s "$f" "$STAGE/base"; then
      cp "$STAGE/new" "$STAGE/$f"
    elif ! git merge-file -p "$f" "$STAGE/base" "$STAGE/new" > "$STAGE/$f"; then
      echo "STOP: local VPS conflict; no application files changed: $f"
      exit 3
    fi
    printf 'E\t%s\n' "$f" >> "$BACKUP/files"
  else
    if [ -e "$f" ]; then
      if cmp -s "$f" "$STAGE/new"; then
        echo "ALREADY CURRENT: $f"
        continue
      fi
      echo "STOP: R13 new file already exists locally with different content: $f"
      exit 3
    fi
    cp "$STAGE/new" "$STAGE/$f"
    printf 'N\t%s\n' "$f" >> "$BACKUP/files"
  fi
  CHANGED+=("$f")
done

echo "== PREFLIGHT: PHP / JavaScript syntax =="
for f in "${FILES[@]}"; do
  source_file="$STAGE/$f"
  if [ ! -f "$source_file" ]; then source_file="$f"; fi
  case "$f" in
    *.php) php -l "$source_file" ;;
    *.js) node --check "$source_file" ;;
  esac
done

if [ "${#CHANGED[@]}" -eq 0 ]; then
  echo "R13 is already installed; nothing to change."
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
  if [ "$kind" = E ]; then
    cp -p "$B/originals/$f" "$ROOT/$f"
  elif [ "$kind" = N ]; then
    rm -f -- "$ROOT/$f"
  fi
done < "$B/files"
cd "$ROOT"
php artisan view:clear
echo "R13 application rollback complete. Tenant schemas are intentionally not dropped."
ROLLBACK
chmod 700 "$BACKUP/rollback.sh"

echo "== INSTALL ${#CHANGED[@]} APPLICATION FILES =="
for f in "${CHANGED[@]}"; do
  mkdir -p "$(dirname "$f")"
  cp -p "$STAGE/$f" "$f"
done
php artisan view:clear
echo "SUCCESS: Owner Hour Notes R13 installed."
echo "BACKUP: $BACKUP"
echo "ROLLBACK: bash $BACKUP/rollback.sh"
echo "NEXT: hard-refresh the Owner Calendar and verify named staff + compact time list."
echo "EXISTING TENANTS (one time, read-only preview): php scripts/pmd-owner-staff-notes-backfill-r13.php"
echo "EXISTING TENANTS (explicit schema rollout): php scripts/pmd-owner-staff-notes-backfill-r13.php --apply"
