<?php

declare(strict_types=1);

$options = getopt('', ['root::']);
$root = rtrim((string)($options['root'] ?? '/var/www/paymydine'), '/');

function r4Read(string $root, string $path): string
{
    $content = @file_get_contents($root.'/'.$path);
    if ($content === false || $content === '') {
        throw new RuntimeException('Could not read '.$path);
    }
    return $content;
}

function r4ReplaceOnce(string $content, string $search, string $replace, string $label): string
{
    $count = substr_count($content, $search);
    if ($count !== 1) {
        throw new RuntimeException("Expected exactly one {$label}; found {$count}. No source was written.");
    }
    return str_replace($search, $replace, $content);
}

function r4AddMessages(string $content, array $messages): string
{
    $missing = [];
    foreach ($messages as $key => $value) {
        if (strpos($content, var_export($key, true).' =>') === false) {
            $missing[$key] = $value;
        }
    }
    if (!$missing) return $content;

    $pos = strrpos($content, "\n];");
    if ($pos === false) {
        throw new RuntimeException('Could not find language array closing marker.');
    }

    $lines = ["", "    // PMD_R4_SETTINGS_DEVICES_CANONICAL_I18N"];
    foreach ($missing as $key => $value) {
        $lines[] = '    '.var_export($key, true).' => '.var_export($value, true).',';
    }
    $block = implode("\n", $lines)."\n";
    return substr($content, 0, $pos).$block.substr($content, $pos);
}

$paths = [
    'app/admin/i18n/platform/en.php',
    'app/admin/i18n/platform/de.php',
    'app/admin/i18n/platform/tr.php',
    'app/admin/assets/js/pmd-settings-polish-r4.js',
    'app/admin/assets/css/pmd-devices-settings-prune-r12.css',
    'app/admin/assets/js/pmd-admin-coverage-r3.js',
    'app/admin/assets/js/pmd-menu-runtime-stability.js',
];

