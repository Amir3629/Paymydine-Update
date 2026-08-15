<?php

namespace Admin\Controllers;

/* Explicitly load the two report concerns. Admin controllers in this project
 * live in a lowercase module directory, so this keeps deployment independent
 * of host-specific PSR-4 case handling. */
require_once __DIR__.'/concerns/PmdreportsCommerceConcern.php';
require_once __DIR__.'/concerns/PmdreportsOperationsConcern.php';
require_once __DIR__.'/concerns/PmdreportsAttendanceConcern.php';

use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Controllers\Concerns\PmdreportsCommerceConcern;
use Admin\Controllers\Concerns\PmdreportsOperationsConcern;
use Admin\Controllers\Concerns\PmdreportsAttendanceConcern;
use Carbon\Carbon;

/**
 * PMD Owner Reports V1
 * Detailed drill-down pages for Dashboard2 analytics.
 * Extending Dashboard2 intentionally reuses its canonical tenant/location,
 * timezone, currency, paid-order and analytics source authorities.
 */
class Pmdreports extends Dashboard2
{
    use PmdreportsCommerceConcern;
    use PmdreportsOperationsConcern;
    use PmdreportsAttendanceConcern;

    protected $requiredPermissions = 'Admin.Dashboard';
    private ?array $pmdReportCurrency = null;

    public function __construct()
    {
        parent::__construct();
        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-settings-suite pmd-owner-settings-page pmd-report-settings-page');
        $this->addCss('css/pmd-owner-settings-v1.css');
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addCss('css/pmd-reports-first-paint-v1.css');
        $this->addCss('css/pmd-reports-v1.css');
        $this->addJs('js/pmd-owner-settings-v1.js');
        $this->addJs('js/pmd-reports-v1.js');
        $this->addJs('js/pmd-reports-excel-v1.js');
        AdminMenu::setContext('dashboard');
    }

    public function index() { return redirect(admin_url('dashboard2')); }
    public function sales() { return $this->show('sales'); }
    public function hourly() { return $this->show('hourly'); }
    public function categories() { return $this->show('categories'); }
    public function payments() { return $this->show('payments'); }
    public function transactions() { return $this->show('transactions'); }
    public function alerts() { return $this->show('alerts'); }
    public function liveorders() { return $this->show('liveorders'); }

    /*
     * Keep the old V1.1 URLs as harmless redirects. The real pages now use
     * dedicated index controllers, so there is zero ambiguity with the
     * inherited Dashboard2::channels() / Dashboard2::tips() methods.
     */
    public function orderchannels() { return redirect(admin_url('pmdreportchannels')); }
    public function tipssummary() { return redirect(admin_url('pmdreporttips')); }

    public function topitems() { return $this->show('topitems'); }
    public function reviews() { return $this->show('reviews'); }
    public function reservations() { return $this->show('reservations'); }
    public function attendance() { return $this->show('attendance'); }

