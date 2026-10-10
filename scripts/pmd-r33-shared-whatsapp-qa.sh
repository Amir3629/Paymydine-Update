#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

for file in \
  app/Services/WhatsApp/PmdSharedWhatsAppService.php \
  app/Services/WhatsApp/PmdSharedWhatsAppRoutingPolicy.php \
  app/Services/WhatsApp/PmdWhatsAppGateway.php \
  app/Services/WhatsApp/PmdManagedWhatsAppService.php \
  app/Services/WhatsApp/PmdWhatsAppSchema.php \
  app/Services/Reservations/PmdGuestCommunicationService.php \
  app/Console/Commands/PmdWhatsAppCommand.php \
  app/Http/Controllers/PmdWhatsAppWebhookController.php \
  app/Http/Controllers/PmdPublicBookingController.php \
  app/admin/controllers/Pmdwhatsappinbox.php \
  config/pmd_whatsapp.php \
  scripts/pmd-r33-shared-routing-contract.php
do
  php -l "$file"
done

php scripts/pmd-r33-shared-routing-contract.php
node --check public/assets/pmd/public-booking-v1.js

SHARED=app/Services/WhatsApp/PmdSharedWhatsAppService.php
SCHEMA=app/Services/WhatsApp/PmdWhatsAppSchema.php
ROUTER=app/Services/WhatsApp/PmdSharedWhatsAppRoutingPolicy.php
BOOK=resources/views/pmd/public-booking.blade.php
CTRL=app/Http/Controllers/PmdPublicBookingController.php
COMMAND=app/Console/Commands/PmdWhatsAppCommand.php

# No auto activation, tenant guessing or request-manipulated sender.
grep -Fq "config('pmd_whatsapp.shared_enabled', false)" "$SHARED"
grep -Fq "config('pmd_whatsapp.shared_consent_form_enabled', false)" "$SHARED"
grep -Fq -- '->lockForUpdate()' "$SHARED"
grep -Fq "message['context']['id']" "$SHARED"
grep -Fq "PmdSharedWhatsAppRoutingPolicy" "$SHARED"
grep -Fq "pmd_wa_shared_unrouted" "$SHARED"
grep -Fq "pmd_wa_shared_optouts" "$SHARED"
grep -Fq "where('m.wa_id_hash', \$hash)" "$SHARED"
grep -Fq "where('m.direction', 'out')" "$SHARED"
grep -Fq "where('l.enabled', 1)" "$SHARED"
grep -Fq "where('t.status', 'active')" "$SHARED"
grep -Fq "where('tenant_id', \$tenantId)" "$SHARED"
grep -Fq "where('location_id', \$locationId)" "$SHARED"
grep -Fq "Crypt::encryptString" "$SHARED"
grep -Fq "shared-activate-number" "$COMMAND"
grep -Fq "shared-activate-location" "$COMMAND"
grep -Fq "pmd_whatsapp_channels" "$COMMAND"
grep -Fq "pmd_wa_shared_senders" "$SCHEMA"
grep -Fq "pmd_wa_shared_locations" "$SCHEMA"
grep -Fq "pmd_wa_shared_consents" "$SCHEMA"
grep -Fq "pmd_wa_shared_messages" "$SCHEMA"
grep -Fq "pmd_wa_shared_unrouted" "$SCHEMA"
grep -Fq "pmd_wa_shared_optouts" "$SCHEMA"
grep -Fq "'shared_enabled' => filter_var(env('PMD_WA_SHARED_ENABLED', false)" config/pmd_whatsapp.php
grep -Fq "'shared_consent_form_enabled' => filter_var(env('PMD_WA_SHARED_CONSENT_FORM', false)" config/pmd_whatsapp.php

# Booking opt-in is optional, translated, and persisted post-commit before
# queuing notifications, never inferred from general reservation terms.
grep -Fq 'name="whatsapp_opt_in" type="checkbox" value="1"' "$BOOK"
grep -Fq "data-pmd-i18n=\"whatsapp_opt_in\"" "$BOOK"
grep -Fq "'whatsapp_opt_in' => ['nullable', 'in:1']" "$CTRL"
grep -Fq "recordBookingConsent(" "$CTRL"
grep -Fq "hasBookingConsent(" app/Services/WhatsApp/PmdManagedWhatsAppService.php
grep -Fq "recordAccepted(" app/Services/WhatsApp/PmdManagedWhatsAppService.php
grep -Fq "app(PmdSharedWhatsAppService::class)->ingest(" app/Services/WhatsApp/PmdWhatsAppGateway.php
grep -Fq "app(PmdSharedWhatsAppService::class)->recent(" app/Services/WhatsApp/PmdWhatsAppGateway.php
grep -Fq "shared:" app/admin/controllers/Pmdwhatsappinbox.php
grep -Fq 'value="{{ $message' app/admin/views/pmdwhatsappinbox/index.blade.php

# Enforce isolated tables (no modification to old R30 phone-number unique
# tenant mapping; the legacy direct connector must keep working).
grep -Fq -- "->where('c.phone_number_id', \$numberId)" app/Services/WhatsApp/PmdWhatsAppGateway.php
grep -Fq -- "where('phone_number_id', \$phoneId)->exists()" "$COMMAND"

echo "PASS: R33 one-platform sender / context-isolated Inbox / opt-in / STOP contracts."
