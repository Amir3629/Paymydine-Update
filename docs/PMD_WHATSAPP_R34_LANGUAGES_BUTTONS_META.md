# R34 — Localized booking confirmations and no-typing WhatsApp buttons

## Confirmed baseline

The user installed R33 at GitHub SHA 034d3fe9e879a47e05c03f528f6e1e6a0188e115.
Last VPS health: 0 shared senders, 0 registered numbers, 0 tenant
grants; webhook and managed sending disabled. R34 does not activate Meta.
Until valid Meta credentials and WABA registration, actual senders stay off.

## Implemented R34 code

- Adds original booking language to central R33 consent records. New public
  bookings store de/en/tr/ar exactly as chosen. Later reservation edits
  use stored WhatsApp consent language, not current admin/browser locale.
  No silent German-to-English fallback.
- Operator must assert which approved Meta language variants are live in
  private PMD_WA_SHARED_APPROVED_TEMPLATE_LOCALES. An empty list or
  unapproved language fails closed; the booking WhatsApp checkbox is
  hidden when that language is not ready. Meta controls actual approval.
- New staff-created bookings can confirm that the GUEST gave explicit
  WhatsApp permission. Staff UI checkbox starts unchecked on each
  Composer open. Choose guest language (default to restaurant setting,
  German for German restaurants). Full international +49... number
  required when opted in. Staff action queues WhatsApp ONLY after DB
  commit, never triggering unrelated email. Missing consent means no send.
- Opt-in shared Meta templates can include exactly two NATIVE quick reply
  buttons: index 0 = Manage booking; index 1 = New booking. Payloads
  PMD_MANAGE and PMD_NEW_BOOKING carry no tenant, customer or token data.
  The signed incoming reply must match one accepted outbound Meta ID,
  sender, hashed recipient and an active tenant/location grant.
- Matched button events create an idempotent central action job. An
  operator-controlled dispatcher sends a localized link to existing
  secure /book management or new booking page. Date/time/availability
  and no-show card guarantee stay on the existing website. No NLP/chat.
- Booking links are encrypted at rest, with host allowlist (tenant
  subdomains of paymydine.com, or operator-listed exact custom hosts).
- Additive migration: consent.locale, message.manage_url_ciphertext,
  central pmd_wa_shared_action_jobs table. Existing R33 channels preserved.

## Not implemented (requires real Meta and development)

- A calendar and real-time timeslot selections entirely INSIDE WhatsApp
  require a published WhatsApp Flow, configured data exchange endpoint,
  Meta encryption key and booking availability/guarantee integration.
  R34 native buttons send links opening the existing /book web UI.
- No AI/free-text assistant. Free text cannot operate a booking action.
- No actual real-number Meta send, template approval, or payment
  verification test has yet been performed.

## Meta WhatsApp Manager configuration

1. PayMyDine-owned WhatsApp Business Account, one real number verified
   by SMS/voice, registered for Cloud API and protected by a 6-digit PIN.
   Do not use the developer-provided test sender in production.
2. Approved PayMyDine display name, business contact/support website,
   and payment method. Complete Business Verification where required.
3. A Meta system-user access token with appropriate WhatsApp asset access
   and required permissions. Store privately on VPS, never paste tokens
   into chat or GitHub.
4. Signed HTTPS Meta webhook and subscription for message/status events.
5. Approved Utility templates for created, updated, canceled booking.
   Their six BODY parameters must match R33:
   restaurant name, reference, date, time, guest count, manage URL.
6. Approve language variants such as de_DE, en_GB, tr, ar. One name may
   have independently approved translations. Check Meta approval first.
7. If using Quick Reply buttons, every approved template and language
   must include precisely two QUICK REPLY buttons at index 0 and 1,
   translated labels for Manage Booking and New Booking. R34 supplies
   opaque action payloads. Do not enable buttons for mismatching templates.

## Private operator flags (disabled by default)

    PMD_WA_SHARED_ENABLED=false
    PMD_WA_SHARED_CONSENT_FORM=false
    PMD_WA_SHARED_APPROVED_TEMPLATE_LOCALES=
    PMD_WA_SHARED_QUICK_REPLIES=false
    PMD_WA_SHARED_BOOKING_HOSTS=

Only after confirming all approved locales may an operator set the
comma-separated list (e.g. de_DE,en_GB,tr,ar) and activate a pilot.
Other R33 managed webhook/sender secret/template env vars are also needed.

## Button dispatch (only after actual Meta pilot is ready)

    php artisan pmd:whatsapp shared-dispatch-buttons --confirm

Run from a verified, dedicated PHP worker or existing scheduler once per
minute. Avoid concurrent workers. Button actions may remain 'processing'
if a worker crashes; no automatic retry avoids duplicate Meta sends.
Check 'php artisan pmd:whatsapp health' and triage held jobs manually.

## VPS deployment (after reviewed R34 merge)

Get exact full merged SHA from GitHub main, not branch SHA. Back up and
verify restore of CENTRAL database BEFORE the additive install. The
existing R30 guarded sync protects unrelated dirty POS/Restaurant Groups
and Dashboard worktrees. Dry-run before apply. Stop on conflict.
After code sync and backed-up DB:

    bash scripts/pmd-r34-whatsapp-qa.sh
    php artisan pmd:whatsapp install --confirm
    php artisan pmd:whatsapp health
    sudo -u www-data php artisan view:clear
    sudo -u www-data php artisan config:clear

Leave all real Meta flags disabled until approval, billing, test and
verified tenant assignment. Run live tests with two pilot restaurants:
German /book must deliver German, English /book English, an English
edit to original German booking German, admin without opt-in NO send,
admin checked (with documented permission) localized send, and button
reply never leaks another restaurant. Do not bypass payment guarantee:
existing /book handles secure Stripe/provider verification.
