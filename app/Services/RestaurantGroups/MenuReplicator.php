<?php

namespace App\Services\RestaurantGroups;

/**
 * Copies only menu-definition data. Stock levels, media storage, sales,
 * inventory movements and other operational rows remain tenant-owned.
 */
final class MenuReplicator
{
    public function export($db, int $menuId): array
    {
        $row = $db->table('menus')->where('menu_id', $menuId)->first();
        if (!$row) throw new \DomainException('Menu item not found.');

        $payload = [
            'menu' => $this->only((array)$row, [
                'menu_name', 'menu_description', 'menu_price', 'minimum_qty',
                'menu_status', 'menu_priority', 'prep_time_minutes',
                'is_chef_recommended', 'is_manual_bestseller', 'is_halal',
                'is_vegetarian', 'is_vegan', 'calories', 'protein', 'carbs',
                'fat', 'sugar', 'order_restriction',
            ]),
            'categories' => [],
            'mealtimes' => [],
            'prices' => [],
            'special' => null,
            'allergens' => [],
            'options' => [],
        ];

        if (
            $this->table($db, 'menu_categories')
            && $this->table($db, 'categories')
        ) {
            $categoryIds = $db->table('menu_categories')
                ->where('menu_id', $menuId)
                ->orderBy('category_id')
                ->pluck('category_id');

            foreach ($db->table('categories')
                ->whereIn('category_id', $categoryIds)
                ->orderBy('priority')
                ->orderBy('category_id')
                ->get() as $category) {
                $payload['categories'][] = $this->only((array)$category, [
                    'name', 'description', 'priority', 'status',
                    'frontend_visible', 'permalink_slug',
                ]);
            }
        }

        if (
            $this->table($db, 'menu_mealtimes')
            && $this->table($db, 'mealtimes')
        ) {
            $ids = $db->table('menu_mealtimes')
                ->where('menu_id', $menuId)
                ->orderBy('mealtime_id')
                ->pluck('mealtime_id');

            foreach ($db->table('mealtimes')
                ->whereIn('mealtime_id', $ids)
                ->orderBy('mealtime_id')
                ->get() as $mealtime) {
                $payload['mealtimes'][] = $this->only((array)$mealtime, [
                    'mealtime_name', 'start_time', 'end_time', 'mealtime_status',
                ]);
            }
        }

        if ($this->table($db, 'menu_prices')) {
            foreach ($db->table('menu_prices')
                ->where('menu_id', $menuId)
                ->orderBy('priority')
                ->orderBy('price_id')
                ->get() as $price) {
                $payload['prices'][] = $this->only((array)$price, [
                    'price_type', 'price', 'is_active', 'time_from', 'time_to',
                    'days_of_week', 'priority',
                ]);
            }
        }

        if ($this->table($db, 'menus_specials')) {
            $special = $db->table('menus_specials')->where('menu_id', $menuId)->first();
            if ($special) {
                $payload['special'] = $this->only((array)$special, [
                    'start_date', 'end_date', 'special_price', 'special_status',
                    'type', 'validity', 'recurring_every', 'recurring_from',
                    'recurring_to',
                ]);
            }
        }

        if (
            $this->table($db, 'allergenables')
            && $this->table($db, 'allergens')
        ) {
            $ids = $db->table('allergenables')
                ->where('allergenable_id', $menuId)
                ->whereIn('allergenable_type', ['menus', 'Admin\\Models\\Menus_model'])
                ->orderBy('allergen_id')
                ->pluck('allergen_id');

            foreach ($db->table('allergens')
                ->whereIn('allergen_id', $ids)
                ->orderBy('name')
                ->get() as $allergen) {
                $payload['allergens'][] = $this->only((array)$allergen, [
                    'name', 'description', 'status',
                ]);
            }
        }

        if (
            $this->table($db, 'menu_item_options')
            && $this->table($db, 'menu_options')
            && $this->table($db, 'menu_option_values')
            && $this->table($db, 'menu_item_option_values')
        ) {
            foreach ($db->table('menu_item_options')
                ->where('menu_id', $menuId)
                ->orderBy('priority')
                ->orderBy('menu_option_id')
                ->get() as $itemOption) {
                $option = $db->table('menu_options')
                    ->where('option_id', $itemOption->option_id)
                    ->first();

                if (!$option) continue;

                $definition = [
                    'option' => $this->only((array)$option, [
                        'option_name', 'display_type', 'priority',
                    ]),
                    'item' => $this->only((array)$itemOption, [
                        'required', 'priority', 'min_selected', 'max_selected',
                    ]),
                    'values' => [],
                    'selected_values' => [],
                ];

                $values = $db->table('menu_option_values')
                    ->where('option_id', $itemOption->option_id)
                    ->orderBy('priority')
                    ->orderBy('option_value_id')
                    ->get();

                $sourceValueNames = [];
                foreach ($values as $value) {
                    $sourceValueNames[(int)$value->option_value_id] = (string)$value->value;
                    $definition['values'][] = $this->only((array)$value, [
                        'value', 'price', 'priority',
                    ]);
                }

                foreach ($db->table('menu_item_option_values')
                    ->where('menu_option_id', $itemOption->menu_option_id)
                    ->orderBy('priority')
                    ->orderBy('menu_option_value_id')
                    ->get() as $selected) {
                    $valueId = (int)($selected->option_value_id ?? 0);
                    if (!isset($sourceValueNames[$valueId])) continue;

                    $definition['selected_values'][] = [
                        'value' => $sourceValueNames[$valueId],
                        'new_price' => $selected->new_price ?? null,
                        'priority' => $selected->priority ?? 0,
                        'is_default' => $selected->is_default ?? 0,
                    ];
                }

                $payload['options'][] = $definition;
            }
        }

        return $payload;
    }

