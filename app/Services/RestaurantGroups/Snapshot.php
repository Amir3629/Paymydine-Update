<?php
namespace App\Services\RestaurantGroups;

/** Read-only group settlement report. Native operational dashboards stay local. */
final class Snapshot
{
    public function __construct(private Store $store,private Auth $auth) {}

    public function context(bool $requireMfa = true): array
    {
        $owner=$this->auth->owner($requireMfa);$id=$this->store->currentTenantId();
        $site=$this->store->site($id);$group=$this->store->group((int)$site->group_id);
        $sites=array_values(array_filter($this->store->sitesForOwner((int)$owner->id),fn($row)=>(int)$row['group_id']===(int)$group->id));
        return ['enabled'=>true,'owner'=>['id'=>(int)$owner->id,'name'=>(string)$owner->name,'username'=>(string)$owner->username],
            'group'=>['id'=>(int)$group->id,'uuid'=>(string)$group->uuid,'name'=>(string)$group->name,'type'=>(string)$group->type],
            'current_tenant_id'=>$id,'sites'=>$sites,'capabilities'=>[
                'aggregate_dashboard'=>count($sites)>1,
                'publish'=>count(array_filter($sites,fn($s)=>!empty($s['can_publish'])))>1,
                'food_court_queue'=>$group->type==='food_court']];
    }

    public function snapshot(string $scope='all',string $period='today'): array
    {
        $context=$this->context();$allowed=array_map('intval',array_column($context['sites'],'tenant_id'));
        $ownerId=(int)$context['owner']['id'];
        if($scope==='all') $ids=$allowed;
        else {$id=PublicationRules::numericId($scope);if(!in_array($id,$allowed,true))throw new \DomainException('Location access denied.');$ids=[$id];}
        if(!in_array($period,['today','week','month','last30'],true)) throw new \InvalidArgumentException('Unsupported reporting period.');
        if(count($ids)>20) throw new \DomainException('Choose at most 20 locations for one report.');
        $epoch=time();$rows=[];
        foreach($ids as $id) {
            $label='Location '.$id;
            foreach($context['sites'] as $entry) if((int)$entry['tenant_id']===$id) $label=(string)$entry['label'];
            try {
                // Revalidate each site. An unavailable site is never counted as
                // an empty restaurant and never inherits another site's result.
                $this->store->access($ownerId,$id);
                $site=$this->store->site($id);PublicationRules::member($site,(int)$context['group']['id']);
                $row=$this->siteReport($id,$site,$period,$epoch);
                $rows[]=$row+['label'=>$label];
            } catch(\Throwable $e) {
                $rows[]=['tenant_id'=>$id,'label'=>$label,'available'=>false,
                    'message'=>$e instanceof \DomainException?$e->getMessage():'This location is unavailable. No zero value was substituted.'];
            }
        }
        return ['ok'=>true,'scope'=>$scope,'period'=>$period,'locations'=>$rows,
            'metric_basis'=>'Recorded settled_amount on processed paid/settled orders; tips shown separately, no inferred FX conversion.',
            'generated_at'=>gmdate(DATE_ATOM,$epoch)]+ReportMath::aggregate($rows);
    }

    private function siteReport(int $id,object $site,string $period,int $epoch): array
    {
        $db=$this->store->connection($id);$schema=$db->getSchemaBuilder();
        $profile=app(ReportingProfile::class)->resolve($db,$this->store->tenant($id),(int)$site->location_id);

        $orderColumns=array_flip($schema->getColumnListing('orders'));
        foreach(['order_id','location_id','settled_at','settled_amount','settlement_status','processed'] as $column) {
            if(!isset($orderColumns[$column])) throw new \DomainException('Settlement reporting schema is incomplete.');
        }

        $totalColumns=array_flip($schema->getColumnListing('order_totals'));
        foreach(['order_id','code','value'] as $column) {
            if(!isset($totalColumns[$column])) throw new \DomainException('Order-total reporting schema is incomplete.');
        }
        $range=ReportingProfile::range($period,$profile['timezone'],$profile['storage_timezone'],$epoch);
        $result=['tenant_id'=>$id,'available'=>true,'orders'=>0,'revenue_minor'=>0,'tips_minor'=>0]+$profile+$range;
        $db->table('orders')->where('location_id',(int)$site->location_id)->where('processed',1)
            ->whereIn('settlement_status',['paid','settled'])
            ->where('settled_at','>=',$range['from'])->where('settled_at','<',$range['until'])
            ->select(['order_id','settled_amount'])->chunkById(500,function($orders) use($db,$profile,&$result) {
                $ids=[];
                foreach($orders as $order) {
                    $ids[]=(int)$order->order_id;
                    $result['orders']++;
                    $result['revenue_minor']=ReportMath::add($result['revenue_minor'],ReportMath::minor((string)$order->settled_amount,$profile['decimals']));
                }
                foreach($db->table('order_totals')->whereIn('order_id',$ids)->where('code','tip')->get(['value']) as $tip) {
                    $result['tips_minor']=ReportMath::add($result['tips_minor'],ReportMath::minor((string)$tip->value,$profile['decimals']));
                }
            },'order_id');
        $result['revenue']=ReportMath::decimal($result['revenue_minor'],$profile['decimals']);
        $result['tips']=ReportMath::decimal($result['tips_minor'],$profile['decimals']);
        return $result;
    }
}
