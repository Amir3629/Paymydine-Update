#!/usr/bin/env bash
# PMD_R16_FRONTEND_GUARDED_ACTIVATION
# Build in a SEPARATE directory and switch .next only after successful build.
# Only works when the actual PM2 guest frontend runs from /var/www/paymydine/frontend.
# Never restarts frontend-v2 or a different release directory.
set -Eeuo pipefail
MODE="${1:---check}"
[[ "$MODE" == "--check" || "$MODE" == "--apply" ]] || {
  echo 'Usage: bash pmd-activate-guest-table-r16.sh --check|--apply'
  exit 2
}
ROOT=/var/www/paymydine
LIVE="$ROOT/frontend"
cd "$ROOT"
command -v pm2 >/dev/null || { echo 'STOP: PM2 is not installed/available for this user.'; exit 3; }
command -v rsync >/dev/null || { echo 'STOP: rsync is required for an isolated frontend build.'; exit 3; }
command -v npm >/dev/null || { echo 'STOP: npm required.'; exit 3; }
[[ -d "$LIVE/node_modules" && -f "$LIVE/package.json" ]] || {
  echo 'STOP: live frontend dependencies/source directory absent.'; exit 3;
}
grep -q 'const requiresTableVerification = Boolean(' "$LIVE/features/customer-menu/CustomerMenuPage.tsx" || {
  echo 'STOP: R16 guest table guard source is not installed.'; exit 3;
}
grep -q 'if (tableParam || qr)' "$LIVE/features/customer-menu/hooks/useMenuLoader.ts" || {
  echo 'STOP: R16 QR validation source is not installed.'; exit 3;
}

# Inspect actual PM2 working directory; never assume a V2 release or another
# host's PM2 process uses this repository's frontend directory.
RUNNING="$(pm2 jlist | node -e '
let text="";
process.stdin.on("data",x=>text+=x).on("end",()=>{
  let list=[];try{list=JSON.parse(text)}catch(e){process.exit(4)}
  for(const p of list){
    if(p.name==="paymydine-frontend"&&p.pm2_env&&p.pm2_env.status==="online"){
      process.stdout.write(String(p.pm2_env.pm_cwd||""));
      return
    }
  }
  process.exit(5)
});
')" || {
  echo 'STOP: online PM2 process named paymydine-frontend not found. Frontend-v2/different service may be active.'
  pm2 list || true
  exit 4
}
[[ "$(readlink -f "$RUNNING")" == "$(readlink -f "$LIVE")" ]] || {
  echo "STOP: active PM2 frontend CWD is $RUNNING, not $LIVE"
  echo 'Apply R16 to the active frontend release only after identifying that release.'
  exit 4
}
echo "PASS R16 FRONTEND: active PM2 process paymydine-frontend uses $LIVE"
if [[ "$MODE" == "--check" ]]; then
  echo 'DRY RUN: no frontend build, restart, .next or tenant data changed.'
  exit 0
fi

STAGE="$(mktemp -d -p "$ROOT" .pmd-r16-next-stage-XXXXXXXX)"
BACKUP="$ROOT/.pmd-r16-next-backup-$(date +%Y%m%d_%H%M%S)-$$"
SWAPPED=0
READY=0
finish() {
  code=$?
  trap - EXIT
  if [[ "$SWAPPED" == 1 && "$READY" == 0 ]]; then
    echo 'R16 frontend activation failed; restoring previous production .next.'
    rm -rf -- "$LIVE/.next"
    if [[ -d "$BACKUP/.next" ]]; then mv "$BACKUP/.next" "$LIVE/.next"; fi
    pm2 reload paymydine-frontend --update-env || true
  fi
  rm -rf -- "$STAGE"
  exit "$code"
}
trap finish EXIT

echo '== STAGED NEXT BUILD: live .next stays untouched during compilation =='
rsync -a --exclude '/node_modules' --exclude '/.next' --exclude '/.git' \
  "$LIVE/" "$STAGE/"
ln -s "$LIVE/node_modules" "$STAGE/node_modules"
(cd "$STAGE" && NEXT_TELEMETRY_DISABLED=1 npm run build)
[[ -s "$STAGE/.next/BUILD_ID" && -d "$STAGE/.next/static" ]] || {
  echo 'STOP: staged Next build did not produce expected build artifacts.'
  exit 5
}
[[ -d "$LIVE/.next" ]] || { echo 'STOP: live .next is missing; refusing unbacked swap.'; exit 5; }
mkdir -p "$BACKUP"
echo '== SWAP VERIFIED BUILD AND RELOAD EXACT PM2 SERVICE =='
mv "$LIVE/.next" "$BACKUP/.next"
SWAPPED=1
mv "$STAGE/.next" "$LIVE/.next"
pm2 reload paymydine-frontend --update-env
pm2 jlist | node -e '
let s="";process.stdin.on("data",x=>s+=x).on("end",()=>{
  const p=JSON.parse(s).find(p=>p.name==="paymydine-frontend");
  if(!p||p.pm2_env.status!=="online") process.exit(1);
  console.log("PASS: paymydine-frontend is online");
});
'
READY=1
echo 'SUCCESS R16 FRONTEND: new build activated for actual PM2 production process.'
echo "PREVIOUS .next BACKUP: $BACKUP/.next"
echo 'Guest QA: test disabled table QR + active table QR in fresh private browser tabs.'
