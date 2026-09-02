#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="${LIVE:-/var/www/paymydine}"
REPO="${REPO:-/var/www/paymydine/frontend/Paymydine-Update}"
BASE_URL="${BASE_URL:-https://mimoza.paymydine.com}"

FILES=(
  app/admin/routes.php
  app/admin/views/_partials/pmd_admin_i18n.blade.php
  app/admin/views/_partials/side_nav.blade.php
  app/admin/assets/js/pmd-admin-i18n-v1.js
  app/admin/assets/js/pmd-admin-i18n-page-authority-v2.js
  app/admin/assets/js/pmd-admin-i18n-catalog-de.js
  app/admin/views/waiter_pos.blade.php
  app/admin/views/waiter_pos_shell.blade.php
  app/admin/views/waiter_dashboard_new.blade.php
  app/admin/assets/js/pmd-waiter-pos-v1.js
  app/admin/assets/js/pmd-waiter-pos-payment-v2.js
  app/admin/assets/js/pmd-waiter-pos-payment-v3.js
)

printf '%s\n' '============================================================'
printf '%s\n' ' PAYMYDINE ADMIN I18N READ-ONLY LIVE AUDIT'
printf '%s\n' '============================================================'
printf 'Time: %s\n' "$(date -Is)"
printf 'Live: %s\nRepo: %s\nURL:  %s\n\n' "$LIVE" "$REPO" "$BASE_URL"

printf '%s\n' '===== 1. REPOSITORY STATE (NO CHANGES) ====='
if git -C "$REPO" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  printf 'Branch: %s\n' "$(git -C "$REPO" branch --show-current 2>/dev/null || true)"
  printf 'HEAD:   %s\n' "$(git -C "$REPO" rev-parse HEAD 2>/dev/null || true)"
  git -C "$REPO" status --short --branch || true
else
  echo 'Repository checkout not found.'
fi

echo
printf '%s\n' '===== 2. REPO VS LIVE HASHES ====='
for rel in "${FILES[@]}"; do
  repo_file="$REPO/$rel"
  live_file="$LIVE/$rel"
  printf '\n[%s]\n' "$rel"
  if [[ -f "$repo_file" ]]; then
    printf 'REPO  '; sha256sum "$repo_file"
  else
    echo 'REPO  MISSING'
  fi
  if [[ -f "$live_file" ]]; then
    printf 'LIVE  '; sha256sum "$live_file"
  else
    echo 'LIVE  MISSING'
  fi
done

echo
printf '%s\n' '===== 3. ACTIVE I18N / LANGUAGE MARKERS ====='
grep -nE \
  'PMD_(ADMIN_)?(I18N|LANGUAGE|LOCALE)|language-switch|pmd_admin_locale|translator\.localization|PMDAdminI18n|PMD_ADMIN_LOCALE' \
  "$LIVE/app/admin/routes.php" \
  "$LIVE/app/admin/views/_partials/pmd_admin_i18n.blade.php" \
  "$LIVE/app/admin/views/_partials/side_nav.blade.php" \
  2>/dev/null | head -260 || true

echo
printf '%s\n' '===== 4. WAITER STANDALONE LANGUAGE BOOT ====='
grep -nE \
  '<html[^>]+lang=|pmd_admin_i18n|pmd_admin_messages|PMDAdminMessages|PMD_ADMIN_LOCALE' \
  "$LIVE/app/admin/views/waiter_pos.blade.php" \
  "$LIVE/app/admin/views/waiter_dashboard_new.blade.php" \
  "$LIVE/app/admin/views/waiter_pos_shell.blade.php" \
  2>/dev/null || true

echo
printf '%s\n' '===== 4B. WAITER DASHBOARD SCRIPT AUTHORITIES ====='
waiter_view="$LIVE/app/admin/views/waiter_dashboard_new.blade.php"
if [[ -f "$waiter_view" ]]; then
  grep -oE 'app/admin/assets/js/pmd-waiter-[A-Za-z0-9._-]+\.js' "$waiter_view" \
    | sort -u \
    | while IFS= read -r rel_asset; do
        [[ -n "$rel_asset" ]] || continue
        live_asset="$LIVE/$rel_asset"
        printf '\n[%s]\n' "$rel_asset"
        if [[ -f "$live_asset" ]]; then
          printf 'LIVE  '; sha256sum "$live_asset"
          printf 'UI_LITERAL_HINTS  '
          grep -Ec '(textContent|innerHTML|placeholder|aria-label|title)[^;]{0,180}[A-Za-z]{3,}' "$live_asset" 2>/dev/null || true
        else
          echo 'LIVE  MISSING'
        fi
        url="${BASE_URL}/${rel_asset}?pmd_i18n_audit=$(date +%s)"
        if body="$(curl -fsSL --max-time 20 "$url" 2>/dev/null)"; then
          printf 'SERVED_SHA256  %s\n' "$(printf '%s' "$body" | sha256sum | awk '{print $1}')"
        else
          echo 'SERVED_SHA256  FETCH_FAILED'
        fi
      done
