#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
BASE_SHA="68ccb74b9aa45e08f82504fea75c69526759bb04"
RELEASE_SHA="0d182f525a14bfbc1a60a107855eee0824d19b20"
V2_REL="frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
V2_ROOT="$PMD_ROOT/$V2_REL"
PM2_USER="ubuntu"
PM2_SERVICE="paymydine-frontend-v2"
PMD_PORT="3002"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
SOURCE="/var/tmp/pmd-quicksetup-v1-${RELEASE_SHA:0:12}-${STAMP}"
BACKUP="$PMD_ROOT/storage/pmd-quicksetup-v1-backups/$STAMP"
ACTIVATION_STARTED=0

log() { printf '\n[PMD QUICK SETUP V1] %s\n' "$*"; }
fail() { printf '\nDEPLOY REFUSED: %s\n' "$*" >&2; exit 2; }

RUNTIME_FILES=(
  "app/admin/Services/PmdStarterMenuLibraryV1.php"
  "app/admin/Services/PmdTenantQuickSetupService.php"
  "app/admin/assets/css/pmd-onboarding-welcome-v1.css"
  "app/admin/assets/css/pmd-tenant-quick-setup-v1.css"
  "app/admin/assets/js/pmd-onboarding-welcome-v1.js"
  "app/admin/assets/js/pmd-tenant-quick-setup-v1.js"
  "app/admin/controllers/Pmdquicksetup.php"
  "app/admin/views/_meta/assets.json"
  "app/admin/views/pmdquicksetup/index.blade.php"
  "$V2_REL/app/page.tsx"
  "$V2_REL/src/runtime/components/TenantSetupWelcome.module.css"
  "$V2_REL/src/runtime/components/TenantSetupWelcome.tsx"
)

ugit() {
  sudo -u "$PM2_USER" -H git -C "$PMD_ROOT" "$@"
}

cleanup_source() {
  if [[ -d "$SOURCE" ]]; then
    sudo -u "$PM2_USER" -H git -C "$PMD_ROOT" worktree remove --force "$SOURCE" >/dev/null 2>&1 || rm -rf "$SOURCE"
  fi
}

rollback_activation() {
  set +e
  log "Activation failed. Restoring previous production code/build from $BACKUP"

  if [[ -f "$BACKUP/new-files.txt" ]]; then
    while IFS= read -r rel; do
      [[ -n "$rel" ]] && rm -f "$PMD_ROOT/$rel"
    done < "$BACKUP/new-files.txt"
  fi

  [[ -d "$BACKUP/files" ]] && cp -a "$BACKUP/files/." "$PMD_ROOT/"

  rm -rf "$V2_ROOT/.next"
  [[ -d "$BACKUP/next.previous" ]] && mv "$BACKUP/next.previous" "$V2_ROOT/.next"

  cd "$PMD_ROOT"
  php artisan optimize:clear >/dev/null 2>&1 || true
  systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
  sudo -u "$PM2_USER" -H pm2 restart "$PM2_SERVICE" --update-env >/dev/null 2>&1 || true

  log "Automatic CODE rollback finished. Tenant data created by a manual Quick Setup test is intentionally not deleted."
}

on_exit() {
  rc=$?
  trap - EXIT
  if [[ "$rc" -ne 0 && "$ACTIVATION_STARTED" -eq 1 ]]; then
    rollback_activation
  fi
  cleanup_source
  exit "$rc"
}
trap on_exit EXIT

[[ "$EUID" -eq 0 ]] || fail "Run with sudo/root. Example: sudo bash /tmp/pmd-quicksetup-v1-production-test.sh"

for cmd in git php node npm curl sudo systemctl; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Missing required command: $cmd"
done

[[ -d "$PMD_ROOT/.git" && -f "$PMD_ROOT/artisan" ]] || fail "$PMD_ROOT is not the live PayMyDine worktree"
[[ -f "$V2_ROOT/package.json" ]] || fail "Frontend V2 directory is missing: $V2_ROOT"

log "Checking exact clean production baseline"
LIVE_SHA="$(ugit rev-parse HEAD)"
[[ "$LIVE_SHA" == "$BASE_SHA" ]] || fail "Live HEAD is $LIVE_SHA; expected $BASE_SHA. Do not force this deployment."
[[ -z "$(ugit status --porcelain --untracked-files=no)" ]] || fail "Live worktree has tracked modifications. Sync/audit them before deployment."

