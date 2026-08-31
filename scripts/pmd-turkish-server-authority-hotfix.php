<?php

declare(strict_types=1);

/*
 * PMD Turkish server-authority hotfix V1.
 *
 * WHY THIS EXISTS
 * ----------------
 * Several current PMD server-first surfaces predate Turkish and explicitly
 * collapse every non-DE locale to EN. Some of those surfaces are also marked
 * data-pmd-no-translate, so the shared browser i18n runtime cannot repair them.
 *
 * This hotfix changes the locale authorities only. Turkish WORDING remains
 * owned by exactly one file:
 *     app/admin/i18n/platform/tr.php
 *
 * The script is intentionally pattern-guarded. If a concurrently edited VPS
 * no longer matches an expected source block, it aborts BEFORE writing any
 * source file.
 *
 * Usage:
 *   sudo php scripts/pmd-turkish-server-authority-hotfix.php \
 *     --root=/var/www/paymydine
 */

$options = getopt('', ['root::']);
$root = rtrim((string)($options['root'] ?? dirname(__DIR__)), '/');

$targets = [
    'app/admin/classes/PmdPlatformI18n.php',
    'app/admin/classes/PmdCleanWorkspaceControllerV1.php',
    'app/admin/controllers/Dashboardlab.php',
    'app/admin/assets/js/pmd-admin-i18n-page-authority-v2.js',
    'app/admin/views/_partials/pmd_reservations_lab_cards_v1.blade.php',
    'app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php',
    'app/admin/i18n/platform/tr.php',
];

foreach ($targets as $path) {
    if (!is_file($root.'/'.$path)) {
        fwrite(STDERR, "ERROR: required file missing: {$path}\n");
        exit(2);
    }
}

/** @return string */
function pmdHotfixRead(string $root, string $path): string
{
    $value = file_get_contents($root.'/'.$path);
    if ($value === false) {
        throw new RuntimeException('Could not read '.$path);
    }
    return $value;
}

function pmdHotfixReplaceOnce(
    string $value,
    string $search,
    string $replace,
    string $label
): string {
    $count = substr_count($value, $search);
    if ($count !== 1) {
        throw new RuntimeException(
            "Expected exactly one {$label}, found {$count}. No files were changed."
        );
    }

    return str_replace($search, $replace, $value);
}

/** @param array<string,string> $translations */
function pmdHotfixAddTurkishLiterals(
    string $source,
    array $translations
): string {
    $marker = "\$literals = [\n";
    if (substr_count($source, $marker) !== 1) {
        throw new RuntimeException(
            'Could not locate the single canonical $literals array in tr.php.'
        );
    }

    $lines = [];
    foreach ($translations as $english => $turkish) {
        $englishExport = var_export($english, true);
        $needle = $englishExport.' =>';
        if (strpos($source, $needle) !== false) {
            continue;
        }

        $lines[] = '    '.$englishExport.' => '.var_export($turkish, true).',';
    }

    if (!$lines) {
        return $source;
    }

    $block =
        "    // PMD_TR_SERVER_AUTHORITY_HOTFIX_V1\n"
        .implode("\n", $lines)
        ."\n";

    return str_replace($marker, $marker.$block, $source);
}

