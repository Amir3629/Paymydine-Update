#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
PMD_BRANCH="${PMD_BRANCH:-feat/google-business-profile-integration-v2}"
PMD_SERVICE="${PMD_SERVICE:-paymydine-frontend-v2}"
PMD_PORT="${PMD_PORT:-3002}"
PMD_V2_REL="frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
PMD_V2_ROOT="${PMD_V2_ROOT:-$PMD_ROOT/$PMD_V2_REL}"

say() { printf '[GOOGLE-BUSINESS-OVERLAY] %s\n' "$*"; }
fail() { printf '[GOOGLE-BUSINESS-OVERLAY] REFUSED: %s\n' "$*" >&2; exit 2; }

[[ -d "$PMD_ROOT/.git" && -f "$PMD_ROOT/artisan" ]] || fail "PayMyDine worktree not found"
[[ -f "$PMD_V2_ROOT/package.json" ]] || fail "Active Frontend V2 root not found"
cd "$PMD_ROOT"

targets=(
  "app/Http/Controllers/GoogleBusinessIntegrationController.php"
  "app/Services/GoogleBusiness/PmdGoogleBusinessService.php"
  "app/admin/controllers/Pmdgooglebusiness.php"
  "app/admin/controllers/Pmdsettings.php"
  "app/admin/controllers/Reviews.php"
  "app/admin/database/migrations/2026_09_20_000100_create_pmd_google_business_integration.php"
  "app/admin/database/migrations/2026_09_20_000200_ensure_pmd_google_business_integration_on_tenants.php"
  "app/admin/routes.php"
  "app/admin/views/pmdgooglebusiness/locations.blade.php"
  "app/admin/views/pmdsettings/restaurant.blade.php"
  "app/admin/views/reviews/index.blade.php"
  "app/main/routes.php"
  "app/main/routes/api-health-media.php"
  "app/main/routes/api-v1-google-business.php"
  "app/main/routes/main-public-compat.php"
  "app/main/routes/next-proxy.php"
  "$PMD_V2_REL/src/runtime/components/ReviewShareEnhancer.tsx"
  "routes/admin-app-before.php"
  "routes/api.php"
  "routes/google-business-profile.php"
  "routes/pmd-public-compat-handler.php"
  "routes.php"
)

say "Fetching integration refs quietly"
git fetch --quiet origin main "$PMD_BRANCH"

release_ref="origin/$PMD_BRANCH"
release_sha="$(git rev-parse "$release_ref")"
live_sha="$(git rev-parse HEAD)"

deployed_marker="$PMD_ROOT/storage/pmd-google-business-release-sha"
legacy_google_base="1a4fad4d65448472a146d616ab23821c30fe5244"

if [[ -s "$deployed_marker" ]]; then
  candidate_base="$(tr -d '[:space:]' < "$deployed_marker")"
  if [[ -n "$candidate_base" ]] && git cat-file -e "$candidate_base^{commit}" 2>/dev/null; then
    base_ref="$candidate_base"
  else
    fail "Google release marker exists but does not contain a valid Git commit"
  fi
elif [[ -f "$PMD_ROOT/app/Services/GoogleBusiness/PmdGoogleBusinessService.php" ]] \
  && grep -q 'class PmdGoogleBusinessService' "$PMD_ROOT/app/Services/GoogleBusiness/PmdGoogleBusinessService.php" \
  && grep -q 'PMD_GOOGLE_BUSINESS_PROFILE_INTEGRATION_V2' "$PMD_V2_ROOT/src/runtime/components/ReviewShareEnhancer.tsx"; then
  base_ref="$legacy_google_base"
else
  base_ref="origin/main"
fi

base_sha="$(git rev-parse "$base_ref")"

if [[ "$base_sha" == "$release_sha" ]]; then
  say "Google integration is already at release $release_sha"
  exit 0
fi

git merge-base --is-ancestor "$base_sha" "$release_sha" \
  || fail "Installed Google integration base $base_sha is not an ancestor of release $release_sha"

stamp="$(date -u +%Y%m%d_%H%M%S)"
stage="/tmp/pmd-google-business-overlay-stage-$stamp"
backup="$PMD_ROOT/storage/pmd-google-business-overlay-backup-$stamp"
patch_file="$stage/google-business.patch"
tree="$stage/tree"
originals="$stage/originals"
existing_list="$stage/existing-targets.txt"
new_list="$stage/new-targets.txt"
new_dirs="$stage/new-dirs.txt"

