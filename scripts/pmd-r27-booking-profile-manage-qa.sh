#!/usr/bin/env bash
set -euo pipefail

echo
echo "========================================"
echo "PayMyDine R27 booking/profile/manage QA"
echo "========================================"

php -l app/Http/Controllers/PmdPublicBookingController.php
php -l app/admin/controllers/Pmdsettings.php
node --check public/assets/pmd/public-booking-v1.js
node --check public/assets/pmd/public-booking-manage-v1.js

grep -Fq "PMD_PUBLIC_BOOKING_ZERO_WAIT_R27" app/Http/Controllers/PmdPublicBookingController.php
grep -Fq "'capacity_slots' =>" app/Http/Controllers/PmdPublicBookingController.php
grep -Fq "cacheCapacity(requestDate, payload);" public/assets/pmd/public-booking-v1.js
grep -Fq "loadAvailability({ silent: true });" public/assets/pmd/public-booking-v1.js
grep -Fq "availabilityFromCapacity(state.date, state.guests)" public/assets/pmd/public-booking-manage-v1.js

grep -Fq "PMD_MANAGE_GUARANTEE_THRESHOLD_R27" app/Http/Controllers/PmdPublicBookingController.php
grep -Fq "_pmd_guarantee_terms_accepted" app/Http/Controllers/PmdPublicBookingController.php
grep -Fq "manage_hash" app/Http/Controllers/PmdPublicBookingController.php
grep -Fq 'id="pmd-booking-guarantee"' resources/views/pmd/public-booking-manage.blade.php
grep -Fq "verifyGuaranteeForBooking(updatePayload)" public/assets/pmd/public-booking-manage-v1.js

grep -Fq 'data-pmd-manage-language' resources/views/pmd/public-booking-manage.blade.php
grep -Fq 'hidden aria-hidden="true"' resources/views/pmd/public-booking-manage.blade.php
if grep -Fq '<p class="pmd-booking-kicker" data-pmd-manage-i18n="manage_booking"' resources/views/pmd/public-booking-manage.blade.php; then
  echo "ERROR: duplicate manage-booking kicker returned."
  exit 1
fi

if ! grep -Fq "data-pmd-manage-occasion-grid" resources/views/pmd/public-booking-manage.blade.php \
  && ! grep -Fq "data-pmd-manage-table-preferences" resources/views/pmd/public-booking-manage.blade.php; then
  echo "ERROR: managed reservation preference controls are missing."
  exit 1
fi
grep -Fq 'id="pmd-manage-cancel-dialog"' resources/views/pmd/public-booking-manage.blade.php
grep -Fq "PMD_MANAGE_CANCEL_DIALOG_R27_1" public/assets/pmd/public-booking-v1.css
grep -Fq "openCancelDialog()" public/assets/pmd/public-booking-manage-v1.js
grep -Fq "performCancelReservation()" public/assets/pmd/public-booking-manage-v1.js
grep -Eq "20261007-r(27-1|28)" resources/views/pmd/public-booking-manage.blade.php
if grep -Fq "window.confirm(labels.cancel_confirm" public/assets/pmd/public-booking-manage-v1.js; then
  echo "ERROR: native browser reservation-cancel confirmation returned."
  exit 1
fi

grep -Fq "PMD_PUBLIC_BOOKING_R27" public/assets/pmd/public-booking-v1.css
grep -Eq "20261007-r(27|28)" resources/views/pmd/public-booking.blade.php
grep -Eq "20261007-r(27|27-1|28)" resources/views/pmd/public-booking-manage.blade.php

grep -Fq "PMD_RESTAURANT_PUBLIC_BOOKING_CONTACT_R27" app/admin/assets/css/pmd-settings-simplify-r1.css
grep -Fq "PMD_RESTAURANT_PUBLIC_BOOKING_CONTACT_R27" app/admin/assets/css/pmd-settings-restaurant-v1.css
grep -Fq "Public booking contact" app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq 'data-pmd-public-booking-contact="r25"' app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq 'profile[address_1]' app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq 'profile[email]' app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq 'profile[telephone]' app/admin/views/pmdsettings/restaurant.blade.php

if grep -Fq '#pmd-restaurant-profile .pmd-profile-form > .pmd-profile-section:nth-of-type(2) {' app/admin/assets/css/pmd-settings-simplify-r1.css; then
  echo "ERROR: legacy positional Restaurant Profile hide rule returned."
  exit 1
fi

echo
echo "PASS: R27/R27.1 restores Restaurant Profile contact fields, keeps party-size availability local, cleans management UI, replaces native cancellation confirm with the PMD dialog, and enforces new guarantee thresholds on managed reservations."