    public function import(
        $db,
        array $payload,
        ?int $menuId,
        int $locationId
    ): int {
        $menu = (array)($payload['menu'] ?? []);
        if (!$menu || empty($menu['menu_name'])) {
            throw new \RuntimeException('Menu payload is incomplete.');
        }

        $now = now();

        if ($menuId && $db->table('menus')->where('menu_id', $menuId)->exists()) {
            $data = $this->columns($db, 'menus', $menu);
            $this->timestamp($db, 'menus', $data, false, $now);
            $db->table('menus')->where('menu_id', $menuId)->update($data);
        } else {
            $data = $this->columns($db, 'menus', $menu);
            $this->timestamp($db, 'menus', $data, true, $now);
            $menuId = (int)$db->table('menus')->insertGetId($data);
        }

        $this->bindLocation($db, 'menus', $menuId, $locationId);

        $this->syncCategories($db, $menuId, $locationId, (array)($payload['categories'] ?? []), $now);
        $this->syncMealtimes($db, $menuId, $locationId, (array)($payload['mealtimes'] ?? []), $now);
        $this->syncPrices($db, $menuId, (array)($payload['prices'] ?? []), $now);
        $this->syncSpecial($db, $menuId, $payload['special'] ?? null);
        $this->syncAllergens($db, $menuId, (array)($payload['allergens'] ?? []));
        $this->syncOptions($db, $menuId, $locationId, (array)($payload['options'] ?? []), $now);

        return $menuId;
    }

    private function syncCategories(
        $db,
        int $menuId,
        int $locationId,
        array $categories,
        $now
    ): void {
        if (!$this->table($db, 'menu_categories') || !$this->table($db, 'categories')) return;

        $ids = [];

        foreach ($categories as $category) {
            $category = (array)$category;
            $existing = null;

            if (!empty($category['permalink_slug'])) {
                $existing = $db->table('categories')
                    ->where('permalink_slug', $category['permalink_slug'])
                    ->first();
            }

            if (!$existing && !empty($category['name'])) {
                $existing = $db->table('categories')
                    ->whereRaw('LOWER(name) = ?', [strtolower((string)$category['name'])])
                    ->first();
            }

            $data = $this->columns($db, 'categories', $category);

            if ($existing) {
                $id = (int)$existing->category_id;
                $this->timestamp($db, 'categories', $data, false, $now);
                $db->table('categories')->where('category_id', $id)->update($data);
            } else {
                $this->timestamp($db, 'categories', $data, true, $now);
                $id = (int)$db->table('categories')->insertGetId($data);
            }

            $ids[] = $id;
            $this->bindLocation($db, 'categories', $id, $locationId);
        }

        $db->table('menu_categories')->where('menu_id', $menuId)->delete();

        foreach (array_values(array_unique($ids)) as $id) {
            $db->table('menu_categories')->insert([
                'menu_id' => $menuId,
                'category_id' => $id,
            ]);
        }
    }

