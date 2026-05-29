<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class OrderEtaService
{
    public static function calculate(array $items, ?int $locationId = null, array $options = []): array
    {
        $s = fn($k,$d)=>self::setting($k,$d);
        $show=(bool)((int)$s('enable_customer_eta',1));
        $smart=(bool)((int)$s('smart_eta_enabled',1));
        $default=max(1,(int)$s('eta_default_prep_minutes',15));
        $window=max(15,(int)$s('eta_order_load_window_minutes',30));
        $busyItem=(int)$s('eta_busy_item_threshold', (int)$s('eta_busy_order_threshold',10));
        $vbusyItem=(int)$s('eta_very_busy_item_threshold', (int)$s('eta_very_busy_order_threshold',25));
        $busyExtra=(int)$s('eta_busy_extra_minutes',5);
        $vbusyExtra=(int)$s('eta_very_busy_extra_minutes',10);
        $round=max(1,(int)$s('eta_round_to_nearest_minutes',5));
        $max=min(240,max(10,(int)$s('eta_max_minutes',90)));

        $base=$default;$qty=0;
        foreach($items as $item){$q=max(1,(int)($item['quantity']??1));$qty+=$q;$prep=(int)($item['prep_time_minutes']??$default);if($prep>$base)$base=$prep;}
        $qbuf=min(15,max(0,($qty-1)*2));

        $activeOrders=0;$activeItems=0;$activeWorkload=0;$lbuf=0;
        $excludeOrder=(int)($options['exclude_order_id']??0);
        if($smart){
            $q=DB::table('orders')->where('created_at','>=',now()->subMinutes($window));
            if($locationId)$q->where('location_id',$locationId);
            if($excludeOrder>0)$q->where('order_id','!=',$excludeOrder);
            $q->whereNotIn('status_id',[5,6]);
            $orderIds=$q->pluck('order_id')->all();
            $activeOrders=count($orderIds);
            if($orderIds){
                $rows=DB::table('order_menus as om')->leftJoin('menus as m','m.menu_id','=','om.menu_id')->whereIn('om.order_id',$orderIds)->select('om.quantity',DB::raw('COALESCE(m.prep_time_minutes,'.$default.') as prep'))->get();
                foreach($rows as $r){$q=(int)($r->quantity??1);$p=max(1,(int)($r->prep??$default));$activeItems+=$q;$activeWorkload+=($q*$p);}    
            }
            if($activeItems>=$vbusyItem)$lbuf=$vbusyExtra; elseif($activeItems>=$busyItem)$lbuf=$busyExtra;
        }

        $staffEnabled=(bool)((int)$s('eta_use_staff_attendance',0));
        $expectedStaff=max(1,(int)$s('eta_expected_kitchen_staff',2));
        $understaffedExtra=max(0,(int)$s('eta_understaffed_extra_minutes',5));
        $checkedIn=null;$staffBuf=0;$bioConfigured=false;
        if($staffEnabled){
            $bioConfigured=Schema::hasTable('biometric_devices') || Schema::hasTable('staff_attendance');
            if($bioConfigured && Schema::hasTable('staff_attendance')){
                $aq=DB::table('staff_attendance')->whereDate('check_in_time', now()->toDateString())->whereNull('check_out_time');
                if($locationId && Schema::hasColumn('staff_attendance','location_id'))$aq->where('location_id',$locationId);
                $checkedIn=(int)$aq->count();
                if($checkedIn<$expectedStaff)$staffBuf=$understaffedExtra;
            }
        }

        $eta=max(10,min($max,$base+$qbuf+$lbuf+$staffBuf));
        $eta=(int)(ceil($eta/$round)*$round);
        return ['show_customer_eta'=>$show,'eta_minutes'=>$eta,'base_minutes'=>$base,'quantity_buffer_minutes'=>$qbuf,'kitchen_load_buffer_minutes'=>$lbuf,'active_order_count'=>$activeOrders,'active_item_count'=>$activeItems,'active_workload_minutes'=>$activeWorkload,'busy_source'=>'items','smart_eta_enabled'=>$smart,'checked_in_staff_count'=>$checkedIn,'expected_kitchen_staff'=>$expectedStaff,'staff_buffer_minutes'=>$staffBuf,'staff_attendance_enabled'=>$staffEnabled&&$bioConfigured];
    }

    private static function setting(string $key,$default){try{return DB::table('settings')->where('item',$key)->orderByDesc('setting_id')->value('value') ?? $default;}catch(\Throwable $e){return $default;}}
}
