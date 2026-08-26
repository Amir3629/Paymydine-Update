#!/usr/bin/env bash
set -Eeuo pipefail

APP=/var/www/paymydine
FE_REL=frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815
FE="$APP/$FE_REL"
REPO=Amir3629/Paymydine-Update
SHA=67ceed2ea92096a8826f8e5b2cbb1bf991418e73
RAW="https://raw.githubusercontent.com/$REPO/$SHA"
TS="$(date +%Y%m%d_%H%M%S)"
WORK="/tmp/pmd-r60t-final-$TS"
DESIRED="$WORK/desired"
STAGE="$WORK/frontend"
BACKUP="/root/paymydine-backup-r60t-final-$TS"

FILES=(
  app/main/routes/api-health-media.php
  app/main/routes/api-v1-guest-order-flow-r60t.php
  "$FE_REL/src/lib/guest-order-flow-r60t.ts"
  "$FE_REL/src/runtime/SmartMenuRuntimeContext.tsx"
  "$FE_REL/src/runtime/components/OrderingRuntimeOverlaysR60T.tsx"
  "$FE_REL/tsconfig.json"
)

say() { printf '\n==> %s\n' "$*"; }
fail() { printf '\n[STOP] %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || fail "Run with sudo/root"
[[ -f "$APP/artisan" ]] || fail "Missing $APP/artisan"
[[ -f "$FE/package.json" ]] || fail "Missing Frontend V2 at $FE"
command -v curl >/dev/null || fail "curl missing"
command -v php >/dev/null || fail "php missing"
command -v npm >/dev/null || fail "npm missing"
command -v tar >/dev/null || fail "tar missing"
command -v sudo >/dev/null || fail "sudo missing"

rm -rf "$WORK"
mkdir -p "$DESIRED" "$STAGE"
trap 'rm -rf "$WORK"' EXIT

say "Download final R60T six-file set ($SHA)"
for f in "${FILES[@]}"; do
  mkdir -p "$DESIRED/$(dirname "$f")"
  echo "GET $f"
  curl -fsSL --retry 3 "$RAW/$f" -o "$DESIRED/$f"
  [[ -s "$DESIRED/$f" ]] || fail "Empty download: $f"
done

say "Validate backend PHP"
php -l "$DESIRED/app/main/routes/api-health-media.php"
php -l "$DESIRED/app/main/routes/api-v1-guest-order-flow-r60t.php"

say "Confirm source-safety tokens"
if grep -R -n 'MutationObserver' "$DESIRED/$FE_REL/src"; then
  fail "Forbidden observer token exists in final source"
fi
if grep -n 'setInterval[[:space:]]*(' "$DESIRED/$FE_REL/src/runtime/SmartMenuRuntimeContext.tsx"; then
  fail "Second polling timer exists in Smart runtime"
fi

grep -q 'PMD_ORDERING_FLOW_REVOLUTION_R60T' "$DESIRED/app/main/routes/api-v1-guest-order-flow-r60t.php" || fail "Backend R60T marker missing"
grep -q 'OrderingRuntimeOverlaysR60T' "$DESIRED/$FE_REL/tsconfig.json" || fail "Runtime overlay alias missing"

say "Stage CURRENT live frontend plus final R60T files"
(cd "$FE" && tar --exclude='./node_modules' --exclude='./.next' --exclude='./.next.*' -cf - .) | (cd "$STAGE" && tar -xf -)

for f in "${FILES[@]}"; do
  case "$f" in
    "$FE_REL"/*)
      rel="${f#"$FE_REL"/}"
      mkdir -p "$STAGE/$(dirname "$rel")"
      cp "$DESIRED/$f" "$STAGE/$rel"
      ;;
  esac
done

if [[ -d "$FE/node_modules" ]]; then
  ln -s "$FE/node_modules" "$STAGE/node_modules"
else
  fail "Live frontend node_modules is missing"
fi
chown -R ubuntu:ubuntu "$STAGE"

say "Run full Frontend V2 verify BEFORE production mutation"
sudo -u ubuntu bash -lc "cd '$STAGE' && npm run verify"
[[ -f "$STAGE/.next/BUILD_ID" ]] || fail "Build finished without .next/BUILD_ID"
BUILD_ID="$(cat "$STAGE/.next/BUILD_ID")"
echo "Verified BUILD_ID=$BUILD_ID"

say "Backup current six files and current build"
mkdir -p "$BACKUP/files"
for f in "${FILES[@]}"; do
  if [[ -e "$APP/$f" ]]; then
    mkdir -p "$BACKUP/files/$(dirname "$f")"
    cp -a "$APP/$f" "$BACKUP/files/$f"
  fi
done
if [[ -d "$FE/.next" ]]; then
  cp -a "$FE/.next" "$BACKUP/next"
fi
printf 'sha=%s\nbuild_id=%s\n' "$SHA" "$BUILD_ID" > "$BACKUP/info.txt"
echo "Backup: $BACKUP"

say "Install final six source files"
for f in "${FILES[@]}"; do
  mkdir -p "$APP/$(dirname "$f")"
  cp "$DESIRED/$f" "$APP/$f"
  chmod 0644 "$APP/$f"
done
chown ubuntu:ubuntu \
  "$FE/src/lib/guest-order-flow-r60t.ts" \
  "$FE/src/runtime/SmartMenuRuntimeContext.tsx" \
  "$FE/src/runtime/components/OrderingRuntimeOverlaysR60T.tsx" \
  "$FE/tsconfig.json"

say "Install verified frontend build"
rm -rf "$FE/.next"
mv "$STAGE/.next" "$FE/.next"
chown -R ubuntu:ubuntu "$FE/.next"
[[ "$(cat "$FE/.next/BUILD_ID")" == "$BUILD_ID" ]] || fail "Live BUILD_ID mismatch"

say "Refresh Laravel"
cd "$APP"
php artisan optimize:clear
systemctl reload php8.3-fpm 2>/dev/null || true

say "Verify R60T backend routes"
ROUTES="$(php artisan route:list --path=guest-orders 2>&1)"
printf '%s\n' "$ROUTES"
grep -q 'guest-orders/state' <<< "$ROUTES" || fail "guest-orders/state missing"
grep -q 'guest-orders/prepare' <<< "$ROUTES" || fail "guest-orders/prepare missing"

say "Restart ONLY paymydine-frontend-v2"
sudo -u ubuntu bash -lc 'pm2 restart paymydine-frontend-v2 --update-env && pm2 save'

sleep 3
say "Health check :3002"
CODE="$(curl -sS --max-time 12 -o /dev/null -w '%{http_code}' http://127.0.0.1:3002/ || true)"
echo "HTTP=$CODE"
[[ "$CODE" != 000 && -n "$CODE" ]] || fail "Frontend V2 is not responding on port 3002"
[[ "$CODE" -lt 500 ]] || fail "Frontend V2 returned HTTP $CODE"

say "Final source verification"
for f in "${FILES[@]}"; do
  cmp -s "$APP/$f" "$DESIRED/$f" || fail "Mismatch after deploy: $f"
done

sudo -u ubuntu bash -lc 'pm2 status paymydine-frontend-v2'

echo
echo "R60T FINAL DEPLOY COMPLETE"
echo "SHA=$SHA"
echo "BUILD_ID=$BUILD_ID"
echo "BACKUP=$BACKUP"
