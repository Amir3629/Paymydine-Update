<?php

declare(strict_types=1);

/*
 * PMD_TURKISH_ADMIN_I18N_R3_RETIRED
 *
 * Historical note:
 * R3 installed a second Turkish DOM dictionary/runtime. That split Turkish
 * ownership between PHP and JavaScript and made coverage depend on page load
 * order. The canonical implementation now keeps Turkish wording in exactly:
 *
 *   app/admin/i18n/platform/tr.php
 *
 * and uses the locale-neutral browser runtime:
 *
 *   app/admin/assets/js/pmd-admin-i18n-v1.js
 *
 * Keep this script as a harmless compatibility marker for deployment notes
 * that may still invoke it. It must never modify source files again.
 */

$root = dirname(__DIR__);
$catalogue = $root.'/app/admin/i18n/platform/tr.php';
$runtime = $root.'/app/admin/assets/js/pmd-admin-i18n-v1.js';

foreach ([$catalogue, $runtime] as $required) {
    if (!is_file($required)) {
        fwrite(STDERR, "Missing canonical Turkish i18n dependency: {$required}\n");
        exit(2);
    }
}

echo "PMD Turkish admin i18n R3 is retired: OK\n";
echo "- Turkish copy owner: app/admin/i18n/platform/tr.php\n";
echo "- Browser runtime: app/admin/assets/js/pmd-admin-i18n-v1.js\n";
echo "- No source files were modified by this compatibility script.\n";
