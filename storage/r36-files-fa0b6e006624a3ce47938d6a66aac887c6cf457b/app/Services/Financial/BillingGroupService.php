<?php

namespace App\Services\Financial;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;

final class BillingGroupService
{
    public static function schemaReady(): bool
    {
        try {
            return Schema::hasTable('pmd_billing_groups')
                && Schema::hasTable('pmd_billing_group_orders')
                && Schema::hasTable('pmd_billing_group_payments')
                && Schema::hasColumn('pmd_billing_groups', 'mode')
                && Schema::hasColumn('pmd_billing_group_orders', 'source')
                && Schema::hasColumn('pmd_billing_group_payments', 'payable_cents');
        } catch (\Throwable $e) { return false; }
    }

    public function synchronizeTableSession(string $tableId, string $sessionKey): ?array
    {
        if (!self::schemaReady() || trim($tableId) === '' || trim($sessionKey) === '') return null;
        return DB::transaction(function () use ($tableId, $sessionKey) {
            $group = $this->group(trim($tableId), trim($sessionKey));
            if (Schema::hasTable('pmd_table_order_drafts')) {
                $ids = DB::table('pmd_table_order_drafts')->where('session_key', trim($sessionKey))
                    ->where('status', 'submitted')->whereNotNull('order_id')->orderBy('order_id')->pluck('order_id');
                // Preflight the whole visit before normalizing any child. If one
                // child already has financial activity, preserve the entire visit
                // as legacy passthrough so no earlier unpaid child is repriced.
                if ($group->mode === 'r36') {
                    foreach ($ids as $id) {
                        $o = DB::table('orders')->where('order_id', (int)$id)->lockForUpdate()->first();
                        if ($o && $this->hasFinancialActivity((int)$id, $o)) {
                            DB::table('pmd_billing_groups')->where('id', $group->id)->update(['mode'=>'legacy_passthrough','updated_at'=>now()]);
                            $group->mode = 'legacy_passthrough';
                            break;
                        }
                    }
                }
                foreach ($ids as $id) $this->attach($group, (int)$id, 'qr_round');
            }
            return $this->refresh((int)$group->id);
        });
    }

    public function attachWaiterOrder(int $orderId, string $tableId): ?array
    {
        if (!self::schemaReady() || $orderId < 1 || trim($tableId) === '') return null;
        return DB::transaction(function () use ($orderId, $tableId) {
            $link = DB::table('pmd_billing_group_orders')->where('order_id', $orderId)->lockForUpdate()->first();
            if ($link) {
                $group = DB::table('pmd_billing_groups')->where('id', (int)$link->billing_group_id)->lockForUpdate()->first();
                if (!$group) throw new RuntimeException('Orphaned billing-group order link.');
            } else {
                $group = DB::table('pmd_billing_groups')->where('table_id', trim($tableId))->where('status', 'open')
                    ->orderByDesc('id')->lockForUpdate()->first();
                if (!$group) $group = $this->group(trim($tableId), $this->waiterSession(trim($tableId), $orderId));
            }
            $this->attach($group, $orderId, 'waiter_pos');
            return $this->refresh((int)$group->id);
        });
    }

    public function isOrderMutationLocked(int $orderId): bool
    {
        if (!self::schemaReady()) return false;
        $link = DB::table('pmd_billing_group_orders')->where('order_id', $orderId)->first();
        if (!$link) return false;
        $group = DB::table('pmd_billing_groups')->where('id', (int)$link->billing_group_id)->first();
        if (!$group || $group->mode !== 'r36' || $group->status !== 'open') return false;
        return DB::table('pmd_billing_group_payments')->where('billing_group_id', (int)$group->id)
            ->where(function ($q) { $q->whereIn('status', ['settled','reconciliation_required'])
                ->orWhere(function ($r) { $r->where('status','reserved')->where(function ($x) { $x->whereNull('reserved_until')->orWhere('reserved_until','>',now()); }); });
            })->exists();
    }

    public function summaryForPublicId(string $publicId): ?array
    {
        if (!self::schemaReady()) return null;
        $g = DB::table('pmd_billing_groups')->where('public_id', trim($publicId))->first();
        return $g ? DB::transaction(fn() => $this->refresh((int)$g->id)) : null;
    }

    public function findOpenSummaryForTable(string $tableId): ?array
    {
        if (!self::schemaReady()) return null;
        $g = DB::table('pmd_billing_groups')->where('table_id', trim($tableId))->where('status','open')->orderByDesc('id')->first();
        return $g ? DB::transaction(fn() => $this->refresh((int)$g->id)) : null;
    }

