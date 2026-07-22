# PayMyDine Admin i18n source files

This directory contains the human-edited PayMyDine admin localization sources.

The complete architecture and operations manual is:

```text
docs/ADMIN_I18N_GUIDE.md
```

The English-mode timing fix is documented in:

```text
docs/ADMIN_I18N_ENGLISH_MODE_FIX.md
```

## Current production support

PMD Admin i18n V1 currently supports:

```text
English: en
German:  de
```

## Files in this directory

### `pmd_admin_de.php`

The central custom English-to-German catalogue for PayMyDine text that is written directly in Blade or JavaScript.

Example:

```php
return [
    'New Order' => 'Neue Bestellung',
    'Start Shift' => 'Schicht starten',
];
```

### `pmd_admin_locale_bootstrap.php`

The early server-locale authority.

It is loaded from `app/admin/routes.php` before admin controllers run, so English and German are selected before controllers or form widgets prepare translated labels.

It also owns the centralized language-switch endpoint:

```text
/admin/_pmd/language-switch-v4
```

Do not move the locale decision back into a late Blade-only script. The Blade partial remains a browser boot layer and fallback, not the first server locale authority.

## What belongs in `pmd_admin_de.php`

Add a phrase when all of the following are true:

- it is PayMyDine admin interface text;
- it is currently written directly in custom Blade or JavaScript;
- it does not already come correctly from TastyIgniter's normal language system;
- it is not customer, restaurant, menu, note, or other database content.

## Translation rules

1. Use the exact English visible text as the key.
2. Preserve placeholders exactly.
3. Do not add HTML blocks.
4. Do not translate customer or business data.
5. Avoid ambiguous one-word entries when context changes the meaning.
6. Keep comments/group headings so the file remains readable.
7. Run `php -l` before deployment.
8. Never edit the generated JavaScript catalogue directly.

Placeholder example:

```php
'Order :number' => 'Bestellung :number',
```

Do not change `:number` to another placeholder name.

## Generated file

The builder generates:

```text
app/admin/assets/js/pmd-admin-i18n-catalog-de.js
```

Do not edit or use this generated file as the source of truth.

## Build and deploy

From the update repository:

```bash
php -l app/admin/i18n/pmd_admin_de.php
php -l app/admin/i18n/pmd_admin_locale_bootstrap.php
chmod +x scripts/pmd-deploy-admin-i18n.sh
./scripts/pmd-deploy-admin-i18n.sh
```

## Safe VPS update without switching branches

```bash
cd /var/www/paymydine/frontend/Paymydine-Update

git fetch origin main

git show origin/main:scripts/pmd-update-admin-i18n-from-main.sh \
  > /tmp/pmd-update-admin-i18n-from-main.sh

chmod +x /tmp/pmd-update-admin-i18n-from-main.sh
/tmp/pmd-update-admin-i18n-from-main.sh
```

The safe updater imports only the language-system files and leaves Reservations, Floor, KDS, Waiter, and unrelated branch work untouched.

## Adding another language

Do not assume that creating `pmd_admin_fr.php` alone enables French.

V1 still contains German-specific builder, partial, runtime, catalogue-name, dynamic-pattern, deploy, and cache logic.

Before adding a third language, follow the V2 multi-language design in:

```text
docs/ADMIN_I18N_GUIDE.md
```

The recommended future design uses one language manifest, one generic runtime, and one generated catalogue per locale.