try {
    // Work entirely in memory first. A mismatch means ZERO source writes.
    $patched = [];
    foreach ($targets as $path) {
        $patched[$path] = pmdHotfixRead($root, $path);
    }

    // ------------------------------------------------------------------
    // A) PmdPlatformI18n: server-first copy may resolve literal::<EN> from
    //    the active locale catalogue. This is the bridge that lets old
    //    EN/DE server arrays reuse tr.php without creating a second TR file.
    // ------------------------------------------------------------------
    $path = 'app/admin/classes/PmdPlatformI18n.php';
    if (strpos($patched[$path], 'PMD_PLATFORM_I18N_LITERAL_FALLBACK_V1') === false) {
        $old = <<<'PHP'
        $key = $sourceIndexes[$prefix][$value] ?? null;
        if (!$key) return $fallback ?? $value;
        return self::translate($key, $replace, $locale, $fallback ?? $value);
PHP;
        $new = <<<'PHP'
        $key = $sourceIndexes[$prefix][$value] ?? null;

        // PMD_PLATFORM_I18N_LITERAL_FALLBACK_V1
        // Old server-first PMD surfaces may still emit stable English copy
        // that does not yet have a canonical EN key. Locale-owned literal::*
        // entries are the compatibility bridge; wording still lives only in
        // the locale catalogue, never in the server view/controller.
        if (!$key) {
            $resolvedLocale = self::normalizeLocale(
                $locale ?? self::currentLocale()
            );
            $literalKey = 'literal::'.$value;

            if (array_key_exists($literalKey, self::messages($resolvedLocale))) {
                return self::translate(
                    $literalKey,
                    $replace,
                    $resolvedLocale,
                    $fallback ?? $value
                );
            }

            return $fallback ?? $value;
        }

        return self::translate($key, $replace, $locale, $fallback ?? $value);
PHP;
        $patched[$path] = pmdHotfixReplaceOnce(
            $patched[$path],
            $old,
            $new,
            'PmdPlatformI18n fromEnglish fallback'
        );
    }

    // ------------------------------------------------------------------
    // B) Clean role workspaces: Reservations/Manager/Cashier/Accountant
    //    must preserve TR rather than resetting app locale to EN.
    // ------------------------------------------------------------------
    $path = 'app/admin/classes/PmdCleanWorkspaceControllerV1.php';
    if (strpos($patched[$path], 'PMD_CLEAN_WORKSPACE_TR_LOCALE_V1') === false) {
        $old = <<<'PHP'
        if (preg_match('/^(en|de)(?:[-_][a-z0-9]+)?$/i', $adminLocale, $match)) {
            $locale = strtolower($match[1]);
        } else {
            $locale = strtolower(trim((string)$locale));
            $locale = strpos($locale, 'de') === 0 ? 'de' : 'en';
        }
PHP;
        $new = <<<'PHP'
        // PMD_CLEAN_WORKSPACE_TR_LOCALE_V1
        if (preg_match('/^(en|de|tr)(?:[-_][a-z0-9]+)?$/i', $adminLocale, $match)) {
            $locale = strtolower($match[1]);
        } else {
            $locale = \Admin\Classes\PmdPlatformI18n::normalizeLocale($locale);
            if (!in_array($locale, ['en', 'de', 'tr'], true)) {
                $locale = 'en';
            }
        }
PHP;
        $patched[$path] = pmdHotfixReplaceOnce(
            $patched[$path],
            $old,
            $new,
            'clean workspace EN/DE locale collapse'
        );

        $old = <<<'PHP'
        } else {
            $kpiOrder = PmdCleanWorkspaceSharedV1::OWNER_KPI_ORDER;
            $kpiCards = $shared->ownerKpiCards($locale);
        }

        $cookieName = 'pmd_'.$key.'_lab_kpis';
PHP;
        $new = <<<'PHP'
        } else {
            $kpiOrder = PmdCleanWorkspaceSharedV1::OWNER_KPI_ORDER;
            $kpiCards = $shared->ownerKpiCards($locale);
        }

        // Turkish server-first cards reuse the canonical platform catalogue.
        // Existing DE/EN rendering remains byte-for-byte on its old path.
        if ($locale === 'tr') {
            $kpiCards = \Admin\Classes\PmdPlatformI18n::translateStructure(
                $kpiCards,
                '',
                'tr'
            );
        }

        $cookieName = 'pmd_'.$key.'_lab_kpis';
PHP;
        $patched[$path] = pmdHotfixReplaceOnce(
            $patched[$path],
            $old,
            $new,
            'clean workspace KPI translation bridge'
        );

        $old = <<<'PHP'
        $this->vars['pmdCleanWorkspaceText'] = [
            'choose_kpi' => $shared->text('Choose KPI', 'KPI auswählen', $locale),
            'visible' => $shared->text('Visible in this card', 'In dieser Karte sichtbar', $locale),
            'already_visible' => $shared->text('Already visible', 'Bereits sichtbar', $locale),
            'show_here' => $shared->text('Show in this card', 'In dieser Karte anzeigen', $locale),
        ];
