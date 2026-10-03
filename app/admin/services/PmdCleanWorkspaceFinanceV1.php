<?php

namespace Admin\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Financial KPI authority shared by the clean Cashier and Accountant pages.
 * PMD_ROLE_FINANCE_REAL_AUTHORITIES_V3_4
 * PMD_ROLE_FINANCE_OWNER_KPI_COMPACT_VALUES_V3_4_1
 * PMD_ACCOUNTANT_ROLE_SPECIFIC_INSIGHTS_V3_5
 *
 * It reads only current-location transactional tables that were confirmed by
 * the live V2 audit. Missing accounting concepts remain explicitly
 * disconnected instead of being fabricated from unrelated data.
 */
class PmdCleanWorkspaceFinanceV1
{
    public const CASHIER_KPI_ORDER = [
        'open_bills',
        'average_settlement_time',
        'shift_payments',
        'failed_transactions',
        'tips_today_month',
        'cash_percent',
        'top_payment_method',
    ];

    public const ACCOUNTANT_KPI_ORDER = [
        'vat_month',
        'gross_to_net',
        'total_loss',
        'cash_percent',
        'tips_today_month',
        'tips_to_share',
        'average_checks',
        'top_payment_method',
    ];

    public function cashierCards(?int $locationId, string $locale): array
    {
        $snapshot = $this->snapshot($locationId);
        $cards = [];

        $cards['open_bills'] = $this->card(
            'open_bills',
            $this->text('Open bills / unpaid tables', 'Offene Rechnungen / unbezahlte Tische', $locale),
            'pending',
            'orange',
            $snapshot['open']['available']
                ? number_format((int)$snapshot['open']['count']).' · '.$this->money((float)$snapshot['open']['value'], $locale)
                : '—',
            $snapshot['open']['available']
                ? $this->text('Open unpaid checks and remaining value', 'Offene unbezahlte Rechnungen und Restbetrag', $locale)
                : $this->connectionRequired($locale, 'orders settlement fields'),
            $snapshot['open']['available'],
            'current',
            (string)$snapshot['open']['source']
        );

        $cards['average_settlement_time'] = $this->card(
            'average_settlement_time',
            $this->text('Average bill settlement time', 'Ø Zeit bis zur Rechnungsbegleichung', $locale),
            'timer',
            'blue',
            $snapshot['settlement_time']['available']
                ? $this->minutes((float)$snapshot['settlement_time']['minutes'])
                : '—',
            $snapshot['settlement_time']['available']
                ? $this->text('Average from bill creation to settlement today', 'Durchschnitt von Rechnungserstellung bis Zahlung heute', $locale)
                : $this->connectionRequired($locale, 'created_at + settled_at'),
            $snapshot['settlement_time']['available'],
            'today',
            (string)$snapshot['settlement_time']['source']
        );

        /*
         * PMD_ROLE_FINANCE_SHIFT_AUTHORITY_V3_4
         * Tips_shifts_model defines a PMD shift by shift_date + location_id and
         * computes shift tips from orders.order_date. Use that same existing
         * business-shift date authority for Cashier payments instead of inventing
         * a second start/end clock that does not exist in this installation.
         */
        $cards['shift_payments'] = $this->card(
            'shift_payments',
            $this->text('Total payments for this shift', 'Zahlungen dieser Schicht', $locale),
            'money',
            'green',
            $snapshot['shift_payments']['available']
                ? $this->money((float)$snapshot['shift_payments']['total'], $locale)
                : '—',
            $snapshot['shift_payments']['available']
                ? number_format((int)$snapshot['shift_payments']['transactions']).' '.$this->text('payments in the current shift', 'Zahlungen in der aktuellen Schicht', $locale)
                : $this->connectionRequired($locale, 'shift payment source'),
            $snapshot['shift_payments']['available'],
            'shift',
            (string)$snapshot['shift_payments']['source']
        );

        $cards['failed_transactions'] = $this->card(
            'failed_transactions',
            $this->text('Failed / declined transactions', 'Fehlgeschlagene / abgelehnte Zahlungen', $locale),
            'cancel',
            'red',
            $snapshot['failed']['available']
                ? $this->percent((float)$snapshot['failed']['rate'])
                : '—',
            $snapshot['failed']['available']
                ? ((int)$snapshot['failed']['failed']).' / '.((int)$snapshot['failed']['attempts']).' '.$this->text('attempts today', 'Zahlungsversuche heute', $locale)
                : $this->connectionRequired($locale, 'payment logs'),
            $snapshot['failed']['available'],
            'today',
            (string)$snapshot['failed']['source']
        );

        $cards['tips_today_month'] = $this->card(
            'tips_today_month',
            $this->text('Total tips today / this month', 'Trinkgeld heute / diesen Monat', $locale),
            'star',
            'green',
            $snapshot['tips']['available']
                ? $this->money((float)$snapshot['tips']['today'], $locale)
                : '—',
            $snapshot['tips']['available']
                ? $this->text('This month', 'Diesen Monat', $locale).': '.$this->money((float)$snapshot['tips']['month'], $locale)
                : $this->connectionRequired($locale, 'tip totals'),
            $snapshot['tips']['available'],
            'today_month',
            (string)$snapshot['tips']['source']
        );

        $cards['cash_percent'] = $this->card(
            'cash_percent',
            $this->text('Cash percent / Total payments', 'Baranteil / Gesamtzahlungen', $locale),
            'money',
            'blue',
            $snapshot['payments_today']['available']
                ? $this->percent((float)$snapshot['payments_today']['cash_percent'])
                : '—',
            $snapshot['payments_today']['available']
                ? $this->text('Total payments today', 'Gesamtzahlungen heute', $locale).': '.$this->money((float)$snapshot['payments_today']['total'], $locale)
                : $this->connectionRequired($locale, 'settled payments'),
            $snapshot['payments_today']['available'],
            'today',
            (string)$snapshot['payments_today']['source']
        );

        $cards['top_payment_method'] = $this->card(
            'top_payment_method',
            $this->text('Most used payment method today / this month', 'Häufigste Zahlungsart heute / diesen Monat', $locale),
            'list',
            'purple',
            $snapshot['payments_today']['available'] || $snapshot['payments_month']['available']
                ? $this->methodLabel($snapshot['payments_today']['top_method'], $locale)
                : '—',
            $snapshot['payments_today']['available'] || $snapshot['payments_month']['available']
                ? $this->text('This month', 'Diesen Monat', $locale).': '.$this->methodLabel($snapshot['payments_month']['top_method'], $locale)
                : $this->connectionRequired($locale, 'payment methods'),
            $snapshot['payments_today']['available'] || $snapshot['payments_month']['available'],
            'today_month',
            (string)$snapshot['payments_today']['source']
        );

        return $this->ordered($cards, self::CASHIER_KPI_ORDER);
    }

