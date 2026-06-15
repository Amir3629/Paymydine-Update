# Codex Task: Native Theme Migration from EXACT VPS frontend

Important:
This main branch now contains the exact live VPS frontend from `/var/www/paymydine/frontend`.

Do NOT assume `CustomerMenuPage.tsx` is only a small shell.
First detect the real active route chain:

`frontend/app/menu/page.tsx`
then inspect whether it renders:
`features/customer-menu/CustomerMenuPage.tsx`
or
`features/customer-menu/CustomerMenuContent.tsx`

Hard rule:
Patch the actual active render path, not an assumed file.

Goal:
Modern Green and Organic Botanical must become native themes inside the single main frontend.

Reference source folders:
`_codex_theme_sources/pmd-modern-green-standalone`
`_codex_theme_sources/pmd-v0-botanical-exact`

Final target folders:
`frontend/components/themes/modern-green`
`frontend/components/themes/organic-botanical-paper`

Do not use:
- iframe
- postMessage / contentWindow bridge
- `/newfrontend`
- `/dev/botanical-v0-exact`
- `PMD_MODERN_GREEN_BRIDGE_SEND`
- `PMD_BOTANICAL_*` for rendering theme UI

Before changing code:
1. Show the active menu route chain.
2. Show exactly where Modern Green is currently rendered.
3. Show exactly where Organic is currently rendered.
4. Show exact files to change.
5. Confirm which file is the real active runtime: CustomerMenuPage or CustomerMenuContent.

Implementation:
- Migrate Modern Green first.
- Build.
- Then migrate Organic.
- Build.
- Do not touch PM2 or Nginx.
- Do not delete preview processes.
- Do not break Gold Luxury or Kazen Japanese.

Verification:
Run:

`grep -RIn "newfrontend\\|botanical-v0-exact\\|<ModernGreenBridgeTheme\\|<OrganicExactV0Frame\\|contentWindow\\|PMD_MODERN_GREEN_BRIDGE_SEND\\|PMD_BOTANICAL_" frontend/features/customer-menu frontend/components/themes/modern-green frontend/components/themes/organic-botanical-paper | grep -v ".bak"`

Expected:
No active references.

Run:
`cd frontend && npm run build`

Manual VPS test later:
Modern Green must work after stopping `pmd-modern-green-preview`.
Organic must work after stopping `pmd-botanical-v0-exact`.
