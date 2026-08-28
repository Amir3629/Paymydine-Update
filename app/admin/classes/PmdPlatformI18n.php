<?php

declare(strict_types=1);

namespace Admin\Classes;

/**
 * Canonical PayMyDine-owned Admin UI translation reader.
 *
 * Native TastyIgniter copy remains owned by native lang() keys. This class owns
 * only PMD/custom platform copy under app/admin/i18n/platform/<locale>.php.
 * It never mutates Laravel/TastyIgniter locale state.
 */
final class PmdPlatformI18n
{
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
     * accepted only as a migration compatibility input; this class does not
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

    /** @return array<string,string> */
    public static function messages(?string $locale = null): array
    {
        $locale = self::normalizeLocale($locale ?? self::currentLocale());
        if (isset(self::$messages[$locale])) {
            return self::$messages[$locale];
        }

        $path = self::directory().'/'.$locale.'.php';
        $messages = is_file($path) ? require $path : [];
        if (!is_array($messages)) {
            $messages = [];
        }

        $clean = [];
        foreach ($messages as $key => $value) {
            if (!is_string($key) || !is_scalar($value)) {
                continue;
            }
            $clean[$key] = (string)$value;
        }

        return self::$messages[$locale] = $clean;
    }

    /**
     * @param array<string,scalar|null> $replace
     */

    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16
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
