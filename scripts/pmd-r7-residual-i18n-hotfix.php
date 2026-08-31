<?php

declare(strict_types=1);

$options = getopt('', ['root::']);
$root = rtrim((string)($options['root'] ?? '/var/www/paymydine'), '/');

function r7Read(string $path): string
{
    $value = @file_get_contents($path);
    if ($value === false) {
        throw new RuntimeException('Could not read '.$path);
    }
    return $value;
}

function r7Write(string $path, string $content): void
{
    $dir = dirname($path);
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new RuntimeException('Could not create directory '.$dir);
    }
    $tmp = $path.'.r7tmp.'.getmypid();
    if (file_put_contents($tmp, $content) === false) {
        throw new RuntimeException('Could not stage '.$path);
    }
    @chmod($tmp, 0644);
    if (!rename($tmp, $path)) {
        @unlink($tmp);
        throw new RuntimeException('Could not install '.$path);
    }
}

try {
    $manifestRel = 'app/admin/views/_meta/assets.json';
    $manifestPath = $root.'/'.$manifestRel;
    $crawlerPath = $root.'/app/admin/assets/js/pmd-admin-i18n-crawler-r6.js';

    if (!is_file($manifestPath)) {
        throw new RuntimeException('Asset manifest missing: '.$manifestRel);
    }
    if (!is_file($crawlerPath) || strpos(r7Read($crawlerPath), 'PMD_ADMIN_I18N_CRAWLER_R6') === false) {
        throw new RuntimeException('R6 crawler authority is missing. Run R6 first.');
    }

    $manifestRaw = r7Read($manifestPath);
    $manifest = json_decode($manifestRaw, true, 512, JSON_THROW_ON_ERROR);
    if (!isset($manifest['style']) || !is_array($manifest['style']) || !isset($manifest['script']) || !is_array($manifest['script'])) {
        throw new RuntimeException('Unexpected asset manifest structure.');
    }

    $cssRel = 'app/admin/assets/css/pmd-admin-i18n-residual-r7.css';
    $jsRel = 'app/admin/assets/js/pmd-admin-i18n-residual-r7.js';
    $cssPath = $root.'/'.$cssRel;
    $jsPath = $root.'/'.$jsRel;

    $css = <<<'CSS'
/* PMD_ADMIN_I18N_RESIDUAL_R7
 * Retire legacy CSS-generated English copy and expose the already-localized
 * real DOM text. This is deliberately presentation-only: no restaurant data.
 */

/* Restaurant profile helper copy: show the real localized DOM text. */
#pmd-restaurant-profile .pmd-profile-logo-help-r19 {
  font-size: 12.5px !important;
  line-height: 1.45 !important;
}
#pmd-restaurant-profile .pmd-profile-logo-help-r19::after {
  content: none !important;
  display: none !important;
}

/* R4 first-paint English pseudo-copy is retired. R5/R6 and the canonical
 * runtime already localize the underlying text nodes. */
#pmd-restaurant-profile .pmd-profile-section--blue .pmd-profile-card__header p,
#pmd-restaurant-profile .pmd-profile-section--cyan .pmd-profile-card__header p,
#pmd-frontend-settings .pmd-frontend-header__left p,
#pmd-frontend-settings .pmd-frontend-form > .pmd-frontend-section:first-child .pmd-frontend-card__header p,
#pmd-team-access #pmd-team-members-section .pmd-team-card__header p,
#pmd-team-access #pmd-team-roles-section .pmd-team-card__header p,
#pmd-devices-page #hardware-overview .pmd-owner-card__title p,
#pmd-devices-page #pos-devices .pmd-owner-card__title p,
#pmd-devices-page #payment-terminals .pmd-owner-card__title p,
#pmd-devices-page #kds .pmd-owner-card__title p,
#pmd-devices-page #cash-drawers .pmd-owner-card__title p,
#pmd-devices-page #biometric .pmd-owner-card__title p,
#pmd-devices-page #device-configuration .pmd-owner-card__title p,
#pmd-finance-page #payment-methods .pmd-owner-card__title p,
#pmd-finance-page #tax-invoicing .pmd-owner-card__title p,
#pmd-finance-page #fiskaly .pmd-owner-card__title p {
  font-size: 12.5px !important;
  line-height: 1.45 !important;
  font-weight: 400 !important;
}

