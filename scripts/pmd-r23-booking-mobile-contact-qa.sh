#!/usr/bin/env bash
set -euo pipefail

echo
echo "========================================"
echo "PayMyDine R23 booking/mobile/contact QA"
echo "========================================"

php -l app/Http/Controllers/PmdPublicBookingController.php
php -l app/Services/Reservations/PmdReservationGuaranteeService.php
php -l app/admin/controllers/Pmdsettings.php

node --check public/assets/pmd/public-booking-v1.js

grep -Fq "PMD_PUBLIC_BOOKING_R23" public/assets/pmd/public-booking-v1.css
grep -Fq "20261007-r23" resources/views/pmd/public-booking.blade.php

grep -Fq 'data-pmd-calendar-toggle' resources/views/pmd/public-booking.blade.php
grep -Fq 'id="pmd-booking-calendar-popover"' resources/views/pmd/public-booking.blade.php
grep -Fq 'function renderCalendar()' public/assets/pmd/public-booking-v1.js
grep -Fq 'function syncLanguageSwitcher()' public/assets/pmd/public-booking-v1.js

if grep -Fq 'id="pmd-booking-date"' resources/views/pmd/public-booking.blade.php    && grep -F 'id="pmd-booking-date"' resources/views/pmd/public-booking.blade.php | grep -Fq 'type="date"'; then
  echo "ERROR: Native browser date input returned."
  exit 1
fi

grep -Fq '.pmd-booking-step__rail {' public/assets/pmd/public-booking-v1.css
grep -Fq 'display: flex !important;' public/assets/pmd/public-booking-v1.css
grep -Fq 'scroll-snap-type: x proximity;' public/assets/pmd/public-booking-v1.css

if grep -Fq 'pmd-booking-guarantee__shield' resources/views/pmd/public-booking.blade.php; then
  echo "ERROR: Guarantee shield returned."
  exit 1
fi

grep -Fq "Bis {$hours} Std. vorher kostenlos stornierbar." app/Services/Reservations/PmdReservationGuaranteeService.php

grep -Fq "Restaurant email" app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq "Street & number" app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq "location_email" app/admin/controllers/Pmdsettings.php
grep -Fq "location_address_1" app/admin/controllers/Pmdsettings.php
grep -Fq "FILTER_VALIDATE_EMAIL" app/Http/Controllers/PmdPublicBookingController.php
grep -Fq "rawurlencode" resources/views/pmd/public-booking.blade.php

echo
echo "PASS: R23 custom calendar, mobile layout, guarantee copy and restaurant contact wiring are valid."
