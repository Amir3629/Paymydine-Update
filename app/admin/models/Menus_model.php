<?php

namespace Admin\Models;

use Admin\Traits\Locationable;
use Admin\Traits\Stockable;
use Admin\Models\Menu_prices_model;
use Carbon\Carbon;
use Igniter\Flame\Database\Attach\HasMedia;
use Igniter\Flame\Database\Model;
use Igniter\Flame\Database\Traits\Purgeable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Menus Model Class
 */
class Menus_model extends Model
{
    use Purgeable;
    use Locationable;
    use HasMedia;
    use Stockable;

    const LOCATIONABLE_RELATION = 'locations';

    /**
     * @var string The database table name
     */
    protected $table = 'menus';

    /**
     * @var string The database table primary key
     */
    protected $primaryKey = 'menu_id';

    protected $guarded = [];

    protected $casts = [
        'menu_price' => 'float',
        'menu_category_id' => 'integer',
        'minimum_qty' => 'integer',
        'order_restriction' => 'array',
        'menu_status' => 'boolean',
        'menu_priority' => 'integer',
        'prep_time_minutes' => 'integer',
        'is_stock_out' => 'boolean',
        'is_chef_recommended' => 'boolean',
        'is_manual_bestseller' => 'boolean',
        'is_halal' => 'boolean',
        'is_vegetarian' => 'boolean',
        'is_vegan' => 'boolean',
        'calories' => 'integer',
        'protein' => 'float',
        'carbs' => 'float',
        'fat' => 'float',
        'sugar' => 'float',
    ];

    public $relation = [
        'hasMany' => [
            'menu_options' => ['Admin\Models\Menu_item_options_model', 'delete' => true],
            'prices' => ['Admin\Models\Menu_prices_model', 'delete' => true],
            'menu_images' => ['Admin\Models\Menu_images_model', 'delete' => true],
        ],
        'hasOne' => [
            'special' => ['Admin\Models\Menus_specials_model', 'delete' => true],
        ],
        'belongsToMany' => [
            'categories' => ['Admin\Models\Categories_model', 'table' => 'menu_categories'],
            'mealtimes' => ['Admin\Models\Mealtimes_model', 'table' => 'menu_mealtimes'],
        ],
        'morphToMany' => [
            'allergens' => ['Admin\Models\Allergens_model', 'name' => 'allergenable'],
            'locations' => ['Admin\Models\Locations_model', 'name' => 'locationable'],
        ],
    ];

    protected $purgeable = [
        'menu_options',
        'special',
        'prices',
        'menu_images_inline',
        'menu_images_inline_json',
    ];

    public $mediable = ['thumb'];

    public static $allowedSortingColumns = ['menu_priority asc', 'menu_priority desc'];

    public $timestamps = true;

    public function getMenuPriceFromAttribute()
    {
        if (!$this->menu_options)
            return $this->menu_price;

        return $this->menu_options->mapWithKeys(function ($option) {
            return $option->menu_option_values->keyBy('menu_option_value_id');
        })->min('price') ?: 0;
    }

    public function getMinimumQtyAttribute($value)
    {
        return $value ?: 1;
    }

    //
    // Scopes
    //
    public function scopeWhereHasAllergen($query, $allergenId)
    {
        $query->whereHas('allergens', function ($q) use ($allergenId) {
            $q->where('allergens.allergen_id', $allergenId);
        });
    }

    public function scopeWhereHasCategory($query, $categoryId)
    {
        $query->whereHas('categories', function ($q) use ($categoryId) {
            $q->where('categories.category_id', $categoryId);
        });
    }

    public function scopeWhereHasMealtime($query, $mealtimeId)
    {
        $query->whereHas('mealtimes', function ($q) use ($mealtimeId) {
            $q->where('mealtimes.mealtime_id', $mealtimeId);
        });
    }

