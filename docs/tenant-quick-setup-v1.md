# PayMyDine Tenant Quick Setup V1

## Product contract

Quick Setup is intentionally short. It does **not** configure Tax, Waiter Call, Valet, QR Ordering, Split Bill, Tips, Coupons, Service Charge, social settings or any other optional guest feature.

It handles only:

1. restaurant type -> recommended V2 theme;
2. Floors and guest Tables;
3. placeholder Team members with canonical PayMyDine roles;
4. KDS station names and their dynamic KDS roles;
5. EU-14 allergen reference records;
6. optional cuisine-specific Starter Menu.

## Welcome rules

- Public Frontend V2 shows a short setup welcome only when both Menu items and Categories are empty.
- Admin shows the onboarding welcome only on `/admin/dashboardlab`.
- Admin state is tenant/server-side via `pmd_onboarding_status`; browser localStorage is not an authority.
- `Not now` sets the status to `skipped`, so the automatic Admin welcome does not return.
- A skipped owner may still open `/admin/pmdquicksetup` manually while Menu/Category data remains empty.
- Completed setup never auto-runs again.

## Safety rules

- Quick Setup refuses automatic application after real Menu or Category content exists.
- Existing guest Tables are preserved and no new Tables are added if real guest Tables already exist.
- Existing Team members are counted by canonical role; Quick Setup creates only the missing number required to reach the requested target.
- Existing KDS stations are preserved and matched by name.
- No existing restaurant data is intentionally deleted.
- Starter Menu installation is optional.
- Starter nutrition, prices and allergens are suggestions and require restaurant review.
- Temporary staff passwords are generated randomly and returned to the Owner once in the completion response; they are not stored as onboarding plaintext settings.

## Restaurant types / theme mapping

- German -> Verdant Modern
- Turkish -> Anatolia Turkish
- Arabic / Middle Eastern -> Lumiere Fine Dining
- Persian -> Shahrazad Persian
- Italian -> Azzurra Coastal
- Spanish / Tapas -> Azzurra Coastal
- Japanese -> Kazen Japanese
- Chinese -> Verdant Modern
- Vietnamese -> Verdant Modern
- Mexican / Latin -> Verdant Modern
- Mediterranean / Seafood -> Azzurra Coastal
- Steakhouse / Grill -> Ember Steakhouse
- Cafe / Brunch -> Verdant Modern
- Fine Dining -> Lumiere Fine Dining
- Bar / Lounge -> Neon Cocktail Bar

Each V1 cuisine pack contains ten editable sample Food items with descriptions, suggested prices, prep time, nutrition suggestions, allergen mappings and selected bestseller/chef flags.

## Main files

- `app/admin/Services/PmdTenantQuickSetupService.php` - only setup write authority.
- `app/admin/Services/PmdStarterMenuLibraryV1.php` - version-controlled Starter Menu content.
- `app/admin/controllers/Pmdquicksetup.php` - Owner-only Admin route and handlers.
- `app/admin/views/pmdquicksetup/index.blade.php` - short setup form.
- `app/admin/assets/js/pmd-tenant-quick-setup-v1.js` - setup interaction only.
- `app/admin/assets/js/pmd-onboarding-welcome-v1.js` - Dashboard-only one-time probe/card.
- Frontend V2 `TenantSetupWelcome` - public empty-menu state.

## Required pre-merge QA

On a disposable brand-new tenant only:

1. Confirm `menus=0`, `categories=0`.
2. Open public Frontend: welcome card is shown and Admin button works.
3. Login as Owner and open DashboardLab: one welcome card is shown.
4. Click `Not now`, reload DashboardLab: card stays gone.
5. Open `/admin/pmdquicksetup` manually: setup remains available while Menu is empty.
6. Choose restaurant type, multiple Floors/Table counts, Team counts and KDS names.
7. Apply with Starter Menu enabled.
8. Verify selected V2 theme.
9. Verify Floor registry + table assignments across Dashboard/Manager/Cashier/Reservations.
10. Verify requested Team target counts and login of one temporary account after password rotation.
11. Verify KDS stations and dynamic KDS roles.
12. Verify exactly 14 enabled allergen reference rows (or existing matching rows reused).
13. Verify Starter Menu categories/items, nutrition/allergens, chef/bestseller flags.
14. Verify public Frontend no longer shows setup welcome and renders selected theme/Menu.
15. Verify Dashboard onboarding welcome does not return.
16. Verify existing guest-feature settings and Tax values are unchanged.

Also test a tenant with an existing Category or Food: Quick Setup must refuse automatic application and must not overwrite data.
