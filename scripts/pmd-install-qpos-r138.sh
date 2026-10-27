#!/usr/bin/env bash
# PMD_QPOS_R138_LOCAL_PRESERVING_INSTALLER
# POS-only appearance update on top of R137; never rewrites reservations or payment logic.
# Usage: --check | --apply | --rollback /path/to/backup
set -Eeuo pipefail
umask 077
MODE="${1:---check}"
ROOT="${PMD_QPOS_ROOT:-/var/www/paymydine}"
BASE="ed1667071896ca4acd530cbc2c3d64b3c8dc7c2a"
SOURCE="28fc85a2027516d160c31f8c5bd0a050fa8d7dca"
JS="app/admin/assets/js/pmd-quick-reservations-v1.js"
CSS="app/admin/assets/css/pmd-qpos-native-reservation-r138.css"
BLADE="app/admin/views/pmd_quick_pos_v1.blade.php"
FILES=("$JS" "$CSS" "$BLADE")
STAGE=""
BACKUP=""
APPLYING=0
FINISHED=0

fail() { printf 'STOP R138: %s\n' "$*" >&2; exit 2; }
[[ "$MODE" == --check || "$MODE" == --apply || "$MODE" == --rollback ]] || fail 'Usage: --check | --apply | --rollback BACKUP_DIR'
(( EUID != 0 )) || fail 'Run as the normal VPS deployment user, not root/sudo.'
for cmd in git php node flock sha256sum cmp mktemp cp cat grep awk; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Missing command: $cmd"
done
[[ -d "$ROOT" ]] || fail "Project directory does not exist: $ROOT"
cd "$ROOT"
[[ "$(git rev-parse --show-toplevel 2>/dev/null || true)" == "$ROOT" ]] || fail "Expected a Git worktree at $ROOT"
exec 9>"$HOME/.pmd-qpos-r138-install.lock"
flock -n 9 || fail 'Another R138 installer or rollback is running.'

sha_file() { sha256sum "$1" | awk '{print $1}'; }

rollback_files() {
  local dir="$1" strict="$2" p kind post current
  [[ -d "$dir" && -f "$dir/.pmd-qpos-r138-backup" && -f "$dir/manifest.tsv" ]] || fail 'Unrecognized R138 backup directory.'
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
  printf 'ROLLBACK PASS R138: restored three original file states from %s\n' "$dir"
}

