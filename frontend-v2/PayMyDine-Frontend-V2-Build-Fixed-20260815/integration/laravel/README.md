# Laravel Integration

Frontend V2 already works through the current public endpoints and does not require this directory to be deployed.

Before creating a canonical `/api/v2/customer/bootstrap`, first audit and consolidate the multiple live `/simple-theme` route definitions. Do not add an eighth responder.

The recommended future endpoint should return one public-safe payload containing restaurant identity, Theme ID/version, feature flags, locales, social links, table context, menu data, active order summary and enabled payment method metadata. Provider secrets must stay server-side.

Use `docs/BACKEND_CONTRACT.md` as the source contract. No executable Laravel patch is included intentionally because the live Laravel files are newer than GitHub and require a fresh live-route audit before modification.
