<?php

namespace Admin\Controllers\Concerns;

use Admin\Models\Reviews_model;
use Admin\Models\Menus_model;
use Admin\Models\Tables_model;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

trait PmdreportsOperationsConcern
{
    protected function alertsPayload(Carbon $start, Carbon $end): array
    {
        $summary = $this->analyticsAlerts($start, $end); $types = $summary['types'] ?? [];
        $rows = $this->alertDetailRows($start, $end);
        if (!$rows) {
            $rows = [
                ['alert'=>'Failed payments','item'=>$this->nullableCount($types['failed_payments'] ?? null),'detail'=>'Selected period','time'=>'—'],
                ['alert'=>'Refunds','item'=>$this->nullableCount($types['refunds'] ?? null),'detail'=>'Selected period','time'=>'—'],
                ['alert'=>'Long-open tables','item'=>$this->nullableCount($types['long_open_tables'] ?? null),'detail'=>'Current · '.(int)($summary['long_open_threshold_minutes'] ?? 90).' min threshold','time'=>'—'],
                ['alert'=>'Out-of-stock items','item'=>$this->nullableCount($types['out_of_stock'] ?? null),'detail'=>'Current menu state','time'=>'—'],
                ['alert'=>'Low reviews','item'=>$this->nullableCount($types['negative_reviews'] ?? null),'detail'=>'Selected period · rating ≤ 2','time'=>'—'],
            ];
        }
        $total = 0; foreach ($types as $v) if (is_numeric($v)) $total += (int)$v;
        return [
            'stats'=>[$this->stat('Open alerts', number_format($total)), $this->stat('Longest open table', isset($summary['longest_open_minutes']) ? $this->duration((int)$summary['longest_open_minutes']) : '—'), $this->stat('Unavailable checks', number_format(count($summary['unavailable'] ?? [])))],
            'chart'=>null,
            'columns'=>[['key'=>'alert','label'=>'Alert'],['key'=>'item','label'=>'Item'],['key'=>'detail','label'=>'Detail'],['key'=>'time','label'=>'Time']],
            'rows'=>$rows, 'empty'=>$total === 0,
            'source'=>$summary['source'] ?? 'Settlement states, stock flags, location reviews and current table operational status.',
        ];
    }