    protected function show(string $type)
    {
        $meta = $this->meta($type);
        $period = $this->period($type);
        [$start, $end, $periodLabel] = $this->window($period);
        Template::setTitle($meta['title']);
        Template::setHeading($meta['title']);

        try {
            $payload = $this->payload($type, $start, $end, $period);
        } catch (\Throwable $error) {
            logger()->error('PMD report failed', [
                'report' => $type,
                'message' => $error->getMessage(),
                'location_id' => $this->locationId(),
            ]);
            $payload = [
                'stats' => [], 'chart' => null, 'columns' => [], 'rows' => [],
                'empty' => true,
                'error' => 'This report could not be loaded from its source right now.',
                'source' => 'Runtime query failed safely. No data was changed.',
            ];
        }

        $this->vars['pmdReport'] = array_merge([
            'type' => $type,
            'title' => $meta['title'],
            'subtitle' => $meta['subtitle'],
            'accent' => $meta['accent'],
            'period' => $period,
            'period_label' => $periodLabel,
            'periods' => $this->periodOptions($type),
            'period_query' => $this->periodQueryParams($period),
            'date_from' => $this->periodQueryParams($period)['date_from'] ?? null,
            'date_to' => $this->periodQueryParams($period)['date_to'] ?? null,
            'timezone' => $this->restaurantTimezone(),
            'currency' => $this->reportCurrency(),
            'route_url' => $this->reportUrl($type),
            'back_url' => admin_url('dashboard2'),
        ], $payload);

        /*
         * PMD_OWNER_REPORT_ASYNC_RESPONSE_V1
         *
         * Period changes can ask for the exact same tenant-scoped report as a
         * compact JSON response. This does NOT introduce a second data source,
         * extra query, polling loop or cache layer: payload() above remains the
         * only report authority. The normal HTML route remains the fallback and
         * is still used for first load, refresh, bookmarks and direct links.
         */
        if ($this->wantsAsyncReportResponse()) {
            return response()->json([
                'ok' => true,
                'report' => $this->vars['pmdReport'],
            ])->withHeaders([
                'Cache-Control' => 'private, no-store, max-age=0',
                'Vary' => 'X-PMD-Report-Async',
            ]);
        }

        return $this->makeView('pmdreports/index');
    }

    protected function wantsAsyncReportResponse(): bool
    {
        return trim((string)request()->header('X-PMD-Report-Async', '')) === '1';
    }

    protected function reportUrl(string $type): string
    {
        return match ($type) {
            'channels' => admin_url('pmdreportchannels'),
            'tips' => admin_url('pmdreporttips'),
            default => admin_url('pmdreports/'.$type),
        };
    }

    protected function meta(string $type): array
    {
        return [
            'sales' => [
                'title' => 'Sales over time',
                'subtitle' => 'Full revenue history, order volume, averages and time-series performance from settled orders.',
                'accent' => 'green',
            ],
            'hourly' => [
                'title' => 'Sales by hour',
                'subtitle' => 'See when revenue and order volume are strongest across the day.',
                'accent' => 'blue',
            ],
            'categories' => [
                'title' => 'Sales by category',
                'subtitle' => 'Category revenue and contribution based on live enabled menu categories.',
                'accent' => 'violet',
            ],
            'payments' => [
                'title' => 'Payment methods',
                'subtitle' => 'How settled revenue is distributed across enabled guest payment methods.',
                'accent' => 'orange',
            ],
            'transactions' => [
                'title' => 'Recent transactions',
                'subtitle' => 'A detailed ledger of settled orders for the selected period.',
                'accent' => 'slate',
            ],
            'alerts' => [
                'title' => 'Alerts',
                'subtitle' => 'Payment, refund, stock, review and long-open-table exceptions that may need attention.',
                'accent' => 'rose',
            ],
            'liveorders' => [
                'title' => 'Live orders',
                'subtitle' => 'Current open orders created inside the selected report window, with operational status, channel and age.',
                'accent' => 'green',
            ],
            'channels' => [
                'title' => 'Order channels',
                'subtitle' => 'Revenue and order mix across real order types.',
                'accent' => 'cyan',
            ],
            'topitems' => [
                'title' => 'Top-selling items',
                'subtitle' => 'Best-performing menu items ranked by sold quantity and revenue.',
                'accent' => 'orange',
            ],
            'tips' => [
                'title' => 'Tips summary',
                'subtitle' => 'Tip totals and tipped-order history from order_totals.',
                'accent' => 'green',
            ],
            'reviews' => [
                'title' => 'Latest reviews',
                'subtitle' => 'Guest ratings and comments inside the selected report window for this restaurant.',
                'accent' => 'violet',
            ],
            'reservations' => [
                'title' => 'Upcoming reservations',
                'subtitle' => 'Reservations inside the selected report window with guests, status and real table assignments.',
                'accent' => 'blue',
            ],
            'attendance' => [
                'title' => 'Staff attendance & presence',
                'subtitle' => 'Real signed-in admin sessions, time-clock attendance and biometric verification for this location.',
                'accent' => 'green',
            ],
        ][$type] ?? [
            'title' => 'Owner report',
            'subtitle' => 'Detailed owner report.',
            'accent' => 'slate',
        ];
    }

