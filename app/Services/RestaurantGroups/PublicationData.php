<?php
namespace App\Services\RestaurantGroups;

use Illuminate\Support\Facades\Cache;

/** Tenant-local definition access. Settings always use the config namespace. */
final class PublicationData
{
    public const SETTINGS = ['pmd_v2_tips_enabled', 'pmd_v2_coupons_enabled', 'pmd_v2_social_enabled'];
    private const COUPON_FIELDS = ['name','code','type','discount','min_total','redemptions',
        'customer_redemptions','validity','fixed_date','fixed_from_time','fixed_to_time',
        'period_start_date','period_end_date','recurring_every','recurring_from_time',
        'recurring_to_time','order_restriction','status','card_type','max_discount_cap'];

    public function __construct(private Store $store) {}

    public function type(string $type): string
    {
        if (!in_array($type, ['menu','coupon','setting'], true)) throw new \InvalidArgumentException('Unsupported publication type.');
        return $type;
    }

    public function catalog($db, string $type, int $locationId): array
    {
        $this->type($type);
        if ($type === 'setting') {
            $items = [];
            foreach (self::SETTINGS as $key) if ($this->setting($db, $key)->exists()) $items[] = ['id'=>$key,'label'=>$key];
            return $items;
        }
        [$table,$key] = $this->table($type);
        $query = $db->table($table)->orderBy($key);
        $rows = $query->get(); $items = [];
        foreach ($rows as $row) {
            if ($type === 'coupon' && ($row->card_type ?? 'coupon') === 'gift_card') continue;
            if (!$this->inScope($db, $type, (int)$row->{$key}, $locationId)) continue;
            $items[] = ['id'=>(string)$row->{$key}, 'label'=>(string)($type === 'menu' ? $row->menu_name : $row->name.' - '.$row->code)];
        }
        return $items;
    }

    public function state($db, string $type, string $id, int $locationId, bool $lock = false): ?array
    {
        $this->type($type);
        if ($type === 'setting') {
            $query = $this->setting($db, $id);
            $row = ($lock ? $query->lockForUpdate() : $query)->first();
            return $row ? ['id'=>$id,'data'=>['key'=>$id,'value'=>$row->value,'sort'=>'config']] : null;
        }
        $numeric = PublicationRules::numericId($id);
        [$table,$key] = $this->table($type);
        $query = $db->table($table)->where($key, $numeric);
        $row = ($lock ? $query->lockForUpdate() : $query)->first();
        if (!$row) return null;
        if (!$this->inScope($db, $type, $numeric, $locationId)) throw new \DomainException('The item is not exclusive to this restaurant location.');
        if ($type === 'coupon') {
            if (($row->card_type ?? 'coupon') === 'gift_card') throw new \DomainException('Gift-card balances cannot be published.');
            $data = ['coupon'=>array_intersect_key((array)$row, array_flip(self::COUPON_FIELDS))];
        } else {
            $this->checkMenuSource($db, $numeric);
            $data = app(MenuReplicator::class)->export($db, $numeric);
        }
        return ['id'=>$id,'data'=>$data];
    }

