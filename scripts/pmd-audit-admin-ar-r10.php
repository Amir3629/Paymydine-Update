#!/usr/bin/env php
<?php

declare(strict_types=1);

// PMD_AUDIT_ADMIN_AR_COMPLETE_R10
// Read-only audit. It never boots Laravel, touches cache, or writes a database.

$options = getopt('', ['root::', 'json', 'help']);
if (isset($options['help'])) {
    echo "Usage: php scripts/pmd-audit-admin-ar-r10.php [--root=/path/to/repo] [--json]\n";
    exit(0);
}

$root = rtrim((string)($options['root'] ?? dirname(__DIR__)), '/');
$englishPath = $root.'/app/admin/i18n/platform/en.php';
$arabicPath = $root.'/app/admin/i18n/platform/ar.php';
$moduleGlob = $root.'/app/admin/i18n/arabic/r10-*.php';

foreach ([$englishPath, $arabicPath] as $path) {
    if (!is_file($path)) {
        fwrite(STDERR, "[FAIL] Missing catalogue file: {$path}\n");
        exit(2);
    }
}

$english = require $englishPath;
$arabic = require $arabicPath;

if (!is_array($english) || !is_array($arabic)) {
    fwrite(STDERR, "[FAIL] Catalogues must return arrays.\n");
    exit(3);
}

$moduleFiles = glob($moduleGlob) ?: [];
sort($moduleFiles, SORT_STRING);

$missingKeys = array_keys(array_diff_key($english, $arabic));
$placeholderMismatches = [];
$identicalNonTechnical = [];
$arabicOverrideCount = 0;

$allowedIdenticalValues = array_fill_keys([
    'PayMyDine',
    'Instagram',
    'Google / Maps',
    'Trustpilot',
    'Apple Pay',
    'Google Pay',
    'Wero',
    'PayPal',
    'Klarna',
    'Cash App Pay',
    'Amazon SES',
    'PHP Mail',
    'Sendmail',
    'CSV',
    'Excel',
    'IP',
    'VIP',
], true);

$allowedIdenticalKeys = array_fill_keys([
    // Brand/provider/technical identifiers intentionally stay in their
    // canonical product spelling even in Arabic UI.
    'settings.ui.instagram',
    'settings.ui.google_maps',
    'settings.ui.trustpilot',
    'settings.runtime_v17.apple_pay',
    'settings.runtime_v17.google_pay',
    'settings.runtime_v17.wero',
    'settings.runtime_v17.paypal',
    'settings.runtime_v17.klarna',
    'settings.runtime_v17.cash_app_pay',
], true);

foreach ($english as $key => $source) {
    if (!is_string($key) || !is_scalar($source)) continue;

    $source = (string)$source;
    $target = array_key_exists($key, $arabic) ? (string)$arabic[$key] : '';

    if ($target !== $source) {
        $arabicOverrideCount++;
    } elseif (
        !isset($allowedIdenticalValues[$source]) &&
        !isset($allowedIdenticalKeys[$key])
    ) {
        $identicalNonTechnical[$key] = $source;
    }

    $sourceTokens = placeholderTokens($source);
    $targetTokens = placeholderTokens($target);
    if ($sourceTokens !== $targetTokens) {
        $placeholderMismatches[$key] = [
            'en' => $sourceTokens,
            'ar' => $targetTokens,
            'source' => $source,
            'target' => $target,
        ];
    }
}

$requiredLiteralSources = [
    'Revenue',
    'Guests Served',
    'Table Turnover',
    'Dine In / Take Away',
    'Kitchen Ticket Time',
    'Table Occupancy',
    'Menu Availability',
    'Sales over time',
    'Sales by category',
    'Sales by hour',
    'Payment methods',
    'Recent transactions',
    'Alerts',
    'Live orders',
    'Order channels',
    'Top-selling items',
    'Top-selling',
    'Tips summary',
    'Latest reviews',
    'Upcoming reservations',
    'Upcoming events',
    'Source unavailable',
    'Range',
    'Add table',
    'Edit table',
    'Add floor',
    'No tables match this view.',
    'No enabled categories sold in this period',
    'No enabled payment methods in /admin/payments',
    'failed payments',
    'refunds',
    'long open tables',
    'out of stock',
    'negative reviews',
    'Occupied tables',
    'Needs attention',
];

