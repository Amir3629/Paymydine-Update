#!/usr/bin/env bash
set -euo pipefail

echo
echo "========================================"
echo "PayMyDine R22 guarantee + booking QA"
echo "========================================"

php -l app/admin/controllers/Pmdfinance.php
php -l app/Http/Controllers/PmdPublicBookingController.php

node --check app/admin/assets/js/pmd-finance-guarantee-r22.js
node --check public/assets/pmd/public-booking-v1.js

grep -Fq "PMD_FINANCE_GUARANTEE_R22" app/admin/assets/css/pmd-finance-guarantee-r22.css
grep -Fq "pmd-finance-guarantee-r22.css" app/admin/controllers/Pmdfinance.php
grep -Fq "pmd-finance-guarantee-r22.js" app/admin/controllers/Pmdfinance.php
grep -Fq "Advanced & provider diagnostics" app/admin/views/pmdfinance/index.blade.php

grep -Fq "'find_table' => 'Finde deinen Tisch'" resources/views/pmd/public-booking.blade.php
grep -Fq "'hero_intro' => ''" resources/views/pmd/public-booking.blade.php
if grep -Fq 'pmd-booking-intro__index' resources/views/pmd/public-booking.blade.php; then
  echo "ERROR: Decorative public-booking intro index returned."
  exit 1
fi

grep -Fq 'name="pmd_table_features[]"' resources/views/pmd/public-booking.blade.php
grep -Fq 'value="near_window"' resources/views/pmd/public-booking.blade.php
grep -Fq 'value="quiet_area"' resources/views/pmd/public-booking.blade.php
grep -Fq 'value="accessible"' resources/views/pmd/public-booking.blade.php
if grep -Fq 'name="occasion_id"' resources/views/pmd/public-booking.blade.php; then
  echo "ERROR: Public occasion choices returned."
  exit 1
fi

grep -Fq "Geschäftsessen, Feier, Sitzwunsch, Kinderstuhl…" resources/views/pmd/public-booking.blade.php
grep -Fq "20261007-r22" resources/views/pmd/public-booking.blade.php

grep -Fq 'buttonType: {' public/assets/pmd/public-booking-v1.js
grep -Fq 'applePay: "plain"' public/assets/pmd/public-booking-v1.js
grep -Fq 'googlePay: "plain"' public/assets/pmd/public-booking-v1.js
grep -Fq 'link: "never"' public/assets/pmd/public-booking-v1.js
grep -Fq 'pmd_table_features' app/Http/Controllers/PmdPublicBookingController.php
grep -Fq 'persistPublicTablePreferences' app/Http/Controllers/PmdPublicBookingController.php
grep -Fq 'pmd_reservation_preferences' app/Http/Controllers/PmdPublicBookingController.php

echo
echo "PASS: R22 settings, booking copy, wallet labels and table preferences are valid."
