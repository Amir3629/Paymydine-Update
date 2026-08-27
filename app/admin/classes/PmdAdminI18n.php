<?php

declare(strict_types=1);

namespace Admin\Classes;

/**
 * Backward-compatible facade for the canonical platform catalogue.
 *
 * New code should use PmdPlatformI18n directly. Existing Waiter/Cashier Blade
 * views can keep calling PmdAdminI18n while the migration is completed. Both
 * APIs now read the same app/admin/i18n/platform/<locale>.php source files.
 */
final class PmdAdminI18n
{
    /** @var array<string,mixed>|null */
    private static $catalogue;

    /**
     * Legacy-shaped catalogue for compatibility with callers that still inspect
     * supported_locales/messages. No legacy pmd_admin_catalog.php is loaded.
     *
     * @return array<string,mixed>
     */
    public static function catalogue(): array
    {
        if (is_array(self::$catalogue)) {
            return self::$catalogue;
        }

        $locales = PmdPlatformI18n::availableLocales();
        $messages = [];

        foreach ($locales as $locale) {
            foreach (PmdPlatformI18n::messages($locale) as $key => $value) {
                $messages[$key][$locale] = $value;
            }
        }

        return self::$catalogue = [
            'supported_locales' => $locales,
            'messages' => $messages,
        ];
    }

    /** @return string[] */
    public static function supportedLocales(): array
    {
        return PmdPlatformI18n::availableLocales();
    }

    public static function normalizeLocale($locale): string
    {
        return PmdPlatformI18n::normalizeLocale($locale);
    }

    public static function currentLocale(): string
    {
        return PmdPlatformI18n::currentLocale();
    }

    /** @return array<string,string> */
    public static function messages(?string $locale = null): array
    {
        return PmdPlatformI18n::messages($locale);
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
        return PmdPlatformI18n::translate($key, $replace, $locale, $fallback);
    }
}
