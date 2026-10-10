#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

VIEW=app/admin/views/pmdsettings/restaurant.blade.php
CSS=app/admin/assets/css/pmd-settings-restaurant-v1.css
CONTROLLER=app/admin/controllers/Pmdsettings.php
MANAGED=app/Services/WhatsApp/PmdManagedWhatsAppService.php
COMMS=app/Services/Reservations/PmdGuestCommunicationService.php

php -l "$CONTROLLER"
php -l "$MANAGED"
php -l "$COMMS"
bash -n scripts/pmd-r30-guarded-vps-sync.sh

# Compact design with a status that reflects actual readiness, never a
# misleading success before Meta activation and template configuration.
grep -Fq 'PMD_WA_OWNER_UI_R32' "$CSS"
grep -Fq 'pmd-wa-owner-r32__heading' "$CSS"
grep -Fq 'pmd-wa-owner-r32__footer' "$CSS"
grep -Fq '@media (max-width: 640px)' "$CSS"
grep -Fq "managed_templates_ready" "$COMMS"
grep -Fq "pmdWaConfigured" "$VIEW"
grep -Fq "pmdWaCanTest" "$VIEW"

# Normal restaurant Settings must not request signup or expose technical
# access tokens, endpoints, WABA identifiers, templates or provider controls.
if grep -Eq 'name="communication\[(whatsapp_provider|whatsapp_endpoint|whatsapp_token|whatsapp_sender_reference|whatsapp_template_[a-z_]+)\]"' "$VIEW"; then
    echo "ERROR: owner-visible Meta setup field regressed."
    exit 1
fi
if grep -Fq 'onRequestManagedWhatsApp' "$CONTROLLER" ||
   grep -Fq 'Request PayMyDine WhatsApp connection' "$VIEW" ||
   grep -Fq 'Advanced technical setup' "$VIEW" ||
   grep -Fq 'requestConnection(' "$MANAGED"; then
    echo "ERROR: owner onboarding request action is still exposed."
    exit 1
fi

# Critical: removing advanced fields must never wipe existing direct routes,
# tokens, sender reference or approved template names on profile save.
# Scope checks to the save handler (not the read-only settings helpers).
python3 - <<'PY'
from pathlib import Path

text = Path("app/admin/controllers/Pmdsettings.php").read_text()
save = text.split('public function onSaveRestaurantProfile()', 1)[1].split('public function onTestReservationEmail()', 1)[0]

for key in (
    "pmd_reservation_messages_whatsapp_provider",
    "pmd_reservation_messages_whatsapp_endpoint",
    "pmd_reservation_messages_whatsapp_sender_reference",
    "pmd_reservation_messages_whatsapp_template_created",
    "pmd_reservation_messages_whatsapp_template_updated",
    "pmd_reservation_messages_whatsapp_template_canceled",
):
    if f"'{key}' =>" in save:
        raise SystemExit(f"FAIL: save would overwrite legacy setting {key}")

if "'whatsapp_token' => 'pmd_reservation_messages_whatsapp_token'" in save:
    raise SystemExit("FAIL: restaurant can overwrite operator-managed Meta secret")

assert "array_key_exists('whatsapp_test_recipient', $communicationInput)" in save
assert "'pmd_reservation_messages_whatsapp_enabled' =>" in save
assert "'pmd_reservation_messages_email_enabled' =>" in save
assert "'pmd_reservation_messages_event_created' =>" in save
print("PASS: legacy Meta credentials are preserved; email/notification settings remain editable.")
PY

bash scripts/pmd-r31-managed-whatsapp-qa.sh
bash scripts/pmd-r28-guest-communications-qa.sh
echo "PASS: R32 simplified WhatsApp owner UI + R31/R28 contracts."
