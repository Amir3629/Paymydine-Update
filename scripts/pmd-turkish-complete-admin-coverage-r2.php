<?php

declare(strict_types=1);

/*
 * PMD Turkish Admin complete coverage R2.
 *
 * Run ONLY after pmd-turkish-server-authority-hotfix.php V1.
 *
 * Goals:
 * - preserve Turkish on every confirmed CURRENT server-first Admin authority
 * - keep Turkish wording owned by app/admin/i18n/platform/tr.php
 * - repair the standalone clean-workspace language switch to use the
 *   market-aware language endpoint
 * - localize explicit no-translate islands on the server
 * - expose PMDAdminI18n.auditVisible() to find catalogue-known leftovers on
 *   the real authenticated page, including skipped islands
 * - never touch tenant/payment/currency data
 * - abort before source writes if an expected source pattern is not exact
 */

$options = getopt('', ['root::']);
$root = rtrim((string)($options['root'] ?? dirname(__DIR__)), '/');

$targets = [
    'app/admin/classes/PmdPlatformI18n.php',
    'app/admin/views/_partials/pmd_clean_workspace_shared_v1.blade.php',
    'app/admin/views/_partials/pmd_operational_date_range_v1.blade.php',
    'app/admin/views/_partials/pmd_cashier_lab_current_orders_v1.blade.php',
    'app/admin/views/_partials/pmd_reservations_lab_schedule_v1.blade.php',
    'app/admin/views/_partials/notification_bell.blade.php',
    'app/admin/views/reservations2/_reservation_composer.blade.php',
    'app/admin/controllers/Managerlab.php',
    'app/admin/assets/js/pmd-coupon-simplify-r23.js',
    'app/admin/assets/js/pmd-admin-i18n-v1.js',
    'app/admin/i18n/platform/tr.php',
];

foreach ($targets as $path) {
    if (!is_file($root.'/'.$path)) {
        fwrite(STDERR, "ERROR: required file missing: {$path}\n");
        exit(2);
    }
}

function pmdR2Read(string $root, string $path): string
{
    $value = file_get_contents($root.'/'.$path);
    if ($value === false) {
        throw new RuntimeException('Could not read '.$path);
    }
    return $value;
}

function pmdR2Replace(
    string $value,
    string $search,
    string $replace,
    int $expected,
    string $label
): string {
    $count = substr_count($value, $search);
    if ($count !== $expected) {
        throw new RuntimeException(
            "Expected {$expected} occurrence(s) of {$label}, found {$count}. No source files were changed."
        );
    }

    return str_replace($search, $replace, $value);
}

/** @param array<string,string> $translations */
function pmdR2AddTurkishLiterals(string $source, array $translations): string
{
    $marker = "\$literals = [\n";
    if (substr_count($source, $marker) !== 1) {
        throw new RuntimeException('Could not locate the canonical $literals array in tr.php.');
    }

    $lines = [];
    foreach ($translations as $english => $turkish) {
        $englishExport = var_export($english, true);
        if (strpos($source, $englishExport.' =>') !== false) {
            continue;
        }
        $lines[] = '    '.$englishExport.' => '.var_export($turkish, true).',';
    }

    if (!$lines) return $source;

    $block =
        "    // PMD_TR_COMPLETE_ADMIN_COVERAGE_R2\n".
        implode("\n", $lines)."\n";

    return str_replace($marker, $marker.$block, $source);
}

