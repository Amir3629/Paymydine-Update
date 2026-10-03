<?php

namespace Admin\Controllers\Concerns;

use Admin\Models\Menus_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Waiter POS V2.6 menu catalog.
 *
 * Keeps every enabled/in-stock food visible, while making items without a
 * configured base price read-only. Primary images use the same media source as
 * the customer menu API; additional images continue to use menu_images.
 */
trait PmdWaiterPosMenuCatalogV26Concern
{
    protected function menuPayload(int $locationId): array
    {
        $with = [
            'categories',
            'menu_options.menu_option_values.option_value',
        ];

        if (Schema::hasTable('allergens') && Schema::hasTable('allergenables')) {
            $with[] = 'allergens';
        }

        if (Schema::hasTable('menu_images')) {
            $with['menu_images'] = function ($query) {
                if (Schema::hasColumn('menu_images', 'sort_order')) {
                    $query->orderBy('sort_order');
                }
                if (Schema::hasColumn('menu_images', 'id')) {
                    $query->orderBy('id');
                }
            };
        }

        $query = Menus_model::with($with)
            ->where('menu_status', 1)
            ->orderBy('menu_priority')
            ->orderBy('menu_name');

        if (Schema::hasColumn('menus', 'is_stock_out')) {
            $query->where(function ($q) {
                $q->whereNull('is_stock_out')->orWhere('is_stock_out', 0);
            });
        }

        $rows = $query->limit(500)->get();
        $menuIds = $rows->map(function ($menu) {
            return (int)$menu->getKey();
        })->filter()->values()->all();

        $primaryImages = $this->waiterPosPrimaryImagesV26($menuIds);
        $categories = [];
        $items = [];
        $unconfiguredPriceItems = 0;
        $bestsellerIds = $this->waiterPosBestsellerIds();

        foreach ($rows as $menu) {
            $menuId = (int)$menu->getKey();
            $price = round((float)$menu->menu_price, 4);
            $priceConfigured = $price > 0;
            if (!$priceConfigured) {
                $unconfiguredPriceItems++;
            }

            $menuCategories = [];
            $categoryNames = [];
            foreach (($menu->categories ?: collect()) as $category) {
                $categoryId = (int)($category->category_id ?? $category->getKey());
                $categoryName = trim((string)($category->name ?? $category->category_name ?? 'Menu'));
                if (!$categoryId) {
                    continue;
                }
                $categories[$categoryId] = ['id' => $categoryId, 'name' => $categoryName ?: 'Menu'];
                $menuCategories[] = $categoryId;
                if ($categoryName !== '') {
                    $categoryNames[] = $categoryName;
                }
            }

            $options = [];
            foreach (($menu->menu_options ?: collect()) as $option) {
                $values = [];
                foreach (($option->menu_option_values ?: collect()) as $value) {
                    $valueId = (int)($value->menu_option_value_id ?? $value->getKey());
                    if (!$valueId) {
                        continue;
                    }
                    $values[] = [
                        'id' => $valueId,
                        'name' => (string)($value->name ?? optional($value->option_value)->value ?? 'Option'),
                        'price' => (float)($value->price ?? $value->new_price ?? 0),
                        'default' => (bool)($value->is_default ?? false),
                    ];
                }
                if ($values) {
                    $options[] = [
                        'id' => (int)($option->menu_option_id ?? $option->getKey()),
                        'name' => (string)($option->option_name ?? optional($option->option)->option_name ?? 'Options'),
                        'required' => (bool)($option->required ?? false),
                        'min' => (int)($option->min_selected ?? 0),
                        'max' => max(1, (int)($option->max_selected ?? 1)),
                        'display_type' => (string)($option->display_type ?? 'radio'),
                        'values' => $values,
                    ];
                }
            }

            $allergens = [];
            if (isset($menu->allergens)) {
                foreach (($menu->allergens ?: collect()) as $allergen) {
                    if (isset($allergen->status) && !(bool)$allergen->status) {
                        continue;
                    }
                    $name = trim((string)($allergen->name ?? $allergen->allergen_name ?? ''));
                    if ($name === '') {
                        continue;
                    }
                    $allergens[] = [
                        'id' => (int)($allergen->allergen_id ?? $allergen->getKey()),
                        'name' => $name,
                        'description' => trim((string)($allergen->description ?? '')),
                    ];
                }
            }

            $images = [];
            if (!empty($primaryImages[$menuId])) {
                $images[] = $primaryImages[$menuId];
            }
            foreach ($this->waiterPosAdditionalImagesV26($menu) as $image) {
                if ($image !== '' && !in_array($image, $images, true)) {
                    $images[] = $image;
                }
            }

            $override = strtolower(trim((string)($menu->bestseller_override_mode ?? 'auto')));
            $isBestseller = $override === 'force_on'
                || ($override !== 'force_off' && isset($bestsellerIds[$menuId]));

            $items[] = [
                'id' => $menuId,
                'name' => (string)$menu->menu_name,
                'description' => trim(strip_tags((string)($menu->menu_description ?? ''))),
                'price' => $price,
                'price_configured' => $priceConfigured,
                'orderable' => $priceConfigured,
                'category_ids' => $menuCategories,
                'category_names' => array_values(array_unique($categoryNames)),
                'options' => $options,
                'has_options' => count($options) > 0,
                'prep_minutes' => (int)($menu->prep_time_minutes ?? 0),
                'minimum_qty' => max(1, (int)($menu->minimum_qty ?? 1)),
                'image' => $images[0] ?? null,
                'images' => $images,
                'halal' => (bool)($menu->is_halal ?? false),
                'vegetarian' => (bool)($menu->is_vegetarian ?? false),
                'vegan' => (bool)($menu->is_vegan ?? false),
                'allergens' => $allergens,
                'calories' => $this->nullableNumber($menu->calories ?? null, true),
                'protein' => $this->nullableNumber($menu->protein ?? null),
                'carbs' => $this->nullableNumber($menu->carbs ?? null),
                'fat' => $this->nullableNumber($menu->fat ?? null),
                'sugar' => $this->nullableNumber($menu->sugar ?? null),
                'serving_size' => trim((string)($menu->serving_size ?? '')) ?: null,
                'color' => trim((string)($menu->color ?? '')) ?: null,
                'is_chef_recommended' => (bool)($menu->is_chef_recommended ?? false),
                'is_bestseller' => $isBestseller,
                'bestseller_source' => $override === 'force_on' ? 'manual' : ($isBestseller ? 'sales' : null),
            ];
        }

        if (!$categories) {
            $categories[0] = ['id' => 0, 'name' => 'All items'];
        }

        return [
            'categories' => array_values($categories),
            'items' => $items,
            // Retained for V2 compatibility. Nothing is hidden anymore.
            'hidden_zero_price_items' => 0,
            'unconfigured_price_items' => $unconfiguredPriceItems,
        ];
    }

