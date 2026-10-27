#!/usr/bin/env bash
# PMD_QPOS_R139_LOCAL_PRESERVING_INSTALLER
# Targeted R139 POS layout update on top of R138; preserve local VPS edits and canonical reservation writes.
# Usage: --check | --apply | --rollback /path/to/backup
set -Eeuo pipefail
umask 077
MODE="${1:---check}"
ROOT="${PMD_QPOS_ROOT:-/var/www/paymydine}"
BASE="12b3f62fff583a071a474729459183c0539d1f25"
SOURCE="bf60a87fc861360c68b4b23925930470bbc64b55"
JS="app/admin/assets/js/pmd-quick-reservations-v1.js"
COMPOSER="app/admin/assets/js/pmd-reservation-composer-v1.js"
CSS="app/admin/assets/css/pmd-qpos-inline-reservation-r139.css"
BLADE="app/admin/views/pmd_quick_pos_v1.blade.php"
FILES=("$JS" "$COMPOSER" "$CSS" "$BLADE")
STAGE=""
BACKUP=""
APPLYING=0
FINISHED=0

fail() { printf 'STOP R139: %s\n' "$*" >&2; exit 2; }
[[ "$MODE" == --check || "$MODE" == --apply || "$MODE" == --rollback ]] || fail 'Usage: --check | --apply | --rollback BACKUP_DIR'
(( EUID != 0 )) || fail 'Run as the normal VPS deployment user, not root/sudo.'
for cmd in git php node flock sha256sum cmp mktemp cp cat grep awk; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Missing command: $cmd"
done
[[ -d "$ROOT" ]] || fail "Project directory does not exist: $ROOT"
cd "$ROOT"
[[ "$(git rev-parse --show-toplevel 2>/dev/null || true)" == "$ROOT" ]] || fail "Expected a Git worktree at $ROOT"
exec 9>"$HOME/.pmd-qpos-r139-install.lock"
flock -n 9 || fail 'Another R139 installer or rollback is running.'

sha_file() { sha256sum "$1" | awk '{print $1}'; }

rollback_files() {
  local dir="$1" strict="$2" p kind post current
  [[ -d "$dir" && -f "$dir/.pmd-qpos-r139-backup" && -f "$dir/manifest.tsv" ]] || fail 'Unrecognized R139 backup directory.'
  [[ "$(cat "$dir/root-path")" == "$ROOT" ]] || fail 'Backup belongs to a different project root.'
  local count=0
  while IFS=$'\t' read -r p kind post; do
    case "$p" in "$JS"|"$COMPOSER"|"$CSS"|"$BLADE") ;; *) fail "Unexpected rollback path: $p" ;; esac
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
  [[ "$count" -eq 4 ]] || fail "Backup manifest should have 4 entries, found $count"
  while IFS=$'\t' read -r p kind post; do
    if [[ "$kind" == existing ]]; then
      cp -p "$dir/original/$p" "$p" || fail "Could not restore $p"
    else
      rm -f "$p" || fail "Could not remove added file $p"
    fi
  done < "$dir/manifest.tsv"
  php artisan view:clear >/dev/null || fail 'Files restored but Blade cache clear failed.'
  printf 'ROLLBACK PASS R139: restored four original file states from %s\n' "$dir"
}

