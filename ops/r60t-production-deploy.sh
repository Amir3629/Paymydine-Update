#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

# PayMyDine R60T production deploy helper.
# Runtime source is pinned to the immutable commit below.
# This helper deploys exactly six non-payment runtime files.

REPO="Amir3629/Paymydine-Update"
BASE_SHA="ea531a201954bae5e812aaaded8255ffdcee31a9"
DEPLOY_SHA="3fa35813cc770849e08a43e9606a366fef37f6d0"
APP_ROOT="${APP_ROOT:-/var/www/paymydine}"
FRONTEND_REL="frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
FRONTEND_DIR="$APP_ROOT/$FRONTEND_REL"
RAW_BASE="https://raw.githubusercontent.com/$REPO/$BASE_SHA"
RAW_DEPLOY="https://raw.githubusercontent.com/$REPO/$DEPLOY_SHA"

FILES=(
  "app/main/routes/api-health-media.php"
  "app/main/routes/api-v1-guest-order-flow-r60t.php"
  "$FRONTEND_REL/src/lib/guest-order-flow-r60t.ts"
  "$FRONTEND_REL/src/runtime/SmartMenuRuntimeContext.tsx"
  "$FRONTEND_REL/src/runtime/components/OrderingRuntimeOverlaysR60T.tsx"
  "$FRONTEND_REL/tsconfig.json"
)

TS="$(date +%Y%m%d_%H%M%S)"
BACKUP="/root/paymydine-deploy-backups/ordering-r60t-$TS"
STAGE_PARENT="$(dirname "$FRONTEND_DIR")"
STAGE_ROOT=""
DESIRED=""
BASELINE=""
STAGED_FRONT=""
MUTATED=0
HAD_NEXT=0
OLD_NEXT=""
FRONTEND_RESTART_CMD="${FRONTEND_RESTART_CMD:-}"

say() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok() { printf '\033[1;32m[OK]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31m[STOP]\033[0m %s\n' "$*" >&2; exit 1; }

cleanup_stage() {
  if [[ -n "${STAGE_ROOT:-}" && -d "$STAGE_ROOT" ]]; then
    rm -rf -- "$STAGE_ROOT"
  fi
}

restart_frontend() {
  [[ -n "$FRONTEND_RESTART_CMD" ]] || return 0
  say "Restarting Frontend V2"
  bash -lc "$FRONTEND_RESTART_CMD"
}

reload_php() {
  command -v systemctl >/dev/null 2>&1 || return 0
  local units=""
  units="$(systemctl list-units --type=service --state=running --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]*-fpm\.service$/ {print $1}')"
  if [[ -n "$units" ]]; then
    while read -r unit; do
      [[ -z "$unit" ]] && continue
      say "Reloading $unit"
      systemctl reload "$unit" 2>/dev/null || systemctl restart "$unit"
    done <<< "$units"
  fi
}

rollback() {
  set +e
  echo
  echo "============================================================"
  echo " AUTOMATIC ROLLBACK"
  echo "============================================================"

  if [[ -d "$BACKUP/files" ]]; then
    for f in "${FILES[@]}"; do
      if [[ -f "$BACKUP/files/$f" ]]; then
        mkdir -p "$(dirname "$APP_ROOT/$f")"
        cp -a "$BACKUP/files/$f" "$APP_ROOT/$f"
        echo "RESTORED: $f"
      else
        rm -f "$APP_ROOT/$f"
        echo "REMOVED NEW FILE: $f"
      fi
    done
  fi

  if [[ "$HAD_NEXT" -eq 1 && -n "$OLD_NEXT" && -d "$OLD_NEXT" ]]; then
    rm -rf "$FRONTEND_DIR/.next"
    mv "$OLD_NEXT" "$FRONTEND_DIR/.next"
    echo "RESTORED: previous Frontend V2 .next"
  elif [[ "$HAD_NEXT" -eq 0 ]]; then
    rm -rf "$FRONTEND_DIR/.next"
  fi

  if [[ -f "$APP_ROOT/artisan" ]]; then
    (cd "$APP_ROOT" && php artisan optimize:clear >/dev/null 2>&1) || true
  fi

  reload_php || true
  restart_frontend || true
  cleanup_stage || true
  echo "ROLLBACK COMPLETE."
}