else
  echo 'waiter_dashboard_new.blade.php not found.'
fi

echo
printf '%s\n' '===== 5. LANGUAGE DATABASE STATE (READ ONLY) ====='
if [[ -f "$LIVE/artisan" ]]; then
  php "$LIVE/artisan" tinker --execute='
$rows = DB::table("languages")
  ->whereIn("code", ["en", "de"])
  ->orderBy("code")
  ->get(["language_id", "name", "code", "status"]);
foreach ($rows as $row) {
    echo json_encode($row, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).PHP_EOL;
}
try {
    echo "staff_language_counts=".json_encode(
        DB::table("staffs")
          ->selectRaw("language_id, COUNT(*) AS total")
          ->groupBy("language_id")
          ->orderBy("language_id")
          ->get(),
        JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES
    ).PHP_EOL;
} catch (Throwable $e) {
    echo "staff_language_counts_error=".$e->getMessage().PHP_EOL;
}
try {
    echo "translation_rows_en=".DB::table("translations")->where("locale", "en")->count().PHP_EOL;
    echo "translation_rows_de=".DB::table("translations")->where("locale", "de")->count().PHP_EOL;
} catch (Throwable $e) {
    echo "translation_count_error=".$e->getMessage().PHP_EOL;
}
' 2>&1 || true
fi

echo
printf '%s\n' '===== 6. ASSETS ACTUALLY SERVED BY NGINX ====='
for asset in \
  /app/admin/assets/js/pmd-admin-i18n-v1.js \
  /app/admin/assets/js/pmd-admin-i18n-page-authority-v2.js \
  /app/admin/assets/js/pmd-admin-i18n-catalog-de.js \
  /app/admin/assets/js/pmd-waiter-pos-v1.js \
  /app/admin/assets/js/pmd-waiter-pos-payment-v2.js \
  /app/admin/assets/js/pmd-waiter-pos-payment-v3.js
do
  url="${BASE_URL}${asset}?pmd_i18n_audit=$(date +%s)"
  printf '\n%s\n' "$asset"
  headers="$(curl -fsSIL --max-time 15 "$url" 2>/dev/null || true)"
  printf '%s\n' "$headers" | awk 'BEGIN{IGNORECASE=1} /^HTTP\// || /^content-type:/ || /^content-length:/ || /^etag:/ || /^last-modified:/' | tail -10
  if body="$(curl -fsSL --max-time 20 "$url" 2>/dev/null)"; then
    printf 'SERVED_SHA256  %s\n' "$(printf '%s' "$body" | sha256sum | awk '{print $1}')"
  else
    echo 'SERVED_SHA256  FETCH_FAILED'
  fi
done

echo
printf '%s\n' '===== 7. SUMMARY COUNTS ====='
printf 'V3 language routes: '
grep -c 'PMD_LANGUAGE_SWITCH_ROUTE_V3_BEGIN' "$LIVE/app/admin/routes.php" 2>/dev/null || true
printf 'V2 language routes: '
grep -c 'PMD_LANGUAGE_SWITCH_ROUTE_V2_BEGIN' "$LIVE/app/admin/routes.php" 2>/dev/null || true
printf 'Page authority references: '
grep -Rsl 'pmd-admin-i18n-page-authority-v2.js' "$LIVE/app/admin/views" 2>/dev/null | wc -l
printf 'Global DOM translator references: '
grep -Rsl 'pmd-admin-i18n-v1.js' "$LIVE/app/admin/views" 2>/dev/null | wc -l
printf 'Waiter HTML lang=en occurrences: '
grep -Rhs '<html[^>]*lang="en"' \
  "$LIVE/app/admin/views/waiter_pos.blade.php" \
  "$LIVE/app/admin/views/waiter_dashboard_new.blade.php" 2>/dev/null | wc -l

echo
printf '%s\n' '============================================================'
printf '%s\n' ' READ-ONLY AUDIT COMPLETE — NO FILES OR DATABASE ROWS CHANGED'
printf '%s\n' '============================================================'
