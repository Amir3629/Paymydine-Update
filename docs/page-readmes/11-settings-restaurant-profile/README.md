# Restaurant Profile — `/admin/settings/restaurant`

## Purpose

Restaurant Profile manages tenant/location customer-facing identity and operational profile while protecting branding from unrelated settings saves.

- Clean URL: `/admin/settings/restaurant`
- Action: `Pmdsettings::restaurant()`
- Controller: `app/admin/controllers/Pmdsettings.php`
- Permission: `Site.Settings`
- View: `app/admin/views/pmdsettings/restaurant.blade.php`

## Render lifecycle

1. Resolve active location.
2. Run `resolvedRestaurantIdentityR25(true)` to repair generic/template branding when appropriate.
3. Build `restaurantProfilePayload(locationId)`.
4. Build opening-hours payload.
5. Render profile under the active location.

## Identity authority and stale-cache protection

The code explicitly guards against generic/template `site_name` and stale `site_logo`. Direct tenant settings helpers are used where needed so unrelated settings/theme saves cannot re-persist old identity from an in-process cache.

Key helpers include `restaurantSettingValueR24`, `persistSettingsDirectR25`, `tenantIdentityHostR25`, default-name/logo resolution, generic/stale identity detection and `resolvedRestaurantIdentityR25`.

## Save actions

`onSaveRestaurantIdentityV2()` handles focused restaurant name/logo identity. `onSaveRestaurantProfile()` handles the broader profile/opening-hour contract. Logo helpers validate local file paths, safely store uploads, resolve preview URL and handle remove/replace behavior.

**Invariant:** saving Customer Menu Theme must not roll restaurant identity backward. The theme-save path deliberately avoids a broad stale settings write and re-resolves identity after its transaction.

## Location/public API relationship

Profile data is location-aware. Any field required by guests must be persisted under the same tenant/location authority read by `/api/v1/settings` and `/api/v1/restaurant`. A green Admin save banner is not enough—verify public endpoints for the same tenant.

## Regression matrix

- Generic template branding self-repairs only when truly generic/stale.
- Real custom branding is never replaced by defaults.
- Logo remove/replace is path-safe.
- Theme save cannot revert name/logo.
- Opening hours survive reload/locale changes.
- Public settings/restaurant endpoints reflect the saved profile for the same tenant/location.

---

Audited 2026-09-06 against `main` at `d6e443b88a0fd72a5727854b245d8f0678497447`.