    public function accountantCards(?int $locationId, string $locale): array
    {
        $snapshot = $this->snapshot($locationId);
        $cards = [];

        /* PMD_ROLE_FINANCE_VAT_ORDER_TOTALS_V3_4
         * Table-order persistence writes authoritative order_totals.code=tax rows.
         * A month with no tax rows is a real 0.00 value, not a disconnected KPI.
         */
        $cards['vat_month'] = $this->card(
            'vat_month',
            $this->text('Total VAT collected / this month', 'Erfasste MwSt. / diesen Monat', $locale),
            'money',
            'blue',
            $snapshot['vat']['available']
                ? $this->money((float)$snapshot['vat']['month'], $locale)
                : '—',
            $snapshot['vat']['available']
                ? $this->text('Tax rows on settled orders in the current month', 'Steuerzeilen abgerechneter Bestellungen im aktuellen Monat', $locale)
                : $this->connectionRequired($locale, 'order_totals tax rows'),
            $snapshot['vat']['available'],
            'month',
            (string)$snapshot['vat']['source']
        );

        $cards['gross_to_net'] = $this->card(
            'gross_to_net',
            $this->text('Gross to net', 'Brutto zu Netto', $locale),
            'money',
            'green',
            $snapshot['accounting']['available']
                ? $this->money((float)$snapshot['accounting']['net'], $locale)
                : '—',
            $snapshot['accounting']['available']
                ? $this->text('Gross', 'Brutto', $locale).' '.$this->money((float)$snapshot['accounting']['gross'], $locale)
                    .' · '.$this->text('Discounts', 'Rabatte', $locale).' '.$this->money((float)$snapshot['accounting']['discounts'], $locale)
                    .' · '.$this->text('Voids + refunds', 'Stornos + Rückerstattungen', $locale).' '.$this->money((float)$snapshot['accounting']['loss'], $locale)
                : $this->connectionRequired($locale, 'orders + payment transactions'),
            $snapshot['accounting']['available'],
            'month',
            (string)$snapshot['accounting']['source']
        );

        $cards['total_loss'] = $this->card(
            'total_loss',
            $this->text('Total loss (voids + refunds)', 'Gesamtverlust (Stornos + Rückerstattungen)', $locale),
            'cancel',
            'red',
            $snapshot['accounting']['available']
                ? $this->money((float)$snapshot['accounting']['loss'], $locale)
                : '—',
            $this->text('Current month', 'Aktueller Monat', $locale),
            $snapshot['accounting']['available'],
            'month',
            (string)$snapshot['accounting']['source']
        );

        $cards['cash_percent'] = $this->card(
            'cash_percent',
            $this->text('Cash percent / Total payments', 'Baranteil / Gesamtzahlungen', $locale),
            'money',
            'blue',
            $snapshot['payments_month']['available']
                ? $this->percent((float)$snapshot['payments_month']['cash_percent'])
                : '—',
            $snapshot['payments_month']['available']
                ? $this->text('Total payments this month', 'Gesamtzahlungen diesen Monat', $locale).': '.$this->money((float)$snapshot['payments_month']['total'], $locale)
                : $this->connectionRequired($locale, 'settled payments'),
            $snapshot['payments_month']['available'],
            'month',
            (string)$snapshot['payments_month']['source']
        );

        $cards['tips_today_month'] = $this->card(
            'tips_today_month',
            $this->text('Total tips today / this month', 'Trinkgeld heute / diesen Monat', $locale),
            'star',
            'green',
            $snapshot['tips']['available']
                ? $this->money((float)$snapshot['tips']['today'], $locale)
                : '—',
            $snapshot['tips']['available']
                ? $this->text('This month', 'Diesen Monat', $locale).': '.$this->money((float)$snapshot['tips']['month'], $locale)
                : $this->connectionRequired($locale, 'tip totals'),
            $snapshot['tips']['available'],
            'today_month',
            (string)$snapshot['tips']['source']
        );

        $cards['tips_to_share'] = $this->card(
            'tips_to_share',
            $this->text('Total tips to share', 'Zu verteilendes Trinkgeld', $locale),
            'star',
            'orange',
            $snapshot['tips_to_share']['available']
                ? $this->money((float)$snapshot['tips_to_share']['value'], $locale)
                : '—',
            $snapshot['tips_to_share']['available']
                ? $this->text('Current PMD tip-shift pool', 'Aktueller PMD-Trinkgeld-Schichtpool', $locale)
                : $this->connectionRequired($locale, 'tip shift pool'),
            $snapshot['tips_to_share']['available'],
            'shift',
            (string)$snapshot['tips_to_share']['source']
        );

        $cards['average_checks'] = $this->card(
            'average_checks',
            $this->text('Average checks today / this month', 'Ø Rechnungsbetrag heute / diesen Monat', $locale),
            'money',
            'purple',
            $snapshot['checks']['available']
                ? $this->money((float)$snapshot['checks']['today'], $locale)
                : '—',
            $snapshot['checks']['available']
                ? $this->text('This month', 'Diesen Monat', $locale).': '.$this->money((float)$snapshot['checks']['month'], $locale)
                : $this->connectionRequired($locale, 'settled sales and orders'),
            $snapshot['checks']['available'],
            'today_month',
            (string)$snapshot['checks']['source']
        );

        $cards['top_payment_method'] = $this->card(
            'top_payment_method',
            $this->text('Most used payment method today / this month', 'Häufigste Zahlungsart heute / diesen Monat', $locale),
            'list',
            'purple',
            $snapshot['payments_today']['available'] || $snapshot['payments_month']['available']
                ? $this->methodLabel($snapshot['payments_today']['top_method'], $locale)
                : '—',
            $snapshot['payments_today']['available'] || $snapshot['payments_month']['available']
                ? $this->text('This month', 'Diesen Monat', $locale).': '.$this->methodLabel($snapshot['payments_month']['top_method'], $locale)
                : $this->connectionRequired($locale, 'payment methods'),
            $snapshot['payments_today']['available'] || $snapshot['payments_month']['available'],
            'today_month',
            (string)$snapshot['payments_month']['source']
        );

        return $this->ordered($cards, self::ACCOUNTANT_KPI_ORDER);
    }


