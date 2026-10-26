#!/usr/bin/env bash
# PMD_R17_ACTIVATE_REAL_FRONTEND_V2
# A guarded companion to already-installed R16. Never touches legacy frontend,
# landing app, nginx, tenant DB, orders, payments or Floor safety.
set -Eeuo pipefail
MODE="${1:---check}"
[[ "$MODE" == "--check" || "$MODE" == "--apply" ]] || {
  echo 'Usage: bash pmd-activate-guest-v2-r17.sh --check|--apply'
  exit 2
}
ROOT=/var/www/paymydine
BRANCH=codex/floor-modal-neutral-v2-qr-guard-r17-20261026
SERVICE=paymydine-frontend-v2
cd "$ROOT"
for bin in git node npm pm2 python3 rsync curl; do
  command -v "$bin" >/dev/null || { echo "STOP: $bin missing"; exit 3; }
done

git -c gc.auto=0 -c maintenance.auto=false fetch --no-tags origin "refs/heads/${BRANCH}"
REV="$(git rev-parse FETCH_HEAD)"
# PMD_R17B_HOME_STAGE_PERMISSION_FIX: repository root is not writable by ubuntu.
# Keep all staging and backup metadata under the invoking user's private home.
[[ -n "${HOME:-}" && -d "$HOME" && -w "$HOME" ]] || {
  echo 'STOP: HOME is not a writable directory for a private staging build.'
  exit 3
}
TMP="$(mktemp -d -p "$HOME" pmd-r17-v2-stage-XXXXXXXX)"
BACKUP="$HOME/pmd-r17-v2-backup-$(date +%Y%m%d_%H%M%S)-$"
LIVE=""
MUTATING=0
MOVED_BUILD=0
NEW_BUILD=0
COMPLETED=0
READY_BUILD=""
OLD_BUILD=""
cleanup(){
  local code=$?
  trap - EXIT
  if [[ "$MUTATING" == 1 && "$COMPLETED" == 0 ]]; then
    echo 'R17 V2 activation failed; restoring exact source and old .next.'
    if [[ "$NEW_BUILD" == 1 && -d "$LIVE/.next" ]]; then
      mv "$LIVE/.next" "$BACKUP/.next.failed-r17" || true
    fi
    if [[ "$MOVED_BUILD" == 1 && -d "$BACKUP/.next" ]]; then
      mv "$BACKUP/.next" "$LIVE/.next" || true
    fi
    if [[ -f "$BACKUP/files" ]]; then
      while IFS="$(printf '\t')" read -r kind rel; do
        if [[ "$kind" == E ]]; then cp "$BACKUP/originals/$rel" "$LIVE/$rel" || true
        elif [[ "$kind" == N ]]; then rm -f -- "$LIVE/$rel" || true
        fi
      done < "$BACKUP/files"
    fi
    pm2 reload "$SERVICE" --update-env || true
  fi
  rm -rf "$TMP"
  exit "$code"
}
trap cleanup EXIT
mkdir -p "$TMP"
git show "${REV}:scripts/pmd-r17-guard-frontend-v2.py" > "$TMP/v2-guard.py"
git show "${REV}:scripts/test-pmd-r17-v2-guard.cjs" > "$TMP/test-v2.cjs"
python3 -m py_compile "$TMP/v2-guard.py"
node --check "$TMP/test-v2.cjs"

