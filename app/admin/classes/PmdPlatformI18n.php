<?php

declare(strict_types=1);

namespace Admin\Classes;

/**
 * Canonical PayMyDine platform translation reader.
 *
 * ONE-FILE-PER-LOCALE CONTRACT
 * ----------------------------
 * Every PayMyDine-owned translation for a locale lives in exactly one file:
 *
 *   app/admin/i18n/platform/<locale>.php
 *
 * Flat string keys in that file are the PMD/custom UI catalogue. The optional
 * __native section contains complete overlays for TastyIgniter's native
 * admin/main/system language trees. The required language/<locale>/*/lang.php
 * files are bridges only and must not own translated copy themselves.
 *
 * This class never changes Laravel/TastyIgniter locale state.
 */
final class PmdPlatformI18n
{
    /** @var array<string,array<string,mixed>> */
    private static array $catalogues = [];

    /** @var array<string,array<string,string>> */
    private static array $messages = [];

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

    /**
     * Read the already-resolved application locale. The existing PMD cookie is
     * accepted only as migration compatibility input; this class does not
     * write the cookie or call setLocale().
     */
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
    public static function messages(?string $locale = null): array
    {
        $locale = self::normalizeLocale($locale ?? self::currentLocale());
        if (isset(self::$messages[$locale])) {
            return self::$messages[$locale];
        }

        $clean = [];
        foreach (self::catalogue($locale) as $key => $value) {
            // Reserved metadata/bridge sections start with __ and arrays are
            // never exposed as PMD string messages.
            if (!is_string($key) || str_starts_with($key, '__') || !is_scalar($value)) {
                continue;
            }
            $clean[$key] = (string)$value;
        }

        return self::$messages[$locale] = $clean;
    }

    /**
     * Return the locale-owned native TastyIgniter overlay for one scope.
     * Scope is deliberately closed so a language file cannot read arbitrary
     * application paths through this API.
     *
     * @return array<string,mixed>
     */
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
     * Recursively overlay translated native values over the canonical English
     * language tree. Missing entries remain English by design; the audit tool
     * is responsible for preventing an incomplete locale from being shipped.
     *
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

            // Never add arbitrary unknown branches to framework language data.
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
        $english = $locale === 'en' ? $messages : self::messages('en');

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
