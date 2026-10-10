# R31 | PayMyDine-managed WhatsApp for restaurant owners

R31 replaces mandatory per-restaurant token/endpoint entry with an option
to request connection to the centrally operated PayMyDine Meta sender.
A single Meta App/backend serves multiple independently owned WhatsApp
Business numbers/WABAs, with separate tenant and location records.

**NOT LIVE until Meta, central env, approved per-WABA templates, and
validated phone mappings are ready. No universal AI bot enabled.**

## Owner setup

1. Visit https://TENANT.paymydine.com/admin/settings/restaurant
2. Choose **PayMyDine managed (recommended)** as WhatsApp connection mode.
3. Select **Request PayMyDine WhatsApp connection** to submit a request.
   This queues onboarding; it DOES NOT connect a number by itself.
4. PayMyDine must verify ownership and the restaurant must explicitly
   authorize its own WhatsApp Business assets via Meta.
5. PayMyDine support provisions the phone/WABA mapping and activates it
   after obtaining approved templates, secure system user access, and tests.
6. The owner can enable WhatsApp reservation messages and use
   /admin/pmdwhatsappinbox for replies within 24 hours.

Legacy direct Meta/Webhook credentials are still available under Advanced
technical settings. Existing direct integrations are not overwritten by
the new default for accounts without a configured provider.

## Why not one shared WhatsApp phone?

Recommended SaaS model: one PayMyDine messaging engine + central webhook,
but a distinct Meta WhatsApp number for each restaurant's customer-facing
identity. A single shared PayMyDine number would require explicit customer
consent and a separate conversation-to-restaurant routing experience; this
is not included in R31.

## Meta authorization and payments

- One Meta Developer App is enough, but does NOT grant permission to send
  from all restaurants. Each WABA must authorize PayMyDine's system user.
- Owner-friendly Meta Embedded Signup requires Meta's onboarding setup,
  appropriate App Review/Advanced Access and, depending on partner flow,
  Tech Provider authorization. R31 implements the safe request queue while
  awaiting these requirements. The request button is NOT Meta OAuth.
- Obtain per-WABA approved Utility templates for reservation created,
  updated, and canceled. Configuring a template *name* is not proof of
  approval; verify actual provider delivery.
- Meta bills many proactive messages per delivered message, by destination
  market and category. Free in-window service/qualifying utility replies
  and current prices are documented at
  https://business.whatsapp.com/products/platform-pricing
- There is no universally required extra "Bot subscription" charged by
  Meta simply for hosting your own software. Other BSPs/AI services may
  add subscriptions. Payment method or billing arrangement is needed for
  chargeable production messaging.

## After reviewed GitHub merge: VPS deployment

Use the exact full main commit SHA of the reviewed R31 release. The guarded
sync script allows an existing dirty VPS only when each changed file matches
either current HEAD or the desired target. Other dirty files are untouched.
It backs up every dirty/untracked file before copying reviewed paths. It
never resets/cleans unrelated Restaurant Groups, Kiosk, POS or tenant files.

    cd /var/www/paymydine
    git -c gc.auto=0 fetch origin main
    TARGET=FULL_REVIEWED_MAIN_SHA
    test "$(git rev-parse origin/main)" = "$TARGET" || exit 1
    git show "$TARGET:scripts/pmd-r30-guarded-vps-sync.sh" > /tmp/pmd-safe.sh
    bash -n /tmp/pmd-safe.sh || exit 1
    bash /tmp/pmd-safe.sh "$TARGET" --dry-run
    bash /tmp/pmd-safe.sh "$TARGET" --apply

STOP on any CONFLICT. Never force git pull/reset/clean. In the previously
shown VPS state, Git metadata for an old worktree is owned by root and
automatic Git gc printed permission warnings. The new guarded script fetch
disables automatic gc; do not recursively chown the whole application.

After source install, back up the central DB securely and update only the
opt-in WhatsApp schema:

    php artisan pmd:whatsapp health
    php artisan pmd:whatsapp install --confirm
    php artisan pmd:whatsapp requests

This preserves R30's installed WhatsApp channels and messages while adding
the connection request queue if absent.

## Private application .env configuration: NOT IN GITHUB

    PMD_WA_WEBHOOK_ENABLED=false
    PMD_WA_WEBHOOK_HOST=hooks.paymydine.com
    PMD_WA_VERIFY_TOKEN=PRIVATE_RANDOM_VERIFY_TOKEN
    PMD_WA_APP_SECRET=PRIVATE_META_APP_SECRET
    PMD_WA_MANAGED_ENABLED=false
    PMD_WA_SYSTEM_USER_TOKEN=PRIVATE_SYSTEM_USER_TOKEN
    PMD_WA_GRAPH_VERSION=v25.0
    PMD_WA_TEMPLATE_LANGUAGE=en_US
    PMD_WA_TEMPLATE_CREATED=reservation_created
    PMD_WA_TEMPLATE_UPDATED=reservation_updated
    PMD_WA_TEMPLATE_CANCELED=reservation_canceled

The example hooks domain is NOT a real deployed endpoint until DNS, Nginx,
HTTPS and Laravel routing have been configured. Keep flags FALSE until
Meta account review, valid recipient WABA permissions and HTTP signature
tests succeed. Rotate the previously exposed temporary Graph API token.
Never send App Secret, Verify Token, System User Token or private keys in chat.

After approval and real configuration, activate the flags only in a
controlled maintenance window, then clear Laravel config cache. The central
system user must be authorized by EACH sending WABA, not merely one App.

## Operator-led pilot and rollback

List owner requests:
    php artisan pmd:whatsapp requests

After verifying ownership and real numeric IDs (example placeholders):
    php artisan pmd:whatsapp bind --tenant-id=TENANT_ID \
      --location-id=LOCATION_ID --phone-number-id=META_PHONE_ID \
      --waba-id=META_WABA_ID --confirm

Binding is INACTIVE until checked. After Meta callbacks, utility templates
and tenant isolation pass:
    php artisan pmd:whatsapp activate --tenant-id=TENANT_ID \
      --location-id=LOCATION_ID --phone-number-id=META_PHONE_ID --confirm

Emergency disabling:
    php artisan pmd:whatsapp deactivate --tenant-id=TENANT_ID \
      --location-id=LOCATION_ID --phone-number-id=META_PHONE_ID --confirm

## QA & remaining capabilities

R31 implements private central sender, opt-in owner request status, direct
legacy mode compatibility, and tenant-scoped reply path. Human operators
reply from the existing R30 Inbox. It does not autonomously interpret or
modify reservations, nor does it complete official Embedded Signup/OAuth.
Those capabilities require further implementation and Meta App review.

QA checklist before activation:
- Owner request adds one central row without sending or activating numbers
- Two restaurants cannot read each other's requests/inbox/conversations
- Disabled managed flag/token/template => sends fail closed
- No WABA or unapproved template => provider must reject; no Ready claim
- Signed Meta inbound payload stored idempotently; wrong WABA ignored
- Human reply succeeds only within 24-hour window
- Live Kiosk, POS, Groups, /book and email remain unchanged

Run: bash scripts/pmd-r31-managed-whatsapp-qa.sh
