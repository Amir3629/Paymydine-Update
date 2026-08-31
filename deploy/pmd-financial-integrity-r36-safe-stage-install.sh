#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
PMD_SOURCE="${PMD_SOURCE:?PMD_SOURCE must point to the immutable R36 release source}"
PMD_V2_ROOT="${PMD_V2_ROOT:-$PMD_ROOT/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815}"
PMD_DOMAIN="${PMD_DOMAIN:-mimoza.paymydine.com}"
PMD_SERVICE="${PMD_SERVICE:-paymydine-frontend-v2}"
export PMD_SERVICE

[[ "$PMD_SERVICE" == "paymydine-frontend-v2" ]] || { echo "Refusing non-V2 PM2 service: $PMD_SERVICE" >&2; exit 2; }
[[ -d "$PMD_ROOT" && -d "$PMD_SOURCE" && -f "$PMD_SOURCE/artisan" ]] || { echo "Invalid PMD_ROOT/PMD_SOURCE" >&2; exit 2; }
[[ "$PMD_SOURCE" != "$PMD_ROOT" ]] || { echo "Source must be an immutable release directory, not the live worktree" >&2; exit 2; }

for marker in PMD_PAYMENT_LIFECYCLE_SEPARATION_R37C PMD_CASHIER_MANUAL_TABLE_FREE_R45 PMD_DIRECT_KITCHEN_SEND_R33B; do
  rg -q "$marker" "$PMD_SOURCE" || { echo "Missing protection marker: $marker" >&2; exit 3; }
done
rg -q 'multiOrderCaptureLockedRef' "$PMD_SOURCE/frontend-v2" || { echo 'Missing R35c grouped capture guard' >&2; exit 3; }
theme_count="$(find "$PMD_SOURCE/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/themes" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)"
(( theme_count >= 10 )) || { echo "Expected 10 themes; found $theme_count" >&2; exit 3; }

available_kb="$(df -Pk "$PMD_ROOT" | awk 'NR==2 {print $4}')"
required_kb="$(du -sk "$PMD_SOURCE" | awk '{print $1 * 3}')"
(( available_kb > required_kb )) || { echo 'Insufficient same-filesystem staging space' >&2; exit 4; }

stamp="$(date -u +%Y%m%d_%H%M%S)"
backup="$PMD_ROOT/storage/pmd-r36-backups/$stamp"
stage="$PMD_ROOT/storage/pmd-r36-stage-$stamp"
mkdir -p "$backup/files" "$stage"

mapfile -t files < <(cd "$PMD_SOURCE" && git diff --name-only aaf5fdf599987e2f1eab5aac2173b19d3b08f00e -- . ':!frontend-v2/**/node_modules/**')
for rel in "${files[@]}"; do
  [[ -f "$PMD_ROOT/$rel" ]] || continue
  mkdir -p "$backup/files/$(dirname "$rel")"
  cp -a "$PMD_ROOT/$rel" "$backup/files/$rel"
done

find "$PMD_SOURCE/app" -type f -name '*.php' -print0 | xargs -0 -n1 php -l >/dev/null
php "$PMD_SOURCE/artisan" migrate --force --no-interaction

if printf '%s\n' "${files[@]}" | rg -q '^frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/'; then
  v2_source="$PMD_SOURCE/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
  v2_stage="$stage/v2"
  cp -a "$v2_source/." "$v2_stage/"
  rm -rf "$v2_stage/node_modules"
  [[ -d "$PMD_V2_ROOT/node_modules" ]] && cp -al "$PMD_V2_ROOT/node_modules" "$v2_stage/node_modules"
  (cd "$v2_stage" && npm run release:audit && npm run build)
  pm2_cwd="$(sudo -u ubuntu pm2 jlist | php -r '$j=json_decode(stream_get_contents(STDIN),true); foreach($j?:[] as $p){if(($p["name"]??"")==getenv("PMD_SERVICE")){echo $p["pm2_env"]["pm_cwd"]??"";}}')"
  [[ "$pm2_cwd" == "$PMD_V2_ROOT" ]] || { echo "PM2 cwd mismatch: $pm2_cwd" >&2; exit 5; }
fi

for rel in "${files[@]}"; do
  [[ -f "$PMD_SOURCE/$rel" ]] || continue
  mkdir -p "$PMD_ROOT/$(dirname "$rel")"
  cp -a "$PMD_SOURCE/$rel" "$PMD_ROOT/$rel"
done

cat >"$backup/rollback.sh" <<ROLLBACK
#!/usr/bin/env bash
set -Eeuo pipefail
cp -a "$backup/files/." "$PMD_ROOT/"
echo 'Application files restored. R36 additive financial tables were intentionally retained; never drop them after real payments.'
ROLLBACK
chmod 700 "$backup/rollback.sh"

if printf '%s\n' "${files[@]}" | rg -q '^frontend-v2/'; then sudo -u ubuntu pm2 restart "$PMD_SERVICE" --update-env; fi
curl --fail --silent --show-error "https://$PMD_DOMAIN/api/health" >/dev/null
curl --fail --silent --show-error --output /dev/null "https://$PMD_DOMAIN/preview"
echo "Backup: $backup"
echo "Rollback: $backup/rollback.sh"
