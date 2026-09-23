#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
PMD_BRANCH="${PMD_BRANCH:-feat/google-business-profile-integration-v2}"
PMD_SERVICE="${PMD_SERVICE:-paymydine-frontend-v2}"
PMD_PORT="${PMD_PORT:-3002}"
PMD_V2_REL="frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
PMD_V2_ROOT="${PMD_V2_ROOT:-$PMD_ROOT/$PMD_V2_REL}"

say() { printf '[GOOGLE-BUSINESS-V2] %s\n' "$*"; }
fail() { printf '[GOOGLE-BUSINESS-V2] REFUSED: %s\n' "$*" >&2; exit 2; }

[[ -d "$PMD_ROOT/.git" && -f "$PMD_ROOT/artisan" ]] || fail "PMD_ROOT is not the PayMyDine worktree"
[[ -f "$PMD_V2_ROOT/package.json" ]] || fail "Frontend V2 root not found: $PMD_V2_ROOT"

cd "$PMD_ROOT"

say "Fetching current main and integration branch"
git fetch origin main "$PMD_BRANCH"

main_ref="origin/main"
release_ref="origin/$PMD_BRANCH"
main_sha="$(git rev-parse "$main_ref")"
release_sha="$(git rev-parse "$release_ref")"
live_sha="$(git rev-parse HEAD)"

[[ "$live_sha" == "$main_sha" ]] || fail "Live HEAD is $live_sha but current origin/main is $main_sha. Sync/audit main first; no production file was changed."
git merge-base --is-ancestor "$main_sha" "$release_sha" || fail "Integration branch is not based on current main. Rebase/update the branch before deployment."
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || fail "Tracked live worktree changes exist. Commit/sync or audit them before deployment."

