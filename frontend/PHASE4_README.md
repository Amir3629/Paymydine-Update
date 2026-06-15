# PayMyDine Phase 4 - Clean Theme Contract

This package targets the real active frontend structure under `/var/www/paymydine/frontend`, not the unused `/src` experiment from earlier phases.

What it does:

1. Adds a real customer theme engine folder:
   - `features/customer-menu/theme-engine/themeKeys.ts`
   - `features/customer-menu/theme-engine/customerMenuThemeRegistry.ts`

2. Centralizes theme key handling for:
   - `organic_botanical_paper`
   - `modern_green`
   - `kazen_japanese`
   - `gold-luxury` / `gold_luxury`

3. Replaces duplicated bottom dock action arrays with one shared dock implementation:
   - `components/themes/shared/createBottomDockActions.ts`
   - `components/themes/shared/SharedBottomDock.tsx`
   - `components/themes/shared/SharedBottomDock.module.css`

4. Keeps each theme wrapper file, but makes it visual-only:
   - `KazenBottomDock.tsx`
   - `ModernGreenBottomDock.tsx`
   - `OrganicBottomDock.tsx`
   - `GoldBottomDock.tsx`

5. Removes the old Organic dock postMessage/window event bridge from the dock itself. Actions now use the same direct prop contract as the other themes.

Important:
This is a safe architecture step. It does not rewrite the giant `CustomerMenuPage.tsx` yet. That rewrite should be a separate Phase 5 because it is the highest-risk file.
