<?php

declare(strict_types=1);

$options = getopt('', ['root::']);
$root = rtrim((string)($options['root'] ?? '/var/www/paymydine'), '/');

function r6Read(string $root, string $path): string
{
    $value = @file_get_contents($root.'/'.$path);
    if ($value === false || $value === '') {
        throw new RuntimeException('Could not read '.$path);
    }
    return $value;
}

function r6ReplaceOnce(string $content, string $search, string $replace, string $label): string
{
    $count = substr_count($content, $search);
    if ($count !== 1) {
        throw new RuntimeException("Expected exactly one {$label}; found {$count}. No source was written.");
    }
    return str_replace($search, $replace, $content);
}

/** @param array<string,string> $entries */
function r6AddCanonical(string $content, array $entries, string $locale): string
{
    $missing = [];

    if ($locale === 'tr') {
        $literalPos = strpos($content, "\n\$literals = [");
        if ($literalPos === false) {
            throw new RuntimeException('Turkish literal section was not found.');
        }
        $canonical = substr($content, 0, $literalPos);
        foreach ($entries as $key => $value) {
            if (strpos($canonical, var_export($key, true).' =>') === false) {
                $missing[$key] = $value;
            }
        }
        if (!$missing) return $content;

        $anchor = "    // Compatibility-only dynamic patterns. Values stay here so runtime code\n";
        if (substr_count($content, $anchor) !== 1) {
            throw new RuntimeException('Turkish canonical insertion anchor was not found exactly once.');
        }

        $lines = ["", "    // PMD_R6_FRONTEND_SETTINGS_CANONICAL_I18N"];
        foreach ($missing as $key => $value) {
            $lines[] = '    '.var_export($key, true).' => '.var_export($value, true).',';
        }
        $block = implode("\n", $lines)."\n\n";
        return str_replace($anchor, $block.$anchor, $content);
    }

    foreach ($entries as $key => $value) {
        if (strpos($content, var_export($key, true).' =>') === false) {
            $missing[$key] = $value;
        }
    }
    if (!$missing) return $content;

    $pos = strrpos($content, "\n];");
    if ($pos === false) {
        throw new RuntimeException(strtoupper($locale).' language closing array was not found.');
    }

    $lines = ["", "    // PMD_R6_FRONTEND_SETTINGS_CANONICAL_I18N"];
    foreach ($missing as $key => $value) {
        $lines[] = '    '.var_export($key, true).' => '.var_export($value, true).',';
    }
    $block = implode("\n", $lines)."\n";
    return substr($content, 0, $pos).$block.substr($content, $pos);
}

