{{--
    PMD_DASHBOARD_LAB_ANALYTICS_SERVER_DOM_V3
    PMD_DASHBOARD_LAB_SHARED_ROLE_ENDPOINT_V3_4

    Canonical Dashboard Lab Analytics markup.
    Initial Analytics data is already resolved by Dashboardlab.php.
    This partial turns that payload into final card-body HTML before the
    response reaches the browser. The client Analytics runtime adopts this
    DOM and is used only for explicit user interactions afterwards.
--}}
@php
    $analyticsBootstrap = is_array($analyticsBootstrap ?? null)
        ? $analyticsBootstrap
        : [];

    $analyticsPeriods = is_array($analyticsBootstrap['periods'] ?? null)
        ? $analyticsBootstrap['periods']
        : [];

    $analyticsLast30 = is_array($analyticsPeriods['last30'] ?? null)
        ? $analyticsPeriods['last30']
        : [];

    $analyticsMonth = is_array($analyticsPeriods['month'] ?? null)
        ? $analyticsPeriods['month']
        : [];

    $analyticsServerReady =
        ($analyticsBootstrap['server_first_paint'] ?? false) === true
        && ($analyticsLast30['success'] ?? false) === true
        && ($analyticsMonth['success'] ?? false) === true;

    $analyticsChartMode = rawurldecode(
        (string)(
            $_COOKIE['pmd_dashboard_lab_sales_chart_mode']
            ?? 'line'
        )
    ) === 'bar'
        ? 'bar'
        : 'line';

    /* PMD_ANALYTICS_SERVER_SMOOTH_LINE_R54
     * Server first paint must use the same locale and curve geometry as the
     * interaction renderer. Otherwise refresh shows sharp/English first and
     * the first L/B toggle silently changes the chart.
     */
    $analyticsLocale = strtolower(trim((string)request()->cookie(
        'pmd_admin_locale',
        app()->getLocale()
    )));
    $analyticsLocale = strpos($analyticsLocale, 'de') === 0 ? 'de' : 'en';

    $analyticsEscape = static function ($value): string {
        return htmlspecialchars(
            (string)($value ?? ''),
            ENT_QUOTES | ENT_SUBSTITUTE,
            'UTF-8'
        );
    };

    $analyticsMoney = static function ($value, array $payload) use ($analyticsLocale): string {
        $number = (float)($value ?? 0);
        $symbol = trim((string)($payload['currency_symbol'] ?? '€'));
        $code = strtoupper(trim((string)($payload['currency'] ?? 'EUR')));

        if ($analyticsLocale === 'de') {
            $formatted = number_format($number, 2, ',', '.');
            return $formatted.' '.($symbol !== '' ? $symbol : $code);
        }

        $formatted = number_format($number, 2, '.', ',');
        return ($symbol !== '' ? $symbol : $code.' ').$formatted;
    };

    $analyticsEmpty = static function ($source = null) use ($analyticsEscape): string {
        $source = is_array($source) ? $source : [];
        $message = $source['reason'] ?? $source['source'] ?? 'No records';

        return '<p class="pmd-dashboard-lab-empty">'.
            $analyticsEscape($message).
            '</p>';
    };

    $analyticsList = static function (
        array $rows,
        callable $render
    ) use ($analyticsEmpty): string {
        if (!$rows) {
            return $analyticsEmpty();
        }

        $html = '<ul class="pmd-dashboard-lab-list">';

        foreach ($rows as $row) {
            $html .= '<li>'.$render(is_array($row) ? $row : []).'</li>';
        }

        return $html.'</ul>';
    };

    $analyticsNiceScale = static function ($rawMaximum): array {
        $maximum = max(1.0, (float)($rawMaximum ?? 0));
        $rough = $maximum / 4;
        $magnitude = pow(10, floor(log10($rough)));
        $normalized = $rough / $magnitude;

        if ($normalized <= 1) {
            $stepBase = 1;
        } elseif ($normalized <= 2) {
            $stepBase = 2;
        } elseif ($normalized <= 2.5) {
            $stepBase = 2.5;
        } elseif ($normalized <= 5) {
            $stepBase = 5;
        } else {
            $stepBase = 10;
        }

        $step = $stepBase * $magnitude;
        $max = ceil($maximum / $step) * $step;
        $ticks = [];

        for ($value = 0; $value <= $max + $step / 10; $value += $step) {
            $ticks[] = round($value, 8);
        }

        return [
            'max' => $max,
            'step' => $step,
            'ticks' => $ticks,
        ];
    };

    $analyticsShortLabel = static function (array $row, bool $hourly) use ($analyticsLocale): string {
        if ($hourly) {
            return str_pad(
                (string)((int)($row['hour'] ?? 0)),
                2,
                '0',
                STR_PAD_LEFT
            ).':00';
        }

        $raw = trim((string)($row['bucket'] ?? ''));
        if ($raw === '') {
            return '';
        }

        $timestamp = strtotime($raw);
        if ($timestamp === false) {
            return substr($raw, 5, 5);
        }

        if ($analyticsLocale === 'de') {
            $months = [
                1 => 'Jan.',
                2 => 'Feb.',
                3 => 'März',
                4 => 'Apr.',
                5 => 'Mai',
                6 => 'Juni',
                7 => 'Juli',
                8 => 'Aug.',
                9 => 'Sept.',
                10 => 'Okt.',
                11 => 'Nov.',
                12 => 'Dez.',
            ];

            return date('d.', $timestamp).' '.$months[(int)date('n', $timestamp)];
        }

        return date('M d', $timestamp);
    };

    $analyticsChartGrid = static function (
        array $scale,
        array $dimensions,
        array $payload
    ) use ($analyticsEscape, $analyticsMoney): string {
        $html = '';

        foreach ($scale['ticks'] as $value) {
            $ratio = $scale['max'] > 0
                ? $value / $scale['max']
                : 0;

            $y =
                $dimensions['top']
                + $dimensions['plotH']
                - $dimensions['plotH'] * $ratio;

            $html .=
                '<line class="pmd-lab-chart-grid-line" x1="'.
                $dimensions['left'].
                '" y1="'.$y.
                '" x2="'.($dimensions['w'] - $dimensions['right']).
                '" y2="'.$y.'"></line>'.
                '<text class="pmd-lab-chart-axis-label" x="'.
                ($dimensions['left'] - 14).
                '" y="'.($y + 4).
                '" text-anchor="end">'.
                $analyticsEscape($analyticsMoney($value, $payload)).
                '</text>';
        }

        return $html;
    };

    $analyticsChartRows = static function (array $rows, ?int $visible): array {
        if ($visible === null || $visible >= count($rows)) {
            return array_values($rows);
        }

        return array_slice(
            array_values($rows),
            max(0, count($rows) - $visible)
        );
    };

    $analyticsSmoothLinePath = static function (array $points): string {
        if (!$points) {
            return '';
        }

        $path = 'M '.$points[0]['x'].' '.$points[0]['y'];

        for ($index = 1; $index < count($points); $index++) {
            $previous = $points[$index - 1];
            $current = $points[$index];
            $handle = ($current['x'] - $previous['x']) * 0.38;

            $path .= ' C '.
                ($previous['x'] + $handle).' '.$previous['y'].' '.
                ($current['x'] - $handle).' '.$current['y'].' '.
                $current['x'].' '.$current['y'];
        }

        return $path;
    };

    $analyticsSmoothAreaPath = static function (array $points, $base): string {
        if (!$points) {
            return '';
        }

        $path = 'M '.$points[0]['x'].' '.$base.
            ' L '.$points[0]['x'].' '.$points[0]['y'];

        for ($index = 1; $index < count($points); $index++) {
            $previous = $points[$index - 1];
            $current = $points[$index];
            $handle = ($current['x'] - $previous['x']) * 0.38;

            $path .= ' C '.
                ($previous['x'] + $handle).' '.$previous['y'].' '.
                ($current['x'] - $handle).' '.$current['y'].' '.
                $current['x'].' '.$current['y'];
        }

        return $path.' L '.$points[count($points) - 1]['x'].' '.$base.' Z';
    };

    $analyticsSvgLine = static function (
        array $allRows,
        array $payload,
        ?int $visible
    ) use (
        $analyticsEmpty,
        $analyticsNiceScale,
        $analyticsChartRows,
        $analyticsChartGrid,
        $analyticsShortLabel,
        $analyticsEscape,
        $analyticsMoney,
        $analyticsSmoothLinePath,
        $analyticsSmoothAreaPath
    ): string {
        $rows = $analyticsChartRows($allRows, $visible);

        if (!$rows) {
            return $analyticsEmpty();
        }

        $values = array_map(
            static fn ($row) => (float)($row['sales'] ?? 0),
            $rows
        );

        $scale = $analyticsNiceScale(max(array_merge($values, [1])));

        $d = [
            'w' => 900,
            'h' => 330,
            'left' => 82,
            'right' => 18,
            'top' => 14,
            'bottom' => 42,
        ];

        $d['plotW'] = $d['w'] - $d['left'] - $d['right'];
        $d['plotH'] = $d['h'] - $d['top'] - $d['bottom'];
        $base = $d['top'] + $d['plotH'];
        $points = [];
        $count = count($rows);

        foreach ($rows as $index => $row) {
            $value = (float)($row['sales'] ?? 0);
            $x = $d['left'] + $d['plotW'] * (
                $count === 1
                    ? 0.5
                    : $index / ($count - 1)
            );
            $y = $d['top'] + $d['plotH'] -
                $d['plotH'] * $value / $scale['max'];

            $points[] = [
                'x' => $x,
                'y' => $y,
                'row' => $row,
                'value' => $value,
            ];
        }

        $linePath = $analyticsSmoothLinePath($points);
        $areaPath = $analyticsSmoothAreaPath($points, $base);

        $labelEvery = max(1, (int)ceil($count / 7));
        $labels = '';
        $circles = '';

        foreach ($points as $index => $point) {
            if (
                $index % $labelEvery === 0
                || $index === count($points) - 1
            ) {
                $labels .=
                    '<text class="pmd-lab-chart-axis-label" x="'.
                    $point['x'].
                    '" y="'.($d['h'] - 12).
                    '" text-anchor="middle">'.
                    $analyticsEscape(
                        $analyticsShortLabel($point['row'], false)
                    ).
                    '</text>';
            }

            if ($point['value'] > 0) {
                $circles .=
                    '<circle class="pmd-lab-chart-point" cx="'.
                    $point['x'].
                    '" cy="'.$point['y'].
                    '" r="4"><title>'.
                    $analyticsEscape(
                        $analyticsShortLabel($point['row'], false).
                        ' - '.
                        $analyticsMoney(
                            $point['row']['sales'] ?? 0,
                            $payload
                        )
                    ).
                    '</title></circle>';
            }
        }

        return
            '<svg viewBox="0 0 900 330" role="img" aria-label="Sales over time line chart">'.
            $analyticsChartGrid($scale, $d, $payload).
            '<line class="pmd-lab-chart-axis" x1="'.$d['left'].
            '" y1="'.$base.
            '" x2="'.($d['w'] - $d['right']).
            '" y2="'.$base.'"></line>'.
            '<path class="pmd-lab-chart-area" d="'.$areaPath.'"></path>'.
            '<path class="pmd-lab-chart-line" d="'.$linePath.'"></path>'.
            $circles.$labels.
            '</svg>';
    };

    $analyticsSvgBars = static function (
        array $allRows,
        array $payload,
        ?int $visible,
        bool $hourly,
        string $ariaLabel
    ) use (
        $analyticsEmpty,
        $analyticsNiceScale,
        $analyticsChartRows,
        $analyticsChartGrid,
        $analyticsShortLabel,
        $analyticsEscape,
        $analyticsMoney
    ): string {
        $rows = $analyticsChartRows($allRows, $visible);

        if (!$rows) {
            return $analyticsEmpty();
        }

        $values = array_map(
            static fn ($row) => (float)($row['sales'] ?? 0),
            $rows
        );

        $scale = $analyticsNiceScale(max(array_merge($values, [1])));

        $d = [
            'w' => 900,
            'h' => 330,
            'left' => 82,
            'right' => 18,
            'top' => 14,
            'bottom' => 42,
        ];

        $d['plotW'] = $d['w'] - $d['left'] - $d['right'];
        $d['plotH'] = $d['h'] - $d['top'] - $d['bottom'];
        $base = $d['top'] + $d['plotH'];
        $count = count($rows);
        $slot = $d['plotW'] / max($count, 1);
        $barWidth = max(5, min(28, $slot * 0.58));
        $labelEvery = max(1, (int)ceil($count / 8));
        $bars = '';
        $labels = '';

        foreach ($rows as $index => $row) {
            $value = (float)($row['sales'] ?? 0);
            $x = $d['left'] + $slot * $index + $slot / 2 - $barWidth / 2;
            $height = $d['plotH'] * $value / $scale['max'];
            $y = $base - $height;
            $label = $analyticsShortLabel($row, $hourly);

            $bars .=
                '<rect class="pmd-lab-chart-bar'.
                ($value <= 0 ? ' is-zero' : '').
                '" x="'.$x.
                '" y="'.$y.
                '" width="'.$barWidth.
                '" height="'.max(2, $height).
                '" rx="3"><title>'.
                $analyticsEscape(
                    $label.' - '.$analyticsMoney($value, $payload)
                ).
                '</title></rect>';

            if (
                $index % $labelEvery === 0
                || $index === $count - 1
            ) {
                $labelX = $d['left'] + $slot * $index + $slot / 2;
                $labels .=
                    '<text class="pmd-lab-chart-axis-label" x="'.
                    $labelX.
                    '" y="'.($d['h'] - 12).
                    '" text-anchor="middle">'.
                    $analyticsEscape($label).
                    '</text>';
            }
        }

        return
            '<svg viewBox="0 0 900 330" role="img" aria-label="'.
            $analyticsEscape($ariaLabel).
            '">'.
            $analyticsChartGrid($scale, $d, $payload).
            '<line class="pmd-lab-chart-axis" x1="'.$d['left'].
            '" y1="'.$base.
            '" x2="'.($d['w'] - $d['right']).
            '" y2="'.$base.'"></line>'.
            $bars.$labels.
            '</svg>';
    };

    $analyticsChartMarkup = static function (
        string $key,
        array $rows,
        array $payload,
        string $mode,
        ?int $visible,
        bool $hourly
    ) use (
        $analyticsSvgLine,
        $analyticsSvgBars,
        $analyticsEscape
    ): string {
        $total = count($rows);
        $minimum = min($hourly ? 4 : 5, max($total, 1));
        $maximum = max($total, $minimum);
        $value = max(
            $minimum,
            min((int)($visible ?? $maximum), $maximum)
        );

        $svg = $mode === 'line'
            ? $analyticsSvgLine($rows, $payload, $value)
            : $analyticsSvgBars(
                $rows,
                $payload,
                $value,
                $hourly,
                $hourly
                    ? 'Sales by hour bar chart'
                    : 'Sales over time bar chart'
            );

        return
            '<div class="pmd-dashboard-lab-chart">'.
                '<div class="pmd-dashboard-lab-chart__frame">'.
                    $svg.
                '</div>'.
            '</div>';
    };

    $analyticsDonut = static function (
        array $rows,
        string $nameKey,
        string $valueKey,
        array $payload,
        callable $labelFn
    ) use ($analyticsEmpty, $analyticsEscape): string {
        $rows = array_slice(array_values($rows), 0, 6);

        if (!$rows) {
            return $analyticsEmpty();
        }

        $colors = [
            '#00a676',
            '#2563eb',
            '#ff8a00',
            '#d946ef',
            '#06b6d4',
            '#ef4444',
        ];

        $values = array_map(
            static fn ($row) => max(0, (float)($row[$valueKey] ?? 0)),
            $rows
        );

        $total = array_sum($values);
        $offset = 0.0;
        $circles = '';
        $legend = '<ul class="pmd-dashboard-lab-donut__legend">';

        foreach ($rows as $index => $row) {
            $percentage = $total > 0
                ? $values[$index] / $total * 100
                : 0;

            $color = $colors[$index % count($colors)];
            $name = (string)($row[$nameKey] ?? '');

            $circles .=
                '<circle cx="60" cy="60" r="45" pathLength="100" fill="none" stroke="'.
                $color.
                '" stroke-width="18" stroke-dasharray="'.
                $percentage.' '.(100 - $percentage).
                '" stroke-dashoffset="-'.$offset.
                '"><title>'.
                $analyticsEscape(
                    $name.' - '.number_format($percentage, 1, '.', '').'%'
                ).
                '</title></circle>';

            $legend .=
                '<li><i style="background:'.$color.'"></i><span>'.
                $analyticsEscape($name).
                '</span><b>'.
                $analyticsEscape($labelFn($row, $percentage)).
                '</b></li>';

            $offset += $percentage;
        }

        $legend .= '</ul>';

        return
            '<div class="pmd-dashboard-lab-donut">'.
                '<svg viewBox="0 0 120 120" role="img" aria-label="Breakdown chart">'.
                    '<circle cx="60" cy="60" r="45" pathLength="100" fill="none" stroke="#edf1ef" stroke-width="18"></circle>'.
                    $circles.
                '</svg>'.
                $legend.
            '</div>';
    };

    /* PMD_DASHBOARD_LAB_BINARY_CHANNELS_V7
     * Dashboard2's KPI contract is binary: Dine in vs Take away.
     * Keep that same display contract here and do not expose raw/legacy
     * order_type values such as numeric IDs as separate channels.
     */
    $analyticsBinaryChannels = static function (array $rows): array {
        $dineIn = [
            'channel' => 'Dine in',
            'orders' => 0,
            'revenue' => 0.0,
        ];

        $takeAway = [
            'channel' => 'Takeaway',
            'orders' => 0,
            'revenue' => 0.0,
        ];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $raw = strtolower(trim((string)($row['channel'] ?? '')));
            $raw = str_replace('_', ' ', $raw);
            $orders = (int)($row['orders'] ?? 0);
            $revenue = (float)($row['revenue'] ?? 0);

            if (in_array($raw, [
                'collection',
                'takeaway',
                'take-away',
                'take away',
                'pickup',
                'pick-up',
            ], true)) {
                $takeAway['orders'] += $orders;
                $takeAway['revenue'] += $revenue;
                continue;
            }

            // Dashboard2 KPI excludes delivery/cashier from this two-way split.
            if (in_array($raw, [
                'delivery',
                'delivered',
                'cashier',
            ], true)) {
                continue;
            }

            // All remaining legacy/raw values follow the KPI dine-in bucket.
            $dineIn['orders'] += $orders;
            $dineIn['revenue'] += $revenue;
        }

        return [$dineIn, $takeAway];
    };

    $analyticsCleanReservationTitle = static function ($value): string {
        $title = preg_replace(
            '/[\x{00A0}\x{2007}\x{202F}]/u',
            ' ',
            (string)($value ?? '')
        );

        $title = preg_replace('/\s+/u', ' ', $title ?? '');
        $title = preg_replace('/^Tables? +Tables? +/i', 'Table ', $title ?? '');
        $title = preg_replace('/^Tische? +Tische? +/i', 'Tisch ', $title ?? '');

        return trim((string)$title);
    };

    $analyticsBodies = [];

    if ($analyticsServerReady) {
        $salesSource = is_array($analyticsLast30['sales_over_time'] ?? null)
            ? $analyticsLast30['sales_over_time']
            : [];

        if (($salesSource['available'] ?? true) === false) {
            $analyticsBodies['salesOverTime'] = $analyticsEmpty($salesSource);
        } else {
            $salesRows = is_array($salesSource['buckets'] ?? null)
                ? $salesSource['buckets']
                : [];

            $analyticsBodies['salesOverTime'] = $analyticsChartMarkup(
                'salesOverTime',
                $salesRows,
                $analyticsLast30,
                $analyticsChartMode,
                min(19, max(count($salesRows), 1)),
                false
            );
        }

        $hourSource = is_array($analyticsLast30['sales_by_hour'] ?? null)
            ? $analyticsLast30['sales_by_hour']
            : [];

        if (($hourSource['available'] ?? true) === false) {
            $analyticsBodies['salesByHour'] = $analyticsEmpty($hourSource);
        } else {
            $hourRows = is_array($hourSource['hours'] ?? null)
                ? $hourSource['hours']
                : [];

            $analyticsBodies['salesByHour'] = $analyticsChartMarkup(
                'salesByHour',
                $hourRows,
                $analyticsLast30,
                'bar',
                min(15, max(count($hourRows), 1)),
                true
            );
        }

        $categorySource = is_array($analyticsMonth['sales_by_category'] ?? null)
            ? $analyticsMonth['sales_by_category']
            : [];

        if (
            ($categorySource['available'] ?? true) === false
            || ($categorySource['empty'] ?? false)
        ) {
            $analyticsBodies['categorySales'] = $analyticsEmpty($categorySource);
        } else {
            $analyticsBodies['categorySales'] = $analyticsDonut(
                is_array($categorySource['categories'] ?? null)
                    ? $categorySource['categories']
                    : [],
                'category',
                'revenue',
                $analyticsMonth,
                static function (array $row, float $percentage) use ($analyticsMoney, $analyticsMonth): string {
                    return $analyticsMoney($row['revenue'] ?? 0, $analyticsMonth).
                        ' - '.number_format($percentage, 1, '.', '').'%';
                }
            );
        }

        $paymentSource = is_array($analyticsMonth['payment_methods'] ?? null)
            ? $analyticsMonth['payment_methods']
            : [];

        if (
            ($paymentSource['available'] ?? true) === false
            || ($paymentSource['empty'] ?? false)
        ) {
            $analyticsBodies['paymentMethods'] = $analyticsEmpty($paymentSource);
        } else {
            $analyticsBodies['paymentMethods'] = $analyticsDonut(
                is_array($paymentSource['methods'] ?? null)
                    ? $paymentSource['methods']
                    : [],
                'method',
                'total',
                $analyticsMonth,
                static function (array $row, float $percentage) use ($analyticsMoney, $analyticsMonth): string {
                    return $analyticsMoney($row['total'] ?? 0, $analyticsMonth).
                        ' - '.number_format($percentage, 1, '.', '').'%';
                }
            );
        }

        $channelSource = is_array($analyticsMonth['channels'] ?? null)
            ? $analyticsMonth['channels']
            : [];

        if (
            ($channelSource['available'] ?? true) === false
            || ($channelSource['empty'] ?? false)
        ) {
            $analyticsBodies['channelSplit'] = $analyticsEmpty($channelSource);
        } else {
            $analyticsBodies['channelSplit'] = $analyticsDonut(
                $analyticsBinaryChannels(
                    is_array($channelSource['channels'] ?? null)
                        ? $channelSource['channels']
                        : []
                ),
                'channel',
                'revenue',
                $analyticsMonth,
                static function (array $row, float $percentage) use ($analyticsMoney, $analyticsMonth): string {
                    return (int)($row['orders'] ?? 0).
                        ' - '.$analyticsMoney($row['revenue'] ?? 0, $analyticsMonth).
                        ' - '.number_format($percentage, 1, '.', '').'%';
                }
            );
        }

        $topSource = is_array($analyticsMonth['top_items'] ?? null)
            ? $analyticsMonth['top_items']
            : [];

        if (
            ($topSource['available'] ?? true) === false
            || ($topSource['empty'] ?? false)
        ) {
            $analyticsBodies['topItems'] = $analyticsEmpty($topSource);
        } else {
            $analyticsBodies['topItems'] = $analyticsList(
                array_slice(
                    is_array($topSource['items'] ?? null)
                        ? $topSource['items']
                        : [],
                    0,
                    4
                ),
                static function (array $row) use ($analyticsEscape, $analyticsMoney, $analyticsMonth): string {
                    return '<span>'.$analyticsEscape($row['name'] ?? '').
                        '</span><b>'.$analyticsEscape(
                            (int)($row['quantity'] ?? 0).
                            ' - '.$analyticsMoney($row['revenue'] ?? 0, $analyticsMonth)
                        ).'</b>';
                }
            );
        }

        $liveSource = is_array($analyticsLast30['live_operations'] ?? null)
            ? $analyticsLast30['live_operations']
            : [];

        if (($liveSource['available'] ?? true) === false) {
            $analyticsBodies['liveOperations'] = $analyticsEmpty($liveSource);
        } else {
            $analyticsBodies['liveOperations'] =
                $analyticsList(
                    array_slice(
                        is_array($liveSource['orders'] ?? null)
                            ? $liveSource['orders']
                            : [],
                        0,
                        5
                    ),
                    static function (array $row) use ($analyticsEscape): string {
                        return '<span>#'.$analyticsEscape($row['order_id'] ?? '').
                            ' - '.$analyticsEscape($row['channel'] ?? '').
                            '</span><b>'.$analyticsEscape($row['status'] ?? 'Open').
                            '</b>';
                    }
                );
        }

        $transactionSource = is_array($analyticsLast30['recent_transactions'] ?? null)
            ? $analyticsLast30['recent_transactions']
            : [];

        if (
            ($transactionSource['available'] ?? true) === false
            || ($transactionSource['empty'] ?? false)
        ) {
            $analyticsBodies['recentTransactions'] = $analyticsEmpty($transactionSource);
        } else {
            $analyticsBodies['recentTransactions'] = $analyticsList(
                array_slice(
                    is_array($transactionSource['transactions'] ?? null)
                        ? $transactionSource['transactions']
                        : [],
                    0,
                    5
                ),
                static function (array $row) use ($analyticsEscape, $analyticsMoney, $analyticsLast30): string {
                    $timestamp = (string)($row['timestamp'] ?? '');
                    preg_match(
                        '/(?:T|\s)(\d{2}:\d{2})(?::\d{2})?/',
                        $timestamp,
                        $match
                    );
                    $time = $match[1] ?? substr($timestamp, 0, 5);
                    $method = !empty($row['method'])
                        ? ' - '.$row['method']
                        : '';

                    return '<span>#'.$analyticsEscape($row['order_id'] ?? '').
                        $analyticsEscape($method).
                        ' - '.$analyticsEscape($time).
                        '</span><b>'.$analyticsEscape(
                            $analyticsMoney($row['amount'] ?? 0, $analyticsLast30)
                        ).'</b>';
                }
            );
        }

        $alertSource = is_array($analyticsLast30['alerts'] ?? null)
            ? $analyticsLast30['alerts']
            : [];

        if (
            ($alertSource['available'] ?? true) === false
            || !is_array($alertSource['types'] ?? null)
        ) {
            $analyticsBodies['alerts'] = $analyticsEmpty($alertSource);
        } else {
            $rows = [];

            foreach ($alertSource['types'] as $key => $value) {
                $label = str_replace('_', ' ', (string)$key);

                if (
                    $key === 'long_open_tables'
                    && !empty($alertSource['long_open_threshold_minutes'])
                ) {
                    $label .= ' (> '.
                        $alertSource['long_open_threshold_minutes'].
                        ' min)';
                }

                $rows[] = [
                    'label' => $label,
                    'value' => $value,
                ];
            }

            $analyticsBodies['alerts'] = $analyticsList(
                $rows,
                static function (array $row) use ($analyticsEscape): string {
                    return '<span>'.$analyticsEscape($row['label'] ?? '').
                        '</span><b>'.$analyticsEscape(
                            array_key_exists('value', $row)
                                && $row['value'] !== null
                                ? $row['value']
                                : 'Source unavailable'
                        ).'</b>';
                }
            );
        }

        /* PMD_DASHBOARD_LAB_CONTENT_REFINEMENT_V8 */
        $reviewSource = is_array($analyticsLast30['reviews'] ?? null)
            ? $analyticsLast30['reviews']
            : [];

        if (($reviewSource['available'] ?? true) === false) {
            $analyticsBodies['reviews'] = $analyticsEmpty($reviewSource);
        } else {
            $reviewCount = (int)($reviewSource['count'] ?? 0);
            /* PMD_DASHBOARD_LAB_RANGE_REVIEWS_V8_3_4 */
            $reviewRows = array_slice(
                is_array($reviewSource['latest'] ?? null)
                    ? $reviewSource['latest']
                    : [],
                0,
                5
            );

            /* PMD_DASHBOARD_LAB_REVIEWS_PAYMENT_POLISH_V8_1 */
            $reviewHtml =
                '<ul class="pmd-dashboard-lab-review-list">';

            foreach ($reviewRows as $row) {
                $reviewer = trim((string)($row['reviewer'] ?? ''));
                $reviewerKey = strtolower(
                    preg_replace('/\s+/u', ' ', $reviewer) ?? $reviewer
                );
                if ($reviewerKey === 'checkout guest') {
                    $reviewer = '';
                }
                $comment = trim((string)($row['comment'] ?? ''));

                $inlineReview =
                    ($reviewer !== ''
                        ? '<strong>'.$analyticsEscape($reviewer).'</strong>'
                        : '').
                    ($comment !== ''
                        ? '<span>'.$analyticsEscape($comment).'</span>'
                        : '');

                $reviewHtml .=
                    '<li>'.
                        '<div class="pmd-dashboard-lab-review-line">'.
                            '<span class="pmd-dashboard-lab-review-stars">'.
                                $analyticsEscape($row['stars'] ?? '').
                            '</span>'.
                            '<span class="pmd-dashboard-lab-review-inline-copy">'.
                                $inlineReview.
                            '</span>'.
                            '<b class="pmd-dashboard-lab-review-time">'.
                                $analyticsEscape($row['time'] ?? '').
                            '</b>'.
                        '</div>'.
                    '</li>';
            }

            $reviewHtml .= '</ul>';
            $analyticsBodies['reviews'] = $reviewHtml;
        }

        $tipSource = is_array($analyticsLast30['tips'] ?? null)
            ? $analyticsLast30['tips']
            : [];

        if (($tipSource['available'] ?? true) === false) {
            $analyticsBodies['tips'] = $analyticsEmpty($tipSource);
        } else {
            $analyticsBodies['tips'] =
                '<dl class="pmd-dashboard-lab-stats">'.
                    '<div><dt>Today</dt><dd>'.
                    $analyticsEscape(
                        $analyticsMoney($tipSource['today'] ?? 0, $analyticsLast30)
                    ).
                    '</dd></div>'.
                    '<div><dt>This month</dt><dd>'.
                    $analyticsEscape(
                        $analyticsMoney($tipSource['month'] ?? 0, $analyticsLast30)
                    ).
                    '</dd></div>'.
                    '<div><dt>Average</dt><dd>'.
                    $analyticsEscape(
                        $analyticsMoney($tipSource['average_tip'] ?? 0, $analyticsLast30)
                    ).
                    '</dd></div>'.
                    '<div><dt>Tipped orders</dt><dd>'.
                    $analyticsEscape($tipSource['tipped_orders'] ?? 0).
                    '</dd></div>'.
                '</dl>';
        }

        $calendarSource = is_array($analyticsLast30['calendar_events'] ?? null)
            ? $analyticsLast30['calendar_events']
            : [];

        if (($calendarSource['available'] ?? true) === false) {
            $analyticsBodies['calendarEvents'] = $analyticsEmpty($calendarSource);
        } else {
            $eventCount = (int)($calendarSource['count'] ?? 0);
            $eventRows = array_slice(
                is_array($calendarSource['events'] ?? null)
                    ? $calendarSource['events']
                    : [],
                0,
                4
            );

            $eventHtml =
                '<ul class="pmd-dashboard-lab-event-list">';

            foreach ($eventRows as $row) {
                $tableDisplay = trim((string)($row['table_display'] ?? ''));
                $guests = max(0, (int)($row['guests'] ?? 0));
                $reservationId = (int)($row['reservation_id'] ?? 0);

                $eventHtml .=
                    '<li>'.
                        '<div class="pmd-dashboard-lab-event-copy">'.
                            '<strong>Reservation</strong>'.
                            '<span>#'.$analyticsEscape($reservationId).
                                ($tableDisplay !== ''
                                    ? ' · '.$analyticsEscape($tableDisplay)
                                    : '').
                                ' · '.$analyticsEscape($guests).' pax</span>'.
                        '</div>'.
                        '<b>'.$analyticsEscape($row['time'] ?? '').'</b>'.
                    '</li>';
            }

            $eventHtml .= '</ul>';
            $analyticsBodies['calendarEvents'] = $eventHtml;
        }
    }

    /* PMD_DASHBOARD_LAB_ANALYTICS_REFINEMENT_V6 */
    $analyticsSalesWindowRows = is_array(
        $analyticsLast30['sales_over_time']['buckets'] ?? null
    ) ? $analyticsLast30['sales_over_time']['buckets'] : [];

    $analyticsHourWindowRows = is_array(
        $analyticsLast30['sales_by_hour']['hours'] ?? null
    ) ? $analyticsLast30['sales_by_hour']['hours'] : [];

    $analyticsSalesWindowCount = count($analyticsSalesWindowRows);
    $analyticsSalesWindowMin = min(5, max($analyticsSalesWindowCount, 1));
    $analyticsSalesWindowMax = max($analyticsSalesWindowCount, $analyticsSalesWindowMin);
    $analyticsSalesWindowValue = max(
        $analyticsSalesWindowMin,
        min(19, $analyticsSalesWindowMax)
    );

    $analyticsHourWindowCount = count($analyticsHourWindowRows);
    $analyticsHourWindowMin = min(4, max($analyticsHourWindowCount, 1));
    $analyticsHourWindowMax = max($analyticsHourWindowCount, $analyticsHourWindowMin);
    $analyticsHourWindowValue = max(
        $analyticsHourWindowMin,
        min(15, $analyticsHourWindowMax)
    );

    $analyticsBootstrapJson = json_encode(
        $analyticsBootstrap,
        JSON_UNESCAPED_SLASHES
        | JSON_UNESCAPED_UNICODE
        | JSON_HEX_TAG
        | JSON_HEX_AMP
        | JSON_HEX_APOS
        | JSON_HEX_QUOT
    );

    if ($analyticsBootstrapJson === false) {
        $analyticsBootstrapJson = '{}';
    }

    $analyticsBody = static function (string $key) use (
        $analyticsServerReady,
        $analyticsBodies
    ): string {
        if (!$analyticsServerReady) {
            return '';
        }

        return (string)($analyticsBodies[$key] ?? '');
    };

    $analyticsBusy = $analyticsServerReady ? 'false' : 'true';
    $analyticsState = $analyticsServerReady ? 'ready' : 'loading';