    public function componentState(int $groupId, bool $lock = false): array
    {
        $links = DB::table('pmd_billing_group_orders')->where('billing_group_id',$groupId)->orderBy('order_id')->get();
        $ids = $links->pluck('order_id')->map(fn($v)=>(int)$v)->all();
        $orders = [];
        if ($ids) { $q=DB::table('orders')->whereIn('order_id',$ids)->orderBy('order_id'); if($lock)$q->lockForUpdate(); foreach($q->get() as $o)$orders[(int)$o->order_id]=$o; }
        $out=[];
        foreach($links as $l){ $s=$this->json($l->financial_snapshot); $id=(int)$l->order_id; $total=(int)($s['total_cents']??0); $paid=isset($orders[$id])?min($total,$this->cents($orders[$id]->settled_amount??0)):0; $out[$id]=['order_id'=>$id,'total_cents'=>$total,'remaining_cents'=>max(0,$total-$paid)]; }
        $g=DB::table('pmd_billing_groups')->where('id',$groupId)->first(); if(!$g)throw new RuntimeException('Billing group not found.');
        $vat=$this->json($g->vat_snapshot); $svc=(int)$g->service_charge_cents+(int)($vat['service_charge_tax_added_cents']??0); $paidSvc=0;
        foreach(DB::table('pmd_billing_group_payments')->where('billing_group_id',$groupId)->where('status','settled')->get() as $p){$a=$this->json($p->allocation_snapshot);$paidSvc+=(int)($a['service_component_cents']??0);}
        return ['orders'=>$out,'service_component_remaining_cents'=>max(0,$svc-$paidSvc)];
    }

    private function group(string $tableId, string $sessionKey)
    {
        $g=DB::table('pmd_billing_groups')->where('table_id',$tableId)->where('session_key',$sessionKey)->lockForUpdate()->first();
        if($g)return $g;
        try{DB::table('pmd_billing_groups')->insert(['public_id'=>(string)Str::uuid(),'table_id'=>$tableId,'session_key'=>$sessionKey,'mode'=>'r36','status'=>'open','currency'=>$this->currency(),'payment_status'=>'unpaid','fiscal_status'=>'not_required','created_at'=>now(),'updated_at'=>now()]);}catch(\Throwable $e){}
        $g=DB::table('pmd_billing_groups')->where('table_id',$tableId)->where('session_key',$sessionKey)->lockForUpdate()->first();
        if(!$g)throw new RuntimeException('Billing group could not be created.'); return $g;
    }

    private function attach($group, int $orderId, string $source): void
    {
        $o=DB::table('orders')->where('order_id',$orderId)->lockForUpdate()->first(); if(!$o)throw new RuntimeException('Order not found.');
        $existing=DB::table('pmd_billing_group_orders')->where('order_id',$orderId)->lockForUpdate()->first();
        if($existing && (int)$existing->billing_group_id!==(int)$group->id)throw new RuntimeException('Order belongs to another billing group.');
        if(!$this->belongs($o,(string)$group->table_id))throw new RuntimeException('Order/table mismatch.');
        $activity=$this->hasFinancialActivity($orderId,$o);
        if($group->mode==='r36' && $activity){DB::table('pmd_billing_groups')->where('id',$group->id)->update(['mode'=>'legacy_passthrough','updated_at'=>now()]);$group->mode='legacy_passthrough';}
        if($group->mode==='r36' && !$activity)$this->removeChildServiceCharge($orderId);
        $o=DB::table('orders')->where('order_id',$orderId)->first(); $snap=$this->snapshot($orderId,$o,$source);
        $data=['billing_group_id'=>(int)$group->id,'source'=>$source,'snapshot_version'=>1,'financial_snapshot'=>json_encode($snap,JSON_UNESCAPED_SLASHES),'updated_at'=>now()];
        if($existing)DB::table('pmd_billing_group_orders')->where('id',$existing->id)->update($data); else DB::table('pmd_billing_group_orders')->insert($data+['order_id'=>$orderId,'created_at'=>now()]);
    }

