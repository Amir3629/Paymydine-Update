<?php

declare(strict_types=1);

$root = rtrim((string)($argv[1] ?? getenv('PMD_ROOT') ?: dirname(__DIR__)), '/');
$directory = $root.'/app/admin/i18n/platform';

if (!is_dir($directory)) {
    fwrite(STDERR, "ERROR=Missing platform catalogue directory: {$directory}\n");
    exit(2);
}

$files = glob($directory.'/*.php') ?: [];
sort($files);

if (!$files) {
    fwrite(STDERR, "ERROR=No locale files found in {$directory}\n");
    exit(3);
}

$catalogues = [];
$failures = [];
$warnings = [];

$placeholderPattern = '/%(?:\d+\$)?[bcdeEfFgGosuxX]|:[A-Za-z_][A-Za-z0-9_.]*|\{[A-Za-z_][A-Za-z0-9_.]*\}/';
$placeholders = static function (string $value) use ($placeholderPattern): array {
    preg_match_all($placeholderPattern, $value, $matches);
    $tokens = array_values(array_unique($matches[0] ?? []));
    sort($tokens);
    return $tokens;
};

foreach ($files as $path) {
    $locale = strtolower((string)pathinfo($path, PATHINFO_FILENAME));
    if (!preg_match('/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/', $locale)) {
        $failures[] = "Invalid locale filename: {$path}";
        continue;
    }

    $messages = require $path;
    if (!is_array($messages)) {
        $failures[] = "{$locale}: locale file must return an array.";
        continue;
    }

    $clean = [];
    foreach ($messages as $key => $value) {
        if (!is_string($key) || !preg_match('/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/', $key)) {
            $failures[] = "{$locale}: invalid semantic key: ".var_export($key, true);
            continue;
        }
        if (!is_string($value) || trim($value) === '') {
            $failures[] = "{$locale}: {$key} has an empty/non-string value.";
            continue;
        }
        if (array_key_exists($key, $clean)) {
            $failures[] = "{$locale}: duplicate key {$key}.";
            continue;
        }
        $clean[$key] = $value;
    }

    ksort($clean);
    $catalogues[$locale] = $clean;
}

if (!isset($catalogues['en'])) {
    $failures[] = 'Canonical en.php catalogue is required.';
}

$canonical = $catalogues['en'] ?? [];
$canonicalKeys = array_keys($canonical);

foreach ($catalogues as $locale => $messages) {
    $keys = array_keys($messages);
    $missing = array_values(array_diff($canonicalKeys, $keys));
    $extra = array_values(array_diff($keys, $canonicalKeys));

    foreach ($missing as $key) {
        $failures[] = "{$locale}: missing key {$key}.";
    }
    foreach ($extra as $key) {
        $failures[] = "{$locale}: extra key {$key} not present in en.php.";
    }

    foreach (array_intersect($canonicalKeys, $keys) as $key) {
        if ($placeholders($canonical[$key]) !== $placeholders($messages[$key])) {
            $failures[] = "{$locale}: placeholder mismatch for {$key}.";
        }
        if ($locale !== 'en' && $messages[$key] === $canonical[$key]) {
            $warnings[] = "{$locale}: identical to English for {$key}.";
        }
    }
}

ksort($catalogues);

echo "PAYMYDINE PLATFORM I18N CATALOGUE VALIDATION\n";
echo "============================================\n";
echo 'LOCALES='.json_encode(array_keys($catalogues), JSON_UNESCAPED_SLASHES)."\n";
echo 'CANONICAL_KEYS='.count($canonicalKeys)."\n";
echo 'FAILURES='.count($failures)."\n";
echo 'WARNINGS='.count($warnings)."\n";

foreach ($warnings as $message) {
    echo "WARN={$message}\n";
}
foreach ($failures as $message) {
    echo "FAIL={$message}\n";
}

if ($failures) {
    exit(1);
}

echo "VALIDATION_OK=1\n";
exit(0);
