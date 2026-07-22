# PayMyDine Admin i18n source files

This directory contains the human-edited custom admin translation catalogues.

The complete architecture and operations manual is:

```text
docs/ADMIN_I18N_GUIDE.md
```

## Current production support

PMD Admin i18n V1 currently supports:

```text
English: en
German:  de
```

The current custom German source is:

```text
pmd_admin_de.php
```

It contains English visible UI text as array keys and German text as values.

Example:

```php
return [
    'New Order' => 'Neue Bestellung',
    'Start Shift' => 'Schicht starten',
];
```

## What belongs here

Add a phrase here when all of the following are true:

- it is PayMyDine admin interface text;
- it is currently written directly in custom Blade or JavaScript;
- it does not already come correctly from TastyIgniter's normal language system;
- it is not customer, restaurant, menu, note, or other database content.

## Rules

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

## Adding another language

Do not assume that creating `pmd_admin_fr.php` alone enables French.

V1 still contains German-specific builder, partial, runtime, catalogue-name, dynamic-pattern, deploy, and cache logic.

Before adding a third language, follow the V2 multi-language design in:

```text
docs/ADMIN_I18N_GUIDE.md
```

The recommended future design uses one language manifest, one generic runtime, and one generated catalogue per locale.
