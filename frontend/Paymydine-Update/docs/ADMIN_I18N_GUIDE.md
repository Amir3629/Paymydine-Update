# PayMyDine Admin Language System

## Complete architecture, maintenance, deployment, and future-language guide

This document is the main technical reference for the PayMyDine admin translation system.
It explains:

- what the original problem was;
- why it was not an API problem;
- which architecture we selected;
- how English and German currently work;
- which files are source files and which files are generated;
- how to add or correct a German phrase;
- how to deploy safely without changing the current Git branch;
- how to test, troubleshoot, and roll back;
- what must be changed before adding French, Spanish, Arabic, or another language.

The current production implementation is called **PMD Admin i18n V1**.

---

## 1. Junior-friendly explanation

Think of the admin interface as a house containing text from two different sources:

1. **TastyIgniter text**
   - Text already managed by TastyIgniter language files and its translation database.
   - Example: standard settings, validation messages, and core admin labels.

2. **PayMyDine custom text**
   - Text added directly in custom Blade templates or JavaScript.
   - Example: custom dashboards, waiter screens, reservation tools, buttons, cards, popups, and side-menu labels.

The TastyIgniter language system could translate the first group, but it could not automatically translate the second group because many custom strings were written directly as English text.

Example of old hardcoded text:

```javascript
button.textContent = 'New Order';
```

The normal Laravel/TastyIgniter translator does not know that this text needs a German version because no translation key is used.

Therefore, the problem was **not an API failure**. It was a localization architecture gap caused by custom hardcoded UI text.

---

## 2. Was this a bug?

It is best described as **technical debt and an internationalization weakness**, not a failure of the whole platform.

The custom pages worked correctly in English, but they were not written from the beginning with complete multi-language support.

The ideal implementation for new code is:

```php
lang('pmd::lang.orders.new')
```

or a shared JavaScript translation function using a stable translation key.

However, rewriting every existing dashboard, modal, AJAX response, and JavaScript component at the same time would be risky. It could break working production pages such as Reservations, Waiter, KDS, Orders, and custom dashboards.

For that reason, we selected a safe compatibility architecture:

- preserve the working pages;
- keep the normal TastyIgniter translation system;
- collect PayMyDine-specific English text in one central custom catalogue;
- build one external browser catalogue;
- run one shared translator across the complete admin interface;
- gradually improve new and old code over time.

---

## 3. What existed before V1

Several experimental versions were used while diagnosing the problem:

- server locale bridge V4.1;
- global custom DOM translator V4;
- safe no-flash layer V4.2;
- V5 inline catalogue experiment;
- a separate side-menu translator.

The V4 approach proved that runtime translation worked, but a very large translation dictionary was embedded directly in a Blade layout.

That caused important maintenance and safety problems:

- the Blade layout became very large;
- the same dictionary was carried by every admin page;
- escaping became difficult;
- a generated value containing escaped characters caused a Blade/PHP parse error;
- the application could return HTTP 500;
- the side menu and page content had separate translation logic;
- future maintenance would require editing large layout files;
- English content could briefly appear before German translation completed.

V1 removes those inline dictionaries and uses external versioned files.

---

## 4. Architecture selected for V1

The production architecture contains five layers.

### Layer 1: Locale selection

The selected admin locale is stored in the cookie:

```text
pmd_admin_locale
```

The boot partial reads this cookie and applies it to the current Laravel/TastyIgniter request.

Current supported values:

```text
en
de
```

Any unknown value falls back to English.

### Layer 2: TastyIgniter core translations

The builder reads the English and German translation sets from TastyIgniter for these namespace/group pairs:

```text
admin::lang
main::lang
system::lang
system::validation
```

It matches English and German values by the same translation key.

Example concept:

```text
English key admin::lang.button_save = Save
German  key admin::lang.button_save = Speichern
```

The browser catalogue receives:

```text
Save -> Speichern
```

### Layer 3: PayMyDine custom catalogue

Custom hardcoded English text is stored in:

```text
app/admin/i18n/pmd_admin_de.php
```

