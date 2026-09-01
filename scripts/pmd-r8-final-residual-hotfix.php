<?php

declare(strict_types=1);

$options = getopt('', ['root::']);
$root = rtrim((string)($options['root'] ?? '/var/www/paymydine'), '/');

function r8Read(string $path): string
{
    $value = @file_get_contents($path);
    if ($value === false) {
        throw new RuntimeException('Could not read '.$path);
    }
    return $value;
}

function r8Write(string $path, string $content): void
{
    $dir = dirname($path);
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new RuntimeException('Could not create directory '.$dir);
    }
    $tmp = $path.'.r8tmp.'.getmypid();
    if (file_put_contents($tmp, $content) === false) {
        throw new RuntimeException('Could not stage '.$path);
    }
    @chmod($tmp, 0644);
    if (!rename($tmp, $path)) {
        @unlink($tmp);
        throw new RuntimeException('Could not install '.$path);
    }
}

function r8ReplaceExact(string $content, string $search, string $replace, string $label, bool $allowMissing = false): string
{
    $count = substr_count($content, $search);
    if ($count === 0) {
        if ($allowMissing) return $content;
        throw new RuntimeException('Required pattern missing: '.$label);
    }
    return str_replace($search, $replace, $content);
}

try {
    $manifestRel = 'app/admin/views/_meta/assets.json';
    $settingsMenuRel = 'app/admin/views/_partials/top_settings_menu.blade.php';
    $r10CssRel = 'app/admin/assets/css/pmd-settings-polish-r10.css';
    $r11CssRel = 'app/admin/assets/css/pmd-settings-polish-r11.css';
    $r7JsRel = 'app/admin/assets/js/pmd-admin-i18n-residual-r7.js';
    $r8JsRel = 'app/admin/assets/js/pmd-admin-i18n-residual-r8.js';

    foreach ([$manifestRel, $settingsMenuRel, $r10CssRel, $r11CssRel, $r7JsRel] as $rel) {
        if (!is_file($root.'/'.$rel)) {
            throw new RuntimeException('Required file missing: '.$rel);
        }
    }

    if (strpos(r8Read($root.'/'.$r7JsRel), 'PMD_ADMIN_I18N_RESIDUAL_R7') === false) {
        throw new RuntimeException('R7 authority is missing. Run R7 before R8.');
    }

    $manifest = json_decode(r8Read($root.'/'.$manifestRel), true, 512, JSON_THROW_ON_ERROR);
    if (!isset($manifest['script']) || !is_array($manifest['script'])) {
        throw new RuntimeException('Unexpected asset manifest structure.');
    }

    // 1) Header Settings tooltip: server-first canonical catalogue authority.
    $settingsMenu = r8Read($root.'/'.$settingsMenuRel);
    if (strpos($settingsMenu, 'PMD_R8_SETTINGS_TOOLTIP_SERVER_I18N') === false) {
        $needle = 'aria-label="Settings" data-pmd-tooltip-label="Settings" data-no-tooltip="1"';
        $replacement = 'aria-label="{{ \\Admin\\Classes\\PmdPlatformI18n::fromEnglish(\'Settings\', \'nav.\') }}" data-pmd-tooltip-label="{{ \\Admin\\Classes\\PmdPlatformI18n::fromEnglish(\'Settings\', \'nav.\') }}" data-no-tooltip="1" data-pmd-r8-settings-tooltip-server-i18n="1" {{-- PMD_R8_SETTINGS_TOOLTIP_SERVER_I18N --}}';
        $settingsMenu = r8ReplaceExact($settingsMenu, $needle, $replacement, 'top Settings tooltip English attributes');
    }

    // 2) Retire CSS-generated English. Keep the visual pseudo-elements, but
    // their content comes from canonical-key-backed data attributes populated
    // by R8 runtime. Until runtime is ready, they are empty rather than English.
    $r10Css = r8Read($root.'/'.$r10CssRel);
    if (strpos($r10Css, 'PMD_R8_CUSTOMER_MENU_PSEUDO_CANONICAL') === false) {
        $r10Css = str_replace(
            'content: "Customer menu theme" !important;',
            'content: attr(data-pmd-r8-theme-title) !important; /* PMD_R8_CUSTOMER_MENU_PSEUDO_CANONICAL */',
            $r10Css
        );
        $r10Css = str_replace(
            'content: "Choose the look of your digital menu." !important;',
            'content: attr(data-pmd-r8-choose-look) !important; /* PMD_R8_CUSTOMER_MENU_PSEUDO_CANONICAL */',
            $r10Css
        );
        $r10Css = str_replace(
            'content: "Choose a theme for your digital menu." !important;',
            'content: attr(data-pmd-r8-choose-theme) !important; /* PMD_R8_CUSTOMER_MENU_PSEUDO_CANONICAL */',
            $r10Css
        );
        if (strpos($r10Css, 'PMD_R8_CUSTOMER_MENU_PSEUDO_CANONICAL') === false) {
            throw new RuntimeException('R10 Customer Menu pseudo-copy patterns were not found.');
        }
    }

    $r11Css = r8Read($root.'/'.$r11CssRel);
    if (strpos($r11Css, 'PMD_R8_CUSTOMER_MENU_TITLE_CANONICAL') === false) {
        $needle = 'content: "Customer menu theme" !important;';
        $replacement = 'content: attr(data-pmd-r8-theme-title) !important; /* PMD_R8_CUSTOMER_MENU_TITLE_CANONICAL */';
        $r11Css = r8ReplaceExact($r11Css, $needle, $replacement, 'R11 Customer Menu title pseudo-copy');
    }

    $r8Js = <<<'JS'
/* PMD_ADMIN_I18N_RESIDUAL_R8
 * Final direct-key authority for the four crawler leftovers after R7.
 * No locale-specific words live here: all target copy comes from the central
 * PMD platform catalogue by canonical key.
 */
(function () {
  'use strict';

  if (window.PMDAdminResidualI18nR8) {
    window.PMDAdminResidualI18nR8.run();
    return;
  }

  var VERSION = '8.0.0';
  var scheduled = false;
  var observer = null;

  function platform() {
    return window.PMDPlatformMessages || null;
  }

  function locale() {
    var p = platform();
    if (p && typeof p.locale === 'function') {
      try { return String(p.locale() || '').toLowerCase().split(/[-_]/)[0]; } catch (error) {}
    }
    return String(
      window.PMD_PLATFORM_MESSAGES_LOCALE ||
      window.PMD_ADMIN_LOCALE ||
      document.documentElement.lang ||
      'en'
    ).toLowerCase().split(/[-_]/)[0];
  }

  function t(key, fallback) {
    var p = platform();
    if (!p || typeof p.t !== 'function') return String(fallback || '');
    try {
      var value = String(p.t(key, {}, fallback) || '').trim();
      return value || String(fallback || '');
    } catch (error) {
      return String(fallback || '');
    }
  }

  function setExact(el, attr, source, key) {
    if (!el || !el.hasAttribute || !el.hasAttribute(attr)) return 0;
    var current = String(el.getAttribute(attr) || '').trim();
    if (current !== source) return 0;
    var target = t(key, source);
    if (!target || target === current) return 0;
    el.setAttribute(attr, target);
    return 1;
  }

  function fixSettingsTooltip(root) {
    var changed = 0;
    var selector = '[data-pmd-tooltip-label="Settings"], [aria-label="Settings"], [title="Settings"]';
    try {
      root.querySelectorAll(selector).forEach(function (el) {
        changed += setExact(el, 'data-pmd-tooltip-label', 'Settings', 'nav.settings');
        changed += setExact(el, 'aria-label', 'Settings', 'nav.settings');
        changed += setExact(el, 'title', 'Settings', 'nav.settings');
      });
    } catch (error) {}
    return changed;
  }

  function fixBarControls(root) {
    var changed = 0;
    var selector = '[aria-label="Bar"], [title="Bar"]';
    try {
      root.querySelectorAll(selector).forEach(function (el) {
        changed += setExact(el, 'aria-label', 'Bar', 'reports.ui.bar');
        changed += setExact(el, 'title', 'Bar', 'reports.ui.bar');
      });
    } catch (error) {}
    return changed;
  }

  function setData(el, name, key, fallback) {
    if (!el) return 0;
    var target = t(key, fallback);
    if (!target) return 0;
    if (el.getAttribute(name) === target) return 0;
    el.setAttribute(name, target);
    return 1;
  }

  function fixCustomerMenu() {
    var page = document.getElementById('pmd-frontend-settings');
    if (!page) return 0;
    var changed = 0;

    var title = page.querySelector('.pmd-frontend-header h1');
    var look = page.querySelector('.pmd-frontend-header__left p');
    var themeHelp = page.querySelector('.pmd-frontend-form > .pmd-frontend-section:first-of-type .pmd-frontend-card__header p');

    changed += setData(title, 'data-pmd-r8-theme-title', 'r3.customer_menu_theme', 'Customer menu theme');
    changed += setData(look, 'data-pmd-r8-choose-look', 'r4.settings.choose_look', 'Choose the look of your digital menu.');
    changed += setData(themeHelp, 'data-pmd-r8-choose-theme', 'r4.settings.choose_theme', 'Choose a theme for your digital menu.');

    return changed;
  }

  function run() {
    if (!document.documentElement || locale() === 'en') return 0;
    var changed = 0;
    changed += fixSettingsTooltip(document);
    changed += fixBarControls(document);
    changed += fixCustomerMenu();
    return changed;
  }

  function inspect() {
    var leftovers = [];
    try {
      document.querySelectorAll('[data-pmd-tooltip-label="Settings"], [aria-label="Settings"], [title="Settings"]')
        .forEach(function (el) { leftovers.push({kind: 'settings-attribute', tag: el.tagName}); });
      document.querySelectorAll('[aria-label="Bar"], [title="Bar"]')
        .forEach(function (el) { leftovers.push({kind: 'bar-attribute', tag: el.tagName}); });
    } catch (error) {}

    var page = document.getElementById('pmd-frontend-settings');
    if (page) {
      [
        ['.pmd-frontend-header h1', '::before', 'Customer menu theme'],
        ['.pmd-frontend-header__left p', '::after', 'Choose the look of your digital menu.'],
        ['.pmd-frontend-form > .pmd-frontend-section:first-of-type .pmd-frontend-card__header p', '::after', 'Choose a theme for your digital menu.']
      ].forEach(function (item) {
        var el = page.querySelector(item[0]);
        if (!el) return;
        try {
          var value = String(getComputedStyle(el, item[1]).content || '').replace(/^['"]|['"]$/g, '');
          if (value === item[2]) leftovers.push({kind: item[1], source: value, tag: el.tagName});
        } catch (error) {}
      });
    }

    return {
      version: VERSION,
      locale: locale(),
      count: leftovers.length,
      leftovers: leftovers
    };
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function () {
      scheduled = false;
      run();
    }, 20);
  }

  function bind() {
    run();

    observer = new MutationObserver(function (mutations) {
      var relevant = mutations.some(function (mutation) {
        if (mutation.type === 'childList') return mutation.addedNodes && mutation.addedNodes.length > 0;
        if (mutation.type !== 'attributes') return false;
        return ['aria-label', 'title', 'data-pmd-tooltip-label'].indexOf(mutation.attributeName) !== -1;
      });
      if (relevant) schedule();
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-label', 'title', 'data-pmd-tooltip-label']
    });

    [60, 200, 600, 1400, 3000, 7000].forEach(function (ms) {
      setTimeout(run, ms);
    });
  }

  window.PMDAdminResidualI18nR8 = Object.freeze({
    version: VERSION,
    locale: locale,
    run: run,
    inspect: inspect,
    disconnect: function () {
      if (observer) observer.disconnect();
      observer = null;
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, {once: true});
  } else {
    bind();
  }

  console.info('[PMD Admin Residual I18n R8] Ready', {
    version: VERSION,
    locale: locale()
  });
})();
JS;

    if (strpos($r8Js, 'PMD_ADMIN_I18N_RESIDUAL_R8') === false) {
        throw new RuntimeException('R8 JS payload marker validation failed.');
    }

    $manifest['script'] = array_values(array_filter(
        $manifest['script'],
        static fn($entry): bool => !is_array($entry)
            || (($entry['name'] ?? '') !== 'pmd-admin-i18n-residual-r8-js'
                && ($entry['path'] ?? '') !== 'js/pmd-admin-i18n-residual-r8.js')
    ));
    $manifest['script'][] = [
        'path' => 'js/pmd-admin-i18n-residual-r8.js',
        'name' => 'pmd-admin-i18n-residual-r8-js',
    ];

    $encodedManifest = json_encode(
        $manifest,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
    )."\n";

    $stamp = date('Ymd_His');
    $backup = '/home/ubuntu/pmd-backups/admin-i18n-final-r8-'.$stamp;
    if (!is_dir($backup) && !mkdir($backup, 0755, true) && !is_dir($backup)) {
        throw new RuntimeException('Could not create backup directory '.$backup);
    }

    foreach ([$manifestRel, $settingsMenuRel, $r10CssRel, $r11CssRel, $r8JsRel] as $rel) {
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

    r8Write($root.'/'.$settingsMenuRel, $settingsMenu);
    r8Write($root.'/'.$r10CssRel, $r10Css);
    r8Write($root.'/'.$r11CssRel, $r11Css);
    r8Write($root.'/'.$r8JsRel, $r8Js."\n");
    r8Write($root.'/'.$manifestRel, $encodedManifest);

    echo "PMD R8 FINAL RESIDUAL I18N: APPLIED\n";
    echo "Backup: {$backup}\n";
    echo "Settings tooltip: server-first canonical nav.settings\n";
    echo "Customer Menu CSS pseudo-copy: canonical data attributes, no hard-coded locale words\n";
    echo "Dashboard Bar aria/title: direct canonical reports.ui.bar runtime authority\n";
    echo "Canonical language files: unchanged\n";
    echo "No tenant/payment/currency/order/reservation/business data changed.\n";
} catch (Throwable $error) {
    fwrite(STDERR, 'ERROR: '.$error->getMessage()."\n");
    exit(1);
}
