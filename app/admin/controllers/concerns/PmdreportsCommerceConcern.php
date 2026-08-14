<?php

namespace Admin\Controllers\Concerns;

use Admin\Models\Categories_model;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

trait PmdreportsCommerceConcern
{
    protected function salesPayload(Carbon $start, Carbon $end, string $period): array
    {
        $series = $this->analyticsSalesSeries($start, $end, $period === 'all' ? 'last30' : $period);
        $rows = collect($series['buckets'] ?? [])->map(fn ($row) => [
            'period' => $this->bucketLabel((string)$row['bucket']),
            'sales' => $this->money((float)$row['sales']),
            'orders' => number_format((int)$row['orders']),
            'average' => (int)$row['orders'] > 0 ? $this->money((float)$row['sales'] / (int)$row['orders']) : $this->money(0),
        ])->all();
        $sales = array_sum(array_map(fn ($r) => (float)$r['sales'], $series['buckets'] ?? []));
        $orders = array_sum(array_map(fn ($r) => (int)$r['orders'], $series['buckets'] ?? []));
        return [
            'stats' => [$this->stat('Net sales', $this->money($sales)), $this->stat('Settled orders', number_format($orders)), $this->stat('Average order', $orders ? $this->money($sales / $orders) : $this->money(0))],
            'chart' => ['type' => 'line', 'labels' => array_column($rows, 'period'), 'values' => array_map(fn ($r) => (float)$r['sales'], $series['buckets'] ?? []), 'money' => true, 'currency_symbol' => $this->reportCurrency()['symbol']],
            'columns' => [['key'=>'period','label'=>'Period'],['key'=>'sales','label'=>'Net sales'],['key'=>'orders','label'=>'Orders'],['key'=>'average','label'=>'Average order']],
            'rows' => $rows, 'empty' => $orders === 0,
            'source' => $series['source'] ?? 'Dashboard2 paid-order revenue authority, net of tips.',
        ];
    }

    protected function hourlyPayload(Carbon $start, Carbon $end): array
    {
        $authority = $this->analyticsAuthority($start, $end);
        $rowsDb = DB::query()->fromSub($this->analyticsPaidQuery($start, $end), 'paid')
            ->groupByRaw('HOUR(effective_at)')->orderBy('hour')
            ->selectRaw('HOUR(effective_at) AS hour, SUM(net_revenue) AS sales, COUNT(*) AS orders')->get()->keyBy('hour');
        $rows = []; $sales = 0; $orders = 0;
        for ($hour = 0; $hour < 24; $hour++) {
            $row = $rowsDb->get($hour); $value = (float)($row->sales ?? 0); $count = (int)($row->orders ?? 0);
            $sales += $value; $orders += $count;
            $rows[] = ['hour' => sprintf('%02d:00', $hour), 'sales_raw' => $value, 'sales' => $this->money($value), 'orders' => number_format($count), 'average' => $count ? $this->money($value / $count) : $this->money(0)];
        }
        $peak = collect($rows)->sortByDesc('sales_raw')->first();
        return [
            'stats' => [$this->stat('Net sales', $this->money($sales)), $this->stat('Orders', number_format($orders)), $this->stat('Peak hour', $peak && $peak['sales_raw'] > 0 ? $peak['hour'] : '—')],
            'chart' => ['type'=>'bar','labels'=>array_column($rows,'hour'),'values'=>array_column($rows,'sales_raw'),'money'=>true,'currency_symbol'=>$this->reportCurrency()['symbol']],
            'columns' => [['key'=>'hour','label'=>'Hour'],['key'=>'sales','label'=>'Net sales'],['key'=>'orders','label'=>'Orders'],['key'=>'average','label'=>'Average order']],
            'rows' => array_map(function ($row) { unset($row['sales_raw']); return $row; }, $rows),
            'empty' => $orders === 0,
            'source' => 'Eligible settled orders grouped by hour of '.$authority['date'].', using Dashboard2 net-revenue authority.',
        ];
    }

