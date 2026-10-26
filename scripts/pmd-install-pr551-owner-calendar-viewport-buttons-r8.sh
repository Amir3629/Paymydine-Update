#!/usr/bin/env bash
# PMD_PR551_OWNER_CALENDAR_VIEWPORT_BUTTONS_INCREMENTAL_INSTALL_R8
# Deploy precise Owner Calendar viewport center and Table Manager button palette over installed R7. No reset.
# Fetch the feature branch from origin immediately before running this installer.
set -Eeuo pipefail
ROOT=/var/www/paymydine
BASE=8c649b433ceb4d3a354c8ab176045627c5bd3d08
REF=FETCH_HEAD
cd "$ROOT"
if (( EUID == 0 )); then
  echo 'STOP: run as ubuntu/deployment account, not root.' >&2
  exit 2
fi
for cmd in git php node flock mktemp cmp sha256sum awk; do
  command -v "$cmd" >/dev/null || { echo "STOP: missing $cmd" >&2; exit 2; }
done
[[ "$(git rev-parse --show-toplevel)" == "$ROOT" ]] || { echo 'STOP: unexpected git root' >&2; exit 2; }
exec 9>/tmp/pmd-pr551-install.lock
flock -n 9 || { echo 'STOP: PR551 installer already running' >&2; exit 2; }
git cat-file -e "$BASE^{commit}" || { echo 'STOP: reviewed base missing (fetch main)' >&2; exit 2; }
git cat-file -e "$REF^{commit}" || { echo 'STOP: branch FETCH_HEAD missing' >&2; exit 2; }
git merge-base --is-ancestor "$BASE" "$REF" || { echo 'STOP: branch is not based on reviewed main' >&2; exit 2; }