Example:

```php
return [
    'New Order' => 'Neue Bestellung',
    'Start Shift' => 'Schicht starten',
];
```

These custom entries are applied after the TastyIgniter entries, so the PayMyDine custom value wins if the same English source text already exists in the core catalogue.

### Layer 4: Generated browser catalogue

The builder combines the core and custom translations and generates:

```text
app/admin/assets/js/pmd-admin-i18n-catalog-de.js
```

This is a **generated file**.

Do not edit it manually. Any manual edit will be lost the next time the builder or deploy script runs.

### Layer 5: Shared browser runtime

The runtime is:

```text
app/admin/assets/js/pmd-admin-i18n-v1.js
```

It translates visible UI content across the admin interface, including:

- text nodes;
- buttons;
- submit/reset input values;
- placeholders;
- titles;
- ARIA labels;
- Bootstrap tooltip labels;
- content inserted later by AJAX;
- content inserted later by JavaScript;
- side-menu labels;
- modal and popup text;
- common dynamic patterns such as order numbers and table numbers.

A `MutationObserver` watches the DOM, so newly inserted content is also translated.

---

## 5. Complete request flow

When an admin page opens, the following happens:

1. The admin layout includes:

   ```blade
   @include('admin::_partials.pmd_admin_i18n')
   ```

2. The partial reads `pmd_admin_locale`.
3. The partial sets the application locale for the current request.
4. If the locale is German, the page is temporarily hidden before first paint.
5. The browser loads the generated German catalogue.
6. The browser loads the shared translation runtime.
7. The runtime translates the initial page.
8. The page is revealed after the first translation pass.
9. The runtime continues watching AJAX and JavaScript changes.
10. A safety timeout reveals the page even if a JavaScript problem prevents normal completion.

This avoids the visible English-to-German flash while preventing the page from remaining permanently hidden.

---

## 6. Source-of-truth files

### `app/admin/i18n/pmd_admin_de.php`

Purpose:

- central source for PayMyDine-specific English-to-German text;
- human-edited file;
- custom overrides have final priority.

Edit this file when a custom English phrase is missing or the German wording should be corrected.

### `scripts/pmd-build-admin-i18n.php`

Purpose:

- boots the live Laravel/TastyIgniter application;
- reads English and German core translations;
- flattens nested translation arrays;
- pairs values by namespace/group/key;
- validates placeholders;
- skips invalid or conflicting core rows;
- merges the custom catalogue;
- writes the generated JavaScript catalogue;
- writes a detailed JSON build report.

### `app/admin/assets/js/pmd-admin-i18n-v1.js`

Purpose:

- browser-side translation engine;
- normalizes spaces and apostrophes;
- translates text and supported attributes;
- translates dynamic DOM content;
- exposes debugging functions through `window.PMDAdminI18n`.

### `app/admin/views/_partials/pmd_admin_i18n.blade.php`

Purpose:

- locale boot layer;
- locale allowlist;
- server locale bridge;
- no-flash protection;
- cache-busted loading of catalogue and runtime.

### `scripts/pmd-deploy-admin-i18n.sh`

Purpose:

- production installer;
- validates required files;
- backs up live files;
- copies clean i18n source files to the live application;
- removes old V3/V4/V4.2/V5 translators;
- installs exactly one global include in each admin layout;
- removes the separate legacy side-menu translator;
- builds and validates the catalogue;
- clears Laravel/TastyIgniter caches;
- creates deployment and build reports.

### `scripts/pmd-update-admin-i18n-from-main.sh`

Purpose:

- safely fetches only the language-system files from `origin/main`;
- does not switch the current Git branch;
- does not replace Reservations, Floor, KDS, Waiter, or unrelated files;
- backs up existing repository copies;
- validates the imported files;
- runs the production installer.

### Generated file

```text
app/admin/assets/js/pmd-admin-i18n-catalog-de.js
```

Never edit this file directly.

---

## 7. Why the side menu no longer has a separate translator

The side menu previously had its own translation script.

That created two systems:

```text
side menu translator
page translator
```

