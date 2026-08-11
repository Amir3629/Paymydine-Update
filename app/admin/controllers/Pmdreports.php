<?php

namespace Admin\Controllers;

/* Explicitly load the two report concerns. Admin controllers in this project
 * live in a lowercase module directory, so this keeps deployment independent
 * of host-specific PSR-4 case handling. */
require_once __DIR__.'/concerns/PmdreportsCommerceConcern.php';
require_once __DIR__.'/concerns/PmdreportsOperationsConcern.php';

use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Controllers\Concerns\PmdreportsCommerceConcern;
use Admin\Controllers\Concerns\PmdreportsOperationsConcern;
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
            'timezone' => $this->restaurantTimezone(),
            'currency' => $this->reportCurrency(),
            'route_url' => $this->reportUrl($type),
            'back_url' => admin_url('dashboard2'),
        ], $payload);

        return $this->makeView('pmdreports/index');
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
                'subtitle' => 'Current open orders with operational status, channel and age.',
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
                'subtitle' => 'Recent guest ratings and comments for this restaurant.',
                'accent' => 'violet',
            ],
            'reservations' => [
                'title' => 'Upcoming reservations',
                'subtitle' => 'Future reservations with guests, status and real table assignments.',
                'accent' => 'blue',
            ],
        ][$type] ?? [
            'title' => 'Owner report',
            'subtitle' => 'Detailed owner report.',
            'accent' => 'slate',
        ];
    }

    protected function period(string $type): string
    {
        if (in_array($type, ['alerts', 'liveorders'], true)) return 'today';
        if ($type === 'reviews') return 'all';
        if ($type === 'reservations') return 'today';

        $value = strtolower(trim((string)request()->query('period', 'last30')));

        if ($value === 'custom') {
            return $this->customWindow() ? 'custom' : 'last30';
        }

        return in_array($value, ['today', 'week', 'month', 'last30', 'all'], true)
            ? $value
            : 'last30';
    }

    protected function periodOptions(string $type): array
    {
        if (in_array($type, ['alerts', 'liveorders'], true)) return ['today' => 'Today'];
        if ($type === 'reviews') return ['all' => 'Latest'];
        if ($type === 'reservations') return ['today' => 'Upcoming'];

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
     * Custom ranges use only canonical YYYY-MM-DD query parameters and the
     * restaurant timezone. The end date is inclusive through 23:59:59.999999.
     * Invalid/missing dates safely fall back to Last 30 days via period().
     */
    protected function customWindow(): ?array
    {
        $from = trim((string)request()->query('date_from', ''));
        $to = trim((string)request()->query('date_to', ''));

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
            }

            $label = $start->isSameDay($end)
                ? 'Custom · '.$start->format('d M Y')
                : 'Custom · '.$start->format('d M Y').' – '.$end->format('d M Y');

            return [$start, $end, $label];
        } catch (\Throwable $error) {
            return null;
        }
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
            'liveorders' => $this->livePayload($end),
            'channels' => $this->channelsPayload($start, $end),
            'topitems' => $this->topItemsPayload($start, $end),
            'tips' => $this->tipsPayload($start, $end),
            'reviews' => $this->reviewsPayload(),
            'reservations' => $this->reservationsPayload($end),
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