PHP;
        $new = <<<'PHP'
        $this->vars['pmdCleanWorkspaceText'] = [
            'choose_kpi' => $shared->text('Choose KPI', 'KPI auswählen', $locale),
            'visible' => $shared->text('Visible in this card', 'In dieser Karte sichtbar', $locale),
            'already_visible' => $shared->text('Already visible', 'Bereits sichtbar', $locale),
            'show_here' => $shared->text('Show in this card', 'In dieser Karte anzeigen', $locale),
        ];

        if ($locale === 'tr') {
            $this->vars['pmdCleanWorkspaceKpiAriaLabel'] =
                \Admin\Classes\PmdPlatformI18n::fromEnglish(
                    (string)$this->vars['pmdCleanWorkspaceKpiAriaLabel'],
                    '',
                    [],
                    'tr',
                    (string)$this->vars['pmdCleanWorkspaceKpiAriaLabel']
                );

            $this->vars['pmdCleanWorkspaceText'] =
                \Admin\Classes\PmdPlatformI18n::translateStructure(
                    $this->vars['pmdCleanWorkspaceText'],
                    '',
                    'tr'
                );
        }
PHP;
        $patched[$path] = pmdHotfixReplaceOnce(
            $patched[$path],
            $old,
            $new,
            'clean workspace static text bridge'
        );

        $old = <<<'PHP'
        $title = $titles[$key] ?? [ucfirst($key), ucfirst($key)];
        return $locale === 'de' ? $title[1] : $title[0];
PHP;
        $new = <<<'PHP'
        $title = $titles[$key] ?? [ucfirst($key), ucfirst($key)];
        $english = (string)$title[0];

        if ($locale === 'de') {
            return (string)$title[1];
        }

        if ($locale === 'tr') {
            return \Admin\Classes\PmdPlatformI18n::fromEnglish(
                $english,
                '',
                [],
                'tr',
                $english
            );
        }

        return $english;
PHP;
        $patched[$path] = pmdHotfixReplaceOnce(
            $patched[$path],
            $old,
            $new,
            'clean workspace title locale switch'
        );
    }

    // ------------------------------------------------------------------
    // C) DashboardLab calendar: TR was explicitly converted back to EN.
    // ------------------------------------------------------------------
    $path = 'app/admin/controllers/Dashboardlab.php';
    if (strpos($patched[$path], 'PMD_DASHBOARD_CALENDAR_TR_LOCALE_V1') === false) {
        $old = <<<'PHP'
            $pmdDashboardCalendarLocale =
                str_starts_with(
                    $pmdDashboardCalendarLocale,
                    'de'
                )
                    ? 'de'
                    : 'en';
PHP;
        $new = <<<'PHP'
            // PMD_DASHBOARD_CALENDAR_TR_LOCALE_V1
            $pmdDashboardCalendarLocale =
                \Admin\Classes\PmdPlatformI18n::normalizeLocale(
                    $pmdDashboardCalendarLocale
                );

            if (!in_array($pmdDashboardCalendarLocale, ['en', 'de', 'tr'], true)) {
                $pmdDashboardCalendarLocale = 'en';
            }
PHP;
        $patched[$path] = pmdHotfixReplaceOnce(
            $patched[$path],
            $old,
            $new,
            'DashboardLab calendar EN/DE locale collapse'
        );
    }

    // ------------------------------------------------------------------
    // D) Dashboard page authority: TR was treated as EN and its German->EN
    //    normalizer competed with the canonical Turkish runtime.
    // ------------------------------------------------------------------
    $path = 'app/admin/assets/js/pmd-admin-i18n-page-authority-v2.js';
    if (strpos($patched[$path], 'PMD_PAGE_AUTHORITY_TR_LOCALE_V1') === false) {
        $old = <<<'JS'
        return value.indexOf('de') === 0 ? 'de' : 'en';
JS;
        $new = <<<'JS'
        // PMD_PAGE_AUTHORITY_TR_LOCALE_V1
        if (value.indexOf('de') === 0) return 'de';
        if (value.indexOf('tr') === 0) return 'tr';
        return 'en';
JS;
        $patched[$path] = pmdHotfixReplaceOnce(
            $patched[$path],
            $old,
            $new,
            'Dashboard page-authority locale collapse'
        );

        $old = <<<'JS'
    function translateValue(value) {
        if (locale() === 'de') {
            return normalizeGermanText(value);
        }

        return normalizeEnglishText(value);
    }
JS;
        $new = <<<'JS'
    function translateValue(value) {
        var activeLocale = locale();

        if (activeLocale === 'tr') {
            if (
                window.PMDAdminI18n &&
                typeof window.PMDAdminI18n.translate === 'function'
            ) {
                return window.PMDAdminI18n.translate(value);
            }
            return value;
        }

        if (activeLocale === 'de') {
            return normalizeGermanText(value);
        }

        return normalizeEnglishText(value);
    }
JS;
        $patched[$path] = pmdHotfixReplaceOnce(
            $patched[$path],
            $old,
            $new,
            'Dashboard page-authority translateValue'
        );

        $old = <<<'JS'
            if (
                locale() === 'de' &&
                window.PMDAdminI18n &&
                typeof window.PMDAdminI18n.run === 'function'
            ) {
                window.PMDAdminI18n.run();
            }
JS;
        $new = <<<'JS'
            if (
                locale() !== 'en' &&
                window.PMDAdminI18n &&
                typeof window.PMDAdminI18n.run === 'function'
            ) {
                window.PMDAdminI18n.run();
            }
JS;
        $patched[$path] = pmdHotfixReplaceOnce(
            $patched[$path],
            $old,
            $new,
            'Dashboard page-authority runtime bridge'
        );
    }

    // ------------------------------------------------------------------
    // E) Reservations below-Floor cards are server-localized AND explicitly
    //    data-pmd-no-translate. They must therefore resolve TR on the server.
    // ------------------------------------------------------------------
    $path = 'app/admin/views/_partials/pmd_reservations_lab_cards_v1.blade.php';
    if (strpos($patched[$path], 'PMD_RESERVATIONS_CARDS_TR_LOCALE_V1') === false) {
        $old = <<<'BLADE'
    $pmdOpsLocale = strtolower((string)($pmdCleanWorkspaceLocale ?? ($pmdOpsSchedule['locale'] ?? 'en')));
    $pmdOpsLocale = strpos($pmdOpsLocale, 'de') === 0 ? 'de' : 'en';
    $pmdOpsIsGerman = $pmdOpsLocale === 'de';
BLADE;
        $new = <<<'BLADE'
    // PMD_RESERVATIONS_CARDS_TR_LOCALE_V1
    $pmdOpsLocale = \Admin\Classes\PmdPlatformI18n::normalizeLocale(
        (string)($pmdCleanWorkspaceLocale ?? ($pmdOpsSchedule['locale'] ?? 'en'))
    );
    if (!in_array($pmdOpsLocale, ['en', 'de', 'tr'], true)) {
        $pmdOpsLocale = 'en';
    }
    $pmdOpsIsGerman = $pmdOpsLocale === 'de';
BLADE;
        $patched[$path] = pmdHotfixReplaceOnce(
            $patched[$path],
            $old,
            $new,
            'Reservations cards locale collapse'
        );

        $old = <<<'BLADE'
        ];

    $pmdOpsToday = (string)($pmdOpsSchedule['today'] ?? now('Europe/Berlin')->format('Y-m-d'));
