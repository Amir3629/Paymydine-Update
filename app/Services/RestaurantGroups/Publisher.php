<?php
namespace App\Services\RestaurantGroups;

use Illuminate\Support\Str;

/** Explicit cross-location publication; target receipts are the commit authority. */
final class Publisher
{
    public function __construct(private Store $store, private Auth $auth, private Schema $schema) {}
    private function data(): PublicationData { return app(PublicationData::class); }

    public function catalog(string $type): array
    {
        $owner=$this->auth->owner(true); $source=$this->store->currentTenantId();
        $site=$this->authorized($owner,$source,null);
        return $this->data()->catalog($this->store->connection($source),$type,(int)$site->location_id);
    }

    public function preview(string $type,string $entityId,array $requestedTargets): array
    {
        $this->data()->type($type);
        $owner=$this->auth->owner(true); $source=$this->store->currentTenantId();
        $site=$this->authorized($owner,$source,null); $group=$this->store->group((int)$site->group_id);
        $sites=array_filter($this->store->sitesForOwner((int)$owner->id),fn($s)=>(int)$s['group_id']===(int)$group->id && !empty($s['can_publish']));
        $targets=Policy::targets($requestedTargets,array_column($sites,'tenant_id'));
        $targets=array_values(array_filter($targets,fn($id)=>$id!==$source)); sort($targets,SORT_NUMERIC);
        if (!$targets) throw new \InvalidArgumentException('Choose at least one other location.');
        $sourceDb=$this->store->connection($source); $this->data()->ready($sourceDb,$type);
        return PublicationLock::run($sourceDb,'source:'.$group->uuid.':'.$type.':'.$entityId,function() use($owner,$source,$site,$group,$targets,$type,$entityId,$sourceDb) {
            $state=$sourceDb->transaction(fn()=>$this->data()->state($sourceDb,$type,$entityId,(int)$site->location_id,true));
            if ($state===null) throw new \DomainException('Saved source item not found.');
            $currency=$type==='setting'?null:$this->data()->currency($sourceDb);
            $key=$this->entityKey($sourceDb,(string)$group->uuid,$type,$entityId);
            $payload=['meta'=>['version'=>PublicationRules::VERSION,'owner_id'=>(int)$owner->id,
                'auth_version'=>(int)$owner->auth_version,'source_tenant_id'=>$source,
                'source_id'=>$entityId,'group_uuid'=>(string)$group->uuid,'type'=>$type,
                'currency'=>$currency], 'item'=>$state['data']];
            $planned=[];
            foreach($targets as $tenantId) {
                $targetSite=$this->authorized($owner,$tenantId,(int)$group->id);
                $db=$this->store->connection($tenantId); $this->data()->ready($db,$type);
                if($currency!==null && $currency!==$this->data()->currency($db)) throw new \DomainException('Prices cannot be published between different configured currencies.');
                $targetState=$db->transaction(function() use($db,$group,$key,$type,$entityId,$targetSite,$state) {
                    $mapped=$this->mapped($db,(string)$group->uuid,$key,$type,$entityId,true);
                    $current=$mapped===null?null:$this->data()->state($db,$type,$mapped,(int)$targetSite->location_id,true);
                    if($type!=='setting' && $mapped!==null && $current===null) throw new \DomainException('A previously published target was deleted. Review its mapping first.');
                    $this->data()->validateTarget($db,$type,$state['data'],$current===null?null:$mapped,(int)$targetSite->location_id);
                    return $current;
                });
                $planned[]=['tenant_id'=>$tenantId,'label'=>(string)$targetSite->label,
                    'expected_digest'=>PublicationRules::fingerprint($targetState),'existing'=>$targetState!==null];
            }
            // No partial preview can be applied: metadata, every target and the
            // audit entry are committed together, only after all checks pass.
            $uuid=(string)Str::uuid(); $expires=now()->addMinutes(20);
            $this->store->central()->transaction(function() use($owner,$source,$group,$type,$key,$payload,$uuid,$expires,$planned) {
                $this->auth->owner(true);
                $id=$this->store->central()->table('pmd_group_operations')->insertGetId([
                    'uuid'=>$uuid,'group_id'=>(int)$group->id,'owner_id'=>(int)$owner->id,
                    'source_tenant_id'=>$source,'entity_type'=>$type,'entity_key'=>$key,
                    'payload'=>Policy::canonical($payload),'digest'=>Policy::digest($payload),
                    'state'=>'preview','expires_at'=>$expires,'created_at'=>now(),'updated_at'=>now()]);
                foreach($planned as $target) $this->store->central()->table('pmd_group_operation_targets')->insert([
                    'operation_id'=>$id,'tenant_id'=>$target['tenant_id'],'expected_digest'=>$target['expected_digest'],
                    'state'=>'pending','created_at'=>now(),'updated_at'=>now()]);
                $this->store->audit('owner',(int)$owner->id,'publish_preview',(int)$group->id,['operation'=>$uuid,'targets'=>array_column($planned,'tenant_id')]);
            });
            return ['ok'=>true,'operation'=>$uuid,'entity_type'=>$type,'targets'=>$planned,'expires_at'=>$expires->toIso8601String()];
        });
    }

