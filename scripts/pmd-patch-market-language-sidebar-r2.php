<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$path = $root.'/app/admin/views/_partials/side_nav.blade.php';

if (!is_file($path)) {
    fwrite(STDERR, "Missing sidebar file: {$path}\n");
    exit(2);
}

$text = file_get_contents($path);
if ($text === false) {
    fwrite(STDERR, "Could not read sidebar file.\n");
    exit(3);
}

$markers = [
    '{{-- PMD_SIDEBAR_LANGUAGE_MARKET_TOGGLE_R2 --}}',
    '{{-- PMD_SIDEBAR_LANGUAGE_DIRECT_TOGGLE_20260807 --}}',
];

$start = false;
foreach ($markers as $marker) {
    $candidate = strpos($text, $marker);
    if ($candidate !== false) {
        $start = $candidate;
        break;
    }
}

if ($start === false) {
    fwrite(STDERR, "Could not find PMD sidebar language block.\n");
    exit(4);
}

$phpStart = strpos($text, '@php', $start);
$phpEnd = $phpStart === false ? false : strpos($text, '@endphp', $phpStart);
if ($phpStart === false || $phpEnd === false) {
    fwrite(STDERR, "Could not find PMD sidebar language PHP block boundaries.\n");
    exit(5);
}
$phpEnd += strlen('@endphp');

$block = <<<'BLADE'
{{-- PMD_SIDEBAR_LANGUAGE_MARKET_TOGGLE_R2 --}}
@php
    $pmdMarketCode = strtoupper(trim(
        (string)setting('pmd_market_country_code', 'DE')
    ));

    $pmdMarketProfile =
        (new \App\Services\Platform\CountryPlatformProfileRegistry())
            ->profile($pmdMarketCode);

    $pmdEligibleLocales = array_values(array_unique(array_filter(array_map(
        static fn ($code) => strtolower(trim((string)$code)),
        (array)($pmdMarketProfile['languages']['eligible'] ?? ['en'])
    ))));

    $pmdEnabledLocales = [];
    try {
        $pmdEnabledLocales = \Illuminate\Support\Facades\DB::connection('tenant')
            ->table('languages')
            ->whereIn('code', $pmdEligibleLocales)
            ->where('status', 1)
            ->pluck('code')
            ->map(static fn ($code) => strtolower(trim((string)$code)))
            ->values()
            ->all();
    } catch (\Throwable $ignored) {
        $pmdEnabledLocales = [];
    }

    $pmdAvailableLocales = array_values(array_intersect(
        $pmdEligibleLocales,
        $pmdEnabledLocales
    ));

    if (!$pmdAvailableLocales) {
        $pmdAvailableLocales = $pmdEligibleLocales ?: ['en'];
    }

    $pmdCurrentLocale = strtolower(
        (string)request()->cookie(
            'pmd_admin_locale',
            app()->getLocale()
        )
    );

    if (!in_array($pmdCurrentLocale, $pmdAvailableLocales, true)) {
        $pmdPreferredLocale = strtolower(trim(
            (string)($pmdMarketProfile['languages']['default'] ?? 'en')
        ));

        $pmdCurrentLocale = in_array($pmdPreferredLocale, $pmdAvailableLocales, true)
            ? $pmdPreferredLocale
            : (string)$pmdAvailableLocales[0];
    }

    $pmdNextLocale = $pmdCurrentLocale;
    foreach ($pmdAvailableLocales as $pmdCandidateLocale) {
        if ($pmdCandidateLocale !== $pmdCurrentLocale) {
            $pmdNextLocale = $pmdCandidateLocale;
            break;
        }
    }

    $pmdLanguageNames = [
        'en' => 'English',
        'de' => 'Deutsch',
        'tr' => 'Türkçe',
        'ar' => 'العربية',
    ];

    $pmdNextLanguageLabel =
        $pmdLanguageNames[$pmdNextLocale]
        ?? strtoupper($pmdNextLocale);

    $pmdLanguageEndpoint = url(
        config('system.adminUri', 'admin')
        .'/_pmd/market-language-switch-r2'
    );
@endphp
BLADE;

$text = substr($text, 0, $start).$block.substr($text, $phpEnd);
$text = str_replace(
    "{{ \$pmdNextLocale === 'de' ? 'Deutsch' : 'English' }}",
    '{{ $pmdNextLanguageLabel }}',
    $text
);

if (file_put_contents($path, $text) === false) {
    fwrite(STDERR, "Could not write sidebar file.\n");
    exit(6);
}

echo "PMD market language sidebar patch R2: OK\n";
