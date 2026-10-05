<?php
namespace App\Services\RestaurantGroups;

/** Read explicit tenant configuration without changing shared settings caches. */
final class ReportingProfile
{
    public function resolve($db, object $tenant, int $locationId): array
    {
        $location=$db->table('locations')->where('location_id',$locationId)->first();
        if(!$location) throw new \DomainException('Restaurant location is missing.');
        $values=[];
        foreach($db->table('settings')->where('sort','config')->whereIn('item',[
            'pmd_market_timezone','timezone','default_currency_code','pmd_groups_storage_timezone'
        ])->get() as $row) {
            if(array_key_exists($row->item,$values)) throw new \DomainException('Reporting settings contain duplicate keys.');
            $values[$row->item]=$this->decode($row->value);
        }
        $currency=app(PublicationData::class)->currency($db);
        $profile=app(\App\Services\Platform\CountryPlatformProfileRegistry::class)->profile((string)($tenant->country??''));
        $timezone=$location->timezone??$location->location_timezone??$values['pmd_market_timezone']??$values['timezone']??($profile['timezone']??null);
        if(!is_string($timezone)||$timezone==='') throw new \DomainException('Configure the restaurant reporting timezone.');
        try { new \DateTimeZone($timezone); } catch(\Throwable $e) { throw new \DomainException('Restaurant timezone is invalid.'); }
        $currencyRow=$db->table('currencies')->where('currency_code',$currency)->first();
        $decimals=null;
        foreach(['decimal_position','decimal_place','decimal_places'] as $field) {
            if($currencyRow && isset($currencyRow->{$field}) && ctype_digit((string)$currencyRow->{$field})) {
                $decimals=(int)$currencyRow->{$field}; break;
            }
        }
        if($decimals===null && ($profile['currency']['code']??'')===$currency) $decimals=$profile['currency']['minor_exponent']??null;
        if(!is_int($decimals)||$decimals<0||$decimals>4) throw new \DomainException('Configure the currency decimal precision.');
        // Do not silently reinterpret historical DATETIME values. The deployment
        // must confirm the clock used by the existing order writers first.
        $storage=$values['pmd_groups_storage_timezone']??config('pmd_groups.reporting_storage_timezone');
        if(!is_string($storage)||$storage==='') throw new \DomainException('Confirm the order storage timezone before enabling group reports.');
        try { new \DateTimeZone($storage); } catch(\Throwable $e) { throw new \DomainException('Order storage timezone is invalid.'); }
        return ['currency'=>$currency,'decimals'=>$decimals,'timezone'=>$timezone,'storage_timezone'=>$storage];
    }

    public static function range(string $period,string $timezone,string $storage,int $epoch): array
    {
        if(!in_array($period,['today','week','month','last30'],true)) throw new \InvalidArgumentException('Unsupported reporting period.');
        $end=(new \DateTimeImmutable('@'.$epoch))->setTimezone(new \DateTimeZone($timezone));
        $start=$end->setTime(0,0);
        if($period==='week') $start=$start->modify('monday this week');
        if($period==='month') $start=$start->modify('first day of this month');
        if($period==='last30') $start=$start->modify('-29 days');
        $zone=new \DateTimeZone($storage);
        return ['from'=>$start->setTimezone($zone)->format('Y-m-d H:i:s'),
            'until'=>$end->setTimezone($zone)->format('Y-m-d H:i:s'),
            'local_from'=>$start->format(DATE_ATOM),'local_until'=>$end->format(DATE_ATOM)];
    }

    private function decode($value)
    {
        if(!is_string($value)) return $value;
        $serialized=@unserialize($value,['allowed_classes'=>false]);
        if(is_string($serialized)||is_int($serialized)) return $serialized;
        $json=json_decode($value,true);
        return is_string($json)||is_int($json)?$json:$value;
    }
}