BLADE;
        $new = <<<'BLADE'
        ];

    if ($pmdOpsLocale === 'tr') {
        foreach ($pmdOpsText as $pmdOpsTextKey => $pmdOpsEnglishValue) {
            $pmdOpsText[$pmdOpsTextKey] = \Admin\Classes\PmdPlatformI18n::fromEnglish(
                (string)$pmdOpsEnglishValue,
                '',
                [],
                'tr',
                (string)$pmdOpsEnglishValue
            );
        }
    }

    $pmdOpsToday = (string)($pmdOpsSchedule['today'] ?? now('Europe/Berlin')->format('Y-m-d'));
BLADE;
        $patched[$path] = pmdHotfixReplaceOnce(
            $patched[$path],
            $old,
            $new,
            'Reservations cards server TR conversion'
        );

        $old = <<<'BLADE'
        $dateLabel = $pmdOpsIsGerman
            ? \Carbon\Carbon::parse($date)->format('d.m.Y')
            : \Carbon\Carbon::parse($date)->format('d M Y');
BLADE;
        $new = <<<'BLADE'
        $dateLabel = in_array($pmdOpsLocale, ['de', 'tr'], true)
            ? \Carbon\Carbon::parse($date)->format('d.m.Y')
            : \Carbon\Carbon::parse($date)->format('d M Y');