    public function scopeListFrontEnd($query, $options = [])
    {
        extract(array_merge([
            'page' => 1,
            'pageLimit' => 20,
            'enabled' => true,
            'sort' => 'menu_priority asc',
            'group' => null,
            'location' => null,
            'category' => null,
            'search' => '',
            'orderType' => null,
        ], $options));

        $searchableFields = ['menu_name', 'menu_description'];

        if (strlen($location) && is_numeric($location)) {
            $query->whereHasOrDoesntHaveLocation($location);
            $query->with(['categories' => function ($q) use ($location) {
                $q->whereHasOrDoesntHaveLocation($location);
                $q->isEnabled();
            }]);
        }

        if (strlen($category)) {
            $query->whereHas('categories', function ($q) use ($category) {
                $q->whereSlug($category);
            });
        }

        if (!is_array($sort)) {
            $sort = [$sort];
        }

        foreach ($sort as $_sort) {
            if (in_array($_sort, self::$allowedSortingColumns)) {
                $parts = explode(' ', $_sort);
                if (count($parts) < 2) {
                    $parts[] = 'desc';
                }
                [$sortField, $sortDirection] = $parts;
                $query->orderBy($sortField, $sortDirection);
            }
        }

        $search = trim($search);
        if (strlen($search)) {
            $query->search($search, $searchableFields);
        }

        if (strlen($group)) {
            $query->whereHas('categories', function ($q) use ($group) {
                $q->groupBy($group);
            });
        }

        if ($enabled) {
            $query->isEnabled();
        }

        if ($orderType) {
            $query->where(function ($query) use ($orderType) {
                $query->whereNull('order_restriction')
                    ->orWhere('order_restriction', 'like', '%"'.$orderType.'"%');
            });
        }

        $this->fireEvent('model.extendListFrontEndQuery', [$query]);

        return $query->paginate($pageLimit, $page);
    }

    public function scopeIsEnabled($query)
    {
        return $query->where('menu_status', 1);
    }

    /**
     * Scope to filter items that are NOT stock out
     * 
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeInStock($query)
    {
        return $query->where('is_stock_out', 0);
    }

    /**
     * Scope to filter items that ARE stock out
     * 
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeStockOut($query)
    {
        return $query->where('is_stock_out', 1);
    }

    /**
     * Check if item is stock out
     * 
     * @return bool
     */
    public function isStockOut()
    {
        return (bool) $this->is_stock_out;
    }

    //
    // Events
    //


    protected function beforeSave()
    {
        $this->guardRecommendationFieldsForTenantSchema();
    }

    protected function guardRecommendationFieldsForTenantSchema(): void
    {
        $recommendationColumns = [
            'is_chef_recommended',
            'is_manual_bestseller',
            'bestseller_override_mode',
        ];

        foreach ($recommendationColumns as $column) {
            if (!Schema::hasColumn($this->getTable(), $column)) {
                unset($this->attributes[$column]);
                Log::warning('PMD_MENU_RECOMMENDATION_COLUMN_MISSING_ON_SAVE', [
                    'table' => $this->getTable(),
                    'column' => $column,
                    'connection' => $this->getConnectionName() ?: config('database.default'),
                    'database' => $this->getConnection()->getDatabaseName(),
                ]);
            }
        }

        if (array_key_exists('bestseller_override_mode', $this->attributes)) {
            $mode = (string)($this->attributes['bestseller_override_mode'] ?: 'auto');
            $this->attributes['bestseller_override_mode'] = in_array($mode, ['auto', 'force_on', 'force_off'], true) ? $mode : 'auto';
        }
    }

    protected function afterSave()
    {
        $this->restorePurgedValues();

        if (array_key_exists('menu_options', $this->attributes))
            $this->addMenuOption((array)$this->attributes['menu_options']);

        if (array_key_exists('special', $this->attributes))
            $this->addMenuSpecial((array)$this->attributes['special']);

        if (array_key_exists('prices', $this->attributes))
            $this->addMenuPrices((array)$this->attributes['prices']);

        // PMD: sync compact inline additional menu images after normal menu save.
        $this->syncMenuImagesInline();
    }

