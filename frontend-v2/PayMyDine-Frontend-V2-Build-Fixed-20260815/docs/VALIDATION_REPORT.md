# Validation Report

Release: `1.0.0-staging.20260815`

## Static validation completed in the build workspace

```text
Offline TypeScript source audit: PASS
PMD V2 THEME ISOLATION AUDIT: PASS (10 isolated themes)
PMD V2 SOURCE SAFETY AUDIT: PASS
PMD V2 STRUCTURE AUDIT: PASS
PMD V2 IMPORT RESOLUTION AUDIT: PASS (50 source files)
PMD V2 RELEASE PACKAGE AUDIT: PASS
PMD V2 BACKEND CONTRACT AUDIT: PASS
PMD V2 FEATURE COVERAGE AUDIT: PASS
JSON manifest parsing: PASS
PM2 JavaScript syntax: PASS
```

The static audits verify:

- exactly ten theme directories;
- exactly one TSX entry and one CSS Module per theme;
- no theme imports another theme;
- no theme-specific selectors in `app/globals.css`;
- no iframe or `postMessage` theme bridge;
- no `MutationObserver`;
- no runtime `style.setProperty`;
- no `dangerouslySetInnerHTML`;
- no styling interval; the only interval is the shared order polling owner;
- TypeScript build errors are not ignored;
- required page, proxy, bootstrap, runtime, payment-return, PayPal, documentation and deployment files exist;
- package-lock root dependencies exactly match `package.json`;
- all internal relative and `@/` imports resolve to included source files;
- no `node_modules`, `.next`, `.git`, credential file, private key or real `.env` is included;
- public menu/table/service/order/payment endpoint contracts are represented by the adapters;
- every theme exposes restaurant identity, language, menu item, cart, checkout, service actions, shared runtime overlays and the PayMyDine footer;
- EN, DE, FA, TR and JA UI dictionaries exist, with RTL handling for Farsi;
- all TypeScript/TSX source parses and project imports resolve under the offline audit configuration.

## New source-size comparison

The current production audit reported 44 CSS files, approximately 1.48 MB of CSS and 14,564 `!important` declarations.

Frontend V2 contains:

```text
16 CSS files
92,563 CSS bytes
4 !important declarations, all inside the global prefers-reduced-motion accessibility rule
0 MutationObserver
0 runtime style.setProperty
0 iframe
0 postMessage theme bridge
```

## What was not executable in this sandbox

The npm registry did not complete dependency installation from this environment, so a real `npm ci`, Next.js production compilation, browser render and provider transaction were not run here. The source package contains an exact lockfile and strict build settings, but staging must execute:

```bash
npm ci
npm run release:audit
npm run build
npm run start:3002
```

A successful `next build` on the VPS is required before PM2 starts the staging process.

## Required live QA before cutover

- use a real safe table ID and QR; the returned audit used the literal placeholder `<SAFE_TEST_TABLE_ID>`;
- compare all ten previews at the viewport matrix in `QA_MATRIX.md`;
- test at least two phones on one table;
- confirm personal items, shared draft, submit-to-kitchen, second-order merge and continue-ordering behavior;
- test waiter call, table note and valet notifications in Admin;
- test VAT, coupon, tips and all split modes;
- validate every payment provider enabled for the tenant, including success, cancel, failure and return verification;
- verify partial/full payment state reaches all open devices;
- keep the production port `3001` unchanged until every critical row passes.

## 2026-08-15 real-build correction

The first real macOS validation of the earlier Full Release produced two important findings:

1. `npm run release:audit` incorrectly treated `.env.local` and `node_modules` as archive contamination even though both are expected after `cp .env.example .env.local` and `npm ci`. The build-fix release now ignores those working-copy artifacts while still excluding them from source packaging.
2. `next build` compiled successfully but Next.js generated route typing rejected `app/api/bootstrap/route.ts` because the handler returned `NextResponse` where the generated RouteHandlerConfig expected the Web `Response` contract. The build-fix release uses standard `Request` / `Response` handlers, matching the documented App Router route-handler contract.

The actual production build of this corrected ZIP must still be executed after `npm ci`; this report does not claim a build pass that was not observed.