    protected function alertDetailRows(Carbon $start, Carbon $end): array
    {
        $rows=[]; $now=Carbon::now($this->restaurantTimezone());

        try {
            if ($this->hasColumns('orders',['order_id','settlement_status','updated_at'])) {
                $amount=$this->firstColumn($this->columns('orders'),['settled_amount','order_total','total','total_amount','grand_total']);
                $select=['order_id','settlement_status','updated_at']; if($amount)$select[]=$amount;
                $items=$this->orders()->whereBetween('updated_at',[$start->format('Y-m-d H:i:s'),$end->format('Y-m-d H:i:s')])
                    ->whereIn(DB::raw('LOWER(settlement_status)'),['failed','refunded','refund'])->orderByDesc('updated_at')->limit(100)->get($select);
                foreach($items as $item){$state=strtolower((string)$item->settlement_status);$rows[]=['alert'=>str_contains($state,'refund')?'Refund':'Failed payment','item'=>'#'.(int)$item->order_id,'detail'=>$amount?$this->money((float)$item->{$amount}):ucfirst($state),'time'=>$this->dateTime((string)$item->updated_at)];}
            }
        } catch (\Throwable $error) {}

        try {
            if (Schema::hasColumn('menus','is_stock_out')) {
                Menus_model::query()->whereHasOrDoesntHaveLocation($this->locationId())->stockOut()->limit(100)->get()->each(function($menu)use(&$rows){$rows[]=['alert'=>'Out of stock','item'=>(string)($menu->menu_name??('Menu #'.(int)$menu->menu_id)),'detail'=>'Marked unavailable for ordering','time'=>'Current'];});
            }
        } catch (\Throwable $error) {}

        try {
            if (Schema::hasTable('reviews')) {
                $columns=$this->columns('reviews'); $date=$this->firstColumn($columns,['created_at','updated_at','date_added']); $comment=$this->firstColumn($columns,['review_text','comment','review','message']);
                $query=Reviews_model::query(); if($this->locationId()&&in_array('location_id',$columns,true))$query->where('location_id',$this->locationId());
                if($date)$query->whereBetween($date,[$start->format('Y-m-d H:i:s'),$end->format('Y-m-d H:i:s')]);
                foreach($query->orderByDesc($date?:'review_id')->limit(100)->get() as $review){$rating=null;if(count(array_diff(['quality','service','delivery'],$columns))===0){$v=[(float)($review->quality??0),(float)($review->service??0),(float)($review->delivery??0)];if(array_sum($v)>0)$rating=array_sum($v)/3;}elseif(in_array('rating',$columns,true)){$rating=(float)($review->rating??0);}if($rating===null||$rating>2)continue;$rows[]=['alert'=>'Low review','item'=>number_format($rating,1).' / 5','detail'=>$comment?(mb_substr(strip_tags((string)($review->{$comment}??'')),0,140)?:'Low guest rating'):'Low guest rating','time'=>$date?$this->dateTime((string)$review->{$date}):'Today'];}
            }
        } catch (\Throwable $error) {}

        try {
            $threshold=max(15,min(720,(int)setting('pmd_dashboard2_long_open_minutes',90)));
            if(Schema::hasTable('tables')){
                $tableIds=Tables_model::query()->whereHasLocation($this->locationId())->isEnabled()->pluck('table_id');
                $status=Schema::hasColumn('tables','operational_status')?'operational_status':(Schema::hasColumn('tables','table_status')?'table_status':null);
                $updated=Schema::hasColumn('tables','operational_status_updated_at')?'operational_status_updated_at':(Schema::hasColumn('tables','updated_at')?'updated_at':null);
                $name=$this->firstColumn($this->columns('tables'),['table_name','table_no','name']);
                if($tableIds->isNotEmpty()&&$status&&$updated){$select=['table_id',$status,$updated];if($name)$select[]=$name;foreach(DB::table('tables')->whereIn('table_id',$tableIds)->whereIn(DB::raw('LOWER(TRIM('.$status.'))'),['occupied','seated','in_use','in-use','busy'])->whereNotNull($updated)->where($updated,'<=',$now->copy()->subMinutes($threshold)->format('Y-m-d H:i:s'))->orderBy($updated)->limit(100)->get($select) as $table){$minutes=0;try{$minutes=Carbon::parse((string)$table->{$updated},$this->restaurantTimezone())->diffInMinutes($now);}catch(\Throwable $error){}$rows[]=['alert'=>'Long-open table','item'=>$name?(string)$table->{$name}:'Table #'.(int)$table->table_id,'detail'=>$this->duration($minutes).' open','time'=>$this->dateTime((string)$table->{$updated})];}}
            }
        } catch (\Throwable $error) {}

        return $rows;
    }

