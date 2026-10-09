<?php
/** Isolated service regression tests; no Laravel bootstrap and no live SQL. */
require __DIR__.'/publication-fixtures.inc';
$root=dirname(__DIR__,2).'/app/Services/RestaurantGroups/';
foreach(['Policy','PublicationRules','PublicationLock','PublicationData','Publisher','ReportMath','ReportingProfile'] as $class) require $root.$class.'.php';
use App\Services\RestaurantGroups\{Auth,Store,Schema,Publisher,PublicationData,PublicationRules,PublicationLock,Policy,ReportMath,ReportingProfile};
$n=0; $failed=0;
function test($name,callable $fn) { global $n,$failed; $n++; try{$fn();echo 'PASS '.$name.PHP_EOL;}catch(Throwable $e){$failed++;echo 'FAIL '.$name.': '.$e->getMessage().PHP_EOL;} }
function eq($a,$b) { if($a!==$b) throw new RuntimeException(var_export($a,true).' !== '.var_export($b,true)); }
function rejects(callable $fn) { try{$fn();}catch(Throwable $e){return;}throw new RuntimeException('Expected rejection'); }
function setupR3(): array {
    $store=new Store(); $owner=(object)['id'=>7,'auth_version'=>1]; $auth=new Auth($owner);
    $store->groups=[9=>['id'=>9,'uuid'=>'group-nine','owner_id'=>7,'status'=>'active']];
    $central=new R3DB('central');
    foreach(['pmd_group_operations','pmd_group_operation_targets','pmd_group_audit'] as $t) $central->tables[$t]=[];
    $store->dbs[0]=$central;
    for($i=1;$i<=3;$i++) {
        $db=new R3DB('tenant_'.$i); $store->dbs[$i]=$db;
        $store->sites[$i]=['tenant_id'=>$i,'group_id'=>9,'location_id'=>1,'state'=>'ready','label'=>'Site '.$i,'can_publish'=>true];
        foreach(['pmd_group_entities','pmd_group_receipts','igniter_coupons','locationables'] as $t) $db->tables[$t]=[];
        $db->tables['locations']=[['location_id'=>1,'location_status'=>1]];
        $db->tables['settings']=[['item'=>'default_currency_code','sort'=>'config','value'=>'EUR'],['item'=>'pmd_v2_social_enabled','sort'=>'config','value'=>'1']];
        $db->columns['igniter_coupons']=['coupon_id','name','code','type','discount','min_total','status','card_type','updated_at','created_at'];
    }
    $store->dbs[1]->tables['igniter_coupons']=[['coupon_id'=>4,'name'=>'Lunch','code'=>'LUNCH10','type'=>'P','discount'=>'10.00','min_total'=>'0.00','status'=>1,'card_type'=>'coupon']];
    $GLOBALS['r3_app'][PublicationData::class]=new PublicationData($store);
    return [new Publisher($store,$auth,new Schema()),$store,$auth];
}

foreach([['0.1',2,10],['12.345',2,1235],['-0.005',2,-1],['12.345',3,12345],['200',0,200],['0',4,0]] as [$s,$d,$v]) test('exact money '.$s.'/'.$d,fn()=>eq(ReportMath::minor($s,$d),$v));
foreach(['1e3','NaN',' 1.2','1,234','--1'] as $value) test('money rejects '.$value,fn()=>rejects(fn()=>ReportMath::minor($value,2)));
test('money formatting preserves 3 decimal currency',fn()=>eq(ReportMath::decimal(12345,3),'12.345'));
test('aggregate weighted order value',function(){ $rows=[];foreach([[10000,1],[10000,9]] as [$r,$o])$rows[]=['tenant_id'=>1,'available'=>true,'currency'=>'EUR','decimals'=>2,'revenue_minor'=>$r,'tips_minor'=>0,'orders'=>$o];eq(ReportMath::aggregate($rows)['totals'][0]['average_order'],'20.00'); });
test('aggregate separates currency and missing locations',function(){ $rows=[['tenant_id'=>9,'available'=>false]];foreach(['EUR','OMR'] as $c)$rows[]=['tenant_id'=>1,'available'=>true,'currency'=>$c,'decimals'=>2,'revenue_minor'=>100,'tips_minor'=>0,'orders'=>1];$r=ReportMath::aggregate($rows);eq(count($r['totals']),2);eq($r['partial'],true);eq($r['unavailable_tenants'],[9]); });
test('unknown currency is not converted to EUR',fn()=>rejects(fn()=>ReportMath::aggregate([['tenant_id'=>1,'available'=>true,'currency'=>'','decimals'=>2]])));
test('all unavailable does not manufacture zero revenue',fn()=>eq(ReportMath::aggregate([['tenant_id'=>2,'available'=>false]])['totals'],[]));
test('missing is different from an empty object',fn()=>eq(PublicationRules::fingerprint(null)===PublicationRules::fingerprint([]),false));
test('null R2 baseline rejected',fn()=>rejects(fn()=>PublicationRules::unchanged(null,null)));
test('newly created target invalidates missing baseline',fn()=>rejects(fn()=>PublicationRules::unchanged(PublicationRules::fingerprint(null),['id'=>'2'])));
test('foreign coupon code never reused',fn()=>rejects(fn()=>PublicationRules::couponCollision((object)['coupon_id'=>2],null)));
test('same mapped coupon may update',fn()=>PublicationRules::couponCollision((object)['coupon_id'=>2],2));
test('unsafe numeric ID rejected',fn()=>rejects(fn()=>PublicationRules::numericId('1 OR 1')));

