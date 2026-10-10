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

# R32 keeps R31's central sending and safe-tenant contracts but removes
# the owner-facing onboarding/request and API technical setup entirely.
grep -Fq "pmd-wa-owner-r32" app/admin/views/pmdsettings/restaurant.blade.php
grep -Fq "pmd-wa-owner-r32__status" app/admin/views/pmdsettings/restaurant.blade.php
if grep -Fq "Request PayMyDine WhatsApp connection" app/admin/views/pmdsettings/restaurant.blade.php ||
   grep -Fq "Advanced technical setup" app/admin/views/pmdsettings/restaurant.blade.php ||
   grep -Fq 'name="communication[whatsapp_endpoint]"' app/admin/views/pmdsettings/restaurant.blade.php ||
   grep -Fq 'name="communication[whatsapp_token]"' app/admin/views/pmdsettings/restaurant.blade.php ||
   grep -Fq 'name="communication[whatsapp_provider]"' app/admin/views/pmdsettings/restaurant.blade.php ||
   grep -Fq "onRequestManagedWhatsApp" app/admin/controllers/Pmdsettings.php; then
  echo "ERROR: owner WhatsApp setup should contain no request, provider or Meta credentials."
  exit 1
fi
grep -Fq "'whatsapp_provider' => ['nullable', 'in:managed,meta_cloud,webhook']" app/admin/controllers/Pmdsettings.php
grep -Fq "pmd_whatsapp_connection_requests" app/Services/WhatsApp/PmdWhatsAppSchema.php
grep -Fq "'managed_enabled' => filter_var(env('PMD_WA_MANAGED_ENABLED', false)" config/pmd_whatsapp.php
grep -Fq "recordAcceptedReservationMessage" app/Services/WhatsApp/PmdManagedWhatsAppService.php
grep -Fq "transport(" app/Services/WhatsApp/PmdWhatsAppGateway.php
grep -Fq "sendTemplate(" app/Services/Reservations/PmdGuestCommunicationService.php
grep -Fq "pmd:whatsapp" app/Console/Commands/PmdWhatsAppCommand.php

echo "PASS: R31 owner onboarding, shared sending and tenant isolation source contracts."
