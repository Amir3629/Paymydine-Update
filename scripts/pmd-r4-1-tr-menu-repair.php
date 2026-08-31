<?php

declare(strict_types=1);

$options = getopt('', ['root::']);
$root = rtrim((string)($options['root'] ?? '/var/www/paymydine'), '/');

function r41Read(string $root, string $path): string
{
    $value = @file_get_contents($root.'/'.$path);
    if ($value === false || $value === '') {
        throw new RuntimeException('Could not read '.$path);
    }
    return $value;
}

function r41ReplaceOnce(string $content, string $search, string $replace, string $label): string
{
    $count = substr_count($content, $search);
    if ($count !== 1) {
        throw new RuntimeException("Expected exactly one {$label}; found {$count}. No source was written.");
    }
    return str_replace($search, $replace, $content);
}

/** @param array<string,string> $entries */
function r41AddCanonical(string $content, array $entries, string $locale, string $marker): string
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

        $lines = ["", "    // {$marker}"];
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

    $lines = ["", "    // {$marker}"];
    foreach ($missing as $key => $value) {
        $lines[] = '    '.var_export($key, true).' => '.var_export($value, true).',';
    }
    $block = implode("\n", $lines)."\n";
    return substr($content, 0, $pos).$block.substr($content, $pos);
}

function r41RemoveMisplacedTurkishR4(string $content, array $keys): string
{
    $literalPos = strpos($content, "\n\$literals = [");
    if ($literalPos === false) {
        throw new RuntimeException('Turkish literal section was not found for cleanup.');
    }

    $before = substr($content, 0, $literalPos);
    $literal = substr($content, $literalPos);

    foreach ($keys as $key) {
        $quoted = preg_quote(var_export($key, true), '/');
        $pattern = '/^[ \t]*'.$quoted.'[ \t]*=>[^\r\n]*,\r?\n/m';
        $literal = preg_replace($pattern, '', $literal) ?? $literal;
    }

    $literal = preg_replace(
        '/^[ \t]*\/\/ PMD_R4_SETTINGS_DEVICES_CANONICAL_I18N\r?\n/m',
        '',
        $literal
    ) ?? $literal;

    return $before.$literal;
}

$paths = [
    'app/admin/i18n/platform/en.php',
    'app/admin/i18n/platform/de.php',
    'app/admin/i18n/platform/tr.php',
    'app/admin/assets/js/pmd-settings-polish-r4.js',
    'app/admin/assets/js/pmd-menu-runtime-stability.js',
    'app/admin/assets/js/smooth-transitions.js',
    'app/admin/views/pmdmenus/index.blade.php',
];

$r4Keys = [
    'r4.devices.card_reader_help',
    'r4.devices.cash_drawer_help',
    'r4.devices.connected_help',
    'r4.devices.extra_setup_help',
    'r4.devices.kitchen_help',
    'r4.devices.overview_help',
    'r4.devices.pos_help',
    'r4.devices.staff_signin_help',
    'r4.finance.choose_pay',
    'r4.finance.fiskaly',
    'r4.finance.tax_invoice',
    'r4.settings.add_staff',
    'r4.settings.builtin_roles',
    'r4.settings.choose_look',
    'r4.settings.choose_theme',
    'r4.settings.logo_preview',
    'r4.settings.no_logo',
    'r4.settings.png_help',
    'r4.settings.remove_logo',
    'r4.settings.shown_guests',
    'r4.settings.shown_menu',
];

$menuKeys = [
    'menu.manager.title' => [
        'en' => 'Menu',
        'de' => 'Menü',
        'tr' => 'Menü',
    ],
    'menu.manager.kitchen_capacity' => [
        'en' => 'Kitchen capacity',
        'de' => 'Küchenkapazität',
        'tr' => 'Mutfak kapasitesi',
    ],
    'menu.manager.food_attributes' => [
        'en' => 'Food attributes',
        'de' => 'Speiseneigenschaften',
        'tr' => 'Ürün özellikleri',
    ],
];

