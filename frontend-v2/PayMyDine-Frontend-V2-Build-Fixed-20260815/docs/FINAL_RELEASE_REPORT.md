# PayMyDine Frontend V2 — Release Report

Release: `1.0.0-staging.20260815`

## Included

- complete source tree for a separate Next.js customer frontend;
- exact package manifest and lockfile;
- ten isolated restaurant themes;
- server-side tenant/theme/bootstrap resolution;
- compatibility proxies for the current Laravel public routes and media paths;
- menu/category/item normalization;
- personal cart and item-option flow;
- multi-device shared table draft and submit-to-kitchen flow;
- order status and preparation-time display;
- waiter, note and valet actions;
- VAT, coupon and tip handling;
- full/equal/item/share settlement UI;
- cash settlement, PayPal SDK integration, hosted provider session and return verification adapters;
- five UI locales with Farsi RTL support;
- preview catalog and demo fixtures;
- PM2/Nginx staging examples;
- source, theme, structure, backend-contract and feature-coverage audits;
- deep investigation, architecture, backend contract, Admin configuration, deployment and QA documentation;
- all supplied design references, renamed and documented.

## Validation completed in the build workspace

- offline TypeScript audit;
- ten-theme isolation audit;
- source safety audit;
- release structure/lockfile audit;
- internal import-resolution audit;
- release-package privacy/generated-file audit;
- backend contract marker audit;
- feature coverage audit;
- JSON parsing of package, lockfile and Admin manifest;
- shell/config syntax checks applicable without dependencies;
- final archive integrity test.

## Validation that still requires VPS staging

The package registry was unavailable from the build sandbox and `npm ci` could not finish. Therefore this report does not claim that `next build` was run here. On the VPS staging directory, run:

```bash
npm ci
npm run release:audit
npm run build
npm run start:3002
```

The project must then pass real browser and backend QA with a valid safe table/QR. Payment-provider tests require the restaurant’s configured provider credentials and return URLs.

## Production safety status

This is a source-complete staging release. It intentionally does not alter production port 3001. Cutover is not approved merely by extracting the ZIP; it is approved only after the matrix in `QA_MATRIX.md` passes on port 3002.
