# PayMyDine Admin EN/DE i18n

This module replaces the old inline DOM dictionaries with one central,
versioned translation system.

## Source files

- `app/admin/i18n/pmd_admin_de.php`
  - Single source of truth for PayMyDine-specific hardcoded English UI text.
  - Add new custom English→German entries here.
- `scripts/pmd-build-admin-i18n.php`
  - Reads the enabled English and German TastyIgniter translation sets.
  - Pairs translations by namespace/group/key.
  - Validates placeholders.
  - Merges the custom PayMyDine catalogue as the final authority.
  - Generates an external JavaScript catalogue.
- `app/admin/assets/js/pmd-admin-i18n-v1.js`
  - Translates text nodes, button values, placeholders, titles and ARIA labels.
  - Handles dynamic AJAX/JavaScript content with a MutationObserver.
  - Includes patterns for order numbers, table numbers and count labels.
- `app/admin/views/_partials/pmd_admin_i18n.blade.php`
  - Reads the persistent `pmd_admin_locale` cookie.
  - Applies the locale to the current request.
  - Prevents the English first-paint flash when German is active.
  - Loads the generated catalogue and runtime globally.
- `scripts/pmd-deploy-admin-i18n.sh`
  - Idempotent production installer.
  - Backs up live files.
  - Removes V3/V4/V4.2/V5 experimental inline translators.
  - Installs one global partial in both admin layouts.
  - Builds and validates the complete catalogue.
  - Clears compiled views and translation caches.

## Production deployment

From the checked-out update repository:

```bash
cd /var/www/paymydine/frontend/Paymydine-Update
git pull
chmod +x scripts/pmd-deploy-admin-i18n.sh
./scripts/pmd-deploy-admin-i18n.sh
```

The live application defaults to `/var/www/paymydine`. Override it when needed:

```bash
PMD_LIVE_ROOT=/another/path ./scripts/pmd-deploy-admin-i18n.sh
```

## Adding a missing custom phrase

1. Edit `app/admin/i18n/pmd_admin_de.php`.
2. Add the exact English text as the key and German text as the value.
3. Run the deployment script again.
4. The catalogue is regenerated and cache-busted automatically through filemtime.

Do not add large dictionaries directly to Blade layouts. The generated external
catalogue avoids Blade/PHP parser failures and keeps page templates maintainable.

## Verification in the browser console

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

- `version`: `1.0.0`
- `locale`: `de`
- `entries`: normally more than 1,000 after the build
- `pending`: `false`
- `ready`: `true`
