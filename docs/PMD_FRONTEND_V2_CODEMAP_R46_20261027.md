# PayMyDine Frontend V2 — source inventory and change map (2026-10-27)

## Scope and confidence

- Repository: `Amir3629/Paymydine-Update`; compared against branch `codex/floor-modal-neutral-v2-qr-guard-r17-20261026` and the R46 UI follow-up branch.
- **Actual active production PM2 process**: `paymydine-frontend-v2`, serving HTTP on `127.0.0.1:3002`, with the user's proven CWD:
  `/var/www/paymydine/frontend-v2/releases/PayMyDine-V2-batch-20260912_013537`.
- The user confirmed a completed `next build`, successful reload, and `/api/health` response with `qrGuardRelease: "r17f-disabled-table-active"`. This proves the compiled R17F release is live, **not** that every real QR/user/payment journey has passed end-to-end browser QA.
- GitHub recursive tree inventory (release snapshot): **35** tracked entries in `app/`, **80** in `src/`, **31** static files in `public/`, **15** in `scripts/`, **19** in `docs/`, **6** in `integration/`. Root config/manifest files are additional; there are historical `.next.*` snapshots and backup-looking source artifacts. We inspected the 115 files under `app/` + `src/` for content, imports, exports, routing, JS/CSS/UI ownership and key operational contracts, plus primary configuration/architecture/deployment/QA/integration scripts. Binary images were inventoried, not visually reviewed; historical build snapshots and every individual historical document are not audited as live code.
- This document describes source architecture and known risk boundaries; it does not claim an independent security audit or complete browser-level QA of all 10 themes.

## Browser-to-database path

```text
QR / tenant website
    |
    +-- Prepared QR: /api/v1/table-entry       (Laravel controller/route)
    |       \-- deleted, never-created, disabled: branded "This table is not active"
    |       \-- active: redirect into /table/{number} with QR identity
    |
    +-- Existing table QR: /table/{number}     (Next.js V2 App Router)
    |       \-- getPageContext (host, table number, qr, locale)
    |       \-- loadCustomerBootstrap -> Laravel /api/v1/table-info (cache:no-store)
    |       \-- normalizeTable (table_status/status/disabled, identity)
    |       \-- PmdGuestTableInactiveR17 or rendered customer Theme
    |
    +-- /, /menu, /kiosk                      (customer, legacy redirect, kiosk)
            \-- CustomerMenuRoute -> real table validation -> MenuRuntimeProvider
    |
    Next.js V2 :3002 -> src/server/proxy.ts and src/server/backend.ts
            -> PHP/Laravel /api/v1 endpoints -> tenant-local data
```

**QR guarantee:** The exact old QR's physical-table validity must be checked on each server entry; a frontend-only cached menu must not authorize access or ordering. On R17F the Next compiled guard is active by the demonstrated health marker. Further check a disabled, removed, prepared, and enabled QR in a fresh browser session. A future identical table-number reuse needs explicit QR identity policy before changing the table lifecycle.

## Where to modify each feature

| Purpose | Files / authority |
| --- | --- |
| Route composition, table gate, kiosk/tableless behavior | `app/page.tsx`, `app/CustomerMenuRoute.tsx`, `app/table/[tableId]/page.tsx`, `app/kiosk/page.tsx`, `src/runtime/components/PmdGuestTableInactiveR17.tsx` |
| Tenant host and query extraction | `src/server/page-context.ts`, `app/api/bootstrap/route.ts` |
| Backend origin, no-store reads, per-request proxy, tenant headers | `src/server/backend.ts`, `src/server/proxy.ts` |
| Restaurant/menu/payment/table bootstrap | `src/server/bootstrap.ts`, `src/server/normalize.ts`, `src/domain/model.ts` |
| Theme selection and server-side first paint | `src/themes/catalog.ts`, `src/themes/ThemeRenderer.tsx`, `src/themes/*/*.tsx`, `src/themes/*/*.module.css` |
| Base cart, overlays, order and language state | `src/runtime/MenuRuntimeContext.tsx`, `src/lib/client-api.ts`, `src/lib/i18n.ts`, `src/runtime/components/RuntimeOverlays.tsx` |
| **Actual V2 smart/R60T runtime aliases** | `tsconfig.json` maps `@/src/runtime/MenuRuntimeContext` to `src/runtime/SmartMenuRuntimeContext.tsx`; overlay alias maps `@/src/runtime/components/RuntimeOverlays` to `MenuGalleryRuntimeOverlaysV1.tsx`. This layers `OrderingRuntimeOverlaysR60T` over the original large `RuntimeOverlays.tsx`. Check aliases before editing seemingly canonical files. |
| Guest visit/session lease, pay-first flow | `src/lib/guest-order-flow-r60t.ts`, `src/runtime/SmartMenuRuntimeContext.tsx`, `src/runtime/components/OrderingRuntimeOverlaysR60T.tsx` |
| Item details/options/gallery | `src/runtime/components/FoodDetails.tsx`, `OptionConfiguratorRuntimeEnhancer.tsx`, `FoodGalleryRuntimeEnhancer.tsx` |
| Table status, number badge and service | `src/runtime/components/ThemeTableBadge.tsx`, `ServiceOverlaySimplifier.tsx`, `ThemeBottomToolBar.tsx` |
| Kiosk and POS-adjacent display | `src/kiosk/KioskTerminal.tsx` + CSS Module, `app/kiosk/page.tsx` |
| AI helper, menu content/translation | `src/runtime/components/GuestAiConcierge.tsx`, `src/server/menu-content-translations.ts`, `src/runtime/menu-option-content-i18n.ts`, `src/lib/i18n.ts` |
| Checkout and payment (high regression risk) | `src/lib/client-api.ts`, `RuntimeOverlays.tsx`, PayPal/Stripe/Square/SumUp/Worldline components, `app/payment/return/*`, `app/payment/worldline-embedded-return/page.tsx` |
| Tenants' UI settings and backend bridge | `integration/admin/frontend-theme-fields-v2.php`, `integration/laravel/pmd-frontend-v2-theme.php`, `/api/v1/frontend-theme-v2` |
| Build, health, deploy and regression contracts | `next.config.mjs`, `ecosystem.config.cjs`, `package.json`, `app/api/health/route.ts`, `scripts/*audit.mjs` and the R17 guarded VPS activation script |

