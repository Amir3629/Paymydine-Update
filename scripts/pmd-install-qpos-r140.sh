#!/usr/bin/env bash
# PMD_QPOS_R140_LOCAL_PRESERVING_INSTALLER
# Targeted R140 visual/loading fix on top of R139; preserve local edits and canonical server writes.
# Usage: --check | --apply | --rollback /path/to/backup
set -Eeuo pipefail
umask 077
MODE="${1:---check}"
ROOT="${PMD_QPOS_ROOT:-/var/www/paymydine}"
BASE="47cc6749892a7dc03442cb33ce82128a447ba104"
SOURCE="a7e944b45c89b4ac7bde66e10803a26a5649be11"
JS="app/admin/assets/js/pmd-quick-reservations-v1.js"
CSS="app/admin/assets/css/pmd-qpos-reservations-polish-r140.css"
BLADE="app/admin/views/pmd_quick_pos_v1.blade.php"
FILES=("$JS" "$CSS" "$BLADE")
STAGE=""
BACKUP=""
APPLYING=0
FINISHED=0

fail() { printf 'STOP R140: %s\n' "$*" >&2; exit 2; }
[[ "$MODE" == --check || "$MODE" == --apply || "$MODE" == --rollback ]] || fail 'Usage: --check | --apply | --rollback BACKUP_DIR'
(( EUID != 0 )) || fail 'Run as the normal VPS deployment user, not root/sudo.'
for cmd in git php node flock sha256sum cmp mktemp cp cat grep awk; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Missing command: $cmd"
done
[[ -d "$ROOT" ]] || fail "Project directory does not exist: $ROOT"
cd "$ROOT"
[[ "$(git rev-parse --show-toplevel 2>/dev/null || true)" == "$ROOT" ]] || fail "Expected a Git worktree at $ROOT"
exec 9>"$HOME/.pmd-qpos-r140-install.lock"
flock -n 9 || fail 'Another R140 installer or rollback is running.'

sha_file() { sha256sum "$1" | awk '{print $1}'; }

rollback_files() {
  local dir="$1" strict="$2" p kind post current
  [[ -d "$dir" && -f "$dir/.pmd-qpos-r140-backup" && -f "$dir/manifest.tsv" ]] || fail 'Unrecognized R140 backup directory.'
  [[ "$(cat "$dir/root-path")" == "$ROOT" ]] || fail 'Backup belongs to a different project root.'
  local count=0
  while IFS=$'\t' read -r p kind post; do
    case "$p" in "$JS"|"$CSS"|"$BLADE") ;; *) fail "Unexpected rollback path: $p" ;; esac
    [[ "$kind" == existing || "$kind" == new ]] || fail "Invalid rollback entry: $p"
    [[ ! -L "$p" ]] || fail "Refusing symlink during rollback: $p"
    if [[ "$kind" == existing ]]; then
      [[ -f "$dir/original/$p" ]] || fail "Original backup missing: $p"
    fi
    if [[ "$strict" == yes ]]; then
      [[ -f "$p" ]] || fail "Installed file disappeared; refusing to overwrite: $p"
      current="$(sha_file "$p")"
      [[ "$current" == "$post" ]] || fail "File changed since installation: $p; manual rollback required."
    fi
    ((count+=1))
  done < "$dir/manifest.tsv"
  [[ "$count" -eq 3 ]] || fail "Backup manifest should have 3 entries, found $count"
  while IFS=$'\t' read -r p kind post; do
    if [[ "$kind" == existing ]]; then
      cp -p "$dir/original/$p" "$p" || fail "Could not restore $p"
    else
      rm -f "$p" || fail "Could not remove added file $p"
    fi
  done < "$dir/manifest.tsv"
  php artisan view:clear >/dev/null || fail 'Files restored but Blade cache clear failed.'
  printf 'ROLLBACK PASS R140: restored three original file states from %s\n' "$dir"
}