mapfile -t changed_rows < <(git diff --name-status "${main_sha}...${release_sha}" --)
(( ${#changed_rows[@]} > 0 )) || fail "No integration changes found"

runtime_files=()
for row in "${changed_rows[@]}"; do
  status="${row%%$'\t'*}"
  rel="${row#*$'\t'}"

  case "$status" in
    D*|R*|C*) fail "Deletion/rename/copy requires manual review: $row" ;;
  esac

  case "$rel" in
    app/*|routes/*|"$PMD_V2_REL"/*|docs/GOOGLE_BUSINESS_PROFILE_INTEGRATION_V2.md|scripts/pmd-google-business-profile-integration-v2-deploy.sh)
      runtime_files+=("$rel")
      ;;
  esac
done

(( ${#runtime_files[@]} > 0 )) || fail "No runtime files found in the integration diff"

pm2_json="$(sudo -u ubuntu -H pm2 jlist)"
pm2_cwd="$(printf '%s' "$pm2_json" | PMD_SERVICE="$PMD_SERVICE" php -r '$j=json_decode(stream_get_contents(STDIN),true); foreach($j?:[] as $p){if(($p["name"]??"")===getenv("PMD_SERVICE")){echo $p["pm2_env"]["pm_cwd"]??""; exit;}}')"
pm2_status="$(printf '%s' "$pm2_json" | PMD_SERVICE="$PMD_SERVICE" php -r '$j=json_decode(stream_get_contents(STDIN),true); foreach($j?:[] as $p){if(($p["name"]??"")===getenv("PMD_SERVICE")){echo $p["pm2_env"]["status"]??""; exit;}}')"
[[ "$pm2_cwd" == "$PMD_V2_ROOT" ]] || fail "PM2 cwd mismatch for $PMD_SERVICE: $pm2_cwd"
[[ "$pm2_status" == "online" ]] || fail "$PMD_SERVICE is not online"
curl -fsS "http://127.0.0.1:$PMD_PORT/api/health" >/dev/null || fail "Baseline Frontend V2 health failed"

stamp="$(date -u +%Y%m%d_%H%M%S)"
stage="$PMD_ROOT/storage/pmd-google-business-v2-stage-$stamp"
backup="$PMD_ROOT/storage/pmd-google-business-v2-backup-$stamp"
mkdir -p "$stage/files" "$backup/files"

printf '%s\n' "$main_sha" > "$backup/main-sha.txt"
printf '%s\n' "$release_sha" > "$backup/release-sha.txt"
printf '%s\n' "${runtime_files[@]}" > "$backup/runtime-files.txt"
: > "$backup/new-files.txt"

say "Staging changed source files"
for rel in "${runtime_files[@]}"; do
  mkdir -p "$stage/files/$(dirname "$rel")"
  git show "$release_ref:$rel" > "$stage/files/$rel"
  [[ -s "$stage/files/$rel" ]] || fail "Could not stage $rel"
done

say "PHP syntax preflight"
while IFS= read -r -d '' phpfile; do
  php -l "$phpfile" >/dev/null
done < <(find "$stage/files" -type f -name '*.php' -print0)

grep -q 'class PmdGoogleBusinessService' "$stage/files/app/Services/GoogleBusiness/PmdGoogleBusinessService.php" || fail "Google Business service marker missing"
grep -q 'PMD_GOOGLE_BUSINESS_PROFILE_INTEGRATION_V2' "$stage/files/$PMD_V2_REL/src/runtime/components/ReviewShareEnhancer.tsx" || fail "Frontend integration marker missing"

say "Building Frontend V2 in isolated stage"
v2_stage="$stage/v2"
mkdir -p "$v2_stage"
(
  cd "$PMD_V2_ROOT"
  tar --exclude='./node_modules' --exclude='./.next' -cf - .
) | (
  cd "$v2_stage"
  tar -xf -
)

[[ -d "$PMD_V2_ROOT/node_modules" ]] || fail "Live V2 node_modules is missing"
cp -al "$PMD_V2_ROOT/node_modules" "$v2_stage/node_modules"

for rel in "${runtime_files[@]}"; do
  case "$rel" in
    "$PMD_V2_REL"/*)
      sub="${rel#"$PMD_V2_REL/"}"
      mkdir -p "$v2_stage/$(dirname "$sub")"
      cp -a "$stage/files/$rel" "$v2_stage/$sub"
      ;;
  esac
done

(
  cd "$v2_stage"
  npm run typecheck:offline
  npm run build
)
[[ -d "$v2_stage/.next" ]] || fail "Staged Next build did not produce .next"

say "Backing up existing runtime files"
for rel in "${runtime_files[@]}"; do
  live_path="$PMD_ROOT/$rel"
  if [[ -f "$live_path" ]]; then
    mkdir -p "$backup/files/$(dirname "$rel")"
    cp -a "$live_path" "$backup/files/$rel"
  else
    printf '%s\n' "$rel" >> "$backup/new-files.txt"
  fi
done

[[ -d "$PMD_V2_ROOT/.next" ]] || fail "Live Frontend V2 .next is missing"

cat > "$backup/rollback.sh" <<ROLLBACK
#!/usr/bin/env bash
set -Eeuo pipefail
PMD_ROOT=$(printf '%q' "$PMD_ROOT")
PMD_V2_ROOT=$(printf '%q' "$PMD_V2_ROOT")
PMD_SERVICE=$(printf '%q' "$PMD_SERVICE")
PMD_PORT=$(printf '%q' "$PMD_PORT")
BACKUP=$(printf '%q' "$backup")

if [[ -f "\$BACKUP/new-files.txt" ]]; then
  while IFS= read -r rel; do
    [[ -n "\$rel" ]] && rm -f "\$PMD_ROOT/\$rel"
  done < "\$BACKUP/new-files.txt"
fi
cp -a "\$BACKUP/files/." "\$PMD_ROOT/"
rm -rf "\$PMD_V2_ROOT/.next"
if [[ -d "\$BACKUP/next.previous" ]]; then
  mv "\$BACKUP/next.previous" "\$PMD_V2_ROOT/.next"
fi
cd "\$PMD_ROOT"
php artisan optimize:clear >/dev/null 2>&1 || true
if systemctl list-unit-files php8.3-fpm.service >/dev/null 2>&1; then
  sudo systemctl reload php8.3-fpm || true
fi
sudo -u ubuntu -H pm2 restart "\$PMD_SERVICE" --update-env
curl -fsS "http://127.0.0.1:\$PMD_PORT/api/health" >/dev/null
echo "Rollback complete. Additive Google integration tables were intentionally retained."
ROLLBACK
chmod 700 "$backup/rollback.sh"

activation_started=0
rollback_running=0
rollback() {
  local rc="${1:-1}"
  [[ "$rollback_running" == "0" ]] || exit "$rc"
  rollback_running=1
  set +e
  say "Activation failed; restoring source and Frontend build from $backup"

  if [[ -f "$backup/new-files.txt" ]]; then
    while IFS= read -r rel; do
      [[ -n "$rel" ]] && rm -f "$PMD_ROOT/$rel"
    done < "$backup/new-files.txt"
  fi
  cp -a "$backup/files/." "$PMD_ROOT/"
  rm -rf "$PMD_V2_ROOT/.next"
  [[ -d "$backup/next.previous" ]] && mv "$backup/next.previous" "$PMD_V2_ROOT/.next"

  cd "$PMD_ROOT"
  php artisan optimize:clear >/dev/null 2>&1 || true
  if systemctl list-unit-files php8.3-fpm.service >/dev/null 2>&1; then
    sudo systemctl reload php8.3-fpm || true
  fi
  sudo -u ubuntu -H pm2 restart "$PMD_SERVICE" --update-env >/dev/null 2>&1 || true
  say "Rollback finished"
  exit "$rc"
}
trap 'rc=$?; if [[ "$activation_started" == "1" && "$rc" != "0" ]]; then rollback "$rc"; fi' EXIT

activation_started=1

say "Activating reviewed integration source"
for rel in "${runtime_files[@]}"; do
  mkdir -p "$PMD_ROOT/$(dirname "$rel")"
  cp -a "$stage/files/$rel" "$PMD_ROOT/$rel"
done

say "Applying additive tenant schema"
php artisan igniter:up --no-interaction

say "Activating staged Frontend V2 build"
mv "$PMD_V2_ROOT/.next" "$backup/next.previous"
mv "$v2_stage/.next" "$PMD_V2_ROOT/.next"

php artisan optimize:clear >/dev/null 2>&1 || true
if systemctl list-unit-files php8.3-fpm.service >/dev/null 2>&1; then
  sudo systemctl reload php8.3-fpm
fi

say "Restarting only $PMD_SERVICE"
sudo -u ubuntu -H pm2 restart "$PMD_SERVICE" --update-env

for attempt in 1 2 3 4 5 6; do
  if curl -fsS "http://127.0.0.1:$PMD_PORT/api/health" >/dev/null; then
    break
  fi
  sleep 2
  [[ "$attempt" != "6" ]] || fail "Frontend V2 health failed after activation"
done

say "Post-activation verification"
php artisan route:list 2>/dev/null | grep -q 'integrations/google-business/callback' || fail "Google OAuth callback route is missing"
php artisan route:list 2>/dev/null | grep -q 'integrations/google-business/pubsub' || fail "Google PubSub route is missing"
grep -q 'class PmdGoogleBusinessService' "$PMD_ROOT/app/Services/GoogleBusiness/PmdGoogleBusinessService.php" || fail "Live Google Business service marker missing"
grep -q 'PMD_GOOGLE_BUSINESS_PROFILE_INTEGRATION_V2' "$PMD_V2_ROOT/src/runtime/components/ReviewShareEnhancer.tsx" || fail "Live Frontend integration marker missing"

activation_started=0
trap - EXIT

say "DEPLOY COMPLETE"
say "Integration code is live. Google Connect remains disabled until Google Cloud credentials are configured in /var/www/paymydine/.env."
say "Setup guide: $PMD_ROOT/docs/GOOGLE_BUSINESS_PROFILE_INTEGRATION_V2.md"
say "Rollback script: $backup/rollback.sh"
