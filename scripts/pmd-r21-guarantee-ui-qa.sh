#!/usr/bin/env bash
set -euo pipefail

echo
echo "========================================"
echo "PayMyDine R21 guarantee UI / speed QA"
echo "========================================"

php -l app/admin/controllers/Pmdfinance.php
php -l app/Services/Reservations/PmdReservationGuaranteeProviderRegistry.php
php -l app/Services/Reservations/PmdReservationGuaranteeService.php

node --check app/admin/assets/js/pmd-finance-guarantee-r20-9.js
node --check public/assets/pmd/public-booking-v1.js

grep -Fq "PMD_FINANCE_GUARANTEE_R21" app/admin/assets/css/pmd-finance-flat-ui-v1.css
grep -Fq "pmd-guarantee-console" app/admin/views/pmdfinance/index.blade.php
grep -Fq "PayPal uses a separate PayPal Vault connection" app/admin/views/pmdfinance/index.blade.php
grep -Fq "sanitizeUnavailableMethods" app/admin/assets/js/pmd-finance-guarantee-r20-9.js

grep -Fq "PMD_PUBLIC_BOOKING_GUARANTEE_R21" public/assets/pmd/public-booking-v1.css
grep -Fq "stripeWalletCache" public/assets/pmd/public-booking-v1.js
grep -Fq "warmGuaranteeStripe" public/assets/pmd/public-booking-v1.js
grep -Fq "setStripeWalletVisibility" public/assets/pmd/public-booking-v1.js
grep -Fq "20261007-r21" resources/views/pmd/public-booking.blade.php

echo
echo "PASS: R21 guarantee UI and provider-switch markers are valid."
