<?php

namespace App\Services\WhatsApp;

/**
 * R34: deterministic WhatsApp reservation language. No phone-country guessing,
 * no silent English fallback after the guest selected German/Turkish/Arabic.
 */
final class PmdWhatsAppLocalePolicy
{
    private const META = [
        'de' => 'de_DE',
        'en' => 'en_GB',
        'tr' => 'tr',
        'ar' => 'ar',
    ];

    public static function normalize(string $locale, string $fallback = 'de'): string
    {
        $language = strtolower(substr(trim($locale), 0, 2));
        if (isset(self::META[$language])) {
            return $language;
        }

        $default = strtolower(substr(trim($fallback), 0, 2));
        return isset(self::META[$default]) ? $default : 'de';
    }

    public static function metaCode(string $locale): string
    {
        return self::META[self::normalize($locale)];
    }

    /** A comma-separated operator assertion about *approved* WABA templates. */
    public static function isApproved(string $locale, string $operatorLocales): bool
    {
        $code = self::metaCode($locale);
        $allowed = array_map('trim', explode(',', $operatorLocales));
        // No approvals configured => shared sending remains fail closed.
        return $operatorLocales !== '' && in_array($code, $allowed, true);
    }

    public static function approvedCodes(string $operatorLocales): array
    {
        return array_values(array_filter(array_unique(array_map(
            'trim', explode(',', $operatorLocales)
        )), static fn (string $code): bool => in_array($code, array_values(self::META), true)));
    }
}