    public function validateTarget($db, string $type, array $data, ?string $id, int $locationId): void
    {
        if ($type === 'setting') { $this->setting($db, (string)($data['key'] ?? '')); return; }
        if ($id !== null && $this->state($db, $type, $id, $locationId, true) === null) {
            throw new \DomainException('The previously published item was deleted. Review the mapping before publishing.');
        }
        if ($type === 'coupon') {
            $coupon = (array)($data['coupon'] ?? []);
            if (trim((string)($coupon['code'] ?? '')) === '') throw new \DomainException('Discount code is missing.');
            $existing = $db->table('igniter_coupons')->whereRaw('LOWER(code) = ?', [strtolower((string)$coupon['code'])])->lockForUpdate()->first();
            PublicationRules::couponCollision($existing, $id === null ? null : (int)$id);
            $this->columns($db, 'igniter_coupons', $coupon);
            return;
        }
        if ($id !== null && $db->getSchemaBuilder()->hasTable('menu_item_options')
            && $db->table('menu_item_options')->where('menu_id',(int)$id)->exists()) {
            throw new \DomainException('Updating an existing menu with modifiers requires the native modifier writer. No identifiers were replaced.');
        }
        // The legacy writer matches dependent definitions by name. Never let
        // it change shared local taxonomy or modifiers as a side effect.
        foreach (['categories'=>['categories','name'], 'mealtimes'=>['mealtimes','mealtime_name'], 'allergens'=>['allergens','name']] as $section=>$spec) {
            foreach ((array)($data[$section] ?? []) as $definition) $this->sameDefinition($db,$spec[0],$spec[1],$definition);
        }
        foreach ((array)($data['options'] ?? []) as $definition) {
            $option = (array)$definition['option'];
            $existing = $this->sameDefinition($db,'menu_options','option_name',$option);
            foreach ((array)($definition['values'] ?? []) as $value) {
                $this->columns($db,'menu_option_values',(array)$value);
                if ($existing) $this->sameDefinition($db,'menu_option_values','value',(array)$value,['option_id'=>(int)$existing->option_id]);
            }
        }
        $this->columns($db, 'menus', (array)$data['menu']);
        foreach (['prices'=>'menu_prices','special'=>'menus_specials'] as $section=>$table) {
            $rows = $section === 'special' ? (empty($data[$section]) ? [] : [$data[$section]]) : (array)($data[$section] ?? []);
            foreach ($rows as $row) $this->columns($db,$table,(array)$row);
        }
    }

    public function apply($db, string $type, array $data, ?string $id, int $locationId): string
    {
        $this->validateTarget($db,$type,$data,$id,$locationId);
        if ($type === 'setting') {
            $key = (string)$data['key'];
            $this->setting($db,$key)->updateOrInsert(['item'=>$key,'sort'=>'config'],['value'=>$data['value']]);
            return $key;
        }
        if ($type === 'menu') return (string)app(MenuReplicator::class)->import($db,$data,$id===null?null:(int)$id,$locationId);
        $values = (array)$data['coupon'];
        if ($db->getSchemaBuilder()->hasColumn('igniter_coupons','updated_at')) $values['updated_at'] = now();
        if ($id !== null) $db->table('igniter_coupons')->where('coupon_id',(int)$id)->update($values);
        else {
            if ($db->getSchemaBuilder()->hasColumn('igniter_coupons','created_at')) $values['created_at'] = now();
            $id = (string)$db->table('igniter_coupons')->insertGetId($values,'coupon_id');
            $db->table('locationables')->insert(['location_id'=>$locationId,'locationable_id'=>(int)$id,'locationable_type'=>'coupons','options'=>serialize([])]);
        }
        return $id;
    }

    public function currency($db): string
    {
        $rows = $db->table('settings')->where('sort','config')->where('item','default_currency_code')->get();
        if ($rows->count() !== 1) throw new \DomainException('Configure one default currency before publishing prices.');
        $raw = (string)$rows->first()->value;
        $decoded = @unserialize($raw,['allowed_classes'=>false]);
        if (is_string($decoded) || is_int($decoded)) $raw=(string)$decoded;
        else { $json=json_decode($raw,true); if (is_string($json)||is_int($json)) $raw=(string)$json; }
        if (ctype_digit($raw)) $raw=(string)$db->table('currencies')->where('currency_id',(int)$raw)->value('currency_code');
        $code=strtoupper(trim($raw));
        if (!preg_match('/^[A-Z]{3}$/D',$code)) throw new \DomainException('Configured currency is invalid.');
        return $code;
    }

    public function ready($db, string $type): void
    {
        $tables=['pmd_group_entities','pmd_group_receipts'];
        if ($type==='setting') $tables[]='settings';
        else {
            $tables[]='locationables'; $tables[]=$this->table($type)[0];
            if ($type==='menu') {
                foreach (['categories','menu_categories','mealtimes','menu_mealtimes','menu_prices','menus_specials','allergens','allergenables','menu_options','menu_option_values','menu_item_options','menu_item_option_values'] as $table) {
                    if ($db->getSchemaBuilder()->hasTable($table)) $tables[]=$table;
                }
            }
        }
        PublicationLock::transactional($db,$tables);
    }