echo '== PM2 actual guest V2 process identity (never infer from truncated display) =='
IDENTITY="$(pm2 jlist | node -e '
let s=""; process.stdin.on("data",x=>s+=x).on("end",()=>{
  let rows=[];try{rows=JSON.parse(s)}catch(e){process.exit(8)}
  for(const p of rows){
    if(/^paymydine-(frontend|landing)/.test(p.name)){
      console.error("PM2:",p.name,"status="+(p.pm2_env?.status||"unknown"),
        "cwd="+(p.pm2_env?.pm_cwd||"unknown"));
    }
  }
  const candidates=rows.filter(p=>
    /^paymydine-frontend[a-z0-9_-]*$/.test(String(p.name||"")) &&
    p.pm2_env?.status==="online" &&
    String(p.pm2_env?.pm_cwd||"").startsWith("/var/www/paymydine/frontend-v2/")
  );
  if(candidates.length!==1)process.exit(9);
  const p=candidates[0];
  process.stdout.write(p.name+"\t"+String(p.pm2_env.pm_cwd));
});')" || {
  echo 'STOP: exactly one online guest frontend process with a V2 cwd is required.'
  echo 'No Next build or PM2 process was changed.'
  exit 4
}
[[ "$IDENTITY" == *$'\t'* ]] || { echo 'STOP: PM2 identity parse failed'; exit 4; }
SERVICE="${IDENTITY%%$'\t'*}"
LIVE="${IDENTITY#*$'\t'}"
[[ -d "$LIVE" ]] || { echo 'STOP: PM2 working directory missing'; exit 4; }
LIVE="$(readlink -f "$LIVE")"
case "$LIVE" in
  "$ROOT"/frontend-v2/*) ;;
  *) echo "STOP: unexpected frontend-v2 CWD: $LIVE"; exit 4 ;;
esac
[[ -f "$LIVE/package.json" && -f "$LIVE/src/server/normalize.ts" && -f "$LIVE/app/table/[tableId]/page.tsx" ]] || {
  echo 'STOP: this PM2 process does not use the expected V2 guest application.'
  exit 4
}
node -e 'const p=require(process.argv[1]);if(!String(p.name||"").startsWith("paymydine-frontend-v2"))process.exit(1)' "$LIVE/package.json" || {
  echo 'STOP: this is not the V2 menu package'; exit 4;
}
[[ -d "$LIVE/node_modules" && -f "$LIVE/.next/BUILD_ID" ]] || {
  echo 'STOP: active dependencies or current compiled Next build missing'; exit 4;
}
echo "PASS: active PM2 service=$SERVICE cwd=$LIVE"

echo '== Port 3002 identity (no public URL or tenant writes) =='
HEALTH="$(curl -fsS --connect-timeout 3 --max-time 7 http://127.0.0.1:3002/api/health)" || {
  echo 'STOP: live V2 port 3002 health unreachable'; exit 4;
}
printf '%s' "$HEALTH" | node -e '
let s="";process.stdin.on("data",x=>s+=x).on("end",()=>{
  let j={};try{j=JSON.parse(s)}catch(e){process.exit(1)}
  if(j.service!=="paymydine-frontend-v2")process.exit(2);
  console.log("PASS: local V2 health identifies",j.service);
})' || { echo 'STOP: port 3002 is not the canonical V2 frontend'; exit 4; }

python3 "$TMP/v2-guard.py" --check "$LIVE"
if [[ "$MODE" == "--check" ]]; then
  echo 'PREFLIGHT PASS R17: real V2 source is compatible; no live source, .next or PM2 changes.'
  echo 'NEXT: run --apply to build and activate the staged QR safeguards.'
  exit 0
fi

echo '== STAGE AN ISOLATED NEXT BUILD; KEEP LIVE NEXT RUNNING =='
WORK="$TMP/work"
mkdir -p "$WORK"
rsync -a \
  --exclude '/node_modules' --exclude '/.next*' \
  --exclude '/.git' --exclude '/storage' --exclude '/.pmd-*' \
  "$LIVE/" "$WORK/"
ln -s "$LIVE/node_modules" "$WORK/node_modules"
MANIFEST="$TMP/manifest"
python3 "$TMP/v2-guard.py" --stage "$WORK" "$MANIFEST"
node "$TMP/test-v2.cjs" "$WORK"
(cd "$WORK" && NEXT_TELEMETRY_DISABLED=1 npm run build)
[[ -s "$WORK/.next/BUILD_ID" && -d "$WORK/.next/static" ]] || {
  echo 'STOP: staged Next production build incomplete'; exit 5;
}
node "$TMP/test-v2.cjs" "$WORK"

echo '== BACKUP EXACT CURRENT SOURCES AND OLD COMPILED APP =='
mkdir -p "$BACKUP/originals"
: > "$BACKUP/files"
while IFS= read -r rel; do
  [[ -n "$rel" && "$rel" != /* && "$rel" != *..* ]] || { echo 'STOP: unsafe patched path'; exit 5; }
  if [[ -L "$LIVE/$rel" ]]; then echo "STOP: symlink in patched path: $rel"; exit 5; fi
  if [[ -f "$LIVE/$rel" ]]; then
    mkdir -p "$BACKUP/originals/$(dirname "$rel")"
    cp -p "$LIVE/$rel" "$BACKUP/originals/$rel"
    printf 'E\t%s\n' "$rel" >> "$BACKUP/files"
  elif [[ ! -e "$LIVE/$rel" ]]; then
    printf 'N\t%s\n' "$rel" >> "$BACKUP/files"
  else
    echo "STOP: non-regular source: $rel"; exit 5
  fi
done < "$MANIFEST"
printf '%s\n' "$LIVE" > "$BACKUP/live-root"
printf '%s\n' "$SERVICE" > "$BACKUP/pm2-service"
cat > "$BACKUP/rollback.sh" <<'ROLLBACK'
#!/usr/bin/env bash
set -Eeuo pipefail
B="$(cd "$(dirname "$0")" && pwd -P)"
LIVE="$(cat "$B/live-root")"
SERVICE="$(cat "$B/pm2-service")"
[[ -d "$B/.next" && -d "$LIVE/.next" ]] || { echo 'STOP: previous or current Next build missing'; exit 2; }
mv "$LIVE/.next" "$B/.next-r17-current"
mv "$B/.next" "$LIVE/.next"
while IFS="$(printf '\t')" read -r kind rel; do
  if [[ "$kind" == E ]]; then cp "$B/originals/$rel" "$LIVE/$rel"
  elif [[ "$kind" == N ]]; then rm -f -- "$LIVE/$rel"
  fi
done < "$B/files"
pm2 reload "$SERVICE" --update-env
echo 'Previous V2 frontend source and compiled build restored.'
ROLLBACK
chmod 700 "$BACKUP/rollback.sh"

echo '== ACTIVATE COMPILED V2 AND RELOAD ONLY ITS EXACT PM2 SERVICE =='
MUTATING=1
while IFS= read -r rel; do
  [[ -n "$rel" ]] || continue
  mkdir -p "$LIVE/$(dirname "$rel")"
  cp "$WORK/$rel" "$LIVE/$rel"
done < "$MANIFEST"
mv "$LIVE/.next" "$BACKUP/.next"
MOVED_BUILD=1
mv "$WORK/.next" "$LIVE/.next"
NEW_BUILD=1
pm2 reload "$SERVICE" --update-env
pm2 jlist | node -e '
let s="";process.stdin.on("data",x=>s+=x).on("end",()=>{
  const p=JSON.parse(s).filter(p=>p.name===process.argv[1]);
  if(p.length!==1 || p[0].pm2_env?.status!=="online")process.exit(1);
  console.log("PASS: exact V2 PM2 service is online:",p[0].name);
});' "$SERVICE"
AFTER="$(curl -fsS --connect-timeout 3 --max-time 10 http://127.0.0.1:3002/api/health)"
printf '%s' "$AFTER" | node -e '
let s="";process.stdin.on("data",x=>s+=x).on("end",()=>{
  let j={};try{j=JSON.parse(s)}catch(e){process.exit(1)}
  if(j.service!=="paymydine-frontend-v2")process.exit(2);
  console.log("PASS: reloaded V2 health remains correct");
})'
COMPLETED=1
echo 'SUCCESS R17 V2: disabled/unverified table QR blocked in actual running Frontend V2.'
echo "BACKUP: $BACKUP"
echo "ROLLBACK: bash $BACKUP/rollback.sh"
echo 'FINAL BROWSER QA: test one disabled table QR, one enabled table QR and kiosk.'
