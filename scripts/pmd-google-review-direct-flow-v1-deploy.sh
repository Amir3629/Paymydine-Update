#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
PMD_BRANCH="${PMD_BRANCH:-feat/google-review-direct-flow-v1}"
PMD_BASE_SHA="${PMD_BASE_SHA:-17b0c199b26c7f8bc09da1563e268d7978fdfad2}"
PMD_SERVICE="${PMD_SERVICE:-paymydine-frontend-v2}"
PMD_PORT="${PMD_PORT:-3002}"
PMD_V2_REL="frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
PMD_V2_ROOT="${PMD_V2_ROOT:-$PMD_ROOT/$PMD_V2_REL}"

say() { printf '[GOOGLE-REVIEW-V1] %s\n' "$*"; }
fail() { printf '[GOOGLE-REVIEW-V1] REFUSED: %s\n' "$*" >&2; exit 2; }

[[ -d "$PMD_ROOT/.git" && -f "$PMD_ROOT/artisan" ]] || fail "PMD_ROOT is not the PayMyDine worktree"
[[ -f "$PMD_V2_ROOT/package.json" ]] || fail "Frontend V2 root not found: $PMD_V2_ROOT"

cd "$PMD_ROOT"
git fetch origin "$PMD_BRANCH"
release_ref="origin/$PMD_BRANCH"
release_sha="$(git rev-parse "$release_ref")"
live_sha="$(git rev-parse HEAD)"

[[ "$live_sha" == "$PMD_BASE_SHA" ]] || fail "Live HEAD is $live_sha; expected tested baseline $PMD_BASE_SHA"
git merge-base --is-ancestor "$PMD_BASE_SHA" "$release_sha" || fail "Feature branch is not based on expected baseline"
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || fail "Tracked live worktree changes exist; sync/audit first"

files=(
  "app/admin/controllers/Pmdsettings.php"
  "app/admin/views/pmdsettings/restaurant.blade.php"
  "app/main/routes/main-public-compat.php"
  "app/main/routes/next-proxy.php"
  "routes/admin-app-before.php"
  "routes/api.php"
  "routes/pmd-public-compat-handler.php"
  "$PMD_V2_REL/src/runtime/components/ReviewShareEnhancer.tsx"
)

stamp="$(date -u +%Y%m%d_%H%M%S)"
stage="$PMD_ROOT/storage/pmd-google-review-v1-stage-$stamp"
backup="$PMD_ROOT/storage/pmd-google-review-v1-backup-$stamp"
mkdir -p "$stage/files" "$backup/files"

say "Branch: $release_ref"
say "Release SHA: $release_sha"
say "Backup: $backup"

for rel in "${files[@]}"; do
  mkdir -p "$stage/files/$(dirname "$rel")"
  git show "$release_ref:$rel" > "$stage/files/$rel"
  [[ -s "$stage/files/$rel" ]] || fail "Could not stage $rel"
done

say "PHP syntax preflight"
while IFS= read -r phpfile; do
  php -l "$phpfile" >/dev/null
done < <(find "$stage/files" -type f -name '*.php' -print)

grep -q 'pmd_social_google_review_url' "$stage/files/app/admin/controllers/Pmdsettings.php" || fail "Backend setting marker missing"
grep -q 'PMD_GOOGLE_REVIEW_DIRECT_FLOW_V1' "$stage/files/$PMD_V2_REL/src/runtime/components/ReviewShareEnhancer.tsx" || fail "Frontend marker missing"

pm2_json="$(sudo -u ubuntu -H pm2 jlist)"
pm2_cwd="$(printf '%s' "$pm2_json" | PMD_SERVICE="$PMD_SERVICE" php -r '$j=json_decode(stream_get_contents(STDIN),true); foreach($j?:[] as $p){if(($p["name"]??"")===getenv("PMD_SERVICE")){echo $p["pm2_env"]["pm_cwd"]??""; exit;}}')"
pm2_status="$(printf '%s' "$pm2_json" | PMD_SERVICE="$PMD_SERVICE" php -r '$j=json_decode(stream_get_contents(STDIN),true); foreach($j?:[] as $p){if(($p["name"]??"")===getenv("PMD_SERVICE")){echo $p["pm2_env"]["status"]??""; exit;}}')"
[[ "$pm2_cwd" == "$PMD_V2_ROOT" ]] || fail "PM2 cwd mismatch: $pm2_cwd"
[[ "$pm2_status" == "online" ]] || fail "$PMD_SERVICE is not online"
curl -fsS "http://127.0.0.1:$PMD_PORT/api/health" >/dev/null || fail "Frontend V2 baseline health failed"