try {
    $patched = [];
    foreach ($targets as $path) {
        $patched[$path] = pmdR2Read($root, $path);
    }

    if (
        strpos(
            $patched['app/admin/classes/PmdPlatformI18n.php'],
            'PMD_PLATFORM_I18N_LITERAL_FALLBACK_V1'
        ) === false
    ) {
        throw new RuntimeException(
            'First Turkish server-authority hotfix is not installed. Run V1 before R2.'
        );
    }

    // ------------------------------------------------------------------
    // A) Standalone clean workspace: preserve TR, use the market-aware
    //    language switch and allow the browser runtime to submit tr.
    // ------------------------------------------------------------------
    $path = 'app/admin/views/_partials/pmd_clean_workspace_shared_v1.blade.php';
    if (strpos($patched[$path], 'PMD_CLEAN_WORKSPACE_TR_MARKET_SWITCH_R2') === false) {
        $old = <<<'BLADE'
    $pmdCleanWorkspaceDirectFloorSurface = $pmdCleanWorkspaceReservationsSurface || $pmdCleanWorkspaceCashierSurface;
    $pmdCleanWorkspaceAddReservationLabel = strtolower((string)($pmdCleanWorkspaceLocale ?? 'en')) === 'de'
        ? 'Reservierung hinzufügen'
        : 'Add reservation';
BLADE;
        $new = <<<'BLADE'
    $pmdCleanWorkspaceDirectFloorSurface = $pmdCleanWorkspaceReservationsSurface || $pmdCleanWorkspaceCashierSurface;

    // PMD_CLEAN_WORKSPACE_TR_MARKET_SWITCH_R2
    $pmdCleanWorkspaceUiLocale = \Admin\Classes\PmdPlatformI18n::normalizeLocale(
        (string)($pmdCleanWorkspaceLocale ?? app()->getLocale())
    );
    $pmdCleanWorkspaceT = static function (string $source) use ($pmdCleanWorkspaceUiLocale): string {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish(
            $source,
            '',
            [],
            $pmdCleanWorkspaceUiLocale,
            $source
        );
    };
    $pmdCleanWorkspaceAddReservationLabel = $pmdCleanWorkspaceUiLocale === 'de'
        ? 'Reservierung hinzufügen'
        : $pmdCleanWorkspaceT('Add reservation');
BLADE;
        $patched[$path] = pmdR2Replace(
            $patched[$path],
            $old,
            $new,
            1,
            'clean workspace Add reservation locale block'
        );

        $old = <<<'BLADE'
    $pmdCleanWorkspaceHeaderLocale = strtolower((string)($pmdCleanWorkspaceLocale ?? 'en'));
    $pmdCleanWorkspaceHeaderLocale = $pmdCleanWorkspaceHeaderLocale === 'de' ? 'de' : 'en';
    $pmdCleanWorkspaceHeaderNextLocale = $pmdCleanWorkspaceHeaderLocale === 'de' ? 'en' : 'de';
    $pmdCleanWorkspaceLanguageEndpoint = url(config('system.adminUri', 'admin').'/_pmd/language-switch-v3');
BLADE;
        $new = <<<'BLADE'
    $pmdCleanWorkspaceHeaderLocale = $pmdCleanWorkspaceUiLocale;
    $pmdCleanWorkspaceHeaderEligibleLocales = [];

    try {
        $pmdCleanWorkspaceHeaderCountry = strtoupper(trim((string)setting(
            'pmd_market_country_code',
            'DE'
        )));
        $pmdCleanWorkspaceHeaderProfile =
            (new \App\Services\Platform\CountryPlatformProfileRegistry())
                ->profile($pmdCleanWorkspaceHeaderCountry);
        $pmdCleanWorkspaceHeaderEligibleLocales = array_values(array_unique(array_filter(array_map(
            static fn ($code) => \Admin\Classes\PmdPlatformI18n::normalizeLocale($code),
            (array)($pmdCleanWorkspaceHeaderProfile['languages']['eligible'] ?? [])
        ))));
    } catch (\Throwable $pmdCleanWorkspaceHeaderLanguageError) {
        $pmdCleanWorkspaceHeaderEligibleLocales = [];
    }

    $pmdCleanWorkspaceHeaderEligibleLocales = array_values(array_filter(
        $pmdCleanWorkspaceHeaderEligibleLocales,
        static fn ($code) => in_array(
            $code,
            \Admin\Classes\PmdPlatformI18n::availableLocales(),
            true
        )
    ));

    if (!$pmdCleanWorkspaceHeaderEligibleLocales) {
        $pmdCleanWorkspaceHeaderEligibleLocales = [$pmdCleanWorkspaceHeaderLocale];
    }
    if (!in_array($pmdCleanWorkspaceHeaderLocale, $pmdCleanWorkspaceHeaderEligibleLocales, true)) {
        array_unshift($pmdCleanWorkspaceHeaderEligibleLocales, $pmdCleanWorkspaceHeaderLocale);
        $pmdCleanWorkspaceHeaderEligibleLocales = array_values(array_unique($pmdCleanWorkspaceHeaderEligibleLocales));
    }

    $pmdCleanWorkspaceHeaderLocaleIndex = array_search(
        $pmdCleanWorkspaceHeaderLocale,
        $pmdCleanWorkspaceHeaderEligibleLocales,
        true
    );
    $pmdCleanWorkspaceHeaderLocaleIndex = $pmdCleanWorkspaceHeaderLocaleIndex === false
        ? 0
        : (int)$pmdCleanWorkspaceHeaderLocaleIndex;
    $pmdCleanWorkspaceHeaderNextLocale = count($pmdCleanWorkspaceHeaderEligibleLocales) > 1
        ? $pmdCleanWorkspaceHeaderEligibleLocales[
            ($pmdCleanWorkspaceHeaderLocaleIndex + 1) % count($pmdCleanWorkspaceHeaderEligibleLocales)
        ]
        : $pmdCleanWorkspaceHeaderLocale;
    $pmdCleanWorkspaceLanguageEndpoint = url(
        config('system.adminUri', 'admin').'/_pmd/market-language-switch-r2'
    );
BLADE;
        $patched[$path] = pmdR2Replace(
            $patched[$path],
            $old,
            $new,
            1,
            'clean workspace EN/DE-only header language block'
        );

        $patched[$path] = pmdR2Replace(
            $patched[$path],
            "aria-label=\"Switch language to {{ strtoupper(\$pmdCleanWorkspaceHeaderNextLocale) }}\"\n                    title=\"Switch language to {{ strtoupper(\$pmdCleanWorkspaceHeaderNextLocale) }}\">",
            "aria-label=\"{{ \$pmdCleanWorkspaceT('Change language') }}: {{ strtoupper(\$pmdCleanWorkspaceHeaderNextLocale) }}\"\n                    title=\"{{ \$pmdCleanWorkspaceT('Change language') }}: {{ strtoupper(\$pmdCleanWorkspaceHeaderNextLocale) }}\">",
            1,
            'clean workspace language button label'
        );

        $patched[$path] = pmdR2Replace(
            $patched[$path],
            "if(!endpoint||(next!=='en'&&next!=='de'))return;",
            "if(!endpoint||(next!=='en'&&next!=='de'&&next!=='tr'))return;",
            1,
            'clean workspace language runtime EN/DE allow-list'
        );
    }

    // ------------------------------------------------------------------
    // B) Shared operational Date Range: server-first TR, including future
    //    presets used by Reservations and historical presets used by Cashier.
    // ------------------------------------------------------------------
    $path = 'app/admin/views/_partials/pmd_operational_date_range_v1.blade.php';
    if (strpos($patched[$path], 'PMD_OPERATIONAL_DATE_RANGE_TR_R2') === false) {
        $old = <<<'BLADE'
    $rangeText = $range['text'] ?? [];
    $baseUrl = (string)($range['base_url'] ?? url()->current());
BLADE;
        $new = <<<'BLADE'
    $rangeText = $range['text'] ?? [];
    $pmdRangeLocale = \Admin\Classes\PmdPlatformI18n::normalizeLocale(app()->getLocale());
    $pmdRangeT = static function (string $source) use ($pmdRangeLocale): string {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish(
            $source,
            '',
            [],
            $pmdRangeLocale,
            $source
        );
    };
    if ($pmdRangeLocale === 'tr') {
        $rangeText = \Admin\Classes\PmdPlatformI18n::translateStructure(
            is_array($rangeText) ? $rangeText : [],
            '',
            'tr'
        );
    }
    $baseUrl = (string)($range['base_url'] ?? url()->current());
BLADE;
        $patched[$path] = pmdR2Replace(
            $patched[$path],
            $old,
            $new,
            1,
            'operational range bootstrap'
        );

        $old = <<<'BLADE'
    $pmdRangeLocale = strtolower((string)app()->getLocale());
    $pmdRangeIsGerman = strpos($pmdRangeLocale, 'de') === 0;
BLADE;
        $new = <<<'BLADE'
    // PMD_OPERATIONAL_DATE_RANGE_TR_R2
    $pmdRangeIsGerman = $pmdRangeLocale === 'de';
BLADE;
        $patched[$path] = pmdR2Replace(
            $patched[$path],
            $old,
            $new,
            1,
            'operational range EN/DE locale collapse'
        );

        $patched[$path] = pmdR2Replace(
            $patched[$path],
            "    \$pmdRangeTomorrowLabel = \$pmdRangeIsGerman ? 'Morgen' : 'Tomorrow';\n    \$pmdRangeNext7Label = \$pmdRangeIsGerman ? 'Nächste 7 Tage' : 'Next 7 days';",
            "    \$pmdRangeTomorrowLabel = \$pmdRangeIsGerman ? 'Morgen' : \$pmdRangeT('Tomorrow');\n    \$pmdRangeNext7Label = \$pmdRangeIsGerman ? 'Nächste 7 Tage' : \$pmdRangeT('Next 7 days');",
            1,
            'operational range future preset labels'
        );

        $replacements = [
            "{{ \$rangeText['date_range'] ?? 'Date range' }}" => "{{ \$rangeText['date_range'] ?? \$pmdRangeT('Date range') }}",
            "{{ \$rangeText['today'] ?? (\$pmdRangeIsGerman ? 'Heute' : 'Today') }}" => "{{ \$rangeText['today'] ?? (\$pmdRangeIsGerman ? 'Heute' : \$pmdRangeT('Today')) }}",
            "{{ \$rangeText['yesterday'] ?? 'Yesterday' }}" => "{{ \$rangeText['yesterday'] ?? \$pmdRangeT('Yesterday') }}",
            "{{ \$rangeText['last_7_days'] ?? 'Last 7 days' }}" => "{{ \$rangeText['last_7_days'] ?? \$pmdRangeT('Last 7 days') }}",
            "{{ \$rangeText['from'] ?? 'From' }}" => "{{ \$rangeText['from'] ?? \$pmdRangeT('From') }}",
            "{{ \$rangeText['to'] ?? 'To' }}" => "{{ \$rangeText['to'] ?? \$pmdRangeT('To') }}",
            "{{ \$rangeText['apply'] ?? 'Apply' }}" => "{{ \$rangeText['apply'] ?? \$pmdRangeT('Apply') }}",
        ];
        foreach ($replacements as $search => $replace) {
            $count = substr_count($patched[$path], $search);
            if ($count < 1) {
                throw new RuntimeException('Operational date-range fallback not found: '.$search);
            }
            $patched[$path] = str_replace($search, $replace, $patched[$path]);
        }
    }

    // ------------------------------------------------------------------
    // C) Cashier current/history cards: server-first Turkish for all visible
    //    labels and toolbar text.
    // ------------------------------------------------------------------
    $path = 'app/admin/views/_partials/pmd_cashier_lab_current_orders_v1.blade.php';
    if (strpos($patched[$path], 'PMD_CASHIER_TR_SERVER_COPY_R2') === false) {
        $old = <<<'BLADE'
    $count = count($orders);
    $pmdCashierIsGerman = strtolower((string)($pmdCleanWorkspaceLocale ?? app()->getLocale())) === 'de';
    $pmdCashierAddReservation = $pmdCashierIsGerman ? 'Reservierung hinzufügen' : 'Add reservation';
    $pmdCashierAddOrder = $pmdCashierIsGerman ? 'Neue Bestellung' : 'New order';
BLADE;
        $new = <<<'BLADE'
    $count = count($orders);
    // PMD_CASHIER_TR_SERVER_COPY_R2
    $pmdCashierLocale = \Admin\Classes\PmdPlatformI18n::normalizeLocale(
        (string)($pmdCleanWorkspaceLocale ?? app()->getLocale())
    );
    $pmdCashierIsGerman = $pmdCashierLocale === 'de';
    $pmdCashierT = static function (string $source) use ($pmdCashierLocale): string {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish(
            $source,
            '',
            [],
            $pmdCashierLocale,
            $source
        );
    };
    if ($pmdCashierLocale === 'tr') {
        $text = \Admin\Classes\PmdPlatformI18n::translateStructure(
            is_array($text) ? $text : [],
            '',
            'tr'
        );
    }
    $pmdCashierAddReservation = $pmdCashierIsGerman
        ? 'Reservierung hinzufügen'
        : $pmdCashierT('Add reservation');
    $pmdCashierAddOrder = $pmdCashierIsGerman
        ? 'Neue Bestellung'
        : $pmdCashierT('New order');
BLADE;
        $patched[$path] = pmdR2Replace(
            $patched[$path],
            $old,
            $new,
            1,
            'Cashier EN/DE server-copy bootstrap'
        );

        $patched[$path] = pmdR2Replace(
            $patched[$path],
            "    \$pmdCashierHistoryButton = \$text['history'] ?? (\$pmdCashierIsGerman ? 'Verlauf' : 'History');\n    \$pmdCashierCurrentButton = \$text['current'] ?? (\$pmdCashierIsGerman ? 'Aktuell' : 'Current');",
            "    \$pmdCashierHistoryButton = \$text['history'] ?? (\$pmdCashierIsGerman ? 'Verlauf' : \$pmdCashierT('History'));\n    \$pmdCashierCurrentButton = \$text['current'] ?? (\$pmdCashierIsGerman ? 'Aktuell' : \$pmdCashierT('Current'));",
            1,
            'Cashier History/Current labels'
        );

        $patched[$path] = pmdR2Replace(
            $patched[$path],
            'title="Select a red occupied table first."',
            'title="{{ $pmdCashierT(\'Select a red occupied table first.\') }}"',
            1,
            'Cashier free-table toolbar title'
        );

        $cashierFallbacks = [
            "{{ \$text['orders'] ?? 'Orders' }}" => "{{ \$text['orders'] ?? \$pmdCashierT('Orders') }}",
            "{{ \$text['free_table'] ?? (\$pmdCashierIsGerman ? 'Tisch freigeben' : 'Free table') }}" => "{{ \$text['free_table'] ?? (\$pmdCashierIsGerman ? 'Tisch freigeben' : \$pmdCashierT('Free table')) }}",
            "(\$text['history_orders'] ?? 'History')" => "(\$text['history_orders'] ?? \$pmdCashierT('History'))",
            "(\$text['order'] ?? 'Order')" => "(\$text['order'] ?? \$pmdCashierT('Order'))",
            "(\$text['orders'] ?? 'Orders')" => "(\$text['orders'] ?? \$pmdCashierT('Orders'))",
            "{{ \$text['items'] ?? 'Items' }}" => "{{ \$text['items'] ?? \$pmdCashierT('Items') }}",
            "{{ \$text['note'] ?? 'Note' }}" => "{{ \$text['note'] ?? \$pmdCashierT('Note') }}",
            "{{ \$text['total'] ?? 'Total' }}" => "{{ \$text['total'] ?? \$pmdCashierT('Total') }}",
            "{{ \$text['paid'] ?? 'Paid' }}" => "{{ \$text['paid'] ?? \$pmdCashierT('Paid') }}",
            "{{ \$text['due'] ?? 'Due' }}" => "{{ \$text['due'] ?? \$pmdCashierT('Due') }}",
            "{{ \$text['open_order'] ?? 'Open order' }}" => "{{ \$text['open_order'] ?? \$pmdCashierT('Open order') }}",
        ];
        foreach ($cashierFallbacks as $search => $replace) {
            $count = substr_count($patched[$path], $search);
            if ($count < 1) {
                throw new RuntimeException('Cashier fallback not found: '.$search);
            }
            $patched[$path] = str_replace($search, $replace, $patched[$path]);
        }
    }

    // ------------------------------------------------------------------
    // D) Reservations Calendar/Hour/Composer bootstrap. It is JSON-driven, so
    //    late DOM translation is not a sufficient authority.
    // ------------------------------------------------------------------
    $path = 'app/admin/views/_partials/pmd_reservations_lab_schedule_v1.blade.php';
    if (strpos($patched[$path], 'PMD_RESERVATIONS_SCHEDULE_TR_R2') === false) {
        $patched[$path] = pmdR2Replace(
            $patched[$path],
            "    \$locale = strtolower((string)(\$schedule['locale'] ?? 'en')) === 'de' ? 'de' : 'en';",
            "    // PMD_RESERVATIONS_SCHEDULE_TR_R2\n    \$locale = \\Admin\\Classes\\PmdPlatformI18n::normalizeLocale(\n        (string)(\$schedule['locale'] ?? app()->getLocale())\n    );\n    if (!in_array(\$locale, ['en', 'de', 'tr'], true)) {\n        \$locale = 'en';\n    }",
            1,
            'Reservations schedule locale collapse'
        );

        $old = <<<'BLADE'
        ];

    // Keep any extra service-provided keys, but make the audited EN/DE copy above
BLADE;
        $new = <<<'BLADE'
        ];

    if ($locale === 'tr') {
        $pmdReservationsLabStrings = \Admin\Classes\PmdPlatformI18n::translateStructure(
            $pmdReservationsLabStrings,
            '',
            'tr'
        );
    }

    // Keep any extra service-provided keys, but make the audited EN/DE copy above
