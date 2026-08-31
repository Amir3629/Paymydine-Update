<?php

declare(strict_types=1);

/*
 * PMD Admin translation coverage + Menu recovery R3 CLEAN.
 * Plain-text replacement for the corrupted R3 transport payload.
 *
 * Safety:
 * - source files are staged in memory before any write;
 * - every existing target is backed up;
 * - no tenant/payment/currency/order/reservation/business rows are touched;
 * - no git pull/checkout/reset is performed.
 */

$options = getopt('', ['root::']);
$root = rtrim((string)($options['root'] ?? dirname(__DIR__)), '/');

function pmdR3Read(string $root, string $path): string
{
    $value = @file_get_contents($root.'/'.$path);
    if ($value === false) throw new RuntimeException('Could not read '.$path);
    return $value;
}

function pmdR3Write(string $root, string $path, string $content): void
{
    $full = $root.'/'.$path;
    $dir = dirname($full);
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new RuntimeException('Could not create directory '.$dir);
    }
    if (file_put_contents($full, $content) === false) {
        throw new RuntimeException('Could not write '.$path);
    }
}

function pmdR3ReplaceOnce(string $content, string $search, string $replace, string $label): string
{
    $count = substr_count($content, $search);
    if ($count !== 1) {
        throw new RuntimeException("Expected exactly one {$label}; found {$count}. No source was written.");
    }
    return str_replace($search, $replace, $content);
}

/** @param array<string,string> $entries */
function pmdR3AddCanonical(string $content, array $entries, string $locale): string
{
    $marker = "    // PMD_ADMIN_COVERAGE_R3_CLEAN_CANONICAL\n";
    if (strpos($content, $marker) !== false) return $content;

    $lines = [];
    foreach ($entries as $key => $value) {
        if (strpos($content, var_export($key, true).' =>') !== false) continue;
        $lines[] = '    '.var_export($key, true).' => '.var_export($value, true).',';
    }
    if (!$lines) return $content;
    $block = $marker.implode("\n", $lines)."\n";

    if ($locale === 'tr') {
        $anchor = "    // Compatibility-only dynamic patterns. Values stay here so runtime code\n";
        if (substr_count($content, $anchor) !== 1) {
            throw new RuntimeException('Turkish canonical insertion anchor was not found exactly once.');
        }
        return str_replace($anchor, $block."\n".$anchor, $content);
    }

    $pos = strrpos($content, "\n];");
    if ($pos === false) throw new RuntimeException(strtoupper($locale).' canonical closing array not found.');
    return substr($content, 0, $pos)."\n\n".$block.substr($content, $pos);
}

function pmdR3MenuAlias(string $content, string $path): string
{
    if (strpos($content, 'PMD_MENU_CLEAN_ALIAS_R3_CLEAN') !== false) return $content;
    $patterns = [
        "if (path !== '/admin/pmdmenus') return;" => "// PMD_MENU_CLEAN_ALIAS_R3_CLEAN\n    if (path !== '/admin/pmdmenus' && path !== '/admin/menu') return;",
        "if (pagePath !== '/admin/pmdmenus') return;" => "// PMD_MENU_CLEAN_ALIAS_R3_CLEAN\n    if (pagePath !== '/admin/pmdmenus' && pagePath !== '/admin/menu') return;",
    ];
    foreach ($patterns as $search => $replace) {
        if (substr_count($content, $search) === 1) return str_replace($search, $replace, $content);
    }
    throw new RuntimeException('Menu clean-route guard not found in '.$path);
}

$translations = array_merge(
    require __DIR__.'/pmd-r3-clean-translations-1.php',
    require __DIR__.'/pmd-r3-clean-translations-2.php'
);

$targets = [
    'app/admin/i18n/platform/en.php',
    'app/admin/i18n/platform/de.php',
    'app/admin/i18n/platform/tr.php',
    'app/admin/views/_partials/pmd_admin_i18n.blade.php',
    'app/admin/views/tables/edit.blade.php',
    'app/admin/assets/js/pmd-menu-runtime-stability.js',
    'app/admin/assets/js/pmd-menu-all-foods-r27.js',
    'app/admin/assets/js/pmd-menu-all-foods-r28.js',
    'app/admin/assets/js/pmd-menu-category-guard-r26.js',
    'app/admin/assets/js/pmd-menu-scoped-food-remove-v1.js',
];