say "Build isolated V2 stage"
v2_stage="$stage/v2"
mkdir -p "$v2_stage"
(
  cd "$PMD_V2_ROOT"
  tar --exclude='./node_modules' --exclude='./.next' -cf - .
) | (
  cd "$v2_stage"
  tar -xf -
)
[[ -d "$PMD_V2_ROOT/node_modules" ]] || fail "Live V2 node_modules missing"
cp -al "$PMD_V2_ROOT/node_modules" "$v2_stage/node_modules"
cp -a "$stage/files/$PMD_V2_REL/src/runtime/components/ReviewShareEnhancer.tsx" \
  "$v2_stage/src/runtime/components/ReviewShareEnhancer.tsx"

(
  cd "$v2_stage"
  npm run typecheck:offline
  npm run build
)
[[ -d "$v2_stage/.next" ]] || fail "Next build did not produce .next"

say "Backup current files"
for rel in "${files[@]}"; do
  if [[ "$rel" == "$PMD_V2_REL/"* ]]; then
    live_path="$PMD_ROOT/$rel"
  else
    live_path="$PMD_ROOT/$rel"
  fi
  [[ -f "$live_path" ]] || fail "Live file missing: $rel"
  mkdir -p "$backup/files/$(dirname "$rel")"
  cp -a "$live_path" "$backup/files/$rel"
done
[[ -d "$PMD_V2_ROOT/.next" ]] || fail "Live .next missing"

activation=0
rollback_running=0
rollback() {
  local rc="${1:-1}"
  [[ "$rollback_running" == "0" ]] || exit "$rc"
  rollback_running=1
  set +e
  say "Activation failed; rolling back"
  cp -a "$backup/files/." "$PMD_ROOT/"
  rm -rf "$PMD_V2_ROOT/.next"
  [[ -d "$backup/next.previous" ]] && mv "$backup/next.previous" "$PMD_V2_ROOT/.next"
  php artisan optimize:clear >/dev/null 2>&1 || true
  if systemctl list-unit-files php8.3-fpm.service >/dev/null 2>&1; then sudo systemctl reload php8.3-fpm || true; fi
  sudo -u ubuntu -H pm2 restart "$PMD_SERVICE" --update-env >/dev/null 2>&1 || true
  say "Rollback finished"
  exit "$rc"
}
trap 'rc=$?; if [[ "$activation" == "1" && "$rc" != "0" ]]; then rollback "$rc"; fi' EXIT

activation=1
mv "$PMD_V2_ROOT/.next" "$backup/next.previous"

say "Activate reviewed backend/frontend sources"
for rel in "${files[@]}"; do
  mkdir -p "$PMD_ROOT/$(dirname "$rel")"
  cp -a "$stage/files/$rel" "$PMD_ROOT/$rel"
done
mv "$v2_stage/.next" "$PMD_V2_ROOT/.next"

php artisan optimize:clear >/dev/null 2>&1 || true
if systemctl list-unit-files php8.3-fpm.service >/dev/null 2>&1; then
  sudo systemctl reload php8.3-fpm
fi
sudo -u ubuntu -H pm2 restart "$PMD_SERVICE" --update-env

for attempt in 1 2 3 4 5 6; do
  if curl -fsS "http://127.0.0.1:$PMD_PORT/api/health" >/dev/null; then
    break
  fi
  sleep 2
  [[ "$attempt" != "6" ]] || fail "Frontend V2 health failed after activation"
done

grep -q 'PMD_GOOGLE_REVIEW_DIRECT_FLOW_V1' "$PMD_V2_ROOT/src/runtime/components/ReviewShareEnhancer.tsx" || fail "Live frontend source marker missing"
grep -q 'pmd_social_google_review_url' "$PMD_ROOT/app/admin/controllers/Pmdsettings.php" || fail "Live backend marker missing"

activation=0
trap - EXIT
say "GOOGLE REVIEW DIRECT FLOW V1 DEPLOY COMPLETE"
say "Rollback backup: $backup"
