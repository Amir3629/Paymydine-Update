<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class OrderEtaService
{
    public static function calculate(array $items, ?int $locationId = null): array
    {
        $s = fn($k,$d)=>self::setting($k,$d);
        $show=(bool)((int)$s('enable_customer_eta',1));
        $smart=(bool)((int)$s('smart_eta_enabled',1));
        $default=max(1,(int)$s('eta_default_prep_minutes',15));
        $window=max(15,(int)$s('eta_order_load_window_minutes',30));
        $busy=(int)$s('eta_busy_order_threshold',6);
        $vbusy=(int)$s('eta_very_busy_order_threshold',13);
        $busyExtra=(int)$s('eta_busy_extra_minutes',5);
        $vbusyExtra=(int)$s('eta_very_busy_extra_minutes',10);
        $round=max(1,(int)$s('eta_round_to_nearest_minutes',5));
        $max=min(240,max(10,(int)$s('eta_max_minutes',90)));

        $base=$default;$qty=0;
        foreach($items as $item){
            $q=max(1,(int)($item['quantity']??1)); $qty+=$q;
            $prep=(int)($item['prep_time_minutes']??$default);
            if($prep>$base)$base=$prep;
        }
        $qbuf=min(15,max(0,($qty-1)*2));
        $active=0;$lbuf=0;
        if($smart){
            $query=DB::table('orders')->where('created_at','>=',now()->subMinutes($window));
            if($locationId)$query->where('location_id',$locationId);
            $query->whereNotIn('status_id',[3,5,6]); // conservative: canceled/completed-like
            $active=(int)$query->count();
            if($active>=$vbusy)$lbuf=$vbusyExtra; elseif($active>=$busy)$lbuf=$busyExtra;
        }
        $eta=max(10,min($max,$base+$qbuf+$lbuf));
        $eta=(int)(ceil($eta/$round)*$round);
        return ['show_customer_eta'=>$show,'eta_minutes'=>$eta,'base_minutes'=>$base,'quantity_buffer_minutes'=>$qbuf,'kitchen_load_buffer_minutes'=>$lbuf,'active_order_count'=>$active,'smart_eta_enabled'=>$smart];
    }

    private static function setting(string $key,$default){
        try{return DB::table('settings')->where('item',$key)->orderByDesc('setting_id')->value('value') ?? $default;}catch(\Throwable $e){return $default;}
    }
}
