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
TMP="$(mktemp -d /tmp/pmd-pair-v8-smoke.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

START="https://$HOST/admin/mobile/pair/start?code_challenge=$CHALLENGE&pair_request=$REQ"

echo "============================================================"
echo "PayMyDine Android Pairing V8 corrected live smoke test"
echo "host=$HOST"
echo "pair_request=$REQ"
echo "============================================================"

info "Checking deployed server markers..."
grep -q "PMD_MOBILE_SYNC_EARLY_ROOT_LOADER_V8" "$ROOT/routes.php"   && ok "Early root mobile route loader is deployed"   || { bad "Early root mobile route loader missing"; exit 3; }

grep -q "PMD_MOBILE_SYNC_DIRECT_REGISTER_V8" "$ROOT/routes/pmd-mobile-sync-v1.php"   && ok "Direct mobile route registration is deployed"   || { bad "Direct mobile route registration missing"; exit 3; }

grep -q "PMD_MOBILE_PAIR_SIGNED_HANDOFF_V3"   "$ROOT/app/Http/Controllers/PmdMobilePairController.php"   && ok "Signed handoff controller is deployed"   || { bad "Signed handoff controller missing"; exit 3; }

grep -q "PMD_MOBILE_PAIR_SIGNED_LOGIN_RESTORE_V3"   "$ROOT/app/admin/controllers/Login.php"   && ok "Login handoff restore is deployed"   || { bad "Login handoff restore missing"; exit 3; }

info "Calling live pair/start..."
curl -sS   --connect-timeout 15   --max-time 30   -c "$TMP/cookies.txt"   -D "$TMP/start.headers"   -o "$TMP/start.body"   "$START"

STATUS="$(awk 'toupper($1) ~ /^HTTP\// {code=$2} END{print code}' "$TMP/start.headers")"
LOCATION="$(awk 'BEGIN{IGNORECASE=1} /^Location:/ {sub(/^[^:]+:[[:space:]]*/, ""); sub(/\r$/, ""); print; exit}' "$TMP/start.headers")"

echo
echo "--- pair/start response ---"
grep -Ei '^(HTTP/|Location:|Set-Cookie:)' "$TMP/start.headers"   | sed -E 's/(pmd_mobile_pair_intent_v2=)[^;]+/\1<redacted>/g'   || true

[[ "$STATUS" == "302" ]] || {
  bad "pair/start returned HTTP $STATUS instead of 302"
  head -c 2000 "$TMP/start.body" || true
  exit 4
}
ok "pair/start returned 302"

[[ "$LOCATION" == *"/admin/login?pmd_pair="* ]] || {
  bad "pair/start did not redirect to signed Login handoff"
  echo "location=$LOCATION"
  exit 5
}
ok "pair/start redirects to login with signed pmd_pair"

grep -qi 'pmd_mobile_pair_intent_v2=' "$TMP/start.headers" || {
  bad "Encrypted pairing intent cookie was not set"
  exit 6
}
ok "Encrypted pairing intent cookie was set"

SIGNED="$(printf '%s' "$LOCATION" | sed -n 's/.*[?&]pmd_pair=\([^&]*\).*/\1/p')"
[[ -n "$SIGNED" ]] || {
  bad "Could not extract pmd_pair from Login redirect"
  exit 7
}

info "Fetching exact Login URL with the same cookie jar..."
curl -sS   --connect-timeout 15   --max-time 30   -b "$TMP/cookies.txt"   -c "$TMP/cookies.txt"   -D "$TMP/login.headers"   -o "$TMP/login.html"   "$LOCATION"

LOGIN_STATUS="$(awk 'toupper($1) ~ /^HTTP\// {code=$2} END{print code}' "$TMP/login.headers")"
LOGIN_LOCATION="$(awk 'BEGIN{IGNORECASE=1} /^Location:/ {sub(/^[^:]+:[[:space:]]*/, ""); sub(/\r$/, ""); print; exit}' "$TMP/login.headers")"

echo
echo "--- login response ---"
grep -Ei '^(HTTP/|Location:)' "$TMP/login.headers" || true

[[ "$LOGIN_STATUS" == "200" ]] || {
  bad "Signed Login page returned HTTP $LOGIN_STATUS instead of 200"
  [[ -n "$LOGIN_LOCATION" ]] && echo "location=$LOGIN_LOCATION"
  exit 8
}
ok "Signed Login page returned 200"

# Blade comments are compiled out of final HTML, so DO NOT test for the
# source marker. Test the real field that the browser will POST.
if ! grep -Eq 'name=["'\'' ]*pmd_pair["'\'' ]*' "$TMP/login.html"; then
  bad "Rendered Login form does not contain hidden pmd_pair"
  echo "--- nearby rendered HTML ---"
  grep -niE 'pmd_pair|<form|username|password' "$TMP/login.html" | head -60 || true
  exit 9
fi
ok "Rendered Login form contains hidden pmd_pair"

if ! grep -Fq "$SIGNED" "$TMP/login.html"; then
  bad "Rendered hidden pmd_pair does not contain the signed handoff from redirect"
  echo "--- pmd_pair references ---"
  grep -n 'pmd_pair' "$TMP/login.html" | head -20 || true
  exit 10
fi
ok "Rendered Login form preserves the exact signed pmd_pair"

echo
echo "============================================================"
echo "SERVER V8 FIRST-HOP RESULT: PASS"
echo "============================================================"
echo
echo "The server now proves:"
echo "  pair/start -> PmdMobilePairController"
echo "  -> signed pmd_pair"
echo "  -> real Login page"
echo "  -> hidden pmd_pair survives into the Login form"
echo
echo "No password was submitted and no database row was modified by this smoke test."
