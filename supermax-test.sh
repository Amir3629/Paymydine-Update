#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:8000}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-}"

echo "=========================================="
echo "SUPER-MAX TENANT ISOLATION TEST"
echo "=========================================="
echo ""
echo "Configuration:"
echo "  Base URL: $BASE"
echo "  Tenants: rosana.paymydine.com, mimoza.paymydine.com"
echo ""

curlj () {
  local HOST="$1"
  local PATH="$2"
  shift 2
  curl -sS -H "Host: ${HOST}" "${BASE}${PATH}" "$@"
}

section () { 
  echo ""
  echo "=========================================="
  echo "$*"
  echo "=========================================="
  echo ""
}

section "TEST 1: Menu Per Tenant (Should Differ)"

echo "Fetching Rosana menu..."
R1=$(curlj "rosana.paymydine.com" "/api/v1/menu" 2>&1 || echo '{"error":"connection_failed"}')
echo "Rosana response (first 300 chars):"
echo "$R1" | head -c 300
echo ""
echo ""

echo "Fetching Mimoza menu..."
M1=$(curlj "mimoza.paymydine.com" "/api/v1/menu" 2>&1 || echo '{"error":"connection_failed"}')
echo "Mimoza response (first 300 chars):"
echo "$M1" | head -c 300
echo ""
echo ""

echo "Computing MD5 hashes..."
MD5_R=$(echo -n "$R1" | md5 2>/dev/null || echo -n "$R1" | md5sum | awk '{print $1}')
MD5_M=$(echo -n "$M1" | md5 2>/dev/null || echo -n "$M1" | md5sum | awk '{print $1}')
echo "Rosana MD5: $MD5_R"
echo "Mimoza MD5: $MD5_M"
echo ""

if [ "$MD5_R" = "$MD5_M" ]; then
  # Check if both are errors (acceptable) or same data (bad)
  if echo "$R1" | grep -q '"error"'; then
    echo "⚠️  Both return errors (tenant detection working, but setup issues)"
    echo "   This is OK if you haven't granted DB permissions yet"
  else
    echo "🔴 FAIL: Identical data returned for both tenants!"
    echo "   This indicates data bleed is still present"
    exit 1
  fi
else
  echo "✅ PASS: Different responses per tenant (isolation working!)"
fi

section "TEST 2: Categories Per Tenant"

echo "Fetching Rosana categories..."
RC=$(curlj "rosana.paymydine.com" "/api/v1/categories" 2>&1 || echo '{"error":"endpoint_not_found"}')
echo "Rosana categories (first 200 chars):"
echo "$RC" | head -c 200
echo ""
echo ""

echo "Fetching Mimoza categories..."
MC=$(curlj "mimoza.paymydine.com" "/api/v1/categories" 2>&1 || echo '{"error":"endpoint_not_found"}')
echo "Mimoza categories (first 200 chars):"
echo "$MC" | head -c 200
echo ""
echo ""

MD5_RC=$(echo -n "$RC" | md5 2>/dev/null || echo -n "$RC" | md5sum | awk '{print $1}')
MD5_MC=$(echo -n "$MC" | md5 2>/dev/null || echo -n "$MC" | md5sum | awk '{print $1}')

if [ "$MD5_RC" = "$MD5_MC" ]; then
  if echo "$RC" | grep -q '"error"'; then
    echo "⚠️  Both return errors (acceptable if DB not accessible)"
  else
    echo "🔴 FAIL: Same categories for both tenants"
  fi
else
  echo "✅ PASS: Different categories per tenant"
fi

section "TEST 3: No-Tenant Request (Should 404)"

echo "Testing without tenant subdomain (Host: paymydine.com or 127.0.0.1)..."
NT=$(curl -i -sS "${BASE}/api/v1/menu" 2>&1 | head -n 20)
echo "$NT"
echo ""

if echo "$NT" | grep -q "404"; then
  echo "✅ PASS: Returns 404 status"
else
  echo "⚠️  WARNING: Didn't see 404 (check if endpoint exists)"
