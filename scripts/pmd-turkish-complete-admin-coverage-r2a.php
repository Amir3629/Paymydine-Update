<?php

declare(strict_types=1);

/*
 * PMD Turkish Admin complete coverage R2A.
 *
 * Prerequisite:
 *   scripts/pmd-turkish-server-authority-hotfix.php (V1) already applied.
 *
 * This patch is source-only and pattern-guarded. It changes no tenant,
 * payment, currency, order, reservation or restaurant data.
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

function pmdTrR2aRead(string $root, string $path): string
{
    $content = file_get_contents($root.'/'.$path);
    if ($content === false) {
        throw new RuntimeException('Could not read '.$path);
    }
    return $content;
}

function pmdTrR2aReplace(
    string $content,
    string $search,
    string $replace,
    int $expected,
    string $label
): string {
    $count = substr_count($content, $search);
    if ($count !== $expected) {
        throw new RuntimeException(
            "Expected {$expected} occurrence(s) for {$label}; found {$count}. No source files were changed."
        );
    }
    return str_replace($search, $replace, $content);
}

/** @param array<string,string> $translations */
function pmdTrR2aAddLiterals(string $source, array $translations): string
{
    $marker = "\$literals = [\n";
    if (substr_count($source, $marker) !== 1) {
        throw new RuntimeException('Canonical $literals array not found exactly once in tr.php.');
    }

    $newLines = [];
    foreach ($translations as $english => $turkish) {
        $sourceLiteral = var_export($english, true);
        if (strpos($source, $sourceLiteral.' =>') !== false) {
            continue;
        }
        $newLines[] = '    '.$sourceLiteral.' => '.var_export($turkish, true).',';
    }

    if (!$newLines) return $source;

    return str_replace(
        $marker,
        $marker.
        "    // PMD_TR_COMPLETE_ADMIN_COVERAGE_R2A\n".
        implode("\n", $newLines)."\n",
        $source
    );
}