    public function apply(string $operationUuid,bool $overwrite=false): array
    {
        if($overwrite) throw new \DomainException('Stale-target overwrite is disabled. Create and review a new preview.');
        $owner=$this->auth->owner(true); $central=$this->store->central();
        return PublicationLock::run($central,'operation:'.$operationUuid,function() use($central,$owner,$operationUuid) {
            $operation=$central->table('pmd_group_operations')->where('uuid',$operationUuid)->first();
            if(!$operation || (int)$operation->owner_id!==(int)$owner->id) throw new \DomainException('Publication not found.');
            $group=$this->store->group((int)$operation->group_id);
            if((int)$group->owner_id!==(int)$owner->id || $group->status!=='active') throw new \DomainException('Business account access changed.');
            $payload=json_decode((string)$operation->payload,true,512,JSON_THROW_ON_ERROR);
            $item=PublicationRules::envelope($payload,$operation,$owner,$group);
            $sourceSite=$this->authorized($owner,(int)$operation->source_tenant_id,(int)$group->id);
            $targets=$central->table('pmd_group_operation_targets')->where('operation_id',$operation->id)->orderBy('tenant_id')->get();
            if($targets->isEmpty() || $targets->count()>20) throw new \DomainException('Publication target list is invalid.');
            if(!in_array($operation->state,['preview','partial','complete'],true)) throw new \DomainException('Publication state is invalid.');
            if($operation->state!=='complete' && now()->greaterThan($operation->expires_at)) throw new \DomainException('The preview expired. Create a new preview.');
            $sourceDb=$this->store->connection((int)$operation->source_tenant_id);
            if($operation->state!=='complete') {
                $state=$this->data()->state($sourceDb,(string)$operation->entity_type,(string)$payload['meta']['source_id'],(int)$sourceSite->location_id);
                if(!$state || !hash_equals(Policy::digest($item),Policy::digest($state['data']))) throw new \DomainException('The source changed after preview. Create a new preview.');
            }
            $this->store->audit('owner',(int)$owner->id,'publish_started',(int)$group->id,['operation'=>$operationUuid]);
            $results=[];
            foreach($targets as $target) {
                try {
                    $site=$this->authorized($this->auth->owner(true),(int)$target->tenant_id,(int)$group->id);
                    if((int)$target->tenant_id===(int)$operation->source_tenant_id) throw new \DomainException('Source cannot be a publication target.');
                    $db=$this->store->connection((int)$target->tenant_id); $type=(string)$operation->entity_type;
                    $this->data()->ready($db,$type);
                    $result=PublicationLock::run($db,'entity:'.$group->uuid.':'.$operation->entity_key,function() use($db,$type,$operation,$target,$group,$site,$item,$payload,$owner) {
                        return $db->transaction(function() use($db,$type,$operation,$target,$group,$site,$item,$payload,$owner) {
                            $receipt=$db->table('pmd_group_receipts')->where('operation_uuid',$operation->uuid)->lockForUpdate()->first();
                            if($receipt) {
                                if(!hash_equals((string)$receipt->digest,(string)$operation->digest)) throw new \RuntimeException('Publication receipt does not match its payload.');
                                return ['state'=>'already_applied'];
                            }
                            if($operation->state==='complete') throw new \RuntimeException('Completed publication is missing a target receipt.');
                            $this->authorized($this->auth->owner(true),(int)$target->tenant_id,(int)$group->id);
                            $this->authorized($owner,(int)$operation->source_tenant_id,(int)$group->id);
                            if($type!=='setting' && ($payload['meta']['currency']!==$this->data()->currency($db)
                                || $payload['meta']['currency']!==$this->data()->currency($this->store->connection((int)$operation->source_tenant_id)))) {
                                throw new \DomainException('A configured currency changed after preview.');
                            }
                            $id=$this->mapped($db,(string)$group->uuid,(string)$operation->entity_key,$type,(string)$payload['meta']['source_id'],true);
                            $current=$id===null?null:$this->data()->state($db,$type,$id,(int)$site->location_id,true);
                            PublicationRules::unchanged($target->expected_digest,$current);
                            // Receipt uniqueness and data writes share one transaction.
                            $db->table('pmd_group_receipts')->insert(['operation_uuid'=>$operation->uuid,'digest'=>$operation->digest,'applied_at'=>now()]);
                            $local=$this->data()->apply($db,$type,$item,$current===null?null:$id,(int)$site->location_id);
                            $written=$this->data()->state($db,$type,$local,(int)$site->location_id,true);
                            if(!$written || !hash_equals(Policy::digest($item),Policy::digest($written['data']))) {
                                throw new \DomainException('The target did not preserve the reviewed definition. This target transaction was rolled back.');
                            }
                            if($type!=='setting') $db->table('pmd_group_entities')->updateOrInsert([
                                'group_uuid'=>(string)$group->uuid,'entity_key'=>(string)$operation->entity_key],
                                ['entity_type'=>$type,'local_id'=>(int)$local,'last_digest'=>Policy::digest($item)]);
                            return ['state'=>'applied','local_id'=>$local];
                        });
                    });
                    $this->data()->invalidate($db,$type);
                    $central->table('pmd_group_operation_targets')->where('id',$target->id)->update(['state'=>'applied','last_error'=>null,'updated_at'=>now()]);
                    $results[]=['tenant_id'=>(int)$target->tenant_id,'label'=>(string)$site->label,'ok'=>true]+$result;
                } catch(\Throwable $error) {
                    $message=$error instanceof \DomainException?$error->getMessage():'This target could not be confirmed. Retry the same operation; committed targets will not be applied twice.';
                    logger()->error('PMD publication target failed',['operation'=>$operationUuid,'tenant_id'=>(int)$target->tenant_id,'exception'=>get_class($error)]);
                    $central->table('pmd_group_operation_targets')->where('id',$target->id)->update(['state'=>'failed','last_error'=>$message,'updated_at'=>now()]);
                    $results[]=['tenant_id'=>(int)$target->tenant_id,'ok'=>false,'state'=>'failed','message'=>$message];
                }
            }
            $complete=!array_filter($results,fn($r)=>!$r['ok']);
            $central->transaction(function() use($central,$operation,$owner,$group,$results,$complete) {
                $central->table('pmd_group_operations')->where('id',$operation->id)->update(['state'=>$complete?'complete':'partial','updated_at'=>now()]);
                $this->store->audit('owner',(int)$owner->id,'publish_finished',(int)$group->id,['operation'=>$operation->uuid,'results'=>$results]);
            });
            // Transport success is distinct from business success. Keep per-site
            // failures visible to the existing client instead of throwing them away.
            return ['ok'=>true,'complete'=>$complete,'operation'=>$operationUuid,'results'=>$results];
        });
    }

