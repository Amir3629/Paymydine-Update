#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="${LIVE:-/var/www/paymydine}"
BASE_URL="${BASE_URL:-https://mimoza.paymydine.com}"
TENANT_DOMAIN="${TENANT_DOMAIN:-mimoza.paymydine.com}"

printf '%s\n' '============================================================'
printf '%s\n' ' PMD LANGUAGE RUNTIME AUDIT V2 - READ ONLY'
printf '%s\n' '============================================================'
printf 'Time: %s\nLive: %s\nTenant: %s\nURL: %s\n' "$(date -Is)" "$LIVE" "$TENANT_DOMAIN" "$BASE_URL"

printf '\n===== 1. ACTUAL GIT ROOT =====\n'
repo_root=""
for candidate in "$LIVE" "$PWD"; do
  if git -C "$candidate" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    repo_root="$(git -C "$candidate" rev-parse --show-toplevel)"
    break
  fi
done
if [[ -n "$repo_root" ]]; then
  printf 'ROOT:   %s\n' "$repo_root"
  printf 'BRANCH: %s\n' "$(git -C "$repo_root" branch --show-current 2>/dev/null || true)"
  printf 'HEAD:   %s\n' "$(git -C "$repo_root" rev-parse HEAD 2>/dev/null || true)"
  printf 'ORIGIN: %s\n' "$(git -C "$repo_root" remote get-url origin 2>/dev/null || true)"
  git -C "$repo_root" status --short --branch || true
else
  echo 'No Git worktree detected at LIVE or current directory.'
fi

printf '\n===== 2. PUBLIC ASSET STREAM HASHES =====\n'
for rel in \
  app/admin/assets/js/pmd-admin-i18n-v1.js \
  app/admin/assets/js/pmd-waiter-pos-v1.js \
  app/admin/assets/js/pmd-waiter-pos-payment-v2.js \
  app/admin/assets/js/pmd-waiter-pos-payment-v3.js
do
  file="$LIVE/$rel"
  url="${BASE_URL}/${rel}?pmd_runtime_audit=$(date +%s%N)"
  printf '\n[%s]\n' "$rel"
  if [[ -f "$file" ]]; then
    printf 'LIVE_SIZE   %s\n' "$(wc -c < "$file" | tr -d ' ')"
    printf 'LIVE_SHA256 '; sha256sum "$file" | awk '{print $1}'
  else
    echo 'LIVE_MISSING'
  fi
  headers="$(curl -fsSIL --max-time 15 "$url" 2>/dev/null || true)"
  public_len="$(printf '%s\n' "$headers" | awk 'BEGIN{IGNORECASE=1} /^content-length:/ {gsub("\r",""); print $2}' | tail -1)"
  printf 'PUBLIC_SIZE %s\n' "${public_len:-unknown}"
  printf 'PUBLIC_SHA256 '
  if ! curl -fsSL --max-time 20 "$url" 2>/dev/null | sha256sum | awk '{print $1}'; then
    echo 'FETCH_FAILED'
  fi
done

printf '\n===== 3. ROUTE REGISTRATION =====\n'
if [[ -f "$LIVE/artisan" ]]; then
  php "$LIVE/artisan" route:list 2>/dev/null | grep -E 'language-switch(-v3)?|pmd\.language\.switch' || true
fi

printf '\n===== 4. CENTRAL VS MIMOZA LANGUAGE STATE =====\n'
if [[ ! -f "$LIVE/artisan" ]]; then
  echo 'artisan not found.'
  exit 0
fi

TENANT_DOMAIN="$TENANT_DOMAIN" php "$LIVE/artisan" tinker --execute='
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use System\Models\Languages_model;

$domain = getenv("TENANT_DOMAIN") ?: "mimoza.paymydine.com";