    protected function waiterPosPrimaryImagesV26(array $menuIds): array
    {
        if (!$menuIds || !Schema::hasTable('media_attachments')) {
            return [];
        }

        try {
            $cols = Schema::getColumnListing('media_attachments');
            $idCol = in_array('attachment_id', $cols, true) ? 'attachment_id' : null;
            $typeCol = in_array('attachment_type', $cols, true) ? 'attachment_type' : null;
            $tagCol = in_array('tag', $cols, true) ? 'tag' : null;
            $nameCol = null;
            foreach (['name', 'disk_name', 'file_name', 'path'] as $candidate) {
                if (in_array($candidate, $cols, true)) {
                    $nameCol = $candidate;
                    break;
                }
            }

            if (!$idCol || !$nameCol) {
                return [];
            }

            $query = DB::table('media_attachments')->whereIn($idCol, $menuIds);
            if ($typeCol) {
                $query->whereIn($typeCol, ['menus', 'Admin\\Models\\Menus_model']);
            }
            if ($tagCol) {
                $query->where($tagCol, 'thumb');
            }
            if (in_array('attachment_id', $cols, true)) {
                $query->orderBy('attachment_id');
            }
            if (in_array('id', $cols, true)) {
                $query->orderBy('id');
            }

            $out = [];
            foreach ($query->get([$idCol, $nameCol]) as $row) {
                $id = (int)($row->{$idCol} ?? 0);
                $name = trim((string)($row->{$nameCol} ?? ''));
                if ($id > 0 && $name !== '' && empty($out[$id])) {
                    $out[$id] = $this->normalizeWaiterPosCatalogImageV26($name, true);
                }
            }
            return array_filter($out);
        } catch (\Throwable $ignored) {
            return [];
        }
    }

    protected function waiterPosAdditionalImagesV26(Menus_model $menu): array
    {
        $images = [];
        if (!isset($menu->menu_images)) {
            return $images;
        }

        foreach (($menu->menu_images ?: collect()) as $row) {
            $path = trim((string)($row->image_path ?? $row->path ?? ''));
            if ($path === '') {
                continue;
            }
            $url = $this->normalizeWaiterPosCatalogImageV26($path, false);
            if ($url !== '' && !in_array($url, $images, true)) {
                $images[] = $url;
            }
        }
        return $images;
    }

    protected function normalizeWaiterPosCatalogImageV26(string $path, bool $primary): string
    {
        $path = trim($path);
        if ($path === '' || preg_match('#^https?://#i', $path)) {
            return $path;
        }

        if (strpos($path, '/') === 0) {
            return $path;
        }

        $path = ltrim($path, '/');
        if (strpos($path, 'api/media/') === 0 || strpos($path, 'assets/media/') === 0) {
            return '/'.$path;
        }
        if (strpos($path, 'attachments/public/') === 0) {
            return '/assets/media/'.$path;
        }
        if (strpos($path, 'uploads/') === 0) {
            return '/assets/media/'.$path;
        }

        return $primary
            ? '/api/media/'.$path
            : '/assets/media/uploads/'.$path;
    }
}