#pmd-restaurant-profile .pmd-profile-section--blue .pmd-profile-card__header p::after,
#pmd-restaurant-profile .pmd-profile-section--cyan .pmd-profile-card__header p::after,
#pmd-frontend-settings .pmd-frontend-header__left p::after,
#pmd-frontend-settings .pmd-frontend-form > .pmd-frontend-section:first-child .pmd-frontend-card__header p::after,
#pmd-team-access #pmd-team-members-section .pmd-team-card__header p::after,
#pmd-team-access #pmd-team-roles-section .pmd-team-card__header p::after,
#pmd-devices-page #hardware-overview .pmd-owner-card__title p::after,
#pmd-devices-page #pos-devices .pmd-owner-card__title p::after,
#pmd-devices-page #payment-terminals .pmd-owner-card__title p::after,
#pmd-devices-page #kds .pmd-owner-card__title p::after,
#pmd-devices-page #cash-drawers .pmd-owner-card__title p::after,
#pmd-devices-page #biometric .pmd-owner-card__title p::after,
#pmd-devices-page #device-configuration .pmd-owner-card__title p::after,
#pmd-finance-page #payment-methods .pmd-owner-card__title p::after,
#pmd-finance-page #tax-invoicing .pmd-owner-card__title p::after,
#pmd-finance-page #fiskaly .pmd-owner-card__title p::after {
  content: none !important;
  display: none !important;
  visibility: hidden !important;
}

/* R11 hides the real localized heading and paints English with ::before.
 * Restore the actual heading and remove both pseudo-label authorities. */
html body #pmd-frontend-settings .pmd-frontend-header h1 {
  font-size: 22px !important;
  line-height: 1.15 !important;
  color: #17231f !important;
}
html body #pmd-frontend-settings .pmd-frontend-header h1::before,
html body #pmd-frontend-settings .pmd-frontend-header h1::after {
  content: none !important;
  display: none !important;
  visibility: hidden !important;
}

@media (max-width: 760px) {
  html body #pmd-frontend-settings .pmd-frontend-header h1 {
    font-size: 19px !important;
  }
}
CSS;

    $js = <<<'JS'
/* PMD_ADMIN_I18N_RESIDUAL_R7
 * Late canonical attribute authority for Admin UI chrome.
 * It translates only exact catalogue-known UI strings; restaurant/user data
 * is not guessed or machine-translated.
 */