    private function authorized(object $owner,int $tenantId,?int $groupId): object
    {
        $this->store->access((int)$owner->id,$tenantId,true);
        $site=$this->store->site($tenantId);
        PublicationRules::member($site,$groupId??(int)$site->group_id);
        return $site;
    }
    private function mapped($db,string $uuid,string $key,string $type,string $settingId,bool $lock=false): ?string
    {
        if($type==='setting') return $settingId;
        $q=$db->table('pmd_group_entities')->where('group_uuid',$uuid)->where('entity_key',$key);
        $row=($lock?$q->lockForUpdate():$q)->first();
        if($row && $row->entity_type!==$type) throw new \DomainException('Publication mapping type changed.');
        return $row?(string)$row->local_id:null;
    }
    private function entityKey($db,string $uuid,string $type,string $id): string
    {
        if($type==='setting') return 'setting:'.$id;
        $numeric=PublicationRules::numericId($id);
        return $db->transaction(function() use($db,$uuid,$type,$numeric) {
            $query=$db->table('pmd_group_entities')->where('group_uuid',$uuid)->where('entity_type',$type)->where('local_id',$numeric);
            $existing=$query->lockForUpdate()->first();
            if($existing) return (string)$existing->entity_key;
            $key=$type.':'.(string)Str::uuid();
            $db->table('pmd_group_entities')->insert(['group_uuid'=>$uuid,'entity_key'=>$key,'entity_type'=>$type,'local_id'=>$numeric,'last_digest'=>null]);
            return $key;
        });
    }
}
