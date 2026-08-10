<?php

namespace Admin\Controllers;

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
    public function channels() { return $this->show('channels'); }
    public function topitems() { return $this->show('topitems'); }
    public function tips() { return $this->show('tips'); }
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
            'back_url' => admin_url('dashboard2'),
        ], $payload);

        return $this->makeView('pmdreports/index');
    }

    protected function meta(string $type): array
    {
        return [
            'sales' => ['Sales over time', 'Full revenue history, order volume, averages and time-series performance from settled orders.', 'green'],
            'hourly' => ['Sales by hour', 'See when revenue and order volume are strongest across the day.', 'blue'],
            'categories' => ['Sales by category', 'Category revenue and contribution based on live enabled menu categories.', 'violet'],
            'payments' => ['Payment methods', 'How settled revenue is distributed across enabled guest payment methods.', 'orange'],
            'transactions' => ['Recent transactions', 'A detailed ledger of settled orders for the selected period.', 'slate'],
            'alerts' => ['Alerts', 'Payment, refund, stock, review and long-open-table exceptions that may need attention.', 'rose'],
            'liveorders' => ['Live orders', 'Current open orders with operational status, channel and age.', 'green'],
            'channels' => ['Order channels', 'Revenue and order mix across real order types.', 'cyan'],
            'topitems' => ['Top-selling items', 'Best-performing menu items ranked by sold quantity and revenue.', 'orange'],
            'tips' => ['Tips summary', 'Tip totals and tipped-order history from order_totals.', 'green'],
            'reviews' => ['Latest reviews', 'Recent guest ratings and comments for this restaurant.', 'violet'],
            'reservations' => ['Upcoming reservations', 'Future reservations with guests, status and real table assignments.', 'blue'],
        ][$type] ?? ['Owner report', 'Detailed owner report.', 'slate'];
    }

    protected function period(string $type): string
    {
        if (in_array($type, ['alerts', 'liveorders'], true)) return 'today';
        if ($type === 'reviews') return 'all';
        if ($type === 'reservations') return 'today';
        $value = strtolower(trim((string)request()->query('period', 'last30')));
        return in_array($value, ['today', 'week', 'month', 'last30', 'all'], true) ? $value : 'last30';
    }

    protected function periodOptions(string $type): array
    {
        if (in_array($type, ['alerts', 'liveorders'], true)) return ['today' => 'Today'];
        if ($type === 'reviews') return ['all' => 'Latest'];
        if ($type === 'reservations') return ['today' => 'Upcoming'];
        return ['today' => 'Today', 'week' => 'Week', 'month' => 'Month', 'last30' => 'Last 30 days', 'all' => 'All time'];
    }

    protected function window(string $period): array
    {
        $now = Carbon::now($this->restaurantTimezone());
        if ($period === 'today') return [$now->copy()->startOfDay(), $now, 'Today'];
        if ($period === 'week') return [$now->copy()->startOfWeek(), $now, 'This week'];
        if ($period === 'month') return [$now->copy()->startOfMonth(), $now, 'This month'];
        if ($period === 'last30') return [$now->copy()->subDays(30)->startOfDay(), $now, 'Last 30 days'];

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