    /**
     * Server-first accountant-only insight cards. These are intentionally
     * derived from the same audited snapshot used by the colored KPI cards,
     * so the two parts of the Accountant page cannot disagree.
     */
    public function accountantInsightCards(?int $locationId, string $locale): array
    {
        $snapshot = $this->snapshot($locationId);
        $accounting = is_array($snapshot['accounting'] ?? null) ? $snapshot['accounting'] : [];
        $paymentsToday = is_array($snapshot['payments_today'] ?? null) ? $snapshot['payments_today'] : [];
        $paymentsMonth = is_array($snapshot['payments_month'] ?? null) ? $snapshot['payments_month'] : [];
        $tips = is_array($snapshot['tips'] ?? null) ? $snapshot['tips'] : [];
        $tipsToShare = is_array($snapshot['tips_to_share'] ?? null) ? $snapshot['tips_to_share'] : [];
        $checks = is_array($snapshot['checks'] ?? null) ? $snapshot['checks'] : [];
        $vat = is_array($snapshot['vat'] ?? null) ? $snapshot['vat'] : [];

        $accountingOk = ($accounting['available'] ?? false) === true;
        $todayOk = ($paymentsToday['available'] ?? false) === true;
        $monthOk = ($paymentsMonth['available'] ?? false) === true;
        $tipsOk = ($tips['available'] ?? false) === true;
        $shareOk = ($tipsToShare['available'] ?? false) === true;
        $checksOk = ($checks['available'] ?? false) === true;
        $vatOk = ($vat['available'] ?? false) === true;
        $url = static function (string $path): string {
            return function_exists('admin_url')
                ? admin_url($path)
                : '/admin/'.ltrim($path, '/');
        };

        return [
            'revenue_bridge' => [
                'title' => $this->text('Revenue bridge / this month', 'Umsatzbrücke / diesen Monat', $locale),
                'url' => $url('pmdreports/sales'),
                'source' => (string)($accounting['source'] ?? 'Audited accounting authority'),
                'connected' => $accountingOk,
                'layout' => 'stats',
                'rows' => [
                    ['label' => $this->text('Gross', 'Brutto', $locale), 'value' => $accountingOk ? $this->money((float)($accounting['gross'] ?? 0), $locale) : '—'],
                    ['label' => $this->text('Discounts', 'Rabatte', $locale), 'value' => $accountingOk ? $this->money((float)($accounting['discounts'] ?? 0), $locale) : '—'],
                    ['label' => $this->text('Voids + refunds', 'Stornos + Rückerstattungen', $locale), 'value' => $accountingOk ? $this->money((float)($accounting['loss'] ?? 0), $locale) : '—'],
                    ['label' => $this->text('Net', 'Netto', $locale), 'value' => $accountingOk ? $this->money((float)($accounting['net'] ?? 0), $locale) : '—'],
                ],
            ],
            'settlement_totals' => [
                'title' => $this->text('Settlement totals', 'Abrechnungsübersicht', $locale),
                'url' => $url('pmdreports/payments'),
                'source' => trim((string)($paymentsMonth['source'] ?? '').' | '.(string)($paymentsToday['source'] ?? ''), ' |'),
                'connected' => $monthOk || $todayOk,
                'layout' => 'stats',
                'rows' => [
                    ['label' => $this->text('Payments today', 'Zahlungen heute', $locale), 'value' => $todayOk ? $this->money((float)($paymentsToday['total'] ?? 0), $locale) : '—'],
                    ['label' => $this->text('Transactions today', 'Transaktionen heute', $locale), 'value' => $todayOk ? number_format((int)($paymentsToday['transactions'] ?? 0)) : '—'],
                    ['label' => $this->text('Payments this month', 'Zahlungen diesen Monat', $locale), 'value' => $monthOk ? $this->money((float)($paymentsMonth['total'] ?? 0), $locale) : '—'],
                    ['label' => $this->text('Transactions this month', 'Transaktionen diesen Monat', $locale), 'value' => $monthOk ? number_format((int)($paymentsMonth['transactions'] ?? 0)) : '—'],
                ],
            ],
            'payment_mix' => [
                'title' => $this->text('Payment mix', 'Zahlungsmix', $locale),
                'url' => $url('pmdreports/payments'),
                'source' => trim((string)($paymentsMonth['source'] ?? '').' | '.(string)($paymentsToday['source'] ?? ''), ' |'),
                'connected' => $monthOk || $todayOk,
                'layout' => 'stats',
                'rows' => [
                    ['label' => $this->text('Cash today', 'Baranteil heute', $locale), 'value' => $todayOk ? $this->percent((float)($paymentsToday['cash_percent'] ?? 0)) : '—'],
                    ['label' => $this->text('Top method today', 'Top-Zahlungsart heute', $locale), 'value' => $todayOk ? $this->methodLabel($paymentsToday['top_method'] ?? null, $locale) : '—'],
                    ['label' => $this->text('Cash this month', 'Baranteil diesen Monat', $locale), 'value' => $monthOk ? $this->percent((float)($paymentsMonth['cash_percent'] ?? 0)) : '—'],
                    ['label' => $this->text('Top method this month', 'Top-Zahlungsart diesen Monat', $locale), 'value' => $monthOk ? $this->methodLabel($paymentsMonth['top_method'] ?? null, $locale) : '—'],
                ],
            ],
            'tips_ledger' => [
                'title' => $this->text('Tips ledger', 'Trinkgeldübersicht', $locale),
                'url' => $url('pmdreporttips'),
                'source' => trim((string)($tips['source'] ?? '').' | '.(string)($tipsToShare['source'] ?? ''), ' |'),
                'connected' => $tipsOk || $shareOk,
                'layout' => 'stats',
                'rows' => [
                    ['label' => $this->text('Tips today', 'Trinkgeld heute', $locale), 'value' => $tipsOk ? $this->money((float)($tips['today'] ?? 0), $locale) : '—'],
                    ['label' => $this->text('Tips this month', 'Trinkgeld diesen Monat', $locale), 'value' => $tipsOk ? $this->money((float)($tips['month'] ?? 0), $locale) : '—'],
                    ['label' => $this->text('Tips to share', 'Zu verteilendes Trinkgeld', $locale), 'value' => $shareOk ? $this->money((float)($tipsToShare['value'] ?? 0), $locale) : '—'],
                    ['label' => $this->text('Pool status', 'Pool-Status', $locale), 'value' => $shareOk ? $this->text('Connected', 'Verbunden', $locale) : $this->text('Unavailable', 'Nicht verfügbar', $locale)],
                ],
            ],
            'check_performance' => [
                'title' => $this->text('Average checks', 'Ø Rechnungsbeträge', $locale),
                'url' => $url('pmdreports/sales'),
                'source' => (string)($checks['source'] ?? 'Settled order check authority'),
                'connected' => $checksOk,
                'layout' => 'stats',
                'rows' => [
                    ['label' => $this->text('Average today', 'Durchschnitt heute', $locale), 'value' => $checksOk ? $this->money((float)($checks['today'] ?? 0), $locale) : '—'],
                    ['label' => $this->text('Average this month', 'Durchschnitt diesen Monat', $locale), 'value' => $checksOk ? $this->money((float)($checks['month'] ?? 0), $locale) : '—'],
                    ['label' => $this->text('VAT this month', 'MwSt. diesen Monat', $locale), 'value' => $vatOk ? $this->money((float)($vat['month'] ?? 0), $locale) : '—'],
                    ['label' => $this->text('Loss this month', 'Verlust diesen Monat', $locale), 'value' => $accountingOk ? $this->money((float)($accounting['loss'] ?? 0), $locale) : '—'],
                ],
            ],
            'tax_loss_control' => [
                'title' => $this->text('Tax & loss control', 'Steuer- & Verlustkontrolle', $locale),
                'url' => $url('pmdreports/transactions'),
                'source' => trim((string)($vat['source'] ?? '').' | '.(string)($accounting['source'] ?? ''), ' |'),
                'connected' => $vatOk || $accountingOk,
                'layout' => 'stats',
                'rows' => [
                    ['label' => $this->text('VAT collected', 'Erfasste MwSt.', $locale), 'value' => $vatOk ? $this->money((float)($vat['month'] ?? 0), $locale) : '—'],
                    ['label' => $this->text('Discounts', 'Rabatte', $locale), 'value' => $accountingOk ? $this->money((float)($accounting['discounts'] ?? 0), $locale) : '—'],
                    ['label' => $this->text('Voids + refunds', 'Stornos + Rückerstattungen', $locale), 'value' => $accountingOk ? $this->money((float)($accounting['loss'] ?? 0), $locale) : '—'],
                    ['label' => $this->text('Net after loss', 'Netto nach Verlust', $locale), 'value' => $accountingOk ? $this->money((float)($accounting['net'] ?? 0), $locale) : '—'],
                ],
            ],
        ];
    }