    /**
     * PMD: Sync compact inline menu gallery rows after the menu has an ID.
     * Reads direct request payload because the custom partial is not a normal DB column.
     */
    protected function syncMenuImagesInline(): void
    {
        try {
            $request = request();

            $hasGalleryPayload = $request->has('menu_images_inline')
                || $request->has('menu_images_inline_json')
                || $request->has('Menu.menu_images_inline')
                || $request->has('Menu.menu_images_inline_json')
                || $request->has('menus.menu_images_inline')
                || $request->has('menus.menu_images_inline_json')
                || $request->has('Menus.menu_images_inline')
                || $request->has('Menus.menu_images_inline_json')
                || array_key_exists('menu_images_inline', $this->attributes)
                || array_key_exists('menu_images_inline_json', $this->attributes);

            if (!$hasGalleryPayload) {
                return;
            }

            $payload = null;

            $jsonCandidates = [
                $request->input('menu_images_inline_json'),
                $request->input('Menu.menu_images_inline_json'),
                $request->input('menus.menu_images_inline_json'),
                $request->input('Menus.menu_images_inline_json'),
                $this->attributes['menu_images_inline_json'] ?? null,
            ];

            foreach ($jsonCandidates as $candidate) {
                if (is_string($candidate) && trim($candidate) !== '') {
                    $decoded = json_decode($candidate, true);
                    if (is_array($decoded)) {
                        $payload = $decoded;
                        break;
                    }
                }
            }

            if ($payload === null) {
                $payloadCandidates = [
                    $request->input('menu_images_inline'),
                    $request->input('Menu.menu_images_inline'),
                    $request->input('menus.menu_images_inline'),
                    $request->input('Menus.menu_images_inline'),
                    $this->attributes['menu_images_inline'] ?? null,
                ];

                foreach ($payloadCandidates as $candidate) {
                    if (is_string($candidate) && trim($candidate) !== '') {
                        $decoded = json_decode($candidate, true);
                        if (is_array($decoded)) {
                            $payload = $decoded;
                            break;
                        }
                    }

                    if (is_array($candidate)) {
                        $payload = $candidate;
                        break;
                    }
                }
            }

            if (!is_array($payload)) {
                $payload = [];
            }

            $rows = [];
            $position = 1;

            foreach ($payload as $key => $row) {
                if (is_string($row)) {
                    $imagePath = $row;
                    $sortOrder = is_numeric($key) ? ((int)$key + 1) : $position;
                } elseif (is_array($row)) {
                    $imagePath = $row['image_path']
                        ?? $row['path']
                        ?? $row['value']
                        ?? $row['url']
                        ?? '';

                    if (is_array($imagePath)) {
                        $imagePath = $imagePath['path']
                            ?? $imagePath['value']
                            ?? $imagePath['url']
                            ?? reset($imagePath)
                            ?? '';
                    }

                    $sortOrder = (int)($row['sort_order'] ?? $row['order'] ?? (is_numeric($key) ? ((int)$key + 1) : $position));
                } else {
                    continue;
                }

                $imagePath = trim((string)$imagePath);

                if ($imagePath === '') {
                    continue;
                }

                $imagePath = preg_replace('#^https?://[^/]+#i', '', $imagePath);
                $imagePath = preg_replace('#^/assets/media/uploads/#i', '', $imagePath);
                $imagePath = preg_replace('#^/assets/media/#i', '', $imagePath);
                $imagePath = preg_replace('#^/api/media/#i', '', $imagePath);
                $imagePath = ltrim($imagePath, '/');

                if ($imagePath === '') {
                    continue;
                }

                $rows[] = [
                    'image_path' => $imagePath,
                    'sort_order' => $sortOrder > 0 ? $sortOrder : $position,
                ];

                $position++;
            }

            usort($rows, function ($a, $b) {
                return ((int)$a['sort_order']) <=> ((int)$b['sort_order']);
            });

            $menuId = $this->getKey();

            if (!$menuId) {
                return;
            }

            $this->menu_images()->delete();

            foreach (array_values($rows) as $idx => $row) {
                $this->menu_images()->create([
                    'menu_id' => $menuId,
                    'image_path' => $row['image_path'],
                    'sort_order' => (int)($row['sort_order'] ?: ($idx + 1)),
                ]);
            }

            \Log::info('PMD menu_images_inline synced', [
                'menu_id' => $menuId,
                'count' => count($rows),
                'rows' => $rows,
            ]);
        } catch (\Throwable $e) {
            \Log::error('PMD menu_images_inline sync failed', [
                'menu_id' => method_exists($this, 'getKey') ? $this->getKey() : null,
                'error' => $e->getMessage(),
            ]);
        }
    }





    protected function beforeDelete()
    {
        $this->categories()->detach();
        $this->mealtimes()->detach();
        $this->allergens()->detach();
        $this->locations()->detach();
    }

    //
    // Helpers
    //

    public function hasOptions()
    {
        return count($this->menu_options);
    }

    /**
     * Subtract or add to menu stock quantity
     *
     * @param int $quantity
     * @param bool $subtract
     * @return bool TRUE on success, or FALSE on failure
     */
    public function updateStock($quantity = 0, $subtract = true)
    {
        traceLog('Menus_model::updateStock() has been deprecated, use Stocks_model::updateStock() instead.');
    }

