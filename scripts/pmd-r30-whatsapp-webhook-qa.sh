#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

for file in \
    app/Http/Controllers/PmdWhatsAppWebhookController.php \
    app/Services/WhatsApp/PmdWhatsAppGateway.php \
    app/Services/Reservations/PmdGuestCommunicationService.php \
    app/Services/WhatsApp/PmdWhatsAppSchema.php \
    app/Console/Commands/PmdWhatsAppCommand.php \
    app/admin/controllers/Pmdwhatsappinbox.php \
    config/pmd_whatsapp.php \
    routes/pmd-whatsapp-webhook-v1.php \
    routes.php \
    app/system/ServiceProvider.php \
    scripts/pmd-r30-whatsapp-signature-qa.php
do
    php -l "$file"
done

bash -n scripts/pmd-r30-guarded-vps-sync.sh
php scripts/pmd-r30-whatsapp-signature-qa.php

# The VPS installer must fail closed on conflicts and preserve an archive.
grep -Fq 'git merge-base --is-ancestor' scripts/pmd-r30-guarded-vps-sync.sh
grep -Fq 'LOCAL CHANGES' scripts/pmd-r30-guarded-vps-sync.sh || grep -Fq 'CONFLICT: ' scripts/pmd-r30-guarded-vps-sync.sh
grep -Fq 'files-before.tar.gz' scripts/pmd-r30-guarded-vps-sync.sh
grep -Fq 'git read-tree' scripts/pmd-r30-guarded-vps-sync.sh
grep -Fq 'git update-ref' scripts/pmd-r30-guarded-vps-sync.sh
! grep -Eq 'git (reset|clean|stash|pull)' scripts/pmd-r30-guarded-vps-sync.sh


grep -Fq 'recordAcceptedReservationMessage' app/Services/Reservations/PmdGuestCommunicationService.php
grep -Fq 'recordAcceptedReservationMessage' app/Services/WhatsApp/PmdWhatsAppGateway.php

# The public Meta route is never covered by Admin auth or a tenant-origin
# browser session. It is explicitly opt-in, host locked and HMAC authenticated.
grep -Fq "require_once __DIR__.'/routes/pmd-whatsapp-webhook-v1.php'" routes.php
grep -Fq "config('pmd_whatsapp.enabled', false) === true" app/Http/Controllers/PmdWhatsAppWebhookController.php
grep -Fq '$request->isSecure()' app/Http/Controllers/PmdWhatsAppWebhookController.php
grep -Fq "validSignature" app/Http/Controllers/PmdWhatsAppWebhookController.php
grep -Fq "X-Hub-Signature-256" app/Http/Controllers/PmdWhatsAppWebhookController.php
grep -Fq "hash_equals(" app/Services/WhatsApp/PmdWhatsAppGateway.php
if grep -Fq -- '->withoutMiddleware' routes/pmd-whatsapp-webhook-v1.php; then
    echo "Unexpected blanket middleware removal"
    exit 1
fi

# Inbound storage never trusts a tenant ID in a callback body.
grep -Fq -- "->where('c.waba_id', \$wabaId)" app/Services/WhatsApp/PmdWhatsAppGateway.php || {
    echo "Missing WABA binding"; exit 1;
}
grep -Fq -- "->where('t.status', 'active')" app/Services/WhatsApp/PmdWhatsAppGateway.php || {
    echo "Missing active tenant scope"; exit 1;
}
grep -Fq "Crypt::encryptString" app/Services/WhatsApp/PmdWhatsAppGateway.php
grep -Fq "insertOrIgnore" app/Services/WhatsApp/PmdWhatsAppGateway.php
grep -Fq -- "where('tenant_id', \$tenantId)" app/Services/WhatsApp/PmdWhatsAppGateway.php || {
    echo "Missing tenant-scoped inbox reads"; exit 1;
}
grep -Fq -- "where('location_id', \$locationId)" app/Services/WhatsApp/PmdWhatsAppGateway.php || {
    echo "Missing location-scoped inbox reads"; exit 1;
}
grep -Fq -- "->where('direction', 'in')" app/Services/WhatsApp/PmdWhatsAppGateway.php || {
    echo "Missing inbound-only reply scope"; exit 1;
}
grep -Fq -- "where('direction', 'out')" app/Services/WhatsApp/PmdWhatsAppGateway.php
grep -Fq 'Site.Settings' app/admin/controllers/Pmdwhatsappinbox.php
grep -Fq "data-request=\"onReply\"" app/admin/views/pmdwhatsappinbox/index.blade.php
grep -Fq 'pmd:whatsapp' app/Console/Commands/PmdWhatsAppCommand.php

echo "PASS: R30 secure central WhatsApp ingress and tenant inbox contract."