rm -rf "$stage"
mkdir -p "$tree" "$originals"
: > "$existing_list"
: > "$new_list"
: > "$new_dirs"

cleanup_stage() {
  rm -rf "$stage"
}
trap cleanup_stage EXIT

say "Live HEAD: $live_sha"
say "Patch source: $base_sha -> $release_sha"
say "Checking only Google integration files; unrelated dirty/staged files are ignored"

frontend_changed=0
if ! git diff --quiet "$base_ref..$release_ref" -- "$PMD_V2_REL"; then
  frontend_changed=1
fi
say "Frontend V2 changed in this release: $frontend_changed"

curl -fsS --max-time 8 "http://127.0.0.1:$PMD_PORT/api/health" >/dev/null \
  || fail "Frontend V2 is not healthy before deployment. Recover port $PMD_PORT first."

git diff --binary --full-index "$base_ref..$release_ref" -- "${targets[@]}" > "$patch_file"
[[ -s "$patch_file" ]] || fail "Integration patch is empty"

for rel in "${targets[@]}"; do
  mkdir -p "$tree/$(dirname "$rel")" "$originals/$(dirname "$rel")"
  if [[ -f "$PMD_ROOT/$rel" ]]; then
    cp -a "$PMD_ROOT/$rel" "$tree/$rel"
    cp -a "$PMD_ROOT/$rel" "$originals/$rel"
    printf '%s\n' "$rel" >> "$existing_list"
  else
    printf '%s\n' "$rel" >> "$new_list"
    dir="$PMD_ROOT/$(dirname "$rel")"
    [[ -d "$dir" ]] || printf '%s\n' "$dir" >> "$new_dirs"
  fi
done
sort -u -o "$new_dirs" "$new_dirs"

say "Preflight: applying patch to isolated copy"
if ! (cd "$tree" && git apply --check --whitespace=nowarn "$patch_file"); then
  fail "Google patch does not cleanly match the current live target files. No production file was changed."
fi
(cd "$tree" && git apply --whitespace=nowarn "$patch_file")

say "Preflight: PHP syntax"
while IFS= read -r -d '' phpfile; do
  php -l "$phpfile" >/dev/null
done < <(find "$tree/app" "$tree/routes" -type f -name '*.php' -print0 2>/dev/null)

grep -q 'class PmdGoogleBusinessService'   "$tree/app/Services/GoogleBusiness/PmdGoogleBusinessService.php"   || fail "Google Business service marker missing"

grep -q 'PMD_GOOGLE_BUSINESS_PROFILE_INTEGRATION_V2'   "$tree/$PMD_V2_REL/src/runtime/components/ReviewShareEnhancer.tsx"   || fail "Frontend Google integration marker missing"

if [[ "$frontend_changed" == "1" ]]; then
  say "Preflight: building current live Frontend V2 baseline"
  v2_stage="$stage/v2"
  mkdir -p "$v2_stage"
  (
    cd "$PMD_V2_ROOT"
    tar --exclude='./node_modules' --exclude='./.next' -cf - .
  ) | (
    cd "$v2_stage"
    tar -xf -
  )
  [[ -d "$PMD_V2_ROOT/node_modules" ]] || fail "Frontend V2 node_modules is missing"
  cp -al "$PMD_V2_ROOT/node_modules" "$v2_stage/node_modules"
  
  baseline_log="$stage/frontend-baseline-build.log"
  if ! (
    cd "$v2_stage"
    npm run typecheck:offline
    npm run build
  ) >"$baseline_log" 2>&1; then
    tail -n 80 "$baseline_log" >&2 || true
    fail "Current live Frontend V2 source does not pass baseline typecheck/build. No production file was changed."
  fi
  [[ -d "$v2_stage/.next" ]] || fail "Baseline Frontend V2 build did not produce .next"
  mv "$v2_stage/.next" "$stage/baseline.next"
  
  say "Preflight: building Google-integrated Frontend V2"
  cp -a   "$tree/$PMD_V2_REL/src/runtime/components/ReviewShareEnhancer.tsx"   "$v2_stage/src/runtime/components/ReviewShareEnhancer.tsx"
  
  integration_log="$stage/frontend-google-build.log"
  if ! (
    cd "$v2_stage"
    npm run typecheck:offline
    npm run build
  ) >"$integration_log" 2>&1; then
    tail -n 80 "$integration_log" >&2 || true
    fail "Google-integrated Frontend V2 typecheck/build failed. No production file was changed."
  fi
  [[ -d "$v2_stage/.next" ]] || fail "Google-integrated Frontend V2 build did not produce .next"
  mv "$v2_stage/.next" "$stage/integration.next"