(function () {
  'use strict';

  if (window.PMDAdminResidualI18nR7) return;

  var VERSION = '7.0.0';
  var ATTRS = [
    'aria-label',
    'title',
    'placeholder',
    'data-pmd-tooltip-label',
    'data-bs-original-title',
    'data-original-title'
  ];
  var scheduled = false;
  var observer = null;

  function api() {
    return window.PMDAdminI18n || null;
  }

  function locale() {
    var i18n = api();
    if (i18n && typeof i18n.locale === 'function') {
      try { return String(i18n.locale() || '').toLowerCase(); } catch (error) {}
    }
    return String(
      window.PMD_PLATFORM_MESSAGES_LOCALE ||
      window.PMD_ADMIN_LOCALE ||
      document.documentElement.lang ||
      'en'
    ).toLowerCase().split(/[-_]/)[0];
  }

  function translated(value) {
    var source = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    if (!source || locale() === 'en') return source;

    var i18n = api();
    if (!i18n || typeof i18n.translate !== 'function') return source;

    try {
      var target = String(i18n.translate(source) || '').trim();
      return target || source;
    } catch (error) {
      return source;
    }
  }

  function translateElement(el) {
    if (!el || el.nodeType !== 1) return 0;
    var changed = 0;

    ATTRS.forEach(function (attr) {
      if (!el.hasAttribute(attr)) return;
      var current = String(el.getAttribute(attr) || '').trim();
      if (!current) return;
      var target = translated(current);
      if (target && target !== current) {
        el.setAttribute(attr, target);
        changed += 1;
      }
    });

    return changed;
  }

  function run(root) {
    root = root || document;
    var i18n = api();

    /* CSS R7 exposes real text nodes that older CSS had hidden. Ask the
     * canonical runtime to translate those nodes before attribute cleanup. */
    if (i18n && typeof i18n.run === 'function') {
      try { i18n.run(); } catch (error) {}
    }

    var changed = 0;
    if (root.nodeType === 1) changed += translateElement(root);

    var selector = ATTRS.map(function (attr) {
      return '[' + attr + ']';
    }).join(',');

    try {
      root.querySelectorAll(selector).forEach(function (el) {
        changed += translateElement(el);
      });
    } catch (error) {}

    return changed;
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function () {
      scheduled = false;
      run(document);
    }, 40);
  }

  function bind() {
    run(document);

    if (observer) observer.disconnect();
    observer = new MutationObserver(function (mutations) {
      var relevant = mutations.some(function (mutation) {
        if (mutation.type === 'childList') return mutation.addedNodes && mutation.addedNodes.length;
        return mutation.type === 'attributes' && ATTRS.indexOf(mutation.attributeName) !== -1;
      });
      if (relevant) schedule();
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ATTRS
    });

    [100, 350, 900, 1800, 4000, 8000].forEach(function (ms) {
      setTimeout(function () { run(document); }, ms);
    });
  }

  window.PMDAdminResidualI18nR7 = Object.freeze({
    version: VERSION,
    locale: locale,
    run: function () { return run(document); },
    disconnect: function () {
      if (observer) observer.disconnect();
      observer = null;
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }

  console.info('[PMD Admin Residual I18n R7] Ready', {
    version: VERSION,
    locale: locale()
  });
})();
JS;

    if (strpos($css, 'PMD_ADMIN_I18N_RESIDUAL_R7') === false || strpos($js, 'PMD_ADMIN_I18N_RESIDUAL_R7') === false) {
        throw new RuntimeException('R7 payload marker validation failed.');
    }

    $manifest['style'] = array_values(array_filter(
        $manifest['style'],
        static fn($entry): bool => !is_array($entry) || (($entry['name'] ?? '') !== 'pmd-admin-i18n-residual-r7-css' && ($entry['path'] ?? '') !== 'css/pmd-admin-i18n-residual-r7.css')
    ));
    $manifest['script'] = array_values(array_filter(
        $manifest['script'],
        static fn($entry): bool => !is_array($entry) || (($entry['name'] ?? '') !== 'pmd-admin-i18n-residual-r7-js' && ($entry['path'] ?? '') !== 'js/pmd-admin-i18n-residual-r7.js')
    ));

    $manifest['style'][] = [
        'path' => 'css/pmd-admin-i18n-residual-r7.css',
        'name' => 'pmd-admin-i18n-residual-r7-css',
    ];
    $manifest['script'][] = [
        'path' => 'js/pmd-admin-i18n-residual-r7.js',
        'name' => 'pmd-admin-i18n-residual-r7-js',
    ];

    $encodedManifest = json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)."\n";

    $stamp = date('Ymd_His');
    $backup = '/home/ubuntu/pmd-backups/admin-i18n-residual-r7-'.$stamp;
    if (!is_dir($backup) && !mkdir($backup, 0755, true) && !is_dir($backup)) {
        throw new RuntimeException('Could not create backup directory '.$backup);
    }

    foreach ([$manifestRel, $cssRel, $jsRel] as $rel) {
        $src = $root.'/'.$rel;
        if (!is_file($src)) continue;
        $dest = $backup.'/'.$rel;
        if (!is_dir(dirname($dest)) && !mkdir(dirname($dest), 0755, true) && !is_dir(dirname($dest))) {
            throw new RuntimeException('Could not create backup path for '.$rel);
        }
        if (!copy($src, $dest)) {
            throw new RuntimeException('Could not back up '.$rel);
        }
    }

    r7Write($cssPath, $css."\n");
    r7Write($jsPath, $js."\n");
    r7Write($manifestPath, $encodedManifest);

    echo "PMD R7 RESIDUAL I18N AUTHORITY: APPLIED\n";
    echo "Backup: {$backup}\n";
    echo "New CSS: {$cssRel}\n";
    echo "New JS: {$jsRel}\n";
    echo "Canonical language files: unchanged\n";
    echo "No tenant/payment/currency/order/reservation/business data changed.\n";
} catch (Throwable $error) {
    fwrite(STDERR, 'ERROR: '.$error->getMessage()."\n");
    exit(1);
}