    private function refresh(int $id): array
    {
        $g=DB::table('pmd_billing_groups')->where('id',$id)->lockForUpdate()->first(); if(!$g)throw new RuntimeException('Billing group not found.');
        $links=DB::table('pmd_billing_group_orders')->where('billing_group_id',$id)->orderBy('order_id')->get(); $subtotal=$tax=0;$childTotal=0;$orders=[];
        foreach($links as $l){$s=$this->json($l->financial_snapshot);$subtotal+=(int)($s['subtotal_cents']??0);$tax+=(int)($s['tax_cents']??0);$childTotal+=(int)($s['total_cents']??0);$orders[]=['orderId'=>(int)$l->order_id,'source'=>$l->source,'snapshot'=>$s];}
        $svc=0;$svcTax=0;$svcTaxAdded=0;$t=$this->taxSettings();
        if($g->mode==='r36'){$cfg=$this->serviceSettings();if($cfg['enabled'])$svc=ServiceChargeCalculator::calculate($subtotal,$cfg['type'],$cfg['value']);if($t['enabled']&&$t['percentage']>0&&$svc>0){if($t['menu_price']==='1'){$svcTax=(int)round($svc*$t['percentage']/100);$svcTaxAdded=$svcTax;}else{$svcTax=(int)round($svc-($svc/(1+$t['percentage']/100)));}}$total=$childTotal+$svc+$svcTaxAdded;}else{$total=$childTotal;}
        $paid=0;foreach($orders as $r){$o=DB::table('orders')->where('order_id',$r['orderId'])->first();if($o)$paid+=min((int)$r['snapshot']['total_cents'],$this->cents($o->settled_amount??0));}
        $paidSvc=0;$discount=0;$tip=0;$recon=false;foreach(DB::table('pmd_billing_group_payments')->where('billing_group_id',$id)->get() as $p){if($p->status==='settled'){$a=$this->json($p->allocation_snapshot);$paidSvc+=(int)($a['service_component_cents']??0);$discount+=(int)$p->discount_cents;$tip+=(int)$p->tip_cents;}if($p->status==='reconciliation_required')$recon=true;}
        $paid=min($total,$paid+min($svc+$svcTaxAdded,$paidSvc));$status=$recon?'reconciliation_required':($total>0&&$paid>=$total?'paid':($paid>0?'partial':'unpaid'));
        $vat=['version'=>1,'tax_enabled'=>$t['enabled'],'tax_percentage'=>$t['percentage'],'tax_menu_price'=>$t['menu_price'],'child_tax_cents'=>$tax,'service_charge_tax_cents'=>$svcTax,'service_charge_tax_added_cents'=>$svcTaxAdded,'captured_at'=>now()->toIso8601String()];
        DB::table('pmd_billing_groups')->where('id',$id)->update(['subtotal_cents'=>$subtotal,'service_charge_cents'=>$svc,'discount_cents'=>$discount,'tip_cents'=>$tip,'total_cents'=>$total,'paid_cents'=>$paid,'vat_snapshot'=>json_encode($vat),'payment_status'=>$status,'reconciliation_reason'=>$recon?$g->reconciliation_reason:null,'updated_at'=>now()]);
        return ['publicId'=>$g->public_id,'tableId'=>$g->table_id,'sessionKey'=>$g->session_key,'mode'=>$g->mode,'status'=>$g->status,'currency'=>$g->currency,'subtotalCents'=>$subtotal,'serviceChargeCents'=>$svc,'serviceChargeTaxCents'=>$svcTax,'serviceChargeTaxAddedCents'=>$svcTaxAdded,'discountCents'=>$discount,'tipCents'=>$tip,'totalCents'=>$total,'paidCents'=>$paid,'remainingCents'=>max(0,$total-$paid),'paymentStatus'=>$status,'fiscalStatus'=>$g->fiscal_status,'vatSnapshot'=>$vat,'orders'=>$orders];
    }

    private function removeChildServiceCharge(int $id): void
    {
        if(!Schema::hasTable('order_totals'))return; $rows=DB::table('order_totals')->where('order_id',$id)->where('code','service_charge')->get(); if($rows->isEmpty())return;
        $svc=0;foreach($rows as $r)$svc+=max(0,$this->cents($r->value)); DB::table('order_totals')->where('order_id',$id)->where('code','service_charge')->delete();
        $t=$this->taxSettings();$svcTax=0;if($t['enabled']&&$t['percentage']>0){$svcTax=$t['menu_price']==='1'?(int)round($svc*$t['percentage']/100):(int)round($svc-($svc/(1+$t['percentage']/100)));}
        if($svcTax>0){$taxRow=DB::table('order_totals')->where('order_id',$id)->where('code','tax')->first();if($taxRow){$newTax=max(0,$this->cents($taxRow->value)-$svcTax);$q=DB::table('order_totals')->where('order_id',$id)->where('code','tax');if(Schema::hasColumn('order_totals','order_total_id')&&isset($taxRow->order_total_id))$q->where('order_total_id',(int)$taxRow->order_total_id);$q->update(['value'=>$newTax/100]);}}
        $o=DB::table('orders')->where('order_id',$id)->first();if(!$o)return;$new=max(0,$this->cents($o->order_total)-$svc-($t['menu_price']==='1'?$svcTax:0));
        DB::table('orders')->where('order_id',$id)->update(['order_total'=>$new/100,'updated_at'=>now()]);DB::table('order_totals')->where('order_id',$id)->where('code','total')->update(['value'=>$new/100]);
    }

