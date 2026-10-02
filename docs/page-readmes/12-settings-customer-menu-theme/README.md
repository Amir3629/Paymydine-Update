# Customer Menu Theme — `/admin/settings/customer-menu`

## Purpose

This page configures customer-facing Frontend V2 theme and public feature flags. It is the Admin control plane; the Next.js frontend remains the renderer.

- Clean URL: `/admin/settings/customer-menu`
- Action: `Pmdsettings::frontend()`
- Save: `onSaveFrontendExperience()`
- View: `app/admin/views/pmdsettings/frontend.blade.php`
- Permission: `Site.Settings`

## Canonical theme catalog

Exactly ten V2 IDs are accepted: `noir_editorial`, `verdant_modern`, `lumiere_fine_dining`, `kazen_japanese`, `azzurra_coastal`, `neon_cocktail_bar`, `art_deco_speakeasy`, `shahrazad_persian`, `anatolia_turkish`, `ember_steakhouse`. Unknown IDs fail validation.

## Feature contract

Current settings cover selected theme, enabled languages, waiter call, valet, shared table ordering, split bill, tips, coupons, social links, service-charge enabled/type/value/label, optional website, featured social platform/link and Kazen layout (`tabs`/`accordion`). Languages are normalized/deduplicated and fall back to restaurant default/English.

## Persistence

Save runs transactionally and writes canonical settings plus frontend-theme payload. Several theme alias keys remain intentionally for migration compatibility. The path avoids broad stale settings-manager persistence because that previously risked overwriting `site_name/site_logo`; restaurant identity is re-resolved after save.

## Public bridge / first paint

Frontend V2 reads `GET /api/v1/frontend-theme-v2`, with temporary `/simple-theme` fallback during bridge staging. The response includes public theme/version/feature flags only—never provider/admin secrets.

Each theme owns its own TSX + CSS Module. Themes must not import each other, use iframe/postMessage bridges, mutate global CSS at runtime, or repaint from a default theme after hydration. Server selection is first-paint authority.

## Service charge

Canonical keys are `pmd_service_charge_*`. New eligible orders may receive a service-charge total through server order-total authority; changing the setting must not retroactively recalculate historical order totals.

## Regression matrix

- All 10 themes round-trip Admin -> public endpoint -> rendered frontend.
- Invalid theme/language/platform/layout fails validation.
- Feature flags survive reload and control customer actions.
- Theme save cannot overwrite restaurant branding.
- Service charge follows server authority and new-order scope.
- No theme flash/default repaint during hydration.

---

Audited 2026-09-06 against `main` at `d6e443b88a0fd72a5727854b245d8f0678497447`.