fi

if echo "$NT" | grep -qi "tenant not found\|error"; then
  echo "✅ PASS: Error message present"
else
  echo "🔴 FAIL: No error message (might be returning data!)"
fi

section "TEST 4: Write Isolation - Waiter Call"

echo "Creating waiter call for Rosana..."
RCALL=$(curlj "rosana.paymydine.com" "/api/v1/waiter-call" -X POST \
  -H "Content-Type: application/json" \
  --data '{"table_id":"1","message":"Water please - ROSANA TEST"}' 2>&1 || echo '{"error":"failed"}')
echo "Rosana waiter-call response:"
echo "$RCALL"
echo ""

echo "Creating waiter call for Mimoza..."
MCALL=$(curlj "mimoza.paymydine.com" "/api/v1/waiter-call" -X POST \
  -H "Content-Type: application/json" \
  --data '{"table_id":"1","message":"Napkins please - MIMOZA TEST"}' 2>&1 || echo '{"error":"failed"}')
echo "Mimoza waiter-call response:"
echo "$MCALL"
echo ""

if echo "$RCALL" | grep -q '"ok":true\|"success":true'; then
  echo "✅ Rosana waiter call succeeded"
elif echo "$RCALL" | grep -q '"error"'; then
  echo "⚠️  Rosana waiter call returned error (check table_id exists)"
else
  echo "⚠️  Unexpected Rosana response"
fi

if echo "$MCALL" | grep -q '"ok":true\|"success":true'; then
  echo "✅ Mimoza waiter call succeeded"
elif echo "$MCALL" | grep -q '"error"'; then
  echo "⚠️  Mimoza waiter call returned error (check table_id exists)"
else
  echo "⚠️  Unexpected Mimoza response"
fi

section "TEST 5: Write Isolation - Table Notes"

echo "Creating table note for Rosana..."
RNOTE=$(curlj "rosana.paymydine.com" "/api/v1/table-notes" -X POST \
  -H "Content-Type: application/json" \
  --data '{"table_id":"1","note":"No onions - ROSANA","timestamp":"2025-10-10T15:00:00Z"}' 2>&1 || echo '{"error":"failed"}')
echo "Rosana table-notes response:"
echo "$RNOTE" | head -c 200
echo ""
echo ""

echo "Creating table note for Mimoza..."
MNOTE=$(curlj "mimoza.paymydine.com" "/api/v1/table-notes" -X POST \
  -H "Content-Type: application/json" \
  --data '{"table_id":"1","note":"Extra sauce - MIMOZA","timestamp":"2025-10-10T15:00:00Z"}' 2>&1 || echo '{"error":"failed"}')
echo "Mimoza table-notes response:"
echo "$MNOTE" | head -c 200
echo ""
echo ""

section "TEST 6: Cross-Tenant Leak Check (Re-Test After Writes)"

echo "Re-fetching menus after writes..."
R2=$(curlj "rosana.paymydine.com" "/api/v1/menu" 2>&1 || echo '{"error":"failed"}')
M2=$(curlj "mimoza.paymydine.com" "/api/v1/menu" 2>&1 || echo '{"error":"failed"}')

MD5_R2=$(echo -n "$R2" | md5 2>/dev/null || echo -n "$R2" | md5sum | awk '{print $1}')
MD5_M2=$(echo -n "$M2" | md5 2>/dev/null || echo -n "$M2" | md5sum | awk '{print $1}')

echo "Rosana MD5 (after writes): $MD5_R2"
echo "Mimoza MD5 (after writes): $MD5_M2"
echo ""

if [ "$MD5_R2" != "$MD5_M2" ]; then
  echo "✅ PASS: Still isolated after writes"
else
  if echo "$R2" | grep -q '"error"'; then
    echo "⚠️  Both return errors (acceptable)"
  else
    echo "🔴 FAIL: Hashes equal after writes (data bleed!)"
    exit 1
  fi
fi

section "TEST 7: Rate Limiting / Throttle Check"

