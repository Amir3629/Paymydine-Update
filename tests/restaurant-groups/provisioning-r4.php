<?php
/** Actual provisioning orchestration; SQL/TLS/template-migration boundaries are fixtures. */
require __DIR__.'/provisioning-fixtures.inc';
$root=dirname(__DIR__,2).'/app/Services/';
require $root.'SuperAdminTenantLifecycleService.php';
foreach(['PublicationLock','ProvisioningRules','OwnerLinker','SiteProvisioner','Provisioner'] as $class)require $root.'RestaurantGroups/'.$class.'.php';
use App\Services\RestaurantGroups\{Store,Schema,OwnerLinker,SiteProvisioner,Provisioner,ProvisioningRules};
use App\Services\{SuperAdminTenantLifecycleService,SuperAdminTenantDomainProvisioner};
use App\Services\Platform\{SuperAdminTenantMarketService,CountryPlatformProfileRegistry};

final class R4Lifecycle extends SuperAdminTenantLifecycleService {
    public int $clones=0;public bool $failClone=false;public bool $failFinalize=false;public $afterClone=null;
    protected function schemaExists(string $db):bool{return $db==='newtenantdb'||isset($GLOBALS['r4_databases'][$db]);}
    protected function cloneTemplateDatabase(string $source,string $target,bool $group=false):void {
        $this->clones++;
        if($this->failClone)throw new RuntimeException('fixture clone interrupted');
        $GLOBALS['r4_databases'][$target]->tables=[
            'users'=>[['user_id'=>10,'staff_id'=>20,'super_user'=>1,'username'=>'template','password'=>'old-password','reset_code'=>'old-token'],['user_id'=>11,'staff_id'=>21,'super_user'=>0,'username'=>'cashier','password'=>'old-password','reset_code'=>'old-token']],
            'staffs'=>[['staff_id'=>20,'staff_role_id'=>30,'staff_status'=>1,'staff_email'=>'old@example.test'],['staff_id'=>21,'staff_role_id'=>31,'staff_status'=>1]],
            'staff_roles'=>[['staff_role_id'=>30,'code'=>'pmd-owner']],
            'locations'=>[['location_id'=>40,'location_status'=>1,'location_name'=>'Template']],
            'locationables'=>[],
        ];
        if($this->afterClone)($this->afterClone)($GLOBALS['r4_databases'][$target]);
    }
    protected function finalizeTenantDatabase(string $db,string $central,array $data,bool $group=false):void {
        $GLOBALS['r4_config']['database.connections.mysql.database']=$db;
        if($this->failFinalize)throw new RuntimeException('fixture finalization interrupted');
    }
    protected function restoreCentralConnection(string $db):void{$GLOBALS['r4_config']['database.connections.mysql.database']=$db;}
    public function emptyTable(string $table,bool $group):bool{return $this->mustStartEmpty($table,$group);}
}
function resetR4(): array {
    $central=new R4DB('landlord');
    $payload=['name'=>'Berlin Mitte','domain'=>'mitte.paymydine.com','database'=>'mitte','email'=>'owner@example.test','phone'=>'123','country'=>'Germany','country_code'=>'DE','start'=>'2026-10-01','end'=>'2027-10-01','type'=>'People'];
    $central->tables=[
        'tenants'=>[], 'pmd_group_access'=>[], 'pmd_group_audit'=>[],
        'pmd_group_owners'=>[['id'=>1,'uuid'=>'owner-uuid','status'=>'active','username'=>'shared-owner','email'=>'owner@example.test','name'=>'Owner','auth_version'=>1]],
        'pmd_groups'=>[['id'=>2,'owner_id'=>1,'status'=>'provisioning','name'=>'Berlin Group']],
        'pmd_group_sites'=>[['id'=>3,'group_id'=>2,'tenant_id'=>null,'location_id'=>null,'label'=>'Berlin Mitte','slug'=>'mitte','database_name'=>'mitte','state'=>'pending','payload'=>json_encode($payload)]],
    ];
    $GLOBALS['r4_databases']=['landlord'=>$central];$GLOBALS['r4_logs']=[];
    $GLOBALS['r4_config']=['database.connections.mysql.database'=>'landlord'];
    $store=new Store();$linker=new OwnerLinker($store,new Schema());$creator=new R4Lifecycle();$domain=new SuperAdminTenantDomainProvisioner();$market=new SuperAdminTenantMarketService();
    $GLOBALS['r4_app']=[SuperAdminTenantLifecycleService::class=>$creator,SuperAdminTenantDomainProvisioner::class=>$domain,SuperAdminTenantMarketService::class=>$market,CountryPlatformProfileRegistry::class=>new CountryPlatformProfileRegistry()];
    return [$central,$store,$creator,$domain,$market,new SiteProvisioner($store,$linker),$linker];
}
$n=0;$failed=0;
function checkR4(string $name,callable $fn):void {global $n,$failed;$n++;try{$fn();echo 'PASS '.$name.PHP_EOL;}catch(Throwable $e){$failed++;echo 'FAIL '.$name.' : '.$e->getMessage().PHP_EOL;}}
function eqR4($a,$b):void {if($a!==$b)throw new RuntimeException('Mismatch '.var_export($a,true).' / '.var_export($b,true));}
function rejectR4(callable $fn):void {try{$fn();}catch(Throwable $e){return;}throw new RuntimeException('Expected rejection');}
function siteR4($c):object{return $c->table('pmd_group_sites')->where('id',3)->first();}