## Theme roster

Ten self-contained components with their own CSS Modules:

1. `noir_editorial`
2. `verdant_modern`
3. `lumiere_fine_dining`
4. `kazen_japanese`
5. `azzurra_coastal`
6. `neon_cocktail_bar`
7. `art_deco_speakeasy`
8. `shahrazad_persian`
9. `anatolia_turkish`
10. `ember_steakhouse`

Theme identity is chosen and rendered server-side; common business logic should be changed in shared runtime rather than copied into ten themes. The selected theme's detailed visual changes belong in its own component and CSS module.

## Existing behavior and important distinctions

- Locales are defined in `src/lib/i18n.ts` (source supports English, German, Persian, Turkish, Japanese); right-to-left is handled in the root layout.
- Several provider implementations exist: PayPal, Square, Stripe, SumUp and Worldline. Full payment, split settlements, provider return verification and native wallet callbacks interact with backend contracts; changing a button in checkout must not bypass these services.
- A guest session/visit lease is distinct from a table number. The R60T / R61 flows depend on tenant + table + guest identity, and some clients store session keys in localStorage. Be careful when altering QR parameters, order ownership, checkout or kitchen submission.
- Multi-tenant host selection is implemented both in `page-context.ts` and `proxy.ts`. Production should rely on configured trusted infrastructure, not a user-supplied tenant override. Check real PM2 environment rather than reusing the example `ecosystem.config.cjs` blindly.
- `src/server/bootstrap.ts` uses `cache: 'no-store'` for the live table lookup and supports a backend theme fallback. Demo/mock behavior is disabled in the live environment per reported startup setup, but should be reverified if environment changes.
- The release has a separate customer QR frontend and a Laravel Owner Dashboard. Fixes for the Owner's **Remove Table** modal are in R45B live admin CSS/JS and do not belong inside the Next V2 project.

## Audit findings / checks before future work

1. **Documentation drift:** older `docs/ARCHITECTURE.md`, `RELEASE_NOTES.txt` and `README.md` describe the original shared draft / send-to-kitchen journey, but the live TypeScript alias `SmartMenuRuntimeContext.tsx` introduces R60T pay-first self-order semantics. Follow the imported/aliased code, not old prose.
2. **Large/high-coupling modules:** `RuntimeOverlays.tsx` (~2,000 lines), `client-api.ts` (~1,000 lines), `MenuRuntimeContext.tsx` (~900 lines), `OptionConfiguratorRuntimeEnhancer.tsx` (~875 lines) and Worldline bridge (~990 lines) are high-risk modification surfaces. Prefer scoped extensions and specific regressions over replacing them wholesale.
3. **Multiple physical/guest statuses:** `table_status` is the enabled/disabled authority. "Occupied"/"cleaning" operational states are a different concern and should not automatically deactivate QR access. Admin destructive-action safety is enforced in R45B Laravel code separately.
4. **QR lifecycle regression matrix:** prepared and never-created, disabled, removed, enabled, occupied-but-enabled; valid vs mismatched QR and number; direct `/table/{id}`, `/?qr=`, and `/menu?...`; public tenant and kiosk/tableless flows. Verify stale link behavior after a table-number reuse before any future table-life-cycle change.
5. **No broad production switch:** PM2 `paymydine-frontend-v2` runs at `:3002`, and the R17 deployment verified `qrGuardRelease: 'r17f-disabled-table-active'`. Its previous build and rollback paths are reported in the user's VPS deployment output. Retain that rollback while testing new UI features.
6. **Runtime QA remains distinct:** TypeScript build and source tests are proven successful for R17F, but ten-theme responsive visuals, guest payment provider returns, kitchen/settlement, and cross-device behavior were not exhaustively re-tested in the latest rollout. Treat those as necessary before a major upgrade.

## Future change workflow

1. Choose the exact page, theme and tenant behavior; identify whether the owner is Laravel Admin vs Next V2, and whether a runtime alias is involved.
2. Update only the source that truly renders the feature; preserve existing guest-ordering and payment authority.
3. Add a specific source+behavior regression for both valid and invalid data and kiosk/tableless cases.
4. Run TS/build and selected release audits in a staged release, not by overwriting production.
5. Activate only the verified PM2 V2 process, wait for two consecutive new-build health responses, keep rollback and test the real QR in a fresh browser.
