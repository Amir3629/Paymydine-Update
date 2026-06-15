# Codex Task: Native Theme Migration + Clean Frontend Structure

Goal:
Make all customer themes native inside one main frontend.

Main frontend:
`frontend/`

Reference sources:
`_codex_theme_sources/pmd-v0-botanical-exact`
`_codex_theme_sources/pmd-modern-green-standalone`

Final theme folders:
`frontend/components/themes/gold-luxury`
`frontend/components/themes/kazen-japanese`
`frontend/components/themes/modern-green`
`frontend/components/themes/organic-botanical-paper`
`frontend/components/themes/shared`

Hard rules:
- Do not use iframe for Modern Green or Organic.
- Do not use `/newfrontend`.
- Do not use `/dev/botanical-v0-exact`.
- Do not use postMessage/contentWindow bridge for rendering theme UI.
- Do not import standalone global CSS unless fully scoped.
- Modern CSS must be scoped under `.pmd-theme-modern-green`.
- Organic CSS must be scoped under `.pmd-theme-organic-botanical`.
- Theme-specific UI belongs inside its own theme folder.
- Shared files are only for contracts, hooks, data mapping, and behavior.
- Do not break Gold Luxury.
- Do not break Kazen Japanese.
- Do not change backend APIs.
- Do not change payment behavior.
- Do not edit Nginx.
- Do not delete PM2 processes.

Refactor targets:
- `frontend/features/customer-menu/CustomerMenuContent.tsx`
- `frontend/features/customer-menu/CustomerMenuPage.tsx`
- `frontend/features/customer-menu/checkout/PaymentModal.tsx`
- `frontend/app/layout.tsx`

Expected direction:
- `CustomerMenuPage.tsx` = small route shell.
- `CustomerMenuContent.tsx` = coordinator, not huge mixed UI/runtime.
- `PaymentModal.tsx` = host/coordinator, with shared checkout logic and theme-specific checkout UI isolated.

Verification:
`grep -RIn "newfrontend\\|botanical-v0-exact\\|<ModernGreenBridgeTheme\\|<OrganicExactV0Frame\\|contentWindow\\|PMD_MODERN_GREEN_BRIDGE_SEND\\|PMD_BOTANICAL_" frontend/features/customer-menu frontend/components/themes/modern-green frontend/components/themes/organic-botanical-paper | grep -v ".bak"`

Expected:
No active references.

Build:
`cd frontend && npm run build`

Manual test:
- Gold Luxury works.
- Kazen Japanese works.
- Modern Green works with `pmd-modern-green-preview` stopped.
- Organic Botanical works with `pmd-botanical-v0-exact` stopped.