    protected function categoryPayload(Carbon $start, Carbon $end): array
    {
        if (!Schema::hasTable('menu_categories') || !Schema::hasTable('categories') || !$this->hasColumns('order_menus',['order_id','menu_id','subtotal'])) {
            return $this->emptySource('menu category relation unavailable');
        }

        $enabled = Categories_model::query()->isEnabled();
        if ($this->locationId()) $enabled->whereHasOrDoesntHaveLocation($this->locationId());
        $enabled = $enabled->orderBy('priority')->orderBy('category_id')->get(['category_id','name','priority']);
        if ($enabled->isEmpty()) return $this->emptySource('No enabled categories for this restaurant');

        $rank = []; $names = [];
        foreach ($enabled as $index => $category) {
            $id = (int)$category->category_id;
            $rank[$id] = $index;
            $names[$id] = trim((string)$category->name) ?: 'Category #'.$id;
        }

        $primary = [];
        foreach (DB::table('menu_categories')->whereIn('category_id',array_keys($rank))->get(['menu_id','category_id']) as $pivot) {
            $menuId=(int)$pivot->menu_id; $categoryId=(int)$pivot->category_id;
            if ($menuId<1 || !isset($rank[$categoryId])) continue;
            if (!isset($primary[$menuId]) || $rank[$categoryId] < $rank[$primary[$menuId]]) $primary[$menuId]=$categoryId;
        }

        $revenue = array_fill_keys(array_keys($rank),0.0);
        $orderIds = $this->analyticsEligibleOrders($start,$end)->select('orders.order_id')->pluck('orders.order_id')->all();
        if ($orderIds && $primary) {
            foreach (DB::table('order_menus')->whereIn('order_id',$orderIds)->whereIn('menu_id',array_keys($primary))->get(['menu_id','subtotal']) as $sold) {
                $categoryId=$primary[(int)$sold->menu_id]??null;
                if($categoryId)$revenue[$categoryId]+=(float)($sold->subtotal??0);
            }
        }

        $detail=[];
        foreach ($enabled as $category) {
            $id=(int)$category->category_id; $value=round((float)($revenue[$id]??0),2);
            $detail[]=['category'=>$names[$id],'revenue_raw'=>$value,'revenue'=>$this->money($value),'priority'=>(int)($category->priority??0)];
        }
        usort($detail,fn($a,$b)=>($b['revenue_raw']<=>$a['revenue_raw'])?:($a['priority']<=>$b['priority']));
        $total=array_sum(array_column($detail,'revenue_raw'));
        foreach($detail as &$row){$row['share']=$total>0?number_format($row['revenue_raw']/$total*100,1).'%':'0.0%';} unset($row);
        $chartRows=array_values(array_filter($detail,fn($r)=>$r['revenue_raw']>0));
        $rows=array_map(function($r){unset($r['revenue_raw'],$r['priority']);return$r;},$detail);

        return [
            'stats'=>[$this->stat('Category sales',$this->money($total)),$this->stat('Enabled categories',number_format(count($rows))),$this->stat('Top category',$chartRows[0]['category']??'—')],
            'chart'=>['type'=>'donut','labels'=>array_column($chartRows,'category'),'values'=>array_column($chartRows,'revenue_raw'),'money'=>true,'currency_symbol'=>$this->reportCurrency()['symbol']],
            'columns'=>[['key'=>'category','label'=>'Category'],['key'=>'revenue','label'=>'Revenue'],['key'=>'share','label'=>'Share']],
            'rows'=>$rows,'empty'=>$total<=0,
            'source'=>'All enabled current-location categories; each menu item is assigned once to its highest-priority enabled category before eligible order_menus revenue is aggregated.',
        ];
    }

