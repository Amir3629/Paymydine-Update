#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
PMD_SOURCE="${PMD_SOURCE:?PMD_SOURCE must point to an immutable checked-out R36 release directory}"
PMD_BASE_SHA="${PMD_BASE_SHA:?PMD_BASE_SHA must be the exact clean live/main baseline SHA}"
PMD_RELEASE_SHA="${PMD_RELEASE_SHA:-$(git -C "$PMD_SOURCE" rev-parse HEAD 2>/dev/null || true)}"
PMD_V2_REL="frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
PMD_V2_ROOT="${PMD_V2_ROOT:-$PMD_ROOT/$PMD_V2_REL}"
PMD_DOMAIN="${PMD_DOMAIN:-mimoza.paymydine.com}"
PMD_SERVICE="${PMD_SERVICE:-paymydine-frontend-v2}"
PMD_PORT="${PMD_PORT:-3002}"
PMD_ACTIVATE="${PMD_ACTIVATE:-NO}"
PMD_KEEP_STAGE="${PMD_KEEP_STAGE:-1}"

fail() { echo "R36 INSTALLER REFUSED: $*" >&2; exit 2; }
log() { printf '[R36] %s\n' "$*"; }
find_marker() {
  local marker="$1" root="$2"
  if command -v rg >/dev/null 2>&1; then
    rg -q -- "$marker" "$root"
  else
    grep -R -q --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.next -- "$marker" "$root"
  fi
}

[[ "$PMD_SERVICE" == "paymydine-frontend-v2" ]] || fail "Refusing non-V2 PM2 service: $PMD_SERVICE"
[[ "$PMD_PORT" == "3002" ]] || fail "Refusing non-V2 port: $PMD_PORT"
[[ -d "$PMD_ROOT/.git" && -f "$PMD_ROOT/artisan" ]] || fail "PMD_ROOT is not the live PayMyDine worktree"
[[ -d "$PMD_SOURCE/.git" && -f "$PMD_SOURCE/artisan" ]] || fail "PMD_SOURCE is not a complete immutable release checkout"
[[ "$(readlink -f "$PMD_SOURCE")" != "$(readlink -f "$PMD_ROOT")" ]] || fail "PMD_SOURCE must not be the live worktree"
[[ "$(git -C "$PMD_SOURCE" rev-parse HEAD)" == "$PMD_RELEASE_SHA" ]] || fail "Release checkout HEAD does not match PMD_RELEASE_SHA"
git -C "$PMD_SOURCE" merge-base --is-ancestor "$PMD_BASE_SHA" "$PMD_RELEASE_SHA" || fail "Release is not based on PMD_BASE_SHA"
[[ -z "$(git -C "$PMD_SOURCE" status --porcelain --untracked-files=no)" ]] || fail "Release checkout has tracked modifications"

live_sha="$(git -C "$PMD_ROOT" rev-parse HEAD)"
[[ "$live_sha" == "$PMD_BASE_SHA" ]] || fail "Live HEAD is $live_sha, expected baseline $PMD_BASE_SHA. Sync/audit before deployment."
[[ -z "$(git -C "$PMD_ROOT" status --porcelain --untracked-files=no)" ]] || fail "Live worktree has tracked modifications. Commit/sync or audit them first."

for marker in \
  PMD_FRONTEND_V2_PAID_ORDER_REVIEW_R30 \
  PMD_HEADER_VALET_BUTTON_R31 \
  PMD_MULTI_ORDER_PAYMENT_R32 \
  PMD_DIRECT_KITCHEN_SEND_R33B \
  PMD_SPLIT_PAYMENT_SAFETY_R35 \
  PMD_PAYMENT_LIFECYCLE_SEPARATION_R37C \
  PMD_CASHIER_MANUAL_TABLE_FREE_R45 \
  PMD_R36_CHILD_SETTLEMENT_GUARD \
  PMD_R36_CHILD_FISKALY_DEFER_GUARD \
  PMD_R36_SIGN_DE_AFTER_COMMIT; do
  find_marker "$marker" "$PMD_SOURCE" || fail "Missing release protection marker: $marker"