$missingCriticalLiterals = [];
foreach ($requiredLiteralSources as $source) {
    $key = 'literal::'.$source;
    if (!array_key_exists($key, $arabic)) {
        $missingCriticalLiterals[] = $source;
        continue;
    }

    $value = trim((string)$arabic[$key]);
    if ($value === '' || $value === $source) {
        $missingCriticalLiterals[] = $source;
    }
}

$literalCount = 0;
foreach ($arabic as $key => $value) {
    if (is_string($key) && str_starts_with($key, 'literal::')) {
        $literalCount++;
    }
}

$result = [
    'operation' => 'pmd-audit-admin-ar-r10',
    'english_key_count' => count($english),
    'arabic_total_key_count' => count($arabic),
    'arabic_canonical_override_count' => $arabicOverrideCount,
    'arabic_literal_count' => $literalCount,
    'r10_module_count' => count($moduleFiles),
    'r10_modules' => array_map('basename', $moduleFiles),
    'missing_canonical_keys' => $missingKeys,
    'placeholder_mismatches' => $placeholderMismatches,
    'missing_critical_literals' => $missingCriticalLiterals,
    'identical_nontechnical_count' => count($identicalNonTechnical),
    'identical_nontechnical' => $identicalNonTechnical,
];

$failures = [];
if (count($moduleFiles) < 9) $failures[] = 'Expected at least 9 R10 Arabic modules.';
if ($missingKeys) $failures[] = 'Arabic catalogue is missing canonical English keys.';
if ($placeholderMismatches) $failures[] = 'Placeholder parity failed.';
if ($missingCriticalLiterals) $failures[] = 'Critical visible Admin literals are missing.';
if ($identicalNonTechnical) $failures[] = 'Nontechnical canonical strings still fall back to English.';

$result['ok'] = !$failures;
$result['failures'] = $failures;

if (isset($options['json'])) {
    echo json_encode(
        $result,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    ).PHP_EOL;
} else {
    echo "PMD ADMIN ARABIC R10 AUDIT\n";
    echo "Canonical EN keys:        ".count($english)."\n";
    echo "Arabic total keys:        ".count($arabic)."\n";
    echo "Arabic canonical changes: {$arabicOverrideCount}\n";
    echo "Arabic literal entries:   {$literalCount}\n";
    echo "R10 modules:               ".count($moduleFiles)."\n";
    echo "Missing canonical keys:    ".count($missingKeys)."\n";
    echo "Placeholder mismatches:    ".count($placeholderMismatches)."\n";
    echo "Missing critical literals: ".count($missingCriticalLiterals)."\n";
    echo "English fallbacks:         ".count($identicalNonTechnical)."\n";

    if ($identicalNonTechnical) {
        echo "\nNONTECHNICAL ENGLISH FALLBACKS:\n";
        foreach ($identicalNonTechnical as $key => $value) {
            echo "  {$key} = ".json_encode($value, JSON_UNESCAPED_UNICODE)."\n";
        }
    }

    if ($placeholderMismatches) {
        echo "\nPLACEHOLDER MISMATCHES:\n";
        foreach ($placeholderMismatches as $key => $row) {
            echo "  {$key}: EN=".json_encode($row['en'])." AR=".json_encode($row['ar'])."\n";
        }
    }

    if ($missingCriticalLiterals) {
        echo "\nMISSING CRITICAL LITERALS:\n";
        foreach ($missingCriticalLiterals as $value) echo "  {$value}\n";
    }

    echo "\n".($failures ? '[FAIL]' : '[OK]').' '.($failures
        ? implode(' ', $failures)
        : 'Arabic Admin R10 catalogue passed strict audit.')."\n";
}

exit($failures ? 1 : 0);

function placeholderTokens(string $value): array
{
    preg_match_all(
        '/(?::[A-Za-z_][A-Za-z0-9_]*|\{[A-Za-z_][A-Za-z0-9_]*\})/',
        $value,
        $matches
    );

    $tokens = $matches[0] ?? [];
    sort($tokens, SORT_STRING);
    return array_values($tokens);
}