    protected function paymentsPayload(Carbon $start, Carbon $end): array
    {
        $summary = $this->analyticsPaymentMethods($start, $end);
        $methods = collect($summary['methods'] ?? []);
        $total = (float)$methods->sum('total');
        $rows = $methods->map(fn ($r) => [
            'method'=>(string)$r['method'], 'total_raw'=>(float)$r['total'], 'total'=>$this->money((float)$r['total']),
            'transactions'=>number_format((int)$r['transactions']), 'share'=>$total > 0 ? number_format((float)$r['total'] / $total * 100, 1).'%' : '0.0%',
            'provider'=>(string)($r['provider_code'] ?? '—'),
        ])->all();
        $chartRows = $rows;
        $rows = array_map(function ($r) { unset($r['total_raw']); return $r; }, $rows);
        return [
            'stats' => [$this->stat('Settled revenue', $this->money($total)), $this->stat('Transactions', number_format((int)$methods->sum('transactions'))), $this->stat('Enabled methods', number_format(count($rows)))],
            'chart' => ['type'=>'donut','labels'=>array_column($chartRows,'method'),'values'=>array_column($chartRows,'total_raw'),'money'=>true,'currency_symbol'=>$this->reportCurrency()['symbol']],
            'columns' => [['key'=>'method','label'=>'Method'],['key'=>'provider','label'=>'Provider'],['key'=>'total','label'=>'Revenue'],['key'=>'transactions','label'=>'Transactions'],['key'=>'share','label'=>'Share']],
            'rows'=>$rows, 'empty'=>!$rows,
            'source'=>$summary['source'] ?? 'Enabled /admin/payments methods merged with settled-order payment usage.',
        ];
    }

    protected function transactionsPayload(Carbon $start, Carbon $end): array
    {
        $rowsDb = DB::query()->fromSub($this->analyticsPaidQuery($start, $end), 'paid')
            ->orderByDesc('effective_at')->limit(250)->get(['order_id','effective_at','effective_amount','effective_payment','net_revenue','order_type']);
        $rows = $rowsDb->map(fn ($r) => [
            'order'=>'#'.(int)$r->order_id, 'time'=>$this->dateTime((string)$r->effective_at), 'channel'=>$this->channelLabel((string)$r->order_type),
            'method'=>$this->paymentLabel((string)$r->effective_payment), 'amount'=>$this->money((float)$r->effective_amount), 'net'=>$this->money((float)$r->net_revenue),
        ])->all();
        return [
            'stats'=>[$this->stat('Rows shown', number_format(count($rows))), $this->stat('Gross settled', $this->money((float)$rowsDb->sum('effective_amount'))), $this->stat('Net sales', $this->money((float)$rowsDb->sum('net_revenue')))],
            'chart'=>null,
            'columns'=>[['key'=>'order','label'=>'Order'],['key'=>'time','label'=>'Settled at'],['key'=>'channel','label'=>'Channel'],['key'=>'method','label'=>'Method'],['key'=>'amount','label'=>'Settled'],['key'=>'net','label'=>'Net sales']],
            'rows'=>$rows, 'empty'=>!$rows,
            'source'=>'Latest 250 eligible settled orders from the same Dashboard2 paid-order authority.',
        ];
    }

    protected function channelsPayload(Carbon $start, Carbon $end): array
    {
        $rowsDb = DB::query()->fromSub($this->analyticsPaidQuery($start, $end), 'paid')->get(['order_type','net_revenue']);
        $bucket = [];
        foreach ($rowsDb as $row) {
            $label = $this->channelLabel((string)$row->order_type);
            $bucket[$label] ??= ['channel'=>$label,'orders'=>0,'revenue_raw'=>0.0];
            $bucket[$label]['orders']++; $bucket[$label]['revenue_raw'] += (float)$row->net_revenue;
        }
        usort($bucket, fn ($a,$b) => $b['revenue_raw'] <=> $a['revenue_raw']);
        $total = array_sum(array_column($bucket,'revenue_raw'));
        $chartRows = $bucket;
        $rows = array_map(function ($r) use ($total) { $r['revenue']=$this->money($r['revenue_raw']); $r['orders']=number_format($r['orders']); $r['share']=$total>0?number_format($r['revenue_raw']/$total*100,1).'%':'0.0%'; unset($r['revenue_raw']); return $r; }, $bucket);
        return [
            'stats'=>[$this->stat('Net sales',$this->money($total)),$this->stat('Orders',number_format($rowsDb->count())),$this->stat('Channels',number_format(count($rows)))],
            'chart'=>['type'=>'donut','labels'=>array_column($chartRows,'channel'),'values'=>array_column($chartRows,'revenue_raw'),'money'=>true,'currency_symbol'=>$this->reportCurrency()['symbol']],
            'columns'=>[['key'=>'channel','label'=>'Channel'],['key'=>'revenue','label'=>'Revenue'],['key'=>'orders','label'=>'Orders'],['key'=>'share','label'=>'Share']],
            'rows'=>$rows,'empty'=>!$rows,
            'source'=>'Real orders.order_type values from eligible settled orders, normalized only for owner-facing labels.',
        ];
    }

