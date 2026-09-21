#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
HOST="${PMD_HOST:-tomo.paymydine.com}"

ok(){ printf '[PASS] %s\n' "$*"; }
bad(){ printf '[FAIL] %s\n' "$*" >&2; }
info(){ printf '[INFO] %s\n' "$*"; }

[[ -d "$ROOT/.git" ]] || { bad "Not a git checkout: $ROOT"; exit 2; }

REQ="$(cat /proc/sys/kernel/random/uuid)"
CHALLENGE="$(printf 'A%.0s' {1..43})"
TMP="$(mktemp -d /tmp/pmd-pair-v7-smoke.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

START="https://$HOST/admin/mobile/pair/start?code_challenge=$CHALLENGE&pair_request=$REQ"

echo "============================================================"
echo "PayMyDine Android Pairing V7 live smoke test"
echo "host=$HOST"
echo "pair_request=$REQ"
echo "============================================================"

info "Checking deployed markers..."
grep -q "PMD_MOBILE_PAIR_SIGNED_HANDOFF_V3"   "$ROOT/app/Services/PmdMobileSync/PmdMobilePairingService.php"   && ok "Signed handoff service is deployed"   || { bad "Signed handoff service marker missing"; exit 3; }

grep -q "PMD_MOBILE_PAIR_SIGNED_HANDOFF_V3"   "$ROOT/app/Http/Controllers/PmdMobilePairController.php"   && ok "Pair controller V7 is deployed"   || { bad "Pair controller V7 marker missing"; exit 3; }

grep -q "PMD_MOBILE_PAIR_SIGNED_LOGIN_RESTORE_V3"   "$ROOT/app/admin/controllers/Login.php"   && ok "Login restore V7 is deployed"   || { bad "Login restore V7 marker missing"; exit 3; }

grep -q "PMD_MOBILE_PAIR_SIGNED_LOGIN_FORM_V3"   "$ROOT/app/admin/views/auth/login_workplace_v4.blade.php"   && ok "Login hidden handoff field is deployed"   || { bad "Login form V7 marker missing"; exit 3; }

info "Calling live pair/start with a fresh valid PKCE request..."
curl -sS   --connect-timeout 15   --max-time 30   -c "$TMP/cookies.txt"   -D "$TMP/start.headers"   -o "$TMP/start.body"   "$START"

STATUS="$(awk 'toupper($1) ~ /^HTTP\// {code=$2} END{print code}' "$TMP/start.headers")"
LOCATION="$(awk 'BEGIN{IGNORECASE=1} /^Location:/ {sub(/^[^:]+:[[:space:]]*/, ""); sub(/\r$/, ""); print; exit}' "$TMP/start.headers")"

echo
echo "--- pair/start response ---"
grep -Ei '^(HTTP/|Location:|Set-Cookie:)' "$TMP/start.headers"   | sed -E 's/(pmd_mobile_pair_intent_v2=)[^;]+/\1<redacted>/g'   || true

if [[ "$STATUS" != "302" ]]; then
  bad "pair/start returned HTTP $STATUS instead of 302"
  echo "--- response body ---"
  head -c 2000 "$TMP/start.body" || true
  echo
  exit 4
fi
ok "pair/start returned 302"

if [[ "$LOCATION" != *"/admin/login?pmd_pair="* ]]; then
  bad "Redirect does NOT contain /admin/login?pmd_pair=..."
  echo "location=$LOCATION"
  exit 5
fi
ok "pair/start redirects to login with signed pmd_pair"

if ! grep -qi 'pmd_mobile_pair_intent_v2=' "$TMP/start.headers"; then
  bad "Encrypted pairing intent cookie was not set"
  exit 6
fi
ok "Encrypted host-only pairing intent cookie was set"

info "Fetching the exact Login page with the same cookie jar..."
curl -sS   --connect-timeout 15   --max-time 30   -b "$TMP/cookies.txt"   -c "$TMP/cookies.txt"   -D "$TMP/login.headers"   -o "$TMP/login.html"   "$LOCATION"

LOGIN_STATUS="$(awk 'toupper($1) ~ /^HTTP\// {code=$2} END{print code}' "$TMP/login.headers")"
echo
echo "--- login response ---"
grep -Ei '^(HTTP/|Location:)' "$TMP/login.headers" || true

if [[ "$LOGIN_STATUS" != "200" ]]; then
  bad "Login handoff page returned HTTP $LOGIN_STATUS instead of 200"
  exit 7
fi
ok "Login handoff page returned 200"

if ! grep -q 'PMD_MOBILE_PAIR_SIGNED_LOGIN_FORM_V3' "$TMP/login.html"; then
  bad "Rendered Login page is NOT the V7 login view"
  exit 8
fi
ok "Rendered Login page is the V7 login view"

if ! grep -Eq 'name=["'\'' ]*pmd_pair["'\'' ]*' "$TMP/login.html"; then
  bad "Rendered Login form does not contain hidden pmd_pair"
  echo "--- pmd_pair references in rendered HTML ---"
  grep -n 'pmd_pair' "$TMP/login.html" | head -20 || true
  exit 9
fi
ok "Rendered Login form contains hidden pmd_pair"

echo
echo "============================================================"
echo "SERVER V7 FIRST-HOP RESULT: PASS"
echo "============================================================"
echo
echo "Recent real Android/browser pair requests in nginx:"
for log in /var/log/nginx/access.log /var/log/nginx/*access*.log; do
  [[ -f "$log" ]] || continue
  grep -aE '/admin/mobile/pair/start|/admin/api/mobile/v1/pair/(status|exchange)|/admin/mobile/pair/approve' "$log"     | tail -25 || true
done

echo
echo "Interpretation:"
echo "  If this script PASSes but your tablet never creates a fresh"
echo "  /admin/mobile/pair/start request in nginx, the remaining problem"
echo "  is Android/browser launch state, not server Login continuation."
