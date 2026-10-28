#!/usr/bin/env bash
# PMD_QPOS_R141_LOCAL_PRESERVING_INSTALLER
# Targeted R141 POS navigation/reservation/keyboard fix on top of R140; do not change database or payments.
# Usage: --check | --apply | --rollback /path/to/backup
set -Eeuo pipefail
umask 077
MODE="${1:---check}"
ROOT="${PMD_QPOS_ROOT:-/var/www/paymydine}"
BASE="f925098f617faf1135d3594e06bde022ebefce31"
SOURCE="820e2dc4bf0b418d4866567f0a70c8aac8178a0d"
JS="app/admin/assets/js/pmd-quick-reservations-v1.js"
COMPOSER="app/admin/assets/js/pmd-reservation-composer-v1.js"
MAIN="app/admin/assets/js/pmd-quick-pos-v1.js"
CSS="app/admin/assets/css/pmd-qpos-seamless-reservations-r141.css"
BLADE="app/admin/views/pmd_quick_pos_v1.blade.php"
FILES=("$JS" "$COMPOSER" "$MAIN" "$CSS" "$BLADE")
STAGE=""
BACKUP=""
APPLYING=0
FINISHED=0

fail() { printf 'STOP R141: %s\n' "$*" >&2; exit 2; }
[[ "$MODE" == --check || "$MODE" == --apply || "$MODE" == --rollback ]] || fail 'Usage: --check | --apply | --rollback BACKUP_DIR'
(( EUID != 0 )) || fail 'Run as the normal VPS deployment user, not root/sudo.'
for cmd in git php node flock sha256sum cmp mktemp cp cat grep awk; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Missing command: $cmd"
done
[[ -d "$ROOT" ]] || fail "Project directory does not exist: $ROOT"
cd "$ROOT"
[[ "$(git rev-parse --show-toplevel 2>/dev/null || true)" == "$ROOT" ]] || fail "Expected a Git worktree at $ROOT"
exec 9>"$HOME/.pmd-qpos-r141-install.lock"
flock -n 9 || fail 'Another R141 installer or rollback is running.'

sha_file() { sha256sum "$1" | awk '{print $1}'; }

rollback_files() {
  local dir="$1" strict="$2" p kind post current
  [[ -d "$dir" && -f "$dir/.pmd-qpos-r141-backup" && -f "$dir/manifest.tsv" ]] || fail 'Unrecognized R141 backup directory.'
  [[ "$(cat "$dir/root-path")" == "$ROOT" ]] || fail 'Backup belongs to a different project root.'
  local count=0
  while IFS=$'\t' read -r p kind post; do
    case "$p" in "$JS"|"$COMPOSER"|"$MAIN"|"$CSS"|"$BLADE") ;; *) fail "Unexpected rollback path: $p" ;; esac
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
  [[ "$count" -eq 5 ]] || fail "Backup manifest should have 5 entries, found $count"
  while IFS=$'\t' read -r p kind post; do
    if [[ "$kind" == existing ]]; then
      cp -p "$dir/original/$p" "$p" || fail "Could not restore $p"
    else
      rm -f "$p" || fail "Could not remove added file $p"
    fi
  done < "$dir/manifest.tsv"
  php artisan view:clear >/dev/null || fail 'Files restored but Blade cache clear failed.'
  printf 'ROLLBACK PASS R141: restored five original file states from %s\n' "$dir"
}