    /**
     * Create new or update existing menu allergens
     *
     * @param array $allergenIds if empty all existing records will be deleted
     *
     * @return bool
     */
    public function addMenuAllergens(array $allergenIds = [])
    {
        if (!$this->exists)
            return false;

        $this->allergens()->sync($allergenIds);
    }

    /**
     * Create new or update existing menu categories
     *
     * @param array $categoryIds if empty all existing records will be deleted
     *
     * @return bool
     */
    public function addMenuCategories(array $categoryIds = [])
    {
        if (!$this->exists)
            return false;

        $this->categories()->sync($categoryIds);
    }

    /**
     * Create new or update existing menu mealtimes
     *
     * @param array $mealtimeIds if empty all existing records will be deleted
     *
     * @return bool
     */
    public function addMenuMealtimes(array $mealtimeIds = [])
    {
        if (!$this->exists)
            return false;

        $this->mealtimes()->sync($mealtimeIds);
    }

    /**
     * Create new or update existing menu options
     *
     * @param array $menuOptions if empty all existing records will be deleted
     *
     * @return bool
     */
    public function addMenuOption(array $menuOptions = [])
    {
        $menuId = $this->getKey();
        if (!is_numeric($menuId))
            return false;

        $idsToKeep = [];
        foreach ($menuOptions as $option) {
            $option['menu_id'] = $menuId;
            $menuOption = $this->menu_options()->firstOrNew([
                'menu_option_id' => array_get($option, 'menu_option_id'),
            ])->fill(array_except($option, ['menu_option_id']));

            $menuOption->saveOrFail();
            $idsToKeep[] = $menuOption->getKey();
        }

        $this->menu_options()->whereNotIn('menu_option_id', $idsToKeep)->delete();

        return count($idsToKeep);
    }

    /**
     * Create new or update existing menu special
     *
     * @param bool $id
     * @param array $menuSpecial
     *
     * @return bool
     */
    public function addMenuSpecial(array $menuSpecial = [])
    {
        $menuId = $this->getKey();
        if (!is_numeric($menuId))
            return false;

        $menuSpecial['menu_id'] = $menuId;
        $this->special()->updateOrCreate([
            'special_id' => $menuSpecial['special_id'] ?? null,
        ], array_except($menuSpecial, 'special_id'));
    }

    /**
     * Create new or update existing menu prices
     *
     * @param array $menuPrices if empty all existing records will be deleted
     *
     * @return bool
     */
    public function addMenuPrices(array $menuPrices = [])
    {
        $menuId = $this->getKey();
        if (!is_numeric($menuId))
            return false;

        $idsToKeep = [];
        foreach ($menuPrices as $price) {
            $price['menu_id'] = $menuId;
            $menuPrice = $this->prices()->firstOrNew([
                'price_id' => array_get($price, 'price_id'),
            ])->fill(array_except($price, ['price_id']));

            $menuPrice->saveOrFail();
            $idsToKeep[] = $menuPrice->getKey();
        }

        $this->prices()->whereNotIn('price_id', $idsToKeep)->delete();

        return count($idsToKeep);
    }

    /**
     * Get price for a specific context and time
     *
     * @param string $priceType (default, bar, dining_room, room_service, happy_hour)
     * @param \Carbon\Carbon|null $datetime
     * @return float|null
     */
    public function getPriceForContext($priceType = 'default', $datetime = null)
    {
        $price = Menu_prices_model::getPriceForContext($this->menu_id, $priceType, $datetime);
        
        // Fallback to base menu_price if no pricing found
        return $price !== null ? $price : $this->menu_price;
    }

    /**
     * Is menu item available on a given datetime
     *
     * @param string | \Carbon\Carbon $datetime
     *
     * @return bool
     */
    public function isAvailable($datetime = null)
    {
        // First check if item is enabled and not stock out
        if ($this->menu_status != 1 || $this->is_stock_out == 1) {
            return false;
        }

        if (is_null($datetime))
            $datetime = Carbon::now();

        if (!$datetime instanceof Carbon) {
            $datetime = Carbon::parse($datetime);
        }

        $isAvailable = true;

        if (count($this->mealtimes) > 0) {
            $isAvailable = false;
            foreach ($this->mealtimes as $mealtime) {
                if ($mealtime->mealtime_status) {
                    $isAvailable = $isAvailable || $mealtime->isAvailable($datetime);
                }
            }
        }

        if (is_bool($eventResults = $this->fireSystemEvent('admin.menu.isAvailable', [$datetime, $isAvailable], true)))
            $isAvailable = $eventResults;

        return $isAvailable;
    }


}
