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

# Only these files belong to this integration. Nothing else is read/written by activation.
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
  "app/main/routes/main-public-compat.php"
  "app/main/routes/next-proxy.php"
  "$PMD_V2_REL/src/runtime/components/ReviewShareEnhancer.tsx"
  "routes/admin-app-before.php"
  "routes/api.php"
  "routes/google-business-profile.php"
  "routes/pmd-public-compat-handler.php"
)

say "Fetching integration refs quietly"
git fetch --quiet origin main "$PMD_BRANCH"

base_ref="origin/main"
release_ref="origin/$PMD_BRANCH"
base_sha="$(git rev-parse "$base_ref")"
release_sha="$(git rev-parse "$release_ref")"
live_sha="$(git rev-parse HEAD)"

stamp="$(date -u +%Y%m%d_%H%M%S)"
# IMPORTANT: stage must live OUTSIDE the PayMyDine Git worktree.
# Running git apply from a nested directory inside the repo can ignore paths
# that are outside that nested directory while still exiting successfully.
stage="/tmp/pmd-google-business-overlay-stage-$stamp"
backup="$PMD_ROOT/storage/pmd-google-business-overlay-backup-$stamp"
patch_file="$stage/google-business.patch"
rm -rf "$stage"
mkdir -p "$stage/tree" "$backup/files"

cleanup_stage() {
  rm -rf "$stage"
}
trap cleanup_stage EXIT

say "Live HEAD: $live_sha"
say "Patch source: $base_sha -> $release_sha"
say "Checking only Google integration files; unrelated dirty/staged files are ignored"

git diff --binary --full-index "$base_ref..$release_ref" -- "${targets[@]}" > "$patch_file"
[[ -s "$patch_file" ]] || fail "Integration patch is empty"

# Build a miniature copy of only the integration target files from the CURRENT live worktree.
# Parent directories are created even for NEW files so git apply can materialize them in the isolated stage.
for rel in "${targets[@]}"; do
  mkdir -p "$stage/tree/$(dirname "$rel")"
  if [[ -f "$PMD_ROOT/$rel" ]]; then
    cp -a "$PMD_ROOT/$rel" "$stage/tree/$rel"
  fi
done

say "Preflight: verifying patch against current live file contents"
if ! (cd "$stage/tree" && git apply --check --whitespace=nowarn "$patch_file"); then
  fail "Google patch does not cleanly match the current live files. No production file was changed."
fi

(cd "$stage/tree" && git apply --whitespace=nowarn "$patch_file")

say "Preflight: PHP syntax"
while IFS= read -r -d '' phpfile; do
  php -l "$phpfile" >/dev/null
done < <(find "$stage/tree/app" "$stage/tree/routes" -type f -name '*.php' -print0 2>/dev/null)

grep -q 'class PmdGoogleBusinessService'   "$stage/tree/app/Services/GoogleBusiness/PmdGoogleBusinessService.php"   || fail "Google Business service marker missing"

grep -q 'PMD_GOOGLE_BUSINESS_PROFILE_INTEGRATION_V2'   "$stage/tree/$PMD_V2_REL/src/runtime/components/ReviewShareEnhancer.tsx"   || fail "Frontend Google integration marker missing"

say "Preflight: isolated Frontend V2 typecheck/build"
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
cp -a   "$stage/tree/$PMD_V2_REL/src/runtime/components/ReviewShareEnhancer.tsx"   "$v2_stage/src/runtime/components/ReviewShareEnhancer.tsx"

(
  cd "$v2_stage"
  npm run typecheck:offline >/dev/null
  npm run build >/dev/null
)
[[ -d "$v2_stage/.next" ]] || fail "Frontend V2 build did not produce .next"

# Verify again immediately before activation.
if ! git apply --check --whitespace=nowarn "$patch_file"; then
  fail "Live target files changed during preflight. No production file was changed."
fi

say "Backing up only Google integration target files"
: > "$backup/new-files.txt"
: > "$backup/new-dirs.txt"
for rel in "${targets[@]}"; do
  if [[ -f "$PMD_ROOT/$rel" ]]; then
    mkdir -p "$backup/files/$(dirname "$rel")"
    cp -a "$PMD_ROOT/$rel" "$backup/files/$rel"
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