    private function syncMealtimes(
        $db,
        int $menuId,
        int $locationId,
        array $mealtimes,
        $now
    ): void {
        if (!$this->table($db, 'menu_mealtimes') || !$this->table($db, 'mealtimes')) return;

        $ids = [];

        foreach ($mealtimes as $mealtime) {
            $mealtime = (array)$mealtime;
            $name = trim((string)($mealtime['mealtime_name'] ?? ''));
            if ($name === '') continue;

            $existing = $db->table('mealtimes')
                ->whereRaw('LOWER(mealtime_name) = ?', [strtolower($name)])
                ->first();

            $data = $this->columns($db, 'mealtimes', $mealtime);

            if ($existing) {
                $id = (int)$existing->mealtime_id;
                $this->timestamp($db, 'mealtimes', $data, false, $now);
                $db->table('mealtimes')->where('mealtime_id', $id)->update($data);
            } else {
                $this->timestamp($db, 'mealtimes', $data, true, $now);
                $id = (int)$db->table('mealtimes')->insertGetId($data);
            }

            $ids[] = $id;
            $this->bindLocation($db, 'mealtimes', $id, $locationId);
        }

        $db->table('menu_mealtimes')->where('menu_id', $menuId)->delete();

        foreach (array_values(array_unique($ids)) as $id) {
            $db->table('menu_mealtimes')->insert([
                'menu_id' => $menuId,
                'mealtime_id' => $id,
            ]);
        }
    }

    private function syncPrices($db, int $menuId, array $prices, $now): void
    {
        if (!$this->table($db, 'menu_prices')) return;

        $db->table('menu_prices')->where('menu_id', $menuId)->delete();

        foreach ($prices as $price) {
            $data = $this->columns($db, 'menu_prices', (array)$price);
            $data['menu_id'] = $menuId;
            $this->timestamp($db, 'menu_prices', $data, true, $now);
            $db->table('menu_prices')->insert($data);
        }
    }

    private function syncSpecial($db, int $menuId, $special): void
    {
        if (!$this->table($db, 'menus_specials')) return;

        $db->table('menus_specials')->where('menu_id', $menuId)->delete();

        if (is_array($special) && $special) {
            $data = $this->columns($db, 'menus_specials', $special);
            $data['menu_id'] = $menuId;
            $db->table('menus_specials')->insert($data);
        }
    }

    private function syncAllergens($db, int $menuId, array $allergens): void
    {
        if (!$this->table($db, 'allergenables') || !$this->table($db, 'allergens')) return;

        $db->table('allergenables')
            ->where('allergenable_id', $menuId)
            ->whereIn('allergenable_type', ['menus', 'Admin\\Models\\Menus_model'])
            ->delete();

        foreach ($allergens as $allergen) {
            $allergen = (array)$allergen;
            $name = trim((string)($allergen['name'] ?? ''));
            if ($name === '') continue;

            $existing = $db->table('allergens')
                ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                ->first();

            $data = $this->columns($db, 'allergens', $allergen);

            if ($existing) {
                $allergenId = (int)$existing->allergen_id;
                $db->table('allergens')->where('allergen_id', $allergenId)->update($data);
            } else {
                $allergenId = (int)$db->table('allergens')->insertGetId($data);
            }

            $db->table('allergenables')->insert([
                'allergen_id' => $allergenId,
                'allergenable_id' => $menuId,
                'allergenable_type' => 'menus',
            ]);
        }
    }

