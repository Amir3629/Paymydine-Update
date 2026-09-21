#!/usr/bin/env bash
set -Eeuo pipefail

# PayMyDine Android Local-First preview - safe VPS activation.
#
# Usage:
#   sudo bash deploy/pmd-android-preview-v1-safe.sh
#
# Or from anywhere:
#   curl -fsSL https://raw.githubusercontent.com/Amir3629/Paymydine-Update/main/deploy/pmd-android-preview-v1-safe.sh -o /tmp/pmd-android-preview.sh
#   sudo bash /tmp/pmd-android-preview.sh
#
# Optional:
#   PMD_ROOT=/custom/path sudo -E bash /tmp/pmd-android-preview.sh
#   FORCE_PMD_ANDROID_DEPLOY=1 sudo -E bash /tmp/pmd-android-preview.sh
#
# The pinned commit below contains the Settings Android download entry plus the
# server-side mobile pairing/bootstrap/sync/KDS/Edge bridge required by the APK.
TARGET_COMMIT="${TARGET_COMMIT:-cd73ce8982be3b365f6611836f96c192f5876176}"
APK_URL="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview/PayMyDine-Android-Local-First-Preview.apk"

log()  { printf '\n[PMD Android] %s\n' "$*"; }
warn() { printf '\n[PMD Android][WARN] %s\n' "$*" >&2; }
fail() { printf '\n[PMD Android][ERROR] %s\n' "$*" >&2; exit 1; }

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  warn "Root is recommended so PHP-FPM can be reloaded and file ownership preserved."
fi

find_root() {
  if [[ -n "${PMD_ROOT:-}" ]]; then
    if [[ -d "${PMD_ROOT}/.git" ]]; then
      printf '%s\n' "$PMD_ROOT"
      return
    fi
    warn "PMD_ROOT was set but is not a git checkout: $PMD_ROOT"
  fi

  local candidate
  for candidate in \
    /var/www/paymydine \
    /var/www/paymydine/frontend/Paymydine-Update \
    /var/www/paymydine/Paymydine-Update \
    /var/www/Paymydine-Update
  do
    if [[ -d "$candidate/.git" ]]; then
      printf '%s\n' "$candidate"
      return
    fi
  done

  # VPS layouts have changed over time. Search a small, safe area instead of
  # requiring the operator to know the exact checkout path.
  if [[ -d /var/www/paymydine ]]; then
    while IFS= read -r gitdir; do
      candidate="${gitdir%/.git}"
      if git -c "safe.directory=$candidate" -C "$candidate" remote get-url origin 2>/dev/null \
          | grep -q 'Amir3629/Paymydine-Update'; then
        printf '%s\n' "$candidate"
        return
      fi
    done < <(find /var/www/paymydine -maxdepth 5 -type d -name .git -print 2>/dev/null)
  fi

  fail "Could not find the PayMyDine git checkout under /var/www/paymydine."
}

PMD_ROOT="$(find_root)"
cd "$PMD_ROOT"

GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

REMOTE_URL="$("${GIT[@]}" remote get-url origin 2>/dev/null || true)"
[[ -n "$REMOTE_URL" ]] || fail "This checkout has no origin remote."
case "$REMOTE_URL" in
  *Amir3629/Paymydine-Update*) ;;
  *) fail "Unexpected origin remote: $REMOTE_URL" ;;
esac

FILES=(
  "app/admin/views/pmdsettings/index.blade.php"
  "app/Http/Controllers/PmdMobileBootstrapController.php"
  "app/Http/Controllers/PmdMobileEdgeController.php"
  "app/Http/Controllers/PmdMobileKdsController.php"
  "app/Http/Controllers/PmdMobilePairController.php"
  "app/Http/Controllers/PmdMobileSyncController.php"
  "app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
  "app/Services/PmdMobileSync/PmdMobileCommandProcessor.php"
  "app/Services/PmdMobileSync/PmdMobileDeviceAuthService.php"
  "app/Services/PmdMobileSync/PmdMobilePairingService.php"
  "app/Services/PmdSiteAccessService.php"
  "app/Services/SuperAdminTenantLifecycleService.php"
  "app/admin/controllers/KitchenDisplay.php"
  "app/admin/controllers/Login.php"
  "app/admin/controllers/PmdWaiterPosV1.php"
  "app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
  "app/admin/routes.php"
  "app/system/database/migrations/2026_09_20_190000_create_pmd_mobile_sync_tables.php"
  "routes/pmd-mobile-sync-v1.php"
)

