<?php

namespace App\Services\Financial;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

final class BillingGroupPaymentService
{
    /** @var BillingGroupService */
    private $groups;

    public function __construct(BillingGroupService $groups) { $this->groups=$groups; }

    public function reserve(string $publicId,array $in): array
    {
        if(!BillingGroupService::schemaReady())throw new RuntimeException('R36 billing-group schema is not installed.');
        $key=trim((string)($in['idempotency_key']??'')); if($key===''||strlen($key)>191)throw new InvalidArgumentException('A valid payment idempotency key is required.');
        return DB::transaction(function()use($publicId,$in,$key){
            $g=DB::table('pmd_billing_groups')->where('public_id',trim($publicId))->lockForUpdate()->first(); if(!$g)throw new RuntimeException('Billing group not found.');
            $table=trim((string)($in['table_id']??'')); if($table!==''&&$table!==(string)$g->table_id)throw new RuntimeException('Billing group does not belong to this table.');
            if($g->mode!=='r36')throw new RuntimeException('This visit must finish through the legacy payment path.');
            if($g->status!=='open')throw new RuntimeException('Billing group is closed.');
            if($g->payment_status==='reconciliation_required')throw new RuntimeException('Billing group requires reconciliation before another payment can start.');

            $old=DB::table('pmd_billing_group_payments')->where('idempotency_key',$key)->lockForUpdate()->first();
            if($old){if((int)$old->billing_group_id!==(int)$g->id)throw new RuntimeException('Idempotency key belongs to another billing group.');return $this->payload($old,true);}

            DB::table('pmd_billing_group_payments')->where('billing_group_id',$g->id)->where('status','reserved')->whereNotNull('reserved_until')->where('reserved_until','<=',now())->update(['status'=>'expired','updated_at'=>now()]);
            $summary=$this->groups->refreshGroupById((int)$g->id); $state=$this->groups->componentState((int)$g->id,true);
            if(!$summary)throw new RuntimeException('Billing group could not be refreshed.');

            $reservedOrders=[];$reservedService=0;
            $active=DB::table('pmd_billing_group_payments')->where('billing_group_id',$g->id)->where('status','reserved')->where(function($q){$q->whereNull('reserved_until')->orWhere('reserved_until','>',now());})->lockForUpdate()->get();
            foreach($active as $r){$a=$this->json($r->allocation_snapshot);foreach((array)($a['orders']??[]) as $row){$oid=(int)($row['order_id']??0);if($oid)$reservedOrders[$oid]=($reservedOrders[$oid]??0)+max(0,(int)($row['base_cents']??0));}$reservedService+=max(0,(int)($a['service_component_cents']??0));}
            $available=[];foreach($state['orders'] as $oid=>$row)$available[(int)$oid]=max(0,(int)$row['remaining_cents']-(int)($reservedOrders[$oid]??0));
            $availableService=max(0,(int)$state['service_component_remaining_cents']-$reservedService); $availablePrincipal=array_sum($available)+$availableService;
            if($availablePrincipal<1)throw new RuntimeException('No unreserved balance remains on this billing group.');

            $principal=$this->readCents($in,'principal_cents','principal_amount');$service=max(0,(int)($in['service_component_cents']??0));$rows=[];
            if(is_array($in['allocations']??null)&&$in['allocations']){
                $seen=[];foreach($in['allocations'] as $r){if(!is_array($r))continue;$oid=(int)($r['order_id']??0);$c=max(0,(int)($r['base_cents']??$r['principal_cents']??0));if($oid<1||$c<1)continue;if(isset($seen[$oid]))throw new RuntimeException('Duplicate child order in allocation.');if(!array_key_exists($oid,$available)||$c>$available[$oid])throw new RuntimeException('Allocation exceeds child-order balance.');$seen[$oid]=1;$rows[]=['order_id'=>$oid,'base_cents'=>$c,'selected_items'=>is_array($r['selected_items']??null)?$r['selected_items']:null];}
                if(!$rows)throw new RuntimeException('No valid child-order allocations supplied.');usort($rows,fn($a,$b)=>$a['order_id']<=>$b['order_id']);if($service>$availableService)throw new RuntimeException('Service allocation exceeds remaining service component.');$allocated=array_sum(array_column($rows,'base_cents'))+$service;if($principal<1)$principal=$allocated;if($allocated!==$principal)throw new RuntimeException('Allocations do not equal requested principal.');
            }else{
                if($principal<1&&!empty($in['pay_full_remaining']))$principal=$availablePrincipal;if($principal<1)throw new InvalidArgumentException('Payment principal must be greater than zero.');if($principal>$availablePrincipal)throw new RuntimeException('Payment principal exceeds available balance.');
                $left=$principal;ksort($available);foreach($available as $oid=>$c){if($left<1)break;$take=min($left,$c);if($take>0){$rows[]=['order_id'=>$oid,'base_cents'=>$take,'selected_items'=>null];$left-=$take;}}$service=min($left,$availableService);$left-=$service;if($left!==0)throw new RuntimeException('Principal could not be allocated deterministically.');
            }

            $tip=max(0,$this->readCents($in,'tip_cents','tip_amount'));$discount=max(0,$this->readCents($in,'discount_cents','discount_amount'));
            if($discount>0&&($active->count()>0||$principal!==(int)$summary['remainingCents']))throw new RuntimeException('Discounts require the full final remaining balance.');
            $payable=$principal+$tip-$discount;if($payable<1)throw new RuntimeException('Payable amount must be greater than zero.');
            $method=strtolower(trim((string)($in['method']??'')));if($method==='')throw new InvalidArgumentException('Payment method is required.');$provider=strtolower(trim((string)($in['provider']??'')));$pid=(string)Str::uuid();$ttl=max(2,min(30,(int)($in['reservation_minutes']??12)));
            $allocation=['version'=>1,'orders'=>$rows,'service_component_cents'=>$service,'principal_cents'=>$principal,'group_total_cents_at_reservation'=>(int)$summary['totalCents'],'group_paid_cents_at_reservation'=>(int)$summary['paidCents'],'selected_items'=>is_array($in['selected_items']??null)?$in['selected_items']:null];
            DB::table('pmd_billing_group_payments')->insert(['billing_group_id'=>(int)$g->id,'payment_id'=>$pid,'idempotency_key'=>$key,'provider'=>$provider!==''?substr($provider,0,50):null,'provider_reference'=>null,'method'=>substr($method,0,50),'status'=>'reserved','principal_cents'=>$principal,'tip_cents'=>$tip,'discount_cents'=>$discount,'payable_cents'=>$payable,'coupon_code'=>($c=trim((string)($in['coupon_code']??'')))!==''?substr(strtoupper($c),0,191):null,'cash_received_cents'=>null,'change_due_cents'=>0,'payer_label'=>($p=trim((string)($in['payer_label']??'')))!==''?substr($p,0,191):null,'allocation_snapshot'=>json_encode($allocation,JSON_UNESCAPED_SLASHES),'provider_evidence'=>null,'settlement_attempts'=>0,'reserved_until'=>now()->addMinutes($ttl),'created_at'=>now(),'updated_at'=>now()]);
            return $this->payload(DB::table('pmd_billing_group_payments')->where('payment_id',$pid)->first(),false);
        });
    }

