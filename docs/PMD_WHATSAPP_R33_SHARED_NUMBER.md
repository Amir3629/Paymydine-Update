# R33 — One PayMyDine WhatsApp number for ALL restaurants

## Product choice

PayMyDine operates ONE WhatsApp Business sender it owns. Restaurants never
register/transfer a phone number, disclose Meta tokens or navigate developer
settings. This is a different architecture from the R30/R31 legacy model,
where each phone number is exclusively mapped to one restaurant. DO NOT
put the shared Meta phone ID into pmd_whatsapp_channels.

Code is delivered **disabled by default**. The user's last VPS R32 health
reported 0 registered/active WhatsApp numbers, no webhook, and no managed
system-user credentials. No live Meta delivery is claimed by a successful
CI test or by installing the schema.

## Security invariants

- Separate central database tables:
  - pmd_wa_shared_senders: platform-owned Meta phone_number_id/WABA
  - pmd_wa_shared_locations: explicit operator-managed tenant/location grants
  - pmd_wa_shared_consents: per-reservation, exact-recipient explicit opt-in
  - pmd_wa_shared_optouts: platform-wide STOP registry (hashed phone)
  - pmd_wa_shared_messages: encrypted, tenant-scoped outgoing/incoming
  - pmd_wa_shared_unrouted: encrypted central quarantine (never tenant-visible)
- Each outgoing reservation template is sent only when:
  - Private flags, HTTPS webhook, Meta credential and verified PayMyDine
    shared sender are enabled.
  - Exactly one active shared sender grant exists for this tenant/location.
  - Restaurant has enabled WhatsApp booking notifications.
  - All configured enabled-event template names are present; actual
    templates must also be approved by Meta for PayMyDine's WABA.
  - This reservation has a separate, recorded opt-in for the EXACT customer
    number. General restaurant terms are NOT WhatsApp opt-in.
- After Meta accepts a template, record its external message ID tied to
  tenant, location, reservation, PayMyDine sender and hashed recipient.
- Incoming Meta webhook MUST be signed with the official App Secret.
  Routing requires a native WhatsApp **reply-to context.id**, exactly
  matching a recent (max 30 days) accepted outbound ID for that SAME
  sender and SAME recipient, an active restaurant subscription, and its
  active operator grant.
- Free text without native reply-to context, forwarded messages, arbitrary
  booking reference text, phone-only guesses, old context, or ambiguous
  matches are NEVER assigned to any tenant. They are encrypted and held
  centrally, not shown in restaurant Inbox.
- STOP and UNSUBSCRIBE revoke **all** historical shared sender consents for
  that customer. Opt-out markers persist across message retention purge.
  A NEW explicit opt-in with a NEW reservation may reauthorize.
- The R30 legacy dedicated sender remains intact and cannot be used as the
  shared sender. The shared sender never uses a customer-supplied token/URL.
- Operators can see aggregate held-message counts in WhatsApp health.
  There is NOT YET a customer-facing chatbot handling unmatched free text.

## What works and what is intentionally not implemented

Works in R33 code: shared Meta number registry, explicit tenant grants,
guest opt-in field (translated into en/de/tr/ar), opt-in persistence,
central outbound template receipts, validated reply-to routing, dedicated
per-restaurant Inbox with human replies inside the 24-hour window, status
receipts, deduplication, global opt-out and retention.

Not yet implemented:
- Generic freeform "hello" conversation / restaurant selection menu,
  automated intent assistant, authenticated bot reservation modification,
  centralized support staff triage UI for unassigned messages, or AI
  chatbot. Plain text without reply-to context is intentionally held.
- Official PayMyDine-owned production Meta number registration, business
  verification, template approval, payment/billing, DNS/HTTPS webhook and
  private system-user credentials. These require operator action in Meta.
- End-to-end live Meta/tenant DB/browser tests; CI is syntax/source/pure
  policy tests.

## Guest consent

Once PayMyDine enables BOTH shared flags AND the selected location is
technically ready and the owner opted in, the booking page shows an
**optional, unchecked** WhatsApp confirmation checkbox clearly identifying
PayMyDine as sender. Saving a successful public booking stores consent
in central DB AFTER reservation commit and BEFORE post-response message
dispatch. Existing bookings without explicit recorded consent cannot
be messaged from the shared sender. Changing the booking phone invalidates
old consent via hashed-phone matching.

The consent checkbox has no effect on reservation availability, tables,
payment guarantee or the required booking terms, and remains hidden while
the platform is disabled.

## VPS rollout after reviewed/merged GitHub PR

1. Back up central MySQL data (especially consent/Inbox data) using the
   existing, verified DBA backup process and secure private storage.
2. Use the full R33 main merge SHA with the existing guarded VPS installer.
   It checks GitHub source hashes, backs up local worktree changes and never
   overwrites unrelated POS/Kiosk/Restaurant Groups patches:

       cd /var/www/paymydine || exit 1
       TARGET=FULL_REVIEWED_MAIN_COMMIT_SHA
       git -c gc.auto=0 fetch origin main
       test "$(git rev-parse origin/main)" = "$TARGET" || exit 1
       git show "$TARGET:scripts/pmd-r30-guarded-vps-sync.sh" > /tmp/pmd-r33-safe.sh
       bash -n /tmp/pmd-r33-safe.sh || exit 1
       bash /tmp/pmd-r33-safe.sh "$TARGET" --dry-run
       bash /tmp/pmd-r33-safe.sh "$TARGET" --apply

   Type APPLY only after a PASS. Stop on any STOP/CONFLICT; never run
   reset --hard, clean or force-pull on this dirty production working tree.

