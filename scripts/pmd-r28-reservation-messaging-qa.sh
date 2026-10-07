#!/usr/bin/env bash
set -euo pipefail

echo
echo "========================================"
echo "PayMyDine R28 reservation messaging QA"
echo "========================================"

php -l app/Services/Reservations/PmdReservationMessagingService.php
php -l app/Http/Controllers/PmdPublicBookingController.php
php -l app/admin/controllers/Pmdsettings.php
php -l app/admin/database/migrations/2026_10_07_230000_create_pmd_reservation_message_preferences.php

if command -v node >/dev/null 2>&1; then
    node --check public/assets/pmd/public-booking-v1.js
    node --check public/assets/pmd/public-booking-manage-v1.js
fi

grep -Fq "PMD_RESERVATION_MESSAGING_R28" app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq "PMD_RESTAURANT_MESSAGING_R28" app/admin/assets/css/pmd-settings-restaurant-v1.css
grep -Fq "PmdReservationMessagingService" app/Http/Controllers/PmdPublicBookingController.php
grep -Fq "pmd_reservation_message_preferences" app/admin/database/migrations/2026_10_07_230000_create_pmd_reservation_message_preferences.php

grep -Fq 'name="messaging[email_enabled]"' app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq 'name="messaging[whatsapp_enabled]"' app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq 'name="messaging[owner_email_enabled]"' app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq 'data-request="onTestReservationEmail"' app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq 'data-request="onTestReservationWhatsapp"' app/admin/views/pmdsettings/restaurant.blade.php

grep -Fq 'name="whatsapp_updates"' resources/views/pmd/public-booking.blade.php
grep -Fq 'name="whatsapp_updates"' resources/views/pmd/public-booking-manage.blade.php
grep -Fq 'data-pmd-manage-table-preferences' resources/views/pmd/public-booking-manage.blade.php
grep -Fq 'name="pmd_table_features[]"' resources/views/pmd/public-booking-manage.blade.php
grep -Fq "20261007-r28" resources/views/pmd/public-booking.blade.php
grep -Fq "20261007-r28" resources/views/pmd/public-booking-manage.blade.php

if grep -Fq 'data-pmd-manage-occasion-grid' resources/views/pmd/public-booking-manage.blade.php; then
    echo "ERROR: legacy manage occasion grid is still present."
    exit 1
fi

if grep -Fq 'value="{{ $pmdProfile['"'"'whatsapp_access_token'"'"']' app/admin/views/pmdsettings/restaurant.blade.php; then
    echo "ERROR: WhatsApp access token is being rendered back into HTML."
    exit 1
fi

if grep -Fq 'value="{{ $pmdProfile['"'"'smtp_pass'"'"']' app/admin/views/pmdsettings/restaurant.blade.php; then
    echo "ERROR: SMTP password is being rendered back into HTML."
    exit 1
fi

if ! grep -Fq "guestEmailOperational" app/Http/Controllers/PmdPublicBookingController.php; then
    echo "ERROR: duplicate guarantee-email guard is missing."
    exit 1
fi

if ! grep -Fq "whatsappOperational" app/Http/Controllers/PmdPublicBookingController.php; then
    echo "ERROR: public WhatsApp opt-in readiness gate is missing."
    exit 1
fi

echo
echo "PASS: R28 email, WhatsApp, consent, Restaurant Profile, and management preference markers are valid."