if [[ "$MODE" == --rollback ]]; then
  [[ $# -eq 2 ]] || fail 'Usage: --rollback BACKUP_DIR'
  rollback_files "$2" yes
  exit 0
fi

[[ $# -eq 1 || $# -eq 0 ]] || fail 'Usage: --check | --apply'
git cat-file -e "$BASE^{commit}" 2>/dev/null || fail "Base commit $BASE not fetched; run the documented git fetch command."
git cat-file -e "$SOURCE^{commit}" 2>/dev/null || fail "Source commit $SOURCE not fetched; run the documented git fetch command."
[[ -f app/admin/assets/css/pmd-qpos-compact-grid-reservation-r137.css ]] || fail 'R137 food-grid fix missing; install R137 first.'
if ! grep -Fq 'pmd-qpos-compact-grid-reservation-r137.css?v=20261027-r137' "$BLADE"; then
  fail 'R137 stylesheet not enabled in live POS view. Install R137 first.'
fi
if ! grep -Fq 'pmd-quick-reservations-v1.js?v=20261027-r137' "$BLADE" && \
   ! grep -Fq 'pmd-quick-reservations-v1.js?v=20261027-r138' "$BLADE"; then
  fail 'Unexpected live POS reservation runtime. Review before applying R138.'
fi

# Guard against accidentally installing edits outside the exact R138 allowlist.
mapfile -t changed < <(git diff --name-only "$BASE" "$SOURCE")
[[ "${#changed[@]}" -eq 4 ]] || fail "Expected 3 R138 live assets plus the installer itself, saw ${#changed[@]} changed paths."
for p in "${changed[@]}"; do
  case "$p" in "$JS"|"$CSS"|"$BLADE"|scripts/pmd-install-qpos-r138.sh) ;; *) fail "Unexpected changed source path: $p" ;; esac
done

git diff --check "$BASE" "$SOURCE" || fail 'Source whitespace verification failed.'
STAGE="$(mktemp -d "$HOME/.pmd-qpos-r138-stage.XXXXXXXX")"
cleanup() {
  local status=$?
  trap - EXIT
  if (( status != 0 && APPLYING == 1 && FINISHED == 0 )); then
    printf 'R138 INSTALL FAILED: attempting automatic restore from %s\n' "$BACKUP" >&2
    rollback_files "$BACKUP" no || printf 'URGENT: automatic restore failed; inspect backup %s\n' "$BACKUP" >&2
  fi
  if [[ -n "$STAGE" && -d "$STAGE" ]]; then rm -rf "$STAGE"; fi
  if (( status != 0 )); then
    printf 'R138 did not complete. Backup: %s\n' "${BACKUP:-none}" >&2
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
    if git cat-file -e "$BASE:$p" 2>/dev/null; then fail 'Expected R138 CSS to be a new path.'; fi
    if [[ -e "$p" ]] && ! cmp -s "$p" "$STAGE/incoming/$p"; then
      fail "Existing custom R138 CSS differs: $p; preserving it for review."
    fi
    cp "$STAGE/incoming/$p" "$STAGE/merged/$p"
  else
    [[ -f "$p" ]] || fail "Required live file is missing: $p"
    mkdir -p "$STAGE/base/$(dirname "$p")"
    git show "$BASE:$p" > "$STAGE/base/$p" || fail "Base file missing: $p"
    if cmp -s "$p" "$STAGE/incoming/$p"; then
      cp "$p" "$STAGE/merged/$p"
      printf 'READY (already matches R138): %s\n' "$p"
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

# Parse actual staged JS; validate R138 integration survives merge with VPS edits.
node --check "$STAGE/merged/$JS" || fail 'JavaScript syntax check failed.'
php -l "$STAGE/merged/$BLADE" >/dev/null || fail 'PHP/Blade syntax check failed.'
node - "$STAGE/merged/$JS" "$STAGE/merged/$CSS" "$STAGE/merged/$BLADE" <<'NODE'
'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const [jsPath, cssPath, viewPath] = process.argv.slice(2);
const js = fs.readFileSync(jsPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const view = fs.readFileSync(viewPath, 'utf8');
assert(js.includes('if (quickForm) {\n      quickForm.querySelectorAll'), 'Null form guard missing');
assert(js.includes("[data-qres-filter]"), 'Filter click handler missing');
assert(js.includes('function installQuickPOSComposerShellR138('), 'POS drawer mount function missing');
assert(js.includes('installQuickPOSComposerShellR138(nextContext)'), 'POS drawer not called on canonical open');
assert(css.includes('border: 0 !important;'), 'Black food-card border is not removed');
assert(css.includes('box-shadow: none !important;'), 'Food-card shadows still present');
assert(css.includes('.pmd-qpos-product.is-selected'), 'Selected card frame override missing');
assert(css.includes('#pmd-reservation-composer-v1.pmd-qpos-quick-composer-r138'), 'Drawer CSS not isolated to POS');
assert(css.includes('width: min(680px, 100vw)'), 'POS sheet geometry missing');
assert(css.includes('@media (max-width: 700px)'), 'Mobile reservation sheet rules missing');
assert(view.includes('pmd-qpos-native-reservation-r138.css?v=20261027-r138'), 'Scoped CSS not linked');
assert(view.includes('pmd-quick-reservations-v1.js?v=20261027-r138'), 'Runtime not cache-busted');
const slice = (a, b) => {
  const i = js.indexOf(a), j = js.indexOf(b, i + a.length);
  assert(i >= 0 && j > i, `Missing JS anchors: ${a} / ${b}`);
  return js.slice(i, j);
};
const opener = new Function('window','document','state','rowById','currentFloorMeta','quickLocationId','toast','console','quickEditor','quickForm','installQuickPOSComposerShellR138',
  'return (function(){' + slice('  function openQuickEditor(', '  function quickLocationId(') + '\nreturn openQuickEditor;})()');
const contexts = [];
const state = {date:'2026-10-27',tableScope:'selected',selectedTableId:8,selectedTableName:'8',editor:{}};
const fn = opener({PMDReservationComposerV1:{open:c=>{contexts.push(c);return Promise.resolve();}}},
  {activeElement:{id:'test-hour'}},state,id=>id===37?{reserve_date:'2026-10-29'}:null,
  ()=>({id:'12',name:'Main Floor'}),()=>6,()=>{},console,null,null,()=>null);
const filterState = {search:'',filter:'past',rows:[{id:1,past:true},{id:2,past:false}]};
const filterFn = new Function('state','rowIsPast','rowName','rowTables','rowNote',
  'return (function(){' + slice('  function filteredRows(', '  function renderReservationRailAction(') + '\nreturn filteredRows;})()')(
  filterState,row=>row.past,()=>'',()=>'',()=>'');
assert.deepEqual(filterFn().map(row=>row.id),[1], 'Past filter failed');
filterState.filter='upcoming';
assert.deepEqual(filterFn().map(row=>row.id),[2], 'Upcoming filter failed');
const guardFn = new Function('state','quickChooseLabel','quickLaterLabel','quickAutoLabel','quickForm','tableNamesForIds','tableLabelFromName',
  'return (function(){' + slice('  function syncQuickAssignmentLabels(', '  function scheduleQuickRecommendation(') + '\nreturn syncQuickAssignmentLabels;})()')(
  {editor:{tableNames:[],tableIds:[],recommendedTableIds:[],recommendationState:'idle'}},null,null,null,null,()=>[],v=>v);
guardFn('auto');
const drawer = new Function('document','window','formatDate',
  'return (function(){' + slice('  function installQuickPOSComposerShellR138(', '  function openQuickEditor(') +
  '\nreturn installQuickPOSComposerShellR138;})()');
let inserts = 0, closes = 0, drawerHeader = null;
const titleNode = {textContent:''}, captionNode = {textContent:''};
const closeNode = {click:null,addEventListener(type,handler){if(type==='click')this.click=handler;}};
const dateNode = {value:'2026-10-27'}, timeNode = {value:'09:00'};
const fakeForm = {listeners:{},querySelector(sel) {
  if (sel === '[data-pmd-qpos-quick-header-r138]') return drawerHeader;
  if (sel === '[data-pmd-composer-content]') return {};
  if (sel === '[data-pmd-composer-cancel]') return {click(){closes++;}};
  if (sel === '[name="reserve_date"]') return dateNode;
  if (sel === '[name="reserve_time"]') return timeNode;
  return null;
},insertBefore(el){drawerHeader=el;},addEventListener(ev,handler){this.listeners[ev]=handler;}};
const fakeRoot = {classList:{added:[],add(v){this.added.push(v);}},querySelector(sel){
  return sel==='#pmd-reservation-composer-form-v1' ? fakeForm : null;
}};
const fakeDoc = {getElementById(){return fakeRoot;},createElement(){inserts++;return {
  setAttribute(){},innerHTML:'',querySelector(sel) {
    if(sel==='[data-pmd-qpos-quick-close-r138]')return closeNode;
    if(sel==='[data-pmd-qpos-quick-title-r138]')return titleNode;
    if(sel==='[data-pmd-qpos-quick-context-r138]')return captionNode;
    return null;
  }
};}};
const mount = drawer(fakeDoc,{},v=>v);
const refreshDrawer=mount({mode:'create',selectedDate:'2026-10-27',selectedTime:'10:00',tableNames:['5']});
assert.equal(inserts,1,'First POS mount must insert one header');
assert.equal(titleNode.textContent,'New reservation');
assert.match(captionNode.textContent,/Table 5/);
assert(fakeRoot.classList.added.includes('pmd-qpos-quick-composer-r138'));
refreshDrawer();
assert.equal(captionNode.textContent,'2026-10-27 · 09:00');
mount({mode:'edit',selectedDate:'2026-10-27',selectedTime:null,tableNames:[]});
assert.equal(inserts,1,'POS header must not duplicate');
assert.equal(titleNode.textContent,'Edit reservation');
timeNode.value='11:15';
fakeForm.listeners.change({target:{name:'reserve_time'}});
assert.equal(captionNode.textContent,'2026-10-27 · 11:15');
closeNode.click();
assert.equal(closes,1,'Close must delegate to canonical soft-draft cancel');
(async()=>{
  await fn(0,'09:00'); await fn(37,null);
  assert.equal(contexts.length,2);
  assert.equal(contexts[0].selectedTime,'09:00');
  assert.equal(contexts[0].selectedDate,'2026-10-27');
  assert.deepEqual(contexts[0].tableIds,[8]);
  assert.equal(contexts[0].floorLocked,true);
  assert.equal(contexts[1].reservationId,37);
  assert.equal(contexts[1].selectedDate,'2026-10-29');
  assert.equal(contexts[1].floorLocked,false);
  console.log('PASS: R138 staged JS/markup/CSS + 16 integration contract checks.');
})().catch(e=>{console.error(e);process.exitCode=2;});
NODE

printf 'PREFLIGHT PASS R138: 3 allowlisted files; no live files changed.\n'
for p in "${FILES[@]}"; do
  if [[ -f "$p" ]]; then
    printf '  %s: %s -> %s\n' "$p" "$(sha_file "$p" | cut -c 1-12)" "$(sha_file "$STAGE/merged/$p" | cut -c 1-12)"
  else
    printf '  %s: new\n' "$p"
  fi
done
[[ "$MODE" == --apply ]] || exit 0

BACKUP="$(mktemp -d "$HOME/pmd-qpos-r138-backup-$(date +%Y%m%d-%H%M%S)-XXXXXXXX")"
printf 'pmd-qpos-r138\n' > "$BACKUP/.pmd-qpos-r138-backup"
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
printf '\nINSTALL PASS R138: POS/Reservations files applied; NO migrations or service restarts.\n'
printf 'BACKUP: %s\n' "$BACKUP"
printf 'ROLLBACK: bash %q --rollback %q\n' "$BACKUP/installer.sh" "$BACKUP"
printf 'NEXT: browser-verify test5/test6 POS, 100-food scroll, new reservation at an hour and segmented filters.\n'
