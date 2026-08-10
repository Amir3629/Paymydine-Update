<?php

namespace Admin\Controllers\Concerns;

use Admin\Models\Reviews_model;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

trait PmdreportsOperationsConcern
{
    protected function alertsPayload(Carbon $start, Carbon $end): array
    {
        $summary = $this->analyticsAlerts($start, $end); $types = $summary['types'] ?? [];
        $rows = [
            ['alert'=>'Failed payments','count'=>$this->nullableCount($types['failed_payments'] ?? null),'scope'=>'Today'],
            ['alert'=>'Refunds','count'=>$this->nullableCount($types['refunds'] ?? null),'scope'=>'Today'],
            ['alert'=>'Long-open tables','count'=>$this->nullableCount($types['long_open_tables'] ?? null),'scope'=>'Current · '.(int)($summary['long_open_threshold_minutes'] ?? 90).' min threshold'],
            ['alert'=>'Out-of-stock items','count'=>$this->nullableCount($types['out_of_stock'] ?? null),'scope'=>'Current menu state'],
            ['alert'=>'Low reviews','count'=>$this->nullableCount($types['negative_reviews'] ?? null),'scope'=>'Today · rating ≤ 2'],
        ];
        $total = 0; foreach ($types as $v) if (is_numeric($v)) $total += (int)$v;
        return [
            'stats'=>[$this->stat('Open alerts', number_format($total)), $this->stat('Longest open table', isset($summary['longest_open_minutes']) ? $this->duration((int)$summary['longest_open_minutes']) : '—'), $this->stat('Unavailable checks', number_format(count($summary['unavailable'] ?? [])))],
            'chart'=>null,
            'columns'=>[['key'=>'alert','label'=>'Alert'],['key'=>'count','label'=>'Count'],['key'=>'scope','label'=>'Source / scope']],
            'rows'=>$rows, 'empty'=>$total === 0,
            'source'=>$summary['source'] ?? 'Settlement states, stock flags, location reviews and current table operational status.',
        ];
    }

    protected function livePayload(Carbon $now): array
    {
        $query = $this->orders()->where('processed', 0)->leftJoin('statuses as s','s.status_id','=','orders.status_id')
            ->whereRaw("LOWER(COALESCE(ti_s.status_name,'')) NOT REGEXP 'complete|closed|deliver(ed)?|cancel|refund|failed|void'");
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
            'source'=>'Unprocessed current-location orders excluding terminal statuses; occupancy uses Dashboard2 table authority.',
        ];
    }

    protected function reviewsPayload(): array
    {
        if (!Schema::hasTable('reviews')) return $this->emptySource('reviews table unavailable');
        $columns=$this->columns('reviews'); $query=Reviews_model::query();
        if ($this->locationId() && in_array('location_id',$columns,true)) $query->where('location_id',$this->locationId());
        $date=$this->firstColumn($columns,['created_at','updated_at','date_added']);
        $comment=$this->firstColumn($columns,['review_text','comment','review','message']);
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
            'source'=>'Reviews_model scoped to the authenticated restaurant location.',
        ];
    }

    protected function reservationsPayload(Carbon $now): array
    {
        if (!Schema::hasTable('reservations')) return $this->emptySource('reservations table unavailable');
        $columns=$this->columns('reservations');
        if (count(array_diff(['reservation_id','location_id','reserve_date','reserve_time','guest_num'],$columns))) return $this->emptySource('reservation fields unavailable');
        $query=DB::table('reservations as r')->where('r.location_id',$this->locationId())
            ->where(function($q)use($now){$q->whereDate('r.reserve_date','>',$now->toDateString())->orWhere(function($q2)use($now){$q2->whereDate('r.reserve_date','=',$now->toDateString())->where('r.reserve_time','>=',$now->format('H:i:s'));});})
            ->orderBy('r.reserve_date')->orderBy('r.reserve_time')->limit(200);
        $hasStatuses=Schema::hasTable('statuses')&&in_array('status_id',$columns,true)&&$this->hasColumns('statuses',['status_id','status_name']);
        if($hasStatuses)$query->leftJoin('statuses as s','s.status_id','=','r.status_id');
        $select=['r.reservation_id','r.reserve_date','r.reserve_time','r.guest_num']; if(in_array('table_id',$columns,true))$select[]='r.table_id'; if($hasStatuses)$select[]='s.status_name';
        $rowsDb=$query->get($select)->filter(function($r)use($hasStatuses){if(!$hasStatuses)return true;$s=strtolower(trim((string)($r->status_name??'')));return !in_array($s,['cancelled','canceled','rejected','declined','no show','no-show','completed','closed'],true);})->values();
        $ids=$rowsDb->pluck('reservation_id')->map(fn($v)=>(int)$v)->all(); $tableMap=[]; $tableNames=[]; foreach($rowsDb as $r){$direct=(int)($r->table_id??0);if($direct>0)$tableMap[(int)$r->reservation_id][]=$direct;}
        if($ids&&Schema::hasTable('reservation_tables')&&$this->hasColumns('reservation_tables',['reservation_id','table_id'])){
            foreach(DB::table('reservation_tables')->whereIn('reservation_id',$ids)->get(['reservation_id','table_id']) as $p)$tableMap[(int)$p->reservation_id][]=(int)$p->table_id;
            $all=collect($tableMap)->flatten()->unique()->values()->all();
            if($all&&Schema::hasTable('tables')){ $tc=$this->columns('tables');$nc=$this->firstColumn($tc,['table_name','table_no','name']);$sel=['table_id'];if($nc)$sel[]=$nc;foreach(DB::table('tables')->whereIn('table_id',$all)->get($sel) as $t)$tableNames[(int)$t->table_id]=$nc?trim((string)$t->{$nc}):(string)$t->table_id; }
        }
        $rows=$rowsDb->map(function($r)use($tableMap,$tableNames,$hasStatuses){$ids=array_values(array_unique($tableMap[(int)$r->reservation_id]??[]));$labels=array_map(fn($id)=>$tableNames[$id]??(string)$id,$ids);return['reservation'=>'#'.(int)$r->reservation_id,'date'=>(string)$r->reserve_date,'time'=>substr((string)$r->reserve_time,0,5),'guests'=>number_format((int)$r->guest_num),'tables'=>$labels?implode(' + ',$labels):'No table assigned','status'=>$hasStatuses?(trim((string)($r->status_name??''))?:'Upcoming'):'Upcoming'];})->all();
        return [
            'stats'=>[$this->stat('Upcoming',number_format(count($rows))),$this->stat('Guests',number_format((int)$rowsDb->sum('guest_num'))),$this->stat('Next reservation',$rows[0]['date']??'—',$rows[0]['time']??'')],
            'chart'=>null,
            'columns'=>[['key'=>'reservation','label'=>'Reservation'],['key'=>'date','label'=>'Date'],['key'=>'time','label'=>'Time'],['key'=>'guests','label'=>'Guests'],['key'=>'tables','label'=>'Tables'],['key'=>'status','label'=>'Status']],
            'rows'=>$rows,'empty'=>!$rows,
            'source'=>'Future current-location reservations plus reservation_tables and tables; terminal statuses excluded.',
        ];
    }

}