test('Berlin spring DST day uses the correct UTC start',function(){ $r=ReportingProfile::range('today','Europe/Berlin','UTC',strtotime('2026-03-29T12:00:00+02:00'));eq($r['from'],'2026-03-28 23:00:00');eq($r['until'],'2026-03-29 10:00:00'); });
test('Berlin autumn DST day uses the correct UTC start',function(){ $r=ReportingProfile::range('today','Europe/Berlin','UTC',strtotime('2026-10-25T12:00:00+01:00'));eq($r['from'],'2026-10-24 22:00:00');eq($r['until'],'2026-10-25 11:00:00'); });
test('local month boundary is not UTC month boundary',function(){ $r=ReportingProfile::range('month','Europe/Berlin','UTC',strtotime('2026-10-04T12:00:00+02:00'));eq($r['from'],'2026-09-30 22:00:00'); });
test('invalid reporting period is rejected',fn()=>rejects(fn()=>ReportingProfile::range('year','Europe/Berlin','UTC',time())));

test('discount preview writes no target data',function(){[$p,$s]=setupR3();$before=$s->dbs[2]->tables;$v=$p->preview('coupon','4',[2]);eq(count($v['targets']),1);eq($s->dbs[2]->tables,$before);});
test('preview is atomic when one target has a code collision',function(){[$p,$s]=setupR3();$s->dbs[3]->tables['igniter_coupons']=[['coupon_id'=>99,'code'=>'lunch10']];rejects(fn()=>$p->preview('coupon','4',[2,3]));eq($s->central()->tables['pmd_group_operations'],[]);eq($s->central()->tables['pmd_group_operation_targets'],[]);});
test('preview audit failure rolls back operation metadata',function(){[$p,$s]=setupR3();$s->central()->failAudit=true;rejects(fn()=>$p->preview('coupon','4',[2]));eq($s->central()->tables['pmd_group_operations'],[]);});
test('publishes selected target only',function(){[$p,$s]=setupR3();$v=$p->preview('coupon','4',[2]);$r=$p->apply($v['operation']);eq($r['complete'],true);eq(count($s->dbs[2]->tables['igniter_coupons']),1);eq($s->dbs[3]->tables['igniter_coupons'],[]);});
test('completed request replay does not write target again',function(){[$p,$s]=setupR3();$v=$p->preview('coupon','4',[2]);$p->apply($v['operation']);$writes=$s->dbs[2]->writes;$r=$p->apply($v['operation']);eq($r['results'][0]['state'],'already_applied');eq($s->dbs[2]->writes,$writes);});
test('one failed tenant does not undo committed tenant',function(){[$p,$s]=setupR3();$v=$p->preview('coupon','4',[2,3]);$s->dbs[3]->failCommit=true;$r=$p->apply($v['operation']);eq($r['ok'],true);eq($r['complete'],false);eq(count($s->dbs[2]->tables['igniter_coupons']),1);eq($s->dbs[3]->tables['igniter_coupons'],[]);eq($s->dbs[3]->tables['pmd_group_receipts'],[]);});
test('retry resumes failed target without duplicating committed target',function(){[$p,$s]=setupR3();$v=$p->preview('coupon','4',[2,3]);$s->dbs[3]->failCommit=true;$p->apply($v['operation']);$writes=$s->dbs[2]->writes;$s->dbs[3]->failCommit=false;$r=$p->apply($v['operation']);eq($r['complete'],true);eq($s->dbs[2]->writes,$writes);eq(count($s->dbs[3]->tables['pmd_group_receipts']),1);});
test('source access revoked after preview is checked again',function(){[$p,$s]=setupR3();$v=$p->preview('coupon','4',[2]);$s->denied[1]=true;rejects(fn()=>$p->apply($v['operation']));eq($s->dbs[2]->writes,0);});
test('target access revoked after preview is reported without writes',function(){[$p,$s]=setupR3();$v=$p->preview('coupon','4',[2]);$s->denied[2]=true;$r=$p->apply($v['operation']);eq($r['complete'],false);eq($s->dbs[2]->writes,0);});
test('target reassigned to another group cannot be updated',function(){[$p,$s]=setupR3();$v=$p->preview('coupon','4',[2]);$s->sites[2]['group_id']=88;$r=$p->apply($v['operation']);eq($r['complete'],false);eq($s->dbs[2]->writes,0);});
test('changed owner password version invalidates preview',function(){[$p,$s,$a]=setupR3();$v=$p->preview('coupon','4',[2]);$a->value->auth_version=2;rejects(fn()=>$p->apply($v['operation']));eq($s->dbs[2]->writes,0);});
test('changed source data invalidates preview',function(){[$p,$s]=setupR3();$v=$p->preview('coupon','4',[2]);$s->dbs[1]->tables['igniter_coupons'][0]['discount']='20.00';rejects(fn()=>$p->apply($v['operation']));eq($s->dbs[2]->writes,0);});
test('changed target cannot be overwritten using a stale preview',function(){[$p,$s]=setupR3();$v=$p->preview('coupon','4',[2]);$p->apply($v['operation']);$v=$p->preview('coupon','4',[2]);$s->dbs[2]->tables['igniter_coupons'][0]['discount']='77.00';$r=$p->apply($v['operation']);eq($r['complete'],false);eq($s->dbs[2]->tables['igniter_coupons'][0]['discount'],'77.00');});
test('force overwrite request is refused',function(){[$p,$s]=setupR3();$v=$p->preview('coupon','4',[2]);rejects(fn()=>$p->apply($v['operation'],true));eq($s->dbs[2]->writes,0);});
test('coupon collision created after preview is not overwritten',function(){[$p,$s]=setupR3();$v=$p->preview('coupon','4',[2]);$s->dbs[2]->tables['igniter_coupons'][]=['coupon_id'=>99,'code'=>'LUNCH10','discount'=>'88.00'];$r=$p->apply($v['operation']);eq($r['complete'],false);eq($s->dbs[2]->tables['igniter_coupons'][0]['discount'],'88.00');});
test('deleted mapped target is not silently recreated',function(){[$p,$s]=setupR3();$v=$p->preview('coupon','4',[2]);$p->apply($v['operation']);$v=$p->preview('coupon','4',[2]);$s->dbs[2]->tables['igniter_coupons']=[];$r=$p->apply($v['operation']);eq($r['complete'],false);eq($s->dbs[2]->tables['igniter_coupons'],[]);});
test('different configured currencies are refused',function(){[$p,$s]=setupR3();$s->dbs[2]->tables['settings'][0]['value']='USD';rejects(fn()=>$p->preview('coupon','4',[2]));eq($s->dbs[2]->writes,0);});
test('currency changed after preview is refused',function(){[$p,$s]=setupR3();$v=$p->preview('coupon','4',[2]);$s->dbs[2]->tables['settings'][0]['value']='USD';$r=$p->apply($v['operation']);eq($r['complete'],false);eq($s->dbs[2]->writes,0);});
test('gift cards cannot be published',function(){[$p,$s]=setupR3();$s->dbs[1]->tables['igniter_coupons'][0]['card_type']='gift_card';rejects(fn()=>$p->preview('coupon','4',[2]));});
test('settings update config without changing a same-name preference',function(){[$p,$s]=setupR3();$s->dbs[2]->tables['settings'][1]['value']='0';$s->dbs[2]->tables['settings'][]=['item'=>'pmd_v2_social_enabled','sort'=>'prefs','value'=>'private'];$v=$p->preview('setting','pmd_v2_social_enabled',[2]);$r=$p->apply($v['operation']);eq($r['complete'],true);eq($s->dbs[2]->tables['settings'][1]['value'],'1');eq($s->dbs[2]->tables['settings'][2]['value'],'private');});
test('payment settings are not publishable',function(){[$p]=setupR3();rejects(fn()=>$p->preview('setting','stripe_secret_key',[2]));});
test('nontransactional target table stops preview',function(){[$p,$s]=setupR3();$s->dbs[2]->engine['igniter_coupons']='MyISAM';rejects(fn()=>$p->preview('coupon','4',[2]));});
test('busy operation lock refuses parallel application',function(){[$p,$s]=setupR3();$v=$p->preview('coupon','4',[2]);$s->central()->lockBusy=true;rejects(fn()=>$p->apply($v['operation']));eq($s->dbs[2]->writes,0);});
test('lock is released after a failed publication',function(){[$p,$s]=setupR3();$v=$p->preview('coupon','4',[2]);$s->dbs[1]->tables['igniter_coupons']=[];rejects(fn()=>$p->apply($v['operation']));eq($s->central()->locks,$s->central()->unlocks);});
test('payload tampering is rejected',function(){[$p,$s]=setupR3();$v=$p->preview('coupon','4',[2]);$s->central()->tables['pmd_group_operations'][0]['payload']='{}';rejects(fn()=>$p->apply($v['operation']));eq($s->dbs[2]->writes,0);});
test('old preview without versioned envelope cannot be applied',function(){[$p,$s]=setupR3();$v=$p->preview('coupon','4',[2]);$o=&$s->central()->tables['pmd_group_operations'][0];$payload=['coupon'=>[]];$o['payload']=json_encode($payload);$o['digest']=Policy::digest($payload);rejects(fn()=>$p->apply($v['operation']));});
echo "$n tests, $failed failed (isolated publication/report arithmetic fixtures; not MySQL or VPS integration).".PHP_EOL;
exit($failed?1:0);
