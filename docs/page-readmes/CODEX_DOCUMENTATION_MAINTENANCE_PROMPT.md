# Codex Prompt — Re-audit and Maintain PayMyDine Page Documentation

Copy this into Codex after major PayMyDine changes:

```text
You are documenting the PayMyDine repository at Amir3629/Paymydine-Update.

Goal: update the page-by-page engineering documentation under docs/page-readmes without changing product behavior.

Rules:
1. Treat the current target branch as source of truth. Historical handoffs are context only.
2. Do not guess from route names. Trace visible clean URL -> internal controller/action -> base controller/traits -> services -> models/tables -> real write authority -> JS/CSS/views -> public APIs.
3. For each page document: product purpose/user role; visible URL/internal route; server permissions and role/capability checks; first-paint lifecycle; canonical data sources; all public handlers and delegated writers; validated inputs/mutations/transactions/idempotency/side effects; tenant/location/timezone behavior; frontend asset authority; loading/empty/error/degraded states; security/privacy/secrets boundaries; cross-page integrations/events; regression matrix; exact source-file map.
4. Preserve these architecture distinctions:
   - clean product URL can differ from historical internal controller name;
   - display/composer authority can differ from write authority;
   - payment METHOD != PROVIDER != TERMINAL != SURFACE;
   - browser redirect/webhook/provider status alone is never settlement truth;
   - shared Floor must not fork per page;
   - previous AI chat text is continuity, never restaurant factual authority.
5. Search for duplicate/retired implementations, but do not document retired behavior as current. Add legacy notes only where compatibility still matters.
6. Never print/commit API keys, webhook secrets, auth keys, passwords, tokens, customer PII or tenant secrets.
7. Verify Frontend V2 package version/dependencies/theme catalog/bootstrap owners/API contract/split-payment behavior/release-audit scripts from current files.
8. Re-check commits that landed while you were auditing. If main moved, compare from the original audit SHA to current HEAD and re-audit every materially changed requested surface before finishing.
9. Run cheap safe syntax/static checks for docs changes. Do not deploy, migrate, change live DB, rotate credentials or modify production.
10. Create a docs-only branch and PR. Do not push directly to main.
11. PR description must include audited commit SHA, pages changed, architecture changes discovered, stale statements removed and unresolved production/schema checks.

Pages that must each retain a README:
Owner Dashboard, PMD Intelligence, Manager, Accountant, Orders, Reservations, Shifts, Coupons & Gifts, Menu, Settings, Restaurant Profile, Customer Menu Theme, Devices, Payments & Finance, Customer Frontend V2.

Also update docs/page-readmes/README.md and SOURCE_AUDIT.md.

Documentation must be detailed enough that a new engineer can start only from a browser URL and trace a production problem to the correct authority without relying on old chat history.
```

## Why this is strict

PayMyDine intentionally preserves compatibility layers. A shallow “summarize controllers” pass can describe obsolete UI as current, move logic into the wrong controller, duplicate shared Floor/report calculations or collapse provider/method/terminal boundaries. Follow authority chains, not file-name intuition.
