#!/bin/bash
set -e  # Exit on error

echo "=========================================="
echo "PayRegister Extension Installation Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the project root
if [ ! -f "composer.json" ]; then
    echo -e "${RED}Error: composer.json not found. Please run this script from the project root directory.${NC}"
    exit 1
fi

# Check if composer is installed
if ! command -v composer &> /dev/null; then
    echo -e "${RED}Error: Composer is not installed. Please install Composer first.${NC}"
    exit 1
fi

# Check if PHP is installed
if ! command -v php &> /dev/null; then
    echo -e "${RED}Error: PHP is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN} Prerequisites check passed${NC}"
echo ""

# Step 1: Check if PayRegister is already installed
echo "Step 1: Checking if PayRegister extension is already installed..."
if composer show tastyigniter/ti-ext-payregister &> /dev/null; then
    echo -e "${YELLOW} PayRegister extension is already installed${NC}"
    read -p "Do you want to reinstall/update it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping installation. Proceeding to cache clearing..."
    else
        INSTALL_EXTENSION=true
    fi
else
    INSTALL_EXTENSION=true
fi

# Step 2: Install PayRegister extension
if [ "$INSTALL_EXTENSION" = true ]; then
    echo ""
    echo "Step 2: Installing PayRegister extension..."
    echo "This may take a few minutes..."
    
    if composer require tastyigniter/ti-ext-payregister -W --no-interaction; then
        echo -e "${GREEN} PayRegister extension installed successfully${NC}"
    else
        echo -e "${RED} Failed to install PayRegister extension${NC}"
        exit 1
    fi
else
    echo "Skipping installation (extension already exists)"
fi

# Step 3: Regenerate autoload files
echo ""
echo "Step 3: Regenerating autoload files..."
if composer dump-autoload --no-interaction; then
    echo -e "${GREEN} Autoload files regenerated${NC}"
else
    echo -e "${YELLOW} Warning: Autoload regeneration had issues (may still work)${NC}"
fi

# Step 4: Clear Laravel caches
echo ""
echo "Step 4: Clearing application caches..."
if php artisan cache:clear 2>/dev/null; then
    echo -e "${GREEN} Application cache cleared${NC}"
else
    echo -e "${YELLOW} Warning: Could not clear application cache${NC}"
fi

if php artisan config:clear 2>/dev/null; then
    echo -e "${GREEN} Configuration cache cleared${NC}"
else
    echo -e "${YELLOW} Warning: Could not clear configuration cache${NC}"
fi

if php artisan route:clear 2>/dev/null; then
    echo -e "${GREEN} Route cache cleared${NC}"
else
    echo -e "${YELLOW} Warning: Could not clear route cache${NC}"
fi

# Step 5: Verify installation
echo ""
echo "Step 5: Verifying installation..."
if [ -d "extensions/igniter/payregister" ]; then
    echo -e "${GREEN} Extension directory exists${NC}"
    
    # Check for payment gateway classes
    if [ -f "extensions/igniter/payregister/payments/Stripe.php" ]; then
        echo -e "${GREEN} Stripe payment gateway class found${NC}"
    fi
    
    if [ -f "extensions/igniter/payregister/payments/PaypalExpress.php" ]; then
        echo -e "${GREEN} PayPal payment gateway class found${NC}"
    fi
    
    if [ -f "extensions/igniter/payregister/payments/Square.php" ]; then
        echo -e "${GREEN} Square payment gateway class found${NC}"
    fi
    
    if [ -f "extensions/igniter/payregister/payments/Mollie.php" ]; then
        echo -e "${GREEN} Mollie payment gateway class found${NC}"
    fi
    
    if [ -f "extensions/igniter/payregister/payments/AuthorizeNetAim.php" ]; then
        echo -e "${GREEN} Authorize.Net payment gateway class found${NC}"
    fi
else
    echo -e "${RED} Extension directory not found${NC}"
    exit 1
fi

# Step 6: Check composer package
echo ""
echo "Step 6: Verifying composer package..."
if composer show tastyigniter/ti-ext-payregister &> /dev/null; then
    VERSION=$(composer show tastyigniter/ti-ext-payregister 2>/dev/null | grep "versions" | head -1)
    echo -e "${GREEN} PayRegister package installed: ${VERSION}${NC}"
else
    echo -e "${RED} PayRegister package not found in composer${NC}"
    exit 1
fi

# Step 7: Optional - Run database migrations (commented out by default)
echo ""
echo "Step 7: Database migrations"
echo -e "${YELLOW}Note: Database migrations should be run separately if needed${NC}"
echo "To run migrations manually, use: php artisan igniter:up"
read -p "Do you want to run database migrations now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running database migrations..."
    if php artisan igniter:up --force 2>/dev/null; then
        echo -e "${GREEN} Database migrations completed${NC}"
    else
        echo -e "${YELLOW} Warning: Database migrations had issues (check manually)${NC}"
    fi
else
    echo "Skipping database migrations"
fi

# Final summary
echo ""
echo "=========================================="
echo -e "${GREEN}Installation Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Go to your admin panel: /admin/payments"
echo "2. Edit any payment method (Stripe, PayPal, etc.)"
echo "3. You should now see all configuration fields:"
echo "   - Transaction Mode (Test/Live)"
echo "   - API Keys (Test/Live)"
echo "   - Webhook Secrets"
echo "   - Order Fee settings"
echo "   - Minimum Order Total"
echo "   - Order Status"
echo ""
echo "If fields still don't appear:"
echo "1. Clear browser cache and refresh"
echo "2. Check Admin > Extensions > Manage Extensions"
echo "3. Ensure 'Pay Register' extension is enabled"
echo "4. Restart your web server/PHP-FPM if needed"
echo ""
echo -e "${GREEN}Script completed successfully!${NC}"