@endphp

<script
    type="application/json"
    id="pmd-dashboard-lab-analytics-bootstrap-v2"
>{!! $analyticsBootstrapJson !!}</script>

{{-- PMD_DASHBOARD_LAB_COMPACT_CONTROLS_LIVE_REVIEWS_V8_2 --}}
@php
    /* PMD_DASHBOARD_LAB_LOCALE_PAYMENT_REVIEWS_V8_3 */
    $pmdLabLocaleV82 = strtolower(trim((string)request()->cookie(
        'pmd_admin_locale',
        app()->getLocale()
    )));

    if (!in_array($pmdLabLocaleV82, ['en', 'de'], true)) {
        $pmdLabLocaleV82 = 'en';
    }

    $pmdLabIsGermanV82 = $pmdLabLocaleV82 === 'de';

    $pmdLabShortDayV82 = $pmdLabIsGermanV82 ? 'T' : 'D';
    $pmdLabShortWeekV82 = 'W';
    $pmdLabShortMonthV82 = 'M';
    $pmdLabShortLineV82 = 'L';
    $pmdLabShortBarV82 = 'B';

    $pmdLabLongDayV82 = $pmdLabIsGermanV82 ? 'Tag' : 'Day';
    $pmdLabLongWeekV82 = $pmdLabIsGermanV82 ? 'Woche' : 'Week';
    $pmdLabLongMonthV82 = $pmdLabIsGermanV82 ? 'Monat' : 'Month';
    $pmdLabLongLineV82 = $pmdLabIsGermanV82 ? 'Linie' : 'Line';
    $pmdLabLongBarV82 = $pmdLabIsGermanV82 ? 'Balken' : 'Bar';

    $pmdLabLiveCountV82 = (int)(
        $analyticsLast30['live_operations']['live_order_count'] ?? 0
    );
    $pmdLabLiveSingularV82 = $pmdLabIsGermanV82
        ? 'Live-Bestellung'
        : 'live order';
    $pmdLabLivePluralV82 = $pmdLabIsGermanV82
        ? 'Live-Bestellungen'
        : 'live orders';