3. Run code-only CI and read health:

       bash scripts/pmd-r33-shared-whatsapp-qa.sh
       php artisan pmd:whatsapp health

4. With your CENTRAL DB backup verified, install new central tables:

       php artisan pmd:whatsapp install --confirm
       php artisan pmd:whatsapp health

   The schema installer is additive/idempotent. All new sender rows start
   disabled. It does not rewrite historical R30 data.

5. Clear cache with the web user after code update:

       sudo -u www-data php artisan view:clear
       sudo -u www-data php artisan config:clear

Do not deploy changes to .env, restart services or expose a real webhook
until Meta credentials and sender ownership are verified.

## Private production Meta env

These are NAMES, NOT sample credentials to copy into production:

    PMD_WA_SHARED_ENABLED=false
    PMD_WA_SHARED_CONSENT_FORM=false
    PMD_WA_WEBHOOK_ENABLED=false
    PMD_WA_WEBHOOK_HOST=YOUR_REAL_HTTPS_CALLBACK_HOST
    PMD_WA_VERIFY_TOKEN=PRIVATE_RANDOM_TOKEN_32_PLUS
    PMD_WA_APP_SECRET=PRIVATE_META_APP_SECRET
    PMD_WA_MANAGED_ENABLED=false
    PMD_WA_SYSTEM_USER_TOKEN=PRIVATE_PERMANENT_AUTHORIZED_SYSTEM_USER_TOKEN
    PMD_WA_GRAPH_VERSION=v25.0
    PMD_WA_TEMPLATE_LANGUAGE=en_US
    PMD_WA_TEMPLATE_CREATED=APPROVED_SHARED_WABA_TEMPLATE
    PMD_WA_TEMPLATE_UPDATED=APPROVED_SHARED_WABA_TEMPLATE
    PMD_WA_TEMPLATE_CANCELED=APPROVED_SHARED_WABA_TEMPLATE

Be certain Graph API version is currently supported by Meta when activating.
All existing temporary access tokens previously pasted into chat should be
invalidated/rotated and never copied into GitHub/terminal transcript.
Only PayMyDine's own Meta business phone and system user are required;
restaurant owners do not enroll their business numbers.

## Operator controls (after official Meta registration)

Use numeric IDs issued by Meta, not the human WhatsApp phone number. Only
when you personally verify PayMyDine ownership of the WABA and number:

    php artisan pmd:whatsapp shared-register \
      --phone-number-id=OWN_META_PHONE_ID \
      --waba-id=OWN_META_WABA_ID --confirm

The registered sender is inactive.

Before activation, finish HTTPS callback, HMAC verification, approved
templates, non-temporary token, Meta account billing, webhook subscription,
and payment arrangements. Then explicitly set private flags, clear config,
and enable the one PayMyDine number:

    php artisan pmd:whatsapp shared-activate-number \
      --phone-number-id=OWN_META_PHONE_ID --confirm

Allow a specific active tenant location (not its WhatsApp phone):

    php artisan pmd:whatsapp shared-bind-location \
      --phone-number-id=OWN_META_PHONE_ID \
      --tenant-id=TENANT_ID --location-id=LOCATION_ID --confirm

Binding does NOT activate the restaurant. After testing consent and tenant
isolation, explicitly enable only that location:

    php artisan pmd:whatsapp shared-activate-location \
      --phone-number-id=OWN_META_PHONE_ID \
      --tenant-id=TENANT_ID --location-id=LOCATION_ID --confirm

To roll back:

    php artisan pmd:whatsapp shared-deactivate-location \
      --phone-number-id=OWN_META_PHONE_ID \
      --tenant-id=TENANT_ID --location-id=LOCATION_ID --confirm

    php artisan pmd:whatsapp shared-deactivate-number \
      --phone-number-id=OWN_META_PHONE_ID --confirm

A sender deactivation immediately blocks shared outbound and new inbound
routing. Historical encrypted message data remains for retention.

## Testing before production

1. With flags false, no booking form opt-in, outbound, sender or Inbox data
   changes should occur after code-only deployment.
2. Prepare TWO pilot tenant locations and ONE recipient WhatsApp number.
3. Book restaurant A WITHOUT checking WhatsApp: NO message.
4. Book restaurant A WITH WhatsApp checked: approved template accepted;
   save Meta outbound ID plus tenant A, location, booking ID, phone hash.
5. Reply DIRECTLY to that WhatsApp template using the native WhatsApp Reply
   gesture. Webhook context.id must map only to A; A Inbox alone sees it.
6. Book tenant B for the same customer and repeat; direct reply to B's
   template routes only to B.
7. Send plain text "hello" without quoting: central quarantine increments;
   neither A nor B Inbox receives it.
8. Try a tampered webhook signature, wrong recipient, wrong Meta sender,
   canceled grants and stale reply-to ID: all fail closed.
9. Reply with STOP: all shared consents are revoked. New templates and manual
   replies are rejected unless a NEW explicit booking opt-in occurs.
10. Check delivery/read callback, Meta 24-hour customer-service window,
    anti-duplication on webhook retries and receipt retention.
11. Regression smoke test email, reservation changes/cancellation, booking
    page, Kiosk, POS and Restaurant Groups.

The current version routes VERIFIED replies only. For a WhatsApp Bot that
can handle arbitrary incoming text and restaurant selection, implement a
separate privacy-preserving interactive selection flow with customer proof
and explicit session binding. NEVER use "last tenant with this phone".