if [[ "$MODE" == --rollback ]]; then
  [[ $# -eq 2 ]] || fail 'Usage: --rollback BACKUP_DIR'
  rollback_files "$2" yes
  exit 0
fi

[[ $# -eq 1 || $# -eq 0 ]] || fail 'Usage: --check | --apply'
git cat-file -e "$BASE^{commit}" 2>/dev/null || fail "Base commit $BASE not fetched; run the documented git fetch command."
git cat-file -e "$SOURCE^{commit}" 2>/dev/null || fail "Source commit $SOURCE not fetched; run the documented git fetch command."
[[ -f app/admin/assets/css/pmd-qpos-inline-reservation-r139.css ]] || fail 'R139 not installed; install it first.'
grep -Fq 'pmd-qpos-inline-reservation-r139.css?v=20261027-r139' "$BLADE" ||
  fail 'R139 CSS missing from live POS view.'
grep -Fq 'pmd-reservation-composer-v1.js?v=20261027-r139' "$BLADE" ||
  fail 'Expected R139 canonical Composer; manual review required.'
if ! grep -Fq 'pmd-quick-reservations-v1.js?v=20261027-r139' "$BLADE" &&
   ! grep -Fq 'pmd-quick-reservations-v1.js?v=20261027-r140' "$BLADE"; then
  fail 'Unexpected Quick POS reservations script version.'
fi

# Guard against accidentally installing edits outside the exact R140 allowlist.
mapfile -t changed < <(git diff --name-only "$BASE" "$SOURCE")
[[ "${#changed[@]}" -eq 3 ]] || fail "Expected exactly 3 R140 live asset paths, found ${#changed[@]}."
for p in "${changed[@]}"; do
  case "$p" in "$JS"|"$CSS"|"$BLADE") ;; *) fail "Unexpected changed source path: $p" ;; esac
done

git diff --check "$BASE" "$SOURCE" || fail 'Source whitespace verification failed.'
STAGE="$(mktemp -d "$HOME/.pmd-qpos-r140-stage.XXXXXXXX")"
cleanup() {
  local status=$?
  trap - EXIT
  if (( status != 0 && APPLYING == 1 && FINISHED == 0 )); then
    printf 'R140 INSTALL FAILED: attempting automatic restore from %s\n' "$BACKUP" >&2
    rollback_files "$BACKUP" no || printf 'URGENT: automatic restore failed; inspect backup %s\n' "$BACKUP" >&2
  fi
  if [[ -n "$STAGE" && -d "$STAGE" ]]; then rm -rf "$STAGE"; fi
  if (( status != 0 )); then
    printf 'R140 did not complete. Backup: %s\n' "${BACKUP:-none}" >&2
  fi
  exit "$status"
}
trap cleanup EXIT

for p in "${FILES[@]}"; do
  mkdir -p "$STAGE/incoming/$(dirname "$p")" "$STAGE/merged/$(dirname "$p")" "$STAGE/local/$(dirname "$p")"
  git show "$SOURCE:$p" > "$STAGE/incoming/$p" || fail "Source file missing: $p"
  [[ ! -L "$p" ]] || fail "Refusing symlink: $p"
  [[ ! -e "$p" || -f "$p" ]] || fail "Not a regular file: $p"
  if [[ "$p" == "$CSS" ]]; then
    if git cat-file -e "$BASE:$p" 2>/dev/null; then fail 'Expected the R140 scoped CSS to be a new path.'; fi
    if [[ -e "$p" ]] && ! cmp -s "$p" "$STAGE/incoming/$p"; then
      fail "Existing custom R140 CSS differs: $p; preserving it for review."
    fi
    cp "$STAGE/incoming/$p" "$STAGE/merged/$p"
  else
    [[ -f "$p" ]] || fail "Required live file is missing: $p"
    mkdir -p "$STAGE/base/$(dirname "$p")"
    git show "$BASE:$p" > "$STAGE/base/$p" || fail "Base file missing: $p"
    if cmp -s "$p" "$STAGE/incoming/$p"; then
      cp "$p" "$STAGE/merged/$p"
      printf 'READY (already matches R140): %s\n' "$p"
    elif cmp -s "$p" "$STAGE/base/$p"; then
      cp "$STAGE/incoming/$p" "$STAGE/merged/$p"
      printf 'READY (exact baseline): %s\n' "$p"
    else
      if ! git merge-file -p --diff3 "$p" "$STAGE/base/$p" "$STAGE/incoming/$p" > "$STAGE/merged/$p"; then
        fail "Conflicting local VPS modifications in $p. No live files changed."
      fi
      printf 'READY (preserved local changes via clean 3-way merge): %s\n' "$p"
    fi
  fi
  if [[ -f "$p" ]]; then cp -p "$p" "$STAGE/local/$p"; fi
  [[ -w "$(dirname "$p")" ]] || fail "Cannot write file directory: $(dirname "$p")"
  [[ ! -f "$p" || -w "$p" ]] || fail "Cannot update existing file: $p"
done

# Parse actual staged JS; validate R140 integration survives merge with VPS edits.
node --check "$STAGE/merged/$JS" || fail 'Quick Reservations JavaScript syntax check failed.'
php -l "$STAGE/merged/$BLADE" >/dev/null || fail 'PHP/Blade syntax check failed.'
node - "$STAGE/merged/$JS" "$STAGE/merged/$CSS" "$STAGE/merged/$BLADE" <<'NODE'
'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const [jsPath,cssPath,bladePath]=process.argv.slice(2);
const js=fs.readFileSync(jsPath,'utf8');
const css=fs.readFileSync(cssPath,'utf8');
const blade=fs.readFileSync(bladePath,'utf8');
new Function(js);
assert(js.includes("scheduleConfirmedDate: ''"),'Missing no-flash schedule data gate');
assert(js.includes('state.scheduleConfirmedDate = state.date;'),'Missing verified-date publish');
assert(js.includes('if (state.scheduleConfirmedDate !== state.date) return;'),'Missing unverified timeline guard');
assert(!js.includes("timeline.querySelector('.pmd-qres-loading')"),'Premature schedule render still present');
assert(js.includes("timeline.setAttribute('aria-busy', 'false')"),'Async aria-busy is never cleared');
assert(blade.includes('pmd-qres-initial-hours-r140'),'Stable SSR hour scaffold missing');
assert(blade.includes('@for($pmdQposHourR140 = 0; $pmdQposHourR140 < 24; $pmdQposHourR140++)'),'24 initial hour rows missing');
assert(!blade.includes('Loading schedule…'),'Old loading text still in first paint');
assert(blade.includes('pmd-qpos-reservations-polish-r140.css?v=20261027-r140'),'New CSS link missing');
assert(blade.includes('pmd-quick-reservations-v1.js?v=20261027-r140'),'JS cache-bust missing');
for(const bit of ['"name date"','"time duration"','"time guests"','grid-row: 2 / 4 !important;','@container pmd-qres-middle-r140','pmd-qpos-inline-composer-r139']){
  assert(css.includes(bit),'New POS layout rule missing: '+bit);
}
assert(css.endsWith('\n')&&!css.endsWith('\n\n'),'CSS trailing blank line');
const a=js.indexOf('  function renderTimeline()');
const b=js.indexOf('  function render() {',a);
assert(a>=0&&b>a,'renderTimeline code missing');
const state={date:'2026-10-27',scheduleConfirmedDate:'',loading:false};
const timeline={innerHTML:'<div>Initial SSR hour rows</div>'};
let count=0;
const fn=new Function('timeline','state','filteredRows','scheduleBounds','berlinNowParts',
'minuteLabel','rowsForHour','bookingCard','esc',
'return (function(){'+js.slice(a,b)+'\nreturn renderTimeline;})()')(
timeline,state,()=>[],()=>{count++;return {closed:true,start:0,end:1440};},
()=>({date:'2026-10-27',minutes:720}),n=>String(n),()=>[],()=>'',v=>v
);
fn();
assert.equal(count,0,'Boot rendered a false Restaurant closed state');
assert.match(timeline.innerHTML,/Initial SSR hour rows/);
state.scheduleConfirmedDate='2026-10-27';
fn();
assert.equal(count,1,'Confirmed day was not rendered');
assert.match(timeline.innerHTML,/Restaurant closed/);
state.date='2026-10-28';timeline.innerHTML='<div>Pending next date</div>';
fn();
assert.equal(count,1,'Stale date was rendered');
assert.match(timeline.innerHTML,/Pending next date/);
console.log('PASS R140: no false-closed flash, verified date gating, POS inline form and CSS source checks.');
NODE

printf 'PREFLIGHT PASS R140: 3 allowlisted files; no live files changed.\n'
for p in "${FILES[@]}"; do
  if [[ -f "$p" ]]; then
    printf '  %s: %s -> %s\n' "$p" "$(sha_file "$p" | cut -c 1-12)" "$(sha_file "$STAGE/merged/$p" | cut -c 1-12)"
  else
    printf '  %s: new\n' "$p"
  fi
done
[[ "$MODE" == --apply ]] || exit 0

BACKUP="$(mktemp -d "$HOME/pmd-qpos-r140-backup-$(date +%Y%m%d-%H%M%S)-XXXXXXXX")"
printf 'pmd-qpos-r140\n' > "$BACKUP/.pmd-qpos-r140-backup"
printf '%s\n' "$ROOT" > "$BACKUP/root-path"
mkdir -p "$BACKUP/original"
: > "$BACKUP/manifest.tsv"
for p in "${FILES[@]}"; do
  kind=new
  if [[ -f "$p" ]]; then
    mkdir -p "$BACKUP/original/$(dirname "$p")"
    cp -p "$p" "$BACKUP/original/$p"
    kind=existing
  fi
  printf '%s\t%s\t%s\n' "$p" "$kind" "$(sha_file "$STAGE/merged/$p")" >> "$BACKUP/manifest.tsv"
done
cp -p "${BASH_SOURCE[0]}" "$BACKUP/installer.sh"
APPLYING=1
for p in "${FILES[@]}"; do
  if [[ -f "$p" ]]; then
    cmp -s "$p" "$STAGE/local/$p" || fail "Concurrent edit detected: $p"
    cat "$STAGE/merged/$p" > "$p" || fail "Failed to write $p"
  else
    [[ "$p" == "$CSS" ]] || fail "Unexpected new target: $p"
    install -m 0644 "$STAGE/merged/$p" "$p" || fail "Failed to create $p"
  fi
  cmp -s "$p" "$STAGE/merged/$p" || fail "Installed content mismatch: $p"
done
php artisan view:clear || fail 'Blade cache clearing failed.'
FINISHED=1
APPLYING=0
printf '\nINSTALL PASS R140: POS/Reservations files applied; NO migrations or service restarts.\n'
printf 'BACKUP: %s\n' "$BACKUP"
printf 'ROLLBACK: bash %q --rollback %q\n' "$BACKUP/installer.sh" "$BACKUP"
printf 'NEXT: browser-verify no false closed flash, inline field grid/wheel, table assignment, Cancel, and test-only Save.\n'