done

v2_source="$PMD_SOURCE/$PMD_V2_REL"
[[ -f "$v2_source/package.json" && -f "$v2_source/package-lock.json" ]] || fail "V2 release source is incomplete"
theme_count="$(find "$v2_source/src/themes" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')"
[[ "$theme_count" == "10" ]] || fail "Expected exactly 10 isolated V2 themes; found $theme_count"

mapfile -t changed_rows < <(git -C "$PMD_SOURCE" diff --name-status "$PMD_BASE_SHA...$PMD_RELEASE_SHA" --)
((${#changed_rows[@]} > 0)) || fail "No release changes found"

runtime_files=()
for row in "${changed_rows[@]}"; do
  status="${row%%$'\t'*}"
  rest="${row#*$'\t'}"
  if [[ "$status" == R* || "$status" == C* ]]; then
    fail "Runtime release contains rename/copy status $status; review manually before deployment"
  fi
  rel="$rest"
  case "$rel" in
    app/*|routes/*|frontend-v2/*)
      runtime_files+=("$rel")
      ;;
  esac
done

((${#runtime_files[@]} > 0)) || fail "No deployable runtime files found"

for row in "${changed_rows[@]}"; do
  status="${row%%$'\t'*}"
  rel="${row#*$'\t'}"
  case "$rel" in
    app/*|routes/*|frontend-v2/*)
      [[ "$status" != D* ]] || fail "Runtime deletion requires manual review: $rel"
      ;;
  esac
done

log "Baseline: $PMD_BASE_SHA"
log "Release:  $PMD_RELEASE_SHA"
log "Runtime files: ${#runtime_files[@]}"

git -C "$PMD_SOURCE" diff --check "$PMD_BASE_SHA...$PMD_RELEASE_SHA"

log "PHP syntax preflight"
while IFS= read -r -d '' phpfile; do
  php -l "$phpfile" >/dev/null
done < <(find "$PMD_SOURCE/app" "$PMD_SOURCE/routes" -type f -name '*.php' -print0)
php "$PMD_SOURCE/tests/Support/r36-task3-fiscal-smoke.php"

pm2_json="$(sudo -u ubuntu -H pm2 jlist)"
pm2_cwd="$(printf '%s' "$pm2_json" | PMD_SERVICE="$PMD_SERVICE" php -r '$j=json_decode(stream_get_contents(STDIN),true); foreach($j?:[] as $p){if(($p["name"]??"")===getenv("PMD_SERVICE")){echo $p["pm2_env"]["pm_cwd"]??""; exit;}}')"
pm2_status="$(printf '%s' "$pm2_json" | PMD_SERVICE="$PMD_SERVICE" php -r '$j=json_decode(stream_get_contents(STDIN),true); foreach($j?:[] as $p){if(($p["name"]??"")===getenv("PMD_SERVICE")){echo $p["pm2_env"]["status"]??""; exit;}}')"
[[ "$pm2_cwd" == "$PMD_V2_ROOT" ]] || fail "PM2 cwd mismatch for $PMD_SERVICE: $pm2_cwd"
[[ "$pm2_status" == "online" ]] || fail "PM2 service is not online before release: $pm2_status"

curl --fail --silent --show-error "http://127.0.0.1:$PMD_PORT/api/health" >/dev/null || fail "Baseline V2 local health failed on port $PMD_PORT"

available_kb="$(df -Pk "$PMD_ROOT" | awk 'NR==2 {print $4}')"
source_kb="$(du -sk "$v2_source" | awk '{print $1}')"
required_kb="$((source_kb * 3 + 262144))"
(( available_kb > required_kb )) || fail "Insufficient same-filesystem space for V2 stage + backup"

stamp="$(date -u +%Y%m%d_%H%M%S)"
release_short="${PMD_RELEASE_SHA:0:12}"
stage="$PMD_ROOT/storage/pmd-r36-stage-${release_short}-${stamp}"
backup="$PMD_ROOT/storage/pmd-r36-backups/${release_short}-${stamp}"
mkdir -p "$stage" "$backup/files"
printf '%s\n' "$PMD_BASE_SHA" > "$backup/base-sha.txt"
printf '%s\n' "$PMD_RELEASE_SHA" > "$backup/release-sha.txt"
printf '%s\n' "${runtime_files[@]}" > "$backup/runtime-files.txt"

log "Staging V2 on the live filesystem: $stage"
v2_stage="$stage/v2"
mkdir -p "$v2_stage"
cp -a "$v2_source/." "$v2_stage/"
rm -rf "$v2_stage/node_modules" "$v2_stage/.next"
[[ -d "$PMD_V2_ROOT/node_modules" ]] || fail "Live V2 node_modules is missing; refusing dependency mutation during release"
cp -al "$PMD_V2_ROOT/node_modules" "$v2_stage/node_modules"
for envfile in .env .env.local .env.production; do
  [[ -f "$PMD_V2_ROOT/$envfile" ]] && cp -a "$PMD_V2_ROOT/$envfile" "$v2_stage/$envfile"
done

(
  cd "$v2_stage"
  npm run release:audit
  npm run build
)
[[ -d "$v2_stage/.next" ]] || fail "Staged Next.js build did not produce .next"

log "STAGE PASS: source audits, release audit and production build succeeded."
log "Stage evidence: $stage"

if [[ "$PMD_ACTIVATE" != "YES" ]]; then
  log "No production files changed because PMD_ACTIVATE=$PMD_ACTIVATE"
  log "Re-run the same immutable source with PMD_ACTIVATE=YES only after reviewing this stage pass."
  exit 0
fi

activation_started=0
rollback_running=0
rollback() {
  local rc="${1:-1}"
  [[ "$rollback_running" == "0" ]] || exit "$rc"
  rollback_running=1
  set +e
  log "Activation failed; restoring application files/build from $backup"
  if [[ -f "$backup/new-files.txt" ]]; then
    while IFS= read -r rel; do
      [[ -n "$rel" ]] && rm -f "$PMD_ROOT/$rel"
    done < "$backup/new-files.txt"
  fi
  if [[ -d "$backup/files" ]]; then cp -a "$backup/files/." "$PMD_ROOT/"; fi
  if [[ -d "$backup/next.previous" ]]; then
    rm -rf "$PMD_V2_ROOT/.next"
    mv "$backup/next.previous" "$PMD_V2_ROOT/.next"
  fi
  sudo -u ubuntu -H pm2 restart "$PMD_SERVICE" --update-env >/dev/null 2>&1 || true
  curl --fail --silent --show-error "http://127.0.0.1:$PMD_PORT/api/health" >/dev/null 2>&1 || true
  log "Rollback restored application files/build. Additive R36 DB migrations/evidence were intentionally retained."
  exit "$rc"
}
trap 'rc=$?; if [[ "$activation_started" == "1" && "$rc" != "0" ]]; then rollback "$rc"; fi' EXIT

log "Backing up every existing runtime file before activation"
: > "$backup/new-files.txt"
for rel in "${runtime_files[@]}"; do
  [[ -f "$PMD_SOURCE/$rel" ]] || continue
  if [[ -f "$PMD_ROOT/$rel" ]]; then
    mkdir -p "$backup/files/$(dirname "$rel")"
    cp -a "$PMD_ROOT/$rel" "$backup/files/$rel"
  else
    printf '%s\n' "$rel" >> "$backup/new-files.txt"
  fi
done

if [[ -d "$PMD_V2_ROOT/.next" ]]; then
  mv "$PMD_V2_ROOT/.next" "$backup/next.previous"
fi

cat > "$backup/rollback.sh" <<ROLLBACK
#!/usr/bin/env bash
set -Eeuo pipefail
PMD_ROOT=$(printf '%q' "$PMD_ROOT")
PMD_V2_ROOT=$(printf '%q' "$PMD_V2_ROOT")
PMD_SERVICE=$(printf '%q' "$PMD_SERVICE")
PMD_PORT=$(printf '%q' "$PMD_PORT")
BACKUP=$(printf '%q' "$backup")
if [[ -f "\$BACKUP/new-files.txt" ]]; then
  while IFS= read -r rel; do [[ -n "\$rel" ]] && rm -f "\$PMD_ROOT/\$rel"; done < "\$BACKUP/new-files.txt"
fi
cp -a "\$BACKUP/files/." "\$PMD_ROOT/"
if [[ -d "\$BACKUP/next.previous" ]]; then rm -rf "\$PMD_V2_ROOT/.next"; mv "\$BACKUP/next.previous" "\$PMD_V2_ROOT/.next"; fi
sudo -u ubuntu -H pm2 restart "\$PMD_SERVICE" --update-env
curl --fail --silent --show-error "http://127.0.0.1:\$PMD_PORT/api/health" >/dev/null
echo 'Rollback complete. R36 additive financial/fiscal DB migrations and evidence were intentionally retained.'
ROLLBACK
chmod 700 "$backup/rollback.sh"

activation_started=1

# Copy additive Admin module migrations first, then run the TastyIgniter update
# manager. The final R36 repair migration applies the complete schema to every
# active tenant database and fails closed if any active tenant cannot be updated.
log "Activating additive R36 migration files"
for rel in "${runtime_files[@]}"; do
  case "$rel" in
    app/admin/database/migrations/2026_08_21_36*.php)
      [[ -f "$PMD_SOURCE/$rel" ]] || continue
      mkdir -p "$PMD_ROOT/$(dirname "$rel")"
      cp -a "$PMD_SOURCE/$rel" "$PMD_ROOT/$rel"
      ;;
  esac
done

log "Running tenant-aware TastyIgniter schema update"
(
  cd "$PMD_ROOT"
  php artisan igniter:up --no-interaction
)

log "Activating reviewed runtime source files"
for rel in "${runtime_files[@]}"; do
  [[ -f "$PMD_SOURCE/$rel" ]] || continue
  case "$rel" in
    "$PMD_V2_REL/.next"/*|"$PMD_V2_REL/node_modules"/*)
      continue
      ;;
  esac
  mkdir -p "$PMD_ROOT/$(dirname "$rel")"
  cp -a "$PMD_SOURCE/$rel" "$PMD_ROOT/$rel"
done

log "Activating the already-built staged V2 .next tree"
mv "$v2_stage/.next" "$PMD_V2_ROOT/.next"

(
  cd "$PMD_ROOT"
  php artisan optimize:clear >/dev/null 2>&1 || true
  php artisan route:list 2>/dev/null | grep -q 'billing-group' || fail "R36 billing-group routes are not visible after activation"
)

log "Restarting ONLY $PMD_SERVICE as PM2 owner ubuntu"
sudo -u ubuntu -H pm2 restart "$PMD_SERVICE" --update-env

for attempt in 1 2 3 4 5 6; do
  if curl --fail --silent --show-error "http://127.0.0.1:$PMD_PORT/api/health" >/dev/null; then break; fi
  sleep 2
  [[ "$attempt" != "6" ]] || fail "Local V2 health failed after restart"
done
curl --fail --silent --show-error "https://$PMD_DOMAIN/api/health" >/dev/null || fail "Public health failed"
curl --fail --silent --show-error --output /dev/null "https://$PMD_DOMAIN/preview" || fail "Public V2 preview failed"

for marker in PMD_R36_CHILD_SETTLEMENT_GUARD PMD_R36_CHILD_FISKALY_DEFER_GUARD PMD_CASHIER_MANUAL_TABLE_FREE_R45; do
  find_marker "$marker" "$PMD_ROOT" || fail "Post-activation marker missing: $marker"
done

activation_started=0
trap - EXIT
log "ACTIVATION PASS"
log "Release:  $PMD_RELEASE_SHA"
log "Backup:   $backup"
log "Rollback: $backup/rollback.sh"
log "Local V2: http://127.0.0.1:$PMD_PORT/api/health"
log "Public:   https://$PMD_DOMAIN/preview"

if [[ "$PMD_KEEP_STAGE" != "1" ]]; then rm -rf "$stage"; fi