try {
    $patched = [];
    foreach ($paths as $path) {
        if (!is_file($root.'/'.$path)) {
            throw new RuntimeException('Required source missing: '.$path);
        }
        $patched[$path] = r41Read($root, $path);
    }

    if (strpos($patched['app/admin/assets/js/pmd-settings-polish-r4.js'], 'PMD_SETTINGS_POLISH_CATALOGUE_I18N_R4') === false) {
        throw new RuntimeException('R4 Settings catalogue marker is missing.');
    }
    if (strpos($patched['app/admin/assets/js/pmd-menu-runtime-stability.js'], 'PMD_MENU_NO_RELOAD_R4') === false) {
        throw new RuntimeException('R4 Menu no-reload marker is missing.');
    }

    // R4 accidentally appended its Turkish keys to $literals because tr.php
    // intentionally contains two arrays. Recover the translations from the
    // running file itself so Turkish wording remains owned by tr.php.
    $trRuntime = require $root.'/app/admin/i18n/platform/tr.php';
    if (!is_array($trRuntime)) {
        throw new RuntimeException('Turkish platform catalogue did not return an array.');
    }

    $trRepair = [];
    foreach ($r4Keys as $key) {
        if (isset($trRuntime[$key]) && is_string($trRuntime[$key])) {
            $trRepair[$key] = $trRuntime[$key];
            continue;
        }
        $literalKey = 'literal::'.$key;
        if (!isset($trRuntime[$literalKey]) || !is_string($trRuntime[$literalKey])) {
            throw new RuntimeException('Could not recover Turkish R4 value for '.$key);
        }
        $trRepair[$key] = $trRuntime[$literalKey];
    }

    $trPath = 'app/admin/i18n/platform/tr.php';
    $patched[$trPath] = r41AddCanonical(
        $patched[$trPath],
        $trRepair,
        'tr',
        'PMD_R4_1_TR_CANONICAL_REPAIR'
    );
    $patched[$trPath] = r41RemoveMisplacedTurkishR4($patched[$trPath], $r4Keys);

    foreach (['en', 'de', 'tr'] as $locale) {
        $entries = [];
        foreach ($menuKeys as $key => $values) {
            $entries[$key] = $values[$locale];
        }
        $path = 'app/admin/i18n/platform/'.$locale.'.php';
        $patched[$path] = r41AddCanonical(
            $patched[$path],
            $entries,
            $locale,
            'PMD_R4_1_MENU_CANONICAL_I18N'
        );
    }

    // Settings Polish can execute before the platform catalogue is ready.
    // Re-run once the full page has loaded and once shortly afterwards.
    $settingsPath = 'app/admin/assets/js/pmd-settings-polish-r4.js';
    if (strpos($patched[$settingsPath], 'PMD_SETTINGS_POLISH_LATE_I18N_R4_1') === false) {
        $old = <<<'JS'
  document.addEventListener('pageContentLoaded', boot, false);
  window.addEventListener('pageshow', boot, false);
})();
JS;
        $new = <<<'JS'
  document.addEventListener('pageContentLoaded', boot, false);
  window.addEventListener('pageshow', boot, false);

  // PMD_SETTINGS_POLISH_LATE_I18N_R4_1
  // Global assets may execute before the platform message catalogue is ready.
  // Re-run catalogue-driven copy after the full page lifecycle settles.
  window.addEventListener('load', boot, {once: true});
  window.setTimeout(boot, 250);
})();
JS;
        $patched[$settingsPath] = r41ReplaceOnce(
            $patched[$settingsPath],
            $old,
            $new,
            'Settings Polish lifecycle tail'
        );
    }

    // The clean Menu route must never be loaded through the old page-content
    // AJAX transition. Menu owns multiple script bootstraps that require a full
    // document navigation.
    $smoothPath = 'app/admin/assets/js/smooth-transitions.js';
    if (strpos($patched[$smoothPath], 'PMD_MENU_FULL_DOCUMENT_NAV_R4_1') === false) {
        $old = <<<'JS'
            '/admin/dashboard',
            '/admin/shifts',
            '/admin',
JS;
        $new = <<<'JS'
            '/admin/dashboard',
            '/admin/shifts',
            // PMD_MENU_FULL_DOCUMENT_NAV_R4_1
            '/admin/menu',
            '/admin/pmdmenus',
            '/admin',
JS;
        $patched[$smoothPath] = r41ReplaceOnce(
            $patched[$smoothPath],
            $old,
            $new,
            'Smooth transition no-AJAX menu routes'
        );
    }

    $menuView = 'app/admin/views/pmdmenus/index.blade.php';
    if (strpos($patched[$menuView], 'PMD_MENU_SERVER_I18N_R4_1') === false) {
        $old = <<<'BLADE'
    $pmdT = static function ($key) use ($pmdMenuCopy) {
        return $pmdMenuCopy[(string)$key] ?? (string)$key;
    };

    // PMD_ALLERGEN_DISPLAY_I18N_V14
BLADE;
        $new = <<<'BLADE'
    $pmdT = static function ($key) use ($pmdMenuCopy) {
        return $pmdMenuCopy[(string)$key] ?? (string)$key;
    };

    // PMD_MENU_SERVER_I18N_R4_1
    $pmdCategoryDisplayName = static function ($category) use ($pmdMenuPlatformMessages) {
        $name = trim((string)($category->name ?? ''));
        $kind = strtolower(trim((string)($category->pmd_kind ?? 'regular')));

        if ($kind === 'chef') {
            return $pmdMenuPlatformMessages['menu.smart.chef'] ?? $name;
        }
        if ($kind === 'bestseller') {
            return $pmdMenuPlatformMessages['menu.smart.bestseller'] ?? $name;
        }
        if ($kind === 'combos') {
            return $pmdMenuPlatformMessages['menu.smart.combos'] ?? $name;
        }

        return $name;
    };

    // PMD_ALLERGEN_DISPLAY_I18N_V14
BLADE;
        $patched[$menuView] = r41ReplaceOnce(
            $patched[$menuView],
            $old,
            $new,
            'Menu server translation helper'
        );

        $patched[$menuView] = r41ReplaceOnce(
            $patched[$menuView],
            '<h1 class="pmd-r2-clean-title">Menu</h1>',
            '<h1 class="pmd-r2-clean-title">{{ $pmdT(\'title\') }}</h1>',
            'Menu H1'
        );

        $old = <<<'BLADE'
                aria-label="Kitchen capacity"
                title="Kitchen capacity"
BLADE;
        $new = <<<'BLADE'
                aria-label="{{ $pmdT('kitchen_capacity') }}"
                title="{{ $pmdT('kitchen_capacity') }}"
BLADE;
        $patched[$menuView] = r41ReplaceOnce(
            $patched[$menuView],
            $old,
            $new,
            'Kitchen capacity labels'
        );

        $old = <<<'JS'
        trigger.setAttribute(
          'aria-label',
          'Notifications'
        );
        trigger.setAttribute(
          'title',
          'Notifications'
        );
JS;
        $new = <<<'JS'
        var pmdMenuNotificationLabel = @json($pmdT('notifications'));
        trigger.setAttribute(
          'aria-label',
          pmdMenuNotificationLabel
        );
        trigger.setAttribute(
          'title',
          pmdMenuNotificationLabel
        );
JS;
        $patched[$menuView] = r41ReplaceOnce(
            $patched[$menuView],
            $old,
            $new,
            'Menu notification labels'
        );

        $patched[$menuView] = r41ReplaceOnce(
            $patched[$menuView],
            '<span class="pmd-menu-manager__category-label">{{ $category->name }}</span>',
            '<span class="pmd-menu-manager__category-label">{{ $pmdCategoryDisplayName($category) }}</span>',
            'Menu category display label'
        );

        $old = <<<'BLADE'
        @php
            $pmdServerAddFoodTitle = $pmdMenuLocale === 'de'
                ? 'Neue Speise hinzufugen'
                : 'Add new food item';
            $pmdServerAddFoodHelp = $pmdMenuLocale === 'de'
                ? 'Erstelle eine neue Speise.'
                : 'Create a new food item.';
        @endphp
BLADE;
        $new = <<<'BLADE'
        @php
            $pmdServerAddFoodTitle = $pmdMenuPlatformMessages['menu.smart.add_food']
                ?? $pmdT('create_food');
            $pmdServerAddFoodHelp = $pmdMenuPlatformMessages['menu.smart.add_food_help']
                ?? '';
        @endphp
BLADE;
        $patched[$menuView] = r41ReplaceOnce(
            $patched[$menuView],
            $old,
            $new,
            'Menu server action card copy'
        );

        $patched[$menuView] = r41ReplaceOnce(
            $patched[$menuView],
            'aria-label="Food attributes"',
            'aria-label="{{ $pmdT(\'food_attributes\') }}"',
            'Food attributes aria label'
        );
    }

    // Runtime Stability used to re-write the action card with an EN/DE-only
    // branch before Smart Categories became ready. Keep the early bridge, but
    // obtain its copy from the same platform catalogue as Smart Categories.
    $runtimePath = 'app/admin/assets/js/pmd-menu-runtime-stability.js';
    if (strpos($patched[$runtimePath], 'PMD_MENU_RUNTIME_CATALOGUE_COPY_R4_1') === false) {
        $old = <<<'JS'
    function currentLocaleIsGerman() {
        var match = document.cookie.match(
            /(?:^|; )pmd_admin_locale=([^;]+)/
        );
        var locale = String(
            (match && match[1])
            || document.documentElement.lang
            || 'en'
        ).toLowerCase();
        return locale.indexOf('de') === 0;
    }
JS;
        $new = <<<'JS'
    // PMD_MENU_RUNTIME_CATALOGUE_COPY_R4_1
    function platformMenuText(key, fallback) {
        var runtime = window.PMDPlatformMessages;
        if (runtime && typeof runtime.t === 'function') {
            return runtime.t(key, {}, fallback || key);
        }

        var messages = window.PMD_PLATFORM_MESSAGES || {};
        var value = messages[key];
        return typeof value === 'string' && value.trim()
            ? value
            : (fallback || key);
    }
JS;
        $patched[$runtimePath] = r41ReplaceOnce(
            $patched[$runtimePath],
            $old,
            $new,
            'Menu runtime locale helper'
        );

        $old = <<<'JS'
        var de = currentLocaleIsGerman();
        var nextTitle = de
            ? 'Neue Speise hinzufugen'
            : 'Add new food item';
        var nextHelp = categoryLabel
            ? (
                de
                    ? 'Erstelle eine neue Speise in ' + categoryLabel + '.'
                    : 'Create a new food item in ' + categoryLabel + '.'
            )
            : (
                de
                    ? 'Erstelle eine neue Speise.'
                    : 'Create a new food item.'
            );
JS;
        $new = <<<'JS'
        var nextTitle = platformMenuText(
            'menu.smart.add_food',
            'Add new food item'
        );
        var nextHelp = categoryLabel
            ? platformMenuText(
                'menu.smart.add_food_help_category',
                'Create a new food item in {category}.'
            ).replace('{category}', categoryLabel)
            : platformMenuText(
                'menu.smart.add_food_help',
                'Create a new food item.'
            );
JS;
        $patched[$runtimePath] = r41ReplaceOnce(
            $patched[$runtimePath],
            $old,
            $new,
            'Menu runtime action-card copy'
        );
    }

    foreach ($patched as $path => $content) {
        if ($content === '') {
            throw new RuntimeException('Refusing to write empty source: '.$path);
        }
    }

    // Verify repaired Turkish catalogue in memory before any source write.
    $tmp = tempnam(sys_get_temp_dir(), 'pmd-r41-tr-');
    if ($tmp === false) throw new RuntimeException('Could not create Turkish validation file.');
    file_put_contents($tmp, $patched[$trPath]);
    $testTr = require $tmp;
    @unlink($tmp);
    if (!is_array($testTr)) throw new RuntimeException('Repaired Turkish catalogue is invalid.');
    foreach ($r4Keys as $key) {
        if (!array_key_exists($key, $testTr)) {
            throw new RuntimeException('Turkish canonical repair still missing '.$key);
        }
    }
    foreach (array_keys($menuKeys) as $key) {
        if (!array_key_exists($key, $testTr)) {
            throw new RuntimeException('Turkish Menu key missing '.$key);
        }
    }

    $sudoUser = trim((string)getenv('SUDO_USER'));
    $home = $sudoUser !== '' && is_dir('/home/'.$sudoUser)
        ? '/home/'.$sudoUser
        : (getenv('HOME') ?: '/tmp');
    $backup = rtrim($home, '/').'/pmd-backups/tr-menu-r4-1-'.date('Ymd_His');
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
        if (!copy($source, $dest)) {
            throw new RuntimeException('Could not back up '.$path);
        }
    }

    foreach ($patched as $path => $content) {
        if (file_put_contents($root.'/'.$path, $content) === false) {
            throw new RuntimeException('Could not write '.$path);
        }
    }

    echo "PMD R4.1 TURKISH + MENU REPAIR: APPLIED\n";
    echo "Backup: {$backup}\n";
    echo "Turkish R4 canonical keys repaired: ".count($r4Keys)."\n";
    echo "Menu canonical keys added per locale: ".count($menuKeys)."\n";
    echo "Menu sidebar navigation: full-document load\n";
    echo "Menu server/runtime copy: catalogue-driven EN/DE/TR\n";
    echo "No tenant/payment/currency/order/reservation/business data changed.\n";
} catch (Throwable $error) {
    fwrite(STDERR, 'ERROR: '.$error->getMessage()."\n");
    exit(1);
}