    public function invalidate($db, string $type): void
    {
        if ($type==='setting') Cache::forget('igniter.setting.system.tenant.'.sha1(strtolower(trim($db->getDatabaseName()))));
    }

    private function checkMenuSource($db,int $id): void
    {
        $schema=$db->getSchemaBuilder();
        if($schema->hasTable('menu_categories') && $schema->hasColumn('categories','parent_id')) {
            $ids=$db->table('menu_categories')->where('menu_id',$id)->pluck('category_id')->all();
            if($ids && $db->table('categories')->whereIn('category_id',$ids)->where('parent_id','>',0)->exists()) {
                throw new \DomainException('Nested categories require the native category-tree writer before cross-location publication.');
            }
        }
        if(!$schema->hasTable('menu_item_options') || !$schema->hasTable('allergenables')) return;
        $options=$db->table('menu_item_options')->where('menu_id',$id)->pluck('option_id')->all();
        if(!$options) return;
        $values=$db->table('menu_option_values')->whereIn('option_id',$options)->pluck('option_value_id')->all();
        $optionAllergens=$db->table('allergenables')->whereIn('allergenable_id',$options)
            ->whereIn('allergenable_type',['menu_options','Admin\\Models\\Menu_options_model'])->exists();
        $valueAllergens=$values && $db->table('allergenables')->whereIn('allergenable_id',$values)
            ->whereIn('allergenable_type',['menu_option_values','Admin\\Models\\Menu_option_values_model'])->exists();
        if($optionAllergens || $valueAllergens) {
            throw new \DomainException('This menu has modifier allergens. Use the native menu writer; publication will not drop allergen information.');
        }
    }

    private function setting($db,string $key)
    {
        if (!in_array($key,self::SETTINGS,true)) throw new \DomainException('This setting is location-owned or must be published as a separate reviewed bundle.');
        if (!$db->getSchemaBuilder()->hasColumn('settings','sort')) throw new \DomainException('Settings namespace is unavailable.');
        return $db->table('settings')->where('item',$key)->where('sort','config');
    }
    private function table(string $type): array { return $type==='menu'?['menus','menu_id']:['igniter_coupons','coupon_id']; }
    private function columns($db,string $table,array $data): void
    {
        if (!$db->getSchemaBuilder()->hasTable($table) || array_diff(array_keys($data),$db->getSchemaBuilder()->getColumnListing($table))) {
            throw new \DomainException('This location has a different '.$table.' schema. Update and review it before publishing.');
        }
    }
    private function sameDefinition($db,string $table,string $name,array $data,array $where=[]): ?object
    {
        $this->columns($db,$table,$data);
        $query=$db->table($table)->whereRaw('LOWER('.$name.') = ?',[strtolower((string)($data[$name]??''))]);
        foreach ($where as $column=>$value) $query->where($column,$value);
        $rows=$query->lockForUpdate()->get();
        if ($rows->count()>1) throw new \DomainException('More than one local '.$table.' definition matches. Review it before publishing.');
        $row=$rows->first();
        if ($row) foreach ($data as $key=>$value) {
            if ((string)($row->{$key}??'') !== (string)($value??'')) throw new \DomainException('A local '.$table.' definition differs. It will not be overwritten by menu publication.');
        }
        // A new nested category needs the native tree/permalink writer. Refuse
        // rather than silently creating an incomplete category through raw SQL.
        if (!$row && $table==='categories') throw new \DomainException('Create the matching category in the target location before publishing this menu item.');
        return $row;
    }
    private function inScope($db,string $type,int $id,int $locationId): bool
    {
        $aliases=$type==='menu'?['menus','Admin\\Models\\Menus_model']:['coupons','igniter_coupons','Admin\\Models\\Coupons_model'];
        $ids=$db->table('locationables')->where('locationable_id',$id)->whereIn('locationable_type',$aliases)->pluck('location_id')->all();
        $ids=array_values(array_unique(array_map('intval',$ids)));
        if (!$ids) return $db->table('locations')->where('location_status',1)->count()===1
            && $db->table('locations')->where('location_id',$locationId)->where('location_status',1)->exists();
        return $ids===[$locationId];
    }
}
