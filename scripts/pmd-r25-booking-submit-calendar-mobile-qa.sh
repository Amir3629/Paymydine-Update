#!/usr/bin/env bash
set -euo pipefail

echo
echo "========================================"
echo "PayMyDine R25 booking submit/calendar/mobile QA"
echo "========================================"

php -l app/Http/Controllers/PmdPublicBookingController.php
php -l app/Services/Reservations/PmdReservationGuaranteeService.php
php -l app/admin/controllers/Pmdsettings.php

node --check public/assets/pmd/public-booking-v1.js

grep -Fq "20261007-r25" resources/views/pmd/public-booking.blade.php
grep -Fq "'openingHours' => \$bookingOpeningHours" resources/views/pmd/public-booking.blade.php
grep -Fq "'bookingOpeningHours' => \$openingHours" app/Http/Controllers/PmdPublicBookingController.php

grep -Fq "function recurringDateStatus(value)" public/assets/pmd/public-booking-v1.js
grep -Fq "function statusForDate(value)" public/assets/pmd/public-booking-v1.js
grep -Fq 'var visibleStatusLabel = status === "closed" ? "" : statusLabel;' public/assets/pmd/public-booking-v1.js
grep -Fq 'var nextStatus = statusForDate(value);' public/assets/pmd/public-booking-v1.js

grep -Fq "PMD_PUBLIC_BOOKING_R25" public/assets/pmd/public-booking-v1.css
grep -Fq "scrollbar-width: none;" public/assets/pmd/public-booking-v1.css
grep -Fq "grid-template-columns: repeat(3, minmax(0, 1fr));" public/assets/pmd/public-booking-v1.css

grep -Fq "preference persistence failed" app/Http/Controllers/PmdPublicBookingController.php
grep -Fq "guarantee payload failed after commit" app/Http/Controllers/PmdPublicBookingController.php
grep -Fq "Once the DB transaction committed" app/Http/Controllers/PmdPublicBookingController.php

grep -Fq "20261007_r25" app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq 'data-pmd-public-booking-contact="r25"' app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq "Open booking page" app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq "PMD_RESTAURANT_PROFILE_R25" app/admin/assets/css/pmd-settings-restaurant-v1.css
grep -Fq "Reservierungsseite öffnen" app/admin/i18n/platform/de.php

grep -Fq '$bookingLocale' scripts/pmd-r24-booking-calendar-localization-qa.sh

echo
echo "PASS: R25 submit hardening, recurring closed days, hidden scrollbars, mobile preferences and Restaurant Profile contact UI are valid."