Two systems can disagree, load in the wrong order, duplicate work, or require the same translation in two places.

V1 removes the legacy sidebar translator. The side menu is normal DOM content and is translated by the same global runtime used by every other admin component.

The rule is now:

```text
one admin interface -> one runtime translator -> one central catalogue
```

---

## 8. Adding or correcting a German phrase

### Step 1: Find the exact English source text

Use the exact visible text produced by the page.

Example:

```text
Start Shift
```

Do not guess a similar string such as `Start shift` if the page actually uses `Start Shift`.

### Step 2: Edit the custom catalogue

File:

```text
app/admin/i18n/pmd_admin_de.php
```

Add:

```php
'Start Shift' => 'Schicht starten',
```

### Step 3: Validate PHP

```bash
php -l app/admin/i18n/pmd_admin_de.php
```

### Step 4: Deploy

```bash
chmod +x scripts/pmd-deploy-admin-i18n.sh
./scripts/pmd-deploy-admin-i18n.sh
```

### Step 5: Hard refresh and test

macOS:

```text
Command + Shift + R
```

Windows/Linux browser:

```text
Ctrl + Shift + R
```

### Step 6: Verify dynamic content

Open any popup, AJAX-loaded table, drawer, or newly created order that contains the phrase. Initial static content alone is not enough for a complete test.

---

## 9. Translation-entry rules

### Use exact English keys

Correct:

```php
'New Order' => 'Neue Bestellung',
```

Incorrect:

```php
'new_order' => 'Neue Bestellung',
```

The current runtime translates visible English source text, not abstract custom keys.

### Preserve placeholders exactly

Correct:

```php
'Order :number' => 'Bestellung :number',
```

Incorrect:

```php
'Order :number' => 'Bestellung :nummer',
```

The builder rejects placeholder mismatches because they can break runtime values.

Placeholders that are checked include forms such as:

```text
:name
{count}
%s
%d
%1$s
```

### Do not translate user data

Do not add restaurant names, customer names, email addresses, notes, menu-item names, or other business/user content to the UI catalogue.

The catalogue is for interface language, not database content.

### Avoid very ambiguous entries

A generic English word such as `Open` can mean:

- open a modal;
- an open order;
- a restaurant is open;
- an open balance.

When one English phrase needs different German meanings in different contexts, the DOM compatibility catalogue cannot always choose correctly. The better long-term fix is to replace that hardcoded text with a real translation key in the component.

### Keep HTML out of entries

Prefer plain visible text.

Do not use complete HTML blocks as keys or values.

### Use `data-pmd-no-translate` when needed

Add this attribute to an element that must never be processed by the DOM translator:

```html
<div data-pmd-no-translate>Exact technical content</div>
```

Code blocks, scripts, styles, textareas, preformatted content, and editable content are already skipped.

---

## 10. Rules for new PayMyDine development

The runtime translator is a compatibility layer for existing hardcoded pages. It should not be an excuse to continue adding uncontrolled hardcoded UI text.

For every new feature:

1. Prefer server-side `lang(...)` translation keys in Blade/PHP.
2. Prefer a shared keyed translation helper for JavaScript.
3. Keep translation keys stable and independent of displayed English wording.
4. Put English and German values in the normal translation source when practical.
5. Use `pmd_admin_de.php` only when the component cannot yet use normal keyed translations.
6. Never add a large dictionary directly to a Blade layout.
7. Never create another page-specific or side-menu-specific DOM translator.
8. Test English and German before merging.

Long-term goal:

```text
new code uses real translation keys
old hardcoded code remains covered by the central compatibility runtime
old pages are migrated gradually when they are safely refactored
```

---

## 11. Normal production deployment

Use this when the current repository branch already contains the latest language files:

```bash
cd /var/www/paymydine/frontend/Paymydine-Update
chmod +x scripts/pmd-deploy-admin-i18n.sh
./scripts/pmd-deploy-admin-i18n.sh
```

The default live root is:

```text
/var/www/paymydine
```

To deploy to a different live root:

