# Terminal Provider Matrix

| Provider | Admin provider record | Config fields | Test connection | Online payment flow | Terminal payment trigger | Webhook/status polling |
|---|---:|---:|---:|---:|---:|---:|
| Stripe | Yes | Yes | Account API test | Existing codebase support | Not implemented here | Existing online-payment hooks only |
| PayPal | Yes | Yes | OAuth token test | Existing codebase support | Not implemented here | Existing online-payment hooks only |
| SumUp | Yes | Yes | `/v0.1/me` identity test | Existing hosted checkout support | Existing POS/reader settings may exist, but no new fake success added | Provider-specific existing code only |
| Square | Yes | Yes | Locations API test | Admin-configurable; end-to-end flow depends on existing code | Skeleton only | Not implemented here |
| Worldline | Yes | Yes, now includes terminal ID/environment | Tenant diagnostics/config test | Existing hosted checkout diagnostics/services | Safe skeleton creates attempts only after config validation; no fake charge success | Needs certified terminal payment API docs/webhook mapping |
| VR Payment | Yes | Yes, now includes terminal endpoint/merchant/terminal ID | Diagnostics/config test | Existing diagnostics/service | Safe skeleton creates attempts only after config validation; no fake charge success | Needs VR Payment terminal API docs/webhook mapping |

## Missing items for real Worldline / VR Payment terminal completion

- Certified terminal payment request and response schema.
- Sandbox credentials for merchant/account and terminal device.
- API base URL for terminal endpoints.
- Merchant ID / account or space ID.
- Terminal ID(s).
- API key/client secret/certificate requirements.
- Webhook URL format, signing secret, and status transition contract.
- Provider references for cancellation/refund/retry behavior.

The implementation intentionally does not mark terminal payments as `paid` without a confirmed provider API response/webhook.
