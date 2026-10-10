#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for file in \
    app/Services/WhatsApp/PmdWhatsAppLocalePolicy.php \
    app/Services/WhatsApp/PmdWhatsAppButtonPolicy.php \
    app/Services/WhatsApp/PmdSharedWhatsAppButtonDispatcher.php \
    app/Services/WhatsApp/PmdSharedWhatsAppService.php \
    app/Services/WhatsApp/PmdManagedWhatsAppService.php \
    app/Services/WhatsApp/PmdWhatsAppSchema.php \
    app/Services/Reservations/PmdGuestCommunicationService.php \
    app/Http/Controllers/PmdPublicBookingController.php \
    app/admin/services/ReservationComposerService.php \
    app/admin/requests/ReservationComposer.php \
    app/Console/Commands/PmdWhatsAppCommand.php \
    config/pmd_whatsapp.php \
    scripts/pmd-r34-locale-buttons-contract.php
do
    php -l "$file"
done

php scripts/pmd-r34-locale-buttons-contract.php
node --check app/admin/assets/js/pmd-reservation-composer-v1.js

# Central DB upgrade must be additive for installed R33.
grep -Fq "hasColumn('pmd_wa_shared_consents', 'locale')" app/Services/WhatsApp/PmdWhatsAppSchema.php
grep -Fq "hasColumn('pmd_wa_shared_messages', 'manage_url_ciphertext')" app/Services/WhatsApp/PmdWhatsAppSchema.php
grep -Fq "pmd_wa_shared_action_jobs" app/Services/WhatsApp/PmdWhatsAppSchema.php
grep -Fq 'reservationLocale(' app/Services/WhatsApp/PmdSharedWhatsAppService.php
grep -Fq "'locale' => \$locale" app/Services/WhatsApp/PmdSharedWhatsAppService.php
grep -Fq "admin_verified_guest_consent" app/Services/WhatsApp/PmdSharedWhatsAppService.php
grep -Fq "shared_approved_template_locales" config/pmd_whatsapp.php
grep -Fq "PMD_WA_SHARED_QUICK_REPLIES" config/pmd_whatsapp.php
grep -Fq "PmdWhatsAppLocalePolicy::metaCode" app/Services/WhatsApp/PmdManagedWhatsAppService.php
grep -Fq "PmdWhatsAppButtonPolicy::safeManageUrl" app/Services/WhatsApp/PmdManagedWhatsAppService.php

# Admin must never infer consent from a supplied phone number and always
# expose unchecked and resettable consent when the pilot is explicitly on.
for file in app/admin/views/reservations/_reservation_composer.blade.php app/admin/views/reservations2/_reservation_composer.blade.php; do
    grep -Fq 'name="whatsapp_guest_consent" value="1"' "$file"
    grep -Fq 'data-default-locale' "$file"
    grep -Fq "checkbox.checked=false" "$file"
done
grep -Fq "'whatsapp_guest_consent' => ['nullable', 'in:1']" app/admin/requests/ReservationComposer.php
grep -Fq "'whatsapp_guest_locale' => ['nullable', 'in:de,en,tr,ar']" app/admin/requests/ReservationComposer.php
grep -Fq 'sendReservationEvent(' app/admin/services/ReservationComposerService.php
grep -Fq "['whatsapp']" app/admin/services/ReservationComposerService.php
grep -Fq "recordBookingConsent(" app/admin/services/ReservationComposerService.php

# Guests on /book retain their selected locale, subsequent edits do not
# silently switch to staff language, and missing Meta approval blocks sends.
grep -Fq 'bookingLocale' app/Http/Controllers/PmdPublicBookingController.php
grep -Fq 'shared_approved_template_locales' app/Http/Controllers/PmdPublicBookingController.php
grep -Fq 'waLocale' app/Services/Reservations/PmdGuestCommunicationService.php
grep -Fq 'shared-dispatch-buttons' app/Console/Commands/PmdWhatsAppCommand.php
grep -Fq 'pmd_wa_shared_action_jobs' app/Services/WhatsApp/PmdSharedWhatsAppButtonDispatcher.php
grep -Fq "->where('kind', 'template')" app/Services/WhatsApp/PmdSharedWhatsAppButtonDispatcher.php || \
    grep -Fq -- "->where('kind', 'template')" app/Services/WhatsApp/PmdSharedWhatsAppButtonDispatcher.php

bash scripts/pmd-r33-shared-whatsapp-qa.sh
bash scripts/pmd-r32-owner-whatsapp-ui-qa.sh
echo "PASS: R34 multilingual guest and verified button-only changes preserve R33/R32/R31/R28 contracts."