    private function snapshot(?int $locationId): array
    {
        $unavailable = [
            'available' => false,
            'source' => 'Current location or audited finance source unavailable',
        ];

        if (!$locationId || !Schema::hasTable('orders')) {
            return [
                'open' => $unavailable,
                'settlement_time' => $unavailable,
                'failed' => $unavailable,
                'tips' => $unavailable,
                'payments_today' => $unavailable,
                'payments_month' => $unavailable,
                'shift_payments' => $unavailable,
                'vat' => $unavailable,
                'tips_to_share' => $unavailable,
                'accounting' => $unavailable,
                'checks' => $unavailable,
            ];
        }

        $now = Carbon::now('Europe/Berlin');
        $todayStart = $now->copy()->startOfDay();
        $monthStart = $now->copy()->startOfMonth();

        return [
            'open' => $this->openBills($locationId),
            'settlement_time' => $this->settlementTime($locationId, $todayStart, $now),
            'failed' => $this->failedAttempts($locationId, $todayStart, $now),
            'tips' => $this->tipSummary($locationId, $todayStart, $monthStart, $now),
            'payments_today' => $this->paymentSummary($locationId, $todayStart, $now),
            'payments_month' => $this->paymentSummary($locationId, $monthStart, $now),
            'shift_payments' => $this->shiftPayments($locationId, $todayStart, $now),
            'vat' => $this->vatSummary($locationId, $monthStart, $now),
            'tips_to_share' => $this->tipsToShare($locationId, $todayStart, $now),
            'accounting' => $this->accountingSummary($locationId, $monthStart, $now),
            'checks' => $this->averageChecks($locationId, $todayStart, $monthStart, $now),
        ];
    }

