#!/usr/bin/env bash
set -euo pipefail

echo
echo "========================================"
echo "PayMyDine R24 booking calendar/i18n QA"
echo "========================================"

php -l app/Http/Controllers/PmdPublicBookingController.php
php -l app/Services/Reservations/PmdReservationGuaranteeService.php
php -l app/admin/controllers/Pmdsettings.php

node --check public/assets/pmd/public-booking-v1.js

grep -Fq "20261007-r24" resources/views/pmd/public-booking.blade.php
grep -Fq "PMD_PUBLIC_BOOKING_R24" public/assets/pmd/public-booking-v1.css
grep -Fq "function finalDateWindowStart()" public/assets/pmd/public-booking-v1.js
grep -Fq "function clampDateWindowStart(value)" public/assets/pmd/public-booking-v1.js
grep -Fq "grid-template-columns: repeat(7, minmax(82px, 1fr));" public/assets/pmd/public-booking-v1.css
grep -Fq "grid-template-columns: repeat(7, 73px);" public/assets/pmd/public-booking-v1.css

if grep -Fq "Choose a date, party size and an available time. Your reservation goes directly to the restaurant." resources/views/pmd/public-booking.blade.php; then
  echo "ERROR: Removed booking hero explainer returned."
  exit 1
fi

if grep -Fq "pmd-booking-hero-intro" resources/views/pmd/public-booking.blade.php; then
  echo "ERROR: Booking hero intro node returned."
  exit 1
fi

if grep -Fq "status && !unavailable ? '<i aria-hidden" public/assets/pmd/public-booking-v1.js; then
  echo "ERROR: Calendar availability dots returned."
  exit 1
fi

if grep -Fq "and only if the restaurant has an actual loss" app/Services/Reservations/PmdReservationGuaranteeService.php; then
  echo "ERROR: Removed guarantee sentence returned."
  exit 1
fi

if grep -Fq "tatsächlich ein Schaden entstanden" app/Services/Reservations/PmdReservationGuaranteeService.php; then
  echo "ERROR: Removed German guarantee sentence returned."
  exit 1
fi

grep -Fq '$bookingLocale' app/Http/Controllers/PmdPublicBookingController.php
grep -Fq "payload.locale ||" public/assets/pmd/public-booking-v1.js
grep -Fq "successLocale" public/assets/pmd/public-booking-v1.js
grep -Fq "localizedGuarantee.termsText" public/assets/pmd/public-booking-v1.js

grep -Fq "Public booking contact" app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq "Used on /book" app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq "20261007_r24" app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq "PMD_RESTAURANT_PROFILE_R24" app/admin/assets/css/pmd-settings-restaurant-v1.css
grep -Fq "Restaurant identity" app/admin/i18n/platform/en.php
grep -Fq "Kontakt für Online-Reservierungen" app/admin/i18n/platform/de.php

echo
echo "PASS: R24 final date window, calendar cleanup, DE/EN success localization and booking contact UI are valid."
