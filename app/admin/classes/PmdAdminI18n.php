<?php

declare(strict_types=1);

namespace Admin\Classes;

/**
 * Key-based PayMyDine Admin translations.
 *
 * This class deliberately does not call app()->setLocale() or
 * translator.localization->setLocale(). TastyIgniter/Laravel middleware remains
 * responsible for framework locale. PMD only resolves which catalogue column
 * to read so standalone Admin workspaces can share the same EN/DE messages.
 */
final class PmdAdminI18n
{
    /** @var array<string,mixed>|null */
    private static $catalogue;

    /** @return array<string,mixed> */
    public static function catalogue(): array
    {
        if (is_array(self::$catalogue)) {
            return self::$catalogue;
        }

        $path = base_path('app/admin/i18n/pmd_admin_catalog.php');
        $catalogue = is_file($path) ? require $path : [];

        self::$catalogue = is_array($catalogue) ? $catalogue : [];

        return self::$catalogue;
    }

    /** @return string[] */
    public static function supportedLocales(): array
    {
        $locales = self::catalogue()['supported_locales'] ?? ['en', 'de'];
        $locales = is_array($locales) ? $locales : ['en', 'de'];

        return array_values(array_filter(array_map(
            static function ($locale): string {
                return strtolower(trim((string)$locale));
            },
            $locales
        )));
    }

    public static function normalizeLocale($locale): string
    {
        $locale = strtolower(trim((string)$locale));

        return in_array($locale, self::supportedLocales(), true)
            ? $locale
            : 'en';
    }

    /**
     * Resolve the PMD UI locale without mutating framework state.
     *
     * The cookie is retained as a compatibility input because the current
     * language switcher writes it. Once the platform is fully migrated, this
     * method can be reduced to the TastyIgniter staff locale in one place.
     */
    public static function currentLocale(): string
    {
        $fallback = function_exists('app') && app()->bound('config')
            ? app()->getLocale()
            : 'en';

        $candidate = $fallback;

        if (function_exists('request')) {
            try {
                $candidate = request()->cookie('pmd_admin_locale', $fallback);
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
        $result = [];

        foreach ((self::catalogue()['messages'] ?? []) as $key => $message) {
            if (!is_array($message)) {
                continue;
            }

            $value = (string)($message[$locale] ?? $message['en'] ?? '');
            if ($value !== '') {
                $result[(string)$key] = $value;
            }
        }

        return $result;
    }

    /**
     * @param array<string,scalar|null> $replace
     */
    public static function translate(
        string $key,
        array $replace = [],
        ?string $locale = null,
        ?string $fallback = null
    ): string {
        $locale = self::normalizeLocale($locale ?? self::currentLocale());
        $message = self::catalogue()['messages'][$key] ?? null;

        if (!is_array($message)) {
            $value = $fallback ?? $key;
        } else {
            $value = (string)($message[$locale] ?? $message['en'] ?? $fallback ?? $key);
        }

        if (!$replace) {
            return $value;
        }

        $tokens = [];
        foreach ($replace as $name => $replacement) {
            $replacement = (string)$replacement;
            $tokens[':'.$name] = $replacement;
            $tokens['{'.$name.'}'] = $replacement;
        }

        return strtr($value, $tokens);
    }
}