    private function snapshot(int $id,$o,string $source): array
    {
        $subtotal=0;$tax=0;$svc=0;$total=$this->cents($o->order_total??0);$items=[];
        foreach(DB::table('order_menus')->where('order_id',$id)->orderBy('order_menu_id')->get() as $r){$line=$this->cents($r->subtotal);$subtotal+=$line;$items[]=['order_menu_id'=>(int)$r->order_menu_id,'menu_id'=>(int)$r->menu_id,'quantity'=>(float)$r->quantity,'unit_price_cents'=>$this->cents($r->price),'line_total_cents'=>$line];}
        if(Schema::hasTable('order_totals'))foreach(DB::table('order_totals')->where('order_id',$id)->get() as $r){$v=$this->cents($r->value);if($r->code==='subtotal')$subtotal=$v;elseif($r->code==='tax')$tax+=$v;elseif($r->code==='service_charge')$svc+=$v;elseif($r->code==='total')$total=$v;}
        return ['version'=>1,'captured_at'=>now()->toIso8601String(),'source'=>$source,'currency'=>$this->currency(),'subtotal_cents'=>$subtotal,'tax_cents'=>$tax,'service_charge_cents'=>$svc,'total_cents'=>$total,'paid_base_cents'=>min($total,$this->cents($o->settled_amount??0)),'items'=>$items];
    }

    private function hasFinancialActivity(int $orderId,$o): bool
    {
        if($this->cents($o->settled_amount??0)>0)return true;
        $status=strtolower(trim((string)($o->settlement_status??'')));if(in_array($status,['partial','paid','settled'],true))return true;
        return Schema::hasTable('order_payment_transactions') && DB::table('order_payment_transactions')->where('order_id',$orderId)->exists();
    }

    private function waiterSession(string $tableId,int $orderId): string
    {
        if(Schema::hasTable('pmd_table_order_drafts')){$r=DB::table('pmd_table_order_drafts')->where(function($q)use($tableId){$q->where('table_id',$tableId)->orWhere('table_no',$tableId);})->whereNotNull('session_key')->orderByDesc('id')->first();if($r&&trim((string)$r->session_key)!=='')return trim((string)$r->session_key);}
        return 'pmds_cashier_'.substr(hash('sha256',$tableId.'|'.$orderId),0,28);
    }
    private function belongs($o,string $tableId): bool { if(isset($o->table_id)&&(int)$o->table_id>0)return (string)$o->table_id===$tableId;return (string)($o->order_type??'')===$tableId || strpos((string)($o->comment??''),'Table ID: '.$tableId)!==false; }
    private function serviceSettings(): array {$e=function_exists('setting')&&(string)setting('pmd_service_charge_enabled','0')==='1';$t=function_exists('setting')?strtolower((string)setting('pmd_service_charge_type','percentage')):'percentage';$v=function_exists('setting')?trim((string)setting('pmd_service_charge_value','0')):'0';if(!in_array($t,['percentage','fixed'],true))$t='percentage';if(!preg_match('/^\d+(?:\.\d{1,4})?$/',$v))$v='0';return ['enabled'=>$e&&(float)$v>0,'type'=>$t,'value'=>$v];}
    private function taxSettings(): array {$e=function_exists('setting')&&(string)setting('tax_mode',setting('tax_enabled','0'))==='1';return ['enabled'=>$e,'percentage'=>function_exists('setting')?max(0,(float)setting('tax_percentage',0)):0,'menu_price'=>function_exists('setting')&&(string)setting('tax_menu_price','1')==='0'?'0':'1'];}
    private function currency(): string {try{if(function_exists('currency'))return strtoupper((string)currency()->getDefault()->currency_code);}catch(\Throwable $e){}return 'EUR';}
    private function cents($v): int {return (int)round(((float)$v)*100,0,PHP_ROUND_HALF_UP);} private function json($v): array {$d=json_decode((string)$v,true);return is_array($d)?$d:[];}
}
