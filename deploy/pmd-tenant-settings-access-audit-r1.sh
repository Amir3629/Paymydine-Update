#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
cd "$ROOT"

[[ -d "$ROOT/.git" ]] || { echo "REFUSED: PayMyDine root missing" >&2; exit 1; }

echo "============================================================"
echo "PMD TENANT SETTINGS ACCESS AUDIT R1"
echo "NO WRITES"
echo "============================================================"
echo "HEAD=$(git rev-parse HEAD)"
echo "BRANCH=$(git branch --show-current)"

echo
echo "== CENTRAL TENANT AUTHORITY + LIVE ROUTE =="

TMP="$(mktemp /tmp/pmd-tenant-settings-audit.XXXXXX.tsv)"
trap 'rm -f "$TMP"' EXIT

php <<'PHP' > "$TMP"
<?php
$root = getcwd();
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$rows = Illuminate\Support\Facades\DB::connection('mysql')
    ->table('tenants')
    ->select(['id','name','domain','database','status','start','end'])
    ->whereNotNull('domain')
    ->orderBy('domain')
    ->get();

$now = now();
$today = $now->copy()->startOfDay();
foreach ($rows as $row) {
    $domain = strtolower(trim((string)$row->domain));
    if (!preg_match('/^[a-z0-9-]+\.paymydine\.com$/', $domain)) continue;
    $gate = 'active';
    if (strtolower(trim((string)($row->status ?? ''))) !== 'active') {
        $gate = 'not-active';
    } else {
        try {
            if (!empty($row->start) && \Carbon\Carbon::parse($row->start)->startOfDay()->gt($today)) {
                $gate = 'not-started';
            } elseif (!empty($row->end) && \Carbon\Carbon::parse($row->end)->endOfDay()->lt($now)) {
                $gate = 'expired';
            }
        } catch (Throwable $e) {
            $gate = 'invalid-period';
        }
    }
    echo implode("\t", [
        (string)$row->id,
        str_replace(["\t","\r","\n"], ' ', (string)$row->name),
        $domain,
        (string)$row->database,
        (string)$row->status,
        (string)($row->start ?? ''),
        (string)($row->end ?? ''),
        $gate,
    ])."\n";
}
PHP

printf '%-4s %-22s %-34s %-14s %-11s %-13s %-4s %-55s\n' "ID" "NAME" "DOMAIN" "DATABASE" "STATUS" "GATE" "HTTP" "REDIRECT"
printf '%-4s %-22s %-34s %-14s %-11s %-13s %-4s %-55s\n' "----" "----------------------" "----------------------------------" "--------------" "-----------" "-------------" "----" "-------------------------------------------------------"

ACTIVE_TOTAL=0
ACTIVE_LANDING=0
ACTIVE_BAD=0
BLOCKED_TOTAL=0

while IFS=$'\t' read -r id name domain database status start end gate; do
    [[ -n "$domain" ]] || continue
    meta="$(curl -k -sS -o /dev/null -w '%{http_code}|%{redirect_url}' "https://$domain/admin/pmdsettings?pmdtenantsettingsaudit=$(date +%s%N)" || printf '000|')"
    code="${meta%%|*}"
    redirect="${meta#*|}"
    printf '%-4s %-22.22s %-34s %-14.14s %-11.11s %-13s %-4s %-55.55s\n' "$id" "$name" "$domain" "$database" "$status" "$gate" "$code" "$redirect"

    if [[ "$gate" == "active" ]]; then
        ACTIVE_TOTAL=$((ACTIVE_TOTAL + 1))
        case "$redirect" in
            https://paymydine.com/|https://www.paymydine.com/|https://paymydine.com|https://www.paymydine.com)
                ACTIVE_LANDING=$((ACTIVE_LANDING + 1))
                ;;
        esac
        if [[ ! "$code" =~ ^[23][0-9][0-9]$ ]]; then
            ACTIVE_BAD=$((ACTIVE_BAD + 1))
        fi
    else
        BLOCKED_TOTAL=$((BLOCKED_TOTAL + 1))
    fi
done < "$TMP"

echo
echo "== SUMMARY =="
echo "ACTIVE_TOTAL=$ACTIVE_TOTAL"
echo "ACTIVE_REDIRECTED_TO_LANDING=$ACTIVE_LANDING"
echo "ACTIVE_NON_2XX_3XX=$ACTIVE_BAD"
echo "INTENTIONALLY_BLOCKED_TOTAL=$BLOCKED_TOTAL"

if [[ "$ACTIVE_LANDING" -eq 0 && "$ACTIVE_BAD" -eq 0 ]]; then
    echo "ACTIVE_TENANT_SETTINGS_ACCESS=PASS"
else
    echo "ACTIVE_TENANT_SETTINGS_ACCESS=FAIL"
fi

echo "NO_DB_CHANGES=YES"
echo "NO_NGINX_CHANGES=YES"
echo "NO_APP_CHANGES=YES"
echo "AUDIT_FINISHED_NO_WRITES"
