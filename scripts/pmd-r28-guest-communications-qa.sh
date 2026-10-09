#!/usr/bin/env bash
set -euo pipefail

echo
echo "========================================"
echo "PayMyDine R28 guest communications QA"
echo "========================================"

php -l app/Services/Reservations/PmdGuestCommunicationService.php
php -l app/Http/Controllers/PmdPublicBookingController.php
php -l app/admin/controllers/Pmdsettings.php
php -l app/admin/ServiceProvider.php
php -l app/admin/i18n/platform/en.php
php -l app/admin/i18n/platform/de.php
php -l app/admin/i18n/platform/tr.php
php -l app/admin/i18n/platform/ar.php

if command -v node >/dev/null 2>&1; then
  node --check public/assets/pmd/public-booking-manage-v1.js
fi

grep -Fq "PMD_GUEST_COMMUNICATIONS_R28" app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq "PMD_GUEST_COMMUNICATIONS_R28" app/admin/assets/css/pmd-settings-restaurant-v1.css
grep -Fq "Guest communications" app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq 'communication[email_enabled]' app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq 'communication[whatsapp_enabled]' app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq 'communication[whatsapp_endpoint]' app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq 'communication[whatsapp_template_created]' app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq 'communication[whatsapp_template_updated]' app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq 'communication[whatsapp_template_canceled]' app/admin/views/pmdsettings/restaurant.blade.php

grep -Fq "PmdGuestCommunicationService" app/admin/controllers/Pmdsettings.php
grep -Fq "pmd_reservation_messages_email_enabled" app/admin/controllers/Pmdsettings.php
grep -Fq "pmd_reservation_messages_whatsapp_enabled" app/admin/controllers/Pmdsettings.php
grep -Fq "onTestReservationEmail" app/admin/controllers/Pmdsettings.php
grep -Fq "onTestReservationWhatsApp" app/admin/controllers/Pmdsettings.php

grep -Fq "PMD_GUEST_COMMUNICATIONS_AFTER_RESPONSE_R28" app/Http/Controllers/PmdPublicBookingController.php
grep -Fq "app()->terminating" app/Http/Controllers/PmdPublicBookingController.php
grep -Fq "queueGuestCommunication(" app/Http/Controllers/PmdPublicBookingController.php
grep -Fq "'created'," app/Http/Controllers/PmdPublicBookingController.php
grep -Fq "'updated'," app/Http/Controllers/PmdPublicBookingController.php
grep -Fq "'canceled'," app/Http/Controllers/PmdPublicBookingController.php

grep -Fq "reservation_guest_message" app/admin/ServiceProvider.php
test -f app/admin/views/_mail/reservation_guest_message.blade.php

grep -Fq "_pmd_booking_locale: activeLanguageCode()" public/assets/pmd/public-booking-manage-v1.js
grep -Fq "public-booking-manage-v1.js?v=20261009-r28" resources/views/pmd/public-booking-manage.blade.php
grep -Fq "pmd-settings-restaurant-v1.css?v=20261009_r28" app/admin/views/pmdsettings/restaurant.blade.php

grep -Fq "whatsappTemplateLanguage" app/Services/Reservations/PmdGuestCommunicationService.php
grep -Fq "'type' => 'template'" app/Services/Reservations/PmdGuestCommunicationService.php
grep -Fq "'type' => 'text'" app/Services/Reservations/PmdGuestCommunicationService.php
grep -Fq "safeHttpsUrl" app/Services/Reservations/PmdGuestCommunicationService.php
grep -Fq "Mail::send(" app/Services/Reservations/PmdGuestCommunicationService.php

grep -Fq "settings.communication.guest_communications_r28" app/admin/i18n/platform/en.php
grep -Fq "settings.communication.guest_communications_r28" app/admin/i18n/platform/de.php
grep -Fq "settings.communication.guest_communications_r28" app/admin/i18n/platform/tr.php
grep -Fq "settings.communication.guest_communications_r28" app/admin/i18n/platform/ar.php

if grep -Eq 'name="communication\[(smtp_pass|mailgun_secret|postmark_token|ses_key|ses_secret|whatsapp_token)\]"[^>]+value="[^"]+"' app/admin/views/pmdsettings/restaurant.blade.php; then
  echo "ERROR: a communication secret is rendered back into Restaurant Profile."
  exit 1
fi

# R29 regression guards: defaults, destination safety, and real save responses.
grep -Fq "pmd_reservation_messages_email_enabled', false" app/Services/Reservations/PmdGuestCommunicationService.php
grep -Fq "hasApprovedTemplatesForEnabledEvents" app/Services/Reservations/PmdGuestCommunicationService.php
grep -Fq "resolvesToPublicAddress" app/Services/Reservations/PmdGuestCommunicationService.php
grep -Fq "isAllowedWhatsappEndpoint" app/Services/Reservations/PmdGuestCommunicationService.php
grep -Fq "allow_redirects' => false" app/Services/Reservations/PmdGuestCommunicationService.php
grep -Fq "public function onTestReservationEmail" app/admin/controllers/Pmdsettings.php
grep -Fq "pmdPublicBookingLocationMismatch" app/admin/controllers/Pmdsettings.php
grep -Fq "pmdPublicBookingLocationMismatch" app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq "response.redirected" app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq "data['#pmd-profile-save-status']" app/admin/views/pmdsettings/restaurant.blade.php

echo
echo "PASS: R29 guest communications opt-in, WhatsApp safety, profile location visibility and strict save acknowledgment."

echo
echo "PASS: R28 exposes restaurant email/WhatsApp delivery settings, keeps secrets write-only, sends created/updated/canceled guest messages after the booking response, and supports approved Meta WhatsApp templates or a custom bot gateway."