if [[ -f "\$BACKUP/new-dirs.txt" ]]; then
  tac "\$BACKUP/new-dirs.txt" | while IFS= read -r dir; do
    [[ -n "\$dir" ]] && rmdir "\$dir" 2>/dev/null || true
  done
fi

rm -rf "\$PMD_V2_ROOT/.next"
if [[ -d "\$BACKUP/next.previous" ]]; then
  mv "\$BACKUP/next.previous" "\$PMD_V2_ROOT/.next"
fi

cd "\$PMD_ROOT"
php artisan optimize:clear >/dev/null 2>&1 || true
if systemctl list-unit-files php8.3-fpm.service >/dev/null 2>&1; then
  sudo systemctl reload php8.3-fpm || true
fi
sudo -u ubuntu -H pm2 restart "\$PMD_SERVICE" --update-env >/dev/null
curl -fsS "http://127.0.0.1:\$PMD_PORT/api/health" >/dev/null

echo "Google integration rollback complete. Unrelated VPS files/index were not touched."
ROLLBACK
chmod 700 "$backup/rollback.sh"

activation=0
rolling_back=0
rollback_now() {
  local rc="${1:-1}"
  [[ "$rolling_back" == "0" ]] || exit "$rc"
  rolling_back=1
  set +e

  say "Activation failed; restoring only Google integration target files"
  if [[ -f "$backup/new-files.txt" ]]; then
    while IFS= read -r rel; do
      [[ -n "$rel" ]] && rm -f "$PMD_ROOT/$rel"
    done < "$backup/new-files.txt"
  fi
  cp -a "$backup/files/." "$PMD_ROOT/"

  if [[ -f "$backup/new-dirs.txt" ]]; then
    tac "$backup/new-dirs.txt" | while IFS= read -r dir; do
      [[ -n "$dir" ]] && rmdir "$dir" 2>/dev/null || true
    done
  fi

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
trap 'rc=$?; if [[ "$activation" == "1" && "$rc" != "0" ]]; then rollback_now "$rc"; else cleanup_stage; fi' EXIT

activation=1

say "Preparing parent directories for new Google integration files"
for rel in "${targets[@]}"; do
  dir="$PMD_ROOT/$(dirname "$rel")"
  if [[ ! -d "$dir" ]]; then
    printf '%s\n' "$dir" >> "$backup/new-dirs.txt"
    mkdir -p "$dir"
  fi
done

say "Applying Google integration patch only"
git apply --whitespace=nowarn "$patch_file"

# No git add/commit/reset/checkout/merge and no broad migration command.
# Tenant Google tables are created lazily on first successful Google connection.

say "Activating tested Frontend V2 build"
mv "$PMD_V2_ROOT/.next" "$backup/next.previous"
mv "$v2_stage/.next" "$PMD_V2_ROOT/.next"

php artisan optimize:clear >/dev/null 2>&1 || true
if systemctl list-unit-files php8.3-fpm.service >/dev/null 2>&1; then
  sudo systemctl reload php8.3-fpm
fi
sudo -u ubuntu -H pm2 restart "$PMD_SERVICE" --update-env >/dev/null

for attempt in 1 2 3 4 5 6; do
  if curl -fsS "http://127.0.0.1:$PMD_PORT/api/health" >/dev/null; then
    break
  fi
  sleep 2
  [[ "$attempt" != "6" ]] || fail "Frontend V2 health failed after activation"
done

php artisan route:list 2>/dev/null | grep -q 'integrations/google-business/callback'   || fail "Google OAuth callback route is missing"
php artisan route:list 2>/dev/null | grep -q 'integrations/google-business/pubsub'   || fail "Google Pub/Sub route is missing"

grep -q 'class PmdGoogleBusinessService'   "$PMD_ROOT/app/Services/GoogleBusiness/PmdGoogleBusinessService.php"   || fail "Google Business service is not live"

activation=0
trap - EXIT
cleanup_stage

say "DEPLOY COMPLETE"
say "Only Google integration target files and Frontend V2 .next were changed."
say "No git index, commit, branch, unrelated file, or broad migration was modified."
say "Rollback: $backup/rollback.sh"
