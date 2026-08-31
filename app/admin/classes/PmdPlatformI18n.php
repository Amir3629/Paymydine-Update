<?php

declare(strict_types=1);

namespace Admin\Classes;

/**
 * Canonical PayMyDine platform translation reader.
 *
 * ONE-FILE-PER-LOCALE CONTRACT
 * ----------------------------
 * Every translated word owned by a locale lives in exactly one file:
 *
 *   app/admin/i18n/platform/<locale>.php
 *
 * The locale file may contain:
 * - __source: English source string => translated string. This is the primary
 *   vocabulary and is shared by PMD/custom UI and native TastyIgniter copy.
 * - flat PMD keys: optional context-specific overrides for canonical PMD keys.
 * - __native: optional context-specific nested overlays for admin/main/system.
 *
 * Required language/<locale>/*/lang.php files are bridges only. They contain
 * no translated copy and resolve their English framework tree through this
 * one master catalogue.
 *
 * This class never mutates Laravel/TastyIgniter locale state.
 */
final class PmdPlatformI18n
{
    /** @var array<string,array<string,mixed>> */
    private static array $catalogues = [];

    /** @var array<string,array<string,string>> */
    private static array $messages = [];

    /** @var array<string,array<string,string>> */
    private static array $sourceMaps = [];

    /** @var string[]|null */
    private static ?array $locales = null;

    private static function directory(): string
    {
        return base_path('app/admin/i18n/platform');
    }

    /** @return string[] */
    public static function availableLocales(): array
    {
        if (is_array(self::$locales)) {
            return self::$locales;
        }

        $locales = [];
        foreach (glob(self::directory().'/*.php') ?: [] as $path) {
            $locale = strtolower((string)pathinfo($path, PATHINFO_FILENAME));
            if (preg_match('/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/', $locale)) {
                $locales[] = $locale;
            }
        }

        sort($locales);

        return self::$locales = array_values(array_unique($locales));
    }

    public static function normalizeLocale($locale): string
    {
        $locale = strtolower(str_replace('_', '-', trim((string)$locale)));
        $available = self::availableLocales();

        if (in_array($locale, $available, true)) {
            return $locale;
        }

        $base = explode('-', $locale, 2)[0] ?? '';
        if ($base !== '' && in_array($base, $available, true)) {
            return $base;
        }

        return in_array('en', $available, true)
            ? 'en'
            : ($available[0] ?? 'en');
    }

    public static function currentLocale(): string
    {
        $fallback = function_exists('app') && app()->bound('config')
            ? (string)app()->getLocale()
            : 'en';

        $candidate = $fallback;
        if (function_exists('request')) {
            try {
                $candidate = (string)request()->cookie('pmd_admin_locale', $fallback);
            } catch (\Throwable $exception) {
                $candidate = $fallback;
            }
        }

        return self::normalizeLocale($candidate);
    }

    /** @return array<string,mixed> */
    public static function catalogue(?string $locale = null): array
    {
        $locale = self::normalizeLocale($locale ?? self::currentLocale());
        if (isset(self::$catalogues[$locale])) {
            return self::$catalogues[$locale];
        }

        $path = self::directory().'/'.$locale.'.php';
        $catalogue = is_file($path) ? require $path : [];
        if (!is_array($catalogue)) {
            $catalogue = [];
        }

        return self::$catalogues[$locale] = $catalogue;
    }

    /** @return array<string,string> */
    public static function sourceMap(?string $locale = null): array
    {
        $locale = self::normalizeLocale($locale ?? self::currentLocale());
        if (isset(self::$sourceMaps[$locale])) {
            return self::$sourceMaps[$locale];
        }

        $raw = self::catalogue($locale)['__source'] ?? [];
        $clean = [];
        if (is_array($raw)) {
            foreach ($raw as $source => $target) {
                if (!is_string($source) || $source === '' || !is_scalar($target)) {
                    continue;
                }
                $clean[$source] = (string)$target;
            }
        }

        return self::$sourceMaps[$locale] = $clean;
    }

    /** @return array<string,string> */
    public static function messages(?string $locale = null): array
    {
        $locale = self::normalizeLocale($locale ?? self::currentLocale());
        if (isset(self::$messages[$locale])) {
            return self::$messages[$locale];
        }

        $catalogue = self::catalogue($locale);
        $clean = [];

        // English remains the canonical key/source authority.
        if ($locale !== 'en') {
            $sourceMap = self::sourceMap($locale);
            foreach (self::messages('en') as $key => $english) {
                if (array_key_exists($english, $sourceMap)) {
                    $clean[$key] = $sourceMap[$english];
                }
            }
        }

        // Context-specific PMD key overrides win over source-string mappings.
        foreach ($catalogue as $key => $value) {
            if (!is_string($key) || str_starts_with($key, '__') || !is_scalar($value)) {
                continue;
            }
            $clean[$key] = (string)$value;
        }

        return self::$messages[$locale] = $clean;
    }

