<?php

namespace App\Services\PmdMobileSync;

use Admin\Models\Kds_stations_model;
use Admin\Models\Locations_model;
use Admin\Models\Menus_model;
use Admin\Models\Tables_model;
use Admin\Services\PmdDefaultStaffRoleService;
use Admin\Services\PmdSharedFloorRegistryV1;
use App\Services\Platform\LocationPlatformContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Read-only bootstrap for the native Android local database.
 *
 * No browser session state is trusted here. Identity comes from
 * PmdMobileDeviceAuthService and all data is read from the active tenant DB.
 */
final class PmdMobileBootstrapService
{
    public const VERSION = 'pmd-mobile-bootstrap-v1';

    public function build(array $identity): array
    {
        $locationId = (int)$identity['location_id'];
        $location = Locations_model::query()->find($locationId);

        if (!$location) {
            throw new \RuntimeException('Restaurant location was not found.');
        }

        $platform = app(LocationPlatformContext::class)->state($locationId);
        $floors = $this->floors($locationId);

        return [
            'ok' => true,
            'version' => self::VERSION,
            'generated_at' => now()->toIso8601String(),
            'profile_expires_at' => now()->addHours(8)->toIso8601String(),
            'sync_protocol' => 'pmd-sync-v1',
            'tenant' => [
                'host' => request()->getHost(),
                'database' => $this->safeDatabaseName(),
            ],
            'location' => [
                'id' => $locationId,
                'name' => (string)($location->location_name ?? ''),
                'country_code' => $platform['country_code'] ?? null,
                'timezone' => $platform['profile']['timezone']
                    ?? setting('timezone', 'UTC'),
                'currency_code' => $platform['profile']['currency']['code']
                    ?? strtoupper((string)setting('default_currency_code', 'EUR')),
                'currency_minor_exponent' => $platform['profile']['currency']['minor_exponent']
                    ?? 2,
            ],
            'platform_context' => $platform,
            'identity' => [
                'device_id' => (int)$identity['device_id'],
                'user_id' => (int)$identity['user_id'],
                'staff_id' => (int)$identity['staff_id'],
                'staff_name' => (string)(
                    $identity['staff']->staff_name
                    ?? $identity['user']->staff_name
                    ?? $identity['user']->username
                    ?? ''
                ),
                'role_code' => (string)$identity['role_code'],
                'permissions' => $identity['permissions'],
                'surfaces' => $this->surfaces((string)$identity['role_code']),
            ],
            'floors' => $floors['floors'],
            'table_floor_map' => $floors['table_floor_map'],
            'tables' => $this->tables($locationId),
            'menu' => $this->menu($locationId),
            'kds_stations' => $this->kdsStations($locationId),
            'payments' => [
                // Availability metadata only. Provider credentials never enter the app.
                'country_profile' => (array)($platform['profile']['payments'] ?? []),
                'terminal_profile' => (array)($platform['profile']['terminals'] ?? []),
                'offline_card_approval' => false,
            ],
            'sync' => [
                'cursor' => $this->currentCursor($locationId),
                'commands_enabled' => false,
                'reason' => 'Order command replay remains disabled until the global idempotent processor is certified.',
            ],
        ];
    }