    private function openBills(int $locationId): array
    {
        if (!$this->hasColumns('orders', ['order_id', 'location_id', 'order_total', 'settled_amount', 'settlement_status'])) {
            return ['available' => false, 'source' => 'orders settlement fields unavailable'];
        }

        $terminal = ['paid', 'settled', 'closed', 'cancelled', 'canceled', 'failed', 'refunded', 'refund', 'void', 'voided'];
        $rows = DB::table('orders')
            ->where('location_id', $locationId)
            ->whereNotIn(DB::raw('LOWER(settlement_status)'), $terminal)
            ->whereRaw('GREATEST(COALESCE(order_total,0) - COALESCE(settled_amount,0),0) > 0.0001')
            ->get(['order_id', 'order_type', 'order_total', 'settled_amount']);

        $tableRefs = [];
        foreach ($rows as $row) {
            $ref = strtolower(trim((string)($row->order_type ?? '')));
            if ($ref !== '' && !preg_match('/cashier|delivery|takeaway|pickup|counter|pos/', $ref)) {
                $tableRefs[$ref] = true;
            }
        }

        $count = count($tableRefs) ?: $rows->count();
        $value = $rows->sum(function ($row) {
            return max(0, (float)$row->order_total - (float)$row->settled_amount);
        });

        return [
            'available' => true,
            'count' => $count,
            'value' => round((float)$value, 2),
            'source' => 'orders settlement_status/order_total/settled_amount with non-system order_type table references',
        ];
    }

    private function settlementTime(int $locationId, Carbon $start, Carbon $end): array
    {
        if (!$this->hasColumns('orders', ['location_id', 'created_at', 'settled_at', 'settlement_status'])) {
            return ['available' => false, 'source' => 'orders settlement timestamps unavailable'];
        }

        $query = $this->settledOrders($locationId, $start, $end);
        $row = $query
            ->whereNotNull('created_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(SECOND, created_at, settled_at)) AS avg_seconds, COUNT(*) AS samples')
            ->first();

        return [
            'available' => true,
            'minutes' => max(0, ((float)($row->avg_seconds ?? 0)) / 60),
            'samples' => (int)($row->samples ?? 0),
            'source' => 'settled current-location orders: created_at -> settled_at',
        ];
    }

    private function failedAttempts(int $locationId, Carbon $start, Carbon $end): array
    {
        /* PMD_ROLE_FINANCE_FAILED_PAYMENT_LOGS_V3_4
         * Payment_logs_model::logAttempt writes one payment attempt with the
         * authoritative is_success boolean. payment_attempts does not exist on
         * this installation, so payment_logs is the canonical fallback.
         */
        if (Schema::hasTable('payment_logs') && $this->hasColumns('payment_logs', ['payment_log_id', 'order_id', 'is_success', 'created_at'])) {
            $query = DB::table('payment_logs as pl')
                ->join('orders as o', 'o.order_id', '=', 'pl.order_id')
                ->where('o.location_id', $locationId)
                ->whereBetween('pl.created_at', [$start->toDateTimeString(), $end->toDateTimeString()]);

            $attempts = (clone $query)->count('pl.payment_log_id');
            $failed = (clone $query)->where('pl.is_success', 0)->count('pl.payment_log_id');

            return [
                'available' => true,
                'attempts' => $attempts,
                'failed' => $failed,
                'rate' => $attempts > 0 ? ($failed / $attempts) * 100 : 0,
                'source' => 'payment_logs.is_success payment attempts joined to current-location orders',
            ];
        }

        if (Schema::hasTable('payment_attempts') && $this->hasColumns('payment_attempts', ['order_id', 'status', 'created_at'])) {
            $query = DB::table('payment_attempts as pa')
                ->join('orders as o', 'o.order_id', '=', 'pa.order_id')
                ->where('o.location_id', $locationId)
                ->whereBetween('pa.created_at', [$start->toDateTimeString(), $end->toDateTimeString()]);

            $attempts = (clone $query)->count();
            $failed = (clone $query)
                ->whereIn(DB::raw('LOWER('.$this->rawAliasColumn('pa', 'status').')'), ['failed', 'declined', 'error', 'rejected', 'cancelled', 'canceled'])
                ->count();

            return [
                'available' => true,
                'attempts' => $attempts,
                'failed' => $failed,
                'rate' => $attempts > 0 ? ($failed / $attempts) * 100 : 0,
                'source' => 'payment_attempts joined to current-location orders',
            ];
        }

        return ['available' => false, 'source' => 'payment attempt log unavailable'];
    }

    private function tipSummary(int $locationId, Carbon $todayStart, Carbon $monthStart, Carbon $end): array
    {
        if (!Schema::hasTable('order_totals') || !$this->hasColumns('order_totals', ['order_id', 'code', 'value'])) {
            return ['available' => false, 'source' => 'order_totals tip source unavailable'];
        }

        $sum = function (Carbon $start) use ($locationId, $end): float {
            return (float)DB::table('order_totals as ot')
                ->join('orders as o', 'o.order_id', '=', 'ot.order_id')
                ->where('o.location_id', $locationId)
                ->whereIn(DB::raw('LOWER('.$this->rawAliasColumn('o', 'settlement_status').')'), ['paid', 'settled'])
                ->whereNotNull('o.settled_at')
                ->whereBetween('o.settled_at', [$start->toDateTimeString(), $end->toDateTimeString()])
                ->whereRaw("LOWER(TRIM(".$this->rawAliasColumn('ot', 'code').")) = 'tip'")
                ->sum('ot.value');
        };

        return [
            'available' => true,
            'today' => round($sum($todayStart), 2),
            'month' => round($sum($monthStart), 2),
            'source' => 'order_totals.code=tip for settled current-location orders',
        ];
    }