else
  say "Preflight: Frontend V2 unchanged; skipping Next typecheck/build/swap for this incremental release"
fi

say "Preflight: confirming target files did not change during build"
while IFS= read -r rel; do
  [[ -n "$rel" ]] || continue
  cmp -s "$originals/$rel" "$PMD_ROOT/$rel"     || fail "Live target changed during preflight: $rel. No production file was changed."
done < "$existing_list"

while IFS= read -r rel; do
  [[ -n "$rel" ]] || continue
  [[ ! -e "$PMD_ROOT/$rel" ]]     || fail "A previously-new target appeared during preflight: $rel. No production file was changed."
done < "$new_list"

say "Preflight passed. Verifying sudo before any production write"
if ! sudo -n true 2>/dev/null; then
  sudo -v || fail "sudo authorization is required for protected PayMyDine runtime files"
fi

say "Backing up only Google integration target files"
sudo mkdir -p "$backup/files"
sudo chown "$(id -u):$(id -g)" "$backup" 2>/dev/null || true

while IFS= read -r rel; do
  [[ -n "$rel" ]] || continue
  sudo mkdir -p "$backup/files/$(dirname "$rel")"
  sudo cp -a "$PMD_ROOT/$rel" "$backup/files/$rel"
done < "$existing_list"

cp "$existing_list" "$backup/existing-targets.txt"
cp "$new_list" "$backup/new-targets.txt"
cp "$new_dirs" "$backup/new-dirs.txt"
printf '%s\n' "$live_sha" > "$backup/live-head.txt"
printf '%s\n' "$release_sha" > "$backup/google-release-sha.txt"

source_changed=0
next_changed=0
rolling_back=0

rollback_now() {
  local rc="${1:-1}"
  [[ "$rolling_back" == "0" ]] || exit "$rc"
  rolling_back=1
  set +e

  say "Activation failed; restoring only Google integration files"

  if [[ "$source_changed" == "1" ]]; then
    while IFS= read -r rel; do
      [[ -n "$rel" ]] || continue
      if [[ -f "$backup/files/$rel" ]]; then
        sudo mkdir -p "$PMD_ROOT/$(dirname "$rel")"
        sudo cp -a "$backup/files/$rel" "$PMD_ROOT/$rel"
      fi
    done < "$existing_list"

    while IFS= read -r rel; do
      [[ -n "$rel" ]] || continue
      sudo rm -f "$PMD_ROOT/$rel"
    done < "$new_list"

    if [[ -s "$new_dirs" ]]; then
      tac "$new_dirs" | while IFS= read -r dir; do
        [[ -n "$dir" ]] && sudo rmdir "$dir" 2>/dev/null || true
      done
    fi
  fi

  if [[ "$next_changed" == "1" ]]; then
    sudo rm -rf "$PMD_V2_ROOT/.next"

    if [[ -d "$backup/next.previous" ]]; then
      sudo cp -a "$backup/next.previous" "$PMD_V2_ROOT/.next"
    elif [[ -d "$stage/baseline.next" ]]; then
      sudo cp -a "$stage/baseline.next" "$PMD_V2_ROOT/.next"
    fi
  fi

  cd "$PMD_ROOT"
  php artisan optimize:clear >/dev/null 2>&1 || true
  if systemctl list-unit-files php8.3-fpm.service >/dev/null 2>&1; then
    sudo systemctl reload php8.3-fpm >/dev/null 2>&1 || true
  fi

  if [[ "$next_changed" == "1" ]]; then
    sudo -u ubuntu -H pm2 restart "$PMD_SERVICE" --update-env >/dev/null 2>&1 || true

    rollback_health=0
    for attempt in 1 2 3 4 5 6 7 8 9 10; do
      if curl -fsS --max-time 5 "http://127.0.0.1:$PMD_PORT/api/health" >/dev/null 2>&1; then
        rollback_health=1
        break
      fi
      sleep 2
    done

    if [[ "$rollback_health" == "1" ]]; then
      say "Rollback health PASS"
    else
      say "WARNING: rollback restored .next but Frontend V2 health is still failing"
    fi
  else
    say "Frontend V2 was never changed; PM2 restart skipped during rollback"
  fi

  say "Rollback finished; unrelated VPS files/index were not touched"
  cleanup_stage
  exit "$rc"
}
trap 'rc=$?; if [[ "$source_changed" == "1" || "$next_changed" == "1" ]]; then rollback_now "$rc"; else cleanup_stage; fi' EXIT

