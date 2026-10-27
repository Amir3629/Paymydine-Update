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
BACKUP="$HOME/pmd-r17-v2-backup-$(date +%Y%m%d_%H%M%S)-$BASHPID"
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
    echo 'R17B V2 activation failed; restoring old source and original compiled build.'
    if [[ "$NEW_BUILD" == 1 && -d "$LIVE/.next" ]]; then
      local failed_build="$LIVE/.next.pmd-r17-failed-$(date +%Y%m%d_%H%M%S)-$$"
      mv "$LIVE/.next" "$failed_build" || true
    fi
    if [[ "$MOVED_BUILD" == 1 && -n "$OLD_BUILD" && -d "$OLD_BUILD" && ! -e "$LIVE/.next" ]]; then
      mv "$OLD_BUILD" "$LIVE/.next" || true
    fi
    if [[ -f "$BACKUP/files" ]]; then
      while IFS="$(printf '\t')" read -r kind rel; do
        if [[ "$kind" == E ]]; then cp -p "$BACKUP/originals/$rel" "$LIVE/$rel" || true
        elif [[ "$kind" == N ]]; then rm -f -- "$LIVE/$rel" || true
        fi
      done < "$BACKUP/files"
    fi
    if [[ "$MOVED_BUILD" == 1 ]]; then
      pm2 reload "$SERVICE" --update-env || true
    fi
  fi
  if [[ -n "$READY_BUILD" && "$READY_BUILD" == "$LIVE"/.next.pmd-r17-ready-* && -d "$READY_BUILD" ]]; then
    rm -rf -- "$READY_BUILD"
  fi
  rm -rf -- "$TMP"
  exit "$code"
}
trap cleanup EXIT
mkdir -p "$TMP"
git show "${REV}:scripts/pmd-r17-guard-frontend-v2.py" > "$TMP/v2-guard.py"
git show "${REV}:scripts/test-pmd-r17-v2-guard.cjs" > "$TMP/test-v2.cjs"
git show "${REV}:scripts/test-pmd-r17e-next-isolated-deps.sh" > "$TMP/test-next-deps.sh"
git show "${REV}:scripts/pmd-v2-health-identity-r17f.cjs" > "$TMP/health-identity.cjs"
python3 -m py_compile "$TMP/v2-guard.py"
node --check "$TMP/test-v2.cjs"
node --check "$TMP/health-identity.cjs"
node "$TMP/health-identity.cjs" --self-test
bash -n "$TMP/test-next-deps.sh"
bash "$TMP/test-next-deps.sh"

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

# PMD_R17D_TURBOPACK_ROOT_SAFE_DEPENDENCY_COPY
# Next 16 V2 sets turbopack.root to the isolated project. A node_modules
# symlink to the live release escapes that root and PANICS before compilation.
# The production build therefore requires a PHYSICAL, independent dependency
# copy, never a link or hardlink into live production dependencies.
[[ -f "$LIVE/node_modules/next/package.json" &&
   -f "$LIVE/node_modules/typescript/package.json" ]] || {
  echo 'STOP: live V2 Next/TypeScript dependencies are incomplete.'
  exit 4
}
DEPS_KB="$(du -skL "$LIVE/node_modules" | awk 'END {print $1}')"
CURRENT_NEXT_KB="$(du -sk "$LIVE/.next" | awk 'END {print $1}')"
HOME_FREE_KB="$(df -Pk "$HOME" | awk 'END {print $4}')"
LIVE_FREE_KB="$(df -Pk "$LIVE" | awk 'END {print $4}')"
for size in "$DEPS_KB" "$CURRENT_NEXT_KB" "$HOME_FREE_KB" "$LIVE_FREE_KB"; do
  [[ "$size" =~ ^[0-9]+$ ]] || { echo 'STOP: unable to measure build disk space.'; exit 4; }
done
# Reserve space for a full node_modules copy, Turbopack output/cache, a
# separate compiled .next sibling and some headroom. No cleanup of live files.
HOME_REQUIRED_KB=$(( DEPS_KB + 3145728 ))
LIVE_REQUIRED_KB=$(( CURRENT_NEXT_KB + 1048576 ))
if [[ "$(stat -c '%d' "$HOME")" == "$(stat -c '%d' "$LIVE")" ]]; then
  TOTAL_REQUIRED_KB=$(( HOME_REQUIRED_KB + LIVE_REQUIRED_KB ))
  [[ "$HOME_FREE_KB" -ge "$TOTAL_REQUIRED_KB" ]] || {
    echo "STOP: insufficient disk on shared filesystem: have ${HOME_FREE_KB} KiB, need ${TOTAL_REQUIRED_KB} KiB."
    exit 4
  }