BLADE;
        $patched[$path] = pmdHotfixReplaceOnce(
            $patched[$path],
            $old,
            $new,
            'Reservations cards date locale'
        );
    }

    // ------------------------------------------------------------------
    // F) Shared Floor first paint: its locale allow-list was EN/DE only.
    //    For TR, build the existing English arrays, then resolve every value
    //    through the one canonical Turkish catalogue.
    // ------------------------------------------------------------------
    $path = 'app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php';
    if (strpos($patched[$path], 'PMD_FLOOR_TR_SERVER_TEXT_V1') === false) {
        $old = <<<'BLADE'
    if (!in_array($pmdFloorTableManagerLocale, ['en', 'de'], true)) {
        $pmdFloorTableManagerLocale = 'en';
    }
BLADE;
        $new = <<<'BLADE'
    // PMD_FLOOR_TR_SERVER_TEXT_V1
    if (!in_array($pmdFloorTableManagerLocale, ['en', 'de', 'tr'], true)) {
        $pmdFloorTableManagerLocale = 'en';
    }
BLADE;
        $patched[$path] = pmdHotfixReplaceOnce(
            $patched[$path],
            $old,
            $new,
            'Floor locale allow-list'
        );

        $old = <<<'BLADE'
        : [
            'add_floor' => 'Add floor',
            'title' => 'Create new floor',
            'subtitle' => 'Create another Floor map for this restaurant location.',
            'name' => 'Floor name',
            'placeholder' => 'For example Ground floor, Terrace or First floor',
            'cancel' => 'Cancel',
            'create' => 'Create floor',
            'required' => 'Floor name is required.',
        ];

    /* PMD_FLOOR_RESERVATION_BUSY_WINDOWS_V1_2
BLADE;
        $new = <<<'BLADE'
        : [
            'add_floor' => 'Add floor',
            'title' => 'Create new floor',
            'subtitle' => 'Create another Floor map for this restaurant location.',
            'name' => 'Floor name',
            'placeholder' => 'For example Ground floor, Terrace or First floor',
            'cancel' => 'Cancel',
            'create' => 'Create floor',
            'required' => 'Floor name is required.',
        ];

    if ($pmdFloorTableManagerLocale === 'tr') {
        $pmdFloorServerTranslate = static function (array $values): array {
            foreach ($values as $key => $english) {
                if (!is_string($english)) continue;
                $values[$key] = \Admin\Classes\PmdPlatformI18n::fromEnglish(
                    $english,
                    '',
                    [],
                    'tr',
                    $english
                );
            }
            return $values;
        };

        $pmdFloorTableManagerText = $pmdFloorServerTranslate(
            $pmdFloorTableManagerText
        );
        $pmdFloorManageText = $pmdFloorServerTranslate(
            $pmdFloorManageText
        );
        $pmdFloorRegistryText = $pmdFloorServerTranslate(
            $pmdFloorRegistryText
        );
        $pmdFloorLayoutEditLabel = \Admin\Classes\PmdPlatformI18n::fromEnglish(
            'Edit layout',
            '',
            [],
            'tr',
            'Edit layout'
        );
    }

    /* PMD_FLOOR_RESERVATION_BUSY_WINDOWS_V1_2
BLADE;
        $patched[$path] = pmdHotfixReplaceOnce(
            $patched[$path],
            $old,
            $new,
            'Floor server dictionary conversion point'
        );
    }

    // ------------------------------------------------------------------
    // G) ONE Turkish wording authority. Add only compatibility literals that
    //    current server-first PMD surfaces emit and that were missing from TR.
    // ------------------------------------------------------------------
    $path = 'app/admin/i18n/platform/tr.php';
    $turkishLiterals = [
        'Add floor' => 'Kat planı ekle',
        'Create new floor' => 'Yeni kat planı oluştur',
        'Create another Floor map for this restaurant location.' => 'Bu restoran konumu için başka bir kat planı oluşturun.',
        'Floor name' => 'Kat planı adı',
        'For example Ground floor, Terrace or First floor' => 'Örneğin Zemin kat, Teras veya Birinci kat',
        'Create floor' => 'Kat planı oluştur',
        'Floor name is required.' => 'Kat planı adı zorunludur.',
        'Edit floor' => 'Kat planını düzenle',
        'Rename or remove this Floor.' => 'Bu kat planını yeniden adlandırın veya kaldırın.',
        'Save name' => 'Adı kaydet',
        'Remove floor' => 'Kat planını kaldır',
        'This is the default Floor. You can rename it, but it cannot be removed.' => 'Bu varsayılan kat planıdır. Yeniden adlandırılabilir ancak kaldırılamaz.',
        'Remove this Floor? Its tables will move to Main Floor. No tables will be deleted.' => 'Bu kat planı kaldırılsın mı? Masaları Ana Kat Planına taşınır. Hiçbir masa silinmez.',
        'Add table' => 'Masa ekle',
        'Edit table' => 'Masayı düzenle',
        'Floor table management' => 'Kat planı masa yönetimi',
        'Create new table' => 'Yeni masa oluştur',
        'Manage table number, Floor and capacity.' => 'Masa numarasını, kat planını ve kapasiteyi yönetin.',
        'Manage table number, Floor, capacity and QR.' => 'Masa numarasını, kat planını, kapasiteyi ve QR kodunu yönetin.',
        'Table number' => 'Masa numarası',
        'Section / Zone' => 'Bölüm / Bölge',
        'Floor' => 'Kat planı',
        'Shape' => 'Şekil',
        'Minimum guests' => 'Minimum misafir',
        'Normal seats' => 'Normal kapasite',
        'Maximum guests' => 'Maksimum misafir',
        'Extra chairs' => 'Ek sandalyeler',
        'Reservation priority' => 'Rezervasyon önceliği',
        'Reservable' => 'Rezervasyona açık',
        'Visible on Floor' => 'Kat planında görünür',
        'Joinable' => 'Birleştirilebilir',
        'Internal Floor note' => 'Dahili kat planı notu',
        'Optional, for example window seat or operational notes' => 'İsteğe bağlı; örneğin pencere yanı veya operasyon notları',
        'Save table' => 'Masayı kaydet',
        'Remove table' => 'Masayı kaldır',
        'Removing…' => 'Kaldırılıyor…',
        'Remove this table permanently? Its QR code will stop working after deletion.' => 'Bu masa kalıcı olarak kaldırılsın mı? Silindikten sonra QR kodu çalışmayacaktır.',
        'Loading table details…' => 'Masa ayrıntıları yükleniyor…',
        'POS/custom table: its number is managed by the existing POS system.' => 'POS/özel masa: numarası mevcut POS sistemi tarafından yönetilir.',
        'QR remains fully managed by the existing PMD table system. This card never reads or changes QR codes.' => 'QR kodu mevcut PMD masa sistemi tarafından yönetilmeye devam eder. Bu kart QR kodunu okumaz veya değiştirmez.',
        'Select one individual table first.' => 'Önce tek bir masa seçin.',
        'Edit layout' => 'Yerleşimi düzenle',
        'Full Floor' => 'Tam kat planı',
        'One row' => 'Tek sıra',
        'No tables match this view.' => 'Bu görünüme uyan masa yok.',
        'Capacity' => 'Kapasite',
        'Table features' => 'Masa özellikleri',
        'Near window' => 'Pencere yanı',
        'Quiet area' => 'Sessiz alan',
        'Accessible' => 'Erişilebilir',
        'Preparing QR…' => 'QR hazırlanıyor…',
        'QR code' => 'QR kodu',
        'Created automatically on the first save.' => 'İlk kayıtta otomatik olarak oluşturulur.',
        'This table QR code' => 'Bu masanın QR kodu',
        'Opens the customer menu for this exact table.' => 'Bu masa için müşteri menüsünü açar.',
        'Open customer menu' => 'Müşteri menüsünü aç',
        'Choose design & download' => 'Tasarım seç ve indir',
        'Available Tables' => 'Müsait Masalar',
        'Reservation KPIs' => 'Rezervasyon KPI’ları',
        'Cashier KPIs' => 'Kasiyer KPI’ları',
        'Accounting KPIs' => 'Muhasebe KPI’ları',
        'Workspace KPIs' => 'Çalışma alanı KPI’ları',
        'Choose KPI' => 'KPI seç',
        'Visible in this card' => 'Bu kartta görünür',
        'Already visible' => 'Zaten görünür',
        'Show in this card' => 'Bu kartta göster',
        "Today's reservations" => 'Bugünkü rezervasyonlar',
        'Reservations for today · sorted by time' => 'Bugünkü rezervasyonlar · saate göre sıralı',
        'Reservations in the selected date range · sorted by date and time' => 'Seçilen tarih aralığındaki rezervasyonlar · tarih ve saate göre sıralı',
        'Open reservation' => 'Rezervasyonu aç',
        'Add reservation' => 'Rezervasyon ekle',
        'No table yet' => 'Henüz masa yok',
        'No reservations in this date range' => 'Bu tarih aralığında rezervasyon yok',
        'No reservations were found for the selected date range.' => 'Seçilen tarih aralığında rezervasyon bulunamadı.',
        'No Reservation' => 'Rezervasyon yok',
        'Date range' => 'Tarih aralığı',
        'Last 7 days' => 'Son 7 gün',
        'From' => 'Başlangıç',
        'To' => 'Bitiş',
        'No enabled menu categories' => 'Etkin menü kategorisi yok',
    ];
    $patched[$path] = pmdHotfixAddTurkishLiterals(
        $patched[$path],
        $turkishLiterals
    );

    // --------------------------------------------------------------
    // Validate the pure PHP files BEFORE writing source.
    // --------------------------------------------------------------
    $lintFiles = [
        'app/admin/classes/PmdPlatformI18n.php',
        'app/admin/classes/PmdCleanWorkspaceControllerV1.php',
        'app/admin/controllers/Dashboardlab.php',
        'app/admin/i18n/platform/tr.php',
    ];

    $tmpDir = sys_get_temp_dir().'/pmd-tr-hotfix-'.bin2hex(random_bytes(6));
    if (!mkdir($tmpDir, 0700, true) && !is_dir($tmpDir)) {
        throw new RuntimeException('Could not create temporary lint directory.');
    }

    try {
        foreach ($lintFiles as $path) {
            $tmp = $tmpDir.'/'.basename($path);
            if (file_put_contents($tmp, $patched[$path]) === false) {
                throw new RuntimeException('Could not stage '.$path.' for syntax validation.');
            }

            $command = 'php -l '.escapeshellarg($tmp).' 2>&1';
            exec($command, $output, $status);
            if ($status !== 0) {
                throw new RuntimeException(
                    "PHP syntax check failed for {$path}: ".implode("\n", $output)
                );
            }
            $output = [];
        }
    } finally {
        foreach (glob($tmpDir.'/*') ?: [] as $tmp) {
            @unlink($tmp);
        }
        @rmdir($tmpDir);
    }

    // --------------------------------------------------------------
    // Backup current VPS versions, then atomically-ish replace content.
    // --------------------------------------------------------------
    $sudoUser = trim((string)getenv('SUDO_USER'));
    $home = $sudoUser !== '' && $sudoUser !== 'root'
        ? '/home/'.$sudoUser
        : (getenv('HOME') ?: '/root');
    $stamp = date('Ymd_His');
    $backupRoot = rtrim($home, '/').'/pmd-backups/turkish-server-authority-'.$stamp;

    foreach ($targets as $path) {
        $backupPath = $backupRoot.'/'.$path;
        $backupDir = dirname($backupPath);
        if (!is_dir($backupDir) && !mkdir($backupDir, 0755, true) && !is_dir($backupDir)) {
            throw new RuntimeException('Could not create backup directory '.$backupDir);
        }
        if (!copy($root.'/'.$path, $backupPath)) {
            throw new RuntimeException('Could not back up '.$path);
        }
    }

    foreach ($targets as $path) {
        $target = $root.'/'.$path;
        $mode = fileperms($target) & 0777;
        $owner = fileowner($target);
        $group = filegroup($target);
        $temp = $target.'.pmd-tr-hotfix.tmp';

        if (file_put_contents($temp, $patched[$path]) === false) {
            throw new RuntimeException('Could not write temporary source '.$path);
        }
        @chmod($temp, $mode ?: 0644);
        if (function_exists('chown') && $owner !== false) @chown($temp, $owner);
        if (function_exists('chgrp') && $group !== false) @chgrp($temp, $group);

        if (!rename($temp, $target)) {
            @unlink($temp);
            throw new RuntimeException('Could not replace '.$path);
        }
    }

    echo "PMD TURKISH SERVER-AUTHORITY HOTFIX: APPLIED\n";
    echo "Backup: {$backupRoot}\n";
    echo "Touched source files:\n";
    foreach ($targets as $path) {
        echo " - {$path}\n";
    }
    echo "\nNo payment/currency/tenant data was changed.\n";
    echo "No Git checkout/reset/pull was performed.\n";
} catch (Throwable $error) {
    fwrite(STDERR, "PMD TURKISH SERVER-AUTHORITY HOTFIX FAILED\n");
    fwrite(STDERR, $error->getMessage()."\n");
    exit(1);
}