    private function shiftPayments(int $locationId, Carbon $start, Carbon $end): array
    {
        $summary = $this->paymentSummary($locationId, $start, $end);
        if (!($summary['available'] ?? false)) {
            return $summary + ['transactions' => 0, 'total' => 0.0];
        }

        $shiftDate = $start->copy()->timezone('Europe/Berlin')->toDateString();
        return array_merge($summary, [
            'shift_date' => $shiftDate,
            'source' => 'PMD shift_date '.$shiftDate.' + '.$summary['source'],
        ]);
    }

    private function vatSummary(int $locationId, Carbon $start, Carbon $end): array
    {
        if (!Schema::hasTable('order_totals') || !$this->hasColumns('order_totals', ['order_id', 'code', 'value'])) {
            return ['available' => false, 'month' => 0.0, 'source' => 'order_totals tax source unavailable'];
        }

        $value = (float)DB::table('order_totals as ot')
            ->join('orders as o', 'o.order_id', '=', 'ot.order_id')
            ->where('o.location_id', $locationId)
            ->whereIn(DB::raw('LOWER('.$this->rawAliasColumn('o', 'settlement_status').')'), ['paid', 'settled'])
            ->whereNotNull('o.settled_at')
            ->whereBetween('o.settled_at', [$start->toDateTimeString(), $end->toDateTimeString()])
            ->whereRaw("LOWER(TRIM(".$this->rawAliasColumn('ot', 'code').")) IN ('tax','vat')")
            ->sum('ot.value');

        return [
            'available' => true,
            'month' => round(max(0, $value), 2),
            'source' => 'order_totals.code=tax/vat on settled current-location orders',
        ];
    }

    private function tipsToShare(int $locationId, Carbon $start, Carbon $end): array
    {
        if (!Schema::hasTable('order_totals') || !$this->hasColumns('order_totals', ['order_id', 'code', 'value'])) {
            return ['available' => false, 'value' => 0.0, 'source' => 'tip shift source unavailable'];
        }

        // Tips_shifts_model defines a shift by shift_date + location_id and its
        // total_tips accessor sums order_totals.code=tip for orders.order_date.
        $shiftDate = $start->copy()->timezone('Europe/Berlin')->toDateString();
        $value = (float)DB::table('order_totals as ot')
            ->join('orders as o', 'o.order_id', '=', 'ot.order_id')
            ->where('o.location_id', $locationId)
            ->whereDate('o.order_date', $shiftDate)
            ->whereRaw("LOWER(TRIM(".$this->rawAliasColumn('ot', 'code').")) = 'tip'")
            ->sum('ot.value');

        return [
            'available' => true,
            'value' => round(max(0, $value), 2),
            'shift_date' => $shiftDate,
            'source' => 'Tips_shifts_model shift_date/location semantics + order_totals.code=tip',
        ];
    }

    private function paymentSummary(int $locationId, Carbon $start, Carbon $end): array
    {
        // Prefer split-payment transaction rows when real paid_at rows exist.
        if (Schema::hasTable('order_payment_transactions') && $this->hasColumns('order_payment_transactions', ['order_id', 'payment_method', 'amount', 'paid_at'])) {
            $rows = DB::table('order_payment_transactions as pt')
                ->join('orders as o', 'o.order_id', '=', 'pt.order_id')
                ->where('o.location_id', $locationId)
                ->whereNotNull('pt.paid_at')
                ->whereBetween('pt.paid_at', [$start->toDateTimeString(), $end->toDateTimeString()])
                ->where('pt.amount', '>', 0)
                ->get(['pt.payment_method', 'pt.amount']);

            if ($rows->count() > 0) {
                return $this->paymentRowsSummary($rows->map(function ($row) {
                    return ['method' => (string)$row->payment_method, 'amount' => (float)$row->amount];
                })->all(), 'order_payment_transactions.paid_at/payment_method/amount');
            }
        }

        if (!$this->hasColumns('orders', ['location_id', 'settled_at', 'settled_amount', 'settlement_status', 'settlement_method', 'payment'])) {
            return ['available' => false, 'source' => 'settled payment method source unavailable'];
        }

        $rows = $this->settledOrders($locationId, $start, $end)
            ->get(['settlement_method', 'payment', 'settled_amount']);

        return $this->paymentRowsSummary($rows->map(function ($row) {
            $method = trim((string)($row->settlement_method ?? ''));
            if ($method === '') {
                $method = (string)($row->payment ?? '');
            }
            return ['method' => $method, 'amount' => (float)$row->settled_amount];
        })->all(), 'orders.settlement_method/payment + settled_amount fallback');
    }

    private function paymentRowsSummary(array $rows, string $source): array
    {
        $total = 0.0;
        $cash = 0.0;
        $counts = [];
        $amounts = [];

        foreach ($rows as $row) {
            $amount = max(0, (float)($row['amount'] ?? 0));
            $code = $this->canonicalMethod((string)($row['method'] ?? ''));
            if ($code === '' || $amount <= 0) {
                continue;
            }

            $total += $amount;
            $counts[$code] = ($counts[$code] ?? 0) + 1;
            $amounts[$code] = ($amounts[$code] ?? 0) + $amount;
            if ($code === 'cash') {
                $cash += $amount;
            }
        }

        arsort($counts);
        $top = $counts ? (string)array_key_first($counts) : null;

        return [
            'available' => true,
            'total' => round($total, 2),
            'cash' => round($cash, 2),
            'cash_percent' => $total > 0 ? ($cash / $total) * 100 : 0,
            'top_method' => $top,
            'transactions' => array_sum($counts),
            'source' => $source,
        ];
    }