else
  [[ "$HOME_FREE_KB" -ge "$HOME_REQUIRED_KB" &&
     "$LIVE_FREE_KB" -ge "$LIVE_REQUIRED_KB" ]] || {
    echo "STOP: insufficient build storage: HOME ${HOME_FREE_KB}/${HOME_REQUIRED_KB} KiB, V2 ${LIVE_FREE_KB}/${LIVE_REQUIRED_KB} KiB."
    exit 4
  }
fi
echo "PASS R17D DISK: resolved dependencies ${DEPS_KB} KiB; build and rollback headroom verified."

# The repo root need not be writable. However switching the live .next
# directory requires WRITE permission inside the actual V2 PM2 CWD.
[[ -w "$LIVE" && ! -L "$LIVE/.next" ]] || {
  echo "STOP: cannot atomically switch the compiled Next build inside: $LIVE"
  echo 'No chmod/chown/sudo was attempted. Check the ownership of this exact frontend directory.'
  exit 4
}

# Run the real QR normalizer regression in a tiny private, patched source copy
# during --check. This catches V2 code drift before any full build or install.
PREFLIGHT="$TMP/preflight"
mkdir -p "$PREFLIGHT"
for rel in package.json src/server/normalize.ts src/domain/model.ts \
  'app/table/[tableId]/page.tsx' app/page.tsx 'app/api/health/route.ts'; do
  mkdir -p "$PREFLIGHT/$(dirname "$rel")"
  cp -p "$LIVE/$rel" "$PREFLIGHT/$rel"
done
if [[ -f "$LIVE/app/CustomerMenuRoute.tsx" ]]; then
  cp -p "$LIVE/app/CustomerMenuRoute.tsx" "$PREFLIGHT/app/CustomerMenuRoute.tsx"
fi
if [[ -f "$LIVE/src/runtime/components/PmdGuestTableInactiveR17.tsx" ]]; then
  mkdir -p "$PREFLIGHT/src/runtime/components"
  cp -p "$LIVE/src/runtime/components/PmdGuestTableInactiveR17.tsx" \
    "$PREFLIGHT/src/runtime/components/PmdGuestTableInactiveR17.tsx"
fi
ln -s "$LIVE/node_modules" "$PREFLIGHT/node_modules"
python3 "$TMP/v2-guard.py" --stage "$PREFLIGHT" "$TMP/preflight-manifest"
node "$TMP/test-v2.cjs" "$PREFLIGHT"