if [[ "$MODE" == --rollback ]]; then
  [[ $# -eq 2 ]] || fail 'Usage: --rollback BACKUP_DIR'
  rollback_files "$2" yes
  exit 0
fi

[[ $# -eq 1 || $# -eq 0 ]] || fail 'Usage: --check | --apply'
git cat-file -e "$BASE^{commit}" 2>/dev/null || fail "Base commit $BASE not fetched; run the documented git fetch command."
git cat-file -e "$SOURCE^{commit}" 2>/dev/null || fail "Source commit $SOURCE not fetched; run the documented git fetch command."
[[ -f app/admin/assets/css/pmd-qpos-native-reservation-r138.css ]] || fail 'R138 is not installed; install it first.'
grep -Fq 'pmd-qpos-native-reservation-r138.css?v=20261027-r138' "$BLADE" ||
  fail 'The R138 stylesheet is not active on this VPS.'
if ! grep -Fq 'pmd-quick-reservations-v1.js?v=20261027-r138' "$BLADE" &&
   ! grep -Fq 'pmd-quick-reservations-v1.js?v=20261027-r139' "$BLADE"; then
  fail 'The current Quick POS runtime is not R138/R139; manual review is required.'
fi

# Guard against accidentally installing edits outside the exact R139 allowlist.
mapfile -t changed < <(git diff --name-only "$BASE" "$SOURCE")
[[ "${#changed[@]}" -eq 4 ]] || fail "Expected exactly 4 R139 live asset paths, found ${#changed[@]}."
for p in "${changed[@]}"; do
  case "$p" in "$JS"|"$COMPOSER"|"$CSS"|"$BLADE") ;; *) fail "Unexpected changed source path: $p" ;; esac
done

git diff --check "$BASE" "$SOURCE" || fail 'Source whitespace verification failed.'
STAGE="$(mktemp -d "$HOME/.pmd-qpos-r139-stage.XXXXXXXX")"
cleanup() {
  local status=$?
  trap - EXIT
  if (( status != 0 && APPLYING == 1 && FINISHED == 0 )); then
    printf 'R139 INSTALL FAILED: attempting automatic restore from %s\n' "$BACKUP" >&2
    rollback_files "$BACKUP" no || printf 'URGENT: automatic restore failed; inspect backup %s\n' "$BACKUP" >&2
  fi
  if [[ -n "$STAGE" && -d "$STAGE" ]]; then rm -rf "$STAGE"; fi
  if (( status != 0 )); then
    printf 'R139 did not complete. Backup: %s\n' "${BACKUP:-none}" >&2
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
    if git cat-file -e "$BASE:$p" 2>/dev/null; then fail 'Expected the R139 scoped CSS to be a new path.'; fi
    if [[ -e "$p" ]] && ! cmp -s "$p" "$STAGE/incoming/$p"; then
      fail "Existing custom R139 CSS differs: $p; preserving it for review."
    fi
    cp "$STAGE/incoming/$p" "$STAGE/merged/$p"
  else
    [[ -f "$p" ]] || fail "Required live file is missing: $p"
    mkdir -p "$STAGE/base/$(dirname "$p")"
    git show "$BASE:$p" > "$STAGE/base/$p" || fail "Base file missing: $p"
    if cmp -s "$p" "$STAGE/incoming/$p"; then
      cp "$p" "$STAGE/merged/$p"
      printf 'READY (already matches R139): %s\n' "$p"
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

# Parse actual staged JS; validate R139 integration survives merge with VPS edits.
node --check "$STAGE/merged/$JS" || fail 'Quick Reservations JavaScript syntax check failed.'
node --check "$STAGE/merged/$COMPOSER" || fail 'Canonical Composer JavaScript syntax check failed.'
php -l "$STAGE/merged/$BLADE" >/dev/null || fail 'PHP/Blade syntax check failed.'
node - "$STAGE/merged/$JS" "$STAGE/merged/$COMPOSER" "$STAGE/merged/$CSS" "$STAGE/merged/$BLADE" <<'NODE'
'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const [quickPath, composerPath, cssPath, bladePath] = process.argv.slice(2);
const quick = fs.readFileSync(quickPath, 'utf8');
const composer = fs.readFileSync(composerPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const blade = fs.readFileSync(bladePath, 'utf8');
new Function(quick);
new Function(composer);

assert(quick.includes('function installQuickPOSComposerShellR138('), 'Canonical POS header bridge missing');
assert(quick.includes('Back to reservation schedule'), 'Back to schedule control missing');
assert(quick.includes('pmd-qpos-inline-composer-r139'), 'Draft-preserving inline guard missing');
assert(quick.includes('render();\n    }\n    root.setAttribute'), 'No-flash workspace render missing');
assert(composer.includes('function pmdPOSInlineHostR139()'), 'Inline host resolver missing');
assert(composer.includes('wasInlineR139'), 'Close-to-schedule restoration missing');
assert(composer.includes("root.setAttribute('role', 'region')"), 'Inline accessible region missing');
assert(css.includes('flex: 0 0 auto !important;'), 'Nonshrinking category strip missing');
assert(css.includes('min-height: 72px !important;'), 'Category height invariant missing');
assert(css.includes('flex: 1 1 0% !important;'), 'Catalog scroll allocation missing');
assert(css.includes('grid-auto-rows: max-content !important;'), 'Intrinsic food row height missing');
assert(css.includes('.pmd-qres-inline-host-r139'), 'Inline workspace CSS missing');
assert(css.includes('position: relative !important;'), 'Sheet is not in-flow');
assert(!css.endsWith('\n\n'), 'Extra CSS line at EOF');
assert(blade.includes('data-qres-inline-composer-host-r139'), 'Middle host missing');
assert(blade.includes('pmd-qpos-inline-reservation-r139.css?v=20261027-r139'), 'CSS not loaded');
assert(blade.includes('pmd-reservation-composer-v1.js?v=20261027-r139'), 'Composer JS cache buster missing');
assert(blade.includes('pmd-quick-reservations-v1.js?v=20261027-r139'), 'Quick JS cache buster missing');

function chunk(src, from, to) {
  const a = src.indexOf(from);
  const b = src.indexOf(to,a + from.length);
  assert(a >= 0 && b > a, 'Missing function anchors ' + from);
  return src.slice(a,b);
}

const methods = new Function('document','root','pmdRemoveDirectBackdropR20',
 'pmdDispatchModalEventR20','pmdStagePostPaintR20',
 'return (function(){' +
 chunk(composer,'  function pmdPOSInlineHostR139()','  function tagBackdrop()') +
 '\nreturn {show:pmdShowDirectR20,hide:pmdHideDirectR20};})()');

function classList(initial) {
 const values = new Set(initial || []);
 return {contains:s=>values.has(s),add:(...xs)=>xs.forEach(s=>values.add(s)),
  remove:(...xs)=>xs.forEach(s=>values.delete(s))};
}
function testComposer(inline) {
 let showEvents=[], hostCenter={classList:classList()};
 const host={closest:()=>hostCenter,appendChild(r){r.parentNode=this;}};
 const doc={
  body:{classList:classList(inline?['pmd-qpos-body']:[]),appendChild(r){r.parentNode=this;}},
  documentElement:{classList:classList()},
  getElementById:()=>({getAttribute:()=> 'reservations',querySelector:()=>host}),
  querySelector:()=>null
 };
 const root={classList:classList(),parentNode:null,style:{},attrs:{},
  setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},
  closest:()=>hostCenter};
 const api=methods(doc,root,()=>{},name=>{showEvents.push(name);return true;},
  ()=>{showEvents.push('postPaint');});
 api.show();
 if(inline){
  assert(root.parentNode===host,'Composer did not move into middle host');
  assert(root.classList.contains('pmd-qpos-inline-composer-r139'));
  assert(hostCenter.classList.contains('is-inline-composer-r139'));
  assert(!doc.body.classList.contains('modal-open'),'POS body was locked');
  assert(!showEvents.includes('postPaint'),'POS global blur was invoked');
  assert.equal(root.attrs.role,'region');
 } else {
  assert(root.parentNode===doc.body,'Regular Reservations modal reparent regression');
  assert(doc.body.classList.contains('modal-open'),'Regular modal lock missing');
  assert(showEvents.includes('postPaint'),'Regular modal animation path missing');
  assert.equal(root.attrs.role,'dialog');
 }
 api.hide();
 assert(!root.classList.contains('show'),'Composer failed to close');
 assert(!hostCenter.classList.contains('is-inline-composer-r139'),'Schedule not restored');
 assert(showEvents.includes('hidden.bs.modal'),'Canonical hidden event missing');
}
testComposer(true);
testComposer(false);

const filterFn = new Function('state','rowIsPast','rowName','rowTables','rowNote',
 'return (function(){' +
 chunk(quick,'  function filteredRows(', '  function renderReservationRailAction(') +
 '\nreturn filteredRows;})()');
const state={search:'',filter:'past',rows:[{id:1,past:true},{id:2,past:false}]};
const filtered=filterFn(state,r=>r.past,()=>'',()=>'',()=>'');
assert.deepEqual(filtered().map(r=>r.id),[1]);
state.filter='upcoming';
assert.deepEqual(filtered().map(r=>r.id),[2]);

console.log('PASS R139: composer inline/normal open-close, menu, schedule, context and JS contracts.');
NODE

printf 'PREFLIGHT PASS R139: 4 allowlisted files; no live files changed.\n'
for p in "${FILES[@]}"; do
  if [[ -f "$p" ]]; then
    printf '  %s: %s -> %s\n' "$p" "$(sha_file "$p" | cut -c 1-12)" "$(sha_file "$STAGE/merged/$p" | cut -c 1-12)"
  else
    printf '  %s: new\n' "$p"
  fi
done
[[ "$MODE" == --apply ]] || exit 0

BACKUP="$(mktemp -d "$HOME/pmd-qpos-r139-backup-$(date +%Y%m%d-%H%M%S)-XXXXXXXX")"
printf 'pmd-qpos-r139\n' > "$BACKUP/.pmd-qpos-r139-backup"
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
printf '\nINSTALL PASS R139: POS/Reservations files applied; NO migrations or service restarts.\n'
printf 'BACKUP: %s\n' "$BACKUP"
printf 'ROLLBACK: bash %q --rollback %q\n' "$BACKUP/installer.sh" "$BACKUP"
printf 'NEXT: browser-verify 100-food category height, inline middle reservation form, Back/Save, and normal /admin/reservations modal.\n'