try {
    $paths = [
        'app/admin/i18n/platform/en.php',
        'app/admin/i18n/platform/de.php',
        'app/admin/i18n/platform/tr.php',
        'app/admin/assets/js/pmd-settings-polish-r5.js',
        'app/admin/assets/js/pmd-settings-stable-r9.js',
        'app/admin/assets/js/pmd-admin-canonical-visible-audit-r5.js',
        'app/admin/views/pmdsettings/frontend.blade.php',
        'app/admin/views/_meta/assets.json',
    ];

    $source = [];
    foreach ($paths as $path) {
        if (!is_file($root.'/'.$path)) {
            throw new RuntimeException('Required source missing: '.$path);
        }
        $source[$path] = r6Read($root, $path);
    }

    if (strpos($source['app/admin/assets/js/pmd-settings-polish-r5.js'], 'PMD_SETTINGS_POLISH_R5_CANONICAL_AUTHORITY') === false) {
        throw new RuntimeException('R5 Settings Polish authority marker is missing. Run R5 first.');
    }
    if (strpos($source['app/admin/assets/js/pmd-admin-canonical-visible-audit-r5.js'], 'PMD_ADMIN_CANONICAL_VISIBLE_AUDIT_R5') === false) {
        throw new RuntimeException('R5 canonical audit marker is missing. Run R5 first.');
    }
    if (strpos($source['app/admin/assets/js/pmd-settings-stable-r9.js'], 'PMD_SETTINGS_STABLE_R9') === false) {
        throw new RuntimeException('Settings Stable R9 marker is missing.');
    }

    $entries = [
        'settings.frontend.save_theme' => [
            'en' => 'Save theme',
            'de' => 'Theme speichern',
            'tr' => 'Temayı kaydet',
        ],
        'settings.frontend.theme_single_help' => [
            'en' => 'Select exactly one customer menu. V2 renders this theme server-side before first paint.',
            'de' => 'Wählen Sie genau ein Kundenmenü aus. V2 rendert dieses Theme serverseitig vor der ersten Anzeige.',
            'tr' => 'Tam olarak bir müşteri menüsü seçin. V2 bu temayı ilk görüntülemeden önce sunucu tarafında oluşturur.',
        ],
        'settings.frontend.languages_help' => [
            'en' => 'Languages guests can switch to. Menu translations still depend on translated content in the restaurant data.',
            'de' => 'Sprachen, zwischen denen Gäste wechseln können. Menüübersetzungen hängen weiterhin von übersetzten Restaurantinhalten ab.',
            'tr' => 'Misafirlerin geçiş yapabileceği diller. Menü çevirileri, restoran verilerindeki çevrilmiş içeriğe bağlıdır.',
        ],
        'settings.frontend.qr_journey_help' => [
            'en' => 'Only controls features that belong in the dine-in QR journey.',
            'de' => 'Steuert nur Funktionen, die zum QR-Ablauf im Restaurant gehören.',
            'tr' => 'Yalnızca restoran içi QR deneyimine ait özellikleri kontrol eder.',
        ],
        'settings.frontend.service_cost_help' => [
            'en' => 'Applied only to new QR table orders after this setting is saved. Existing orders keep their frozen totals.',
            'de' => 'Gilt nach dem Speichern nur für neue QR-Tischbestellungen. Bestehende Bestellungen behalten ihre festgeschriebenen Summen.',
            'tr' => 'Bu ayar kaydedildikten sonra yalnızca yeni QR masa siparişlerine uygulanır. Mevcut siparişlerin sabitlenmiş toplamları değişmez.',
        ],
        'settings.frontend.social_optional_help' => [
            'en' => 'These destinations are optional. General restaurant social links also remain available in Restaurant profile.',
            'de' => 'Diese Ziele sind optional. Allgemeine Social-Media-Links des Restaurants bleiben auch im Restaurantprofil verfügbar.',
            'tr' => 'Bu bağlantılar isteğe bağlıdır. Restoranın genel sosyal bağlantıları Restoran profili bölümünde de kullanılabilir.',
        ],
        'settings.frontend.website_shortcut_help' => [
            'en' => 'Show the restaurant website shortcut in themes that support it.',
            'de' => 'Zeigt die Restaurant-Website als Verknüpfung in Themes an, die dies unterstützen.',
            'tr' => 'Destekleyen temalarda restoran web sitesi kısayolunu gösterir.',
        ],
        'settings.frontend.featured_social_help' => [
            'en' => 'Show one featured social or review destination.',
            'de' => 'Zeigt ein hervorgehobenes Social- oder Bewertungsziel.',
            'tr' => 'Öne çıkarılmış bir sosyal medya veya değerlendirme bağlantısı gösterir.',
        ],
        'settings.frontend.legacy_theme_colors_help' => [
            'en' => 'V2 themes keep their own isolated visual system. Legacy global primary/accent color overrides are intentionally not exposed here because they would reintroduce cross-theme styling.',
            'de' => 'V2-Themes verwenden ihr eigenes isoliertes Designsystem. Alte globale Primär- und Akzentfarben werden hier bewusst nicht angeboten, da sie wieder Theme-übergreifende Stile einführen würden.',
            'tr' => 'V2 temaları kendi yalıtılmış görsel sistemini kullanır. Temalar arası stilleri yeniden karıştırmamak için eski global ana ve vurgu renkleri burada sunulmaz.',
        ],
        'settings.frontend.theme_type.luxury_dining' => [
            'en' => 'Luxury dining', 'de' => 'Luxusrestaurant', 'tr' => 'Lüks restoran',
        ],
        'settings.frontend.theme_type.modern_bistro' => [
            'en' => 'Modern bistro', 'de' => 'Modernes Bistro', 'tr' => 'Modern bistro',
        ],
        'settings.frontend.theme_type.fine_dining' => [
            'en' => 'Fine dining', 'de' => 'Gehobene Gastronomie', 'tr' => 'Üst düzey restoran',
        ],
        'settings.frontend.theme_type.japanese_omakase' => [
            'en' => 'Japanese / Omakase', 'de' => 'Japanisch / Omakase', 'tr' => 'Japon / Omakase',
        ],
        'settings.frontend.theme_type.mediterranean_seafood' => [
            'en' => 'Mediterranean / Seafood', 'de' => 'Mediterran / Meeresfrüchte', 'tr' => 'Akdeniz / Deniz ürünleri',
        ],
        'settings.frontend.theme_type.bar_nightlife' => [
            'en' => 'Bar / Nightlife', 'de' => 'Bar / Nachtleben', 'tr' => 'Bar / Gece hayatı',
        ],
        'settings.frontend.theme_type.premium_bar' => [
            'en' => 'Premium bar', 'de' => 'Premium-Bar', 'tr' => 'Premium bar',
        ],
        'settings.frontend.theme_type.persian_fine_dining' => [
            'en' => 'Persian fine dining', 'de' => 'Persische gehobene Gastronomie', 'tr' => 'İran mutfağı / üst düzey restoran',
        ],
        'settings.frontend.theme_type.turkish_grill' => [
            'en' => 'Turkish / Grill', 'de' => 'Türkisch / Grill', 'tr' => 'Türk / Izgara',
        ],
        'settings.frontend.theme_type.steakhouse' => [
            'en' => 'Steakhouse', 'de' => 'Steakhouse', 'tr' => 'Et restoranı',
        ],
    ];

    foreach (['en', 'de', 'tr'] as $locale) {
        $localized = [];
        foreach ($entries as $key => $values) {
            $localized[$key] = $values[$locale];
        }
        $path = 'app/admin/i18n/platform/'.$locale.'.php';
        $source[$path] = r6AddCanonical($source[$path], $localized, $locale);
    }

    $frontendPath = 'app/admin/views/pmdsettings/frontend.blade.php';
    $frontend = $source[$frontendPath];
    $bladeReplacements = [
        '<p>Select exactly one customer menu. V2 renders this theme server-side before first paint.</p>'
            => '<p>{{ $pmdSettingsText(\'Select exactly one customer menu. V2 renders this theme server-side before first paint.\') }}</p>',
        '<p>Languages guests can switch to. Menu translations still depend on translated content in the restaurant data.</p>'
            => '<p>{{ $pmdSettingsText(\'Languages guests can switch to. Menu translations still depend on translated content in the restaurant data.\') }}</p>',
        '<p>Only controls features that belong in the dine-in QR journey.</p>'
            => '<p>{{ $pmdSettingsText(\'Only controls features that belong in the dine-in QR journey.\') }}</p>',
        '<p style="margin:.35rem 0 .8rem;color:#667085">Applied only to new QR table orders after this setting is saved. Existing orders keep their frozen totals.</p>'
            => '<p style="margin:.35rem 0 .8rem;color:#667085">{{ $pmdSettingsText(\'Applied only to new QR table orders after this setting is saved. Existing orders keep their frozen totals.\') }}</p>',
        '<p>These destinations are optional. General restaurant social links also remain available in Restaurant profile.</p>'
            => '<p>{{ $pmdSettingsText(\'These destinations are optional. General restaurant social links also remain available in Restaurant profile.\') }}</p>',
        '<span class="pmd-toggle-row__copy"><strong>{{ $pmdSettingsText(\'Website shortcut\') }}</strong><small>Show the restaurant website shortcut in themes that support it.</small></span>'
            => '<span class="pmd-toggle-row__copy"><strong>{{ $pmdSettingsText(\'Website shortcut\') }}</strong><small>{{ $pmdSettingsText(\'Show the restaurant website shortcut in themes that support it.\') }}</small></span>',
        '<span class="pmd-toggle-row__copy"><strong>{{ $pmdSettingsText(\'Featured social shortcut\') }}</strong><small>Show one featured social or review destination.</small></span>'
            => '<span class="pmd-toggle-row__copy"><strong>{{ $pmdSettingsText(\'Featured social shortcut\') }}</strong><small>{{ $pmdSettingsText(\'Show one featured social or review destination.\') }}</small></span>',
        '<div class="pmd-compat-note"><strong>{{ $pmdSettingsText(\'Theme colors\') }}</strong><p>V2 themes keep their own isolated visual system. Legacy global primary/accent color overrides are intentionally not exposed here because they would reintroduce cross-theme styling.</p></div>'
            => '<div class="pmd-compat-note"><strong>{{ $pmdSettingsText(\'Theme colors\') }}</strong><p>{{ $pmdSettingsText(\'V2 themes keep their own isolated visual system. Legacy global primary/accent color overrides are intentionally not exposed here because they would reintroduce cross-theme styling.\') }}</p></div>',
    ];

    foreach ($bladeReplacements as $search => $replace) {
        if (strpos($frontend, $replace) !== false) continue;
        $frontend = r6ReplaceOnce($frontend, $search, $replace, 'Frontend Settings visible English block');
    }
    if (strpos($frontend, 'PMD_FRONTEND_SETTINGS_SERVER_I18N_R6') === false) {
        $frontend = str_replace(
            "@php\n    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16",
            "@php\n    // PMD_FRONTEND_SETTINGS_SERVER_I18N_R6\n    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16",
            $frontend
        );
    }
    $source[$frontendPath] = $frontend;

    $polishR5Path = 'app/admin/assets/js/pmd-settings-polish-r5.js';
    $polishR6Path = 'app/admin/assets/js/pmd-settings-polish-r6.js';
    $polish = $source[$polishR5Path];
    if (strpos($polish, 'PMD_SETTINGS_CLEAN_ROUTE_NORMALIZER_R6') === false) {
        $needle = "  var path = String((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname) || '').replace(/\\/+$/, '');\n";
        $replacement = $needle.<<<'JS'

  // PMD_SETTINGS_CLEAN_ROUTE_NORMALIZER_R6
  // The Admin exposes clean owner URLs while older Settings runtimes were
  // written against internal controller URLs. Normalize once so all Settings
  // authorities behave identically on both forms.
  var pmdSettingsAliasesR6 = Object.freeze({
    '/admin/settings': '/admin/pmdsettings',
    '/admin/settings/restaurant': '/admin/pmdsettings/restaurant',
    '/admin/settings/frontend': '/admin/pmdsettings/frontend',
    '/admin/settings/theme': '/admin/pmdsettings/frontend',
    '/admin/settings/customer-menu': '/admin/pmdsettings/frontend',
    '/admin/settings/customer-menu-theme': '/admin/pmdsettings/frontend',
    '/admin/settings/devices': '/admin/pmddevices',
    '/admin/settings/payments': '/admin/pmdfinance',
    '/admin/settings/finance': '/admin/pmdfinance',
    '/admin/team': '/admin/pmdteam'
  });
  path = pmdSettingsAliasesR6[path] || path;
JS;
        $polish = r6ReplaceOnce($polish, $needle, $replacement."\n", 'Settings Polish R5 path declaration');
    }
    $polish = "/* PMD_SETTINGS_POLISH_R6_CLEAN_ROUTE_AUTHORITY */\n".$polish;

    $stableR9Path = 'app/admin/assets/js/pmd-settings-stable-r9.js';
    $stableR10Path = 'app/admin/assets/js/pmd-settings-stable-r10.js';
    $stable = $source[$stableR9Path];
    $stableNeedle = "  var path = String((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname) || '').replace(/\\/+$/, '');\n";
    $stableReplacement = $stableNeedle.<<<'JS'

  // PMD_SETTINGS_STABLE_CLEAN_ROUTE_NORMALIZER_R10
  var pmdStableAliasesR10 = Object.freeze({
    '/admin/settings': '/admin/pmdsettings',
    '/admin/settings/restaurant': '/admin/pmdsettings/restaurant',
    '/admin/settings/frontend': '/admin/pmdsettings/frontend',
    '/admin/settings/theme': '/admin/pmdsettings/frontend',
    '/admin/settings/customer-menu': '/admin/pmdsettings/frontend',
    '/admin/settings/customer-menu-theme': '/admin/pmdsettings/frontend'
  });
  path = pmdStableAliasesR10[path] || path;
JS;
    $stable = r6ReplaceOnce($stable, $stableNeedle, $stableReplacement."\n", 'Settings Stable R9 path declaration');

    $setTextBlock = <<<'JS'
  function setText(node, value) {
    if (node && String(node.textContent || '') !== value) {
      node.textContent = value;
    }
  }
JS;
    $setTextReplacement = $setTextBlock.<<<'JS'

  // PMD_SETTINGS_STABLE_CANONICAL_COPY_R10
  function pmdStableT(key, fallback) {
    if (window.PMDPlatformMessages && typeof window.PMDPlatformMessages.t === 'function') {
      var value = window.PMDPlatformMessages.t(key, {}, fallback);
      if (typeof value === 'string' && value.trim() && value !== key) return value;
    }
    var messages = window.PMD_PLATFORM_MESSAGES || {};
    return typeof messages[key] === 'string' && messages[key].trim() ? messages[key] : fallback;
  }
JS;
    $stable = r6ReplaceOnce($stable, $setTextBlock, $setTextReplacement."\n", 'Settings Stable text helper');

    $stable = r6ReplaceOnce(
        $stable,
        "      'Customer menu theme'\n",
        "      pmdStableT('r3.customer_menu_theme', 'Customer menu theme')\n",
        'Settings Stable customer menu title'
    );
    $stable = r6ReplaceOnce(
        $stable,
        "      'Choose the look of your digital menu.'\n",
        "      pmdStableT('r4.settings.choose_look', 'Choose the look of your digital menu.')\n",
        'Settings Stable customer menu subtitle'
    );
    $stable = r6ReplaceOnce(
        $stable,
        "      'Save theme'\n",
        "      pmdStableT('settings.frontend.save_theme', 'Save theme')\n",
        'Settings Stable save theme copy'
    );
    $stable = "/* PMD_SETTINGS_STABLE_R10_CANONICAL_AUTHORITY */\n".$stable;

    $crawlerPath = 'app/admin/assets/js/pmd-admin-i18n-crawler-r6.js';
    $crawler = <<<'JS'
/* PMD_ADMIN_I18N_CRAWLER_R6
 * Same-origin authenticated Admin crawler.
 * It performs GET-only navigation in a hidden iframe and runs the canonical
 * visible-English audit inside each loaded page. No forms are submitted and
 * no restaurant/business data is changed.
 */
(function () {
  'use strict';

  if (window.PMDAdminI18nCrawlerR6) return;

  var VERSION = '6.0.0';
  var DEFAULT_ROUTES = [
    '/admin/dashboard',
    '/admin/manager',
    '/admin/accountant',
    '/admin/cashier',
    '/admin/orders',
    '/admin/reservations',
    '/admin/shifts',
    '/admin/coupons',
    '/admin/menu',
    '/admin/settings',
    '/admin/settings/restaurant',
    '/admin/settings/frontend',
    '/admin/settings/devices',
    '/admin/settings/payments'
  ];

  function normalizeUrl(value) {
    try {
      var url = new URL(value, window.location.origin);
      if (url.origin !== window.location.origin) return '';
      if (url.pathname.indexOf('/admin') !== 0) return '';
      if (/\/(logout|login|auth|api)(\/|$)/i.test(url.pathname)) return '';
      if (/\/(delete|destroy|remove)(\/|$)/i.test(url.pathname)) return '';
      url.hash = '';
      url.search = '';
      return url.pathname.replace(/\/+$/, '') || '/admin';
    } catch (error) {
      return '';
    }
  }

  function discover(documentRef) {
    var routes = [];
    try {
      documentRef.querySelectorAll('a[href]').forEach(function (anchor) {
        var path = normalizeUrl(anchor.href || anchor.getAttribute('href') || '');
        if (!path) return;
        if (/\/\d+(\/|$)/.test(path)) return;
        if (/\/(edit|create|new)(\/|$)/i.test(path)) return;
        routes.push(path);
      });
    } catch (error) {}
    return routes;
  }

  function unique(values) {
    var seen = Object.create(null);
    return values.filter(function (value) {
      value = normalizeUrl(value);
      if (!value || seen[value]) return false;
      seen[value] = true;
      return true;
    });
  }

  function frameLoad(route, timeoutMs) {
    return new Promise(function (resolve) {
      var frame = document.createElement('iframe');
      var settled = false;
      var timer;

      frame.setAttribute('aria-hidden', 'true');
      frame.tabIndex = -1;
      frame.style.cssText = 'position:fixed!important;width:1px!important;height:1px!important;left:-10000px!important;top:-10000px!important;opacity:0!important;pointer-events:none!important;border:0!important;';

      function finish(result) {
        if (settled) return;
        settled = true;
        if (timer) window.clearTimeout(timer);
        try { frame.remove(); } catch (error) {}
        resolve(result);
      }

      timer = window.setTimeout(function () {
        finish({route: route, status: 'timeout', count: null, leftovers: [], discovered: []});
      }, timeoutMs || 15000);

      frame.addEventListener('load', function () {
        window.setTimeout(function () {
          try {
            var win = frame.contentWindow;
            var doc = frame.contentDocument;
            if (!win || !doc) {
              finish({route: route, status: 'unavailable', count: null, leftovers: [], discovered: []});
              return;
            }

            var actual = normalizeUrl(win.location.href) || route;
            if (/\/admin\/(login|auth)/i.test(actual)) {
              finish({route: route, actual: actual, status: 'auth-redirect', count: null, leftovers: [], discovered: []});
              return;
            }

            var audit = null;
            if (win.PMDCanonicalVisibleAuditR5 && typeof win.PMDCanonicalVisibleAuditR5.audit === 'function') {
              audit = win.PMDCanonicalVisibleAuditR5.audit();
            } else if (win.PMDAdminCoverageR3 && typeof win.PMDAdminCoverageR3.audit === 'function') {
              audit = win.PMDAdminCoverageR3.audit();
            }

            finish({
              route: route,
              actual: actual,
              status: audit ? 'ok' : 'audit-missing',
              version: audit && audit.version ? audit.version : null,
              locale: audit && audit.locale ? audit.locale : null,
              count: audit && typeof audit.count === 'number' ? audit.count : null,
              leftovers: audit && Array.isArray(audit.leftovers) ? audit.leftovers : [],
              discovered: discover(doc)
            });
          } catch (error) {
            finish({route: route, status: 'error', error: String(error && error.message || error), count: null, leftovers: [], discovered: []});
          }
        }, 900);
      }, {once: true});

      frame.src = route + (route.indexOf('?') === -1 ? '?' : '&') + 'pmd_i18n_crawl_r6=1&_=' + Date.now();
      document.body.appendChild(frame);
    });
  }

  async function run(options) {
    options = options || {};
    var maxPages = Math.max(1, Math.min(Number(options.maxPages || 35), 60));
    var timeoutMs = Math.max(4000, Math.min(Number(options.timeoutMs || 15000), 30000));
    var queue = unique(DEFAULT_ROUTES.concat(discover(document), options.routes || []));
    var visited = Object.create(null);
    var pages = [];

    console.info('[PMD I18n Crawler R6] Starting', {routes: queue.length, maxPages: maxPages});

    while (queue.length && pages.length < maxPages) {
      var route = normalizeUrl(queue.shift());
      if (!route || visited[route]) continue;
      visited[route] = true;

      console.info('[PMD I18n Crawler R6] Auditing', route);
      var result = await frameLoad(route, timeoutMs);
      pages.push(result);

      (result.discovered || []).forEach(function (next) {
        next = normalizeUrl(next);
        if (!next || visited[next] || queue.indexOf(next) !== -1) return;
        queue.push(next);
      });
    }

    var leftovers = [];
    pages.forEach(function (page) {
      (page.leftovers || []).forEach(function (item) {
        leftovers.push(Object.assign({route: page.actual || page.route}, item));
      });
    });

    var report = {
      version: VERSION,
      origin: window.location.origin,
      locale: String(window.PMD_PLATFORM_MESSAGES_LOCALE || window.PMD_ADMIN_LOCALE || document.documentElement.lang || 'unknown'),
      auditedPages: pages.length,
      pagesWithLeftovers: pages.filter(function (page) { return Number(page.count || 0) > 0; }).length,
      totalLeftovers: leftovers.length,
      pages: pages.map(function (page) {
        return {
          route: page.route,
          actual: page.actual || page.route,
          status: page.status,
          version: page.version || null,
          locale: page.locale || null,
          count: page.count,
          leftovers: page.leftovers || [],
          error: page.error || null
        };
      }),
      leftovers: leftovers
    };

    console.info('[PMD I18n Crawler R6] Complete', report);
    if (leftovers.length) {
      try { console.table(leftovers); } catch (error) {}
    }
    window.PMD_LAST_I18N_CRAWL_R6 = report;
    return report;
  }

  window.PMDAdminI18nCrawlerR6 = Object.freeze({
    version: VERSION,
    run: run,
    defaults: function () { return DEFAULT_ROUTES.slice(); }
  });

  console.info('[PMD I18n Crawler R6] Ready');
})();
JS;

    $assetsPath = 'app/admin/views/_meta/assets.json';
    $assets = $source[$assetsPath];

    $oldPolish = <<<'JSON'
    {
      "path": "js/pmd-settings-polish-r5.js",
      "name": "pmd-settings-polish-r5-js"
    },
JSON;
    $newPolish = <<<'JSON'
    {
      "path": "js/pmd-settings-polish-r6.js",
      "name": "pmd-settings-polish-r6-js"
    },
JSON;
    $assets = r6ReplaceOnce($assets, $oldPolish, $newPolish, 'Settings Polish R5 asset entry');

    $oldStable = <<<'JSON'
    {
      "path": "js/pmd-settings-stable-r9.js",
      "name": "pmd-settings-stable-r9-js"
    },
JSON;
    $newStable = <<<'JSON'
    {
      "path": "js/pmd-settings-stable-r10.js",
      "name": "pmd-settings-stable-r10-js"
    },
    {
      "path": "js/pmd-admin-i18n-crawler-r6.js",
      "name": "pmd-admin-i18n-crawler-r6-js"
    },
JSON;
    $assets = r6ReplaceOnce($assets, $oldStable, $newStable, 'Settings Stable R9 asset entry');

    json_decode($assets, true, 512, JSON_THROW_ON_ERROR);

    $writes = [
        'app/admin/i18n/platform/en.php' => $source['app/admin/i18n/platform/en.php'],
        'app/admin/i18n/platform/de.php' => $source['app/admin/i18n/platform/de.php'],
        'app/admin/i18n/platform/tr.php' => $source['app/admin/i18n/platform/tr.php'],
        $frontendPath => $source[$frontendPath],
        $polishR6Path => $polish,
        $stableR10Path => $stable,
        $crawlerPath => $crawler,
        $assetsPath => $assets,
    ];

    $sudoUser = trim((string)getenv('SUDO_USER'));
    $home = $sudoUser !== '' && is_dir('/home/'.$sudoUser)
        ? '/home/'.$sudoUser
        : (getenv('HOME') ?: '/tmp');
    $backup = rtrim($home, '/').'/pmd-backups/admin-i18n-r6-'.date('Ymd_His');

    if (!mkdir($backup, 0755, true) && !is_dir($backup)) {
        throw new RuntimeException('Could not create backup directory '.$backup);
    }

    foreach ($paths as $path) {
        $src = $root.'/'.$path;
        $dest = $backup.'/'.$path;
        $dir = dirname($dest);
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new RuntimeException('Could not create backup subdirectory '.$dir);
        }
        if (!copy($src, $dest)) {
            throw new RuntimeException('Could not back up '.$path);
        }
    }

    foreach ($writes as $path => $content) {
        if ($content === '') {
            throw new RuntimeException('Refusing to write empty source: '.$path);
        }
        $dir = dirname($root.'/'.$path);
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new RuntimeException('Could not create target directory '.$dir);
        }
        if (file_put_contents($root.'/'.$path, $content) === false) {
            throw new RuntimeException('Could not write '.$path);
        }
    }

    echo "PMD R6 ADMIN I18N AUTHORITY + CRAWLER: APPLIED\n";
    echo "Backup: {$backup}\n";
    echo "Canonical frontend/settings keys added per locale: ".count($entries)."\n";
    echo "Settings Polish: clean routes normalized; R5 retired from manifest; R6 enabled\n";
    echo "Settings Stable: R9 retired from manifest; R10 uses canonical locale keys\n";
    echo "Frontend Settings: hard-coded explanatory English moved through canonical settings catalogue\n";
    echo "Authenticated crawler: window.PMDAdminI18nCrawlerR6.run()\n";
    echo "No tenant/payment/currency/order/reservation/business data changed.\n";
} catch (Throwable $error) {
    fwrite(STDERR, 'ERROR: '.$error->getMessage()."\n");
    exit(1);
}
