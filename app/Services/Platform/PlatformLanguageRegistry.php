<?php

namespace App\Services\Platform;

/**
 * PMD_PLATFORM_LANGUAGE_REGISTRY_R1
 *
 * One locale definition can serve several independent product capabilities:
 * - market/customer locale: framework language row + customer-menu runtime
 * - admin locale: a complete canonical app/admin/i18n/platform/<locale>.php pack
 *
 * A restaurant can therefore offer a customer language without exposing an
 * incomplete Admin translation. This keeps market language activation and
 * Admin translation rollout safely decoupled.
 */
final class PlatformLanguageRegistry
{
    public const VERSION = '1.0.0';

    /** @return array<string,array{name:string,idiom:string,direction:string}> */
    public function definitions(): array
    {
        return [
            'en' => ['name' => 'English', 'idiom' => 'english', 'direction' => 'ltr'],
            'de' => ['name' => 'Deutsch', 'idiom' => 'german', 'direction' => 'ltr'],
            'tr' => ['name' => 'Türkçe', 'idiom' => 'turkish', 'direction' => 'ltr'],
            'ar' => ['name' => 'العربية', 'idiom' => 'arabic', 'direction' => 'rtl'],
        ];
    }

    public function normalize($locale): string
    {
        return strtolower(str_replace('_', '-', trim((string)$locale)));
    }

    /** @return array{name:string,idiom:string,direction:string}|null */
    public function definition(string $locale): ?array
    {
        $locale = $this->normalize($locale);
        $base = explode('-', $locale, 2)[0] ?? $locale;

        return $this->definitions()[$locale]
            ?? $this->definitions()[$base]
            ?? null;
    }

    public function name(string $locale): string
    {
        $definition = $this->definition($locale);
        return $definition['name'] ?? strtoupper($this->normalize($locale));
    }

    public function idiom(string $locale): string
    {
        $definition = $this->definition($locale);
        return $definition['idiom'] ?? $this->normalize($locale);
    }

    public function direction(string $locale): string
    {
        $definition = $this->definition($locale);
        return ($definition['direction'] ?? 'ltr') === 'rtl' ? 'rtl' : 'ltr';
    }

    /**
     * A market pack only needs framework compatibility files. Customer-menu UI
     * translations are owned independently by Frontend V2.
     */
    public function marketPackReady(string $locale): bool
    {
        $locale = $this->normalize($locale);
        $base = explode('-', $locale, 2)[0] ?? $locale;

        if ($base === 'en') return true;

        $directory = base_path('language/'.$base);

        return is_dir($directory)
            && is_file($directory.'/admin/lang.php')
            && is_file($directory.'/main/lang.php')
            && is_file($directory.'/system/lang.php');
    }

    /**
     * Admin availability additionally requires a complete canonical PMD Admin
     * catalogue. This is intentionally stricter than market/customer support.
     */
    public function adminPackReady(string $locale): bool
    {
        $locale = $this->normalize($locale);
        $base = explode('-', $locale, 2)[0] ?? $locale;

        return $this->marketPackReady($base)
            && is_file(base_path('app/admin/i18n/platform/'.$base.'.php'));
    }
}