# Even if the top-level V2 directory is writable, verify every intended
# source change before attempting the production switch.
while IFS= read -r rel; do
  [[ -n "$rel" && "$rel" != /* && "$rel" != *..* ]] || { echo 'STOP: unsafe source path'; exit 4; }
  [[ ! -L "$LIVE/$rel" ]] || { echo "STOP: symlink target: $rel"; exit 4; }
  if [[ -e "$LIVE/$rel" ]]; then
    [[ -f "$LIVE/$rel" && -w "$LIVE/$rel" ]] || {
      echo "STOP: source is not writable: $LIVE/$rel"; exit 4;
    }
  else
    [[ -d "$LIVE/$(dirname "$rel")" && -w "$LIVE/$(dirname "$rel")" ]] || {
      echo "STOP: cannot create source file: $LIVE/$rel"; exit 4;
    }
  fi
done < "$TMP/preflight-manifest"

if [[ "$MODE" == "--check" ]]; then
  echo 'PREFLIGHT PASS R17B: V2 code, QR test cases and exact live write permissions verified.'
  echo 'No live source, .next, tenant data or PM2 process was changed.'
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

# PMD_R17E_SAFE_INTERNAL_SYMLINK_COPY
# Next.js 16 Turbopack requires node_modules to remain INSIDE its project root.
# The previous -aL fixed the Turbopack root panic but dereferenced the vital
# .bin/next -> ../next/dist/bin/next link into a regular file. The CLI then
# incorrectly resolved ../server/require-hook relative to node_modules/.bin.
# Keep internal relative symlinks intact, and materialize only links that
# escape the transferred node_modules tree.
echo '== COPY ISOLATED DEPENDENCIES (PRESERVE INTERNAL NEXT .bin LINKS) =='
mkdir -p "$WORK/node_modules"
rsync -a --copy-unsafe-links "$LIVE/node_modules/" "$WORK/node_modules/"
[[ ! -L "$WORK/node_modules" &&
   -f "$WORK/node_modules/next/package.json" &&
   -f "$WORK/node_modules/typescript/package.json" ]] || {
  echo 'STOP: isolated V2 Next dependencies missing after staged copy.'
  exit 5
}
# Symlinks ARE valid when they resolve to existing files WITHIN the staged
# project; reject broken/external links before Turbopack is invoked.
find "$WORK" -type l -print0 | python3 -c '
import os
import sys
root = os.path.realpath(sys.argv[1])
checked = 0
for raw in sys.stdin.buffer.read().split(b"\0"):
    if not raw:
        continue
    link = os.fsdecode(raw)
    target = os.path.realpath(link)
    if os.path.commonpath((root, target)) != root or not os.path.exists(target):
        sys.stderr.write("STOP R17E: broken/outside staged symlink: " + link + " -> " + target + "\n")
        sys.exit(5)
    checked += 1
print("PASS R17E: " + str(checked) + " internal staged symlinks verified.")
' "$WORK"
node - "$WORK" <<'NODE'
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(process.argv[2])
for (const name of ['next/package.json', 'typescript/package.json']) {
  const file = require.resolve(name, { paths: [root] })
  const resolved = fs.realpathSync(file)
  if (!resolved.startsWith(path.join(root, 'node_modules') + path.sep)) {
    throw new Error('R17E dependency escaped isolated project: ' + resolved)
  }
}
const bin = path.join(root, 'node_modules/.bin/next')
if (!fs.existsSync(bin)) {
  throw new Error('R17E Next CLI missing in node_modules/.bin')
}
if (!fs.realpathSync(bin).startsWith(path.join(root, 'node_modules') + path.sep)) {
  throw new Error('R17E Next CLI resolved outside staged node_modules')
}
console.log('PASS R17E: Next, TypeScript and Next CLI resolve inside isolated build.')
NODE
# Exercise Next's REAL CLI before npm run build. This catches exactly the
# '../server/require-hook' error that escaped the earlier source-only check.
(cd "$WORK" && ./node_modules/.bin/next --version)
echo 'PASS R17E: staged Next CLI works before Turbopack build.'

MANIFEST="$TMP/manifest"
python3 "$TMP/v2-guard.py" --stage "$WORK" "$MANIFEST"
node "$TMP/test-v2.cjs" "$WORK"
(cd "$WORK" && NEXT_TELEMETRY_DISABLED=1 npm run build)
[[ -s "$WORK/.next/BUILD_ID" && -d "$WORK/.next/static" ]] || {
  echo 'STOP: staged Next production build incomplete'; exit 5;
}
node "$TMP/test-v2.cjs" "$WORK"

# Copy the complete new compiled build into a sibling of .next BEFORE the
# production switch. Renames below stay on the V2 filesystem and are fast.
# Moving the build from HOME directly to LIVE could instead cross devices
# and expose a partially copied .next to the running process.
echo '== STAGE VERIFIED COMPILED OUTPUT NEXT TO THE ACTIVE .next =='
READY_BUILD="$(mktemp -d -p "$LIVE" .next.pmd-r17-ready-XXXXXXXX)"
rsync -a "$WORK/.next/" "$READY_BUILD/"
chmod --reference="$LIVE/.next" "$READY_BUILD"
[[ -s "$READY_BUILD/BUILD_ID" && -d "$READY_BUILD/static" ]] || {
  echo 'STOP: local prepared Next build incomplete'; exit 5;
}
cmp -s "$WORK/.next/BUILD_ID" "$READY_BUILD/BUILD_ID" || {
  echo 'STOP: copied compiled build ID differs'; exit 5;
}
OLD_BUILD="$LIVE/.next.pmd-r17-old-$(date +%Y%m%d_%H%M%S)-$(id -u)"
[[ ! -e "$OLD_BUILD" ]] || { echo 'STOP: previous build backup path already exists'; exit 5; }

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
printf '%s\n' "$OLD_BUILD" > "$BACKUP/old-build-path"
cat > "$BACKUP/rollback.sh" <<'ROLLBACK'
#!/usr/bin/env bash
set -Eeuo pipefail
B="$(cd "$(dirname "$0")" && pwd -P)"
LIVE="$(cat "$B/live-root")"
SERVICE="$(cat "$B/pm2-service")"
OLD_BUILD="$(cat "$B/old-build-path")"
[[ "$OLD_BUILD" == "$LIVE"/.next.pmd-r17-old-* ]] || { echo 'STOP: unexpected old build path'; exit 2; }
[[ -d "$OLD_BUILD" && -d "$LIVE/.next" && -w "$LIVE" ]] || {
  echo 'STOP: previous or current Next build missing/unwritable'; exit 2;
}
FAILED="$LIVE/.next.pmd-r17-replaced-$(date +%Y%m%d_%H%M%S)-$(id -u)"
[[ ! -e "$FAILED" ]] || { echo 'STOP: replacement backup path exists'; exit 2; }
mv "$LIVE/.next" "$FAILED"
if ! mv "$OLD_BUILD" "$LIVE/.next"; then
  mv "$FAILED" "$LIVE/.next" || true
  echo 'STOP: could not restore previous compiled build'
  exit 3
fi
while IFS="$(printf '\t')" read -r kind rel; do
  if [[ "$kind" == E ]]; then cp -p "$B/originals/$rel" "$LIVE/$rel"
  elif [[ "$kind" == N ]]; then rm -f -- "$LIVE/$rel"
  fi
done < "$B/files"
pm2 reload "$SERVICE" --update-env
echo 'Previous V2 frontend source and compiled build restored.'
echo "Displaced R17 build saved at: $FAILED"
ROLLBACK
chmod 700 "$BACKUP/rollback.sh"

echo '== ACTIVATE COMPILED V2 AND RELOAD ONLY ITS EXACT PM2 SERVICE =='
MUTATING=1
while IFS= read -r rel; do
  [[ -n "$rel" ]] || continue
  mkdir -p "$LIVE/$(dirname "$rel")"
  cp "$WORK/$rel" "$LIVE/$rel"
done < "$MANIFEST"
mv "$LIVE/.next" "$OLD_BUILD"
MOVED_BUILD=1
mv "$READY_BUILD" "$LIVE/.next"
READY_BUILD=""
NEW_BUILD=1
pm2 reload "$SERVICE" --update-env

# PMD_R17F_HEALTH_READINESS_GATE
# PM2 'online' is not HTTP readiness. A Next 16 SSR process can take several
# seconds to bind port 3002 after reload. Require two consecutive responses
# from the NEW compiled QR guard build, not merely the old service's health.
# Never roll back because of one immediate ECONNREFUSED.
ATTEMPTS=45
STREAK=0
READY=0
echo '== WAIT FOR REAL R17F V2 HTTP READINESS (up to 90 seconds) =='
for ((attempt=1;attempt<=ATTEMPTS;attempt++)); do
  RAW_HEALTH="$(curl -fsS --connect-timeout 2 --max-time 4 \
    http://127.0.0.1:3002/api/health 2>/dev/null)" || RAW_HEALTH=""
  if [[ -n "$RAW_HEALTH" ]] && printf '%s' "$RAW_HEALTH" | node "$TMP/health-identity.cjs" >/dev/null 2>&1; then
    STREAK=$((STREAK+1))
    if [[ "$STREAK" -ge 2 ]]; then
      if pm2 jlist | node -e '
let s="";process.stdin.on("data",x=>s+=x).on("end",()=>{
  let rows=[];try{rows=JSON.parse(s)}catch(e){process.exit(2)}
  const p=rows.filter(x=>x.name===process.argv[1]);
  if(p.length!==1 || p[0].pm2_env?.status!=="online")process.exit(1);
  console.log("PASS R17F: exact V2 PM2 process remains online:",p[0].name);
});' "$SERVICE"; then
        READY=1
        break
      fi
      STREAK=0
    fi
  else
    STREAK=0
  fi
  if (( attempt % 5 == 0 )); then
    echo "R17F V2 readiness: attempt $attempt/$ATTEMPTS; waiting for exact new build..."
  fi
  if [[ "$attempt" -lt "$ATTEMPTS" ]]; then sleep 2; fi
done

if [[ "$READY" != 1 ]]; then
  echo 'STOP R17F: Next.js did not report two consecutive verified NEW-build health responses.'
  echo 'The installer will restore the original V2 sources and previous compiled .next.'
  pm2 describe "$SERVICE" || true
  exit 6
fi
echo 'PASS R17F: reloaded V2 HTTP health matches the new guarded QR build.'
COMPLETED=1
echo 'SUCCESS R17 V2: disabled/unverified table QR blocked in actual running Frontend V2.'
echo "SOURCE BACKUP: $BACKUP"
echo "PREVIOUS NEXT BUILD: $OLD_BUILD"
echo "ROLLBACK: bash $BACKUP/rollback.sh"
echo 'FINAL BROWSER QA: test one disabled table QR, one enabled table QR and kiosk.'
