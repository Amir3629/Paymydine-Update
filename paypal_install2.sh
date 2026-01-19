set -e

echo "=========================================="
echo "PayPal Payment Gateway Fix Script"
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

echo "Step 1: Verifying PayRegister extension..."
if composer show tastyigniter/ti-ext-payregister &> /dev/null; then
    echo -e "${GREEN} PayRegister extension is installed${NC}"
else
    echo -e "${RED} PayRegister extension NOT installed${NC}"
    echo "Installing PayRegister extension..."
    composer require tastyigniter/ti-ext-payregister -W --no-interaction
    echo -e "${GREEN} PayRegister extension installed${NC}"
fi

echo ""
echo "Step 2: Regenerating autoload files..."
composer dump-autoload --no-interaction
echo -e "${GREEN} Autoload files regenerated${NC}"

echo ""
echo "Step 3: Fixing PayPal payment gateway class_name..."
php artisan tinker --execute="
\$paypal = \Admin\Models\Payments_model::where('code', 'paypalexpress')->first();
if (\$paypal) {
    \$expectedClass = 'Igniter\\\\PayRegister\\\\Payments\\\\PaypalExpress';
    
    if (empty(\$paypal->class_name)) {
        echo 'Fixing empty class_name...' . PHP_EOL;
        \$paypal->class_name = \$expectedClass;
        \$paypal->save();
        echo ' PayPal class_name set to: ' . \$expectedClass . PHP_EOL;
    } elseif (\$paypal->class_name !== \$expectedClass) {
        echo 'Fixing incorrect class_name...' . PHP_EOL;
        echo '  Current: ' . \$paypal->class_name . PHP_EOL;
        echo '  Setting to: ' . \$expectedClass . PHP_EOL;
        \$paypal->class_name = \$expectedClass;
        \$paypal->save();
        echo ' PayPal class_name updated' . PHP_EOL;
    } else {
        echo ' PayPal class_name is already correct' . PHP_EOL;
    }
    
    // Verify the class exists
    if (class_exists(\$paypal->class_name)) {
        echo ' PayPal gateway class exists and can be loaded' . PHP_EOL;
    } else {
        echo ' WARNING: PayPal gateway class does NOT exist: ' . \$paypal->class_name . PHP_EOL;
        echo '  This might indicate an autoload issue' . PHP_EOL;
    }
} else {
    echo 'PayPal payment record not found. Creating it...' . PHP_EOL;
    \$paypal = \Admin\Models\Payments_model::create([
        'code' => 'paypalexpress',
        'name' => 'PayPal Express',
        'description' => 'Allows your customers to make payment using PayPal',
        'class_name' => 'Igniter\\\\PayRegister\\\\Payments\\\\PaypalExpress',
        'status' => 0,
        'is_default' => 0,
        'priority' => 2,
    ]);
    echo ' PayPal payment record created' . PHP_EOL;
}
" 2>/dev/null

echo ""
echo "Step 4: Installing and enabling PayRegister extension..."
php artisan tinker --execute="
\$em = \System\Classes\ExtensionManager::instance();
if (!\$em->hasExtension('igniter.payregister')) {
    echo 'Extension not found' . PHP_EOL;
} else {
    // Install extension if not installed
    if (!\$em->isDisabled('igniter.payregister')) {
        echo 'Extension already enabled' . PHP_EOL;
    } else {
        \$em->installExtension('igniter.payregister');
        \$em->updateInstalledExtensions('igniter.payregister', true);
        echo 'Extension installed and enabled' . PHP_EOL;
    }
}
" 2>/dev/null

echo ""
echo "Step 5: Syncing all payment gateways..."
php artisan tinker --execute="
try {
    \Admin\Models\Payments_model::syncAll();
    echo ' Payment gateways synced successfully' . PHP_EOL;
} catch (Exception \$e) {
    echo ' Warning: syncAll() had issues: ' . \$e->getMessage() . PHP_EOL;
    echo '  This is usually okay if gateways already exist' . PHP_EOL;
}
" 2>/dev/null

echo ""
echo "Step 6: Verifying PayPal gateway registration..."
php artisan tinker --execute="
\$gateways = \Admin\Classes\PaymentGateways::instance()->listGateways();
if (isset(\$gateways['paypalexpress'])) {
    echo ' PayPal gateway is registered in PaymentGateways' . PHP_EOL;
    echo '  Class: ' . \$gateways['paypalexpress']['class'] . PHP_EOL;
} else {
    echo ' PayPal gateway is NOT registered' . PHP_EOL;
    echo '  Available gateways: ' . implode(', ', array_keys(\$gateways)) . PHP_EOL;
}
" 2>/dev/null

echo ""
echo "Step 7: Testing PayPal gateway configuration fields..."
php artisan tinker --execute="
try {
    \$paypal = \Admin\Models\Payments_model::where('code', 'paypalexpress')->first();
    if (\$paypal && \$paypal->class_name && class_exists(\$paypal->class_name)) {
        \$gateway = new \$paypal->class_name(\$paypal);
        if (method_exists(\$gateway, 'getConfigFields')) {
            \$fields = \$gateway->getConfigFields();
            if (is_array(\$fields) && count(\$fields) > 0) {
                echo ' PayPal gateway has ' . count(\$fields) . ' configuration fields' . PHP_EOL;
                echo '  Key fields found:' . PHP_EOL;
                \$keyFields = ['api_mode', 'api_user', 'api_pass', 'api_signature', 'order_fee', 'order_status'];
                foreach (\$keyFields as \$key) {
                    if (isset(\$fields[\$key])) {
                        echo '     ' . \$key . PHP_EOL;
                    } else {
                        echo '     ' . \$key . ' (missing)' . PHP_EOL;
                    }
                }
            } else {
                echo ' PayPal gateway has NO configuration fields' . PHP_EOL;
            }
        } else {
            echo ' PayPal gateway does NOT have getConfigFields() method' . PHP_EOL;
        }
    } else {
        echo ' Cannot test: PayPal gateway class issue' . PHP_EOL;
    }
} catch (Exception \$e) {
    echo ' Error testing PayPal gateway: ' . \$e->getMessage() . PHP_EOL;
}
" 2>/dev/null

echo ""
echo "Step 8: Clearing all caches..."
php artisan cache:clear 2>/dev/null && echo -e "${GREEN} Application cache cleared${NC}" || echo -e "${YELLOW} Cache clear had issues${NC}"
php artisan config:clear 2>/dev/null && echo -e "${GREEN} Configuration cache cleared${NC}" || echo -e "${YELLOW} Config clear had issues${NC}"
php artisan route:clear 2>/dev/null && echo -e "${GREEN} Route cache cleared${NC}" || echo -e "${YELLOW} Route clear had issues${NC}"
php artisan view:clear 2>/dev/null && echo -e "${GREEN} View cache cleared${NC}" || echo -e "${YELLOW} View clear had issues${NC}"

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
echo "   - API Action (Sale/Authorization)"
echo "   - Order Fee settings"
echo "   - Order Status"
echo ""
echo "If fields still don't appear:"
echo "1. Clear browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)"
echo "2. Check browser console for JavaScript errors"
echo "3. Restart PHP-FPM/web server:"
echo "   sudo systemctl restart php8.1-fpm  # or your PHP version"
echo "   sudo systemctl restart nginx       # or apache2"
echo "4. Run diagnostic script: ./diagnose-paypal-issue.sh"
echo ""
echo -e "${GREEN}Script completed!${NC}"