if [[ "$MODE" == --rollback ]]; then
  [[ $# -eq 2 ]] || fail 'Usage: --rollback BACKUP_DIR'
  rollback_files "$2" yes
  exit 0
fi

[[ $# -eq 1 || $# -eq 0 ]] || fail 'Usage: --check | --apply'
git cat-file -e "$BASE^{commit}" 2>/dev/null || fail "Base commit $BASE not fetched; run the documented git fetch command."
git cat-file -e "$SOURCE^{commit}" 2>/dev/null || fail "Source commit $SOURCE not fetched; run the documented git fetch command."
[[ -f app/admin/assets/css/pmd-qpos-reservations-polish-r140.css ]] || fail 'R140 not installed. Install R140 first.'
grep -Fq 'pmd-qpos-reservations-polish-r140.css?v=20261027-r140' "$BLADE" ||
  fail 'R140 stylesheet not enabled in the live POS view.'
grep -Fq 'pmd-reservation-composer-v1.js?v=20261027-r139' "$BLADE" ||
  fail 'Expected R139 canonical Composer baseline on live POS view.'
if ! grep -Fq 'pmd-quick-reservations-v1.js?v=20261027-r140' "$BLADE" &&
   ! grep -Fq 'pmd-quick-reservations-v1.js?v=20261028-r141' "$BLADE"; then
  fail 'Unexpected Quick Reservations script version; inspect before installing.'
fi
if ! grep -Fq 'pmd-quick-pos-v1.js?v=20261022-qpos-v125' "$BLADE" &&
   ! grep -Fq 'pmd-quick-pos-v1.js?v=20261028-r141' "$BLADE"; then
  fail 'Unexpected main Quick POS script version; inspect before installing.'
fi

# Guard against accidentally installing edits outside the exact R141 allowlist.
mapfile -t changed < <(git diff --name-only "$BASE" "$SOURCE")
[[ "${#changed[@]}" -eq 6 ]] || fail "Expected 5 live assets plus R141 installer in source, found ${#changed[@]} paths."
for p in "${changed[@]}"; do
  case "$p" in "$JS"|"$COMPOSER"|"$MAIN"|"$CSS"|"$BLADE"|scripts/pmd-install-qpos-r141.sh) ;; *) fail "Unexpected changed source path: $p" ;; esac
done

git diff --check "$BASE" "$SOURCE" || fail 'Source whitespace verification failed.'
STAGE="$(mktemp -d "$HOME/.pmd-qpos-r141-stage.XXXXXXXX")"
cleanup() {
  local status=$?
  trap - EXIT
  if (( status != 0 && APPLYING == 1 && FINISHED == 0 )); then
    printf 'R141 INSTALL FAILED: attempting automatic restore from %s\n' "$BACKUP" >&2
    rollback_files "$BACKUP" no || printf 'URGENT: automatic restore failed; inspect backup %s\n' "$BACKUP" >&2
  fi
  if [[ -n "$STAGE" && -d "$STAGE" ]]; then rm -rf "$STAGE"; fi
  if (( status != 0 )); then
    printf 'R141 did not complete. Backup: %s\n' "${BACKUP:-none}" >&2
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
    if git cat-file -e "$BASE:$p" 2>/dev/null; then fail 'Expected the R141 scoped CSS to be a new path.'; fi
    if [[ -e "$p" ]] && ! cmp -s "$p" "$STAGE/incoming/$p"; then
      fail "Existing custom R141 CSS differs: $p; preserving it for review."
    fi
    cp "$STAGE/incoming/$p" "$STAGE/merged/$p"
  else
    [[ -f "$p" ]] || fail "Required live file is missing: $p"
    mkdir -p "$STAGE/base/$(dirname "$p")"
    git show "$BASE:$p" > "$STAGE/base/$p" || fail "Base file missing: $p"
    if cmp -s "$p" "$STAGE/incoming/$p"; then
      cp "$p" "$STAGE/merged/$p"
      printf 'READY (already matches R141): %s\n' "$p"
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

# Validate every staged runtime and only the actual five allowlisted files.
node --check "$STAGE/merged/$JS" || fail 'Quick Reservations JavaScript syntax failed.'
node --check "$STAGE/merged/$COMPOSER" || fail 'Canonical Composer JavaScript syntax failed.'
node --check "$STAGE/merged/$MAIN" || fail 'Main Quick POS JavaScript syntax failed.'
php -l "$STAGE/merged/$BLADE" >/dev/null || fail 'PHP/Blade syntax failed.'
node - "$STAGE/merged/$JS" "$STAGE/merged/$COMPOSER" "$STAGE/merged/$MAIN" "$STAGE/merged/$CSS" "$STAGE/merged/$BLADE" <<'NODE'
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const [qp,cp,mp,cssp,bp]=process.argv.slice(2);
const quick=fs.readFileSync(qp,'utf8'),
      composer=fs.readFileSync(cp,'utf8'),
      main=fs.readFileSync(mp,'utf8'),
      css=fs.readFileSync(cssp,'utf8'),
      blade=fs.readFileSync(bp,'utf8');
new Function(quick);new Function(composer);new Function(main);
assert(quick.includes('quickComposerOpeningR141'),'Async Composer de-duplication missing');
assert(quick.includes("scheduleConfirmedDate: ''"),'Verified schedule guard missing');
assert(quick.includes('visibleEndR141 = Math.max(24 * 60, bounds.end)'),'Stable hour geometry missing');
assert(quick.includes('is-outside-hours-r141'),'Unbookable hour safety missing');
assert(quick.includes('function selectReservationTable(button, additiveR141)'),'Right rail assignment handler missing');
assert(quick.includes("chooseR141.dispatchEvent(new Event('change', { bubbles: true }))"),'Backend availability not notified after table change');
assert(quick.includes("floorLockedR141.value = '0'"),'Stale floor lock on manual selection');
assert(quick.includes("window.addEventListener('pmd:reservation-saved'"),'Post-save rail refresh missing');
assert(composer.includes('PMD_QPOS_HYDRATE_BEFORE_SWAP_R141'),'Atomic Composer hydration missing');
assert(composer.includes('pmdQuickPOSCancelledR141'),'Stale request cancel safety missing');
assert(composer.includes('return showImmediateAndLoad()'),'Normal admin Composer path removed');
assert(main.includes('PMD_QPOS_RESERVATION_SHARED_KEYBOARD_R141'),'Shared keyboard delegation missing');
assert(main.includes('showReservationKeyboardR141(event.target)'),'Reservation inputs not bound');
assert(main.includes("target.dispatchEvent(new Event('input', {bubbles: true}))"),'Existing cashier keyboard input events altered');
assert(blade.includes('pmd-qpos-seamless-reservations-r141.css?v=20261028-r141'),'New CSS not linked');
assert(blade.includes('pmd-quick-pos-v1.js?v=20261028-r141'),'Main JS not cache-busted');
assert(blade.includes('pmd-quick-reservations-v1.js?v=20261028-r141'),'Quick JS not cache-busted');
assert(blade.includes('pmd-reservation-composer-v1.js?v=20261028-r141'),'Composer not cache-busted');
assert(blade.includes("format('D, M d, Y')"),'Initial date format still jumps');
assert(!blade.includes('Loading reservations…'),'SSR still flashes textual loading state');
assert(css.includes('is-reservation-assigned-r141'),'Assignment outline missing');
assert(css.includes('is-qres-keyboard-open-r141'),'Keyboard scroll accommodation missing');
assert(css.endsWith('\n')&&!css.endsWith('\n\n'),'CSS contains extra blank line at EOF');
function between(s,a,b) {
  const i=s.indexOf(a),j=s.indexOf(b,i+a.length);
  assert(i>=0&&j>i, 'Function markers missing: '+a);
  return s.slice(i,j);
}
// Stable 24-hour visible schedule and unclickable closed hours.
const state={date:'2026-10-28',scheduleConfirmedDate:'2026-10-28',loading:false};
const timeline={innerHTML:'<div>Initial SSR hours</div>'};
const timelineFn=new Function('timeline','state','filteredRows','scheduleBounds',
  'openingForDate','berlinNowParts','minuteLabel','rowsForHour','bookingCard','esc',
  'return (function(){'+between(quick,'  function renderTimeline()','  function render() {')+
  '\nreturn renderTimeline;})()')(
    timeline,state,()=>[],()=>({closed:false,start:240,end:1320}),
    ()=>({closed:false,intervals:[[240,1320]]}),
    ()=>({date:'2026-10-28',minutes:600}),
    n=>String(Math.floor(n/60)).padStart(2,'0')+':00',
    ()=>[],()=>'',x=>x);
timelineFn();
assert.equal((timeline.innerHTML.match(/pmd-qres-hour-row/g)||[]).length,24,'24-hour geometry changed');
assert.equal((timeline.innerHTML.match(/data-qres-slot=/g)||[]).length,36,'18 open hours must have two slot handlers');
assert(!timeline.innerHTML.includes('data-qres-slot="00:00"'),'Closed midnight must not be bookable');
assert(timeline.innerHTML.includes('data-qres-slot="04:00"'),'Open hour lost its click handler');
state.scheduleConfirmedDate='';timeline.innerHTML='<div>Pending server</div>';
timelineFn();
assert.match(timeline.innerHTML,/Pending server/,'Premature render during fetch');
// Right rail must update the canonical select+radio and preserve guest input.
const options=[{value:'1',selected:true,disabled:false},{value:'2',selected:false,disabled:false}];
const choose={checked:false,events:[],dispatchEvent(e){this.events.push(e.type);}};
const floorId={value:'1'},floorLocked={value:'1'};
const form={querySelector(s) {
  if(s.includes('tables[]'))return {options};
  if(s.includes('assignment_mode'))return choose;
  if(s.includes('pmd_floor_id'))return floorId;
  if(s.includes('pmd_floor_locked'))return floorLocked;
  return null;
}};
const composerRoot={dataset:{pmdTableCatalogReady:'1'},classList:{contains:x=>x==='show'||x==='pmd-qpos-inline-composer-r139'},querySelector:()=>form};
const document={getElementById:()=>composerRoot};
const railState={tableScope:'all',selectedTableId:0,selectedTableName:'',search:'',editor:{open:false}};
const loads=[];
const tableFn=new Function('document','state','root','quickComposerOpeningR141',
  'toast','isPastSelectedDate','renderTableFilter','loadReservations',
  'currentFloorMeta','Event',
  'return (function(){'+between(quick,'  function selectReservationTable(button, additiveR141) {',
  "\n  document.addEventListener('click', function (event)")+
  '\nreturn selectReservationTable;})()')(
    document,railState,{},null,()=>{},()=>false,()=>{},forced=>loads.push(forced),
    ()=>({id:'2'}),function Event(type){this.type=type;});
function button(id){return {disabled:false,getAttribute:k=>k==='data-qpos-table'?
  String(id):k==='data-qpos-table-floor'?'2':'',
  querySelector:()=>({textContent:String(id)})};}
tableFn(button(2),false);
assert(!options[0].selected&&options[1].selected,'Right rail did not replace selected table');
assert.equal(choose.checked,true,'Choose mode not committed');
assert(choose.events.includes('change'),'Availability not triggered');
assert.equal(floorId.value,'2','Floor not aligned to chosen table');
assert.equal(floorLocked.value,'0','Old floor lock retained');
assert.equal(railState.selectedTableId,2,'Table list filter not updated');
assert.equal(loads.length,1,'Filtered reservation refresh not fired');
tableFn(button(1),true);
assert(options[0].selected&&options[1].selected,'Shift-click does not support multiple tables');
// Keyboard is a delegation, not a second text insertion engine.
const ka=main.indexOf('    function reservationTextFieldR141('),
      kb=main.indexOf("    document.addEventListener('focusin'",ka);
assert(ka>=0&&kb>ka,'Keyboard delegation functions missing');
const keyboardRoot={classList:{added:[],add(x){this.added.push(x);}}};
let keyboardLabel='';
const keyboardFn=new Function('useTextKeyboard','maybeOpenTextKeyboard','root',
  'return (function(){'+main.slice(ka,kb)+'\nreturn showReservationKeyboardR141;})()')(
    ()=>true,(_target,label)=>keyboardLabel=label,keyboardRoot);
const guestField={name:'first_name',attrs:{},matches:()=>true,closest:()=>({}),
 setAttribute(k,v){this.attrs[k]=v;}};
assert.equal(keyboardFn(guestField),true,'Guest name cannot open shared keyboard');
assert.equal(keyboardLabel,'Guest name');
assert.equal(guestField.attrs.inputmode,'none');
console.log('PASS R141: 24-hour stability, closed-hour safety, atomic open hooks, right-rail tables, keyboard and cache contracts.');
NODE

printf 'PREFLIGHT PASS R141: 5 allowlisted files; no live files changed.\n'
for p in "${FILES[@]}"; do
  if [[ -f "$p" ]]; then
    printf '  %s: %s -> %s\n' "$p" "$(sha_file "$p" | cut -c 1-12)" "$(sha_file "$STAGE/merged/$p" | cut -c 1-12)"
  else
    printf '  %s: new\n' "$p"
  fi
done
[[ "$MODE" == --apply ]] || exit 0

BACKUP="$(mktemp -d "$HOME/pmd-qpos-r141-backup-$(date +%Y%m%d-%H%M%S)-XXXXXXXX")"
printf 'pmd-qpos-r141\n' > "$BACKUP/.pmd-qpos-r141-backup"
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
printf '\nINSTALL PASS R141: POS/Reservations files applied; NO migrations or service restarts.\n'
printf 'BACKUP: %s\n' "$BACKUP"
printf 'ROLLBACK: bash %q --rollback %q\n' "$BACKUP/installer.sh" "$BACKUP"
printf 'NEXT: browser-verify refresh/no jumps, hour-to-form transition, right-side table edit/save, shared keyboard, standard Reservations modal.\n'