    /** @return array<string,mixed> */
    public static function nativeOverlay(string $scope, ?string $locale = null): array
    {
        $scope = strtolower(trim($scope));
        if (!in_array($scope, ['admin', 'main', 'system'], true)) {
            throw new \InvalidArgumentException('Unsupported PMD native language scope: '.$scope);
        }

        $catalogue = self::catalogue($locale);
        $native = $catalogue['__native'] ?? [];
        if (!is_array($native)) {
            return [];
        }

        $overlay = $native[$scope] ?? [];
        return is_array($overlay) ? $overlay : [];
    }

    /**
     * Translate every scalar English string in a native framework tree through
     * the locale's __source map, then apply the optional path-specific overlay.
     * This keeps Turkish words out of language/tr/* bridge files while still
     * satisfying TastyIgniter's native file layout.
     *
     * @param array<string|int,mixed> $source
     * @return array<string|int,mixed>
     */
    public static function translateNativeTree(array $source, string $scope, ?string $locale = null): array
    {
        $locale = self::normalizeLocale($locale ?? self::currentLocale());
        if ($locale === 'en') {
            return $source;
        }

        $sourceMap = self::sourceMap($locale);
        $translated = self::translateNativeValues($source, $sourceMap);

        return self::mergeNativeTree(
            $translated,
            self::nativeOverlay($scope, $locale)
        );
    }

    /**
     * @param array<string|int,mixed> $values
     * @param array<string,string> $sourceMap
     * @return array<string|int,mixed>
     */
    private static function translateNativeValues(array $values, array $sourceMap): array
    {
        foreach ($values as $key => $value) {
            if (is_array($value)) {
                $values[$key] = self::translateNativeValues($value, $sourceMap);
                continue;
            }

            if (is_string($value) && array_key_exists($value, $sourceMap)) {
                $values[$key] = $sourceMap[$value];
            }
        }

        return $values;
    }

    /**
     * @param array<string|int,mixed> $source
     * @param array<string|int,mixed> $overlay
     * @return array<string|int,mixed>
     */
    public static function mergeNativeTree(array $source, array $overlay): array
    {
        foreach ($overlay as $key => $translated) {
            if (is_array($translated) && isset($source[$key]) && is_array($source[$key])) {
                $source[$key] = self::mergeNativeTree($source[$key], $translated);
                continue;
            }

            if (array_key_exists($key, $source)) {
                $source[$key] = $translated;
            }
        }

        return $source;
    }

    /** @param array<string,scalar|null> $replace */
    public static function fromEnglish(
        string $value,
        string $prefix = '',
        array $replace = [],
        ?string $locale = null,
        ?string $fallback = null
    ): string {
        if ($value === '') return $fallback ?? $value;
        $prefix = trim($prefix);
        static $sourceIndexes = [];
        if (!array_key_exists($prefix, $sourceIndexes)) {
            $index = [];
            foreach (self::messages('en') as $key => $source) {
                if ($prefix !== '' && !str_starts_with((string)$key, $prefix)) continue;
                if (is_string($source) && $source !== '' && !array_key_exists($source, $index)) $index[$source] = (string)$key;
            }
            $sourceIndexes[$prefix] = $index;
        }
        $key = $sourceIndexes[$prefix][$value] ?? null;
        if (!$key) return $fallback ?? $value;
        return self::translate($key, $replace, $locale, $fallback ?? $value);
    }

    public static function translateStructure($value, string $prefix = '', ?string $locale = null)
    {
        if (is_string($value)) return self::fromEnglish($value, $prefix, [], $locale, $value);
        if (!is_array($value)) return $value;
        $translated = [];
        foreach ($value as $key => $item) $translated[$key] = self::translateStructure($item, $prefix, $locale);
        return $translated;
    }

    /** @param array<string,scalar|null> $replace */
    public static function translate(
        string $key,
        array $replace = [],
        ?string $locale = null,
        ?string $fallback = null
    ): string {
        $locale = self::normalizeLocale($locale ?? self::currentLocale());
        $messages = self::messages($locale);
        $english = self::messages('en');

        $value = $messages[$key] ?? $english[$key] ?? $fallback ?? $key;

        if (!$replace) {
            return (string)$value;
        }

        $tokens = [];
        foreach ($replace as $name => $replacement) {
            $replacement = (string)$replacement;
            $tokens[':'.$name] = $replacement;
            $tokens['{'.$name.'}'] = $replacement;
        }

        return strtr((string)$value, $tokens);
    }
}
