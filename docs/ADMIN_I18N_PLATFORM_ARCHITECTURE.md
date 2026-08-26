# PayMyDine Admin i18n — Platform Architecture

## Objective

Every piece of PayMyDine-owned Admin interface copy must be translated by a semantic key. Restaurant/customer content must remain data and must never be automatically translated by the platform i18n layer.

The current production locales are English (`en`) and German (`de`). The design must make a future locale such as French (`fr`) a data/content task, not another code migration.

## The ownership rule

**One concern has one owner.**

### 1. Native TastyIgniter copy

Keep native TastyIgniter strings on native `lang()` / language-file keys. Do not duplicate native framework messages into a second PayMyDine catalogue.

### 2. PayMyDine/custom platform copy

All custom PayMyDine UI copy moves to one catalogue directory:

```text
app/admin/i18n/platform/
  en.php
  de.php
  fr.php   # future example
```

Each locale file is a flat semantic-key map and every locale must expose the same key set.

Example:

```php
return [
    'shared.cancel' => 'Cancel',
    'orders.payment.record' => 'Record payment',
];
```

German uses the identical keys:

```php
return [
    'shared.cancel' => 'Abbrechen',
    'orders.payment.record' => 'Zahlung erfassen',
];
```

This is intentionally a directory rather than one giant multilingual file. A new language is created by copying the canonical English key file, translating only the values, enabling the locale in tenant language metadata, and running the validator.

### 3. Restaurant/customer content

The following are content, not platform copy, and are not candidates for automatic UI translation:

- menu/food/drink names
- menu/food/drink descriptions
- category names created by a restaurant
- restaurant/location names
- order/customer/staff notes and special instructions
- reviews and comments
- customer/staff names
- addresses, email addresses and phone numbers
- any other free text entered by a restaurant, staff member or customer

Labels around those values **are** platform copy and must be translated. Example: the label `Description` is translated; the restaurant's actual description value is not.

## Runtime contract

The final runtime has two thin consumers of the same catalogue:

- PHP/Blade: `PmdPlatformI18n::translate('semantic.key', [...])`
- JavaScript: `window.PMDPlatformMessages.t('semantic.key', {...})`

The browser payload is rendered from the same active-locale PHP catalogue. There is no second JavaScript dictionary and no English-to-German DOM replacement table.

Interpolation tokens (`:count` or `{count}`) must match across locales.

## Locale authority

TastyIgniter/Laravel staff + tenant localization remains the locale authority. The PMD catalogue reads the resolved locale; it does not independently mutate global locale state.

The tenant language metadata foundation must have one active canonical row per supported locale and tenant-specific settings cache isolation. The production EN/DE button foundation implemented before this consolidation remains the base for that behavior.

## Legacy retirement

These mechanisms are compatibility-only while unmigrated pages remain:

- `pmd-admin-i18n-v1.js` global DOM translator
- `pmd-admin-i18n-page-authority-v2.js`
- page-local translation dictionaries
- page-specific reverse/override translation scripts

No new entries should be added to them. Each migrated page must remove its dependency on those mechanisms. They are deleted only after coverage audits show zero consumers.

## Audit and migration workflow

1. Run `scripts/pmd-audit-platform-i18n-readonly.py` against the exact live checkout.
2. Treat live/served code as higher authority than GitHub when they differ.
3. Review high-confidence platform candidates first (buttons, placeholders, titles, dialogs, JSON messages).
4. Confirm dynamic-content exclusions rather than translating them.
5. Migrate one real owner/page family at a time to semantic keys.
6. Run catalogue parity + placeholder validation.
7. Run the read-only source audit again; candidate count must decrease.
8. Browser-check EN -> DE -> EN on the migrated page and verify dynamic restaurant/customer content is unchanged.
9. Retire legacy translation authorities only after their remaining-consumer count reaches zero.

## Suggested page-family order

1. Shared shell, Side Menu, common controls, authentication
2. Waiter POS / Waiter Dashboard / ManagerLab
3. Orders, payments, tables and KDS
4. Reservations and floor management
5. Menus/category administration (labels translated; restaurant menu data untouched)
6. Dashboard/analytics/reports
7. Devices/biometrics/cash drawer
8. Restaurant/settings/branding/advanced configuration
9. Super Admin and remaining custom pages

## Adding a future language

For a future `fr` locale:

1. Add/enable canonical `fr` tenant language metadata.
2. Copy `app/admin/i18n/platform/en.php` to `fr.php`.
3. Translate values only; do not rename semantic keys.
4. Run the catalogue validator. It must report zero missing/extra keys and zero placeholder mismatches.
5. Browser-check representative platform pages.

No Blade, controller or JavaScript source should need language-specific edits merely because `fr` was added.

## Definition of done

The Admin i18n migration is complete only when:

- all supported locale files have identical semantic keys;
- all PMD-owned visible UI copy is keyed or uses an existing native TastyIgniter key;
- dynamic restaurant/customer content is not altered by the translation layer;
- no active page-local dictionary remains;
- the global/page DOM translators have zero live consumers and can be removed;
- EN -> DE -> EN works across every Admin page family without 404/409/500 errors;
- the read-only audit has no unexplained high-confidence platform candidates.
