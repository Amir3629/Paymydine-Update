#!/bin/bash
# Multi-Tenant Isolation Test Suite
# Run this after: php artisan serve

set -e

TENANT_A="amir.paymydine.local"
TENANT_B="rosana.paymydine.local"
BASE_URL="http://127.0.0.1:8000"

echo "=== Multi-Tenant Isolation Test Suite ==="
echo ""
echo "Prerequisites:"
echo "1. Add to /etc/hosts:"
echo "   127.0.0.1 $TENANT_A"
echo "   127.0.0.1 $TENANT_B"
echo "2. Seed two tenants in database"
echo "3. Run: php artisan serve"
echo ""
read -p "Press Enter when ready..."
echo ""

# Test 1: Menu Isolation
echo "Test 1: Menu Isolation (Database)"
echo "Fetching menu from Tenant A..."
MENU_A=$(curl -s -H "Host: $TENANT_A" "$BASE_URL/api/v1/menu" | jq '.data.items | length' 2>/dev/null || echo "error")
echo "  Tenant A menu items: $MENU_A"

echo "Fetching menu from Tenant B..."
MENU_B=$(curl -s -H "Host: $TENANT_B" "$BASE_URL/api/v1/menu" | jq '.data.items | length' 2>/dev/null || echo "error")
echo "  Tenant B menu items: $MENU_B"

if [ "$MENU_A" != "$MENU_B" ]; then
    echo "  ✅ PASS - Different menu counts"
else
    echo "  ❌ FAIL - Same menu count (DB isolation broken?)"
fi
echo ""

# Test 2: Cache Prefix
echo "Test 2: Cache Prefix Isolation"
echo "Note: Add temporary /debug/cache route if needed (see report)"
CACHE_A=$(curl -s -H "Host: $TENANT_A" "$BASE_URL/debug/cache" 2>/dev/null | jq -r '.cache_prefix' || echo "route_not_found")
CACHE_B=$(curl -s -H "Host: $TENANT_B" "$BASE_URL/debug/cache" 2>/dev/null | jq -r '.cache_prefix' || echo "route_not_found")

if [ "$CACHE_A" = "route_not_found" ]; then
    echo "  ⚠️ SKIP - /debug/cache route not found (add it to test)"
else
    echo "  Tenant A cache prefix: $CACHE_A"
    echo "  Tenant B cache prefix: $CACHE_B"
    if [ "$CACHE_A" != "$CACHE_B" ]; then
        echo "  ✅ PASS - Different cache prefixes"
    else
        echo "  ❌ FAIL - Same cache prefix (Phase 2 issue?)"
    fi
fi
echo ""

# Test 3: Session Binding
echo "Test 3: Session Binding & Cross-Tenant Protection"
echo "Getting session from Tenant A..."
curl -c /tmp/cookies_test.txt -H "Host: $TENANT_A" "$BASE_URL/api/v1/menu" -s > /dev/null
echo "  Session cookie saved"

echo "Reusing Tenant A cookie for Tenant B (should regenerate)..."
RESULT=$(curl -b /tmp/cookies_test.txt -H "Host: $TENANT_B" "$BASE_URL/api/v1/menu" -I -s | grep -i "set-cookie")
if [ -n "$RESULT" ]; then
    echo "  ✅ PASS - New session cookie issued (cross-tenant invalidation works)"
else
    echo "  ❌ FAIL - No new cookie (Phase 2 session guard not working?)"
fi
rm -f /tmp/cookies_test.txt
echo ""

# Test 4: Rate Limiting
echo "Test 4: Rate Limiting (Throttle 30/min)"
echo "Sending 35 POST requests quickly..."
COUNT_429=0
for i in {1..35}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Host: $TENANT_A" \
        -H "Content-Type: application/json" \
        -X POST "$BASE_URL/api/v1/waiter-call" \
        -d "{\"table_id\":\"1\",\"message\":\"test$i\"}")
    if [ "$STATUS" = "429" ]; then
        ((COUNT_429++))
    fi
done
echo "  429 (Too Many Requests) responses: $COUNT_429"
if [ "$COUNT_429" -gt 0 ]; then
    echo "  ✅ PASS - Rate limiting active"
else
    echo "  ❌ FAIL - No 429 responses (throttle not working?)"
fi
echo ""

# Test 5: No Tenant Fails
echo "Test 5: No Tenant Fail-Safe"
RESULT=$(curl -s -H "Host: paymydine.local" "$BASE_URL/api/v1/menu" | jq -r '.error // .message // "no_error"' 2>/dev/null)
if [ "$RESULT" != "no_error" ]; then
    echo "  ✅ PASS - Request without tenant rejected ($RESULT)"
else
    echo "  ❌ FAIL - Request without tenant returned data"
fi
echo ""

echo "=== Test Suite Complete ==="
echo ""
echo "Next steps:"
echo "1. Review any FAIL results above"
echo "2. Check _verify_phase2/INVESTIGATION_REPORT.md for details"
echo "3. Run full manual tests from Part D of report"