on_error() {
  local rc=$?
  local line="${1:-unknown}"
  echo
  echo "[ERROR] Deployment failed near line: $line"
  if [[ "$MUTATED" -eq 1 ]]; then
    rollback
  else
    cleanup_stage || true
    echo "Production was NOT modified."
  fi
  exit "$rc"
}
trap 'on_error $LINENO' ERR

say "Preflight"
[[ "$EUID" -eq 0 ]] || die "Run as root: sudo -i"
for cmd in curl php node npm tar sha256sum cmp stat install; do
  command -v "$cmd" >/dev/null 2>&1 || die "$cmd is required"
done
[[ -f "$APP_ROOT/artisan" ]] || die "Laravel root not found at $APP_ROOT (artisan missing)"
[[ -f "$FRONTEND_DIR/package.json" ]] || die "Frontend V2 not found at $FRONTEND_DIR"
mkdir -p "$STAGE_PARENT"
STAGE_ROOT="$(mktemp -d "$STAGE_PARENT/.pmd-r60t-stage.XXXXXX")"
DESIRED="$STAGE_ROOT/desired"
BASELINE="$STAGE_ROOT/baseline"
STAGED_FRONT="$STAGE_ROOT/frontend"
mkdir -p "$DESIRED" "$BASELINE"

node -e 'const [a,b]=process.versions.node.split(".").map(Number); if(a<20||(a===20&&b<11)){console.error("Node >=20.11 required; current="+process.versions.node); process.exit(1)}'
ok "Laravel root: $APP_ROOT"
ok "Frontend V2: $FRONTEND_DIR"
ok "Node: $(node -v)"
ok "PHP: $(php -r 'echo PHP_VERSION;')"