log "Checking current V2 process"
PM2_JSON="$(sudo -u "$PM2_USER" -H pm2 jlist)"
PM2_CWD="$(printf '%s' "$PM2_JSON" | PM2_SERVICE="$PM2_SERVICE" php -r '$j=json_decode(stream_get_contents(STDIN),true); foreach($j?:[] as $p){if(($p["name"]??"")===getenv("PM2_SERVICE")){echo $p["pm2_env"]["pm_cwd"]??""; exit;}}')"
PM2_STATUS="$(printf '%s' "$PM2_JSON" | PM2_SERVICE="$PM2_SERVICE" php -r '$j=json_decode(stream_get_contents(STDIN),true); foreach($j?:[] as $p){if(($p["name"]??"")===getenv("PM2_SERVICE")){echo $p["pm2_env"]["status"]??""; exit;}}')"
[[ "$PM2_CWD" == "$V2_ROOT" ]] || fail "PM2 cwd is '$PM2_CWD'; expected '$V2_ROOT'"
[[ "$PM2_STATUS" == "online" ]] || fail "PM2 service $PM2_SERVICE is not online"
curl --fail --silent --show-error "http://127.0.0.1:$PMD_PORT/api/health" >/dev/null || fail "Existing V2 health check failed"

log "Fetching immutable Quick Setup release $RELEASE_SHA"
ugit fetch origin "$RELEASE_SHA"
ugit merge-base --is-ancestor "$BASE_SHA" "$RELEASE_SHA" || fail "Release is not based on expected main baseline"
ugit diff --check "$BASE_SHA...$RELEASE_SHA"

log "Creating isolated release worktree"
sudo -u "$PM2_USER" -H git -C "$PMD_ROOT" worktree add --detach "$SOURCE" "$RELEASE_SHA" >/dev/null

for rel in "${RUNTIME_FILES[@]}"; do
  [[ -f "$SOURCE/$rel" ]] || fail "Release file missing: $rel"
done

log "PHP and JSON preflight"
php -l "$SOURCE/app/admin/Services/PmdStarterMenuLibraryV1.php" >/dev/null
php -l "$SOURCE/app/admin/Services/PmdTenantQuickSetupService.php" >/dev/null
php -l "$SOURCE/app/admin/controllers/Pmdquicksetup.php" >/dev/null
php -r 'json_decode(file_get_contents($argv[1]), true, 512, JSON_THROW_ON_ERROR); echo "assets.json OK\n";' "$SOURCE/app/admin/views/_meta/assets.json"

grep -q 'pmd-onboarding-welcome-v1.css' "$SOURCE/app/admin/views/_meta/assets.json" || fail "Onboarding CSS is not registered"
grep -q 'pmd-onboarding-welcome-v1.js' "$SOURCE/app/admin/views/_meta/assets.json" || fail "Onboarding JS is not registered"
grep -q 'PMD_TENANT_QUICK_SETUP_V1' "$SOURCE/app/admin/Services/PmdTenantQuickSetupService.php" || fail "Quick Setup service marker missing"

V2_SOURCE="$SOURCE/$V2_REL"
[[ -d "$V2_ROOT/node_modules" ]] || fail "Live V2 node_modules is missing; refusing dependency mutation"

log "Preparing isolated V2 audit/build"
cp -al "$V2_ROOT/node_modules" "$V2_SOURCE/node_modules"
for envfile in .env .env.local .env.production; do
  [[ -f "$V2_ROOT/$envfile" ]] && cp -a "$V2_ROOT/$envfile" "$V2_SOURCE/$envfile"
done

(
  cd "$V2_SOURCE"
  sudo -u "$PM2_USER" -H npm run release:audit
  sudo -u "$PM2_USER" -H npm run build
)
[[ -d "$V2_SOURCE/.next" ]] || fail "V2 build did not create .next"

log "PRE-DEPLOY PASS. Production files are still unchanged."
mkdir -p "$BACKUP/files"
printf '%s\n' "$BASE_SHA" > "$BACKUP/base-sha.txt"
printf '%s\n' "$RELEASE_SHA" > "$BACKUP/release-sha.txt"
printf '%s\n' "${RUNTIME_FILES[@]}" > "$BACKUP/runtime-files.txt"
: > "$BACKUP/new-files.txt"