```bash
PMD_LIVE_ROOT=/another/path ./scripts/pmd-deploy-admin-i18n.sh
```

The deploy script is idempotent: running it again should leave exactly one clean include in each admin layout.

---

## 12. Safe VPS update while staying on the current branch

Use this when the VPS is on a feature/stabilization branch and cannot safely switch to `main` because it has unrelated local changes.

```bash
cd /var/www/paymydine/frontend/Paymydine-Update

git fetch origin main

git show origin/main:scripts/pmd-update-admin-i18n-from-main.sh \
  > /tmp/pmd-update-admin-i18n-from-main.sh

chmod +x /tmp/pmd-update-admin-i18n-from-main.sh
/tmp/pmd-update-admin-i18n-from-main.sh
```

This process:

- stays on the current branch;
- fetches the latest `origin/main`;
- imports only language-system files;
- creates a repository backup;
- validates PHP and JavaScript;
- runs the normal deployment installer;
- does not replace unrelated reservation/floor/dashboard work.

---

## 13. Build report and deployment logs

Deployment log:

```text
/var/www/paymydine/storage/logs/pmd-admin-i18n-deploy-YYYYMMDD-HHMMSS.log
```

Build report:

```text
/var/www/paymydine/storage/logs/pmd-admin-i18n-report.json
```

The JSON report contains:

- generated catalogue entry count;
- custom entry count;
- source key count;
- unchanged English/German rows;
- placeholder errors;
- source-text conflicts;
- per-namespace statistics.

Useful command:

```bash
php -r '
$r=json_decode(file_get_contents("storage/logs/pmd-admin-i18n-report.json"),true);
print_r([
  "catalogue_entries"=>$r["catalogue_entries"]??null,
  "custom_entries"=>$r["custom_entries"]??null,
  "unchanged_count"=>$r["unchanged_count"]??null,
  "placeholder_error_count"=>$r["placeholder_error_count"]??null,
  "conflict_count"=>$r["conflict_count"]??null,
]);
'
```

An unchanged row is not always an error. Some product names, technical terms, or identical words may intentionally be the same in English and German. Review the report instead of blindly translating every row.

---

## 14. Browser verification

Open the browser console:

```javascript
console.table({
  version: window.PMDAdminI18n?.version,
  locale: window.PMDAdminI18n?.locale(),
  entries: window.PMDAdminI18n?.entries(),
  pending: document.documentElement.classList.contains('pmd-i18n-pending'),
  ready: document.documentElement.classList.contains('pmd-i18n-ready')
});
```

Expected for German V1:

```text
version: 1.0.0
locale: de
entries: normally more than 1000
pending: false
ready: true
```

Test one individual phrase:

```javascript
window.PMDAdminI18n.translate('New Order')
```

Expected:

```text
Neue Bestellung
```

---

## 15. Manual QA checklist

Test at least these areas after a language change:

- login and first admin page load;
- language switcher;
- reload persistence;
- side menu expanded and collapsed;
- owner dashboard;
- manager dashboard;
- waiter pages;
- KDS;
- orders list and order detail;
- reservations and floor tools;
- settings pages;
- forms, validation, placeholders, and tooltips;
- modals and confirmation dialogs;
- AJAX-loaded tables and drawers;
- mobile menu;
- browser console for JavaScript errors;
- network tab for catalogue/runtime HTTP errors;
- no visible English flash before German appears.

A successful static page test does not prove that dynamic AJAX content works. Always trigger dynamic UI actions.

---

## 16. Troubleshooting

### Page stays English

Check:

```javascript
window.PMD_ADMIN_LOCALE
window.PMDAdminI18n?.locale()
window.PMDAdminI18n?.entries()
```

Then check the cookie in browser storage:

```text
pmd_admin_locale=de
```

Also verify that the generated catalogue returns HTTP 200.

### One phrase stays English

Possible causes:

- the exact English source text is missing from `pmd_admin_de.php`;
- capitalization or punctuation differs;
- the text is inside a skipped element;
- the component replaces its own content after translation;
- the phrase is user/database content and should not be translated by this system.

