<?php

declare(strict_types=1);

$options = getopt('', ['root::']);
$root = rtrim((string)($options['root'] ?? dirname(__DIR__)), '/');
$path = 'app/admin/views/tables/edit.blade.php';
$full = $root.'/'.$path;

function pmdR3FinalizeReplace(string $content, string $search, string $replace, string $label): string
{
    $count = substr_count($content, $search);
    if ($count !== 1) {
        throw new RuntimeException("Expected exactly one {$label}; found {$count}. No source was written.");
    }
    return str_replace($search, $replace, $content);
}

try {
    if (!is_file($full)) throw new RuntimeException('Missing '.$path);
    $content = (string)file_get_contents($full);
    if ($content === '') throw new RuntimeException('Could not read '.$path);

    if (strpos($content, 'PMD_TABLE_QR_SERVER_I18N_R3_CLEAN') !== false) {
        echo "PMD R3 CLEAN QR server-first finalize: already applied\n";
        exit(0);
    }

    if (strpos($content, 'PMD_TABLE_QR_I18N_R3_CLEAN') === false) {
        throw new RuntimeException('Main R3 QR marker missing. Run pmd-r3-clean-apply.php first.');
    }

    $content = pmdR3FinalizeReplace(
        $content,
        <<<'OLD'
        if ($tableDisplayName === '') {
            $tableDisplayName = 'Table '.$tableNumber;
        }
OLD,
        <<<'NEW'
        // PMD_TABLE_QR_SERVER_I18N_R3_CLEAN
        if ($tableDisplayName === '') {
            $tableDisplayName = \Admin\Classes\PmdPlatformI18n::fromEnglish(
                'Table',
                'shared.'
            ).' '.$tableNumber;
        }
NEW,
        'QR default table label'
    );

    $replacements = [
        "echo '<img id=\"qr-code\" src=\"'.e(\$qrDataUri).'\" alt=\"QR Code for '.e(\$tableDisplayName).'\" />';" =>
            "echo '<img id=\"qr-code\" src=\"'.e(\$qrDataUri).'\" alt=\"'.e(\\Admin\\Classes\\PmdPlatformI18n::fromEnglish('QR Code for', 'r3.')).' '.e(\$tableDisplayName).'\" />';",
        "echo '<strong>'.e(\$tableDisplayName).' QR code</strong>';" =>
            "echo '<strong>'.e(\$tableDisplayName).' '.e(\\Admin\\Classes\\PmdPlatformI18n::fromEnglish('QR code', 'r3.')).'</strong>';",
        "echo '<span>Choose from 10 branded restaurant templates before downloading.</span>';" =>
            "echo '<span>'.e(\\Admin\\Classes\\PmdPlatformI18n::fromEnglish('Choose from 10 branded restaurant templates before downloading.', 'r3.')).'</span>';",
        "echo '<button type=\"button\" class=\"pmd-table-qr-studio-v1__button\" data-pmd-qr-template-open-v1>Choose design &amp; download</button>';" =>
            "echo '<button type=\"button\" class=\"pmd-table-qr-studio-v1__button\" data-pmd-qr-template-open-v1>'.e(\\Admin\\Classes\\PmdPlatformI18n::fromEnglish('Choose design & download', 'r3.')).'</button>';",
    ];

    foreach ($replacements as $search => $replace) {
        $content = pmdR3FinalizeReplace($content, $search, $replace, 'QR server-first copy');
    }

    $sudoUser = trim((string)getenv('SUDO_USER'));
    $home = $sudoUser !== '' && is_dir('/home/'.$sudoUser) ? '/home/'.$sudoUser : (getenv('HOME') ?: '/tmp');
    $backupDir = rtrim($home, '/').'/pmd-backups/qr-server-i18n-r3-clean-'.date('Ymd_His');
    if (!mkdir($backupDir, 0755, true) && !is_dir($backupDir)) {
        throw new RuntimeException('Could not create '.$backupDir);
    }
    if (!copy($full, $backupDir.'/edit.blade.php')) {
        throw new RuntimeException('Could not back up '.$path);
    }
    if (file_put_contents($full, $content) === false) {
        throw new RuntimeException('Could not write '.$path);
    }

    echo "PMD R3 CLEAN QR server-first finalize: APPLIED\n";
    echo "Backup: {$backupDir}/edit.blade.php\n";
    echo "Default Table label + QR card copy now use the canonical language catalogue.\n";
} catch (Throwable $error) {
    fwrite(STDERR, 'ERROR: '.$error->getMessage()."\n");
    exit(1);
}
