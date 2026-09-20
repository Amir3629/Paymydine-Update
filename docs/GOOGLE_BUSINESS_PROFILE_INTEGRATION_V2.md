# Google Business Profile integration V2

This integration connects each PayMyDine restaurant to the restaurant owner's Google Business Profile using OAuth 2.0.

## What it does

- Owner connects Google from **Settings > Restaurant > Google / Maps**.
- PayMyDine lists the Google Business Profile locations the authorized Google account can manage.
- Owner selects the matching Google location.
- PayMyDine stores OAuth tokens encrypted with the application key.
- Google reviews are synchronized into **Restaurant > Customer Reviews**.
- Owners can publish, update and delete their public Google review replies from PayMyDine.
- The selected Business Profile Place ID is used with Places API (New) to obtain Google's official Google Maps place URL, `writeAReviewUri`, and reviews URL.
- The guest post-review Google button prefers Google's `writeAReviewUri`; existing manual Google Maps URL remains a fallback.
- New/updated Google reviews can trigger synchronization via Google Business Profile Notifications + Cloud Pub/Sub.

PayMyDine does **not** create a Google customer review on the customer's behalf. Google's supported Business Profile Reviews API supports reading reviews and managing the business owner's reply, not creating a customer review. The final customer submission therefore happens on Google's own `writeAReviewUri`.

## Google Cloud prerequisites

Use one PayMyDine Google Cloud project.

1. Obtain/confirm Google Business Profile API access for the project.
2. Enable the APIs used by this integration:
   - Google My Business API
   - My Business Account Management API
   - My Business Business Information API
   - My Business Notifications API
   - Places API (New)
   - Cloud Pub/Sub API
3. Create an OAuth 2.0 Web application client.
4. Configure **one exact callback URL** that routes to this Laravel application, for example:

   `https://YOUR-INTEGRATION-HOST/integrations/google-business/callback`

   Do not use a wildcard redirect URI. `PMD_GOOGLE_BUSINESS_REDIRECT_URI` must exactly match the URI registered in Google Cloud.
5. Create a server-side Places API key. Restrict it to Places API (New) and, where practical, to the PayMyDine server IP.

The OAuth scope requested by PayMyDine is:

`https://www.googleapis.com/auth/business.manage`

## Laravel environment

Add these to `/var/www/paymydine/.env`:

```dotenv
PMD_GOOGLE_BUSINESS_CLIENT_ID=
PMD_GOOGLE_BUSINESS_CLIENT_SECRET=
PMD_GOOGLE_BUSINESS_REDIRECT_URI=https://YOUR-INTEGRATION-HOST/integrations/google-business/callback
PMD_GOOGLE_PLACES_API_KEY=

# Optional but recommended for real-time Google review synchronization:
PMD_GOOGLE_BUSINESS_PUBSUB_TOPIC=projects/YOUR_PROJECT/topics/paymydine-google-business
PMD_GOOGLE_BUSINESS_PUBSUB_TOKEN=GENERATE_A_LONG_RANDOM_SECRET
```

After editing `.env`:

```bash
cd /var/www/paymydine
php artisan optimize:clear
```

Never commit the real OAuth client secret, Places API key, or Pub/Sub token.

## Cloud Pub/Sub

Create a topic, for example:

`projects/YOUR_PROJECT/topics/paymydine-google-business`

Grant **Pub/Sub Publisher** on that topic to Google's Business Profile publisher identity:

`mybusiness-api-pubsub@system.gserviceaccount.com`

Create a push subscription pointing to:

`https://YOUR-INTEGRATION-HOST/integrations/google-business/pubsub?token=YOUR_LONG_RANDOM_SECRET`

Set the same topic in `PMD_GOOGLE_BUSINESS_PUBSUB_TOPIC` and the same random secret in `PMD_GOOGLE_BUSINESS_PUBSUB_TOKEN`.

When a restaurant chooses its Google location, PayMyDine configures that Google Business account for `NEW_REVIEW` and `UPDATED_REVIEW` notifications. Notifications cause a tenant-scoped idempotent review sync; the digital menu does not poll Google.

## Restaurant setup

For each restaurant:

1. Open **Settings > Restaurant**.
2. In **Website & social links**, find **Google / Maps**.
3. Under **Google Business Profile**, choose **Connect Google Business**.
4. Sign in with a Google account that manages the restaurant's Business Profile.
5. Choose the matching Business Profile location.
6. PayMyDine synchronizes reviews and generates the direct Google review link.
7. Open **Restaurant > Customer Reviews** to view Google reviews and reply.

The existing manual Google Maps URL remains available as a fallback and is not deleted by this integration.

## Database separation

Internal PayMyDine checkout reviews remain in the existing `reviews` table and keep their moderation/order rules.

Google data is stored separately:

- `pmd_google_business_connections`
- `pmd_external_reviews`

A small central routing table, `pmd_google_business_tenant_map`, is created in the platform database when a tenant connects Google. It contains only tenant/location routing identifiers; OAuth secrets remain encrypted inside the tenant database.

## Performance

There are no Google API calls in the normal digital-menu bootstrap beyond the settings request that already existed. Google API calls occur on:

- Google connect/location selection
- manual Admin sync
- Pub/Sub review notification
- owner reply/delete reply
- explicit Google-link refresh

This prevents Google integration latency from slowing normal menu/order/payment traffic.