Add the exact source phrase, redeploy, clear browser cache, and retest.

### English flashes before German

Check that the partial is included inside `<head>` exactly once:

```bash
grep -RFn "@include('admin::_partials.pmd_admin_i18n')" \
  /var/www/paymydine/app/admin/views/_layouts/default.blade.php \
  /var/www/paymydine/app/admin/views/layouts/default.blade.php
```

Check that `pmd-i18n-pending` is added before the body is painted and removed after translation.

### Page is hidden for several seconds

This normally means the catalogue or runtime did not execute correctly. Check:

- browser console errors;
- catalogue/runtime HTTP status;
- JavaScript syntax;
- Content Security Policy;
- incorrect asset path;
- stale compiled view.

The safety timeout should reveal the page after about four seconds, but the underlying error still needs correction.

### Deployment says catalogue is empty

Check:

- English and German language records exist in TastyIgniter;
- both are enabled/available to the model;
- Laravel can boot from the live root;
- `vendor/autoload.php` and `bootstrap/app.php` exist;
- the custom PHP catalogue returns an array.

### Parse error in Blade

Do not insert generated JSON or a large translation dictionary directly into Blade.

V1 specifically keeps the generated catalogue in an external JavaScript file to avoid this class of error.

### Side menu differs from the page

Search for and remove any old page-specific or sidebar-specific translation script. The deployment installer removes known legacy markers, but a newly added custom translator may not use those markers.

There should be one global runtime only.

---

## 17. Backups and rollback

Every production deployment creates a backup similar to:

```text
/var/www/paymydine/storage/backups/clean-admin-i18n-YYYYMMDD-HHMMSS
```

The safe repository updater also creates a separate import backup similar to:

```text
/var/www/paymydine/storage/backups/i18n-repo-sync-YYYYMMDD-HHMMSS
```

To restore files from a selected deployment backup:

```bash
LIVE=/var/www/paymydine
BACKUP=/var/www/paymydine/storage/backups/clean-admin-i18n-YYYYMMDD-HHMMSS

sudo rsync -a "$BACKUP/" "$LIVE/"

cd "$LIVE"
php artisan view:clear
php artisan config:clear
php artisan route:clear
```

Important: the backup contains files that existed before deployment. If the deployment introduced a completely new file that did not previously exist, restoring the backup does not automatically delete that new file. Remove only known generated/new i18n files when a complete rollback requires it.

---

## 18. Adding a third language: important current limitation

V1 is clean for English/German, but it is still **German-specific in several code paths**.

Adding only this file is not enough:

```text
app/admin/i18n/pmd_admin_fr.php
```

The current implementation also has German-specific logic in:

- the locale allowlist in `pmd_admin_i18n.blade.php`;
- the fixed catalogue filename `pmd-admin-i18n-catalog-de.js`;
- the fixed browser global `window.PMD_ADMIN_I18N_DE`;
- runtime checks such as `locale === 'de'`;
- German dynamic patterns such as `Order 12 -> Bestellung 12`;
- the builder's fixed English/German database lookup;
- the deploy script's fixed German source and output paths;
- the cache-clearing list.

Therefore, a third language should be implemented as a planned **V2 multi-language refactor**, not by copying random German conditionals.

---

## 19. Recommended V2 design for future languages

Before adding French, Spanish, Arabic, or another language, refactor V1 around a central language manifest.

Recommended conceptual file:

```text
app/admin/i18n/languages.php
```

Example design:

```php
return [
    'de' => [
        'custom' => 'pmd_admin_de.php',
        'catalogue' => 'pmd-admin-i18n-catalog-de.js',
        'direction' => 'ltr',
    ],
    'fr' => [
        'custom' => 'pmd_admin_fr.php',
        'catalogue' => 'pmd-admin-i18n-catalog-fr.js',
        'direction' => 'ltr',
    ],
    'ar' => [
        'custom' => 'pmd_admin_ar.php',
        'catalogue' => 'pmd-admin-i18n-catalog-ar.js',
        'direction' => 'rtl',
    ],
];
```