    private function syncOptions(
        $db,
        int $menuId,
        int $locationId,
        array $options,
        $now
    ): void {
        if (
            !$this->table($db, 'menu_item_options')
            || !$this->table($db, 'menu_options')
            || !$this->table($db, 'menu_option_values')
            || !$this->table($db, 'menu_item_option_values')
        ) {
            return;
        }

        $oldItemOptions = $db->table('menu_item_options')
            ->where('menu_id', $menuId)
            ->pluck('menu_option_id');

        if ($oldItemOptions->isNotEmpty()) {
            $db->table('menu_item_option_values')
                ->whereIn('menu_option_id', $oldItemOptions)
                ->delete();
        }

        $db->table('menu_item_options')->where('menu_id', $menuId)->delete();

        foreach ($options as $definition) {
            $definition = (array)$definition;
            $option = (array)($definition['option'] ?? []);
            $optionName = trim((string)($option['option_name'] ?? ''));
            if ($optionName === '') continue;

            $displayType = trim((string)($option['display_type'] ?? 'radio')) ?: 'radio';

            $existingOption = $db->table('menu_options')
                ->whereRaw('LOWER(option_name) = ?', [strtolower($optionName)])
                ->where('display_type', $displayType)
                ->first();

            $optionData = $this->columns($db, 'menu_options', $option);
            $optionData['option_name'] = $optionName;
            $optionData['display_type'] = $displayType;

            if ($existingOption) {
                $optionId = (int)$existingOption->option_id;
                $this->timestamp($db, 'menu_options', $optionData, false, $now);
                $db->table('menu_options')->where('option_id', $optionId)->update($optionData);
            } else {
                $this->timestamp($db, 'menu_options', $optionData, true, $now);
                $optionId = (int)$db->table('menu_options')->insertGetId($optionData);
            }

            $this->bindLocation($db, 'menu_options', $optionId, $locationId);

            $valueMap = [];
            foreach ((array)($definition['values'] ?? []) as $value) {
                $value = (array)$value;
                $label = trim((string)($value['value'] ?? ''));
                if ($label === '') continue;

                $existingValue = $db->table('menu_option_values')
                    ->where('option_id', $optionId)
                    ->whereRaw('LOWER(value) = ?', [strtolower($label)])
                    ->first();

                $valueData = $this->columns($db, 'menu_option_values', $value);
                $valueData['option_id'] = $optionId;

                if ($existingValue) {
                    $valueId = (int)$existingValue->option_value_id;
                    $db->table('menu_option_values')
                        ->where('option_value_id', $valueId)
                        ->update($valueData);
                } else {
                    $valueId = (int)$db->table('menu_option_values')->insertGetId($valueData);
                }

                $valueMap[strtolower($label)] = $valueId;
            }

            $itemData = $this->columns(
                $db,
                'menu_item_options',
                (array)($definition['item'] ?? [])
            );
            $itemData['menu_id'] = $menuId;
            $itemData['option_id'] = $optionId;
            $this->timestamp($db, 'menu_item_options', $itemData, true, $now);
            $menuOptionId = (int)$db->table('menu_item_options')->insertGetId($itemData);

            foreach ((array)($definition['selected_values'] ?? []) as $selected) {
                $selected = (array)$selected;
                $label = strtolower(trim((string)($selected['value'] ?? '')));
                if ($label === '' || empty($valueMap[$label])) continue;

                $data = $this->columns($db, 'menu_item_option_values', [
                    'menu_option_id' => $menuOptionId,
                    'menu_id' => $menuId,
                    'option_id' => $optionId,
                    'option_value_id' => $valueMap[$label],
                    'new_price' => $selected['new_price'] ?? null,
                    'priority' => $selected['priority'] ?? 0,
                    'is_default' => $selected['is_default'] ?? 0,
                ]);
                $this->timestamp($db, 'menu_item_option_values', $data, true, $now);
                $db->table('menu_item_option_values')->insert($data);
            }
        }
    }

    private function bindLocation(
        $db,
        string $type,
        int $id,
        int $locationId
    ): void {
        if (!$this->table($db, 'locationables')) return;

        $exists = $db->table('locationables')
            ->where('location_id', $locationId)
            ->where('locationable_id', $id)
            ->where('locationable_type', $type)
            ->exists();

        if (!$exists) {
            $db->table('locationables')->insert([
                'location_id' => $locationId,
                'locationable_id' => $id,
                'locationable_type' => $type,
                'options' => serialize([]),
            ]);
        }
    }

    private function timestamp(
        $db,
        string $table,
        array &$data,
        bool $create,
        $now
    ): void {
        $schema = $db->getSchemaBuilder();
        if ($create && $schema->hasColumn($table, 'created_at')) {
            $data['created_at'] = $now;
        }
        if ($schema->hasColumn($table, 'updated_at')) {
            $data['updated_at'] = $now;
        }
    }

    private function table($db, string $table): bool
    {
        return $db->getSchemaBuilder()->hasTable($table);
    }

    private function columns($db, string $table, array $data): array
    {
        $columns = array_flip($db->getSchemaBuilder()->getColumnListing($table));
        return array_intersect_key($data, $columns);
    }

    private function only(array $row, array $keys): array
    {
        $result = [];
        foreach ($keys as $key) {
            if (array_key_exists($key, $row)) $result[$key] = $row[$key];
        }
        return $result;
    }
}