log "Checkout: $PMD_ROOT"
log "Origin:   $REMOTE_URL"
log "Fetching origin/main..."
"${GIT[@]}" fetch --prune origin main

"${GIT[@]}" cat-file -e "${TARGET_COMMIT}^{commit}" 2>/dev/null \
  || fail "Pinned Android deployment commit $TARGET_COMMIT is not available after fetch."

if ! "${GIT[@]}" merge-base --is-ancestor "$TARGET_COMMIT" origin/main; then
  fail "Pinned Android deployment commit is not an ancestor of current origin/main."
fi

CURRENT_BRANCH="$("${GIT[@]}" rev-parse --abbrev-ref HEAD 2>/dev/null || printf detached)"
CURRENT_HEAD="$("${GIT[@]}" rev-parse HEAD)"
DIRTY_ALL="$("${GIT[@]}" status --porcelain)"
DIRTY_TARGET="$("${GIT[@]}" status --porcelain -- "${FILES[@]}" || true)"

printf '[PMD Android] Current branch: %s\n' "$CURRENT_BRANCH"
printf '[PMD Android] Current HEAD:   %s\n' "$CURRENT_HEAD"
printf '[PMD Android] origin/main:    %s\n' "$("${GIT[@]}" rev-parse origin/main)"

BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"
BACKUP="$BACKUP_DIR/android-preview-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-preview-before-$STAMP.txt"

{
  echo "timestamp_utc=$STAMP"
  echo "root=$PMD_ROOT"
  echo "branch=$CURRENT_BRANCH"
  echo "head=$CURRENT_HEAD"
  echo "target=$TARGET_COMMIT"
  echo "origin_main=$("${GIT[@]}" rev-parse origin/main)"
  echo
  echo "git_status_before:"
  "${GIT[@]}" status --short || true
} > "$META"

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -e "$PMD_ROOT/$rel" ]] && EXISTING+=("$rel")
done

if (("${#EXISTING[@]}" > 0)); then
  tar -czf "$BACKUP" "${EXISTING[@]}"
else
  tar -czf "$BACKUP" --files-from /dev/null
fi
log "Backup created: $BACKUP"

# Preferred path: if production is already a clean main checkout, update the
# checkout normally. No hard reset is ever used.
if [[ "$CURRENT_BRANCH" == "main" && -z "$DIRTY_ALL" ]]; then
  log "Clean main checkout detected; fast-forwarding to origin/main."
  "${GIT[@]}" merge --ff-only origin/main
else
  log "Non-clean/non-main checkout detected; using targeted overlay mode."
  if [[ -n "$DIRTY_TARGET" && "${FORCE_PMD_ANDROID_DEPLOY:-0}" != "1" ]]; then
    printf '%s\n' "$DIRTY_TARGET" >&2
    fail "One or more Android deployment target files have local edits. Backup was created; inspect them or rerun with FORCE_PMD_ANDROID_DEPLOY=1."
  fi

  STAGE="$(mktemp -d /tmp/pmd-android-preview.XXXXXX)"
  trap 'rm -rf "${STAGE:-}"' EXIT

  log "Staging exact files from $TARGET_COMMIT..."
  "${GIT[@]}" archive "$TARGET_COMMIT" -- "${FILES[@]}" | tar -x -C "$STAGE"

  command -v php >/dev/null 2>&1 || fail "php CLI is required."
  while IFS= read -r -d '' phpfile; do
    php -l "$phpfile" >/dev/null \
      || fail "PHP syntax check failed for staged file: ${phpfile#$STAGE/}"
  done < <(find "$STAGE" -type f -name '*.php' -print0)

  ROOT_UID="$(stat -c '%u' "$PMD_ROOT")"
  ROOT_GID="$(stat -c '%g' "$PMD_ROOT")"

  for rel in "${FILES[@]}"; do
    src="$STAGE/$rel"
    dst="$PMD_ROOT/$rel"
    [[ -f "$src" ]] || fail "Staged file missing: $rel"
    mkdir -p "$(dirname "$dst")"
    tmp="${dst}.pmd-android-new"
    cp -f "$src" "$tmp"
    chmod 0644 "$tmp"
    chown "$ROOT_UID:$ROOT_GID" "$tmp" 2>/dev/null || true
    mv -f "$tmp" "$dst"
  done
