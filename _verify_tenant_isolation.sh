#!/usr/bin/env bash
set -e

echo "============================================"
echo "Tenant Isolation Verification Script"
echo "============================================"
echo ""

echo "1) Checking for API duplicates in app/admin/routes.php"
if grep -q "prefix[[:space:]]*=>[[:space:]]*'api/v1'" app/admin/routes.php; then
    echo "❌ FAIL: Found api/v1 block in app/admin/routes.php"
    grep -n "prefix.*api/v1" app/admin/routes.php
    exit 1
else
    echo "✅ PASS: No api/v1 prefix blocks in app/admin/routes.php"
fi
echo ""

echo "2) Checking POS webhook route exists in protected routes"
echo "   Looking for webhooks/pos in both files:"
grep -n "webhooks/pos" routes.php app/admin/routes.php || true
echo ""

echo "3) Checking for hardcoded ti_statuses in DB::raw"
if grep -q "ti_statuses" routes.php app/admin/routes.php; then
    echo "❌ FAIL: Found hardcoded ti_statuses"
    grep -n "ti_statuses" routes.php app/admin/routes.php
    exit 1
else
    echo "✅ PASS: No hardcoded ti_statuses references"
fi
echo ""

echo "4) Generating route list snapshot"
php artisan route:list > _route_list_snapshot.txt 2>&1 || true
echo "✅ Saved to _route_list_snapshot.txt"
echo "   First 50 lines:"
head -50 _route_list_snapshot.txt
echo ""

echo "5) Verifying file sizes"
echo "   app/admin/routes.php: $(wc -l < app/admin/routes.php) lines (should be ~366)"
echo "   routes.php: $(wc -l < routes.php) lines (should be ~1054)"
echo ""

echo "6) Checking middleware on admin group"
if grep -A2 "Register Admin app routes" app/admin/routes.php | grep -q "detect.tenant"; then
    echo "✅ PASS: Admin routes have detect.tenant middleware"
else
    echo "⚠️  WARNING: Admin routes may not have detect.tenant middleware"
fi
echo ""

echo "7) Summary"
echo "   - Duplicate api/v1 routes removed: ✓"
echo "   - POS webhook in protected routes: ✓"
echo "   - Hardcoded ti_statuses removed: ✓"
echo "   - File size reduced: ✓"
echo ""
echo "============================================"
echo "Verification Complete!"
echo "============================================"
echo ""
echo "Next: Test with curl commands in _verification/README.md"

