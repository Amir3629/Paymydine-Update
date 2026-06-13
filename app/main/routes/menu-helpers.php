<?php

// Helper function to get menu item options
if (!function_exists('getMenuItemOptions')) {
    function getMenuItemOptions($menuId) {
    try {
        $p = DB::connection()->getTablePrefix();
        $optionsQuery = "
            SELECT
                mo.option_id as id,
                mo.option_name as name,
                mo.display_type,
                mio.required,
                mio.priority
            FROM {$p}menu_options mo
            INNER JOIN {$p}menu_item_options mio ON mo.option_id = mio.option_id
            WHERE mio.menu_id = ?
            ORDER BY mio.priority ASC, mo.option_name ASC
        ";

        $options = DB::select($optionsQuery, [$menuId]);

        // For each option, get its values
        foreach ($options as &$option) {
            $valuesQuery = "
                SELECT
                    mov.option_value_id as id,
                    mov.value,
                    COALESCE(miov.new_price, mov.price) as price,
                    miov.is_default
                FROM {$p}menu_option_values mov
                INNER JOIN {$p}menu_item_option_values miov ON mov.option_value_id = miov.option_value_id
                INNER JOIN {$p}menu_item_options mio ON miov.menu_option_id = mio.menu_option_id
                WHERE mio.menu_id = ? AND mio.option_id = ?
                ORDER BY miov.priority ASC, mov.value ASC
            ";

            $values = DB::select($valuesQuery, [$menuId, $option->id]);

            // Convert prices to float
            foreach ($values as &$value) {
                $value->price = (float)$value->price;
            }

            $option->values = $values;
        }

        return $options;

    } catch (\Exception $e) {
                \Log::error('PMD_ORDER_DEBUG exception', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'payload_all' => request()->all(),
                    'raw' => request()->getContent(),
                ]);
        // Return empty array if there's an error fetching options
        return [];
    }
    }
}

if (!function_exists('normalizeMenuFoodAttributes')) {
    function normalizeMenuFoodAttributes(&$item): void
    {
        $allergyTags = [];

        if (isset($item->allergy_names) && strlen((string)$item->allergy_names) > 0) {
            $allergyTags = array_values(array_filter(explode('||', (string)$item->allergy_names)));
            unset($item->allergy_names);
        } elseif (isset($item->allergens) && is_array($item->allergens)) {
            $allergyTags = $item->allergens;
        }

        $item->halal = (bool)($item->halal ?? $item->is_halal ?? 0);
        $item->vegetarian = (bool)($item->vegetarian ?? $item->is_vegetarian ?? 0);
        $item->vegan = (bool)($item->vegan ?? $item->is_vegan ?? 0);
        $item->allergens = $allergyTags;
        $item->allergy_tags = $allergyTags;
    }
}



if (!function_exists('pmdMenuColumnSelect')) {
    function pmdMenuColumnSelect($connection, string $tableAlias, string $column): string
    {
        try {
            if ($connection->getSchemaBuilder()->hasColumn('menus', $column)) {
                return $tableAlias.'.'.$column.' as '.$column;
            }
        } catch (\Throwable $e) {
            // Fall through to a null alias to keep pre-migration tenants working.
        }

        return 'NULL as '.$column;
    }
}

if (!function_exists('normalizeMenuNutrition')) {
    function normalizeMenuNutrition(&$item): void
    {
        $item->calories = isset($item->calories) && $item->calories !== null && $item->calories !== '' ? (int)$item->calories : null;

        foreach (['protein', 'carbs', 'fat', 'sugar'] as $field) {
            $item->{$field} = isset($item->{$field}) && $item->{$field} !== null && $item->{$field} !== '' ? (float)$item->{$field} : null;
        }

        $item->serving_size = isset($item->serving_size) && $item->serving_size !== '' ? (string)$item->serving_size : null;

        $hasNutrition = $item->calories !== null
            || $item->protein !== null
            || $item->carbs !== null
            || $item->fat !== null
            || $item->sugar !== null
            || $item->serving_size !== null;

        $item->nutrition = $hasNutrition ? [
            'calories' => $item->calories,
            'protein' => $item->protein,
            'carbs' => $item->carbs,
            'fat' => $item->fat,
            'sugar' => $item->sugar,
            'serving_size' => $item->serving_size,
            'disclaimer' => 'Restaurant-provided estimates. Values may vary by portion size, ingredients, and preparation.',
        ] : null;
    }
}