Recommended V2 behavior:

1. The builder accepts `--target=de`, `--target=fr`, etc.
2. The builder reads English as the source and the selected target language.
3. It generates one catalogue per target locale.
4. All generated catalogues use a generic browser global or registry.
5. The partial reads the manifest and loads the correct catalogue dynamically.
6. The runtime translates whenever the locale is not English.
7. Dynamic pattern translations are stored per locale, not hardcoded inside one German runtime.
8. RTL languages set both `lang` and `dir` correctly.
9. The deploy script loops over all configured languages.
10. Tests run for every configured locale.

Recommended generic browser data shape:

```javascript
window.PMD_ADMIN_I18N = {
  locale: 'fr',
  entries: {
    'New Order': 'Nouvelle commande'
  },
  patterns: {
    order: 'Commande #{number}',
    table: 'Table {number}'
  }
};
```

Do not implement a new global such as `PMD_ADMIN_I18N_FR` in one page and another hardcoded branch in the runtime. That would recreate the maintenance problem V1 was designed to remove.

---

## 20. Exact checklist for adding a new language after V2 support exists

Once the manifest-based V2 refactor is completed, adding a language should follow this checklist:

1. Install/enable the language in TastyIgniter.
2. Confirm the locale code, for example `fr` or `ar`.
3. Add the locale to the central language manifest.
4. Create the custom PayMyDine catalogue, for example:

   ```text
   app/admin/i18n/pmd_admin_fr.php
   ```

5. Add locale-specific dynamic pattern templates.
6. Configure text direction (`ltr` or `rtl`).
7. Run the multi-language builder.
8. Review placeholder errors, conflicts, and unchanged rows.
9. Deploy.
10. Test locale switching and cookie persistence.
11. Test every major admin page.
12. Test dynamic AJAX content.
13. Test date, number, currency, and plural formats separately.
14. For RTL, test layout direction, icons, drawers, tables, and mobile navigation.
15. Commit the source files and documentation; do not commit manually edited generated output unless the repository policy explicitly changes.

---

## 21. What this language system does not solve

The V1 DOM catalogue translates interface labels. It does not automatically localize every type of data.

Separate work may still be required for:

- database content such as menu names and descriptions;
- emails and PDF templates;
- currency formatting;
- date/time formatting;
- decimal and thousands separators;
- plural grammar beyond simple patterns;
- backend API payloads consumed outside the admin DOM;
- customer-facing themes;
- SEO metadata;
- RTL layout behavior;
- third-party widgets rendered inside isolated iframes.

Do not assume that a translated admin label means the complete platform is localized.

---

## 22. Git workflow

Recommended workflow for translation changes:

1. Create or use a feature branch.
2. Edit source files only.
3. Validate locally or on a safe environment.
4. Review the build report.
5. Commit with a clear message.
6. Merge to `main`.
7. On the VPS, either pull normally or use the safe language-only updater.
8. Run production QA.

Example commit messages:

```text
Add missing German waiter translations
Correct German reservation terminology
Document admin i18n deployment workflow
Prepare admin i18n for French locale
```

Never mix a large unrelated Reservations/Floor redesign and an unreviewed translation-engine rewrite in the same commit.

---

## 23. Final architecture summary

Current V1:

```text
selected locale cookie
        |
        v
server boot partial
        |
        +--> TastyIgniter request locale
        |
        +--> no-flash protection
        |
        v
English/German core translations
        +
PayMyDine custom pmd_admin_de.php
        |
        v
builder + validation
        |
        v
external generated German catalogue
        |
        v
one shared DOM/AJAX runtime
        |
        v
all admin pages, including side menu
```

The most important rules are:

- the original issue was hardcoded custom UI text, not an API failure;
- keep one central custom source file per target language;
- keep one shared runtime;
- do not put large dictionaries inside Blade;
- do not create separate translators per page or menu;
- do not edit generated catalogues manually;
- use real translation keys for new development whenever possible;
- treat a third language as a controlled V2 refactor because V1 is currently EN/DE-specific.