try {
    $patched = [];
    foreach ($targets as $path) {
        $patched[$path] = pmdTrR2aRead($root, $path);
    }

    if (
        strpos(
            $patched['app/admin/classes/PmdPlatformI18n.php'],
            'PMD_PLATFORM_I18N_LITERAL_FALLBACK_V1'
        ) === false
    ) {
        throw new RuntimeException(
            'Turkish server-authority V1 marker is missing. Apply V1 first.'
        );
    }

    // --------------------------------------------------------------
    // 1) Standalone Reservations/Cashier/Accountant shell.
    // --------------------------------------------------------------
    $path = 'app/admin/views/_partials/pmd_clean_workspace_shared_v1.blade.php';
    if (strpos($patched[$path], 'PMD_CLEAN_WORKSPACE_TR_MARKET_SWITCH_R2A') === false) {
        $old = <<<'BLADE'
    $pmdCleanWorkspaceDirectFloorSurface = $pmdCleanWorkspaceReservationsSurface || $pmdCleanWorkspaceCashierSurface;
    $pmdCleanWorkspaceAddReservationLabel = strtolower((string)($pmdCleanWorkspaceLocale ?? 'en')) === 'de'
        ? 'Reservierung hinzufügen'
        : 'Add reservation';
BLADE;
        $new = <<<'BLADE'
    $pmdCleanWorkspaceDirectFloorSurface = $pmdCleanWorkspaceReservationsSurface || $pmdCleanWorkspaceCashierSurface;

    // PMD_CLEAN_WORKSPACE_TR_MARKET_SWITCH_R2A
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
        $patched[$path] = pmdTrR2aReplace(
            $patched[$path],
            $old,
            $new,
            1,
            'clean workspace add-reservation locale block'
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

        foreach ((array)($pmdCleanWorkspaceHeaderProfile['languages']['eligible'] ?? []) as $code) {
            $code = strtolower(trim((string)$code));
            if (
                $code !== ''
                && in_array($code, \Admin\Classes\PmdPlatformI18n::availableLocales(), true)
            ) {
                $pmdCleanWorkspaceHeaderEligibleLocales[] = $code;
            }
        }
        $pmdCleanWorkspaceHeaderEligibleLocales = array_values(array_unique(
            $pmdCleanWorkspaceHeaderEligibleLocales
        ));
    } catch (\Throwable $pmdCleanWorkspaceHeaderLanguageError) {
        $pmdCleanWorkspaceHeaderEligibleLocales = [];
    }

    if (!$pmdCleanWorkspaceHeaderEligibleLocales) {
        $pmdCleanWorkspaceHeaderEligibleLocales = [$pmdCleanWorkspaceHeaderLocale];
    }
    if (!in_array($pmdCleanWorkspaceHeaderLocale, $pmdCleanWorkspaceHeaderEligibleLocales, true)) {
        array_unshift($pmdCleanWorkspaceHeaderEligibleLocales, $pmdCleanWorkspaceHeaderLocale);
        $pmdCleanWorkspaceHeaderEligibleLocales = array_values(array_unique(
            $pmdCleanWorkspaceHeaderEligibleLocales
        ));
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
        $patched[$path] = pmdTrR2aReplace(
            $patched[$path],
            $old,
            $new,
            1,
            'clean workspace header locale/endpoint block'
        );

        $old = <<<'BLADE'
                    aria-label="Switch language to {{ strtoupper($pmdCleanWorkspaceHeaderNextLocale) }}"
                    title="Switch language to {{ strtoupper($pmdCleanWorkspaceHeaderNextLocale) }}">
BLADE;
        $new = <<<'BLADE'
                    aria-label="{{ $pmdCleanWorkspaceT('Change language') }}: {{ strtoupper($pmdCleanWorkspaceHeaderNextLocale) }}"
                    title="{{ $pmdCleanWorkspaceT('Change language') }}: {{ strtoupper($pmdCleanWorkspaceHeaderNextLocale) }}">
BLADE;
        $patched[$path] = pmdTrR2aReplace(
            $patched[$path],
            $old,
            $new,
            1,
            'clean workspace language button label'
        );

        $patched[$path] = pmdTrR2aReplace(
            $patched[$path],
            "if(!endpoint||(next!=='en'&&next!=='de'))return;",
            "if(!endpoint||(next!=='en'&&next!=='de'&&next!=='tr'))return;",
            1,
            'clean workspace browser locale allow-list'
        );
    }

    // --------------------------------------------------------------
    // 2) Shared operational date-range picker.
    // --------------------------------------------------------------
    $path = 'app/admin/views/_partials/pmd_operational_date_range_v1.blade.php';
    if (strpos($patched[$path], 'PMD_OPERATIONAL_DATE_RANGE_TR_R2A') === false) {
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
        $patched[$path] = pmdTrR2aReplace(
            $patched[$path],
            $old,
            $new,
            1,
            'operational date-range text bootstrap'
        );

        $old = <<<'BLADE'
    $pmdRangeLocale = strtolower((string)app()->getLocale());
    $pmdRangeIsGerman = strpos($pmdRangeLocale, 'de') === 0;
BLADE;
        $new = <<<'BLADE'
    // PMD_OPERATIONAL_DATE_RANGE_TR_R2A
    $pmdRangeIsGerman = $pmdRangeLocale === 'de';
BLADE;
        $patched[$path] = pmdTrR2aReplace(
            $patched[$path],
            $old,
            $new,
            1,
            'operational date-range locale collapse'
        );

        $old = <<<'BLADE'
    $pmdRangeTomorrowLabel = $pmdRangeIsGerman ? 'Morgen' : 'Tomorrow';
    $pmdRangeNext7Label = $pmdRangeIsGerman ? 'Nächste 7 Tage' : 'Next 7 days';
BLADE;
        $new = <<<'BLADE'
    $pmdRangeTomorrowLabel = $pmdRangeIsGerman ? 'Morgen' : $pmdRangeT('Tomorrow');
    $pmdRangeNext7Label = $pmdRangeIsGerman ? 'Nächste 7 Tage' : $pmdRangeT('Next 7 days');
BLADE;
        $patched[$path] = pmdTrR2aReplace(
            $patched[$path],
            $old,
            $new,
            1,
            'operational date-range future presets'
        );

        $fallbacks = [
            "{{ \$rangeText['date_range'] ?? 'Date range' }}" => "{{ \$rangeText['date_range'] ?? \$pmdRangeT('Date range') }}",
            "{{ \$rangeText['today'] ?? (\$pmdRangeIsGerman ? 'Heute' : 'Today') }}" => "{{ \$rangeText['today'] ?? (\$pmdRangeIsGerman ? 'Heute' : \$pmdRangeT('Today')) }}",
            "{{ \$rangeText['yesterday'] ?? 'Yesterday' }}" => "{{ \$rangeText['yesterday'] ?? \$pmdRangeT('Yesterday') }}",
            "{{ \$rangeText['last_7_days'] ?? 'Last 7 days' }}" => "{{ \$rangeText['last_7_days'] ?? \$pmdRangeT('Last 7 days') }}",
            "{{ \$rangeText['from'] ?? 'From' }}" => "{{ \$rangeText['from'] ?? \$pmdRangeT('From') }}",
            "{{ \$rangeText['to'] ?? 'To' }}" => "{{ \$rangeText['to'] ?? \$pmdRangeT('To') }}",
            "{{ \$rangeText['apply'] ?? 'Apply' }}" => "{{ \$rangeText['apply'] ?? \$pmdRangeT('Apply') }}",
        ];
        foreach ($fallbacks as $search => $replace) {
            if (strpos($patched[$path], $search) === false) {
                throw new RuntimeException('Operational date-range fallback not found: '.$search);
            }
            $patched[$path] = str_replace($search, $replace, $patched[$path]);
        }
    }

    // --------------------------------------------------------------
    // 3) Cashier current/history operational cards.
    // --------------------------------------------------------------
    $path = 'app/admin/views/_partials/pmd_cashier_lab_current_orders_v1.blade.php';
    if (strpos($patched[$path], 'PMD_CASHIER_TR_SERVER_COPY_R2A') === false) {
        $old = <<<'BLADE'
    $count = count($orders);
    $pmdCashierIsGerman = strtolower((string)($pmdCleanWorkspaceLocale ?? app()->getLocale())) === 'de';
    $pmdCashierAddReservation = $pmdCashierIsGerman ? 'Reservierung hinzufügen' : 'Add reservation';
    $pmdCashierAddOrder = $pmdCashierIsGerman ? 'Neue Bestellung' : 'New order';
BLADE;
        $new = <<<'BLADE'
    $count = count($orders);
    // PMD_CASHIER_TR_SERVER_COPY_R2A
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
        $patched[$path] = pmdTrR2aReplace(
            $patched[$path],
            $old,
            $new,
            1,
            'Cashier locale bootstrap'
        );

        $old = <<<'BLADE'
    $pmdCashierHistoryButton = $text['history'] ?? ($pmdCashierIsGerman ? 'Verlauf' : 'History');
    $pmdCashierCurrentButton = $text['current'] ?? ($pmdCashierIsGerman ? 'Aktuell' : 'Current');
BLADE;
        $new = <<<'BLADE'
    $pmdCashierHistoryButton = $text['history'] ?? ($pmdCashierIsGerman ? 'Verlauf' : $pmdCashierT('History'));
    $pmdCashierCurrentButton = $text['current'] ?? ($pmdCashierIsGerman ? 'Aktuell' : $pmdCashierT('Current'));
BLADE;
        $patched[$path] = pmdTrR2aReplace(
            $patched[$path],
            $old,
            $new,
            1,
            'Cashier History/Current labels'
        );

        $patched[$path] = pmdTrR2aReplace(
            $patched[$path],
            'title="Select a red occupied table first."',
            'title="{{ $pmdCashierT(\'Select a red occupied table first.\') }}"',
            1,
            'Cashier free-table title'
        );

        $fallbacks = [
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
        foreach ($fallbacks as $search => $replace) {
            if (strpos($patched[$path], $search) === false) {
                throw new RuntimeException('Cashier fallback not found: '.$search);
            }
            $patched[$path] = str_replace($search, $replace, $patched[$path]);
        }
    }

    // --------------------------------------------------------------
    // 4) Reservations Calendar / Hour / Composer JSON bootstrap.
    // --------------------------------------------------------------
    $path = 'app/admin/views/_partials/pmd_reservations_lab_schedule_v1.blade.php';
    if (strpos($patched[$path], 'PMD_RESERVATIONS_SCHEDULE_TR_R2A') === false) {
        $old = <<<'BLADE'
    $locale = strtolower((string)($schedule['locale'] ?? 'en')) === 'de' ? 'de' : 'en';
BLADE;
        $new = <<<'BLADE'
    // PMD_RESERVATIONS_SCHEDULE_TR_R2A
    $locale = \Admin\Classes\PmdPlatformI18n::normalizeLocale(
        (string)($schedule['locale'] ?? app()->getLocale())
    );
    if (!in_array($locale, ['en', 'de', 'tr'], true)) {
        $locale = 'en';
    }
BLADE;
        $patched[$path] = pmdTrR2aReplace(
            $patched[$path],
            $old,
            $new,
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
        $patched[$path] = pmdTrR2aReplace(
            $patched[$path],
            $old,
            $new,
            1,
            'Reservations schedule Turkish structure bridge'
        );

        $old = <<<'BLADE'
    $schedule['locale_tag'] = $locale === 'de' ? 'de-DE' : 'en-GB';
BLADE;
        $new = <<<'BLADE'
    $schedule['locale_tag'] = $locale === 'de'
        ? 'de-DE'
        : ($locale === 'tr' ? 'tr-TR' : 'en-GB');
BLADE;
        $patched[$path] = pmdTrR2aReplace(
            $patched[$path],
            $old,
            $new,
            1,
            'Reservations schedule locale tag'
        );
    }

    // --------------------------------------------------------------
    // 5) Notification dropdown is a no-translate island.
    // --------------------------------------------------------------
    $path = 'app/admin/views/_partials/notification_bell.blade.php';
    if (strpos($patched[$path], 'PMD_NOTIFICATION_TR_SERVER_COPY_R2A') === false) {
        $prefix = <<<'BLADE'
@php
    // PMD_NOTIFICATION_TR_SERVER_COPY_R2A
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

        $notificationReplacements = [
            '<strong>Notifications</strong>' => '<strong>{{ $pmdNotificationT(\'Notifications\') }}</strong>',
            '        History' => '        {{ $pmdNotificationT(\'History\') }}',
            '>Loading…</div>' => '>{{ $pmdNotificationT(\'Loading…\') }}</div>',
            '>Failed to load.</div>' => '>{{ $pmdNotificationT(\'Failed to load.\') }}</div>',
            '>No notifications.</div>' => '>{{ $pmdNotificationT(\'No notifications.\') }}</div>',
        ];
        foreach ($notificationReplacements as $search => $replace) {
            $patched[$path] = pmdTrR2aReplace(
                $patched[$path],
                $search,
                $replace,
                1,
                'notification server string'
            );
        }
    }

    // --------------------------------------------------------------
    // 6) Reservation Composer feature-preferences server block.
    // --------------------------------------------------------------
    $path = 'app/admin/views/reservations2/_reservation_composer.blade.php';
    if (strpos($patched[$path], 'PMD_RESERVATION_COMPOSER_TR_FEATURES_R2A') === false) {
        $old = <<<'BLADE'
  $pmdComposerFeatureLocale = strtolower((string)app()->getLocale());
  $pmdComposerFeatureGerman = strpos($pmdComposerFeatureLocale, 'de') === 0;
BLADE;
        $new = <<<'BLADE'
  // PMD_RESERVATION_COMPOSER_TR_FEATURES_R2A
  $pmdComposerFeatureLocale = \Admin\Classes\PmdPlatformI18n::normalizeLocale(app()->getLocale());
  $pmdComposerFeatureGerman = $pmdComposerFeatureLocale === 'de';
BLADE;
        $patched[$path] = pmdTrR2aReplace(
            $patched[$path],
            $old,
            $new,
            1,
            'Reservation Composer locale block'
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
        $patched[$path] = pmdTrR2aReplace(
            $patched[$path],
            $old,
            $new,
            1,
            'Reservation Composer Turkish feature bridge'
        );
    }

    // --------------------------------------------------------------
    // 7) Manager: translate finished presentation payloads AFTER all current
    //    calculations/stat lookups are complete. No business logic changes.
    // --------------------------------------------------------------
    $path = 'app/admin/controllers/Managerlab.php';
    if (strpos($patched[$path], 'PMD_MANAGER_TR_FINISHED_PAYLOAD_R2A') === false) {
        $old = <<<'PHP'
        $this->installManagerKpis($bundle, $locale, $shared);
    }
PHP;
        $new = <<<'PHP'
        $this->installManagerKpis($bundle, $locale, $shared);

        // PMD_MANAGER_TR_FINISHED_PAYLOAD_R2A
        // Translate presentation payloads only after their English lookup keys
        // have finished all calculations.
        if (strtolower($locale) === 'tr') {
            $pmdManagerT = static function (string $source): string {
                return \Admin\Classes\PmdPlatformI18n::fromEnglish(
                    $source,
                    '',
                    [],
                    'tr',
                    $source
                );
            };

            foreach ([
                'pmdCleanWorkspaceKpiCards',
                'pmdRoleDashboardBundle',
                'pmdManagerOnlineStaff',
            ] as $pmdManagerVar) {
                if (isset($this->vars[$pmdManagerVar]) && is_array($this->vars[$pmdManagerVar])) {
                    $this->vars[$pmdManagerVar] =
                        \Admin\Classes\PmdPlatformI18n::translateStructure(
                            $this->vars[$pmdManagerVar],
                            '',
                            'tr'
                        );
                }
            }

            $this->vars['pmdCleanWorkspaceKpiAriaLabel'] = $pmdManagerT('Manager KPIs');

            if (is_array($this->vars['pmdManagerOnlineStaff']['rows'] ?? null)) {
                foreach ($this->vars['pmdManagerOnlineStaff']['rows'] as &$pmdManagerStaffRow) {
                    if (!is_array($pmdManagerStaffRow)) continue;
                    $since = (string)($pmdManagerStaffRow['since'] ?? '');
                    if (preg_match('/^Since\s+(.+)$/', $since, $match)) {
                        $pmdManagerStaffRow['since'] = $pmdManagerT('Since').' '.$match[1];
                    }
                }
                unset($pmdManagerStaffRow);
            }

            $asOf = (string)($this->vars['pmdManagerOnlineStaff']['as_of'] ?? '');
            if (preg_match('/^As of\s+(.+)$/', $asOf, $match)) {
                $this->vars['pmdManagerOnlineStaff']['as_of'] =
                    $pmdManagerT('As of').' '.$match[1];
            }
        }
    }
PHP;
        $patched[$path] = pmdTrR2aReplace(
            $patched[$path],
            $old,
            $new,
            1,
            'Manager finished presentation payload hook'
        );
    }

    // --------------------------------------------------------------
    // 8) Coupon smart-add DOM is created dynamically by EN/DE-only JS.
    // --------------------------------------------------------------
    $path = 'app/admin/assets/js/pmd-coupon-simplify-r23.js';
    if (strpos($patched[$path], 'PMD_COUPON_TR_RUNTIME_COPY_R2A') === false) {
        $old = <<<'JS'
        return {
            title: 'Add new coupon / card',
            help: 'Create a coupon, gift card or voucher.'
        };
JS;
        $new = <<<'JS'
        // PMD_COUPON_TR_RUNTIME_COPY_R2A
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
        $patched[$path] = pmdTrR2aReplace(
            $patched[$path],
            $old,
            $new,
            1,
            'Coupon localeCopy English fallback'
        );
    }

    // --------------------------------------------------------------
    // 9) Live browser coverage audit. It reports catalogue-known leftovers
    //    even inside data-pmd-no-translate / data-pmd-i18n-skip islands.
    // --------------------------------------------------------------
    $path = 'app/admin/assets/js/pmd-admin-i18n-v1.js';
    if (strpos($patched[$path], 'PMD_ADMIN_I18N_VISIBLE_AUDIT_R2A') === false) {
        $old = <<<'JS'
    addCanonicalEntries();
    addLegacyGermanEntries();

    window.PMDAdminI18n = {
JS;
        $new = <<<'JS'
    // PMD_ADMIN_I18N_VISIBLE_AUDIT_R2A
    function auditVisible() {
        var leftovers = [];
        var seen = Object.create(null);
        var attributes = [
            'placeholder',
            'title',
            'aria-label',
            'data-original-title',
            'data-title'
        ];

        if (!document.body || locale === 'en') {
            return { locale: locale, count: 0, skippedCount: 0, leftovers: [] };
        }

        function isVisible(element) {
            if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
            var style = window.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            var rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        }

        function record(kind, source, translated, element) {
            source = normalize(source);
            translated = normalize(translated);
            if (!source || !translated || source === translated) return;
            var key = kind + '|' + source + '|' + translated;
            if (seen[key]) return;
            seen[key] = true;
            leftovers.push({
                kind: kind,
                source: source,
                expected: translated,
                skipped: shouldSkip(element),
                tag: element && element.tagName ? element.tagName : '',
                id: element && element.id ? element.id : '',
                className: element && element.className
                    ? String(element.className).slice(0, 160)
                    : ''
            });
        }

        Array.prototype.forEach.call(
            document.querySelectorAll('body *'),
            function (element) {
                if (!isVisible(element)) return;

                if (element.children.length === 0) {
                    var text = normalize(element.textContent || '');
                    var translated = lookup(text);
                    if (translated !== text) {
                        record('text', text, translated, element);
                    }
                }

                attributes.forEach(function (attribute) {
                    if (!element.hasAttribute(attribute)) return;
                    var value = normalize(element.getAttribute(attribute) || '');
                    var translated = lookup(value);
                    if (translated !== value) {
                        record(attribute, value, translated, element);
                    }
                });
            }
        );

        return {
            version: VERSION,
            locale: locale,
            route: window.location.pathname,
            count: leftovers.length,
            skippedCount: leftovers.filter(function (item) {
                return item.skipped;
            }).length,
            leftovers: leftovers.slice(0, 300)
        };
    }

    addCanonicalEntries();
    addLegacyGermanEntries();

    window.PMDAdminI18n = {
JS;
        $patched[$path] = pmdTrR2aReplace(
            $patched[$path],
            $old,
            $new,
            1,
            'Admin i18n API insertion point'
        );

        $old = <<<'JS'
        translate: lookup,
        run: run,
        reveal: reveal
JS;
        $new = <<<'JS'
        translate: lookup,
        run: run,
        reveal: reveal,
        auditVisible: auditVisible
JS;
        $patched[$path] = pmdTrR2aReplace(
            $patched[$path],
            $old,
            $new,
            1,
            'Admin i18n public API methods'
        );
    }

    // --------------------------------------------------------------
    // 10) Single Turkish runtime wording authority.
    // --------------------------------------------------------------
    $path = 'app/admin/i18n/platform/tr.php';
    $patched[$path] = pmdTrR2aAddLiterals($patched[$path], [
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
        'Since' => 'Giriş',
        'As of' => 'Güncelleme',
        'Signed-in admin sessions at this location' => 'Bu konumdaki açık yönetici oturumları',
        'Active admin sessions at this location' => 'Bu konumdaki aktif yönetici oturumları',
        'No staff are currently signed in.' => 'Şu anda oturum açmış personel yok.',
        'No staff are currently online.' => 'Şu anda çevrimiçi personel yok.',
        'online' => 'çevrimiçi',
        'Staff attendance details' => 'Personel devam ayrıntıları',
        'Open staff attendance and presence report' => 'Personel devam ve varlık raporunu aç',
        'Staff attendance and presence' => 'Personel devam ve varlık',
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

    // --------------------------------------------------------------
    // Active-source coverage guards.
    // --------------------------------------------------------------
    $forbidden = [
        'app/admin/views/_partials/pmd_clean_workspace_shared_v1.blade.php' => [
            "_pmd/language-switch-v3",
            "if(!endpoint||(next!=='en'&&next!=='de'))return;",
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
    ];

    foreach ($forbidden as $guardPath => $patterns) {
        foreach ($patterns as $pattern) {
            if (strpos($patched[$guardPath], $pattern) !== false) {
                throw new RuntimeException(
                    'Coverage guard still found retired pattern in '.$guardPath.': '.$pattern
                );
            }
        }
    }

    foreach ([
        'PMD_CLEAN_WORKSPACE_TR_MARKET_SWITCH_R2A' => 'app/admin/views/_partials/pmd_clean_workspace_shared_v1.blade.php',
        'PMD_OPERATIONAL_DATE_RANGE_TR_R2A' => 'app/admin/views/_partials/pmd_operational_date_range_v1.blade.php',
        'PMD_CASHIER_TR_SERVER_COPY_R2A' => 'app/admin/views/_partials/pmd_cashier_lab_current_orders_v1.blade.php',
        'PMD_RESERVATIONS_SCHEDULE_TR_R2A' => 'app/admin/views/_partials/pmd_reservations_lab_schedule_v1.blade.php',
        'PMD_NOTIFICATION_TR_SERVER_COPY_R2A' => 'app/admin/views/_partials/notification_bell.blade.php',
        'PMD_RESERVATION_COMPOSER_TR_FEATURES_R2A' => 'app/admin/views/reservations2/_reservation_composer.blade.php',
        'PMD_MANAGER_TR_FINISHED_PAYLOAD_R2A' => 'app/admin/controllers/Managerlab.php',
        'PMD_COUPON_TR_RUNTIME_COPY_R2A' => 'app/admin/assets/js/pmd-coupon-simplify-r23.js',
        'PMD_ADMIN_I18N_VISIBLE_AUDIT_R2A' => 'app/admin/assets/js/pmd-admin-i18n-v1.js',
    ] as $marker => $markerPath) {
        if (strpos($patched[$markerPath], $marker) === false) {
            throw new RuntimeException('Coverage marker missing after patch: '.$marker);
        }
    }

    $changed = [];
    foreach ($targets as $path) {
        if ($patched[$path] !== pmdTrR2aRead($root, $path)) {
            $changed[] = $path;
        }
    }

    if (!$changed) {
        echo "PMD TURKISH COMPLETE ADMIN COVERAGE R2A: ALREADY APPLIED\n";
        exit(0);
    }

    $stamp = date('Ymd_His');
    $home = getenv('HOME') ?: '/home/ubuntu';
    $backupRoot = rtrim($home, '/').'/pmd-backups/turkish-complete-admin-r2a-'.$stamp;

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
        $temporary = $destination.'.pmd-tr-r2a-'.getmypid().'.tmp';
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

    echo "PMD TURKISH COMPLETE ADMIN COVERAGE R2A: APPLIED\n";
    echo "Backup: {$backupRoot}\n";
    echo "Touched source files:\n";
    foreach ($changed as $path) {
        echo " - {$path}\n";
    }
    echo "No tenant/payment/currency/business data was changed.\n";
    echo "No git pull/checkout/reset was performed.\n";
    echo "Browser verification API: window.PMDAdminI18n.auditVisible()\n";
} catch (\Throwable $error) {
    fwrite(STDERR, 'ERROR: '.$error->getMessage()."\n");
    exit(1);
}
