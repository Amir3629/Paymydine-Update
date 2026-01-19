#!/bin/bash

# Quick Fix Script for PayPal Payment Configuration Fields
# This fixes the missing PayPal configuration fields by updating the class_name

set -e

echo "=========================================="
echo "PayPal Payment Fields Fix Script"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if we're in the project root
if [ ! -f "artisan" ]; then
    echo -e "${RED}Error: artisan file not found. Please run this script from the project root directory.${NC}"
    exit 1
fi

echo "Step 1: Fixing PayPal payment gateway class_name..."
php artisan tinker --execute="
\$paypal = \Admin\Models\Payments_model::where('code', 'paypalexpress')->first();
if (\$paypal) {
    if (empty(\$paypal->class_name)) {
        \$paypal->class_name = 'Igniter\\\\PayRegister\\\\Payments\\\\PaypalExpress';
        \$paypal->save();
        echo 'PayPal class_name updated successfully';
    } else {
        echo 'PayPal class_name already set: ' . \$paypal->class_name;
    }
} else {
    echo 'PayPal payment record not found';
}
" 2>/dev/null

echo ""
echo "Step 2: Syncing all payment gateways..."
php artisan tinker --execute="\Admin\Models\Payments_model::syncAll(); echo 'Payment gateways synced';" 2>/dev/null

echo ""
echo "Step 3: Clearing caches..."
php artisan cache:clear 2>/dev/null && echo -e "${GREEN} Cache cleared${NC}" || echo -e "${YELLOW} Cache clear had issues${NC}"
php artisan config:clear 2>/dev/null && echo -e "${GREEN} Config cleared${NC}" || echo -e "${YELLOW} Config clear had issues${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}Fix Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Go to Admin Panel > Payments"
echo "2. Edit PayPal Express payment method"
echo "3. You should now see all PayPal configuration fields:"
echo "   - API Mode (Sandbox/Live)"
echo "   - API User, API Pass, API Signature"
echo "   - Sandbox API credentials"
echo "   - Order Fee settings"
echo "   - Order Status"
echo ""
echo "If fields still don't appear:"
echo "1. Clear browser cache and refresh"
echo "2. Restart PHP-FPM/web server"
echo ""