    private function accountingSummary(int $locationId, Carbon $start, Carbon $end): array
    {
        if (!$this->hasColumns('orders', ['order_id', 'location_id', 'order_total', 'settled_amount', 'settlement_status', 'settled_at', 'updated_at'])) {
            return ['available' => false, 'source' => 'orders accounting fields unavailable'];
        }

        $settled = $this->settledOrders($locationId, $start, $end);
        $gross = 0.0;
        $discounts = 0.0;

        if (Schema::hasTable('order_totals') && $this->hasColumns('order_totals', ['order_id', 'code', 'value'])) {
            // Gross sales authority: persisted subtotal rows before discounts/tips.
            $gross = (float)DB::table('order_totals as ot')
                ->join('orders as o', 'o.order_id', '=', 'ot.order_id')
                ->where('o.location_id', $locationId)
                ->whereIn(DB::raw('LOWER('.$this->rawAliasColumn('o', 'settlement_status').')'), ['paid', 'settled'])
                ->whereNotNull('o.settled_at')
                ->whereBetween('o.settled_at', [$start->toDateTimeString(), $end->toDateTimeString()])
                ->whereRaw("LOWER(TRIM(".$this->rawAliasColumn('ot', 'code').")) = 'subtotal'")
                ->sum('ot.value');

            // VAT added at checkout is summable on top of subtotal. VAT that is
            // already included in menu prices is persisted with is_summable=0
            // and must not be added twice.
            if ($this->hasColumns('order_totals', ['is_summable'])) {
                $gross += (float)DB::table('order_totals as ot')
                    ->join('orders as o', 'o.order_id', '=', 'ot.order_id')
                    ->where('o.location_id', $locationId)
                    ->whereIn(DB::raw('LOWER('.$this->rawAliasColumn('o', 'settlement_status').')'), ['paid', 'settled'])
                    ->whereNotNull('o.settled_at')
                    ->whereBetween('o.settled_at', [$start->toDateTimeString(), $end->toDateTimeString()])
                    ->whereRaw("LOWER(TRIM(".$this->rawAliasColumn('ot', 'code').")) IN ('tax','vat')")
                    ->where('ot.is_summable', 1)
                    ->sum('ot.value');
            }

            $discountRaw = (float)DB::table('order_totals as ot')
                ->join('orders as o', 'o.order_id', '=', 'ot.order_id')
                ->where('o.location_id', $locationId)
                ->whereIn(DB::raw('LOWER('.$this->rawAliasColumn('o', 'settlement_status').')'), ['paid', 'settled'])
                ->whereNotNull('o.settled_at')
                ->whereBetween('o.settled_at', [$start->toDateTimeString(), $end->toDateTimeString()])
                ->whereRaw("LOWER(TRIM(".$this->rawAliasColumn('ot', 'code').")) IN ('discount','coupon_discount')")
                ->sum('ot.value');
            $discounts = abs($discountRaw);
        }

        // Fallback for legacy settled orders without persisted subtotal rows.
        if ($gross <= 0) {
            $tips = $this->tipSummary($locationId, $start, $start, $end);
            $gross = max(0, (float)(clone $settled)->sum('settled_amount') - (float)($tips['month'] ?? 0));
        }

        if ($discounts <= 0 && Schema::hasTable('order_payment_transactions') && $this->hasColumns('order_payment_transactions', ['order_id', 'coupon_discount', 'paid_at'])) {
            $discounts = abs((float)DB::table('order_payment_transactions as pt')
                ->join('orders as o', 'o.order_id', '=', 'pt.order_id')
                ->where('o.location_id', $locationId)
                ->whereNotNull('pt.paid_at')
                ->whereBetween('pt.paid_at', [$start->toDateTimeString(), $end->toDateTimeString()])
                ->sum('pt.coupon_discount'));
        }

        /* PMD_ROLE_FINANCE_GROSS_LOSS_FORMULA_V3_4
         * Gross-to-net must literally satisfy:
         * gross - discounts - voids/refunds = net.
         *
         * A void/refund-status order is not part of settledOrders(), so include
         * its original amount in gross before subtracting it as loss. A refund
         * recorded only in payment_logs remains a paid/settled order and is
         * already part of gross, so do NOT add that amount twice.
         */
        $voidOrderIds = DB::table('orders')
            ->where('location_id', $locationId)
            ->whereBetween('updated_at', [$start->toDateTimeString(), $end->toDateTimeString()])
            ->whereIn(DB::raw('LOWER(settlement_status)'), ['void', 'voided', 'refund', 'refunded'])
            ->pluck('order_id')
            ->map(fn ($id) => (int)$id)
            ->all();

        $refundIds = [];
        if (Schema::hasTable('payment_logs') && $this->hasColumns('payment_logs', ['order_id', 'refunded_at'])) {
            $refundIds = DB::table('payment_logs as pl')
                ->join('orders as o', 'o.order_id', '=', 'pl.order_id')
                ->where('o.location_id', $locationId)
                ->whereNotNull('pl.refunded_at')
                ->whereBetween('pl.refunded_at', [$start->toDateTimeString(), $end->toDateTimeString()])
                ->pluck('pl.order_id')
                ->map(fn ($id) => (int)$id)
                ->all();
        }

        $lossOrderIds = array_values(array_unique(array_merge($voidOrderIds, $refundIds)));
        $loss = 0.0;
        if ($lossOrderIds) {
            $loss = (float)DB::table('orders')
                ->where('location_id', $locationId)
                ->whereIn('order_id', $lossOrderIds)
                ->selectRaw('COALESCE(SUM(CASE WHEN settled_amount > 0 THEN settled_amount ELSE COALESCE(order_total,0) END),0) AS loss')
                ->value('loss');
        }

        if ($voidOrderIds) {
            $gross += (float)DB::table('orders')
                ->where('location_id', $locationId)
                ->whereIn('order_id', array_values(array_unique($voidOrderIds)))
                ->selectRaw('COALESCE(SUM(CASE WHEN settled_amount > 0 THEN settled_amount ELSE COALESCE(order_total,0) END),0) AS gross_voided')
                ->value('gross_voided');
        }

        return [
            'available' => true,
            'gross' => round(max(0, $gross), 2),
            'discounts' => round(max(0, $discounts), 2),
            'loss' => round(max(0, $loss), 2),
            'net' => round(max(0, $gross - max(0, $discounts) - max(0, $loss)), 2),
            'source' => 'gross sales before losses - persisted discounts - unique void/refund orders',
        ];
    }

