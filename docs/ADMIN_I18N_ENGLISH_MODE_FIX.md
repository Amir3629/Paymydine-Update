# PayMyDine Admin i18n — English Mode Fix

## Problem observed

The language switcher could display `EN`, while some page titles and labels still appeared in German.

Example symptoms:

- the sidebar badge showed `EN`;
- `window.PMD_ADMIN_LOCALE` was English;
- the browser DOM translator correctly did nothing in English mode;
- some server-rendered labels were still German or mixed German/English.

This was not caused by the German catalogue and was not caused by the browser runtime translating English into German.

## Root cause

The cookie locale was originally applied inside:

```text
app/admin/views/_partials/pmd_admin_i18n.blade.php
```

That partial runs while Blade is rendering the page.

Some TastyIgniter controllers and form widgets prepare translated labels before Blade rendering starts. Therefore, changing the server locale in the Blade partial could be too late for those labels.

The result was a split state:

```text
Sidebar/cookie/browser locale: EN
Controller-prepared server labels: DE
```

The English runtime intentionally does not reverse-translate German text. English must be rendered correctly by Laravel/TastyIgniter on the server.

## Correct architecture

A new early server bootstrap is now used:

```text
app/admin/i18n/pmd_admin_locale_bootstrap.php
```

It is loaded from:

```text
app/admin/routes.php
```

before admin controllers run.

The bootstrap:

1. reads the `pmd_admin_locale` cookie;
2. normalizes the locale;
3. allows only `en` or `de` in V1;
4. sets the Laravel locale;
5. sets the TastyIgniter localization service locale;
6. stores the resolved locale on the request;
7. reapplies it before request dispatch;
8. owns the centralized language-switch V4 endpoint.

## Browser behavior after the fix

### English

- the server renders English;
- the DOM translator does not run translations;
- the page is shown immediately;
- no German catalogue replacement is applied.

### German

- the server renders available German TastyIgniter translations;
- the external catalogue fills custom/hardcoded PayMyDine text;
- dynamic AJAX/JavaScript text is translated by the shared runtime;
- the no-flash layer hides the page until the first translation pass.

## Language switch endpoint

The canonical endpoint is now:

```text
/admin/_pmd/language-switch-v4
```

The deployment script updates the sidebar switcher from the old V3 endpoint to V4.

The endpoint updates:

- the staff language record when available;
- Laravel locale for the current request;
- TastyIgniter localization state;
- the `pmd_admin_locale` cookie for one year.

The cookie remains the final authority for the next page request.

## Deployment

Use the normal safe updater. It does not switch the current Git branch:

```bash
cd /var/www/paymydine/frontend/Paymydine-Update

git fetch origin main

git show origin/main:scripts/pmd-update-admin-i18n-from-main.sh \
  > /tmp/pmd-update-admin-i18n-from-main.sh

chmod +x /tmp/pmd-update-admin-i18n-from-main.sh
/tmp/pmd-update-admin-i18n-from-main.sh
```

The updater imports only language-system files, then the deployment script:

- backs up live routes, layouts, sidebar, and language files;
- installs the early locale bootstrap;
- removes V2/V3 switch routes;
- installs the V4 route;
- updates the sidebar endpoint;
- rebuilds the German catalogue;
- validates PHP, JavaScript, routes, and includes;
- clears framework and translation caches.

## Verification

After deployment, hard refresh the browser and select English.

Run:

```javascript
console.table({
  browserLocale: window.PMD_ADMIN_LOCALE,
  localeSource: window.PMD_ADMIN_LOCALE_SOURCE,
  runtimeLocale: window.PMDAdminI18n?.locale(),
  runtimeVersion: window.PMDAdminI18n?.version,
  htmlLang: document.documentElement.lang,
  pending: document.documentElement.classList.contains('pmd-i18n-pending'),
  ready: document.documentElement.classList.contains('pmd-i18n-ready')
});
```

Expected in English:

```text
browserLocale: en
localeSource: early-bootstrap
runtimeLocale: en
htmlLang: en
pending: false
ready: true
```

Expected in German:

```text
browserLocale: de
localeSource: early-bootstrap
runtimeLocale: de
htmlLang: de
pending: false after translation
ready: true
```

Server verification:

```bash
grep -n "pmd_admin_locale_bootstrap.php" \
  /var/www/paymydine/app/admin/routes.php

grep -n "language-switch-v4" \
  /var/www/paymydine/app/admin/views/_partials/side_nav.blade.php

php -l /var/www/paymydine/app/admin/i18n/pmd_admin_locale_bootstrap.php
php -l /var/www/paymydine/app/admin/routes.php
```

## Unrelated console errors

The following errors are not the cause of the EN/DE mismatch:

- missing Dropzone assets;
- missing Bootstrap Treeview assets;
- missing Sortable, Selectonic, Mustache, Typeahead, Moment, Tempus Dominus, or Clockpicker assets;
- `Dropzone is not defined`;
- page-specific inline JavaScript syntax errors.

They are separate asset/runtime problems and should be audited independently. They may break media-manager or other components, but they do not explain why the language badge and server-rendered labels used different locales.