fi

log "Validating deployed PHP files..."
for rel in "${FILES[@]}"; do
  case "$rel" in
    *.php)
      php -l "$PMD_ROOT/$rel" >/dev/null \
        || fail "PHP syntax validation failed after deploy: $rel"
      ;;
  esac
done

grep -q "Android Tablet / POS" app/admin/views/pmdsettings/index.blade.php \
  || fail "Android download entry is missing from Settings after deploy."
grep -q "routes/pmd-mobile-sync-v1.php" app/admin/routes.php \
  || fail "Mobile route loader is missing after deploy."
grep -q "code_verifier" app/Http/Controllers/PmdMobilePairController.php \
  || fail "Device-bound pairing contract is missing after deploy."
grep -q "ensureMobileSyncStorage" app/Services/PmdMobileSync/PmdMobilePairingService.php \
  || fail "Existing-tenant mobile schema recovery is missing after deploy."

log "Clearing application caches..."
php artisan optimize:clear >/dev/null 2>&1 || warn "artisan optimize:clear returned non-zero"
php artisan view:clear     >/dev/null 2>&1 || true
php artisan route:clear    >/dev/null 2>&1 || true
php artisan config:clear   >/dev/null 2>&1 || true
php artisan cache:clear    >/dev/null 2>&1 || true

log "Reloading active PHP-FPM service(s), if systemd is available..."
RELOADED=0
if command -v systemctl >/dev/null 2>&1; then
  while IFS= read -r svc; do
    [[ -n "$svc" ]] || continue
    if systemctl is-active --quiet "$svc"; then
      systemctl reload "$svc" 2>/dev/null || systemctl restart "$svc"
      printf '[PMD Android] Reloaded %s\n' "$svc"
      RELOADED=1
    fi
  done < <(
    systemctl list-unit-files --type=service --no-legend 2>/dev/null \
      | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1}'
  )
fi
if [[ "$RELOADED" -eq 0 ]]; then
  warn "No active systemd PHP-FPM service was found. If this VPS uses Docker/Supervisor, reload PHP there manually."
fi

log "Checking published APK URL..."
if command -v curl >/dev/null 2>&1; then
  if curl -fsSIL --max-time 25 "$APK_URL" >/dev/null; then
    printf '[PMD Android] APK reachable: %s\n' "$APK_URL"
  else
    warn "Could not verify APK URL from this VPS, but deployment can still be valid."
  fi
fi

log "Optional route visibility check..."
if php artisan route:list 2>/dev/null | grep -Eq 'mobile/pair/start|api/mobile/v1/(bootstrap|sync/commands)'; then
  echo "[PMD Android] Mobile routes are visible."
else
  warn "route:list did not expose the dynamic mobile routes. The route file and loader are present; verify with the tenant URL after deploy."
fi

cat <<EOF

============================================================
PayMyDine Android preview activation completed.

Settings entry:
  Settings -> Cashier App -> Android Tablet / POS

APK:
  $APK_URL

Backup:
  $BACKUP
  $META

Important:
  - No git reset --hard was used.
  - No global php artisan migrate --force was run.
  - Existing tenants provision the idempotent mobile-sync tables on first
    approved Android pairing if those tables are missing.
  - Browser/CDN cache can still make the old Settings UI visible temporarily.
    Hard-refresh the Settings page after this script.
============================================================
EOF
