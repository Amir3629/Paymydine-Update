# PayMyDine Admin i18n — Keyed EN/DE Migration

## Goal

PayMyDine-owned Admin UI should converge on one semantic-key catalogue instead of adding more post-render English-to-German DOM translators. The current supported PMD UI locales are intentionally limited to `en` and `de`.

## Phase 1 scope

Phase 1 is deliberately small and reviewable. It introduces the shared keyed translation foundation and migrates only the static standalone Waiter POS shell. It does **not** yet rewrite the many versioned Waiter Dashboard JavaScript authorities.

Canonical Phase 1 files:

- `app/admin/i18n/pmd_admin_catalog.php` — EN/DE values under stable semantic keys.
- `app/admin/classes/PmdAdminI18n.php` — server-side key lookup and centralized PMD locale resolution without mutating Laravel/TastyIgniter locale state.
- `app/admin/assets/js/pmd-admin-messages-v1.js` — direct browser key lookup/interpolation; no DOM scan and no `MutationObserver`.
- `app/admin/views/_partials/pmd_admin_messages.blade.php` — server-rendered active-locale message payload for JavaScript.

The migrated static surface is:

- `app/admin/views/waiter_pos.blade.php`
- `app/admin/views/waiter_pos_shell.blade.php`

The standalone POS no longer hard-codes `<html lang="en">`; its initial static labels come directly from semantic EN/DE keys.

## Locale ownership

`PmdAdminI18n` deliberately does not call `app()->setLocale()` and does not call `translator.localization->setLocale()`. TastyIgniter/Laravel remains the framework locale authority.

During migration, `currentLocale()` accepts the existing `pmd_admin_locale` cookie as a compatibility input and otherwise falls back to the application locale. This decision is centralized in one method so the cookie can be removed later after live verification confirms the staff/TastyIgniter locale is sufficient on every Admin route.

## What Phase 1 intentionally leaves untouched

The existing global DOM translator and page-specific reverse translator remain compatibility code for unmigrated pages. The numerous versioned waiter scripts also remain untouched in Phase 1 because several of them can overwrite visible labels after initial render.

Do not create another page-local dictionary or a V3/V4/V5 translation authority. The next migration should identify which versioned files actually own live DOM state and connect only those active owners to this catalogue.

## Required live audit before Phase 2

The Reservations2 handoff defines served/live behavior as higher authority than GitHub. Before migrating dynamic Waiter Dashboard strings or removing legacy translators, run:

`scripts/pmd-audit-live-admin-i18n-readonly.sh`

The script is read-only. It compares repository/live hashes, reports active language markers, inspects enabled EN/DE database state, and fingerprints the assets actually served by nginx. Return the complete output before producing a VPS deployment patch.

## Migration order after the audit

1. Identify actual live Waiter Dashboard/runtime authority and migrate only those active dynamic text owners.
2. Migrate Shared Admin controls and Side Menu language UI to the same semantic catalogue/locale authority.
3. Migrate Reservations2, Dashboard2 and DashboardLab; then retire `pmd-admin-i18n-page-authority-v2.js` when it has no remaining consumers.
4. Migrate remaining PMD-owned Admin pages and remove the global DOM translator only after coverage checks prove no route depends on it.
5. Remove the compatibility cookie input once native staff locale is verified as the sole Admin locale authority.

## Verification

Run `php scripts/pmd-audit-admin-i18n.php` against the repository root. It checks EN/DE coverage, placeholder parity, missing semantic keys, standalone POS locale boot, and required Phase 1 files.