    private function menu(int $locationId): array
    {
        $with = ['categories', 'menu_options.menu_option_values.option_value'];

        if (Schema::hasTable('allergens') && Schema::hasTable('allergenables')) {
            $with[] = 'allergens';
        }
        if (Schema::hasTable('menu_images')) {
            $with[] = 'menu_images';
        }

        $query = Menus_model::with($with)
            ->whereHasOrDoesntHaveLocation($locationId)
            ->where('menu_status', 1)
            ->orderByRaw('COALESCE(menu_priority, 999999) ASC')
            ->orderBy('menu_name');

        if (Schema::hasColumn('menus', 'is_stock_out')) {
            $query->where(function ($q) {
                $q->whereNull('is_stock_out')->orWhere('is_stock_out', 0);
            });
        }

        $categories = [];
        $items = [];

        foreach ($query->limit(750)->get() as $menu) {
            $categoryIds = [];
            $categoryNames = [];

            foreach (($menu->categories ?: collect()) as $category) {
                if (isset($category->status) && !(bool)$category->status) {
                    continue;
                }

                $id = (int)($category->category_id ?? $category->getKey());
                if ($id < 1) continue;

                $name = trim((string)($category->name ?? $category->category_name ?? 'Menu'));
                $categories[$id] = ['id' => $id, 'name' => $name ?: 'Menu'];
                $categoryIds[] = $id;
                if ($name !== '') $categoryNames[] = $name;
            }

            $options = [];
            foreach (($menu->menu_options ?: collect()) as $option) {
                $values = [];
                foreach (($option->menu_option_values ?: collect()) as $value) {
                    $valueId = (int)($value->menu_option_value_id ?? $value->getKey());
                    if ($valueId < 1) continue;

                    $values[] = [
                        'id' => $valueId,
                        'name' => (string)(
                            $value->name
                            ?? optional($value->option_value)->value
                            ?? 'Option'
                        ),
                        'price' => round((float)($value->price ?? $value->new_price ?? 0), 4),
                        'default' => (bool)($value->is_default ?? false),
                    ];
                }

                if ($values) {
                    $options[] = [
                        'id' => (int)($option->menu_option_id ?? $option->getKey()),
                        'name' => (string)(
                            $option->option_name
                            ?? optional($option->option)->option_name
                            ?? 'Options'
                        ),
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
                    if (isset($allergen->status) && !(bool)$allergen->status) continue;
                    $name = trim((string)($allergen->name ?? $allergen->allergen_name ?? ''));
                    if ($name === '') continue;

                    $allergens[] = [
                        'id' => (int)($allergen->allergen_id ?? $allergen->getKey()),
                        'name' => $name,
                    ];
                }
            }

            $images = $this->menuImages($menu);
            $price = round((float)$menu->menu_price, 4);

            $items[] = [
                'id' => (int)$menu->getKey(),
                'name' => (string)$menu->menu_name,
                'description' => trim(strip_tags((string)($menu->menu_description ?? ''))),
                'price' => $price,
                'price_configured' => $price > 0,
                'orderable' => $price > 0,
                'category_ids' => $categoryIds,
                'category_names' => array_values(array_unique($categoryNames)),
                'options' => $options,
                'has_options' => count($options) > 0,
                'minimum_qty' => max(1, (int)($menu->minimum_qty ?? 1)),
                'prep_minutes' => (int)($menu->prep_time_minutes ?? 0),
                'images' => $images,
                'image' => $images[0] ?? null,
                'allergens' => $allergens,
                'halal' => (bool)($menu->is_halal ?? false),
                'vegetarian' => (bool)($menu->is_vegetarian ?? false),
                'vegan' => (bool)($menu->is_vegan ?? false),
                'updated_at' => optional($menu->updated_at)->toIso8601String(),
            ];
        }

        return [
            'categories' => array_values($categories),
            'items' => $items,
        ];
    }

    private function menuImages($menu): array
    {
        $images = [];

        try {
            if (method_exists($menu, 'getThumb')) {
                $thumb = trim((string)$menu->getThumb());
                if ($thumb !== '') $images[] = $thumb;
            }
        } catch (\Throwable $error) {
        }

        if (isset($menu->menu_images)) {
            foreach (($menu->menu_images ?: collect()) as $image) {
                $path = trim((string)($image->image_path ?? $image->path ?? ''));
                if ($path !== '') $images[] = $path;
            }
        }

        return array_values(array_unique(array_filter($images)));
    }

    private function tables(int $locationId): array
    {
        return Tables_model::query()
            ->whereHasOrDoesntHaveLocation($locationId)
            ->isEnabled()
            ->orderBy('priority')
            ->orderBy('table_id')
            ->limit(500)
            ->get()
            ->map(function ($table) {
                return [
                    'id' => (int)$table->getKey(),
                    'number' => (string)($table->table_no ?? $table->getKey()),
                    'name' => (string)($table->table_name ?? ''),
                    'section' => (string)($table->table_section ?? ''),
                    'capacity' => (int)(
                        $table->preferred_capacity
                        ?? $table->max_capacity
                        ?? 0
                    ),
                    'operational_status' => (string)($table->operational_status ?? 'available'),
                    'floor_name' => (string)($table->floor_name ?? ''),
                    'floor' => [
                        'x' => $table->floor_x === null ? null : (float)$table->floor_x,
                        'y' => $table->floor_y === null ? null : (float)$table->floor_y,
                        'width' => $table->floor_width === null ? null : (float)$table->floor_width,
                        'height' => $table->floor_height === null ? null : (float)$table->floor_height,
                        'shape' => (string)($table->floor_shape ?? ''),
                    ],
                    'updated_at' => optional($table->updated_at)->toIso8601String(),
                ];
            })
            ->values()
            ->all();
    }

    private function floors(int $locationId): array
    {
        try {
            $snapshot = app(PmdSharedFloorRegistryV1::class)->snapshot($locationId);
            return [
                'floors' => array_values((array)($snapshot['floors'] ?? [])),
                'table_floor_map' => (array)($snapshot['table_floor_map'] ?? []),
            ];
        } catch (\Throwable $error) {
            return ['floors' => [], 'table_floor_map' => []];
        }
    }

    private function kdsStations(int $locationId): array
    {
        if (!Schema::hasTable('kds_stations')) return [];

        $query = Kds_stations_model::query()
            ->where(function ($q) use ($locationId) {
                $q->whereNull('location_id')
                    ->orWhere('location_id', $locationId);
            })
            ->ordered();

        return $query->get()->map(function ($station) {
            return [
                'id' => (int)$station->getKey(),
                'name' => (string)$station->name,
                'slug' => (string)$station->slug,
                'category_ids' => array_values((array)$station->category_ids),
                'status_ids' => array_values((array)$station->status_ids),
                'can_change_status' => (bool)$station->can_change_status,
                'station_type' => (string)($station->station_type ?? 'kitchen'),
                'location_id' => $station->location_id === null
                    ? null
                    : (int)$station->location_id,
            ];
        })->values()->all();
    }

    private function surfaces(string $roleCode): array
    {
        $roles = PmdDefaultStaffRoleService::class;

        if ($roleCode === $roles::OWNER || $roleCode === $roles::MANAGER) {
            return ['manager', 'orders', 'pos', 'waiter', 'kds'];
        }
        if ($roleCode === $roles::CASHIER) return ['orders', 'pos'];
        if ($roleCode === $roles::WAITER) return ['waiter', 'pos'];
        if (str_starts_with($roleCode, $roles::KDS_PREFIX)) return ['kds'];
        if ($roleCode === $roles::RESERVATIONS) return ['reservations'];
        if ($roleCode === $roles::ACCOUNTANT) return ['accountant'];

        return ['mywork'];
    }

    private function currentCursor(int $locationId): int
    {
        if (!Schema::hasTable('pmd_sync_events')) return 0;

        return (int)(
            DB::table('pmd_sync_events')
                ->where('location_id', $locationId)
                ->max('sequence')
            ?? 0
        );
    }

    private function safeDatabaseName(): ?string
    {
        try {
            return (string)DB::connection()->getDatabaseName();
        } catch (\Throwable $error) {
            return null;
        }
    }
}