function pmdJson($value): string {
    return json_encode($value, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
}

function pmdLanguageRows(string $connection): array {
    return DB::connection($connection)->table("languages")
        ->whereIn("code", ["en", "de"])
        ->orderBy("code")
        ->get(["language_id", "name", "code", "status"])
        ->map(fn($row) => (array)$row)
        ->all();
}

function pmdStaffCounts(string $connection): array {
    if (!Schema::connection($connection)->hasTable("staffs")) return [];
    return DB::connection($connection)->table("staffs")
        ->selectRaw("language_id, COUNT(*) AS total")
        ->groupBy("language_id")
        ->orderBy("language_id")
        ->get()
        ->map(fn($row) => (array)$row)
        ->all();
}

function pmdTranslationCounts(string $connection): array {
    if (!Schema::connection($connection)->hasTable("language_translations")) {
        return ["table" => "missing"];
    }
    return [
        "table" => "language_translations",
        "en" => DB::connection($connection)->table("language_translations")->where("locale", "en")->count(),
        "de" => DB::connection($connection)->table("language_translations")->where("locale", "de")->count(),
    ];
}

$centralDb = DB::connection("mysql")->getDatabaseName();
$tenant = DB::connection("mysql")->table("tenants")
    ->where("domain", $domain)
    ->first();

if (!$tenant) {
    $tenant = DB::connection("mysql")->table("tenants")
        ->where("domain", "like", "mimoza.%")
        ->first();
}

if (!$tenant || empty($tenant->database)) {
    echo "TENANT_LOOKUP_FAILED domain={$domain}".PHP_EOL;
    return;
}

Config::set("database.connections.tenant.database", $tenant->database);
if (!empty($tenant->db_host)) Config::set("database.connections.tenant.host", $tenant->db_host);
if (!empty($tenant->db_port)) Config::set("database.connections.tenant.port", $tenant->db_port);
if (!empty($tenant->db_user)) Config::set("database.connections.tenant.username", $tenant->db_user);
if (isset($tenant->db_pass) && $tenant->db_pass !== "") Config::set("database.connections.tenant.password", $tenant->db_pass);
DB::purge("tenant");
DB::reconnect("tenant");

$tenantDb = DB::connection("tenant")->getDatabaseName();
$centralLanguages = pmdLanguageRows("mysql");
$tenantLanguages = pmdLanguageRows("tenant");

$modelCentral = Languages_model::on("mysql")
    ->whereIn("code", ["en", "de"])
    ->where("status", 1)
    ->orderBy("code")
    ->get(["language_id", "name", "code", "status"])
    ->map(fn($row) => $row->toArray())
    ->all();

$modelTenant = Languages_model::on("tenant")
    ->whereIn("code", ["en", "de"])
    ->where("status", 1)
    ->orderBy("code")
    ->get(["language_id", "name", "code", "status"])
    ->map(fn($row) => $row->toArray())
    ->all();

echo "central_db=".$centralDb.PHP_EOL;
echo "tenant_domain=".($tenant->domain ?? $domain).PHP_EOL;
echo "tenant_db=".$tenantDb.PHP_EOL;
echo "central_languages=".pmdJson($centralLanguages).PHP_EOL;
echo "tenant_languages=".pmdJson($tenantLanguages).PHP_EOL;
echo "model_central_enabled=".pmdJson($modelCentral).PHP_EOL;
echo "model_tenant_enabled=".pmdJson($modelTenant).PHP_EOL;
echo "central_staff_language_counts=".pmdJson(pmdStaffCounts("mysql")).PHP_EOL;
echo "tenant_staff_language_counts=".pmdJson(pmdStaffCounts("tenant")).PHP_EOL;
echo "central_translation_counts=".pmdJson(pmdTranslationCounts("mysql")).PHP_EOL;
echo "tenant_translation_counts=".pmdJson(pmdTranslationCounts("tenant")).PHP_EOL;

$tenantEnabled = collect($modelTenant)->pluck("code")->map(fn($v) => strtolower((string)$v))->all();
$missing = array_values(array_diff(["en", "de"], $tenantEnabled));
if ($missing) {
    echo "DIAGNOSIS=TENANT_LANGUAGE_ROWS_MISSING_OR_DISABLED:".implode(",", $missing).PHP_EOL;
} else {
    echo "DIAGNOSIS=TENANT_EN_DE_ROWS_OK".PHP_EOL;
}
' 2>&1 || true

printf '\n============================================================\n'
printf '%s\n' ' RUNTIME AUDIT V2 COMPLETE - NO APP FILES OR DB ROWS CHANGED'
printf '%s\n' '============================================================'
