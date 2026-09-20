# Google Business Profile integration V3 — tenant-owned credentials

PayMyDine is multi-tenant. Each restaurant supplies and owns its own Google Cloud OAuth/API credentials from **Settings > Restaurant > Google / Maps**. Google credentials are not shared through the PayMyDine server environment.

## Tenant credential model

For every restaurant/location PayMyDine stores, inside that tenant database:

- Google OAuth Client ID — encrypted at rest
- Google OAuth Client Secret — encrypted at rest
- Google Places API key — encrypted at rest
- optional Cloud Pub/Sub topic
- optional Pub/Sub verification token — encrypted at rest
- OAuth access/refresh tokens — encrypted at rest

Secrets are never returned to the Restaurant Settings page after saving. The UI only shows that a secret is saved.

Changing the OAuth Client ID or Client Secret invalidates the existing PayMyDine Google connection and requires the restaurant to connect Google again. Disconnecting Google keeps the restaurant's saved API credentials; **Clear Google credentials** removes them.

## Per-tenant OAuth callback

Each restaurant has its own callback URL based on its tenant hostname:

```text
https://TENANT.paymydine.com/api/v1/integrations/google-business/callback
```

Example:

```text
https://mimoza.paymydine.com/api/v1/integrations/google-business/callback
```

The restaurant owner must register the exact URI shown in Restaurant Settings as an Authorized redirect URI on that restaurant's Google OAuth Web Client.

The requested OAuth scope is:

```text
https://www.googleapis.com/auth/business.manage
```

## Restaurant setup

For each restaurant:

1. Open **Settings > Restaurant > Google / Maps**.
2. Create/select that restaurant's Google Cloud project.
3. Enable the Google Business Profile APIs required by the account and the Places API (New).
4. Create an OAuth 2.0 **Web application** client.
5. Copy the exact **Authorized redirect URI** displayed by PayMyDine into the Google OAuth client.
6. Paste the restaurant's:
   - OAuth Client ID
   - OAuth Client Secret
   - Places API Key
   into PayMyDine Restaurant Settings.
7. Click **Save changes**.
8. Click **Connect Google Business**.
9. Sign in to the Google account that manages the restaurant Business Profile.
10. Choose the matching Google Business Profile location.

After connection PayMyDine synchronizes Google reviews, rating, Place ID and official Google review links.

## Reviews and replies

Internal PayMyDine checkout reviews remain in the existing `reviews` table.

Google reviews remain separate in:

- `pmd_google_business_connections`
- `pmd_external_reviews`

Owners can read synchronized Google reviews and publish/update/delete their Google business reply from **Restaurant > Customer Reviews**.

PayMyDine does not create a customer Google review on behalf of the customer. The guest flow opens Google's official `writeAReviewUri`; the customer completes the final Google submission.

## Optional real-time Pub/Sub

Each tenant may also configure its own Cloud Pub/Sub topic and verification token in Restaurant Settings.

Topic format:

```text
projects/PROJECT_ID/topics/TOPIC_NAME
```

Tenant push endpoint:

```text
https://TENANT.paymydine.com/api/v1/integrations/google-business/pubsub?token=YOUR_VERIFICATION_TOKEN
```

Grant Google's Business Profile publisher service account permission to publish to the tenant topic:

```text
mybusiness-api-pubsub@system.gserviceaccount.com
```

When configured, PayMyDine subscribes the connected Business Profile account to `NEW_REVIEW` and `UPDATED_REVIEW` notifications.

## Performance

Normal digital-menu, ordering and payment traffic does not call Google APIs.

Google network calls happen only for connection/location selection, explicit review/link synchronization, Pub/Sub review events, and owner reply actions.
