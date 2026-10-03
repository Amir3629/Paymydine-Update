<?php

declare(strict_types=1);

/*
 * Build the browser-side English→German catalogue used by
 * app/admin/assets/js/pmd-admin-i18n-v1.js.
 *
 * Usage:
 *   php scripts/pmd-build-admin-i18n.php \
 *     --root=/var/www/paymydine \
 *     --custom=/var/www/paymydine/app/admin/i18n/pmd_admin_de.php \
 *     --output=/var/www/paymydine/app/admin/assets/js/pmd-admin-i18n-catalog-de.js \
 *     --report=/var/www/paymydine/storage/logs/pmd-admin-i18n-report.json
 */

$options = getopt('', [
    'root:',
    'custom:',
    'output:',
    'report:',
]);

$root = rtrim((string)($options['root'] ?? dirname(__DIR__)), '/');
$customPath = (string)($options['custom'] ?? $root.'/app/admin/i18n/pmd_admin_de.php');
$outputPath = (string)($options['output'] ?? $root.'/app/admin/assets/js/pmd-admin-i18n-catalog-de.js');
$reportPath = (string)($options['report'] ?? $root.'/storage/logs/pmd-admin-i18n-report.json');

if (!is_file($root.'/vendor/autoload.php') || !is_file($root.'/bootstrap/app.php')) {
    fwrite(STDERR, "ERROR: Invalid PayMyDine root: {$root}\n");
    exit(1);
}

require $root.'/vendor/autoload.php';

$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

/** @return array<string,string> */
function pmdFlattenTranslations(array $values, string $prefix = ''): array
{
    $result = [];

    foreach ($values as $key => $value) {
        $path = $prefix === '' ? (string)$key : $prefix.'.'.$key;

        if (is_array($value)) {
            $result += pmdFlattenTranslations($value, $path);
            continue;
        }

        if (is_scalar($value) || $value === null) {
            $result[$path] = (string)$value;
        }
    }

    return $result;
}

/** @return list<string> */
function pmdPlaceholders(string $value): array
{
    preg_match_all(
        '/%(?:\d+\$)?[bcdeEfFgGosuxX]|:[A-Za-z_][A-Za-z0-9_.]*|\{[^{}]*\}/',
        $value,
        $matches
    );

    $tokens = $matches[0] ?? [];
    sort($tokens);

    return array_values($tokens);
}

$englishLanguage = \System\Models\Languages_model::where('code', 'en')->first();
$germanLanguage = \System\Models\Languages_model::where('code', 'de')->first();

if (!$englishLanguage || !$germanLanguage) {
    fwrite(STDERR, "ERROR: Enabled English/German language records are required.\n");
    exit(1);
}

$sets = [
    ['admin', 'lang'],
    ['main', 'lang'],
    ['system', 'lang'],
    ['system', 'validation'],
];

$catalogue = [];
$sourceKeys = [];
$unchanged = [];
$placeholderErrors = [];
$conflicts = [];
$setStats = [];

foreach ($sets as [$namespace, $group]) {
    $english = $englishLanguage->getLines('en', $group, $namespace);
    $german = $germanLanguage->getLines('de', $group, $namespace);

    if (!is_array($english) || !is_array($german)) {
        $setStats[$namespace.'::'.$group] = [
            'english' => 0,
            'german' => 0,
            'mapped' => 0,
            'error' => 'Translation set did not return arrays.',
        ];
        continue;
    }

    $english = pmdFlattenTranslations($english);
    $german = pmdFlattenTranslations($german);
    $mapped = 0;

    foreach ($english as $key => $source) {
        $target = $german[$key] ?? '';
        $qualifiedKey = $namespace.'::'.$group.'.'.$key;
        $sourceKeys[$qualifiedKey] = $source;

        if (trim($source) === '' || trim($target) === '') {
            continue;
        }

        if ($source === $target) {
            $unchanged[$qualifiedKey] = $source;
            continue;
        }

        $sourcePlaceholders = pmdPlaceholders($source);
        $targetPlaceholders = pmdPlaceholders($target);

        if ($sourcePlaceholders !== $targetPlaceholders) {
            $placeholderErrors[$qualifiedKey] = [
                'source' => $source,
                'target' => $target,
                'source_placeholders' => $sourcePlaceholders,
                'target_placeholders' => $targetPlaceholders,
            ];
            continue;
        }

        if (isset($catalogue[$source]) && $catalogue[$source] !== $target) {
            $conflicts[$source][] = [
                'key' => $qualifiedKey,
                'existing' => $catalogue[$source],
                'candidate' => $target,
            ];
            continue;
        }

        $catalogue[$source] = $target;
        $mapped++;
    }

    $setStats[$namespace.'::'.$group] = [
        'english' => count($english),
        'german' => count($german),
        'mapped' => $mapped,
    ];
}