$translations = [
    'r4.settings.png_help' => [
        'en' => 'PNG, JPG or WEBP · max 5 MB.',
        'de' => 'PNG, JPG oder WEBP · max. 5 MB.',
        'tr' => 'PNG, JPG veya WEBP · en fazla 5 MB.',
    ],
    'r4.settings.shown_menu' => [
        'en' => 'Shown on your digital menu.',
        'de' => 'Wird in Ihrem digitalen Menü angezeigt.',
        'tr' => 'Dijital menünüzde gösterilir.',
    ],
    'r4.settings.shown_guests' => [
        'en' => 'Shown to guests on your digital menu.',
        'de' => 'Wird Gästen in Ihrem digitalen Menü angezeigt.',
        'tr' => 'Dijital menünüzde misafirlere gösterilir.',
    ],
    'r4.settings.choose_look' => [
        'en' => 'Choose the look of your digital menu.',
        'de' => 'Wählen Sie das Erscheinungsbild Ihres digitalen Menüs.',
        'tr' => 'Dijital menünüzün görünümünü seçin.',
    ],
    'r4.settings.choose_theme' => [
        'en' => 'Choose a theme for your digital menu.',
        'de' => 'Wählen Sie ein Design für Ihr digitales Menü.',
        'tr' => 'Dijital menünüz için bir tema seçin.',
    ],
    'r4.settings.add_staff' => [
        'en' => 'Add staff and manage who can sign in.',
        'de' => 'Mitarbeiter hinzufügen und Anmeldeberechtigungen verwalten.',
        'tr' => 'Personel ekleyin ve kimlerin giriş yapabileceğini yönetin.',
    ],
    'r4.settings.builtin_roles' => [
        'en' => 'Built-in roles for your team.',
        'de' => 'Vordefinierte Rollen für Ihr Team.',
        'tr' => 'Ekibiniz için hazır roller.',
    ],
    'r4.devices.overview_help' => [
        'en' => 'Payment terminals, kitchen displays and cash drawers.',
        'de' => 'Zahlungsterminals, Küchenanzeigen und Kassenschubladen.',
        'tr' => 'Ödeme terminalleri, mutfak ekranları ve nakit çekmeceleri.',
    ],
    'r4.devices.connected_help' => [
        'en' => 'See your connected devices in one place.',
        'de' => 'Ihre verbundenen Geräte auf einen Blick.',
        'tr' => 'Bağlı cihazlarınızı tek bir yerde görün.',
    ],
    'r4.devices.pos_help' => [
        'en' => 'POS screens used by your team.',
        'de' => 'POS-Bildschirme, die Ihr Team verwendet.',
        'tr' => 'Ekibinizin kullandığı POS ekranları.',
    ],
    'r4.devices.card_reader_help' => [
        'en' => 'Card readers connected to PayMyDine.',
        'de' => 'Mit PayMyDine verbundene Kartenleser.',
        'tr' => 'PayMyDine’a bağlı kart okuyucular.',
    ],
    'r4.devices.kitchen_help' => [
        'en' => 'Kitchen screens for your orders.',
        'de' => 'Küchenanzeigen für Ihre Bestellungen.',
        'tr' => 'Siparişleriniz için mutfak ekranları.',
    ],
    'r4.devices.cash_drawer_help' => [
        'en' => 'Cash drawers connected to your POS.',
        'de' => 'Mit Ihrem POS verbundene Kassenschubladen.',
        'tr' => 'POS’unuza bağlı nakit çekmeceleri.',
    ],
    'r4.devices.staff_signin_help' => [
        'en' => 'Devices used for staff sign-in.',
        'de' => 'Geräte für die Mitarbeiteranmeldung.',
        'tr' => 'Personel girişi için kullanılan cihazlar.',
    ],
    'r4.devices.extra_setup_help' => [
        'en' => 'Extra device connections and setup.',
        'de' => 'Zusätzliche Geräteverbindungen und Einrichtung.',
        'tr' => 'Ek cihaz bağlantıları ve kurulum.',
    ],
    'r4.finance.choose_pay' => [
        'en' => 'Choose how guests can pay.',
        'de' => 'Wählen Sie, wie Gäste bezahlen können.',
        'tr' => 'Misafirlerin nasıl ödeme yapacağını seçin.',
    ],
    'r4.finance.tax_invoice' => [
        'en' => 'Set VAT, receipts and invoice details.',
        'de' => 'MwSt., Belege und Rechnungsdetails festlegen.',
        'tr' => 'KDV, fiş ve fatura ayrıntılarını ayarlayın.',
    ],
    'r4.finance.fiskaly' => [
        'en' => 'Set up Fiskaly and TSE for Germany.',
        'de' => 'Fiskaly und TSE für Deutschland einrichten.',
        'tr' => 'Almanya için Fiskaly ve TSE’yi yapılandırın.',
    ],
    'r4.settings.remove_logo' => [
        'en' => 'Remove logo',
        'de' => 'Logo entfernen',
        'tr' => 'Logoyu kaldır',
    ],
    'r4.settings.no_logo' => [
        'en' => 'No restaurant logo selected',
        'de' => 'Kein Restaurantlogo ausgewählt',
        'tr' => 'Restoran logosu seçilmedi',
    ],
    'r4.settings.logo_preview' => [
        'en' => 'Selected restaurant logo preview',
        'de' => 'Vorschau des ausgewählten Restaurantlogos',
        'tr' => 'Seçilen restoran logosu önizlemesi',
    ],
];

