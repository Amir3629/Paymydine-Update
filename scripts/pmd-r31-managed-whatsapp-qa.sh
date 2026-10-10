#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

for file in \
  app/Services/WhatsApp/PmdManagedWhatsAppService.php \
  app/Services/WhatsApp/PmdWhatsAppGateway.php \
  app/Services/WhatsApp/PmdWhatsAppSchema.php \
  app/Services/Reservations/PmdGuestCommunicationService.php \
  app/admin/controllers/Pmdsettings.php \
  app/Console/Commands/PmdWhatsAppCommand.php \
  config/pmd_whatsapp.php \
  scripts/pmd-r31-managed-whatsapp-contract.php
do
  php -l "$file"
done
php scripts/pmd-r31-managed-whatsapp-contract.php

# Owner no longer has to configure Graph endpoints or Meta tokens to use
# the platform-managed channel; legacy/direct access is still supported.
grep -Fq "value=\"managed\"" app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq "Request PayMyDine WhatsApp connection" app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq "Advanced technical setup" app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq "onRequestManagedWhatsApp" app/admin/controllers/Pmdsettings.php
grep -Fq "'whatsapp_provider' => ['nullable', 'in:managed,meta_cloud,webhook']" app/admin/controllers/Pmdsettings.php
grep -Fq "requestConnection" app/Services/WhatsApp/PmdManagedWhatsAppService.php
grep -Fq "pmd_whatsapp_connection_requests" app/Services/WhatsApp/PmdWhatsAppSchema.php
grep -Fq "'managed_enabled' => filter_var(env('PMD_WA_MANAGED_ENABLED', false)" config/pmd_whatsapp.php
grep -Fq "recordAcceptedReservationMessage" app/Services/WhatsApp/PmdManagedWhatsAppService.php
grep -Fq "transport(" app/Services/WhatsApp/PmdWhatsAppGateway.php
grep -Fq "sendTemplate(" app/Services/Reservations/PmdGuestCommunicationService.php
grep -Fq "pmd:whatsapp" app/Console/Commands/PmdWhatsAppCommand.php

echo "PASS: R31 owner onboarding, shared sending and tenant isolation source contracts."