    private function averageChecks(int $locationId, Carbon $todayStart, Carbon $monthStart, Carbon $end): array
    {
        if (!$this->hasColumns('orders', ['order_id', 'location_id', 'settled_amount', 'settled_at', 'settlement_status'])) {
            return ['available' => false, 'source' => 'settled order check source unavailable'];
        }

        $resolve = function (Carbon $start) use ($locationId, $end): float {
            $query = $this->settledOrders($locationId, $start, $end);
            $count = (clone $query)->count();
            if ($count < 1) return 0.0;

            $sales = (float)(clone $query)->sum('settled_amount');
            if (Schema::hasTable('order_totals') && $this->hasColumns('order_totals', ['order_id', 'code', 'value'])) {
                $tips = (float)DB::table('order_totals as ot')
                    ->join('orders as o', 'o.order_id', '=', 'ot.order_id')
                    ->where('o.location_id', $locationId)
                    ->whereIn(DB::raw('LOWER('.$this->rawAliasColumn('o', 'settlement_status').')'), ['paid', 'settled'])
                    ->whereNotNull('o.settled_at')
                    ->whereBetween('o.settled_at', [$start->toDateTimeString(), $end->toDateTimeString()])
                    ->whereRaw("LOWER(TRIM(".$this->rawAliasColumn('ot', 'code').")) = 'tip'")
                    ->sum('ot.value');
                $sales = max(0, $sales - $tips);
            }

            return $sales / $count;
        };

        return [
            'available' => true,
            'today' => round($resolve($todayStart), 2),
            'month' => round($resolve($monthStart), 2),
            'source' => 'settled sales net of tips / settled current-location order count',
        ];
    }

    private function settledOrders(int $locationId, Carbon $start, Carbon $end)
    {
        return DB::table('orders')
            ->where('location_id', $locationId)
            ->whereIn(DB::raw('LOWER(settlement_status)'), ['paid', 'settled'])
            ->whereNotNull('settled_at')
            ->whereBetween('settled_at', [$start->toDateTimeString(), $end->toDateTimeString()]);
    }

    /**
     * TastyIgniter prefixes query aliases (for example `pa` becomes `ti_pa`).
     * Raw SQL does not receive that rewrite, so raw alias references must use
     * the live connection prefix explicitly.
     */
    private function rawAliasColumn(string $alias, string $column): string
    {
        $tableAlias = str_replace('`', '', DB::connection()->getTablePrefix().$alias);
        $columnName = str_replace('`', '', $column);

        return '`'.$tableAlias.'`.`'.$columnName.'`';
    }

    private function card(
        string $key,
        string $title,
        string $icon,
        string $tone,
        string $value,
        string $description,
        bool $connected,
        string $period,
        string $source
    ): array {
        return [
            'key' => $key,
            'title' => $title,
            'icon' => $icon,
            'tone' => $tone,
            'format' => 'display',
            'period' => $period,
            'value' => $value,
            'description' => $description,
            'connected' => $connected,
            'source' => $source,
        ];
    }

    private function ordered(array $cards, array $order): array
    {
        $result = [];
        foreach ($order as $key) {
            if (isset($cards[$key])) {
                $result[$key] = $cards[$key];
            }
        }
        return $result;
    }

    private function hasColumns(string $table, array $columns): bool
    {
        if (!Schema::hasTable($table)) {
            return false;
        }
        foreach ($columns as $column) {
            if (!Schema::hasColumn($table, $column)) {
                return false;
            }
        }
        return true;
    }

    private function canonicalMethod(string $value): string
    {
        $code = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '_', $value), '_'));
        if (in_array($code, ['cod', 'cash', 'cash_on_delivery'], true)) {
            return 'cash';
        }
        if (in_array($code, ['credit_card', 'debit_card', 'stripe', 'worldline', 'sumup', 'square', 'vr_payment'], true)) {
            return 'card';
        }
        if ($code === 'applepay') {
            return 'apple_pay';
        }
        if ($code === 'googlepay') {
            return 'google_pay';
        }
        if ($code === 'pay_pal') {
            return 'paypal';
        }
        if (in_array($code, ['qr_payment_later', 'qr_pay_later', 'payment_later', 'pay_later', 'later', 'deferred', 'pending_payment', 'unpaid', 'not_paid'], true)) {
            return '';
        }
        return $code;
    }

    private function methodLabel($method, string $locale): string
    {
        $method = (string)$method;
        if ($method === '') {
            return '—';
        }

        $labels = [
            'cash' => ['Cash', 'Barzahlung'],
            'card' => ['Card', 'Karte'],
            'apple_pay' => ['Apple Pay', 'Apple Pay'],
            'google_pay' => ['Google Pay', 'Google Pay'],
            'paypal' => ['PayPal', 'PayPal'],
            'wero' => ['Wero', 'Wero'],
        ];

        if (isset($labels[$method])) {
            return $locale === 'de' ? $labels[$method][1] : $labels[$method][0];
        }

        return ucwords(str_replace('_', ' ', $method));
    }

    private function money(float $value, string $locale): string
    {
        if ($locale === 'de') {
            return number_format($value, 2, ',', '.').' €';
        }
        return '€'.number_format($value, 2, '.', ',');
    }

    private function percent(float $value): string
    {
        return rtrim(rtrim(number_format($value, 1, '.', ''), '0'), '.').'%';
    }

    private function minutes(float $value): string
    {
        return rtrim(rtrim(number_format($value, 1, '.', ''), '0'), '.').' min';
    }

    private function text(string $en, string $de, string $locale): string
    {
        return $locale === 'de' ? $de : $en;
    }

    private function connectionRequired(string $locale, string $source): string
    {
        // Keep the visible KPI copy fully localized. The technical missing
        // authority remains available in the card's separate source field.
        return $this->text('Data connection required', 'Datenverbindung erforderlich', $locale);
    }
}
