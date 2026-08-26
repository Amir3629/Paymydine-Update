#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="${LIVE:-/var/www/paymydine}"
TENANT_DOMAIN="${TENANT_DOMAIN:-mimoza.paymydine.com}"

printf '%s\n' '============================================================'
printf '%s\n' ' PMD LANGUAGE METADATA AUDIT - READ ONLY'
printf '%s\n' '============================================================'
printf 'Time: %s\nLive: %s\nTenant: %s\n' "$(date -Is)" "$LIVE" "$TENANT_DOMAIN"

if [[ ! -f "$LIVE/artisan" ]]; then
  echo 'ERROR: artisan not found.'
  exit 1
fi

TENANT_DOMAIN="$TENANT_DOMAIN" php "$LIVE/artisan" tinker --execute='
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$domain = strtolower(trim((string)(getenv("TENANT_DOMAIN") ?: "mimoza.paymydine.com")));
function out($label, $value): void {
    if (is_array($value) || is_object($value)) $value = json_encode($value, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    echo $label."=".$value.PHP_EOL;
}
function configValue($connection, $item) {
    if (!Schema::connection($connection)->hasTable("settings")) return null;
    $row = DB::connection($connection)->table("settings")->where("sort", "config")->where("item", $item)->first();
    if (!$row) return null;
    if (!empty($row->serialized)) {
        $decoded = @unserialize((string)$row->value);
        return $decoded === false && $row->value !== "b:0;" ? $row->value : $decoded;
    }
    return $row->value;
}

$tenant = DB::connection("mysql")->table("tenants")->whereRaw("LOWER(domain) = ?", [$domain])->first();
if (!$tenant && !str_contains($domain, ".")) {
    $tenant = DB::connection("mysql")->table("tenants")->whereRaw("LOWER(domain) = ?", [$domain.".paymydine.com"])->first();
}
if (!$tenant || empty($tenant->database)) { out("ERROR", "TENANT_NOT_FOUND"); return; }

Config::set("database.connections.tenant.database", $tenant->database);
if (!empty($tenant->db_host)) Config::set("database.connections.tenant.host", $tenant->db_host);
if (!empty($tenant->db_port)) Config::set("database.connections.tenant.port", $tenant->db_port);
if (!empty($tenant->db_user)) Config::set("database.connections.tenant.username", $tenant->db_user);
if (isset($tenant->db_pass) && $tenant->db_pass !== "") Config::set("database.connections.tenant.password", $tenant->db_pass);
DB::purge("tenant"); DB::reconnect("tenant");

out("CENTRAL_DB", DB::connection("mysql")->getDatabaseName());
out("TENANT_DB", DB::connection("tenant")->getDatabaseName());
out("TENANT_DOMAIN", $tenant->domain ?? $domain);
out("CENTRAL_LANGUAGES_ALL", DB::connection("mysql")->table("languages")->orderBy("language_id")->get()->map(fn($r)=>(array)$r)->all());
out("TENANT_LANGUAGES_ALL", DB::connection("tenant")->table("languages")->orderBy("language_id")->get()->map(fn($r)=>(array)$r)->all());

$exact = []; $folded = [];
foreach (["en", "de"] as $code) {
    $exact[$code] = DB::connection("tenant")->table("languages")->whereRaw("BINARY code = ?", [$code])->orderBy("language_id")->get()->map(fn($r)=>(array)$r)->all();
    $folded[$code] = DB::connection("tenant")->table("languages")->whereRaw("LOWER(code) = ?", [$code])->orderBy("language_id")->get()->map(fn($r)=>(array)$r)->all();
}
out("TENANT_EXACT_CODE_ROWS", $exact);
out("TENANT_CASE_FOLDED_CODE_ROWS", $folded);

if (Schema::connection("tenant")->hasTable("staffs")) {
    $staff = DB::connection("tenant")->table("staffs as s")
        ->leftJoin("languages as l", "l.language_id", "=", "s.language_id")
        ->orderBy("s.staff_id")
        ->get(["s.staff_id","s.staff_name","s.staff_email","s.language_id","l.code as language_code","l.name as language_name","l.status as language_status"])
        ->map(fn($r)=>(array)$r)->all();
    out("STAFF_LANGUAGE_MAP", $staff);
    out("ORPHAN_STAFF_LANGUAGE_MAP", collect($staff)->filter(fn($r)=>!empty($r["language_id"]) && empty($r["language_code"]))->values()->all());
}

out("SUPPORTED_LANGUAGES", configValue("tenant", "supported_languages"));
out("DEFAULT_LANGUAGE", configValue("tenant", "default_language"));

$tenantCounts = [];
if (Schema::connection("tenant")->hasTable("language_translations")) {
    foreach (["en","de","De","DE"] as $locale) {
        $tenantCounts[$locale] = DB::connection("tenant")->table("language_translations")->whereRaw("BINARY locale = ?", [$locale])->count();
    }
}
out("TENANT_TRANSLATION_EXACT_COUNTS", $tenantCounts);
out("CENTRAL_DE_TRANSLATION_COUNT", Schema::connection("mysql")->hasTable("language_translations") ? DB::connection("mysql")->table("language_translations")->whereRaw("BINARY locale = ?", ["de"])->count() : null);

$issues = [];
if (count($exact["en"]) !== 1 || (int)($exact["en"][0]["status"] ?? 0) !== 1) $issues[] = "EN_NOT_ONE_EXACT_ACTIVE_ROW";
if (count($exact["de"]) !== 1 || (int)($exact["de"][0]["status"] ?? 0) !== 1) $issues[] = "DE_NOT_ONE_EXACT_ACTIVE_ROW";
if (count($folded["en"]) > 1) $issues[] = "EN_DUPLICATE_CASE_VARIANTS";
if (count($folded["de"]) > 1) $issues[] = "DE_DUPLICATE_CASE_VARIANTS";
$supported = collect((array)configValue("tenant", "supported_languages"))->map(fn($v)=>strtolower((string)$v))->sort()->values()->all();
if ($supported !== ["de","en"]) $issues[] = "SUPPORTED_LANGUAGES_NOT_CANONICAL_EN_DE";
$default = strtolower((string)configValue("tenant", "default_language"));
if (!in_array($default, ["en","de"], true)) $issues[] = "DEFAULT_LANGUAGE_NOT_CANONICAL";
out("DIAGNOSIS", $issues ?: ["CANONICAL_LANGUAGE_METADATA_OK"]);
' 2>&1

printf '%s\n' '============================================================'
printf '%s\n' ' AUDIT COMPLETE - NO FILES OR DATABASE ROWS CHANGED'
printf '%s\n' '============================================================'