    protected function topItemsPayload(Carbon $start, Carbon $end): array
    {
        if (!$this->hasColumns('order_menus',['order_id','name','quantity','subtotal'])) return $this->emptySource('order_menus item totals unavailable');
        $ids = $this->analyticsEligibleOrders($start,$end)->select('orders.order_id');
        /* PMD_REPORTS_PREFIX_SAFE_ALIASES_V3_3_1 */
        $omAlias = $this->sqlAlias('om');
        $rowsDb = DB::table('order_menus as om')->whereIn('om.order_id',$ids)->groupBy('om.name')
            ->orderByDesc(DB::raw('SUM('.$omAlias.'.`quantity`)'))->limit(100)
            ->selectRaw(
                $omAlias.'.`name` AS name, '.
                'SUM('.$omAlias.'.`quantity`) AS quantity, '.
                'SUM('.$omAlias.'.`subtotal`) AS revenue'
            )->get();
        $rows = $rowsDb->map(fn($r)=>['item'=>(string)$r->name,'quantity'=>number_format((int)$r->quantity),'revenue'=>$this->money((float)$r->revenue)])->all();
        $top = $rowsDb->first();
        return [
            'stats'=>[$this->stat('Items sold',number_format((int)$rowsDb->sum('quantity'))),$this->stat('Item revenue',$this->money((float)$rowsDb->sum('revenue'))),$this->stat('Top item',$top?(string)$top->name:'—')],
            'chart'=>['type'=>'bar','labels'=>$rowsDb->take(12)->pluck('name')->map(fn($v)=>(string)$v)->all(),'values'=>$rowsDb->take(12)->pluck('quantity')->map(fn($v)=>(float)$v)->all(),'money'=>false],
            'columns'=>[['key'=>'item','label'=>'Item'],['key'=>'quantity','label'=>'Quantity'],['key'=>'revenue','label'=>'Revenue']],
            'rows'=>$rows,'empty'=>!$rows,
            'source'=>'Eligible orders joined to order_menus; ranked by sold quantity.',
        ];
    }

    protected function tipsPayload(Carbon $start, Carbon $end): array
    {
        if (!$this->hasColumns('order_totals',['order_id','code','value'])) return $this->emptySource('order_totals tip source unavailable');
        $ids = $this->analyticsEligibleOrders($start,$end)->select('orders.order_id');
        $otAlias = $this->sqlAlias('ot');
        $rowsDb = DB::table('order_totals as ot')
            ->whereRaw("LOWER(TRIM({$otAlias}.`code`))='tip'")
            ->whereIn('ot.order_id',$ids)
            ->groupBy('ot.order_id')->orderByDesc('ot.order_id')->limit(250)
            ->selectRaw(
                $otAlias.'.`order_id` AS order_id, '.
                'SUM('.$otAlias.'.`value`) AS tip'
            )->get();
        $total=(float)$rowsDb->sum('tip'); $count=$rowsDb->count();
        $rows=$rowsDb->map(fn($r)=>['order'=>'#'.(int)$r->order_id,'tip'=>$this->money((float)$r->tip)])->all();
        return [
            'stats'=>[$this->stat('Tips',$this->money($total)),$this->stat('Tipped orders',number_format($count)),$this->stat('Average tip',$count?$this->money($total/$count):$this->money(0))],
            'chart'=>null,
            'columns'=>[['key'=>'order','label'=>'Order'],['key'=>'tip','label'=>'Tip']],
            'rows'=>$rows,'empty'=>!$rows,
            'source'=>'order_totals.code=tip restricted to eligible current-location orders.',
        ];
    }

}