try {
    $patched = [];
    foreach ($paths as $path) {
        if (!is_file($root.'/'.$path)) {
            throw new RuntimeException('Required source missing: '.$path);
        }
        $patched[$path] = r4Read($root, $path);
    }

    if (strpos($patched['app/admin/assets/js/pmd-admin-coverage-r3.js'], 'PMD_ADMIN_COVERAGE_R3_CLEAN') === false) {
        throw new RuntimeException('R3 coverage runtime marker is missing.');
    }
    if (strpos($patched['app/admin/assets/js/pmd-menu-runtime-stability.js'], 'PMD_MENU_ROOT_ADOPTION_R3_CLEAN') === false) {
        throw new RuntimeException('R3 Menu root-adoption marker is missing.');
    }

    foreach (['en', 'de', 'tr'] as $locale) {
        $entries = [];
        foreach ($translations as $key => $row) {
            $entries[$key] = $row[$locale];
        }
        $langPath = 'app/admin/i18n/platform/'.$locale.'.php';
        $patched[$langPath] = r4AddMessages($patched[$langPath], $entries);
    }

    $settingsPath = 'app/admin/assets/js/pmd-settings-polish-r4.js';
    if (strpos($patched[$settingsPath], 'PMD_SETTINGS_POLISH_CATALOGUE_I18N_R4') === false) {
        $old = <<<'JS'
  function text(node, value) {
    if (node && String(node.textContent || '') !== value) {
      node.textContent = value;
    }
  }
JS;
        $new = <<<'JS'
  // PMD_SETTINGS_POLISH_CATALOGUE_I18N_R4
  function localized(value) {
    var clean = String(value == null ? '' : value);

    if (window.PMDAdminI18n && typeof window.PMDAdminI18n.translate === 'function') {
      var translated = window.PMDAdminI18n.translate(clean);
      if (translated && translated !== clean) return translated;
    }

    var current = window.PMD_PLATFORM_MESSAGES || {};
    var english = window.PMD_PLATFORM_MESSAGES_ENGLISH || {};
    var keys = Object.keys(english);
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (english[key] === clean && typeof current[key] === 'string' && current[key].trim()) {
        return current[key];
      }
    }

    return clean;
  }

  function text(node, value) {
    value = localized(value);
    if (node && String(node.textContent || '') !== value) {
      node.textContent = value;
    }
  }
JS;
        $patched[$settingsPath] = r4ReplaceOnce($patched[$settingsPath], $old, $new, 'Settings Polish text helper');

        $patched[$settingsPath] = r4ReplaceOnce(
            $patched[$settingsPath],
            "['#hardware-overview', 'See your connected devices in one place.'],",
            "['#hardware-overview', 'Payment terminals, kitchen displays and cash drawers.'],",
            'Devices overview copy'
        );

        $patched[$settingsPath] = r4ReplaceOnce(
            $patched[$settingsPath],
            "preview.innerHTML = '<span class=\"pmd-profile-logo-empty-r19\">No restaurant logo selected</span>';",
            "preview.innerHTML = '<span class=\"pmd-profile-logo-empty-r19\">' + localized('No restaurant logo selected') + '</span>';",
            'Logo empty copy'
        );

        $patched[$settingsPath] = r4ReplaceOnce(
            $patched[$settingsPath],
            "preview.innerHTML = preview.__pmdOriginalLogoR4 || '<span class=\"pmd-profile-logo-empty-r19\">No restaurant logo selected</span>';",
            "preview.innerHTML = preview.__pmdOriginalLogoR4 || '<span class=\"pmd-profile-logo-empty-r19\">' + localized('No restaurant logo selected') + '</span>';",
            'Logo restore copy'
        );

        $patched[$settingsPath] = r4ReplaceOnce(
            $patched[$settingsPath],
            "image.alt = 'Selected restaurant logo preview';",
            "image.alt = localized('Selected restaurant logo preview');",
            'Logo preview alt'
        );
    }

    $cssPath = 'app/admin/assets/css/pmd-devices-settings-prune-r12.css';
    if (strpos($patched[$cssPath], 'PMD_DEVICES_REAL_TEXT_I18N_R4') === false) {
        $patched[$cssPath] .= <<<'CSS'

/* PMD_DEVICES_REAL_TEXT_I18N_R4
 * Do not inject English through CSS generated content. The real DOM copy is
 * localized by the canonical platform catalogue.
 */
html body #pmd-devices-page #hardware-overview
.pmd-owner-card__title p {
  font-size: 12.5px !important;
  line-height: 1.45 !important;
}

html body #pmd-devices-page #hardware-overview
.pmd-owner-card__title p::after {
  content: none !important;
  display: none !important;
}
CSS;
    }

    $auditPath = 'app/admin/assets/js/pmd-admin-coverage-r3.js';
    if (strpos($patched[$auditPath], 'PMD_ADMIN_DYNAMIC_CATALOGUE_AUDIT_R4') === false) {
        $old = <<<'JS'
    function audit() {
        var leftovers = [];
        var seen = Object.create(null);
        Object.keys(sourceToKey).forEach(function (source) {
            document.querySelectorAll('body *').forEach(function (node) {
                if (node.children.length) return;
                if (String(node.textContent || '').replace(/\s+/g,' ').trim() !== source) return;
                var key = source + '|' + (node.tagName || '');
                if (seen[key]) return;
                seen[key] = true;
                leftovers.push({source: source, tag: node.tagName, key: sourceToKey[source]});
            });
        });
        return {version:'3.1.0-clean', locale:locale, count:leftovers.length, leftovers:leftovers};
    }
JS;
        $new = <<<'JS'
    // PMD_ADMIN_DYNAMIC_CATALOGUE_AUDIT_R4
    function audit() {
        var leftovers = [];
        var seen = Object.create(null);

        function translatedValue(source) {
            var clean = String(source == null ? '' : source).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
            if (!clean || locale === 'en') return clean;

            if (window.PMDAdminI18n && typeof window.PMDAdminI18n.translate === 'function') {
                var shared = window.PMDAdminI18n.translate(clean);
                if (shared && shared !== clean) return shared;
            }

            var local = translate(clean);
            return local && local !== clean ? local : clean;
        }

        function add(source, node, kind) {
            var clean = String(source == null ? '' : source).replace(/^['"]|['"]$/g, '').replace(/\s+/g, ' ').trim();
            if (!clean || clean === 'none' || clean === 'normal') return;
            var translated = translatedValue(clean);
            if (!translated || translated === clean) return;

            var key = kind + '|' + clean + '|' + (node && node.tagName || '');
            if (seen[key]) return;
            seen[key] = true;
            leftovers.push({source: clean, translated: translated, tag: node && node.tagName || null, kind: kind});
        }

        document.querySelectorAll('body *').forEach(function (node) {
            if (node.matches('script,style,textarea,code,pre')) return;
            if (node.children.length === 0) add(node.textContent || '', node, 'text');

            ['title','aria-label','placeholder','data-original-title','data-title'].forEach(function (attribute) {
                if (node.hasAttribute(attribute)) add(node.getAttribute(attribute) || '', node, attribute);
            });

            ['::before','::after'].forEach(function (pseudo) {
                try {
                    var content = window.getComputedStyle(node, pseudo).getPropertyValue('content');
                    if (content && content !== 'none' && content !== 'normal' && content !== '""') {
                        add(content, node, pseudo);
                    }
                } catch (error) {}
            });
        });

        return {version:'4.0.0-dynamic', locale:locale, count:leftovers.length, leftovers:leftovers};
    }
JS;
        $patched[$auditPath] = r4ReplaceOnce($patched[$auditPath], $old, $new, 'R3 audit function');
    }

    $menuPath = 'app/admin/assets/js/pmd-menu-runtime-stability.js';
    if (strpos($patched[$menuPath], 'PMD_MENU_NO_RELOAD_R4') === false) {
        $old = <<<'JS'
        if (!previous || now - previous >= 10000) {
            try { sessionStorage.setItem(key, String(now)); } catch (error) {}
            window.location.reload();
            return;
        }

        var liveRoot = currentRoot();
JS;
        $new = <<<'JS'
        // PMD_MENU_NO_RELOAD_R4
        // Root replacement is an in-page lifecycle event. Reloading the whole
        // document can create a tenant-specific reload loop, so always adopt
        // the current server-rendered root instead.
        try { sessionStorage.setItem(key, String(now)); } catch (error) {}

        var liveRoot = currentRoot();
JS;
        $patched[$menuPath] = r4ReplaceOnce($patched[$menuPath], $old, $new, 'Menu reload branch');
    }

    foreach ($patched as $path => $content) {
        if ($content === '') throw new RuntimeException('Refusing to write empty source: '.$path);
    }

    $sudoUser = trim((string)getenv('SUDO_USER'));
    $home = $sudoUser !== '' && is_dir('/home/'.$sudoUser) ? '/home/'.$sudoUser : (getenv('HOME') ?: '/tmp');
    $backup = rtrim($home, '/').'/pmd-backups/devices-menu-r4-'.date('Ymd_His');
    if (!mkdir($backup, 0755, true) && !is_dir($backup)) {
        throw new RuntimeException('Could not create backup directory '.$backup);
    }

    foreach ($paths as $path) {
        $source = $root.'/'.$path;
        $dest = $backup.'/'.$path;
        $dir = dirname($dest);
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new RuntimeException('Could not create backup subdirectory '.$dir);
        }
        if (!copy($source, $dest)) throw new RuntimeException('Could not back up '.$path);
    }

    foreach ($patched as $path => $content) {
        if (file_put_contents($root.'/'.$path, $content) === false) {
            throw new RuntimeException('Could not write '.$path);
        }
    }

    echo "PMD R4 DEVICES I18N + MENU NO-RELOAD: APPLIED\n";
    echo "Backup: {$backup}\n";
    echo "Canonical settings/device keys: ".count($translations)." per locale\n";
    echo "Devices CSS generated English: disabled\n";
    echo "Settings Polish hard-coded copy: catalogue-driven\n";
    echo "Coverage audit: dynamic catalogue + pseudo-content aware\n";
    echo "Menu automatic document reload: disabled; root adoption remains active\n";
    echo "No tenant/payment/currency/order/reservation/business data changed.\n";
} catch (Throwable $error) {
    fwrite(STDERR, 'ERROR: '.$error->getMessage()."\n");
    exit(1);
}