say "Activating only staged Google integration source files"
source_changed=1

while IFS= read -r rel; do
  [[ -n "$rel" ]] || continue
  sudo cp -- "$tree/$rel" "$PMD_ROOT/$rel"
done < "$existing_list"

while IFS= read -r rel; do
  [[ -n "$rel" ]] || continue
  dest="$PMD_ROOT/$rel"
  parent="$(dirname "$dest")"
  sudo mkdir -p "$parent"
  sudo install -m 0644 "$tree/$rel" "$dest"
done < "$new_list"

grep -q 'class PmdGoogleBusinessService'   "$PMD_ROOT/app/Services/GoogleBusiness/PmdGoogleBusinessService.php"   || fail "Live Google Business service marker missing after source activation"

cd "$PMD_ROOT"
php artisan optimize:clear >/dev/null 2>&1 || true

say "Verifying Google callback on the active PayMyDine API route authority"
grep -q "api-v1-google-business.php" "$PMD_ROOT/app/main/routes/api-health-media.php" \
  || fail "Active API v1 loader does not load Google Business routes"
grep -q 'PMD_GOOGLE_BUSINESS_ACTIVE_TENANT_ROUTES_V4' "$PMD_ROOT/app/main/routes/api-v1-google-business.php" \
  || fail "Active tenant Google route module marker is missing"
grep -q "/integrations/google-business/callback" "$PMD_ROOT/app/main/routes/api-v1-google-business.php" \
  || fail "Tenant Google OAuth callback definition is missing"
grep -q "/integrations/google-business/pubsub" "$PMD_ROOT/app/main/routes/api-v1-google-business.php" \
  || fail "Tenant Google Pub/Sub definition is missing"
if grep -q "routes/google-business-profile.php" "$PMD_ROOT/routes.php"; then
  fail "Legacy storefront Google callback loader is still active"
fi
php -l "$PMD_ROOT/app/main/routes/api-health-media.php" >/dev/null
php -l "$PMD_ROOT/app/main/routes/api-v1-google-business.php" >/dev/null
php -l "$PMD_ROOT/app/Http/Controllers/GoogleBusinessIntegrationController.php" >/dev/null
php -l "$PMD_ROOT/app/Services/GoogleBusiness/PmdGoogleBusinessService.php" >/dev/null

say "Active tenant Google API route source verification PASS"

if [[ "$frontend_changed" == "1" ]]; then
  say "Activating tested Google-integrated Frontend V2 build"
  next_changed=1
  if [[ -d "$PMD_V2_ROOT/.next" ]]; then
    sudo mv "$PMD_V2_ROOT/.next" "$backup/next.previous"
  fi
  sudo mv "$stage/integration.next" "$PMD_V2_ROOT/.next"
  
  if systemctl list-unit-files php8.3-fpm.service >/dev/null 2>&1; then
    sudo systemctl reload php8.3-fpm
  fi
  sudo -u ubuntu -H pm2 restart "$PMD_SERVICE" --update-env >/dev/null
  
  frontend_health=0
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS --max-time 5 "http://127.0.0.1:$PMD_PORT/api/health" >/dev/null; then
      frontend_health=1
      break
    fi
    sleep 2
  done
  [[ "$frontend_health" == "1" ]] || fail "Frontend V2 health failed after Google integration activation"
else
  say "Frontend V2 unchanged; leaving .next and PM2 untouched"
  if systemctl list-unit-files php8.3-fpm.service >/dev/null 2>&1; then
    sudo systemctl reload php8.3-fpm
  fi
  curl -fsS --max-time 8 "http://127.0.0.1:$PMD_PORT/api/health" >/dev/null \
    || fail "Frontend V2 health changed during backend-only Google activation"
fi

grep -q 'PMD_GOOGLE_BUSINESS_PROFILE_INTEGRATION_V2'   "$PMD_V2_ROOT/src/runtime/components/ReviewShareEnhancer.tsx"   || fail "Live Frontend Google integration marker missing"

source_changed=0
next_changed=0
printf '%s\n' "$release_sha" | sudo tee "$deployed_marker" >/dev/null
trap - EXIT
cleanup_stage

say "DEPLOY COMPLETE"
say "Only Google integration target files and Frontend V2 .next were changed."
say "No git index, commit, branch, reset, checkout, merge, or unrelated file was modified."
say "Existing previous .next (for forensic rollback): $backup/next.previous"
say "Source backup: $backup/files"