checkR4('fresh group tenant stays disabled until owner access and activation commit',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$d->during=function()use($c){eqR4($c->tables['tenants'][0]['status'],'disabled');eqR4($c->tables['pmd_group_access'],[]);};$m->during=$d->during;$r=$w->run(3);eqR4($r['ok'],true);eqR4(siteR4($c)->state,'ready');eqR4($c->tables['tenants'][0]['status'],'active');eqR4($c->tables['pmd_groups'][0]['status'],'active');eqR4(count($c->tables['pmd_group_access']),1);eqR4($GLOBALS['r4_config']['database.connections.mysql.database'],'landlord');});
checkR4('completed retry never recreates, re-profiles or rotates owner password',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$w->run(3);$password=$GLOBALS['r4_databases']['mitte']->tables['users'][0]['password'];eqR4($w->run(3)['state'],'already_ready');eqR4($l->clones,1);eqR4($d->calls,1);eqR4($m->calls,1);eqR4($GLOBALS['r4_databases']['mitte']->tables['users'][0]['password'],$password);});
checkR4('completed retry does not reactivate a disabled restaurant',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$w->run(3);$c->tables['tenants'][0]['status']='disabled';$w->run(3);eqR4($c->tables['tenants'][0]['status'],'disabled');});
checkR4('TLS failure leaves disabled tenant and retry reuses prepared database',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$d->fail=true;eqR4($w->run(3)['ok'],false);eqR4($c->tables['tenants'][0]['status'],'disabled');eqR4($c->tables['pmd_group_access'],[]);$d->fail=false;eqR4($w->run(3)['ok'],true);eqR4($l->clones,1);eqR4($d->calls,2);});
checkR4('market exception blocks activation and retry skips completed TLS',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$m->fail=true;eqR4($w->run(3)['ok'],false);eqR4($c->tables['tenants'][0]['status'],'disabled');$m->fail=false;eqR4($w->run(3)['ok'],true);eqR4($d->calls,1);eqR4($m->calls,2);});
checkR4('market readiness warnings are not silently swallowed',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$m->warnings=['not ready'];eqR4($w->run(3)['ok'],false);eqR4($c->tables['pmd_group_access'],[]);});
checkR4('interrupted clone is retained disabled and never automatically recloned',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$l->failClone=true;eqR4($w->run(3)['ok'],false);$l->failClone=false;eqR4($w->run(3)['ok'],false);eqR4($l->clones,1);eqR4($c->tables['tenants'][0]['status'],'disabled');eqR4(isset($GLOBALS['r4_databases']['mitte']),true);eqR4($d->calls,0);});
checkR4('interrupted finalization restores central DB and retains reservation',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$l->failFinalize=true;$w->run(3);eqR4($GLOBALS['r4_config']['database.connections.mysql.database'],'landlord');eqR4(siteR4($c)->tenant_id,1);eqR4($c->tables['tenants'][0]['status'],'disabled');});
checkR4('existing same-name database is never adopted or dropped',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$GLOBALS['r4_databases']['mitte']=new R4DB('mitte');$GLOBALS['r4_databases']['mitte']->tables=['private'=>[['value'=>'untouched']]];eqR4($w->run(3)['ok'],false);eqR4($c->tables['tenants'],[]);eqR4($GLOBALS['r4_databases']['mitte']->tables,['private'=>[['value'=>'untouched']]]);});
checkR4('existing registry reservation is never adopted',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$c->tables['tenants']=[['id'=>99,'domain'=>'mitte.paymydine.com','database'=>'foreign','status'=>'active']];eqR4($w->run(3)['ok'],false);eqR4($c->tables['tenants'][0]['id'],99);eqR4($c->tables['tenants'][0]['status'],'active');eqR4(siteR4($c)->tenant_id,null);});
checkR4('legacy incomplete tenant without R4 proof is refused without writes',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$c->tables['pmd_group_sites'][0]['tenant_id']=99;$before=$c->tables;rejectR4(fn()=>$w->run(3));eqR4($c->tables,$before);});
checkR4('site lock refuses a concurrent retry before provisioning',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$c->busy=true;rejectR4(fn()=>$w->run(3));eqR4($l->clones,0);});
checkR4('site lock releases after provisioning failure',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$d->fail=true;$w->run(3);eqR4($c->locked,false);});
checkR4('nontransactional control-plane storage refuses allocation',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$c->nonTransactional=true;rejectR4(fn()=>$w->run(3));eqR4($l->clones,0);});
checkR4('suspended group cannot resume or be reactivated by retry',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$c->tables['pmd_groups'][0]['status']='disabled';rejectR4(fn()=>$w->run(3));eqR4($c->tables['tenants'],[]);});
checkR4('revoked owner blocks allocation',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$c->tables['pmd_group_owners'][0]['status']='disabled';rejectR4(fn()=>$w->run(3));eqR4($l->clones,0);});
checkR4('owner revocation during TLS cannot publish an access mapping',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$d->during=function()use($c){$c->tables['pmd_group_owners'][0]['status']='disabled';};eqR4($w->run(3)['ok'],false);eqR4($c->tables['pmd_group_access'],[]);eqR4($c->tables['tenants'][0]['status'],'disabled');});
checkR4('activation audit failure rolls back central access and active status',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$c->failAudit=true;eqR4($w->run(3)['ok'],false);eqR4($c->tables['tenants'][0]['status'],'disabled');eqR4($c->tables['pmd_group_access'],[]);eqR4(count($GLOBALS['r4_databases']['mitte']->tables['pmd_group_identity']),1);$password=$GLOBALS['r4_databases']['mitte']->tables['users'][0]['password'];$c->failAudit=false;eqR4($w->run(3)['ok'],true);eqR4($GLOBALS['r4_databases']['mitte']->tables['users'][0]['password'],$password);});
checkR4('local owner commit failure cannot publish central access',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$l->afterClone=function($db){$db->failCommit=true;};eqR4($w->run(3)['ok'],false);eqR4($c->tables['pmd_group_access'],[]);eqR4($GLOBALS['r4_databases']['mitte']->tables['users'][0]['username'],'template');});
checkR4('new group shadows do not inherit template passwords or active staff',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$w->run(3);$db=$GLOBALS['r4_databases']['mitte'];eqR4($db->tables['staffs'][1]['staff_status'],0);foreach($db->tables['users'] as $user){eqR4($user['password']==='old-password',false);eqR4($user['reset_code'],'');}eqR4($db->tables['users'][0]['username'],'shared-owner');});
checkR4('extra template super users are normalized before first owner link',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$l->afterClone=function($db){$db->tables['users'][1]['super_user']=1;};eqR4($w->run(3)['ok'],true);eqR4(count($c->tables['pmd_group_access']),1);$db=$GLOBALS['r4_databases']['mitte'];eqR4((int)$db->tables['users'][0]['super_user'],1);eqR4((int)$db->tables['users'][1]['super_user'],0);});
checkR4('extra active template locations are normalized before first owner link',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$l->afterClone=function($db){$db->tables['locations'][]=['location_id'=>41,'location_status'=>1];};eqR4($w->run(3)['ok'],true);$active=array_values(array_filter($GLOBALS['r4_databases']['mitte']->tables['locations'],fn($row)=>(int)$row['location_status']===1));eqR4(count($active),1);eqR4((int)$active[0]['location_id'],40);});
checkR4('foreign template group identity is never overwritten',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$l->afterClone=function($db){$db->tables['pmd_group_identity']=[['user_id'=>10,'owner_uuid'=>'foreign']];};eqR4($w->run(3)['ok'],false);eqR4($GLOBALS['r4_databases']['mitte']->tables['pmd_group_identity'][0]['owner_uuid'],'foreign');});
checkR4('retry does not revive a shadow owner disabled after local commit',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$c->failAudit=true;$w->run(3);$c->failAudit=false;$GLOBALS['r4_databases']['mitte']->tables['staffs'][0]['staff_status']=0;eqR4($w->run(3)['ok'],false);eqR4($GLOBALS['r4_databases']['mitte']->tables['staffs'][0]['staff_status'],0);});
checkR4('tampered domain in reserved payload is refused before allocation',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$data=json_decode(siteR4($c)->payload,true);$data['domain']='foreign.paymydine.com';$c->tables['pmd_group_sites'][0]['payload']=json_encode($data);rejectR4(fn()=>$w->run(3));eqR4($l->clones,0);});
checkR4('tampered tenant binding is refused before retry writes',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$d->fail=true;$w->run(3);$c->tables['pmd_group_sites'][0]['tenant_id']=99;rejectR4(fn()=>$w->run(3));eqR4($c->tables['tenants'][0]['status'],'disabled');});
checkR4('reassigned reserved group cannot reuse old owner checkpoint',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$d->fail=true;$w->run(3);$c->tables['pmd_group_owners'][0]['uuid']='new-owner-uuid';rejectR4(fn()=>$w->run(3));eqR4($l->clones,1);});
checkR4('registered callback and tenant row roll back together',function(){[$c,$s,$l]=resetR4();$data=json_decode(siteR4($c)->payload,true);$r=$l->createDeferred($data,function(){throw new RuntimeException('checkpoint failed');});eqR4($r['ok'],false);eqR4($c->tables['tenants'],[]);eqR4($l->clones,0);});
checkR4('deferred creator cannot run domain provisioning or activate tenant itself',function(){[$c,$s,$l,$d]=resetR4();$phases=[];$r=$l->createDeferred(json_decode(siteR4($c)->payload,true),function($phase)use(&$phases){$phases[]=$phase;});eqR4($r['stage'],'prepared');eqR4($phases,['registered','prepared']);eqR4($d->calls,0);eqR4($c->tables['tenants'][0]['status'],'disabled');});
checkR4('legacy create still provisions and activates normally',function(){[$c,$s,$l,$d]=resetR4();eqR4($l->create(json_decode(siteR4($c)->payload,true))['ok'],true);eqR4($d->calls,1);eqR4($c->tables['tenants'][0]['status'],'active');});
checkR4('legacy failed clone removes only its own newly inserted registry row',function(){[$c,$s,$l]=resetR4();$c->tables['tenants']=[['id'=>99,'database'=>'other','domain'=>'other.paymydine.com','status'=>'active']];$l->failClone=true;$l->create(json_decode(siteR4($c)->payload,true));eqR4(count($c->tables['tenants']),1);eqR4($c->tables['tenants'][0]['id'],99);});
foreach(['pmd_group_identity','pmd_group_receipts','pmd_group_entities','pmd_mobile_edges','pmd_sync_events','pmd_device_tokens','sessions','password_resets'] as $table){checkR4('deferred template does not copy '.$table,function()use($table){[,, $l]=resetR4();eqR4($l->emptyTable($table,true),true);});}
checkR4('template security matching honors configured prefix',function(){[,, $l]=resetR4();$GLOBALS['r4_config']['database.connections.mysql.prefix']='ti_';eqR4($l->emptyTable('ti_pmd_group_identity',true),true);eqR4($l->emptyTable('ti_currencies',true),false);});
checkR4('invalid phase jump cannot skip preparation',function(){rejectR4(fn()=>ProvisioningRules::transition('registered','ready'));});
checkR4('a second failed site does not demote a group with a ready first site',function(){[$c,$s,$l,$d,$m,$w]=resetR4();$w->run(3);$site=$c->tables['pmd_group_sites'][0];$site['id']=4;$site['tenant_id']=null;$site['state']='pending';$site['slug']='west';$site['database_name']='west';$p=json_decode($site['payload'],true);unset($p['_provisioning_r4']);$p['database']='west';$p['domain']='west.paymydine.com';$site['payload']=json_encode($p);$c->tables['pmd_group_sites'][]=$site;$d->fail=true;eqR4($w->run(4)['ok'],false);eqR4($c->tables['pmd_groups'][0]['status'],'active');eqR4($c->tables['tenants'][0]['status'],'active');});

