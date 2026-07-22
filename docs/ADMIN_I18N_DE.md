# PayMyDine Admin EN/DE i18n — Quick Guide

The complete architecture, history, maintenance, deployment, rollback, troubleshooting, and future-language manual is:

```text
docs/ADMIN_I18N_GUIDE.md
```

The translation source-directory rules are also documented in:

```text
app/admin/i18n/README.md
```

## Current architecture

PMD Admin i18n V1 combines:

1. normal English/German TastyIgniter translations;
2. custom PayMyDine English-to-German entries from `app/admin/i18n/pmd_admin_de.php`;
3. a generated external JavaScript catalogue;
4. one shared DOM/AJAX runtime for every admin page, including the side menu;
5. a no-flash boot partial that applies the locale before the first visible paint.

The original problem was not an API problem. Many custom PayMyDine labels were hardcoded directly in Blade and JavaScript, so the standard TastyIgniter language system did not know about them.

## Important files

```text
app/admin/i18n/pmd_admin_de.php
scripts/pmd-build-admin-i18n.php
app/admin/assets/js/pmd-admin-i18n-v1.js
app/admin/views/_partials/pmd_admin_i18n.blade.php
scripts/pmd-deploy-admin-i18n.sh
scripts/pmd-update-admin-i18n-from-main.sh
```

Generated file — do not edit manually:

```text
app/admin/assets/js/pmd-admin-i18n-catalog-de.js
```

## Add or correct one German phrase

Edit:

```text
app/admin/i18n/pmd_admin_de.php
```

Example:

```php
'Start Shift' => 'Schicht starten',
```

Then deploy:

```bash
php -l app/admin/i18n/pmd_admin_de.php
chmod +x scripts/pmd-deploy-admin-i18n.sh
./scripts/pmd-deploy-admin-i18n.sh
```

## Safe VPS update without switching the current branch

```bash
cd /var/www/paymydine/frontend/Paymydine-Update

git fetch origin main

git show origin/main:scripts/pmd-update-admin-i18n-from-main.sh \
  > /tmp/pmd-update-admin-i18n-from-main.sh

chmod +x /tmp/pmd-update-admin-i18n-from-main.sh
/tmp/pmd-update-admin-i18n-from-main.sh
```

This imports only language-system files and then runs the normal production installer. It does not switch branches or select Reservations, Floor, KDS, Waiter, or unrelated files.

## Browser check

```javascript
console.table({
  version: window.PMDAdminI18n?.version,
  locale: window.PMDAdminI18n?.locale(),
  entries: window.PMDAdminI18n?.entries(),
  pending: document.documentElement.classList.contains('pmd-i18n-pending'),
  ready: document.documentElement.classList.contains('pmd-i18n-ready')
});
```

Expected for German:

```text
version: 1.0.0
locale: de
entries: normally more than 1000
pending: false
ready: true
```

## Adding another language

V1 is currently English/German-specific. Creating only `pmd_admin_fr.php` is not enough.

Before adding a third language, follow the V2 multi-language plan in `docs/ADMIN_I18N_GUIDE.md`. The builder, partial, runtime, dynamic patterns, catalogue selection, deployment loop, and cache clearing must first become locale-generic.