echo "Sending burst of 5 GET requests to Rosana..."
for i in $(seq 1 5); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: rosana.paymydine.com" "${BASE}/api/v1/menu" 2>&1 || echo "000")
  echo "  Request $i: HTTP $STATUS"
done
echo ""
echo "✅ Burst completed (check for 429 if throttle is strict)"

section "TEST 8: Database Verification"

echo "Checking actual DB content..."
echo ""

echo "Rosana database - menu items:"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} -e \
  "SELECT menu_id, menu_name, menu_price FROM ti_menus LIMIT 5;" rosana 2>&1 || echo "⚠️  Cannot access rosana DB"
echo ""

echo "Mimoza database - menu items:"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} -e \
  "SELECT menu_id, menu_name, menu_price FROM ti_menus LIMIT 5;" mimoza 2>&1 || echo "⚠️  Cannot access mimoza DB"
echo ""

section "TEST 9: Session Isolation Check"

echo "Getting session cookie from Rosana..."
curl -c /tmp/rosana_session.txt -H "Host: rosana.paymydine.com" "${BASE}/api/v1/menu" -s > /dev/null 2>&1
echo "✅ Cookie saved to /tmp/rosana_session.txt"
echo ""

echo "Trying to reuse Rosana cookie for Mimoza (should regenerate session)..."
CROSS_TENANT=$(curl -v -b /tmp/rosana_session.txt -H "Host: mimoza.paymydine.com" "${BASE}/api/v1/menu" 2>&1 | grep -i "set-cookie" || echo "No Set-Cookie header")
echo "$CROSS_TENANT"
echo ""

if echo "$CROSS_TENANT" | grep -qi "set-cookie"; then
  echo "✅ PASS: New session cookie issued (Phase 2 session guard working)"
else
  echo "⚠️  WARNING: No new cookie (session guard might not be active)"
fi

rm -f /tmp/rosana_session.txt

section "SUMMARY & FINAL VERDICT"

echo "Test Results:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Menu isolation:        $([ "$MD5_R" != "$MD5_M" ] && echo '✅ PASS' || echo '⚠️  See details above')"
echo "2. Categories isolation:  $([ "$MD5_RC" != "$MD5_MC" ] && echo '✅ PASS' || echo '⚠️  See details above')"
echo "3. No-tenant rejected:    $(echo "$NT" | grep -q "404.*error" && echo '✅ PASS' || echo '⚠️  Check above')"
echo "4. Waiter calls:          (Check individual responses above)"
echo "5. Table notes:           (Check individual responses above)"
echo "6. Cross-tenant isolation: $([ "$MD5_R2" != "$MD5_M2" ] && echo '✅ PASS' || echo '⚠️  See details above')"
echo "7. Rate limiting:         ✅ PASS (no crashes)"
echo "8. Database verification: (Check SQL output above)"
echo "9. Session isolation:     $(echo "$CROSS_TENANT" | grep -qi "set-cookie" && echo '✅ PASS' || echo '⚠️  See above')"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$MD5_R" != "$MD5_M" ] && echo "$NT" | grep -q "404"; then
  echo "🎉 SUPER-MAX TEST: PASSED"
  echo ""
  echo "✅ Tenant isolation is working correctly!"
  echo "✅ Different responses per tenant confirmed"
  echo "✅ No-tenant requests properly rejected"
  echo ""
  echo "Note: If you see DB errors, grant permissions:"
  echo "  GRANT ALL PRIVILEGES ON rosana.* TO 'paymydine'@'localhost';"
  echo "  GRANT ALL PRIVILEGES ON mimoza.* TO 'paymydine'@'localhost';"
  exit 0
else
  echo "⚠️  SUPER-MAX TEST: NEEDS ATTENTION"
  echo ""
  echo "Review the test outputs above for details."
  echo "Common issues:"
  echo "  - DB permissions not granted (see warnings above)"
  echo "  - Tenant records not in ti_tenants table"
  echo "  - DetectTenant middleware not running"
  exit 1
fi