say "Checking protected payment boundary"
for f in "${FILES[@]}"; do
  case "$f" in
    *payments/*|*payment-provider*|*coupon*|*tips/*|*invoice*) die "Protected path unexpectedly present: $f" ;;
  esac
done
ok "Deployment list contains only the intended six ordering/runtime files"

say "Detecting Frontend V2 restart authority before changing production"
if [[ -z "$FRONTEND_RESTART_CMD" ]] && command -v ss >/dev/null 2>&1 && command -v systemctl >/dev/null 2>&1; then
  PORT_PID="$(ss -ltnp 'sport = :3002' 2>/dev/null | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' | head -n1 || true)"
  if [[ -n "${PORT_PID:-}" ]]; then
    UNIT="$(ps -o unit= -p "$PORT_PID" 2>/dev/null | xargs || true)"
    if [[ "$UNIT" == *.service && "$UNIT" != user@*.service ]]; then
      FRONTEND_RESTART_CMD="systemctl restart $UNIT"
      ok "Detected systemd frontend service: $UNIT"
    fi
  fi
fi

if [[ -z "$FRONTEND_RESTART_CMD" ]]; then
  echo
  echo "Could not safely identify the Frontend V2 restart command."
  echo "Production has NOT been modified."
  echo
  echo "Find the process manager, then rerun with one of these forms:"
  echo "  APP_ROOT=/var/www/paymydine FRONTEND_RESTART_CMD='systemctl restart YOUR_SERVICE.service' $0"
  echo "  APP_ROOT=/var/www/paymydine FRONTEND_RESTART_CMD='sudo -u ubuntu pm2 restart YOUR_APP' $0"
  exit 2
fi
ok "Restart command: $FRONTEND_RESTART_CMD"

say "Downloading exact immutable source files"
for f in "${FILES[@]}"; do
  mkdir -p "$DESIRED/$(dirname "$f")" "$BASELINE/$(dirname "$f")"
  echo "GET desired: $f"
  curl -fL --retry 3 --retry-delay 1 --connect-timeout 15 "$RAW_DEPLOY/$f" -o "$DESIRED/$f"
  [[ -s "$DESIRED/$f" ]] || die "Downloaded file is empty: $f"
  if ! curl -fsL --retry 2 --connect-timeout 15 "$RAW_BASE/$f" -o "$BASELINE/$f" 2>/dev/null; then
    rm -f "$BASELINE/$f"
  fi
done
ok "Downloaded all six files from $DEPLOY_SHA"

say "Checking source markers and anti-patch guard"
grep -q 'PMD_ORDERING_FLOW_REVOLUTION_R60T' "$DESIRED/app/main/routes/api-v1-guest-order-flow-r60t.php"
grep -q '/guest-orders/prepare' "$DESIRED/$FRONTEND_REL/src/lib/guest-order-flow-r60t.ts"
grep -q 'OrderingRuntimeOverlaysR60T' "$DESIRED/$FRONTEND_REL/tsconfig.json"
if grep -R -n 'MutationObserver' "$DESIRED"; then
  die "MutationObserver found in deployment set"
fi
ok "R60T markers present and no MutationObserver found"

say "Auditing current live authority"
CONFLICT=0
for f in "${FILES[@]}"; do
  LIVE="$APP_ROOT/$f"
  WANT="$DESIRED/$f"
  BASE="$BASELINE/$f"
  echo
  echo "--- $f"
  if [[ -L "$LIVE" ]]; then
    echo "CONFLICT: live target is a symlink"
    CONFLICT=1
  elif [[ -f "$LIVE" ]] && cmp -s "$LIVE" "$WANT"; then
    echo "ALREADY DESIRED"
  elif [[ -f "$BASE" && -f "$LIVE" ]] && cmp -s "$LIVE" "$BASE"; then
    echo "SAFE: live matches PR base"
  elif [[ ! -f "$BASE" && ! -e "$LIVE" ]]; then
    echo "SAFE: new file"
  else
    echo "CONFLICT: live differs from both PR base and desired"
    [[ -f "$LIVE" ]] && { echo "LIVE:"; sha256sum "$LIVE"; }
    [[ -f "$BASE" ]] && { echo "BASE:"; sha256sum "$BASE"; }
    echo "DESIRED:"; sha256sum "$WANT"
    CONFLICT=1
  fi
done
[[ "$CONFLICT" -eq 0 ]] || die "Live authority conflict detected. Nothing was deployed. Do not force overwrite."
ok "Live authority audit passed"

say "Validating PHP before production mutation"
php -l "$DESIRED/app/main/routes/api-health-media.php"
php -l "$DESIRED/app/main/routes/api-v1-guest-order-flow-r60t.php"
ok "PHP syntax passed"

say "Building staged copy of CURRENT LIVE Frontend V2 plus only R60T files"
mkdir -p "$STAGED_FRONT"
(cd "$FRONTEND_DIR" && tar --exclude='./node_modules' --exclude='./.next' --exclude='./.next.*' -cf - .) | (cd "$STAGED_FRONT" && tar -xf -)
for f in "${FILES[@]}"; do
  case "$f" in
    "$FRONTEND_REL"/*)
      REL="${f#"$FRONTEND_REL"/}"
      mkdir -p "$STAGED_FRONT/$(dirname "$REL")"
      cp "$DESIRED/$f" "$STAGED_FRONT/$REL"
      ;;
  esac
done

if [[ -d "$FRONTEND_DIR/node_modules" ]]; then
  ln -s "$FRONTEND_DIR/node_modules" "$STAGED_FRONT/node_modules"
  ok "Using live node_modules for staged verification"
else
  warn "Live node_modules not found; running npm ci in stage"
  (cd "$STAGED_FRONT" && npm ci --no-audit --no-fund)
fi

say "Running Frontend V2 verify before touching production"
(cd "$STAGED_FRONT" && npm run verify)
[[ -f "$STAGED_FRONT/.next/BUILD_ID" ]] || die "npm verify/build completed without .next/BUILD_ID"
STAGED_BUILD_ID="$(cat "$STAGED_FRONT/.next/BUILD_ID")"
ok "Frontend verify passed; BUILD_ID=$STAGED_BUILD_ID"

say "Creating backup"
mkdir -p "$BACKUP/files"
for f in "${FILES[@]}"; do
  if [[ -e "$APP_ROOT/$f" ]]; then
    mkdir -p "$BACKUP/files/$(dirname "$f")"
    cp -a "$APP_ROOT/$f" "$BACKUP/files/$f"
  else
    echo "$f" >> "$BACKUP/absent-before-deploy.txt"
  fi
done
printf '%s\n' "timestamp=$TS" "app_root=$APP_ROOT" "base_sha=$BASE_SHA" "deploy_sha=$DEPLOY_SHA" "frontend_restart_cmd=$FRONTEND_RESTART_CMD" "staged_build_id=$STAGED_BUILD_ID" > "$BACKUP/deploy-info.txt"
ok "Backup: $BACKUP"

say "Deploying exact six source files"
MUTATED=1
APP_UID="$(stat -c '%u' "$APP_ROOT/artisan")"
APP_GID="$(stat -c '%g' "$APP_ROOT/artisan")"
for f in "${FILES[@]}"; do
  install -D -m 0644 -o "$APP_UID" -g "$APP_GID" "$DESIRED/$f" "$APP_ROOT/$f"
  cmp -s "$APP_ROOT/$f" "$DESIRED/$f" || die "Post-copy mismatch: $f"
  echo "DEPLOYED: $f"
done
ok "Six source files deployed"

say "Switching Frontend V2 build"
if [[ -d "$FRONTEND_DIR/.next" ]]; then
  HAD_NEXT=1
  OLD_NEXT="$FRONTEND_DIR/.next.pmd-pre-r60t-$TS"
  mv "$FRONTEND_DIR/.next" "$OLD_NEXT"
  echo "$OLD_NEXT" > "$BACKUP/previous-next-path.txt"
fi
mv "$STAGED_FRONT/.next" "$FRONTEND_DIR/.next"
chown -R "$APP_UID:$APP_GID" "$FRONTEND_DIR/.next"
[[ "$(cat "$FRONTEND_DIR/.next/BUILD_ID")" == "$STAGED_BUILD_ID" ]] || die "Live BUILD_ID mismatch"
ok "Live BUILD_ID=$STAGED_BUILD_ID"

say "Refreshing Laravel and confirming R60T routes"
(cd "$APP_ROOT" && php artisan optimize:clear)
ROUTES="$(cd "$APP_ROOT" && php artisan route:list 2>&1)"
printf '%s\n' "$ROUTES" | grep -E 'guest-orders/(state|prepare)' || true
grep -q 'guest-orders/state' <<< "$ROUTES" || die "Missing route: guest-orders/state"
grep -q 'guest-orders/prepare' <<< "$ROUTES" || die "Missing route: guest-orders/prepare"
ok "Both guest-order routes registered"
reload_php
restart_frontend

say "Checking local Frontend V2 service on port 3002"
sleep 2
HTTP_CODE="$(curl -sS --max-time 12 -o "$BACKUP/frontend-local-response.txt" -w '%{http_code}' http://127.0.0.1:3002/ || true)"
echo "HTTP_CODE=$HTTP_CODE"
[[ -n "$HTTP_CODE" && "$HTTP_CODE" != "000" ]] || die "Frontend V2 is not responding on :3002"
(( 10#$HTTP_CODE < 500 )) || die "Frontend V2 returned HTTP $HTTP_CODE"
ok "Frontend responds on :3002 with HTTP $HTTP_CODE"

say "Final exact-file verification"
grep -q 'api-v1-guest-order-flow-r60t.php' "$APP_ROOT/app/main/routes/api-health-media.php"
grep -q '/guest-orders/prepare' "$FRONTEND_DIR/src/lib/guest-order-flow-r60t.ts"
grep -q 'OrderingRuntimeOverlaysR60T' "$FRONTEND_DIR/tsconfig.json"
for f in "${FILES[@]}"; do
  cmp -s "$APP_ROOT/$f" "$DESIRED/$f" || die "Final mismatch: $f"
done
ok "All six live source files match immutable deployment commit"

trap - ERR
cleanup_stage

echo
echo "============================================================"
echo " PAYMYDINE R60T ORDERING FLOW DEPLOYMENT SUCCESSFUL"
echo "============================================================"
echo "DEPLOY_SHA : $DEPLOY_SHA"
echo "BACKUP     : $BACKUP"
echo "BUILD_ID   : $STAGED_BUILD_ID"
[[ -n "$OLD_NEXT" && -d "$OLD_NEXT" ]] && echo "OLD .next   : $OLD_NEXT"
echo
echo "Next: perform real QR payment/kitchen/privacy/shared-bill E2E checks before deleting backups."
