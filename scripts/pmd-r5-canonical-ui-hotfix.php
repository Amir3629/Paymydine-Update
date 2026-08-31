<?php

declare(strict_types=1);

$options = getopt('', ['root::']);
$root = rtrim((string)($options['root'] ?? '/var/www/paymydine'), '/');

function r5Read(string $root, string $path): string
{
    $value = @file_get_contents($root.'/'.$path);
    if ($value === false || $value === '') {
        throw new RuntimeException('Could not read '.$path);
    }
    return $value;
}

function r5ReplaceOnce(string $content, string $search, string $replace, string $label): string
{
    $count = substr_count($content, $search);
    if ($count !== 1) {
        throw new RuntimeException("Expected exactly one {$label}; found {$count}. No source was written.");
    }
    return str_replace($search, $replace, $content);
}

try {
    $settingsR4Path = 'app/admin/assets/js/pmd-settings-polish-r4.js';
    $settingsR5Path = 'app/admin/assets/js/pmd-settings-polish-r5.js';
    $auditR5Path = 'app/admin/assets/js/pmd-admin-canonical-visible-audit-r5.js';
    $assetsPath = 'app/admin/views/_meta/assets.json';

    foreach ([$settingsR4Path, $assetsPath] as $required) {
        if (!is_file($root.'/'.$required)) {
            throw new RuntimeException('Required source missing: '.$required);
        }
    }

    $settings = r5Read($root, $settingsR4Path);
    $assets = r5Read($root, $assetsPath);

    if (strpos($settings, 'PMD_SETTINGS_POLISH_CATALOGUE_I18N_R4') === false) {
        throw new RuntimeException('R4 catalogue marker missing from Settings Polish runtime.');
    }
    if (strpos($settings, 'PMD_SETTINGS_POLISH_LATE_I18N_R4_1') === false) {
        throw new RuntimeException('R4.1 late-i18n marker missing from Settings Polish runtime.');
    }

    if (strpos($assets, 'js/pmd-settings-polish-r5.js') !== false) {
        if (!is_file($root.'/'.$settingsR5Path) || !is_file($root.'/'.$auditR5Path)) {
            throw new RuntimeException('R5 asset manifest is present but one or more R5 runtime files are missing.');
        }
        echo "PMD R5 CANONICAL UI AUTHORITY: already applied\n";
        exit(0);
    }

    $keyMap = <<<'JS'

  // PMD_SETTINGS_DIRECT_CANONICAL_I18N_R5
  // R4 used reverse English-value lookup. That is fragile when another runtime
  // writes the same English copy later. R5 makes the canonical key the owner.
  var PMD_CANONICAL_KEY_BY_ENGLISH_R5 = Object.freeze({
    'PNG, JPG or WEBP · max 5 MB.': 'r4.settings.png_help',
    'Shown on your digital menu.': 'r4.settings.shown_menu',
    'Shown to guests on your digital menu.': 'r4.settings.shown_guests',
    'Choose the look of your digital menu.': 'r4.settings.choose_look',
    'Choose a theme for your digital menu.': 'r4.settings.choose_theme',
    'Add staff and manage who can sign in.': 'r4.settings.add_staff',
    'Built-in roles for your team.': 'r4.settings.builtin_roles',
    'Payment terminals, kitchen displays and cash drawers.': 'r4.devices.overview_help',
    'See your connected devices in one place.': 'r4.devices.connected_help',
    'POS screens used by your team.': 'r4.devices.pos_help',
    'Card readers connected to PayMyDine.': 'r4.devices.card_reader_help',
    'Kitchen screens for your orders.': 'r4.devices.kitchen_help',
    'Cash drawers connected to your POS.': 'r4.devices.cash_drawer_help',
    'Devices used for staff sign-in.': 'r4.devices.staff_signin_help',
    'Extra device connections and setup.': 'r4.devices.extra_setup_help',
    'Choose how guests can pay.': 'r4.finance.choose_pay',
    'Set VAT, receipts and invoice details.': 'r4.finance.tax_invoice',
    'Set up Fiskaly and TSE for Germany.': 'r4.finance.fiskaly',
    'Remove logo': 'r4.settings.remove_logo',
    'No restaurant logo selected': 'r4.settings.no_logo',
    'Selected restaurant logo preview': 'r4.settings.logo_preview'
  });

  function canonical(value) {
    var clean = String(value == null ? '' : value);
    var key = PMD_CANONICAL_KEY_BY_ENGLISH_R5[clean] || '';

    if (key && window.PMDPlatformMessages && typeof window.PMDPlatformMessages.t === 'function') {
      var direct = window.PMDPlatformMessages.t(key, {}, clean);
      if (typeof direct === 'string' && direct.trim() && direct !== key) return direct;
    }

    var current = window.PMD_PLATFORM_MESSAGES || {};
    if (key && typeof current[key] === 'string' && current[key].trim()) {
      return current[key];
    }

    return localized(clean);
  }
JS;

    $settings = r5ReplaceOnce(
        $settings,
        "\n  function text(node, value) {\n",
        $keyMap."\n\n  function text(node, value) {\n",
        'Settings text helper anchor'
    );

    $settings = r5ReplaceOnce(
        $settings,
        "    value = localized(value);\n",
        "    value = canonical(value);\n",
        'Settings text localization call'
    );

    $settings = str_replace(
        "localized('No restaurant logo selected')",
        "canonical('No restaurant logo selected')",
        $settings
    );
    $settings = str_replace(
        "localized('Selected restaurant logo preview')",
        "canonical('Selected restaurant logo preview')",
        $settings
    );

    $settings = "/* PMD_SETTINGS_POLISH_R5_CANONICAL_AUTHORITY */\n".$settings;

    $audit = <<<'JS'
/* PMD_ADMIN_CANONICAL_VISIBLE_AUDIT_R5
 * On-demand audit of visible English UI copy that already has a different
 * canonical translation in the active locale. This runtime does NOT translate
 * business/menu data; it only reports candidates so source ownership can be
 * fixed without mutating restaurant content.
 */
(function () {
  'use strict';

  function clean(value) {
    return String(value == null ? '' : value)
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function locale() {
    return String(
      window.PMD_PLATFORM_MESSAGES_LOCALE ||
      window.PMD_ADMIN_LOCALE ||
      document.documentElement.lang ||
      'en'
    ).toLowerCase().split('-')[0];
  }

  function reverseCatalogue() {
    var english = window.PMD_PLATFORM_MESSAGES_ENGLISH || {};
    var active = window.PMD_PLATFORM_MESSAGES || {};
    var reverse = Object.create(null);

    Object.keys(english).forEach(function (key) {
      var source = clean(english[key]);
      var translated = clean(active[key]);
      if (!source || !translated || source === translated) return;
      if (!reverse[source]) {
        reverse[source] = {key: key, translated: translated};
      }
    });

    return reverse;
  }

  function excluded(element) {
    if (!element || !element.closest) return false;
    return Boolean(element.closest([
      'script',
      'style',
      'textarea',
      'code',
      'pre',
      '[contenteditable="true"]',
      '#pmd-menu-manager-main [data-pmd-menu-card] h2',
      '#pmd-menu-manager-main [data-pmd-menu-card] .pmd-menu-card__description',
      '#pmd-menu-manager-main .pmd-menu-manager__category-label'
    ].join(',')));
  }

  function descriptor(element) {
    if (!element) return {tag: null, id: null, className: null};
    return {
      tag: element.tagName || null,
      id: element.id || null,
      className: typeof element.className === 'string' ? element.className : null
    };
  }

  function audit() {
    var lang = locale();
    var reverse = reverseCatalogue();
    var leftovers = [];
    var seen = Object.create(null);

    if (lang === 'en') {
      return {version: '5.0.0-canonical-visible', locale: lang, count: 0, leftovers: []};
    }

    function add(source, element, kind) {
      source = clean(source);
      var match = reverse[source];
      if (!source || !match || excluded(element)) return;

      var info = descriptor(element);
      var signature = [kind, match.key, info.tag, info.id, info.className].join('|');
      if (seen[signature]) return;
      seen[signature] = true;

      leftovers.push({
        key: match.key,
        source: source,
        translated: match.translated,
        kind: kind,
        tag: info.tag,
        id: info.id,
        className: info.className
      });
    }

    document.querySelectorAll('body *').forEach(function (element) {
      if (excluded(element)) return;

      if (element.children.length === 0) {
        add(element.textContent || '', element, 'text');
      }

      ['title', 'aria-label', 'placeholder', 'data-original-title', 'data-title'].forEach(function (attribute) {
        if (element.hasAttribute(attribute)) {
          add(element.getAttribute(attribute) || '', element, attribute);
        }
      });

      ['::before', '::after'].forEach(function (pseudo) {
        try {
          var value = window.getComputedStyle(element, pseudo).getPropertyValue('content');
          if (value && value !== 'none' && value !== 'normal' && value !== '""') {
            add(value.replace(/^['"]|['"]$/g, ''), element, pseudo);
          }
        } catch (error) {}
      });
    });

    return {
      version: '5.0.0-canonical-visible',
      locale: lang,
      catalogueCandidates: Object.keys(reverse).length,
      count: leftovers.length,
      leftovers: leftovers
    };
  }

  window.PMDCanonicalVisibleAuditR5 = Object.freeze({
    version: '5.0.0-canonical-visible',
    audit: audit
  });

  function bridge() {
    if (!window.PMDAdminCoverageR3) return false;
    if (!window.PMDAdminCoverageR3.auditLegacy && typeof window.PMDAdminCoverageR3.audit === 'function') {
      window.PMDAdminCoverageR3.auditLegacy = window.PMDAdminCoverageR3.audit;
    }
    window.PMDAdminCoverageR3.auditCanonical = audit;
    window.PMDAdminCoverageR3.audit = audit;
    return true;
  }

  if (!bridge()) {
    window.addEventListener('load', bridge, {once: true});
    window.setTimeout(bridge, 300);
  }

  console.info('[PMD Canonical Visible Audit R5] Ready');
})();
JS;

    $oldAsset = <<<'JSON'
    {
      "path": "js/pmd-settings-polish-r4.js",
      "name": "pmd-settings-polish-r4-js"
    },
JSON;

    $newAsset = <<<'JSON'
    {
      "path": "js/pmd-settings-polish-r5.js",
      "name": "pmd-settings-polish-r5-js"
    },
    {
      "path": "js/pmd-admin-canonical-visible-audit-r5.js",
      "name": "pmd-admin-canonical-visible-audit-r5-js"
    },
JSON;

    $assets = r5ReplaceOnce(
        $assets,
        $oldAsset,
        $newAsset,
        'Settings R4 asset entry'
    );

    json_decode($assets, true, 512, JSON_THROW_ON_ERROR);

    $sudoUser = trim((string)getenv('SUDO_USER'));
    $home = $sudoUser !== '' && is_dir('/home/'.$sudoUser)
        ? '/home/'.$sudoUser
        : (getenv('HOME') ?: '/tmp');
    $backup = rtrim($home, '/').'/pmd-backups/canonical-ui-r5-'.date('Ymd_His');

    if (!mkdir($backup, 0755, true) && !is_dir($backup)) {
        throw new RuntimeException('Could not create backup directory '.$backup);
    }

    foreach ([$settingsR4Path, $assetsPath] as $path) {
        $source = $root.'/'.$path;
        $dest = $backup.'/'.$path;
        $dir = dirname($dest);
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new RuntimeException('Could not create backup subdirectory '.$dir);
        }
        if (!copy($source, $dest)) {
            throw new RuntimeException('Could not back up '.$path);
        }
    }

    foreach ([$settingsR5Path => $settings, $auditR5Path => $audit, $assetsPath => $assets] as $path => $content) {
        if ($content === '') throw new RuntimeException('Refusing to write empty source: '.$path);
        if (file_put_contents($root.'/'.$path, $content) === false) {
            throw new RuntimeException('Could not write '.$path);
        }
    }

    echo "PMD R5 CANONICAL UI AUTHORITY: APPLIED\n";
    echo "Backup: {$backup}\n";
    echo "Settings Polish asset: R4 retired from manifest; R5 enabled\n";
    echo "R5 short-copy authority: direct canonical keys for 21 Settings/Devices/Finance/Team strings\n";
    echo "Visible-English audit: full active canonical catalogue\n";
    echo "No tenant/payment/currency/order/reservation/business data changed.\n";
} catch (Throwable $error) {
    fwrite(STDERR, 'ERROR: '.$error->getMessage()."\n");
    exit(1);
}