    protected function period(string $type): string
    {
        $allowed = ['today', 'week', 'month', 'last30', 'all', 'custom'];
        $queryPeriod = request()->query('period', null);

        if ($queryPeriod !== null) {
            $value = strtolower(trim((string)$queryPeriod));
            if (!in_array($value, $allowed, true)) $value = 'last30';

            if ($value === 'custom') {
                if (!$this->customWindow(true)) $value = 'last30';
            }

            session()->put('pmd.owner_reports.period', $value);
            return $value;
        }

        $saved = strtolower(trim((string)session()->get('pmd.owner_reports.period', '')));
        if ($saved === 'custom' && $this->customWindow(false)) return 'custom';
        if (in_array($saved, ['today', 'week', 'month', 'last30', 'all'], true)) return $saved;

        return match ($type) {
            'attendance', 'alerts', 'liveorders', 'reservations' => 'today',
            'reviews' => 'all',
            default => 'last30',
        };
    }

    protected function periodOptions(string $type): array
    {
        return [
            'today' => 'Today',
            'week' => 'Week',
            'month' => 'Month',
            'last30' => 'Last 30 days',
            'all' => 'All time',
            'custom' => 'Custom',
        ];
    }

    /*
     * PMD_OWNER_REPORT_CUSTOM_RANGE_V1
     *
     * Custom ranges are remembered in the authenticated Admin session so the
     * exact same selection follows the user across every PMD report route.
     */
    protected function customWindow(bool $remember = false): ?array
    {
        $from = trim((string)request()->query('date_from', ''));
        $to = trim((string)request()->query('date_to', ''));

        if ($from === '' || $to === '') {
            $from = trim((string)session()->get('pmd.owner_reports.date_from', ''));
            $to = trim((string)session()->get('pmd.owner_reports.date_to', ''));
        }

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $from) ||
            !preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
            return null;
        }

        try {
            $timezone = $this->restaurantTimezone();
            $start = Carbon::createFromFormat('Y-m-d', $from, $timezone)->startOfDay();
            $end = Carbon::createFromFormat('Y-m-d', $to, $timezone)->endOfDay();

            if ($start->format('Y-m-d') !== $from || $end->format('Y-m-d') !== $to) {
                return null;
            }

            if ($start->gt($end)) {
                [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
                [$from, $to] = [$start->format('Y-m-d'), $end->format('Y-m-d')];
            }

            if ($remember || request()->query('period', null) === 'custom') {
                session()->put('pmd.owner_reports.date_from', $from);
                session()->put('pmd.owner_reports.date_to', $to);
            }

            $label = $start->isSameDay($end)
                ? 'Custom · '.$start->format('d M Y')
                : 'Custom · '.$start->format('d M Y').' – '.$end->format('d M Y');

            return [$start, $end, $label];
        } catch (\Throwable $error) {
            return null;
        }
    }

    protected function periodQueryParams(string $period): array
    {
        $params = ['period' => $period];
        if ($period !== 'custom') return $params;

        $custom = $this->customWindow(false);
        if (!$custom) return ['period' => 'last30'];

        $params['date_from'] = $custom[0]->format('Y-m-d');
        $params['date_to'] = $custom[1]->format('Y-m-d');
        return $params;
    }

    protected function window(string $period): array
    {
        $now = Carbon::now($this->restaurantTimezone());
        if ($period === 'today') return [$now->copy()->startOfDay(), $now, 'Today'];
        if ($period === 'week') return [$now->copy()->startOfWeek(), $now, 'This week'];
        if ($period === 'month') return [$now->copy()->startOfMonth(), $now, 'This month'];
        if ($period === 'last30') return [$now->copy()->subDays(30)->startOfDay(), $now, 'Last 30 days'];

        if ($period === 'custom') {
            $custom = $this->customWindow();
            if ($custom) return $custom;
        }

        $start = $now->copy()->subYear()->startOfDay();
        try {
            $probe = Carbon::create(2000, 1, 1, 0, 0, 0, $this->restaurantTimezone());
            $authority = $this->analyticsAuthority($probe, $now);
            $date = $authority['date'] ?? null;
            $earliest = $date ? $this->orders()->where('processed', 1)->whereNotNull($date)->min($date) : null;
            if ($earliest) $start = Carbon::parse($earliest, $this->restaurantTimezone())->startOfDay();
        } catch (\Throwable $error) {}
        return [$start, $now, 'All time'];
    }

    protected function payload(string $type, Carbon $start, Carbon $end, string $period): array
    {
        return match ($type) {
            'sales' => $this->salesPayload($start, $end, $period),
            'hourly' => $this->hourlyPayload($start, $end),
            'categories' => $this->categoryPayload($start, $end),
            'payments' => $this->paymentsPayload($start, $end),
            'transactions' => $this->transactionsPayload($start, $end),
            'alerts' => $this->alertsPayload($start, $end),
            'liveorders' => $this->livePayload($start, $end),
            'channels' => $this->channelsPayload($start, $end),
            'topitems' => $this->topItemsPayload($start, $end),
            'tips' => $this->tipsPayload($start, $end),
            'reviews' => $this->reviewsPayload($start, $end),
            'reservations' => $this->reservationsPayload($start, $end, $period),
            'attendance' => $this->attendancePayload($start, $end, $period),
            default => ['stats' => [], 'chart' => null, 'columns' => [], 'rows' => [], 'empty' => true],
        };
    }

    protected function stat(string $label,string $value,string $meta=''): array { return compact('label','value','meta'); }
    protected function nullableCount($value): string { return $value === null ? 'Unavailable' : number_format((int)$value); }
    protected function emptySource(string $source): array { return ['stats'=>[],'chart'=>null,'columns'=>[],'rows'=>[],'empty'=>true,'source'=>$source]; }
    protected function reportCurrency(): array { return $this->pmdReportCurrency ??= $this->currency(); }
    protected function money(float $value): string { return ($this->reportCurrency()['symbol'] ?? '€').number_format($value,2); }
    protected function bucketLabel(string $value): string { try { return Carbon::parse($value,$this->restaurantTimezone())->format(strlen($value)>10?'d M · H:i':'d M Y'); } catch(\Throwable $e){ return $value; } }
    protected function dateTime(string $value): string { if($value==='')return'—';try{return Carbon::parse($value,$this->restaurantTimezone())->format('d M Y · H:i');}catch(\Throwable $e){return$value;} }
    protected function duration(int $minutes): string { $minutes=max(0,$minutes);if($minutes<60)return$minutes.' min';$h=intdiv($minutes,60);$m=$minutes%60;return$m?$h.'h '.$m.'m':$h.'h'; }
    protected function channelLabel(string $value): string { $v=strtolower(trim($value));if(in_array($v,['collection','takeaway','take-away','pickup'],true))return'Take away';if(in_array($v,['delivery','delivered'],true))return'Delivery';if(in_array($v,['','dine_in','dine-in','restaurant','table'],true))return'Dine in';return ucwords(str_replace(['_','-'],' ',$v)); }
    protected function paymentLabel(string $value): string { $c=strtolower(trim(preg_replace('/[^a-z0-9]+/i','_',$value),'_'));return match($c){'cash','cod','cash_on_delivery'=>'Cash','card','credit_card','debit_card','stripe','worldline','sumup','square','vr_payment'=>'Card','apple_pay','applepay'=>'Apple Pay','google_pay','googlepay'=>'Google Pay','paypal','pay_pal'=>'PayPal','wero'=>'Wero','','qr_payment_later','qr_pay_later','payment_later','pay_later','later','deferred','pending_payment','unpaid','not_paid'=>'Not recorded',default=>ucwords(str_replace('_',' ',$c)),}; }
}