files=(
  app/admin/assets/css/pmd-owner-calendar-viewport-buttons-r8.css
  app/admin/assets/js/pmd-reservations-schedule-v1.js
  app/admin/views/dashboardlab/index.blade.php
)
allowed=( "${files[@]}" scripts/pmd-install-pr551-owner-calendar-viewport-buttons-r8.sh )
mapfile -t changed < <(git diff --name-only "$BASE" "$REF")
if (( ${#changed[@]} != ${#allowed[@]} )); then
  printf 'STOP: changed-path count differs from reviewed PR551\n' >&2
  printf '%s\n' "${changed[@]}" >&2
  exit 2
fi
for p in "${changed[@]}"; do
  accepted=0
  for expected in "${allowed[@]}"; do
    if [[ "$p" == "$expected" ]]; then accepted=1; break; fi
  done
  (( accepted )) || { echo "STOP: unexpected changed file $p" >&2; exit 2; }
done
git diff --check "$BASE" "$REF"

stage="$(mktemp -d /tmp/pmd-pr551-stage-XXXXXX)"
backup=''
applying=0
completed=0
cleanup() {
  status=$?
  if (( status != 0 && applying == 1 && completed == 0 )) && [[ -n "$backup" ]]; then
    echo 'Install interrupted: restoring backed-up live files.' >&2
    while IFS=$'\t' read -r kind p expected_sha; do
      if [[ "$kind" == existing ]]; then
        cp -p "$backup/before/$p" "$ROOT/$p" || true
      else
        rm -f "$ROOT/$p" || true
      fi
    done < "$backup/manifest.tsv"
    php artisan view:clear >/dev/null 2>&1 || true
  fi
  rm -rf "$stage"
  if (( status != 0 )); then
    echo "STOP: PR551 not installed. Backup: ${backup:-none}" >&2
  fi
}
trap cleanup EXIT
mkdir -p "$stage/base" "$stage/incoming" "$stage/merged"

echo '=== PREFLIGHT: PRESERVE EXISTING VPS CHANGES ==='
for p in "${files[@]}"; do
  for kind in base incoming merged; do
    mkdir -p "$stage/$kind/$(dirname "$p")"
  done
  if [[ -L "$p" || ( -e "$p" && ! -f "$p" ) ]]; then
    echo "STOP: nonregular path $p" >&2; exit 2
  fi
  git show "$REF:$p" > "$stage/incoming/$p"
  if git cat-file -e "$BASE:$p" 2>/dev/null; then
    [[ -f "$p" ]] || { echo "STOP: missing current VPS file $p" >&2; exit 2; }
    git show "$BASE:$p" > "$stage/base/$p"
    if cmp -s "$p" "$stage/base/$p"; then
      cp "$stage/incoming/$p" "$stage/merged/$p"
    elif cmp -s "$p" "$stage/incoming/$p"; then
      cp "$p" "$stage/merged/$p"
    else
      if ! git merge-file -p --diff3 "$p" "$stage/base/$p" "$stage/incoming/$p" > "$stage/merged/$p"; then
        echo "STOP: source conflict with VPS modification: $p" >&2
        echo 'No live file has been modified.' >&2
        exit 2
      fi
      echo "Merged with existing VPS modifications: $p"
    fi
  else
    if [[ -e "$p" ]] && ! cmp -s "$p" "$stage/incoming/$p"; then
      echo "STOP: new PR file differs from existing VPS file: $p" >&2
      exit 2
    fi
    cp "$stage/incoming/$p" "$stage/merged/$p"
  fi
done

echo '=== PREFLIGHT: OWNER CALENDAR VIEWPORT / BUTTONS R8 ==='
node --check "$stage/merged/app/admin/assets/js/pmd-reservations-schedule-v1.js"
grep -Fq 'PMD_OWNER_CALENDAR_VIEWPORT_CENTER_R8' "$stage/merged/app/admin/assets/js/pmd-reservations-schedule-v1.js" || { echo 'STOP: Owner viewport alignment logic missing' >&2; exit 2; }
grep -Fq 'PMD_OWNER_CALENDAR_VIEWPORT_BUTTONS_R8' "$stage/merged/app/admin/assets/css/pmd-owner-calendar-viewport-buttons-r8.css" || { echo 'STOP: Owner R8 CSS missing' >&2; exit 2; }
grep -Fq 'pmd-owner-viewport-nav-offset-r8' "$stage/merged/app/admin/assets/css/pmd-owner-calendar-viewport-buttons-r8.css" || { echo 'STOP: Center alignment variable missing' >&2; exit 2; }
grep -Fq 'pmd-owner-calendar-viewport-buttons-r8.css' "$stage/merged/app/admin/views/dashboardlab/index.blade.php" || { echo 'STOP: Owner R8 CSS not linked' >&2; exit 2; }
grep -Fq 'r551-owner-calendar-viewport-buttons-r8-20261026' "$stage/merged/app/admin/views/dashboardlab/index.blade.php" || { echo 'STOP: Owner R8 JS cache version unchanged' >&2; exit 2; }
node - "$stage/merged/app/admin/assets/css/pmd-owner-calendar-viewport-buttons-r8.css" <<'PMD_R8_CSS_CHECK'
const fs=require('fs');
const css=fs.readFileSync(process.argv[2],'utf8');
const opens=(css.match(/{/g)||[]).length;
const closes=(css.match(/}/g)||[]).length;
if (opens!==closes || opens<10 || !css.includes('linear-gradient(180deg,#0b765e 0%,#075c47 100%)') ||
    !css.includes('background: #edf7f1') || !css.includes('transform: translateX(var(--pmd-owner-viewport-nav-offset-r8')) {
  console.error('STOP: Owner R8 palette and viewport alignment CSS is incomplete.');
  process.exit(2);
}
console.log('Owner R8 CSS structure OK ('+opens+' rules).');
PMD_R8_CSS_CHECK

backup="$HOME/pmd-pr551-owner-buttons-r8-backup-$(date +%Y%m%d_%H%M%S)-$$"
mkdir -m 700 "$backup"
mkdir -p "$backup/before"
printf '%s\n' "$ROOT" > "$backup/root-path"
printf '%s\n' "$(git rev-parse "$REF")" > "$backup/installed-source-commit"
: > "$backup/manifest.tsv"
for p in "${files[@]}"; do
  kind=new
  if [[ -f "$p" ]]; then
    kind=existing
    mkdir -p "$backup/before/$(dirname "$p")"
    cp -p "$p" "$backup/before/$p"
  fi
  expected_sha="$(sha256sum "$stage/merged/$p" | awk '{print $1}')"
  printf '%s\t%s\t%s\n' "$kind" "$p" "$expected_sha" >> "$backup/manifest.tsv"
done

cat > "$backup/rollback.sh" <<'ROLLBACK'
#!/usr/bin/env bash
set -Eeuo pipefail
backup="$(cd "$(dirname "$0")" && pwd -P)"
root="$(cat "$backup/root-path")"
cd "$root"
while IFS=$'\t' read -r kind p expected_sha; do
  [[ -f "$p" ]] || { echo "STOP: deployed file missing: $p" >&2; exit 2; }
  actual_sha="$(sha256sum "$p" | awk '{print $1}')"
  [[ "$actual_sha" == "$expected_sha" ]] || { echo "STOP: deployed file changed after install: $p" >&2; exit 2; }
done < "$backup/manifest.tsv"
while IFS=$'\t' read -r kind p expected_sha; do
  if [[ "$kind" == existing ]]; then
    cp -p "$backup/before/$p" "$p"
  else
    rm -f "$p"
  fi
done < "$backup/manifest.tsv"
php artisan view:clear
echo 'PR551 rollback complete.'
ROLLBACK
chmod 700 "$backup/rollback.sh"

echo '=== INSTALL EXACT 3 FILES ==='
applying=1
for p in "${files[@]}"; do
  if [[ -f "$p" ]]; then
    cat "$stage/merged/$p" > "$p"
  else
    mkdir -p "$(dirname "$p")"
    install -m 0644 "$stage/merged/$p" "$p"
  fi
done
for p in "${files[@]}"; do
  cmp -s "$stage/merged/$p" "$p" || { echo "STOP: copy verification failed: $p" >&2; exit 2; }
done
php artisan view:clear
completed=1
applying=0
echo 'SUCCESS: PR551 Owner Calendar Viewport & Buttons R8 installed (3 files, prior fixes untouched).'
echo "BACKUP: $backup"
echo "ROLLBACK: bash $backup/rollback.sh"
echo 'Next: hard-refresh Owner Calendar: month label at entire browser viewport center, choice buttons pale jade, Note matches Save Table gradient.'
