# PayMyDine R30 — central Meta App and isolated WhatsApp Inbox

Status: code-only, opt-in foundation. R30 does NOT automatically enroll tenants,
publish Meta, modify production databases, or enable an autonomous bot.

## Architecture

- One Meta App and one signed webhook for all registered restaurants.
- One registered Meta phone-number ID per restaurant location. The CENTRAL
  pmd_whatsapp_channels table binds both phone_number_id AND waba_id to an
  explicitly provisioned, active tenant and location.
- POST signature: X-Hub-Signature-256 + Meta App Secret. The separate GET
  Verify Token is NOT the Graph API Access Token from the Meta Quickstart.
- CENTRAL mysql stores encrypted message content and WhatsApp recipient IDs.
  A keyed hash supports lookup. Raw webhook payloads are NOT retained.
- Owner Inbox: /admin/pmdwhatsappinbox on a tenant subdomain. Existing
  Site.Settings permission gates access; each read is tenant+location scoped.
- Manual replies only to existing incoming conversations while Meta's
  24-hour customer-service window is open.
- Booking-confirmation templates accepted by Meta can also be recorded in the
  central Inbox after the channel is explicitly enabled; later Meta delivery
  statuses update the matching accepted message receipt.
- Unknown or inactive phone mappings receive no storage/action.
  No message triggers autonomous replies or reservation modification.

## Prerequisites before deployment

1. First resolve the VPS dirty worktree: partial R29 and separate Restaurant
   Groups changes were reported. Do NOT use git reset --hard, git clean or
   blind git pull. Review/backup/reconcile against current GitHub main.
2. Configure a dedicated HTTPS host such as hooks.paymydine.com with DNS,
   TLS and Nginx/PHP routing to the Laravel backend. PayMyDine marketing
   frontend may not forward that path. Confirm reachability BEFORE Meta.
3. Rotate previously exposed temporary Meta tokens. Use properly authorized
   long-lived business/system-user credentials for production.
4. Get the Meta APP SECRET from the Meta App Settings (Basic); privately
   generate a separate random 32+ character Verify Token. Do not share either.
5. Set in the VPS private environment (do not commit it):

    PMD_WA_WEBHOOK_ENABLED=false
    PMD_WA_WEBHOOK_HOST=hooks.paymydine.com
    PMD_WA_VERIFY_TOKEN=<private-random-verify-token-32chars-or-more>
    PMD_WA_APP_SECRET=<private-meta-app-secret>

   The inbound endpoint is inactive until explicitly enabled. Clear config
   cache in a controlled maintenance window only when code is deployed.

## Operator-only provisioning (CENTRAL database only)

After a central DB backup and approved release, install explicitly:

    php artisan pmd:whatsapp health
    php artisan pmd:whatsapp install --confirm
    php artisan pmd:whatsapp health

For EACH restaurant/location use verified IDs (illustrative placeholders):

    php artisan pmd:whatsapp bind \
      --tenant-id=7 --location-id=1 \
      --phone-number-id=YOUR_NUMERIC_PHONE_NUMBER_ID \
      --waba-id=YOUR_NUMERIC_WABA_ID --confirm

Binding is INACTIVE by default and cannot steal a number already mapped
to another restaurant/location.

Each restaurant's own outbound Meta WhatsApp Cloud API settings in Restaurant
Profile must then have its matching HTTPS Graph /messages endpoint, a
proper long-lived access token, and approved utility templates for proactive
booking events. The global App Secret stays under PayMyDine control.

After verifying messages/replies and tenant scoping, activate explicitly:

    php artisan pmd:whatsapp activate \
      --tenant-id=7 --location-id=1 \
      --phone-number-id=YOUR_NUMERIC_PHONE_NUMBER_ID --confirm

To stop messages for a location, use action deactivate with the same scope
arguments plus --confirm. No restaurant can self-bind from this version.

## Meta dashboard fields

In Connect on WhatsApp > Step 2: Production setup > Configure Webhooks:

- Callback URL: https://hooks.paymydine.com/api/pmd/whatsapp/webhook
  (replace hostname with actual PMD_WA_WEBHOOK_HOST).
- Verify token: the private PMD_WA_VERIFY_TOKEN; NOT the Meta access token.
- Subscribe to messages events (incoming messages and delivery statuses).
- Enable PMD_WA_WEBHOOK_ENABLED only once TLS/routing/schema are confirmed.
- GET challenge should return only on the configured host with valid token.
- POST missing/invalid X-Hub-Signature-256 must be rejected.
- An unpublished Meta App does not receive general production notifications.
  Complete applicable Meta publishing, permissions, business verification
  and partner/Tech Provider steps for multi-business production operations.

## Staging/live verification (required before release)

1. Disabled flag, wrong hostname and wrong Verify Token all fail closed.
2. Missing/invalid POST signature returns 403 without writing data.
3. Unknown Phone Number ID or mismatched WABA ID creates no message.
4. Duplicate Meta message ID stores only one encrypted record.
5. Two tenants: only their correct owner/location sees each thread.
6. Manual reply inside 24 hours delivers; older threads cannot freeform reply.
7. Delivery statuses update only an existing matching outgoing Meta ID.
8. Existing Restaurant Groups, POS, Kiosk and booking flows stay unchanged.

## Privacy and operations

- Only staff with Site.Settings currently have Inbox access; implement
  dedicated messaging permissions before broad staff onboarding.
- APP_KEY is used for encryption; changing it requires a ciphertext
  migration. Back it up privately.
- For reviewed retention cleanup, execute:

    php artisan pmd:whatsapp purge --days=90 --confirm

  Schedule periodic cleanup only after retention-policy approval.
- A real autonomous AI bot, Meta Embedded Signup onboarding, media handling,
  proactive notifications and marketing automation are NOT included in R30.
  Those are separate reviewed releases with privacy and authorization rules.
- R30 CI checks syntax, HMAC behavior and source contracts, but does not
  simulate a real database or Meta delivery.

## Source QA

    bash scripts/pmd-r30-whatsapp-webhook-qa.sh