    protected function livePayload(Carbon $start, Carbon $end): array
    {
        $now = Carbon::now($this->restaurantTimezone());
        $query = $this->orders()->where('processed', 0)->leftJoin('statuses as s','s.status_id','=','orders.status_id')
            ->whereRaw("LOWER(COALESCE(ti_s.status_name,'')) NOT REGEXP 'complete|closed|deliver(ed)?|cancel|refund|failed|void'")
            ->whereBetween('orders.created_at', [$start->format('Y-m-d H:i:s'), $end->format('Y-m-d H:i:s')]);
        $count = (clone $query)->count();
        $rowsDb = $query->orderByDesc('orders.created_at')->limit(200)->get(['orders.order_id','orders.order_type','orders.created_at','s.status_name']);
        $rows = $rowsDb->map(function ($r) use ($now) {
            $minutes = 0; try { $minutes = Carbon::parse((string)$r->created_at, $this->restaurantTimezone())->diffInMinutes($now); } catch (\Throwable $error) {}
            return ['order'=>'#'.(int)$r->order_id,'channel'=>$this->channelLabel((string)$r->order_type),'status'=>(string)($r->status_name ?: 'Open'),'opened'=>$this->dateTime((string)$r->created_at),'age'=>$this->duration($minutes)];
        })->all();
        $occupancy = $this->occupancy();
        return [
            'stats'=>[$this->stat('Live orders', number_format($count)), $this->stat('Occupied tables', number_format((int)($occupancy['occupied_tables'] ?? 0))), $this->stat('Enabled tables', number_format((int)($occupancy['available_tables'] ?? 0)))],
            'chart'=>null,
            'columns'=>[['key'=>'order','label'=>'Order'],['key'=>'channel','label'=>'Channel'],['key'=>'status','label'=>'Status'],['key'=>'opened','label'=>'Opened'],['key'=>'age','label'=>'Age']],
            'rows'=>$rows,'empty'=>$count===0,
            'source'=>'Current open orders created inside the selected report window; occupancy remains the live Dashboard2 table authority.',
        ];
    }

    protected function reviewsPayload(Carbon $start, Carbon $end): array
    {
        if (!Schema::hasTable('reviews')) return $this->emptySource('reviews table unavailable');
        $columns=$this->columns('reviews'); $query=Reviews_model::query();
        if ($this->locationId() && in_array('location_id',$columns,true)) $query->where('location_id',$this->locationId());
        $date=$this->firstColumn($columns,['created_at','updated_at','date_added']);
        $comment=$this->firstColumn($columns,['review_text','comment','review','message']);
        if ($date) $query->whereBetween($date, [$start->format('Y-m-d H:i:s'), $end->format('Y-m-d H:i:s')]);
        $rowsDb=$query->orderByDesc($date ?: 'review_id')->limit(200)->get();
        $rows=[]; $ratings=[];
        foreach ($rowsDb as $r) {
            $rating=null;
            if (count(array_diff(['quality','service','delivery'],$columns))===0) { $vals=[(float)($r->quality??0),(float)($r->service??0),(float)($r->delivery??0)]; if(array_sum($vals)>0)$rating=array_sum($vals)/3; }
            elseif(in_array('rating',$columns,true) && (float)($r->rating??0)>0)$rating=(float)$r->rating;
            if($rating!==null)$ratings[]=$rating;
            $rows[]=['rating'=>$rating===null?'—':number_format($rating,1).' / 5','comment'=>$comment?mb_substr(strip_tags((string)($r->{$comment}??'')),0,240):'','status'=>in_array('review_status',$columns,true)?((int)$r->review_status?'Approved':'Pending'):'—','date'=>$date?$this->dateTime((string)$r->{$date}):'—'];
        }
        $avg=$ratings?array_sum($ratings)/count($ratings):null;
        return [
            'stats'=>[$this->stat('Reviews shown',number_format(count($rows))),$this->stat('Average rating',$avg===null?'—':number_format($avg,1).' / 5'),$this->stat('Rated reviews',number_format(count($ratings)))],
            'chart'=>null,
            'columns'=>[['key'=>'rating','label'=>'Rating'],['key'=>'comment','label'=>'Comment'],['key'=>'status','label'=>'Status'],['key'=>'date','label'=>'Date']],
            'rows'=>$rows,'empty'=>!$rows,
            'source'=>'Reviews_model scoped to the authenticated restaurant location and selected report window.',
        ];
    }

