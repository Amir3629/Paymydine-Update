<?php

declare(strict_types=1);

$options = getopt('', ['root::']);
$root = rtrim((string)($options['root'] ?? '/var/www/paymydine'), '/');
$path = 'app/admin/assets/js/pmd-settings-polish-r4.js';
$full = $root.'/'.$path;

try {
    if (!is_file($full)) throw new RuntimeException('Missing '.$path);
    $content = (string)file_get_contents($full);
    if ($content === '') throw new RuntimeException('Could not read '.$path);

    if (strpos($content, 'PMD_SETTINGS_POLISH_CATALOGUE_I18N_R4') === false) {
        throw new RuntimeException('R4 Settings catalogue marker is missing. Run the main R4 hotfix first.');
    }

    if (strpos($content, 'PMD_SETTINGS_DEVICES_CLEAN_ALIAS_R4') !== false) {
        echo "PMD R4 Devices route alias: already applied\n";
        exit(0);
    }

    $search = "    if (path === '/admin/pmddevices') {";
    $replace = "    // PMD_SETTINGS_DEVICES_CLEAN_ALIAS_R4\n    if (path === '/admin/pmddevices' || path === '/admin/settings/devices') {";
    $count = substr_count($content, $search);
    if ($count !== 1) {
        throw new RuntimeException('Expected exactly one Devices route branch; found '.$count.'.');
    }

    $content = str_replace($search, $replace, $content);

    $sudoUser = trim((string)getenv('SUDO_USER'));
    $home = $sudoUser !== '' && is_dir('/home/'.$sudoUser) ? '/home/'.$sudoUser : (getenv('HOME') ?: '/tmp');
    $backup = rtrim($home, '/').'/pmd-backups/devices-route-alias-r4-'.date('Ymd_His');
    if (!mkdir($backup, 0755, true) && !is_dir($backup)) {
        throw new RuntimeException('Could not create backup directory '.$backup);
    }
    if (!copy($full, $backup.'/pmd-settings-polish-r4.js')) {
        throw new RuntimeException('Could not back up '.$path);
    }
    if (file_put_contents($full, $content) === false) {
        throw new RuntimeException('Could not write '.$path);
    }

    echo "PMD R4 Devices clean-route alias: APPLIED\n";
    echo "Backup: {$backup}/pmd-settings-polish-r4.js\n";
} catch (Throwable $error) {
    fwrite(STDERR, 'ERROR: '.$error->getMessage()."\n");
    exit(1);
}