try {
    $patched = [];
    foreach ($targets as $path) {
        if (!is_file($root.'/'.$path)) throw new RuntimeException('Required source missing: '.$path);
        $patched[$path] = pmdR3Read($root, $path);
    }

    if (strpos($patched['app/admin/i18n/platform/tr.php'], 'PMD_TR_COMPLETE_ADMIN_COVERAGE_R2A') === false) {
        throw new RuntimeException('R2A Turkish coverage marker is missing. Refusing to patch an unexpected VPS state.');
    }

    foreach (['en','de','tr'] as $locale) {
        $entries = [];
        foreach ($translations as $key => $row) $entries[$key] = $row[$locale];
        $path = 'app/admin/i18n/platform/'.$locale.'.php';
        $patched[$path] = pmdR3AddCanonical($patched[$path], $entries, $locale);
    }

    $loaderPath = 'app/admin/views/_partials/pmd_admin_i18n.blade.php';
    if (strpos($patched[$loaderPath], 'PMD_ADMIN_COVERAGE_R3_CLEAN_LOADER') === false) {
        $anchor = <<<'BLADE'
<script
    src="/app/admin/assets/js/pmd-admin-i18n-v1.js?v={{ $pmdRuntimeVersion }}"
    defer
></script>
BLADE;
        $replacement = $anchor.<<<'BLADE'
<!-- PMD_ADMIN_COVERAGE_R3_CLEAN_LOADER -->
<script src="/app/admin/assets/js/pmd-admin-coverage-r3.js?v=20260831-r3-clean" defer></script>
BLADE;
        $patched[$loaderPath] = pmdR3ReplaceOnce($patched[$loaderPath], $anchor, $replacement, 'Admin i18n runtime loader anchor');
    }

    foreach ([
        'app/admin/assets/js/pmd-menu-runtime-stability.js',
        'app/admin/assets/js/pmd-menu-all-foods-r27.js',
        'app/admin/assets/js/pmd-menu-all-foods-r28.js',
        'app/admin/assets/js/pmd-menu-category-guard-r26.js',
        'app/admin/assets/js/pmd-menu-scoped-food-remove-v1.js',
    ] as $path) {
        $patched[$path] = pmdR3MenuAlias($patched[$path], $path);
    }

    $runtimePath = 'app/admin/assets/js/pmd-menu-runtime-stability.js';
    if (strpos($patched[$runtimePath], 'PMD_MENU_ROOT_ADOPTION_R3_CLEAN') === false) {
        $old = <<<'JS'
    function requestCleanReload(reason) {
        if (reloadPending) return;
        reloadPending = true;

        try {
            document.documentElement.setAttribute(
                'data-pmd-menu-runtime-reload',
                String(reason || 'refresh')
            );
        } catch (error) {}

        window.location.reload();
    }
JS;
        $new = <<<'JS'
    // PMD_MENU_ROOT_ADOPTION_R3_CLEAN
    function requestCleanReload(reason) {
        if (reloadPending) return;
        reloadPending = true;

        try {
            document.documentElement.setAttribute(
                'data-pmd-menu-runtime-reload',
                String(reason || 'refresh')
            );
        } catch (error) {}

        var key = 'pmd.menu.runtime.reload.r3';
        var now = Date.now();
        var previous = 0;
        try { previous = Number(sessionStorage.getItem(key) || 0); } catch (error) {}

        if (!previous || now - previous >= 10000) {
            try { sessionStorage.setItem(key, String(now)); } catch (error) {}
            window.location.reload();
            return;
        }

        var liveRoot = currentRoot();
        if (liveRoot) {
            if (rootObserver) rootObserver.disconnect();
            if (bodyObserver) bodyObserver.disconnect();
            root = liveRoot;
            initialRoot = liveRoot;
            firstPaintReleased = false;
            managerWaitStartedAt = Date.now();
            reloadPending = false;
            installRootReplacementGuard();
            stabilize(liveRoot);
            observeRuntime();
            releaseFirstPaint('root-adopted-' + String(reason || 'refresh'));
            try {
                document.documentElement.setAttribute(
                    'data-pmd-menu-runtime-reload-suppressed-r3',
                    String(reason || 'refresh')
                );
            } catch (error) {}
            return;
        }

        reloadPending = false;
        try {
            document.documentElement.setAttribute(
                'data-pmd-menu-runtime-reload-suppressed-r3',
                String(reason || 'refresh')
            );
        } catch (error) {}
    }
JS;
        $patched[$runtimePath] = pmdR3ReplaceOnce($patched[$runtimePath], $old, $new, 'Menu requestCleanReload function');

        $old = <<<'JS'
            if (
                replacement
                && replacement.nodeType === 1
                && replacement.matches
                && replacement.matches('[data-pmd-menu-manager]')
            ) {
                requestCleanReload('root-replace');
                return;
            }

            return nativeReplaceWith.apply(this, args);
JS;
        $new = <<<'JS'
            if (
                replacement
                && replacement.nodeType === 1
                && replacement.matches
                && replacement.matches('[data-pmd-menu-manager]')
            ) {
                var result = nativeReplaceWith.apply(this, args);
                queueMicrotask(function () {
                    requestCleanReload('root-replace');
                });
                return result;
            }

            return nativeReplaceWith.apply(this, args);
JS;
        $patched[$runtimePath] = pmdR3ReplaceOnce($patched[$runtimePath], $old, $new, 'Menu root replacement guard');
    }

    $qrPath = 'app/admin/views/tables/edit.blade.php';
    if (strpos($patched[$qrPath], 'PMD_TABLE_QR_I18N_R3_CLEAN') === false) {
        $anchor = <<<'JS'
    const ROOT_SELECTOR = '[data-pmd-qr-template-studio-v1]';
    const MODAL_ID = 'pmd-qr-template-modal-v1';
JS;
        $replacement = $anchor.<<<'JS'
    // PMD_TABLE_QR_I18N_R3_CLEAN
    const pmdQrMessages = window.PMD_PLATFORM_MESSAGES || {};
    const pmdQrT = (key, fallback) => {
        const value = pmdQrMessages[key];
        return typeof value === 'string' && value.trim() ? value : fallback;
    };
JS;
        $patched[$qrPath] = pmdR3ReplaceOnce($patched[$qrPath], $anchor, $replacement, 'QR runtime constants');

        $replacements = [
            "name: 'Classic White'," => "name: pmdQrT('r3.qr_classic_white', 'Classic White'),",
            "description: 'Clean, bright and easy to print.'," => "description: pmdQrT('r3.qr_desc_classic', 'Clean, bright and easy to print.'),",
            "name: 'Midnight'," => "name: pmdQrT('r3.qr_midnight', 'Midnight'),",
            "description: 'Premium dark table card.'," => "description: pmdQrT('r3.qr_desc_midnight', 'Premium dark table card.'),",
            "name: 'Emerald'," => "name: pmdQrT('r3.qr_emerald', 'Emerald'),",
            "description: 'Fresh PayMyDine green style.'," => "description: pmdQrT('r3.qr_desc_emerald', 'Fresh PayMyDine green style.'),",
            "name: 'Warm Bistro'," => "name: pmdQrT('r3.qr_warm_bistro', 'Warm Bistro'),",
            "description: 'Warm restaurant table presentation.'," => "description: pmdQrT('r3.qr_desc_bistro', 'Warm restaurant table presentation.'),",
            "name: 'Ocean Blue'," => "name: pmdQrT('r3.qr_ocean_blue', 'Ocean Blue'),",
            "description: 'Modern blue hospitality card.'," => "description: pmdQrT('r3.qr_desc_ocean', 'Modern blue hospitality card.'),",
            "name: 'Maximum Scan'," => "name: pmdQrT('r3.qr_max_scan', 'Maximum Scan'),",
            "description: 'Black and white, no center overlay.'," => "description: pmdQrT('r3.qr_desc_mono', 'Black and white, no center overlay.'),",
            "name: 'Gold Dining'," => "name: pmdQrT('r3.qr_gold_dining', 'Gold Dining'),",
            "description: 'Elegant dark and gold finish.'," => "description: pmdQrT('r3.qr_desc_gold', 'Elegant dark and gold finish.'),",
            "name: 'Coral Welcome'," => "name: pmdQrT('r3.qr_coral_welcome', 'Coral Welcome'),",
            "description: 'Friendly and colourful.'," => "description: pmdQrT('r3.qr_desc_coral', 'Friendly and colourful.'),",
            "name: 'Table Tent'," => "name: pmdQrT('r3.qr_table_tent', 'Table Tent'),",
            "description: 'Bold header for counter or table stands.'," => "description: pmdQrT('r3.qr_desc_tent', 'Bold header for counter or table stands.'),",
            "name: 'Botanical'," => "name: pmdQrT('r3.qr_botanical', 'Botanical'),",
            "description: 'Soft natural restaurant style.'," => "description: pmdQrT('r3.qr_desc_botanical', 'Soft natural restaurant style.'),",
            "ctx.fillText('SCAN • ORDER • ENJOY', textX, logoY + logoSize * .78);" => "ctx.fillText(pmdQrT('r3.scan_order_enjoy', 'SCAN • ORDER • ENJOY'), textX, logoY + logoSize * .78);",
            "ctx.fillText('SCAN TO VIEW MENU', w / 2, qrY - h * .035);" => "ctx.fillText(pmdQrT('r3.scan_menu', 'SCAN TO VIEW MENU'), w / 2, qrY - h * .035);",
            "ctx.fillText('Point your camera at the QR code to open the menu', w / 2, tableY + h * .045);" => "ctx.fillText(pmdQrT('r3.point_camera', 'Point your camera at the QR code to open the menu'), w / 2, tableY + h * .045);",
            "ctx.fillText('Powered by', w / 2, footerY - h * .018);" => "ctx.fillText(pmdQrT('r3.powered_by', 'Powered by'), w / 2, footerY - h * .018);",
            "modal.setAttribute('aria-label', 'Choose QR design');" => "modal.setAttribute('aria-label', pmdQrT('r3.choose_qr_design_aria', 'Choose QR design'));",
            "loading.textContent = 'Preparing 10 designs…';" => "loading.textContent = pmdQrT('r3.preparing_designs', 'Preparing 10 designs…');",
            "canvas.setAttribute('aria-label', `${template.name} preview`);" => "canvas.setAttribute('aria-label', `${template.name} ${pmdQrT('r3.preview', 'preview')}`);",
            "const download = makeButton('Download this design', 'pmd-qr-template-download-v1');" => "const download = makeButton(pmdQrT('r3.download_design', 'Download this design'), 'pmd-qr-template-download-v1');",
        ];
        foreach ($replacements as $search => $replace) {
            $patched[$qrPath] = pmdR3ReplaceOnce($patched[$qrPath], $search, $replace, 'QR copy: '.$search);
        }

        $old = <<<'JS'
        header.innerHTML = '<div><span class="pmd-qr-template-kicker-v1">TABLE QR</span><h2>Choose your QR design</h2><p>Pick one of 10 print-ready designs. Your table link stays exactly the same.</p></div>';
JS;
        $new = <<<'JS'
        header.innerHTML = '<div><span class="pmd-qr-template-kicker-v1">' + pmdQrT('r3.table_qr', 'TABLE QR') + '</span><h2>' + pmdQrT('r3.choose_qr_design', 'Choose your QR design') + '</h2><p>' + pmdQrT('r3.qr_pick_design', 'Pick one of 10 print-ready designs. Your table link stays exactly the same.') + '</p></div>';
JS;
        $patched[$qrPath] = pmdR3ReplaceOnce($patched[$qrPath], $old, $new, 'QR modal header');
    }

    $runtimeContent = file_get_contents(__DIR__.'/pmd-r3-clean-runtime.js');
    if ($runtimeContent === false) {
        throw new RuntimeException('Could not read pmd-r3-clean-runtime.js');
    }

    foreach ($patched as $path => $content) {
        if ($content === '') throw new RuntimeException('Refusing to write empty source: '.$path);
    }
    if (strpos($runtimeContent, 'PMD_ADMIN_COVERAGE_R3_CLEAN') === false) {
        throw new RuntimeException('Generated R3 runtime marker missing.');
    }

    $sudoUser = trim((string)getenv('SUDO_USER'));
    $home = $sudoUser !== '' && is_dir('/home/'.$sudoUser) ? '/home/'.$sudoUser : (getenv('HOME') ?: '/tmp');
    $backup = rtrim($home, '/').'/pmd-backups/admin-coverage-menu-r3-clean-'.date('Ymd_His');
    if (!mkdir($backup, 0755, true) && !is_dir($backup)) {
        throw new RuntimeException('Could not create backup directory '.$backup);
    }

    foreach ($targets as $path) {
        $source = $root.'/'.$path;
        $dest = $backup.'/'.$path;
        $dir = dirname($dest);
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new RuntimeException('Could not create backup subdirectory '.$dir);
        }
        if (!copy($source, $dest)) throw new RuntimeException('Could not back up '.$path);
    }
    $runtimePathNew = 'app/admin/assets/js/pmd-admin-coverage-r3.js';
    if (is_file($root.'/'.$runtimePathNew)) {
        $dest = $backup.'/'.$runtimePathNew;
        $dir = dirname($dest);
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        copy($root.'/'.$runtimePathNew, $dest);
    }

    foreach ($patched as $path => $content) pmdR3Write($root, $path, $content);
    pmdR3Write($root, $runtimePathNew, $runtimeContent);

    $assetDir = $root.'/app/admin/assets/js';
    $stat = @stat($assetDir);
    if ($stat) {
        @chown($root.'/'.$runtimePathNew, $stat['uid']);
        @chgrp($root.'/'.$runtimePathNew, $stat['gid']);
    }
    @chmod($root.'/'.$runtimePathNew, 0644);

    echo "PMD ADMIN COVERAGE + MENU RECOVERY R3 CLEAN: APPLIED\n";
    echo "Backup: {$backup}\n";
    echo "Canonical R3 keys per locale: ".count($translations)."\n";
    echo "New runtime: {$runtimePathNew}\n";
    echo "Menu clean alias + root-adoption recovery: enabled\n";
    echo "QR canvas/modal catalogue binding: enabled\n";
    echo "No tenant/payment/currency/order/reservation/business data changed.\n";
    echo "No git pull/checkout/reset performed.\n";
} catch (Throwable $error) {
    fwrite(STDERR, "ERROR: ".$error->getMessage()."\n");
    exit(1);
}