    protected function reservationsPayload(Carbon $start, Carbon $end, string $period): array
    {
        if (!Schema::hasTable('reservations')) return $this->emptySource('reservations table unavailable');
        $columns=$this->columns('reservations');
        if (count(array_diff(['reservation_id','location_id','reserve_date','reserve_time','guest_num'],$columns))) return $this->emptySource('reservation fields unavailable');

        $query=DB::table('reservations as r')->where('r.location_id',$this->locationId())
            ->whereDate('r.reserve_date','>=',$start->toDateString())
            ->whereDate('r.reserve_date','<=',$end->toDateString())
            ->orderBy('r.reserve_date')->orderBy('r.reserve_time')->limit(300);

        $hasStatuses=Schema::hasTable('statuses')&&in_array('status_id',$columns,true)&&$this->hasColumns('statuses',['status_id','status_name']);
        if($hasStatuses)$query->leftJoin('statuses as s','s.status_id','=','r.status_id');
        $select=['r.reservation_id','r.reserve_date','r.reserve_time','r.guest_num']; if(in_array('table_id',$columns,true))$select[]='r.table_id'; if($hasStatuses)$select[]='s.status_name';
        $rowsDb=$query->get($select)->filter(function($r)use($hasStatuses){if(!$hasStatuses)return true;$s=strtolower(trim((string)($r->status_name??'')));return !in_array($s,['cancelled','canceled','rejected','declined','no show','no-show'],true);})->values();
        $ids=$rowsDb->pluck('reservation_id')->map(fn($v)=>(int)$v)->all(); $tableMap=[]; $tableNames=[]; foreach($rowsDb as $r){$direct=(int)($r->table_id??0);if($direct>0)$tableMap[(int)$r->reservation_id][]=$direct;}
        if($ids&&Schema::hasTable('reservation_tables')&&$this->hasColumns('reservation_tables',['reservation_id','table_id'])){
            foreach(DB::table('reservation_tables')->whereIn('reservation_id',$ids)->get(['reservation_id','table_id']) as $p)$tableMap[(int)$p->reservation_id][]=(int)$p->table_id;
            $all=collect($tableMap)->flatten()->unique()->values()->all();
            if($all&&Schema::hasTable('tables')){ $tc=$this->columns('tables');$nc=$this->firstColumn($tc,['table_name','table_no','name']);$sel=['table_id'];if($nc)$sel[]=$nc;foreach(DB::table('tables')->whereIn('table_id',$all)->get($sel) as $t)$tableNames[(int)$t->table_id]=$nc?trim((string)$t->{$nc}):(string)$t->table_id; }
        }
        $rows=$rowsDb->map(function($r)use($tableMap,$tableNames,$hasStatuses){$ids=array_values(array_unique($tableMap[(int)$r->reservation_id]??[]));$labels=array_map(fn($id)=>$tableNames[$id]??(string)$id,$ids);return['reservation'=>'#'.(int)$r->reservation_id,'date'=>(string)$r->reserve_date,'time'=>substr((string)$r->reserve_time,0,5),'guests'=>number_format((int)$r->guest_num),'tables'=>$labels?implode(' + ',$labels):'No table assigned','status'=>$hasStatuses?(trim((string)($r->status_name??''))?:'Scheduled'):'Scheduled'];})->all();
        return [
            'stats'=>[$this->stat('Reservations',number_format(count($rows))),$this->stat('Guests',number_format((int)$rowsDb->sum('guest_num'))),$this->stat('First reservation',$rows[0]['date']??'—',$rows[0]['time']??'')],
            'chart'=>null,
            'columns'=>[['key'=>'reservation','label'=>'Reservation'],['key'=>'date','label'=>'Date'],['key'=>'time','label'=>'Time'],['key'=>'guests','label'=>'Guests'],['key'=>'tables','label'=>'Tables'],['key'=>'status','label'=>'Status']],
            'rows'=>$rows,'empty'=>!$rows,
            'source'=>'Current-location reservations inside the selected report window plus reservation_tables and tables; cancelled/rejected/no-show rows excluded.',
        ];
    }

}
