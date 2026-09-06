<?php

declare(strict_types=1);

$root = rtrim((string)($argv[1] ?? dirname(__DIR__)), '/');
$catalogPath = $root.'/app/admin/i18n/pmd_admin_catalog.php';
$failures = [];
$warnings = [];
$fail = static function (string $message) use (&$failures): void { $failures[] = $message; };
$warn = static function (string $message) use (&$warnings): void { $warnings[] = $message; };

if (!is_file($catalogPath)) {
    fwrite(STDERR, "ERROR: Missing catalogue: {$catalogPath}\n");
    exit(2);
}

$catalog = require $catalogPath;
$supported = is_array($catalog) ? ($catalog['supported_locales'] ?? []) : [];
$messages = is_array($catalog) ? ($catalog['messages'] ?? []) : [];

if ($supported !== ['en', 'de']) {
    $fail('supported_locales must be exactly [en, de].');
}
if (!is_array($messages) || !$messages) {
    $fail('messages is empty or invalid.');
    $messages = [];
}

$placeholderPattern = '/%(?:\d+\$)?[bcdeEfFgGosuxX]|:[A-Za-z_][A-Za-z0-9_.]*|\{[A-Za-z_][A-Za-z0-9_.]*\}/';
$placeholders = static function (string $value) use ($placeholderPattern): array {
    preg_match_all($placeholderPattern, $value, $matches);
    $tokens = array_values(array_unique($matches[0] ?? []));
    sort($tokens);
    return $tokens;
};

foreach ($messages as $key => $row) {
    if (!is_string($key) || trim($key) === '' || !is_array($row)) {
        $fail('Every semantic key must be a non-empty string with an array value.');
        continue;
    }
    $en = trim((string)($row['en'] ?? ''));
    $de = trim((string)($row['de'] ?? ''));
    if ($en === '' || $de === '') {
        $fail("{$key}: EN and DE are both required.");
        continue;
    }
    if ($placeholders($en) !== $placeholders($de)) {
        $fail("{$key}: placeholder mismatch between EN and DE.");
    }
}

$requiredFiles = [
    'app/admin/classes/PmdAdminI18n.php',
    'app/admin/assets/js/pmd-admin-messages-v1.js',
    'app/admin/views/_partials/pmd_admin_messages.blade.php',
    'app/admin/views/waiter_pos.blade.php',
    'app/admin/views/waiter_pos_shell.blade.php',
];
foreach ($requiredFiles as $relative) {
    if (!is_file($root.'/'.$relative)) {
        $fail("Missing Phase 1 file: {$relative}");
    }
}

$posPagePath = $root.'/app/admin/views/waiter_pos.blade.php';
$posPage = is_file($posPagePath) ? (string)file_get_contents($posPagePath) : '';
if (strpos($posPage, '<html lang="en"') !== false) {
    $fail('waiter_pos.blade.php still hard-codes html lang=en.');
}
if (strpos($posPage, "@include('admin::_partials.pmd_admin_messages')") === false) {
    $fail('waiter_pos.blade.php does not load the keyed message payload.');
}
if (strpos($posPage, 'PmdAdminI18n::currentLocale') === false) {
    $fail('waiter_pos.blade.php does not use the centralized locale resolver.');
}

$shellPath = $root.'/app/admin/views/waiter_pos_shell.blade.php';
$shell = is_file($shellPath) ? (string)file_get_contents($shellPath) : '';
if (strpos($shell, 'PmdAdminI18n::translate') === false) {
    $fail('waiter_pos_shell.blade.php does not use centralized semantic translation.');
}

$usedKeys = [];
foreach ([$posPage, $shell] as $content) {
    if (preg_match_all('/\$pmd(?:PosPageT|T)\(\'([^\']+)\'/', $content, $matches)) {
        foreach ($matches[1] as $key) {
            $usedKeys[$key] = true;
        }
    }
}
foreach (array_keys($usedKeys) as $key) {
    if (!array_key_exists($key, $messages)) {
        $fail("Referenced semantic key is missing: {$key}");
    }
}

$unused = array_diff(array_keys($messages), array_keys($usedKeys));
if ($unused) {
    $warn(count($unused).' Phase 1 catalogue keys are not referenced by the two migrated Blade files.');
}

foreach ([
    'app/admin/assets/js/pmd-admin-i18n-v1.js',
    'app/admin/assets/js/pmd-admin-i18n-page-authority-v2.js',
] as $legacyRelative) {
    if (is_file($root.'/'.$legacyRelative)) {
        $warn("Legacy compatibility authority remains for unmigrated routes: {$legacyRelative}");
    }
}

echo "PAYMYDINE ADMIN I18N PHASE 1 AUDIT\n";
echo "==================================\n";
echo 'Semantic keys: '.count($messages)."\n";
echo 'Referenced migrated keys: '.count($usedKeys)."\n";
echo 'Failures: '.count($failures)."\n";
echo 'Warnings: '.count($warnings)."\n\n";
foreach ($warnings as $message) echo "WARN: {$message}\n";
foreach ($failures as $message) echo "FAIL: {$message}\n";
if ($failures) exit(1);
echo "\nOK: Phase 1 keyed EN/DE Waiter POS checks passed.\n";