BLADE;
        $patched[$path] = pmdR2Replace(
            $patched[$path],
            $old,
            $new,
            1,
            'Reservations schedule TR structure bridge'
        );

        $patched[$path] = pmdR2Replace(
            $patched[$path],
            "    \$schedule['locale_tag'] = \$locale === 'de' ? 'de-DE' : 'en-GB';",
            "    \$schedule['locale_tag'] = \$locale === 'de'\n        ? 'de-DE'\n        : (\$locale === 'tr' ? 'tr-TR' : 'en-GB');",
            1,
            'Reservations schedule locale tag'
        );
    }

    // ------------------------------------------------------------------
    // E) Global notification dropdown is explicitly data-pmd-no-translate.
    //    Therefore all visible strings must be localized on the server.
    // ------------------------------------------------------------------
    $path = 'app/admin/views/_partials/notification_bell.blade.php';
    if (strpos($patched[$path], 'PMD_NOTIFICATION_TR_SERVER_COPY_R2') === false) {
        $prefix = <<<'BLADE'
@php
    // PMD_NOTIFICATION_TR_SERVER_COPY_R2
    $pmdNotificationLocale = \Admin\Classes\PmdPlatformI18n::currentLocale();
    $pmdNotificationT = static function (string $source) use ($pmdNotificationLocale): string {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish(
            $source,
            '',
            [],
            $pmdNotificationLocale,
            $source
        );
    };
@endphp

BLADE;
        $patched[$path] = $prefix.ltrim($patched[$path]);

        $notificationStrings = [
            '<strong>Notifications</strong>' => '<strong>{{ $pmdNotificationT(\'Notifications\') }}</strong>',
            ">\n        History\n      </a>" => ">\n        {{ \$pmdNotificationT('History') }}\n      </a>",
            '<div id="notification-loading" class="px-3 py-4 text-muted d-none">Loading…</div>' => '<div id="notification-loading" class="px-3 py-4 text-muted d-none">{{ $pmdNotificationT(\'Loading…\') }}</div>',
            '<div id="notification-error"   class="px-3 py-4 text-danger d-none">Failed to load.</div>' => '<div id="notification-error"   class="px-3 py-4 text-danger d-none">{{ $pmdNotificationT(\'Failed to load.\') }}</div>',
            '<div id="notification-empty"   class="px-3 py-4 text-muted d-none">No notifications.</div>' => '<div id="notification-empty"   class="px-3 py-4 text-muted d-none">{{ $pmdNotificationT(\'No notifications.\') }}</div>',
        ];
        foreach ($notificationStrings as $search => $replace) {
            $patched[$path] = pmdR2Replace(
                $patched[$path],
                $search,
                $replace,
                1,
                'notification visible string'
            );
        }
    }

    // ------------------------------------------------------------------
    // F) Reservation Composer feature block was DE/EN only. Keep existing DE,
    //    build the English source for TR, then translate from the canonical file.
    // ------------------------------------------------------------------
    $path = 'app/admin/views/reservations2/_reservation_composer.blade.php';
    if (strpos($patched[$path], 'PMD_RESERVATION_COMPOSER_TR_FEATURES_R2') === false) {
        $old = <<<'BLADE'
  $pmdComposerFeatureLocale = strtolower((string)app()->getLocale());
  $pmdComposerFeatureGerman = strpos($pmdComposerFeatureLocale, 'de') === 0;
BLADE;
        $new = <<<'BLADE'
  // PMD_RESERVATION_COMPOSER_TR_FEATURES_R2
  $pmdComposerFeatureLocale = \Admin\Classes\PmdPlatformI18n::normalizeLocale(app()->getLocale());
  $pmdComposerFeatureGerman = $pmdComposerFeatureLocale === 'de';
BLADE;
        $patched[$path] = pmdR2Replace(
            $patched[$path],
            $old,
            $new,
            1,
            'reservation composer feature locale'
        );

        $old = <<<'BLADE'
    'use_suggestion' => 'Use suggestion',
  ];
