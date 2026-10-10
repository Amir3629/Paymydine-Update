# PayMyDine R32 — clean WhatsApp settings for restaurant owners

## Product decision

Restaurant owners should not need to configure Meta endpoints, access tokens,
WABA IDs, template names, technical provider modes, or manually request a
connection. PayMyDine owns the infrastructure and technical operations.

The R32 Restaurant Profile has one simple WhatsApp card:
- Actual status: Ready, Pending activation, or existing connection status
- Notification preference for booking confirmations, updates, cancellations
- Open WhatsApp Inbox for customer replies
- A collapsed test section only after a sender is ready and opted in

Unknown numbers never show as active; WhatsApp stays off until the business
sender is authorized, bound to the correct tenant/location and approved
templates and central Meta account configuration have been completed.

## Code changes

- Remove owner connection requests, provider chooser, advanced/Meta input fields.
- Preserve historical direct Meta/third-party integrations in the backend.
  An owner saving their restaurant profile must NOT clear the existing
  provider, endpoint, sender reference, token or template names.
- Maintain the historical R31 request table for backward compatibility;
  owners no longer insert requests into it.
- R30/R31 central opt-in credentials, WhatsApp Inbox and tenant-isolated
  messaging remain unchanged. No Kiosk/POS/Restaurant Groups modifications.

## One Bot is not automatic access to all restaurant numbers

One PayMyDine App and messaging backend can be set up once. Meta still needs
a lawful authorization before the PayMyDine business can send as another
business phone. PayMyDine can handle this onboarding invisibly from the
restaurant Settings page but cannot skip the underlying Meta consent.

Two possible sender models:

1. One platform Bot, a separate authorized WhatsApp number for every
   restaurant. R30/R31 support this model and ensure conversations remain
   tenant-specific. Official Embedded Signup/Tech Provider approval is a
   separate pending workflow.
2. One PayMyDine-owned shared phone number sending on behalf of every
   restaurant. This would avoid individual WhatsApp business numbers,
   but needs a different signed booking-reference routing and verified
   conversation handoff model. R30/R31 do NOT support mapping a shared
   phone number to multiple tenant IDs. Do not bypass that safety boundary.

## VPS deployment after reviewed main merge

Obtain the full SHA of reviewed R32 main. Use the existing guarded installer:

    cd /var/www/paymydine
    TARGET=FULL_REVIEWED_MAIN_SHA
    git -c gc.auto=0 fetch origin main
    test "$(git rev-parse origin/main)" = "$TARGET" || exit 1
    git show "$TARGET:scripts/pmd-r30-guarded-vps-sync.sh" > /tmp/pmd-r32-safe.sh
    bash -n /tmp/pmd-r32-safe.sh || exit 1
    bash /tmp/pmd-r32-safe.sh "$TARGET" --dry-run
    bash /tmp/pmd-r32-safe.sh "$TARGET" --apply

Type APPLY only after a clean dry-run. Any STOP/CONFLICT must be reviewed;
never reset, clean or overwrite unrelated Restaurant Groups/POS/Kiosk files.

After a successful code sync:

    bash scripts/pmd-r32-owner-whatsapp-ui-qa.sh
    php artisan pmd:whatsapp health
    sudo -u www-data php artisan view:clear
    sudo -u www-data php artisan config:clear

R32 does not require new database tables or Meta env changes. Do not
activate webhook or sender solely to make the UI show Ready.

## Production status reported by the user on 2026-10-10

- Registered WhatsApp numbers: 0
- Active channels: 0
- Stored events: 0
- Meta webhook: disabled
- Central managed sender: disabled/incomplete
- Connection request registry: installed

Thus the simplified owner UI MUST show pending activation, not pretend
WhatsApp is working. The remaining operational tasks: authorize real Meta
business assets, configure private credentials, real HTTPS webhook and
subscribe to events, verify approved templates/billing, and live tests.

This is a UI and safety release, not an autonomous AI bot. Source-only QA
does not prove live WhatsApp delivery.