if (!is_file($customPath)) {
    fwrite(STDERR, "ERROR: Custom catalogue missing: {$customPath}\n");
    exit(1);
}

$custom = require $customPath;

if (!is_array($custom)) {
    fwrite(STDERR, "ERROR: Custom catalogue must return an array.\n");
    exit(1);
}

foreach ($custom as $source => $target) {
    if (!is_string($source) || !is_string($target)) {
        fwrite(STDERR, "ERROR: Custom catalogue keys and values must be strings.\n");
        exit(1);
    }

    if (trim($source) === '' || trim($target) === '') {
        fwrite(STDERR, "ERROR: Empty custom catalogue entry detected.\n");
        exit(1);
    }

    if (pmdPlaceholders($source) !== pmdPlaceholders($target)) {
        fwrite(STDERR, "ERROR: Placeholder mismatch in custom entry: {$source}\n");
        exit(1);
    }

    $catalogue[$source] = $target;
}

uksort(
    $catalogue,
    static fn (string $left, string $right): int =>
        strlen($right) <=> strlen($left) ?: strcmp($left, $right)
);

$json = json_encode(
    $catalogue,
    JSON_UNESCAPED_UNICODE
    | JSON_UNESCAPED_SLASHES
    | JSON_HEX_TAG
    | JSON_HEX_AMP
    | JSON_HEX_APOS
    | JSON_HEX_QUOT
);

if ($json === false) {
    fwrite(STDERR, 'ERROR: JSON encoding failed: '.json_last_error_msg()."\n");
    exit(1);
}

$output = "/* Generated by scripts/pmd-build-admin-i18n.php. Do not edit directly. */\n";
$output .= "window.PMD_ADMIN_I18N_DE = ".$json.";\n";
$output .= "window.PMD_ADMIN_I18N_META = ".json_encode([
    'generated_at' => date(DATE_ATOM),
    'entries' => count($catalogue),
    'custom_entries' => count($custom),
], JSON_UNESCAPED_SLASHES).";\n";

if (!is_dir(dirname($outputPath)) && !mkdir(dirname($outputPath), 0775, true) && !is_dir(dirname($outputPath))) {
    fwrite(STDERR, "ERROR: Could not create output directory.\n");
    exit(1);
}

if (file_put_contents($outputPath, $output) === false) {
    fwrite(STDERR, "ERROR: Could not write catalogue: {$outputPath}\n");
    exit(1);
}

$report = [
    'generated_at' => date(DATE_ATOM),
    'root' => $root,
    'output' => $outputPath,
    'catalogue_entries' => count($catalogue),
    'custom_entries' => count($custom),
    'source_key_count' => count($sourceKeys),
    'unchanged_count' => count($unchanged),
    'placeholder_error_count' => count($placeholderErrors),
    'conflict_count' => count($conflicts),
    'sets' => $setStats,
    'unchanged' => $unchanged,
    'placeholder_errors' => $placeholderErrors,
    'conflicts' => $conflicts,
];

if (!is_dir(dirname($reportPath)) && !mkdir(dirname($reportPath), 0775, true) && !is_dir(dirname($reportPath))) {
    fwrite(STDERR, "ERROR: Could not create report directory.\n");
    exit(1);
}

file_put_contents(
    $reportPath,
    json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)."\n"
);

echo "PMD ADMIN I18N BUILD COMPLETE\n";
echo "Core/custom catalogue entries: ".count($catalogue)."\n";
echo "Custom overrides: ".count($custom)."\n";
echo "Unchanged source rows: ".count($unchanged)."\n";
echo "Placeholder errors skipped: ".count($placeholderErrors)."\n";
echo "Conflicts skipped: ".count($conflicts)."\n";
echo "Catalogue: {$outputPath}\n";
echo "Report: {$reportPath}\n";
