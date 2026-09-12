# Settings Center — `/admin/settings`

## Purpose

Settings is the owner-facing information architecture for restaurant configuration. It is a navigation/summary center over specialized authorities rather than one giant form.

- Clean URL: `/admin/settings`
- Internal: `/admin/pmdsettings`
- Controller: `app/admin/controllers/Pmdsettings.php`
- Permission: `Site.Settings`
- View: `app/admin/views/pmdsettings/index.blade.php`
- Menu context: Settings/System

## First paint

`index()` resolves current location ID, opening-hours summary, settings groups/cards and page health state. The Team/member card is intentionally excluded because **Shifts owns Team**; do not re-add a parallel staff editor under Settings.

## Specialized child surfaces

- Restaurant profile -> `/admin/settings/restaurant`
- Customer menu/theme -> `/admin/settings/customer-menu`
- Devices & hardware -> `/admin/settings/devices`
- Payments & finance -> `/admin/settings/finance`

Other cards can bridge to existing framework/system authorities, but the product IA should keep clean user-facing routes.

## Localization

Settings titles/headings use `PmdPlatformI18n::fromEnglish(...)`. PayMyDine Admin multilingual support has canonical platform catalogues, locale normalization, RTL/first-paint handling and JS message injection. Do not add a language only in Blade or accept first-paint English flash as normal.

## Location/opening-hours invariant

`currentLocationId()` and opening-hours helpers are shared with Restaurant Profile. The landing summary and child page must not silently read different locations.

## Security / regression

`Site.Settings` is base entry permission; child actions keep their own validation. Provider secrets/device tokens never belong in landing-page summaries. Team authority stays in Shifts. Cards should navigate to clean product URLs, location/opening-hours summaries must match child pages, and supported locale/RTL rendering must be stable at first paint.

---

Audited 2026-09-06 against `main` at `d6e443b88a0fd72a5727854b245d8f0678497447`.