    public function settle(string $paymentId,array $in): array
    {
        $paymentId=trim($paymentId);if($paymentId==='')throw new InvalidArgumentException('Payment id is required.');$ref=trim((string)($in['provider_reference']??''));$confirmed=!empty($in['provider_confirmed'])||$ref!=='';
        try{return DB::transaction(function()use($paymentId,$in,$ref,$confirmed){
            $p=DB::table('pmd_billing_group_payments')->where('payment_id',$paymentId)->lockForUpdate()->first();if(!$p)throw new RuntimeException('Billing-group payment reservation not found.');
            $g=DB::table('pmd_billing_groups')->where('id',$p->billing_group_id)->lockForUpdate()->first();if(!$g)throw new RuntimeException('Billing group not found.');if($g->mode!=='r36')throw new RuntimeException('Legacy group cannot use R36 settlement.');
            if($p->status==='settled'){if($ref!==''&&$p->provider_reference!==null&&$p->provider_reference!==$ref)throw new RuntimeException('Payment already settled with a different provider reference.');return $this->payload($p,true);}
            if(!in_array($p->status,['reserved','reconciliation_required','expired'],true))throw new RuntimeException('Payment is not settleable.');if($p->status==='expired'&&empty($in['provider_confirmed'])&&$ref==='')throw new RuntimeException('Reservation expired before provider confirmation.');
            if($ref!==''&&DB::table('pmd_billing_group_payments')->where('provider_reference',$ref)->where('payment_id','!=',$paymentId)->lockForUpdate()->exists())throw new RuntimeException('Provider reference already belongs to another payment.');

            $a=$this->json($p->allocation_snapshot);$state=$this->groups->componentState((int)$g->id,true);$base=[];
            foreach((array)($a['orders']??[]) as $r){$oid=(int)($r['order_id']??0);$c=max(0,(int)($r['base_cents']??0));if($oid<1||$c<1)continue;if(!isset($state['orders'][$oid])||$c>(int)$state['orders'][$oid]['remaining_cents'])throw new RuntimeException('Reserved child-order balance changed before settlement.');$base[$oid]=($base[$oid]??0)+$c;}
            $service=max(0,(int)($a['service_component_cents']??0));if($service>(int)$state['service_component_remaining_cents'])throw new RuntimeException('Reserved service balance changed before settlement.');if(array_sum($base)+$service!==(int)$p->principal_cents)throw new RuntimeException('Allocation snapshot no longer matches principal.');
            $this->assertLegacySchema($base);

            $oids=array_keys($base);$weights=array_values($base);$tips=$weights?DeterministicSplit::weighted((int)$p->tip_cents,$weights):[];$discounts=$weights?DeterministicSplit::weighted((int)$p->discount_cents,$weights):[];
            foreach($oids as $i=>$oid){$c=$base[$oid];$tip=(int)($tips[$i]??0);$discount=(int)($discounts[$i]??0);$o=DB::table('orders')->where('order_id',$oid)->lockForUpdate()->first();if(!$o)throw new RuntimeException('Child order disappeared during settlement.');$legacyKey='r36:'.$paymentId.':'.$oid;$tx=DB::table('order_payment_transactions')->where('idempotency_key',$legacyKey)->lockForUpdate()->first();$total=(int)$state['orders'][$oid]['total_cents'];$current=min($total,$this->cents($o->settled_amount??0));$new=min($total,$current+$c);$status=$new>=$total?'paid':'partial';
                if(!$tx){$txid=DB::table('order_payment_transactions')->insertGetId($this->filter('order_payment_transactions',['order_id'=>$oid,'payment_method'=>$p->method,'provider_code'=>$p->provider,'payment_reference'=>$ref!==''?$ref:null,'idempotency_key'=>$legacyKey,'amount'=>max(0,$c+$tip-$discount)/100,'tip_amount'=>$tip/100,'coupon_discount'=>$discount/100,'coupon_code'=>$p->coupon_code,'settlement_status'=>$status,'payer_label'=>$p->payer_label,'notes'=>'R36 billing group '.$g->public_id.' payment '.$paymentId,'paid_at'=>now(),'created_at'=>now(),'updated_at'=>now()]));$this->mirrorItems((int)$txid,$oid,$c);}
                $u=['settled_amount'=>$new/100,'settlement_status'=>$status,'updated_at'=>now()];if(Schema::hasColumn('orders','settlement_method'))$u['settlement_method']=$p->method;if(Schema::hasColumn('orders','settlement_reference')&&$ref!=='')$u['settlement_reference']=$ref;if(Schema::hasColumn('orders','settled_at')&&$status==='paid')$u['settled_at']=now();DB::table('orders')->where('order_id',$oid)->update($this->filter('orders',$u));
            }

            $cash=array_key_exists('cash_received_cents',$in)?max(0,(int)$in['cash_received_cents']):(array_key_exists('cash_received',$in)?max(0,$this->cents($in['cash_received'])):null);if($cash!==null&&$cash<(int)$p->payable_cents)throw new RuntimeException('Cash received is lower than payable amount.');$change=$cash===null?0:$cash-(int)$p->payable_cents;$evidence=is_array($in['provider_evidence']??null)?$in['provider_evidence']:[];if($ref!=='')$evidence['provider_reference']=$ref;
            DB::table('pmd_billing_group_payments')->where('id',$p->id)->update(['provider_reference'=>$ref!==''?$ref:$p->provider_reference,'status'=>'settled','cash_received_cents'=>$cash,'change_due_cents'=>$change,'provider_evidence'=>$evidence?json_encode($evidence,JSON_UNESCAPED_SLASHES):$p->provider_evidence,'settlement_attempts'=>(int)$p->settlement_attempts+1,'provider_confirmed_at'=>$confirmed?now():$p->provider_confirmed_at,'settled_at'=>now(),'reconciliation_reason'=>null,'updated_at'=>now()]);
            $fresh=DB::table('pmd_billing_group_payments')->where('id',$p->id)->first();$out=$this->payload($fresh,false);$out['billingGroup']=$this->groups->refreshGroupById((int)$g->id);return $out;
        });}catch(\Throwable $e){if($confirmed)$this->markReconciliation($paymentId,$e->getMessage(),$in);throw $e;}
    }