log "Backing up every production file that will change"
for rel in "${RUNTIME_FILES[@]}"; do
  if [[ -f "$PMD_ROOT/$rel" ]]; then
    mkdir -p "$BACKUP/files/$(dirname "$rel")"
    cp -a "$PMD_ROOT/$rel" "$BACKUP/files/$rel"
  else
    printf '%s\n' "$rel" >> "$BACKUP/new-files.txt"
  fi
done

cat > "$BACKUP/rollback.sh" <<'ROLLBACK'
#!/usr/bin/env bash
set -Eeuo pipefail
PMD_ROOT="/var/www/paymydine"
V2_ROOT="$PMD_ROOT/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
PM2_USER="ubuntu"
PM2_SERVICE="paymydine-frontend-v2"
PMD_PORT="3002"
BACKUP="$(cd "$(dirname "$0")" && pwd)"
[[ "$EUID" -eq 0 ]] || { echo "Run rollback with sudo/root" >&2; exit 2; }
if [[ -f "$BACKUP/new-files.txt" ]]; then
  while IFS= read -r rel; do [[ -n "$rel" ]] && rm -f "$PMD_ROOT/$rel"; done < "$BACKUP/new-files.txt"
fi
cp -a "$BACKUP/files/." "$PMD_ROOT/"
rm -rf "$V2_ROOT/.next"
[[ -d "$BACKUP/next.previous" ]] && mv "$BACKUP/next.previous" "$V2_ROOT/.next"
cd "$PMD_ROOT"
php artisan optimize:clear >/dev/null 2>&1 || true
systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
sudo -u "$PM2_USER" -H pm2 restart "$PM2_SERVICE" --update-env
for attempt in 1 2 3 4 5 6; do
  if curl --fail --silent --show-error "http://127.0.0.1:$PMD_PORT/api/health" >/dev/null; then
    echo "Rollback health PASS"
    echo "CODE/BUILD rollback complete. Test-tenant data was not deleted."
    exit 0
  fi
  sleep 2
done
echo "Rollback files restored, but V2 health did not recover" >&2
exit 1
ROLLBACK
chmod 700 "$BACKUP/rollback.sh"

ACTIVATION_STARTED=1

log "Activating reviewed runtime files"
if [[ -d "$V2_ROOT/.next" ]]; then
  mv "$V2_ROOT/.next" "$BACKUP/next.previous"
fi

for rel in "${RUNTIME_FILES[@]}"; do
  mkdir -p "$PMD_ROOT/$(dirname "$rel")"
  cp -a "$SOURCE/$rel" "$PMD_ROOT/$rel"
done
cp -a "$V2_SOURCE/.next" "$V2_ROOT/.next"

cd "$PMD_ROOT"
php artisan optimize:clear >/dev/null
systemctl is-active --quiet php8.3-fpm && systemctl reload php8.3-fpm || true
sudo -u "$PM2_USER" -H pm2 restart "$PM2_SERVICE" --update-env

log "Post-activation health checks"
HEALTH_OK=0
for attempt in 1 2 3 4 5 6 7 8; do
  if curl --fail --silent --show-error "http://127.0.0.1:$PMD_PORT/api/health" >/dev/null; then
    HEALTH_OK=1
    break
  fi
  sleep 2
done
[[ "$HEALTH_OK" == "1" ]] || fail "V2 local health failed after activation"

grep -q 'PMD_TENANT_QUICK_SETUP_V1' "$PMD_ROOT/app/admin/Services/PmdTenantQuickSetupService.php" || fail "Quick Setup service missing after activation"
grep -q 'TenantSetupWelcome' "$V2_ROOT/app/page.tsx" || fail "Frontend welcome integration missing after activation"

ACTIVATION_STARTED=0
trap - EXIT
cleanup_source

echo
echo "============================================================"
echo " PAYMYDINE QUICK SETUP V1 - PRODUCTION TEST DEPLOYED"
echo "============================================================"
echo "Release:  $RELEASE_SHA"
echo "Backup:   $BACKUP"
echo "Rollback: sudo bash $BACKUP/rollback.sh"
echo
echo "IMPORTANT: Test Quick Setup only on a NEW disposable tenant."
echo "Do not run Quick Setup on Mimoza or any tenant with real restaurant data."
echo "Code rollback does not delete data created inside a test tenant."