function inputR4():array{return ['organization_type'=>'multi_location','organization_name'=>'New Group','owner_name'=>'New Owner','owner_username'=>'new-owner','owner_email'=>'new@example.test','owner_password'=>'unshared-secret-12345','phone'=>'123','country'=>'DE','start'=>'2026-10-01','end'=>'2027-10-01','sites'=>[['label'=>'North','slug'=>'north','database'=>'north'],['label'=>'South','slug'=>'south','database'=>'south']]];}
checkR4('create reserves a group and completes both locations',function(){[$c,$s,$l,$d,$m,$w,$link]=resetR4();$r=(new Provisioner($s,$link))->create(inputR4());eqR4($r['ok'],true);eqR4(count($r['results']),2);eqR4(count($c->tables['pmd_group_access']),2);});
checkR4('group reservation never stores plaintext password in payload or audit',function(){[$c,$s,$l,$d,$m,$w,$link]=resetR4();$input=inputR4();(new Provisioner($s,$link))->create($input);eqR4(str_contains(json_encode($c->tables),$input['owner_password']),false);});
checkR4('partial group creation does not overwrite ready status after loop',function(){[$c,$s,$l,$d,$m,$w,$link]=resetR4();$d->during=function()use($d){if($d->calls===2)$d->fail=true;};$r=(new Provisioner($s,$link))->create(inputR4());eqR4($r['ok'],false);eqR4($c->table('pmd_groups')->where('id',$r['group_id'])->first()->status,'active');});
checkR4('invalid subscription dates are rejected before reservation',function(){[$c,$s,$l,$d,$m,$w,$link]=resetR4();$i=inputR4();$i['start']='2026-02-30';$before=$c->tables;rejectR4(fn()=>(new Provisioner($s,$link))->create($i));eqR4($c->tables,$before);});
checkR4('duplicate location database names are rejected before reservation',function(){[$c,$s,$l,$d,$m,$w,$link]=resetR4();$i=inputR4();$i['sites'][1]['database']='north';$before=$c->tables;rejectR4(fn()=>(new Provisioner($s,$link))->create($i));eqR4($c->tables,$before);});
checkR4('unsupported site country cannot partially create a group',function(){[$c,$s,$l,$d,$m,$w,$link]=resetR4();$i=inputR4();$i['sites'][1]['country']='unsupported';$before=$c->tables;rejectR4(fn()=>(new Provisioner($s,$link))->create($i));eqR4($c->tables,$before);});
checkR4('deferred creator refuses tenant-default context before any registry writes',function(){[$c,$s,$l]=resetR4();$GLOBALS['r4_config']['database.default']='tenant';rejectR4(fn()=>$l->createDeferred(json_decode(siteR4($c)->payload,true),function(){}));eqR4($c->tables['tenants'],[]);});
echo "$n provisioning tests, $failed failed (isolated SQL/TLS/template-finalization boundaries; not full VPS provisioning).".PHP_EOL;
exit($failed?1:0);
