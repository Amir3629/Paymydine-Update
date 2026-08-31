<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$sidebarPath = $root.'/app/admin/views/_partials/side_nav.blade.php';
$bootPath = $root.'/app/admin/views/_partials/pmd_admin_i18n.blade.php';
$runtimePath = $root.'/app/admin/assets/js/pmd-admin-i18n-tr-v1.js';

foreach ([$sidebarPath, $bootPath, $runtimePath] as $required) {
    if (!is_file($required)) {
        fwrite(STDERR, "Missing required file: {$required}\n");
        exit(2);
    }
}

$sidebar = file_get_contents($sidebarPath);
$boot = file_get_contents($bootPath);
if ($sidebar === false || $boot === false) {
    fwrite(STDERR, "Could not read PMD admin i18n source files.\n");
    exit(3);
}

// 1) The historical client guard rejected every locale except DE/EN before
// the request reached the market-aware server route. The server route is the
// real market authority, so the client only validates locale shape now.
$legacyGuard = <<<'JS'
                if (
                    nextLocale !== 'de'
                    && nextLocale !== 'en'
                ) {
JS;

$marketGuard = <<<'JS'
                if (
                    !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/.test(nextLocale)
                ) {
JS;

if (strpos($sidebar, $legacyGuard) !== false) {
    $sidebar = str_replace($legacyGuard, $marketGuard, $sidebar);
} elseif (strpos($sidebar, "!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/.test(nextLocale)") === false) {
    fwrite(STDERR, "Could not locate the PMD language client guard.\n");
    exit(4);
}

// 2) Load the Turkish DOM translator globally from the shared sidebar. This
// runtime activates only when pmd_admin_locale=tr, so DE/EN behavior is left
// untouched.
$loaderMarker = 'PMD_TURKISH_ADMIN_I18N_R3_LOADER';
if (strpos($sidebar, $loaderMarker) === false) {
    $endMarker = '{{-- PMD_SIDEBAR_LANGUAGE_DIRECT_TOGGLE_20260807_END --}}';
    if (strpos($sidebar, $endMarker) === false) {
        fwrite(STDERR, "Could not locate the PMD sidebar language end marker.\n");
        exit(5);
    }

    $loader = <<<'BLADE'
{{-- PMD_TURKISH_ADMIN_I18N_R3_LOADER --}}
<script src="/app/admin/assets/js/pmd-admin-i18n-tr-v1.js?v=20260831-r3"></script>
BLADE;

    $sidebar = str_replace($endMarker, $loader."\n".$endMarker, $sidebar);
}

// 3) Stop the common server-side admin bootstrap from forcing a valid TR
// cookie back to English. Native strings may still use English fallback where
// a Turkish native pack does not yet define a key, while PMD-owned copy is
// translated by PmdPlatformI18n / the Turkish DOM runtime.
$legacyAllow = "if (!in_array(\$pmdAdminLocale, ['en', 'de'], true)) {";
$marketAllow = "if (!in_array(\$pmdAdminLocale, ['en', 'de', 'tr'], true)) {";

if (strpos($boot, $legacyAllow) !== false) {
    $boot = str_replace($legacyAllow, $marketAllow, $boot);
} elseif (strpos($boot, $marketAllow) === false) {
    fwrite(STDERR, "Could not locate the PMD admin locale allow-list.\n");
    exit(6);
}

if (file_put_contents($sidebarPath, $sidebar) === false) {
    fwrite(STDERR, "Could not write sidebar language patch.\n");
    exit(7);
}

if (file_put_contents($bootPath, $boot) === false) {
    fwrite(STDERR, "Could not write admin i18n bootstrap patch.\n");
    exit(8);
}

echo "PMD Turkish admin i18n R3: OK\n";
echo "- client locale guard: market-safe\n";
echo "- Turkish runtime loader: installed\n";
echo "- admin locale allow-list: en,de,tr\n";