    public function status(string $paymentId): ?array {if(!BillingGroupService::schemaReady())return null;$r=DB::table('pmd_billing_group_payments')->where('payment_id',trim($paymentId))->first();return $r?$this->payload($r,false):null;}

    private function assertLegacySchema(array $base): void {if(!$base)return;if(!Schema::hasTable('order_payment_transactions')||!Schema::hasColumn('order_payment_transactions','idempotency_key')||!Schema::hasTable('order_payment_transaction_items'))throw new RuntimeException('Legacy payment ledger is not ready for R36 mirroring.');$c=Schema::getColumnListing('order_payment_transaction_items');if(!in_array('order_menu_id',$c,true)&&!in_array('order_item_id',$c,true))throw new RuntimeException('Legacy allocation ledger lacks an order-menu link.');}
    private function mirrorItems(int $txid,int $oid,int $base): void
    {
        if($base<1)return;$cols=Schema::getColumnListing('order_payment_transaction_items');$key=in_array('order_menu_id',$cols,true)?'order_menu_id':'order_item_id';$left=$base;$rows=[];
        foreach(DB::table('order_menus')->where('order_id',$oid)->orderBy('order_menu_id')->lockForUpdate()->get() as $m){if($left<1)break;$unit=max(1,$this->cents($m->price));$line=max(0,$this->cents($m->subtotal));$take=min($left,$line);if($take<1)continue;$qty=min((float)$m->quantity,round($take/$unit,3));$r=['transaction_id'=>$txid,$key=>(int)$m->order_menu_id,'quantity_paid'=>$qty,'unit_price'=>$unit/100,'line_total'=>$take/100,'created_at'=>now(),'updated_at'=>now()];if(in_array('menu_id',$cols,true))$r['menu_id']=(int)$m->menu_id;if(in_array('order_menu_id',$cols,true))$r['order_menu_id']=(int)$m->order_menu_id;$rows[]=array_intersect_key($r,array_flip($cols));$left-=$take;}if($rows)DB::table('order_payment_transaction_items')->insert($rows);
    }
    private function markReconciliation(string $pid,string $reason,array $in): void {try{DB::transaction(function()use($pid,$reason,$in){$p=DB::table('pmd_billing_group_payments')->where('payment_id',$pid)->lockForUpdate()->first();if(!$p||$p->status==='settled')return;$ref=trim((string)($in['provider_reference']??''));$e=is_array($in['provider_evidence']??null)?$in['provider_evidence']:[];if($ref!=='')$e['provider_reference']=$ref;$msg=substr(trim($reason)?:'Post-provider settlement failure.',0,5000);DB::table('pmd_billing_group_payments')->where('id',$p->id)->update(['provider_reference'=>$ref!==''?$ref:$p->provider_reference,'status'=>'reconciliation_required','provider_evidence'=>$e?json_encode($e,JSON_UNESCAPED_SLASHES):$p->provider_evidence,'settlement_attempts'=>(int)$p->settlement_attempts+1,'provider_confirmed_at'=>now(),'reconciliation_reason'=>$msg,'updated_at'=>now()]);DB::table('pmd_billing_groups')->where('id',$p->billing_group_id)->update(['payment_status'=>'reconciliation_required','reconciliation_reason'=>$msg,'updated_at'=>now()]);});}catch(\Throwable $ignored){}}
    private function payload($r,bool $duplicate): array {return ['paymentId'=>$r->payment_id,'duplicate'=>$duplicate,'status'=>$r->status,'method'=>$r->method,'provider'=>$r->provider,'providerReference'=>$r->provider_reference,'principalCents'=>(int)$r->principal_cents,'tipCents'=>(int)$r->tip_cents,'discountCents'=>(int)$r->discount_cents,'payableCents'=>(int)$r->payable_cents,'currency'=>(string)(DB::table('pmd_billing_groups')->where('id',$r->billing_group_id)->value('currency')?:'EUR'),'payerLabel'=>$r->payer_label,'allocation'=>$this->json($r->allocation_snapshot),'reservedUntil'=>$r->reserved_until,'settledAt'=>$r->settled_at,'reconciliationRequired'=>$r->status==='reconciliation_required','reconciliationReason'=>$r->reconciliation_reason];}
    private function readCents(array $in,string $ck,string $mk): int {if(isset($in[$ck])&&$in[$ck]!=='')return (int)$in[$ck];return isset($in[$mk])&&$in[$mk]!==''?$this->cents($in[$mk]):0;}
    private function filter(string $table,array $data): array {return Schema::hasTable($table)?array_intersect_key($data,array_flip(Schema::getColumnListing($table))):$data;}
    private function cents($v): int {return (int)round(((float)$v)*100,0,PHP_ROUND_HALF_UP);} private function json($v): array {$d=json_decode((string)$v,true);return is_array($d)?$d:[];}
}