@endphp


<section
    id="pmd-dashboard-lab-analytics-v1"
    class="pmd-dashboard-lab-analytics"
    data-pmd-dashboard-lab-analytics="dashboard2-clean-v1"
    data-pmd-dashboard-lab-analytics-endpoint="{{ $pmdDashboardLabAnalyticsEndpoint ?? '/admin/dashboardlab?pmd_analytics=1' }}"
    data-pmd-lab-server-rendered="{{ $analyticsServerReady ? 'true' : 'false' }}"
    data-pmd-lab-initial-chart-mode="{{ $analyticsChartMode }}"
    aria-label="Dashboard analytics"
>
    <div class="pmd-dashboard-lab-analytics__grid" data-pmd-lab-analytics-grid>
        <article class="pmd-dashboard-lab-analytics__card" data-pmd-lab-analytics-widget="salesOverTime" aria-busy="{{ $analyticsBusy }}">
            <header>
                <h3>Sales over time</h3>
                <div class="pmd-dashboard-lab-analytics__toolbar" role="group" aria-label="Sales over time controls">
                    <button type="button" class="{{ $analyticsChartMode === 'line' ? 'is-active' : '' }}" data-pmd-lab-chart-mode="line" aria-pressed="{{ $analyticsChartMode === 'line' ? 'true' : 'false' }}" aria-label="{{ $pmdLabLongLineV82 }}" title="{{ $pmdLabLongLineV82 }}">{{ $pmdLabShortLineV82 }}</button>
                    <button type="button" class="{{ $analyticsChartMode === 'bar' ? 'is-active' : '' }}" data-pmd-lab-chart-mode="bar" aria-pressed="{{ $analyticsChartMode === 'bar' ? 'true' : 'false' }}" aria-label="{{ $pmdLabLongBarV82 }}" title="{{ $pmdLabLongBarV82 }}">{{ $pmdLabShortBarV82 }}</button>
                    <a href="{{ admin_url('pmdreports/sales') }}" aria-label="Open Sales over time details"><span class="pmd-dashboard-lab-toolbar-icon" aria-hidden="true">&#8599;</span></a>
                </div>
            </header>
            <!-- PMD_DASHBOARD_LAB_CUSTOM_VERTICAL_RANGE_V7_3 -->
            <div
                class="pmd-dashboard-lab-analytics__range-rail pmd-dashboard-lab-analytics__range-rail--custom"
                data-pmd-lab-range-control="salesOverTime"
                style="--pmd-range-progress: {{ $analyticsSalesWindowMax > $analyticsSalesWindowMin ? ((($analyticsSalesWindowValue - $analyticsSalesWindowMin) / ($analyticsSalesWindowMax - $analyticsSalesWindowMin)) * 100) : 100 }}%;"
            >
                <span class="pmd-dashboard-lab-analytics__range-label">Range</span>
                <div
                    class="pmd-dashboard-lab-analytics__range-track"
                    data-pmd-lab-range-track
                    role="slider"
                    tabindex="0"
                    aria-label="Visible chart points"
                    aria-valuemin="{{ $analyticsSalesWindowMin }}"
                    aria-valuemax="{{ $analyticsSalesWindowMax }}"
                    aria-valuenow="{{ $analyticsSalesWindowValue }}"
                    aria-orientation="vertical"
                >
                    <span class="pmd-dashboard-lab-analytics__range-fill" aria-hidden="true"></span>
                    <span class="pmd-dashboard-lab-analytics__range-thumb" aria-hidden="true"></span>
                </div>
                <input
                    class="pmd-dashboard-lab-analytics__range-native"
                    type="range"
                    min="{{ $analyticsSalesWindowMin }}"
                    max="{{ $analyticsSalesWindowMax }}"
                    value="{{ $analyticsSalesWindowValue }}"
                    step="1"
                    data-pmd-lab-chart-window="salesOverTime"
                    tabindex="-1"
                    aria-hidden="true"
                >
            </div>
            <div class="pmd-dashboard-lab-analytics__body" data-pmd-lab-widget-body data-pmd-lab-state="{{ $analyticsState }}">{!! $analyticsBody('salesOverTime') !!}</div>
        </article>

        <article class="pmd-dashboard-lab-analytics__card" data-pmd-lab-analytics-widget="categorySales" aria-busy="{{ $analyticsBusy }}">
            <header>
                <h3>Sales by category</h3>
                <div class="pmd-dashboard-lab-analytics__toolbar" role="group" aria-label="Sales by category period">
                    <button type="button" data-pmd-lab-period="today" aria-pressed="false" aria-label="{{ $pmdLabLongDayV82 }}" title="{{ $pmdLabLongDayV82 }}">{{ $pmdLabShortDayV82 }}</button>
                    <button type="button" data-pmd-lab-period="week" aria-pressed="false" aria-label="{{ $pmdLabLongWeekV82 }}" title="{{ $pmdLabLongWeekV82 }}">{{ $pmdLabShortWeekV82 }}</button>
                    <button type="button" class="is-active" data-pmd-lab-period="month" aria-pressed="true" aria-label="{{ $pmdLabLongMonthV82 }}" title="{{ $pmdLabLongMonthV82 }}">{{ $pmdLabShortMonthV82 }}</button>
                    <a href="{{ admin_url('pmdreports/categories') }}" aria-label="Open Sales by category details"><span class="pmd-dashboard-lab-toolbar-icon" aria-hidden="true">&#8599;</span></a>
                </div>
            </header>
            <div class="pmd-dashboard-lab-analytics__body" data-pmd-lab-widget-body data-pmd-lab-state="{{ $analyticsState }}">{!! $analyticsBody('categorySales') !!}</div>
        </article>

        <article class="pmd-dashboard-lab-analytics__card" data-pmd-lab-analytics-widget="salesByHour" aria-busy="{{ $analyticsBusy }}">
            <header>
                <h3>Sales by hour</h3>
                <div class="pmd-dashboard-lab-analytics__toolbar">
                    <a href="{{ admin_url('pmdreports/hourly') }}" aria-label="Open Sales by hour details"><span class="pmd-dashboard-lab-toolbar-icon" aria-hidden="true">&#8599;</span></a>
                </div>
            </header>
            <!-- PMD_DASHBOARD_LAB_CUSTOM_VERTICAL_RANGE_V7_3 -->
            <div
                class="pmd-dashboard-lab-analytics__range-rail pmd-dashboard-lab-analytics__range-rail--custom"
                data-pmd-lab-range-control="salesByHour"
                style="--pmd-range-progress: {{ $analyticsHourWindowMax > $analyticsHourWindowMin ? ((($analyticsHourWindowValue - $analyticsHourWindowMin) / ($analyticsHourWindowMax - $analyticsHourWindowMin)) * 100) : 100 }}%;"
            >
                <span class="pmd-dashboard-lab-analytics__range-label">Range</span>
                <div
                    class="pmd-dashboard-lab-analytics__range-track"
                    data-pmd-lab-range-track
                    role="slider"
                    tabindex="0"
                    aria-label="Visible chart points"
                    aria-valuemin="{{ $analyticsHourWindowMin }}"
                    aria-valuemax="{{ $analyticsHourWindowMax }}"
                    aria-valuenow="{{ $analyticsHourWindowValue }}"
                    aria-orientation="vertical"
                >
                    <span class="pmd-dashboard-lab-analytics__range-fill" aria-hidden="true"></span>
                    <span class="pmd-dashboard-lab-analytics__range-thumb" aria-hidden="true"></span>
                </div>
                <input
                    class="pmd-dashboard-lab-analytics__range-native"
                    type="range"
                    min="{{ $analyticsHourWindowMin }}"
                    max="{{ $analyticsHourWindowMax }}"
                    value="{{ $analyticsHourWindowValue }}"
                    step="1"
                    data-pmd-lab-chart-window="salesByHour"
                    tabindex="-1"
                    aria-hidden="true"
                >
            </div>
            <div class="pmd-dashboard-lab-analytics__body" data-pmd-lab-widget-body data-pmd-lab-state="{{ $analyticsState }}">{!! $analyticsBody('salesByHour') !!}</div>
        </article>

        <article class="pmd-dashboard-lab-analytics__card" data-pmd-lab-analytics-widget="paymentMethods" aria-busy="{{ $analyticsBusy }}">
            <header>
                <h3>Payment methods</h3>
                <div class="pmd-dashboard-lab-analytics__toolbar" role="group" aria-label="Payment methods period">
                    <button type="button" data-pmd-lab-period="today" aria-pressed="false" aria-label="{{ $pmdLabLongDayV82 }}" title="{{ $pmdLabLongDayV82 }}">{{ $pmdLabShortDayV82 }}</button>
                    <button type="button" data-pmd-lab-period="week" aria-pressed="false" aria-label="{{ $pmdLabLongWeekV82 }}" title="{{ $pmdLabLongWeekV82 }}">{{ $pmdLabShortWeekV82 }}</button>
                    <button type="button" class="is-active" data-pmd-lab-period="month" aria-pressed="true" aria-label="{{ $pmdLabLongMonthV82 }}" title="{{ $pmdLabLongMonthV82 }}">{{ $pmdLabShortMonthV82 }}</button>
                    <a href="{{ admin_url('pmdreports/payments') }}" aria-label="Open Payment methods details"><span class="pmd-dashboard-lab-toolbar-icon" aria-hidden="true">&#8599;</span></a>
                </div>
            </header>
            <div class="pmd-dashboard-lab-analytics__body" data-pmd-lab-widget-body data-pmd-lab-state="{{ $analyticsState }}">{!! $analyticsBody('paymentMethods') !!}</div>
        </article>

        <article class="pmd-dashboard-lab-analytics__card" data-pmd-lab-analytics-widget="recentTransactions" aria-busy="{{ $analyticsBusy }}">
            <header>
                <h3>Recent transactions</h3>
                <div class="pmd-dashboard-lab-analytics__toolbar">
                    <a href="{{ admin_url('pmdreports/transactions') }}" aria-label="Open Recent transactions details"><span class="pmd-dashboard-lab-toolbar-icon" aria-hidden="true">&#8599;</span></a>
                </div>
            </header>
            <div class="pmd-dashboard-lab-analytics__body" data-pmd-lab-widget-body data-pmd-lab-state="{{ $analyticsState }}">{!! $analyticsBody('recentTransactions') !!}</div>
        </article>

        <article
            class="pmd-dashboard-lab-analytics__card"
            data-pmd-lab-analytics-widget="alerts"
            aria-busy="{{ $analyticsBusy }}"
            @if(($pmdRoleMode ?? '') === 'manager')
                data-pmd-manager-alerts-stretch-r63=""
               
            @endif
        
            data-pmd-manager-alerts-size-r67="">
            <header>
                <h3>Alerts</h3>
                <div class="pmd-dashboard-lab-analytics__toolbar">
                    <a href="{{ admin_url('pmdreports/alerts') }}" aria-label="Open Alerts details"><span class="pmd-dashboard-lab-toolbar-icon" aria-hidden="true">&#8599;</span></a>
                </div>
            </header>
            <div
                class="pmd-dashboard-lab-analytics__body"
                data-pmd-lab-widget-body
                data-pmd-lab-state="{{ $analyticsState }}"
                @if(($pmdRoleMode ?? '') === 'manager')
                    data-pmd-manager-alerts-body-r63=""
                    style="overflow-x:hidden!important;overflow-y:auto!important;"
                @endif
            >
                {!! $analyticsBody('alerts') !!}

                @if(($pmdRoleMode ?? '') === 'manager')
                    {{-- PMD_MANAGER_ALERTS_EXTRA_ROWS_R64 --}}
                    @php
                        $pmdR64ManagerIsDe =
                            strpos(
                                strtolower(
                                    (string)($pmdLabLocaleV82 ?? 'en')
                                ),
                                'de'
                            ) === 0;

                        $pmdR64LiveOrdersLabel =
                            $pmdR64ManagerIsDe
                                ? 'Live-Bestellungen'
                                : 'Live orders';

                        $pmdR64UpcomingLabel =
                            $pmdR64ManagerIsDe
                                ? 'Bevorstehende Termine'
                                : 'Upcoming events';
                    @endphp

                    <ul
                        class="pmd-dashboard-lab-list pmd-manager-alerts-watch-r64"
                        data-pmd-manager-alerts-watch-r64=""
                    >
                        <li>
                            <span>{{ $pmdR64LiveOrdersLabel }}</span>
                            <strong>{{ (int)($pmdLabLiveCountV82 ?? 0) }}</strong>
                        </li>

                        <li>
                            <span>{{ $pmdR64UpcomingLabel }}</span>
                            <strong>{{ (int)($eventCount ?? 0) }}</strong>
                        </li>
                    </ul>

                    <style id="pmd-manager-alerts-fill-r64">
                        /*
                         * Seven real rows now use the tall Manager card.
                         * No artificial blank filler.
                         */
                        [data-pmd-role-dashboard="manager"]
                        [data-pmd-lab-analytics-widget="alerts"]
                        [data-pmd-manager-alerts-body-r63]
                        > .pmd-dashboard-lab-list {
                            width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }

                        [data-pmd-role-dashboard="manager"]
                        [data-pmd-lab-analytics-widget="alerts"]
                        [data-pmd-manager-alerts-body-r63]
                        > .pmd-dashboard-lab-list
                        > li {
                            box-sizing: border-box !important;
                            min-height: 48px !important;
                            padding: 11px 0 !important;
                        }

                        [data-pmd-role-dashboard="manager"]
                        [data-pmd-lab-analytics-widget="alerts"]
                        .pmd-manager-alerts-watch-r64
                        > li:first-child {
                            border-top: 1px solid #edf1ef !important;
                        }

                        [data-pmd-role-dashboard="manager"]
                        [data-pmd-lab-analytics-widget="alerts"]
                        [data-pmd-manager-alerts-body-r63] {
                            scrollbar-width: thin;
                        }
                    </style>
                @endif
            </div>
        </article>

        <article class="pmd-dashboard-lab-analytics__card" data-pmd-lab-analytics-widget="liveOperations" aria-busy="{{ $analyticsBusy }}">
            <header>
                <h3
                    class="pmd-dashboard-lab-live-heading"
                    data-pmd-lab-live-heading
                    data-singular="{{ $pmdLabLiveSingularV82 }}"
                    data-plural="{{ $pmdLabLivePluralV82 }}"
                >
                    <span class="pmd-dashboard-lab-live-heading__count" data-pmd-lab-live-heading-count>{{ $pmdLabLiveCountV82 }}</span>
                    <span class="pmd-dashboard-lab-live-heading__label" data-pmd-lab-live-heading-label>{{ $pmdLabLiveCountV82 === 1 ? $pmdLabLiveSingularV82 : $pmdLabLivePluralV82 }}</span>
                </h3>
                <div class="pmd-dashboard-lab-analytics__toolbar">
                    <a href="{{ admin_url('pmdreports/liveorders') }}" aria-label="Open Live orders details"><span class="pmd-dashboard-lab-toolbar-icon" aria-hidden="true">&#8599;</span></a>
                </div>
            </header>
            <div class="pmd-dashboard-lab-analytics__body" data-pmd-lab-widget-body data-pmd-lab-state="{{ $analyticsState }}">{!! $analyticsBody('liveOperations') !!}</div>
        </article>

        <article class="pmd-dashboard-lab-analytics__card" data-pmd-lab-analytics-widget="channelSplit" aria-busy="{{ $analyticsBusy }}">
            <header>
                <h3>Order channels</h3>
                <div class="pmd-dashboard-lab-analytics__toolbar" role="group" aria-label="Order channels period">
                    <button type="button" data-pmd-lab-period="today" aria-pressed="false" aria-label="{{ $pmdLabLongDayV82 }}" title="{{ $pmdLabLongDayV82 }}">{{ $pmdLabShortDayV82 }}</button>
                    <button type="button" data-pmd-lab-period="week" aria-pressed="false" aria-label="{{ $pmdLabLongWeekV82 }}" title="{{ $pmdLabLongWeekV82 }}">{{ $pmdLabShortWeekV82 }}</button>
                    <button type="button" class="is-active" data-pmd-lab-period="month" aria-pressed="true" aria-label="{{ $pmdLabLongMonthV82 }}" title="{{ $pmdLabLongMonthV82 }}">{{ $pmdLabShortMonthV82 }}</button>
                    <a href="{{ admin_url('pmdreportchannels') }}" aria-label="Open Order channels details"><span class="pmd-dashboard-lab-toolbar-icon" aria-hidden="true">&#8599;</span></a>
                </div>
            </header>
            <div class="pmd-dashboard-lab-analytics__body" data-pmd-lab-widget-body data-pmd-lab-state="{{ $analyticsState }}">{!! $analyticsBody('channelSplit') !!}</div>
        </article>

        <article class="pmd-dashboard-lab-analytics__card" data-pmd-lab-analytics-widget="topItems" aria-busy="{{ $analyticsBusy }}">
            <header>
                <h3>Top-selling items</h3>
                <div class="pmd-dashboard-lab-analytics__toolbar" role="group" aria-label="Top-selling items period">
                    <button type="button" data-pmd-lab-period="today" aria-pressed="false" aria-label="{{ $pmdLabLongDayV82 }}" title="{{ $pmdLabLongDayV82 }}">{{ $pmdLabShortDayV82 }}</button>
                    <button type="button" data-pmd-lab-period="week" aria-pressed="false" aria-label="{{ $pmdLabLongWeekV82 }}" title="{{ $pmdLabLongWeekV82 }}">{{ $pmdLabShortWeekV82 }}</button>
                    <button type="button" class="is-active" data-pmd-lab-period="month" aria-pressed="true" aria-label="{{ $pmdLabLongMonthV82 }}" title="{{ $pmdLabLongMonthV82 }}">{{ $pmdLabShortMonthV82 }}</button>
                    <a href="{{ admin_url('pmdreports/topitems') }}" aria-label="Open Top-selling items details"><span class="pmd-dashboard-lab-toolbar-icon" aria-hidden="true">&#8599;</span></a>
                </div>
            </header>
            <div class="pmd-dashboard-lab-analytics__body" data-pmd-lab-widget-body data-pmd-lab-state="{{ $analyticsState }}">{!! $analyticsBody('topItems') !!}</div>
        </article>

        <article class="pmd-dashboard-lab-analytics__card" data-pmd-lab-analytics-widget="tips" aria-busy="{{ $analyticsBusy }}">
            <header>
                <h3>Tips summary</h3>
                <div class="pmd-dashboard-lab-analytics__toolbar">
                    <a href="{{ admin_url('pmdreporttips') }}" aria-label="Open Tips summary details"><span class="pmd-dashboard-lab-toolbar-icon" aria-hidden="true">&#8599;</span></a>
                </div>
            </header>
            <div class="pmd-dashboard-lab-analytics__body" data-pmd-lab-widget-body data-pmd-lab-state="{{ $analyticsState }}">{!! $analyticsBody('tips') !!}</div>
        </article>

        <article class="pmd-dashboard-lab-analytics__card" data-pmd-lab-analytics-widget="reviews" aria-busy="{{ $analyticsBusy }}">
            <header>
                <h3 class="pmd-dashboard-lab-review-heading" data-pmd-lab-review-heading>
                    <span class="pmd-dashboard-lab-review-heading__count" data-pmd-lab-review-heading-count>{{ (int)(($analyticsLast30['reviews']['count'] ?? 0)) }}</span>
                    <span class="pmd-dashboard-lab-review-heading__label" data-pmd-lab-review-heading-label>{{ ((int)(($analyticsLast30['reviews']['count'] ?? 0)) === 1) ? 'review today' : 'reviews today' }}</span>
                </h3>
                <div class="pmd-dashboard-lab-analytics__toolbar">
                    <a href="{{ admin_url('pmdreports/reviews') }}" aria-label="Open reviews details"><span class="pmd-dashboard-lab-toolbar-icon" aria-hidden="true">&#8599;</span></a>
                </div>
            </header>
            <div class="pmd-dashboard-lab-analytics__body" data-pmd-lab-widget-body data-pmd-lab-state="{{ $analyticsState }}">{!! $analyticsBody('reviews') !!}</div>
        </article>

        <article class="pmd-dashboard-lab-analytics__card" data-pmd-lab-analytics-widget="calendarEvents" aria-busy="{{ $analyticsBusy }}">
            <header>
                <h3 class="pmd-dashboard-lab-event-heading" data-pmd-lab-event-heading>
                    <span class="pmd-dashboard-lab-event-heading__count" data-pmd-lab-event-heading-count>{{ (int)($eventCount ?? 0) }}</span>
                    <span class="pmd-dashboard-lab-event-heading__label" data-pmd-lab-event-heading-label>Upcoming events</span>
                </h3>
                <div class="pmd-dashboard-lab-analytics__toolbar">
                    <a href="{{ admin_url('pmdreports/reservations') }}" aria-label="Open Upcoming events details"><span class="pmd-dashboard-lab-toolbar-icon" aria-hidden="true">&#8599;</span></a>
                </div>
            </header>
            <div class="pmd-dashboard-lab-analytics__body" data-pmd-lab-widget-body data-pmd-lab-state="{{ $analyticsState }}">{!! $analyticsBody('calendarEvents') !!}</div>
        </article>
    </div>
</section>



{{-- PMD_MANAGER_ALERTS_MATCH_SALES_R67_START --}}
@if(request()->is('admin/managerlab'))
<style id="pmd-manager-alerts-match-sales-r67">

@media (min-width: 1281px) {
    #pmd-dashboard-lab
    [data-pmd-lab-analytics-widget="salesByHour"],

    #pmd-dashboard-lab
    [data-pmd-lab-analytics-widget="alerts"] {
        height: 430px !important;
        min-height: 430px !important;
        max-height: 430px !important;
        align-self: start !important;
    }
}

@media (min-width: 761px) and (max-width: 1280px) {
    #pmd-dashboard-lab
    [data-pmd-lab-analytics-widget="salesByHour"],

    #pmd-dashboard-lab
    [data-pmd-lab-analytics-widget="alerts"] {
        height: 390px !important;
        min-height: 390px !important;
        max-height: 390px !important;
        align-self: start !important;
    }
}

#pmd-dashboard-lab
[data-pmd-lab-analytics-widget="alerts"]
.pmd-dashboard-lab-analytics__body {
    min-height: 0 !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    scrollbar-width: thin;
}

</style>
@endif
{{-- PMD_MANAGER_ALERTS_MATCH_SALES_R67_END --}}