@endphp
BLADE;
        $new = <<<'BLADE'
    'use_suggestion' => 'Use suggestion',
  ];

  if ($pmdComposerFeatureLocale === 'tr') {
    $pmdComposerFeatureText = \Admin\Classes\PmdPlatformI18n::translateStructure(
      $pmdComposerFeatureText,
      '',
      'tr'
    );
  }
@endphp
BLADE;
        $patched[$path] = pmdR2Replace(
            $patched[$path],
            $old,
            $new,
            1,
            'reservation composer Turkish feature bridge'
        );
    }

    // ------------------------------------------------------------------
    // G) Manager KPI and online-staff structures were DE/EN only.
    // ------------------------------------------------------------------
    $path = 'app/admin/controllers/Managerlab.php';
    if (strpos($patched[$path], 'PMD_MANAGER_TR_SERVER_COPY_R2') === false) {
        $patched[$path] = pmdR2Replace(
            $patched[$path],
            "        \$de = strtolower(\$locale) === 'de';",
            "        \$de = strtolower(\$locale) === 'de';\n        // PMD_MANAGER_TR_SERVER_COPY_R2\n        \$tr = strtolower(\$locale) === 'tr';\n        \$pmdManagerT = static function (string \$source) use (\$locale): string {\n            return \\Admin\\Classes\\PmdPlatformI18n::fromEnglish(\n                \$source,\n                '',\n                [],\n                \$locale,\n                \$source\n            );\n        };",
            2,
            'Manager DE-only locale declarations'
        );

        $old = <<<'PHP'
        foreach ($cards as $cardKey => &$card) {
            $card['key'] = (string)$cardKey;
        }
PHP;
        $new = <<<'PHP'
        if ($tr) {
            $cards = \Admin\Classes\PmdPlatformI18n::translateStructure(
                $cards,
                '',
                'tr'
            );
        }

        foreach ($cards as $cardKey => &$card) {
            $card['key'] = (string)$cardKey;
        }
PHP;
        $patched[$path] = pmdR2Replace(
            $patched[$path],
            $old,
            $new,
            1,
            'Manager KPI Turkish structure bridge'
        );

        $patched[$path] = pmdR2Replace(
            $patched[$path],
            "        \$this->vars['pmdCleanWorkspaceKpiAriaLabel'] = \$de ? 'Manager-KPIs' : 'Manager KPIs';",
            "        \$this->vars['pmdCleanWorkspaceKpiAriaLabel'] = \$de\n            ? 'Manager-KPIs'\n            : (\$tr ? \$pmdManagerT('Manager KPIs') : 'Manager KPIs');",
            1,
            'Manager KPI aria label'
        );

        $patched[$path] = pmdR2Replace(
            $patched[$path],
            "                    'name' => (string)(\$row['name'] ?? (\$de ? 'Mitarbeiter' : 'Staff')),\n                    'role' => (string)(\$row['role'] ?? (\$de ? 'Mitarbeiter' : 'Staff')),\n                    'since' => \$loginAt\n                        ? ((\$de ? 'Seit ' : 'Since ').\$loginAt->format('H:i'))\n                        : (\$de ? 'Angemeldet' : 'Signed in'),",
            "                    'name' => (string)(\$row['name'] ?? (\$de ? 'Mitarbeiter' : (\$tr ? \$pmdManagerT('Staff') : 'Staff'))),\n                    'role' => (string)(\$row['role'] ?? (\$de ? 'Mitarbeiter' : (\$tr ? \$pmdManagerT('Staff') : 'Staff'))),\n                    'since' => \$loginAt\n                        ? (\$de\n                            ? 'Seit '.\$loginAt->format('H:i')\n                            : (\$tr\n                                ? \$loginAt->format('H:i').' itibarıyla'\n                                : 'Since '.\$loginAt->format('H:i')))\n                        : (\$de ? 'Angemeldet' : (\$tr ? \$pmdManagerT('Signed in') : 'Signed in')),
            1,
            'Manager online row server copy'
        );

        $old = <<<'PHP'
        return [
            'title' => $de ? 'Mitarbeiter online' : 'Staff online',
            'subtitle' => $de
                ? 'Angemeldete Admin-Sitzungen an diesem Standort'
                : 'Signed-in admin sessions at this location',
            'count' => count($rows),
            'count_label' => 'online',
            'empty' => $de
                ? 'Aktuell ist kein Mitarbeiter angemeldet.'
                : 'No staff are currently signed in.',
            'as_of' => ($de ? 'Stand ' : 'As of ').$now->format('H:i'),
PHP;
        $new = <<<'PHP'
        return [
            'title' => $de ? 'Mitarbeiter online' : ($tr ? $pmdManagerT('Staff online') : 'Staff online'),
            'subtitle' => $de
                ? 'Angemeldete Admin-Sitzungen an diesem Standort'
                : ($tr
                    ? $pmdManagerT('Signed-in admin sessions at this location')
                    : 'Signed-in admin sessions at this location'),
            'count' => count($rows),
            'count_label' => $tr ? $pmdManagerT('online') : 'online',
            'empty' => $de
                ? 'Aktuell ist kein Mitarbeiter angemeldet.'
                : ($tr
                    ? $pmdManagerT('No staff are currently signed in.')
                    : 'No staff are currently signed in.'),
            'as_of' => $de
                ? 'Stand '.$now->format('H:i')
                : ($tr
                    ? $now->format('H:i').' itibarıyla'
                    : 'As of '.$now->format('H:i')),
PHP;
        $patched[$path] = pmdR2Replace(
            $patched[$path],
            $old,
            $new,
            1,
            'Manager online card server copy'
        );
    }

    // ------------------------------------------------------------------
    // H) Coupon smart-add card is created dynamically from a DE/EN-only JS
    //    function. Turkish must use the shared runtime catalogue.
    // ------------------------------------------------------------------
    $path = 'app/admin/assets/js/pmd-coupon-simplify-r23.js';
    if (strpos($patched[$path], 'PMD_COUPON_TR_RUNTIME_COPY_R2') === false) {
        $old = <<<'JS'
        return {
            title: 'Add new coupon / card',
            help: 'Create a coupon, gift card or voucher.'
        };
JS;
        $new = <<<'JS'
        // PMD_COUPON_TR_RUNTIME_COPY_R2
        if (
            locale.indexOf('tr') === 0 &&
            window.PMDAdminI18n &&
            typeof window.PMDAdminI18n.translate === 'function'
        ) {
            return {
                title: window.PMDAdminI18n.translate('Add new coupon / card'),
                help: window.PMDAdminI18n.translate('Create a coupon, gift card or voucher.')
            };
        }

        return {
            title: 'Add new coupon / card',
            help: 'Create a coupon, gift card or voucher.'
        };
JS;
        $patched[$path] = pmdR2Replace(
            $patched[$path],
            $old,
            $new,
            1,
            'Coupon EN fallback block'
        );
    }

    // ------------------------------------------------------------------
    // I) Add a live authenticated-page audit to the canonical runtime. It does
    //    NOT translate skipped islands. It only reports known source strings
    //    that still have a different target in the active locale.
    // ------------------------------------------------------------------
    $path = 'app/admin/assets/js/pmd-admin-i18n-v1.js';
    if (strpos($patched[$path], 'PMD_ADMIN_I18N_VISIBLE_AUDIT_R2') === false) {
        $old = <<<'JS'
    addCanonicalEntries();
    addLegacyGermanEntries();

    window.PMDAdminI18n = {
JS;
        $new = <<<'JS'
    // PMD_ADMIN_I18N_VISIBLE_AUDIT_R2
    function auditVisible() {
        var leftovers = [];
        var seen = Object.create(null);
        var attributes = ['placeholder', 'title', 'aria-label', 'data-original-title', 'data-title'];

        if (!document.body || locale === 'en') {
            return {locale: locale, count: 0, leftovers: []};
        }

        function visible(element) {
            if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
            var style = window.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            var rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        }

        function add(kind, source, target, element) {
            source = normalize(source);
            target = normalize(target);
            if (!source || !target || source === target) return;
            var key = kind + '|' + source + '|' + target;
            if (seen[key]) return;
            seen[key] = true;
            leftovers.push({
                kind: kind,
                source: source,
                expected: target,
                skipped: shouldSkip(element),
                tag: element && element.tagName ? element.tagName : '',
                id: element && element.id ? element.id : '',
                className: element && element.className ? String(element.className).slice(0, 160) : ''
            });
        }

        Array.prototype.forEach.call(document.querySelectorAll('body *'), function (element) {
            if (!visible(element)) return;

            if (element.children.length === 0) {
                var text = normalize(element.textContent || '');
                var translated = lookup(text);
                if (translated !== text) add('text', text, translated, element);
            }

            attributes.forEach(function (attribute) {
                if (!element.hasAttribute(attribute)) return;
                var value = normalize(element.getAttribute(attribute) || '');
                var translated = lookup(value);
                if (translated !== value) add(attribute, value, translated, element);
            });
        });

        return {
            version: VERSION,
            locale: locale,
            route: window.location.pathname,
            count: leftovers.length,
            skippedCount: leftovers.filter(function (item) { return item.skipped; }).length,
            leftovers: leftovers.slice(0, 300)
        };
    }

    addCanonicalEntries();
    addLegacyGermanEntries();

    window.PMDAdminI18n = {
JS;
        $patched[$path] = pmdR2Replace(
            $patched[$path],
            $old,
            $new,
            1,
            'PMD Admin i18n API prelude'
        );

        $patched[$path] = pmdR2Replace(
            $patched[$path],
            "        translate: lookup,\n        run: run,\n        reveal: reveal",
            "        translate: lookup,\n        run: run,\n        reveal: reveal,\n        auditVisible: auditVisible",
            1,
            'PMD Admin i18n API methods'
        );
    }

    // ------------------------------------------------------------------
    // J) All new Turkish compatibility wording remains in ONE runtime file.
    //    These are only compatibility literals for current server/native copy.
    // ------------------------------------------------------------------
    $path = 'app/admin/i18n/platform/tr.php';
    $patched[$path] = pmdR2AddTurkishLiterals($patched[$path], [
        'Add reservation' => 'Rezervasyon ekle',
        'New order' => 'Yeni sipariş',
        'History' => 'Geçmiş',
        'Current' => 'Güncel',
        'Free table' => 'Masayı boşalt',
        'Select a red occupied table first.' => 'Önce kırmızı renkte dolu bir masa seçin.',
        'Orders' => 'Siparişler',
        'Order' => 'Sipariş',
        'Items' => 'Ürünler',
        'Note' => 'Not',
        'Total' => 'Toplam',
        'Paid' => 'Ödendi',
        'Due' => 'Kalan',
        'Open order' => 'Siparişi aç',
        'Date range' => 'Tarih aralığı',
        'Today' => 'Bugün',
        'Yesterday' => 'Dün',
        'Last 7 days' => 'Son 7 gün',
        'Tomorrow' => 'Yarın',
        'Next 7 days' => 'Sonraki 7 gün',
        'From' => 'Başlangıç',
        'To' => 'Bitiş',
        'Apply' => 'Uygula',
        'Reservation' => 'Rezervasyon',
        'Reservations' => 'Rezervasyonlar',
        'New reservation' => 'Yeni rezervasyon',
        'Edit reservation' => 'Rezervasyonu düzenle',
        'Name' => 'Ad',
        'Phone (optional)' => 'Telefon (isteğe bağlı)',
        'Email (optional)' => 'E-posta (isteğe bağlı)',
        'Guests' => 'Misafirler',
        'Guest' => 'Misafir',
        'Reservation date' => 'Rezervasyon tarihi',
        'Reservation time' => 'Rezervasyon saati',
        'Duration' => 'Süre',
        'Table assignment' => 'Masa ataması',
        'Auto assign' => 'Otomatik ata',
        'Choose table(s)' => 'Masa(lar) seç',
        'Assign later' => 'Daha sonra ata',
        'Tables' => 'Masalar',
        'Table' => 'Masa',
        'No table' => 'Masa yok',
        'Check availability' => 'Uygunluğu kontrol et',
        'Notes' => 'Notlar',
        'Event' => 'Etkinlik',
        'Events' => 'Etkinlikler',
        'Calendar' => 'Takvim',
        'Year' => 'Yıl',
        'Month' => 'Ay',
        'All' => 'Tümü',
        'Previous' => 'Önceki',
        'Next' => 'Sonraki',
        'Day note' => 'Gün notu',
        'Write a note for this day' => 'Bu gün için not yaz',
        'Delete' => 'Sil',
        'Cancel' => 'İptal',
        'Close' => 'Kapat',
        'Save note' => 'Notu kaydet',
        'Save reservation' => 'Rezervasyonu kaydet',
        'Loading reservation…' => 'Rezervasyon yükleniyor…',
        'Checking availability…' => 'Uygunluk kontrol ediliyor…',
        'Available' => 'Uygun',
        'Not available' => 'Uygun değil',
        'Choose date, time, duration and guests.' => 'Tarih, saat, süre ve misafir sayısını seçin.',
        'Recommended tables' => 'Önerilen masalar',
        'No reservations' => 'Rezervasyon yok',
        'Time slots' => 'Zaman aralıkları',
        'Time not set' => 'Saat belirlenmedi',
        'Open' => 'Aç',
        'Scheduled' => 'Planlandı',
        'Request failed.' => 'İstek başarısız oldu.',
        'The reservation could not be saved.' => 'Rezervasyon kaydedilemedi.',
        'The reservation could not be processed.' => 'Rezervasyon işlenemedi.',
        'Past time' => 'Geçmiş saat',
        'Reservations cannot be created in the past.' => 'Geçmiş tarih veya saat için rezervasyon oluşturulamaz.',
        'Restaurant closed' => 'Restoran kapalı',
        'Outside opening hours' => 'Çalışma saatleri dışında',
        'Table preferences' => 'Masa tercihleri',
        'Near window' => 'Pencere yakını',
        'Quiet area' => 'Sessiz alan',
        'Accessible' => 'Erişilebilir',
        'Use suggestion' => 'Öneriyi kullan',
        'Notifications' => 'Bildirimler',
        'Loading…' => 'Yükleniyor…',
        'Failed to load.' => 'Yüklenemedi.',
        'No notifications.' => 'Bildirim yok.',
        'Live orders' => 'Aktif siparişler',
        'Active orders in the current service' => 'Mevcut servisteki aktif siparişler',
        'Needs attention' => 'İlgilenilmesi gerekenler',
        'Operational exceptions to review today' => 'Bugün gözden geçirilmesi gereken operasyonel istisnalar',
        'Occupied tables' => 'Dolu masalar',
        'Occupied tables from the visible Floor state' => 'Görünen kat planındaki dolu masalar',
        'Upcoming reservations' => 'Yaklaşan rezervasyonlar',
        'Remaining expected arrivals today' => 'Bugün beklenen kalan varışlar',
        'Available tables' => 'Uygun masalar',
        'Free tables from the currently visible Floor' => 'Şu anda görünen kat planındaki boş masalar',
        'Staff online' => 'Çevrimiçi personel',
        'Staff currently signed in at this location' => 'Bu konumda şu anda oturum açmış personel',
        'Manager KPIs' => 'Yönetici KPI’ları',
        'Staff' => 'Personel',
        'Signed in' => 'Oturum açık',
        'Signed-in admin sessions at this location' => 'Bu konumdaki açık yönetici oturumları',
        'No staff are currently signed in.' => 'Şu anda oturum açmış personel yok.',
        'online' => 'çevrimiçi',
        'Visible Floor authority' => 'Görünen kat planı kaynağı',
        'Add new coupon / card' => 'Yeni kupon / kart ekle',
        'Create a coupon, gift card or voucher.' => 'Kupon, hediye kartı veya voucher oluşturun.',
        'Kitchen capacity' => 'Mutfak kapasitesi',
        'Dashboard header' => 'Kontrol paneli başlığı',
        'Dashboard actions' => 'Kontrol paneli işlemleri',
        'Open calendar' => 'Takvimi aç',
        'No records' => 'Kayıt yok',
        'Sales over time line chart' => 'Zamana göre satışlar çizgi grafiği',
        'Sales bar chart' => 'Satış çubuk grafiği',
        'Change language' => 'Dili değiştir',
    ]);

    // ------------------------------------------------------------------
    // Source-level coverage guards for the CURRENT authorities patched above.
    // These are not a claim that arbitrary old/backup files contain no EN/DE
    // code; they guarantee the active confirmed blockers no longer do.
    // ------------------------------------------------------------------
    $guards = [
        'app/admin/views/_partials/pmd_clean_workspace_shared_v1.blade.php' => [
            "_pmd/language-switch-v3",
            "next!=='en'&&next!=='de'))",
        ],
        'app/admin/views/_partials/pmd_reservations_lab_schedule_v1.blade.php' => [
            "strtolower((string)(\$schedule['locale'] ?? 'en')) === 'de' ? 'de' : 'en'",
        ],
        'app/admin/views/_partials/notification_bell.blade.php' => [
            '<strong>Notifications</strong>',
            '>Loading…</div>',
            '>Failed to load.</div>',
            '>No notifications.</div>',
        ],
        'app/admin/assets/js/pmd-coupon-simplify-r23.js' => [
            "locale.indexOf('tr') === 0" => false,
        ],
    ];

    foreach ($guards as $guardPath => $needles) {
        foreach ($needles as $key => $value) {
            if (is_int($key)) {
                $needle = $value;
                if (strpos($patched[$guardPath], $needle) !== false) {
                    throw new RuntimeException(
                        'Coverage guard still found retired active pattern in '.$guardPath.': '.$needle
                    );
                }
                continue;
            }

            $needle = (string)$key;
            if ($value === false && strpos($patched[$guardPath], $needle) === false) {
                throw new RuntimeException(
                    'Coverage guard expected new marker logic in '.$guardPath.': '.$needle
                );
            }
        }
    }

    // Determine the files that actually change.
    $changed = [];
    foreach ($targets as $path) {
        $current = pmdR2Read($root, $path);
        if ($patched[$path] !== $current) {
            $changed[] = $path;
        }
    }

    if (!$changed) {
        echo "PMD TURKISH COMPLETE ADMIN COVERAGE R2: ALREADY APPLIED\n";
        exit(0);
    }

    $stamp = date('Ymd_His');
    $home = getenv('HOME') ?: '/home/ubuntu';
    $backupRoot = rtrim($home, '/').'/pmd-backups/turkish-complete-admin-r2-'.$stamp;

    foreach ($changed as $path) {
        $source = $root.'/'.$path;
        $backup = $backupRoot.'/'.$path;
        if (!is_dir(dirname($backup)) && !mkdir(dirname($backup), 0775, true) && !is_dir(dirname($backup))) {
            throw new RuntimeException('Could not create backup directory for '.$path);
        }
        if (!copy($source, $backup)) {
            throw new RuntimeException('Could not back up '.$path);
        }
    }

    foreach ($changed as $path) {
        $destination = $root.'/'.$path;
        $temporary = $destination.'.pmd-tr-r2-'.getmypid().'.tmp';
        if (file_put_contents($temporary, $patched[$path]) === false) {
            throw new RuntimeException('Could not stage '.$path);
        }
        $mode = @fileperms($destination);
        if ($mode !== false) @chmod($temporary, $mode & 0777);
        if (!rename($temporary, $destination)) {
            @unlink($temporary);
            throw new RuntimeException('Could not install '.$path);
        }
    }

    echo "PMD TURKISH COMPLETE ADMIN COVERAGE R2: APPLIED\n";
    echo "Backup: {$backupRoot}\n";
    echo "Touched source files:\n";
    foreach ($changed as $path) {
        echo " - {$path}\n";
    }
    echo "No tenant/payment/currency data was changed.\n";
    echo "No git pull/checkout/reset was performed.\n";
    echo "Live browser audit API: window.PMDAdminI18n.auditVisible()\n";
} catch (\Throwable $error) {
    fwrite(STDERR, 'ERROR: '.$error->getMessage()."\n");
    exit(1);
}
