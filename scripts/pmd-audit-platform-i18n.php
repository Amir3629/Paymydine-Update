<?php

declare(strict_types=1);

/*
 * PMD_PLATFORM_I18N_PARITY_AUDIT_V2
 *
 * Source of truth for PayMyDine-owned Admin UI copy:
 *   app/admin/i18n/platform/en.php
 *
 * Every installed Admin locale file is discovered automatically and must define
 * every canonical English key. Adding a future full Admin language therefore
 * requires no audit-script whitelist change.
 *
 * Locale-only compatibility entries are allowed under:
 *   literal::*
 *   compat.pattern.*
 */

$root = dirname(__DIR__);
$dir = $root.'/app/admin/i18n/platform';
$catalogues = [];
$failed = false;

function loadCatalogue(string $path): array
{
    if (!is_file($path)) {
        throw new RuntimeException('Catalogue not found: '.$path);
    }

    $messages = require $path;
    if (!is_array($messages)) {
        throw new RuntimeException('Catalogue must return an array: '.$path);
    }

    foreach ($messages as $key => $value) {
        if (!is_string($key) || !is_string($value)) {
            throw new RuntimeException('Catalogue entries must be string => string: '.$path);
        }
    }

    return $messages;
}

function isCompatibilityKey(string $key): bool
{
    return str_starts_with($key, 'literal::')
        || str_starts_with($key, 'compat.pattern.');
}

function placeholders(string $value): array
{
    preg_match_all(
        '/(?:%\d*\$?[bcdeEfFgGosuxX]|:[A-Za-z_][A-Za-z0-9_]*|\{[A-Za-z_][A-Za-z0-9_]*\})/',
        $value,
        $matches
    );

    $tokens = $matches[0] ?? [];
    sort($tokens);
    return $tokens;
}

$paths = glob($dir.'/*.php') ?: [];
$locales = array_values(array_unique(array_map(
    static fn (string $path): string => strtolower((string)pathinfo($path, PATHINFO_FILENAME)),
    $paths
)));
sort($locales);

if (!in_array('en', $locales, true)) {
    fwrite(STDERR, "[FAIL] Canonical English Admin catalogue is missing.\n");
    exit(2);
}

// Keep English first in diagnostics, then audit every discovered translated pack.
$locales = array_values(array_unique(array_merge(['en'], array_diff($locales, ['en']))));

try {
    foreach ($locales as $locale) {
        $catalogues[$locale] = loadCatalogue($dir.'/'.$locale.'.php');
    }
} catch (Throwable $error) {
    fwrite(STDERR, '[FAIL] '.$error->getMessage().PHP_EOL);
    exit(2);
}

$english = array_filter(
    $catalogues['en'],
    static fn ($value, $key): bool => !isCompatibilityKey((string)$key),
    ARRAY_FILTER_USE_BOTH
);
$canonicalKeys = array_keys($english);

foreach (array_values(array_diff($locales, ['en'])) as $locale) {
    $localeCanonical = array_filter(
        $catalogues[$locale],
        static fn ($value, $key): bool => !isCompatibilityKey((string)$key),
        ARRAY_FILTER_USE_BOTH
    );

    $missing = array_values(array_diff($canonicalKeys, array_keys($localeCanonical)));
    $unexpected = array_values(array_diff(array_keys($localeCanonical), $canonicalKeys));
    sort($missing);
    sort($unexpected);

    if ($missing) {
        $failed = true;
        fwrite(STDERR, sprintf(
            "[FAIL] %s is missing %d canonical key(s):\n  - %s\n",
            strtoupper($locale),
            count($missing),
            implode("\n  - ", $missing)
        ));
    } else {
        echo '[OK] '.strtoupper($locale).' canonical key parity: '.count($canonicalKeys).PHP_EOL;
    }

    if ($unexpected) {
        $failed = true;
        fwrite(STDERR, sprintf(
            "[FAIL] %s has %d unexpected canonical key(s):\n  - %s\n",
            strtoupper($locale),
            count($unexpected),
            implode("\n  - ", $unexpected)
        ));
    }

    foreach ($canonicalKeys as $key) {
        if (!array_key_exists($key, $localeCanonical)) continue;

        $sourceTokens = placeholders((string)$english[$key]);
        $targetTokens = placeholders((string)$localeCanonical[$key]);

        if ($sourceTokens !== $targetTokens) {
            $failed = true;
            fwrite(STDERR, sprintf(
                "[FAIL] %s placeholder mismatch at %s\n  EN: %s\n  %s: %s\n",
                strtoupper($locale),
                $key,
                json_encode($sourceTokens, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                strtoupper($locale),
                json_encode($targetTokens, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
            ));
        }
    }
}

echo '[INFO] Admin locale packs discovered: '.implode(', ', $locales).PHP_EOL;
echo '[INFO] EN canonical entries: '.count($canonicalKeys).PHP_EOL;

if (isset($catalogues['tr'])) {
    $turkishLiterals = array_filter(
        $catalogues['tr'],
        static fn ($value, $key): bool => str_starts_with((string)$key, 'literal::'),
        ARRAY_FILTER_USE_BOTH
    );
    $turkishPatterns = array_filter(
        $catalogues['tr'],
        static fn ($value, $key): bool => str_starts_with((string)$key, 'compat.pattern.'),
        ARRAY_FILTER_USE_BOTH
    );

    echo '[INFO] TR legacy/native compatibility literals: '.count($turkishLiterals).PHP_EOL;
    echo '[INFO] TR dynamic compatibility patterns: '.count($turkishPatterns).PHP_EOL;
}

if ($failed) {
    fwrite(STDERR, "PMD platform i18n audit FAILED.\n");
    exit(1);
}

echo "PMD platform i18n audit PASSED.\n";
