<?php

namespace Admin\Services;

use Admin\Facades\AdminLocation;
use Admin\Models\Allergens_model;
use Admin\Models\Categories_model;
use Admin\Models\Menus_model;
use Admin\Models\Staffs_model;
use Admin\Models\Tables_model;
use App\Services\PmdTenantMenuBaselineR25;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * PMD_TENANT_QUICK_SETUP_V1
 *
 * One server-side onboarding authority for new restaurant tenants.
 * It never deletes existing restaurant data and refuses to seed a Starter Menu
 * once real Menu/Category content exists.
 */
class PmdTenantQuickSetupService
{
    public const VERSION = '1.0.1';

    public function restaurantTypes(): array
    {
        return app(PmdStarterMenuLibraryV1::class)->restaurantTypes();
    }

    public function status(): array
    {
        $menuCount = $this->safeCount('menus');
        $categoryCount = $this->safeCount('categories');
        $status = strtolower(trim((string)setting('pmd_onboarding_status', 'pending')));
        if (!in_array($status, ['pending', 'skipped', 'completed'], true)) {
            $status = 'pending';
        }

        $emptyMenu = $menuCount === 0 && $categoryCount === 0;

        return [
            'version' => self::VERSION,
            'status' => $status,
            'menu_count' => $menuCount,
            'category_count' => $categoryCount,
            'empty_menu' => $emptyMenu,
            'eligible' => $status !== 'completed' && $emptyMenu,
            'show_welcome' => $status === 'pending' && $emptyMenu,
            'restaurant_type' => (string)setting('pmd_onboarding_restaurant_type', ''),
            'starter_menu' => (bool)setting('pmd_onboarding_starter_menu', false),
        ];
    }

    public function skip(): array
    {
        setting()->set([
            'pmd_onboarding_status' => 'skipped',
            'pmd_onboarding_version' => self::VERSION,
            'pmd_onboarding_skipped_at' => now()->toIso8601String(),
        ]);
        setting()->save();

        return $this->status();
    }

    public function apply(array $input): array
    {
        $state = $this->status();
        if (!$state['eligible']) {
            throw new \RuntimeException(
                $state['status'] === 'completed'
                    ? 'Quick Setup is already completed for this restaurant.'
                    : 'Quick Setup is only available before real Menu or Category data is created.'
            );
        }

        $types = $this->restaurantTypes();
        $type = strtolower(trim((string)($input['restaurant_type'] ?? '')));
        if (!isset($types[$type])) {
            throw new \InvalidArgumentException('Choose a valid restaurant type.');
        }

        $floors = $this->normalizeFloors((array)($input['floors'] ?? []));
        $staffTargets = $this->normalizeStaff((array)($input['staff'] ?? []));
        $kdsStations = $this->normalizeKds((array)($input['kds'] ?? []));
        $starterMenu = !empty($input['starter_menu']);
        $locationId = $this->locationId();

        if ($locationId < 1) {
            throw new \RuntimeException('Active restaurant location is unavailable.');
        }

        /*
         * Menu baseline may add missing schema columns. MySQL DDL implicitly
         * commits, so baseline repair must run BEFORE the restaurant-data
         * transaction instead of pretending DDL is part of the atomic write.
         */
        $baseline = app(PmdTenantMenuBaselineR25::class)->repairCurrentTenant();
        if (empty($baseline['ok'])) {
            throw new \RuntimeException('Tenant Menu baseline is not ready for Quick Setup.');
        }

        if ($kdsStations && !Schema::hasTable('kds_stations')) {
            throw new \RuntimeException('Tenant KDS baseline is missing the kds_stations table.');
        }

        $result = DB::transaction(function () use (
            $type,
            $types,
            $floors,
            $staffTargets,
            $kdsStations,
            $starterMenu,
            $locationId
        ) {
            $allergens = $this->ensureReferenceAllergens();
            $floorResult = $this->ensureFloorsAndTables($locationId, $floors);
            $kdsResult = $this->ensureKdsStations($locationId, $kdsStations);

            // KDS station roles are dynamic, so ensure roles after stations exist.
            app(PmdDefaultStaffRoleService::class)->ensure();
            $staffResult = $this->ensureStaff($locationId, $staffTargets);

            $menuResult = [
                'created' => false,
                'categories' => 0,
                'items' => 0,
            ];

            if ($starterMenu) {
                $menuResult = $this->seedStarterMenu(
                    $type,
                    $locationId,
                    $allergens
                );
            }

            $theme = (string)$types[$type]['theme'];
            setting()->set([
                // Canonical V2 theme keys already read by Pmdsettings/frontend.
                'theme_configuration' => $theme,
                'theme_id' => $theme,
                'frontend_theme' => $theme,
                'pmd_v2_theme_id' => $theme,
                'pmd_admin_selected_theme' => $theme,

                // Tenant-scoped onboarding state. No browser localStorage authority.
                'pmd_onboarding_status' => 'completed',
                'pmd_onboarding_version' => self::VERSION,
                'pmd_onboarding_restaurant_type' => $type,
                'pmd_onboarding_starter_menu' => $starterMenu ? '1' : '0',
                'pmd_onboarding_completed_at' => now()->toIso8601String(),
            ]);
            setting()->save();

            return [
                'ok' => true,
                'version' => self::VERSION,
                'restaurant_type' => $type,
                'restaurant_type_label' => $types[$type]['label'],
                'theme' => $theme,
                'floors' => $floorResult,
                'staff' => $staffResult,
                'kds' => $kdsResult,
                'menu' => $menuResult,
            ];
        });

        return $result + ['status' => $this->status()];
    }

    protected function locationId(): int
    {
        try {
            return max(0, (int)AdminLocation::getId());
        } catch (\Throwable $error) {
            return 0;
        }
    }

    protected function normalizeFloors(array $floors): array
    {
        $out = [];
        foreach (array_slice($floors, 0, 8) as $index => $floor) {
            if (!is_array($floor)) continue;
            $name = trim((string)($floor['name'] ?? ''));
            $tables = max(0, min(60, (int)($floor['tables'] ?? 0)));
            if ($name === '' && $index === 0) $name = 'Main Floor';
            if ($name === '' || $tables < 1) continue;
            $out[] = ['name' => mb_substr($name, 0, 80), 'tables' => $tables];
        }

        if (!$out) {
            $out[] = ['name' => 'Main Floor', 'tables' => 10];
        }

        return $out;
    }

    protected function normalizeStaff(array $staff): array
    {
        $keys = ['manager', 'waiter', 'cashier', 'reservations', 'accountant'];
        $out = [];
        foreach ($keys as $key) {
            $out[$key] = max(0, min(30, (int)($staff[$key] ?? 0)));
        }
        return $out;
    }

    protected function normalizeKds(array $rows): array
    {
        $names = [];
        foreach (array_slice($rows, 0, 10) as $row) {
            $name = is_array($row)
                ? trim((string)($row['name'] ?? ''))
                : trim((string)$row);
            if ($name === '') continue;
            $names[] = mb_substr($name, 0, 128);
        }
        return array_values(array_unique($names));
    }

    protected function ensureReferenceAllergens(): array
    {
        if (!Schema::hasTable('allergens')) {
            throw new \RuntimeException('Tenant allergen baseline is missing the allergens table.');
        }

        $definitions = [
            'Gluten' => 'Cereals containing gluten, including wheat, rye, barley and oats.',
            'Crustaceans' => 'Crustaceans and products thereof.',
            'Eggs' => 'Eggs and products thereof.',
            'Fish' => 'Fish and products thereof.',
            'Peanuts' => 'Peanuts and products thereof.',
            'Soybeans' => 'Soybeans and products thereof.',
            'Milk' => 'Milk and dairy products, including lactose.',
            'Nuts' => 'Tree nuts and products thereof.',
            'Celery' => 'Celery and products thereof.',
            'Mustard' => 'Mustard and products thereof.',
            'Sesame' => 'Sesame seeds and products thereof.',
            'Sulphites' => 'Sulphur dioxide and sulphites above applicable thresholds.',
            'Lupin' => 'Lupin and products thereof.',
            'Molluscs' => 'Molluscs and products thereof.',
        ];

        $map = [];
        foreach ($definitions as $name => $description) {
            $row = Allergens_model::query()
                ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
                ->first();

            if (!$row) $row = new Allergens_model();
            $row->name = $name;
            $row->description = $description;
            $row->status = 1;
            $row->save();
            $map[$name] = (int)$row->allergen_id;
        }

        return $map;
    }

    protected function ensureFloorsAndTables(int $locationId, array $floors): array
    {
        if (!Schema::hasTable('tables')) {
            throw new \RuntimeException('Tenant Table baseline is missing the tables table.');
        }

        $registry = app(PmdSharedFloorRegistryV1::class);
        $snapshot = $registry->snapshot($locationId);
        $defaultId = $registry->defaultFloorId();
        $createdFloors = [];
        $createdTables = [];

        // Preserve real pre-existing guest tables. Quick Setup never duplicates them.
        $existingGuestTables = Tables_model::query()
            ->whereRaw("LOWER(TRIM(COALESCE(table_name, ''))) NOT IN ('cashier','delivery','')")
            ->count();

        if ($existingGuestTables > 0) {
            return [
                'created_floors' => 0,
                'created_tables' => 0,
                'preserved_existing_tables' => $existingGuestTables,
            ];
        }

        $firstName = $floors[0]['name'] ?? 'Main Floor';
        $defaultFloor = $registry->findById((array)$snapshot['floors'], $defaultId);
        if ($defaultFloor && strcasecmp((string)$defaultFloor['name'], $firstName) !== 0) {
            $registry->renameFloor($locationId, $defaultId, $firstName);
        }

        $floorMap = [$firstName => $defaultId];
        foreach (array_slice($floors, 1) as $floor) {
            $fresh = $registry->snapshot($locationId);
            $existing = $registry->findByName((array)$fresh['floors'], $floor['name']);
            if ($existing) {
                $floorMap[$floor['name']] = (string)$existing['id'];
                continue;
            }
            $created = $registry->createFloor($locationId, $floor['name']);
            $floorMap[$floor['name']] = (string)($created['floor']['id'] ?? '');
            $createdFloors[] = $floor['name'];
        }

        $number = 1;
        foreach ($floors as $floorIndex => $floor) {
            $floorId = $floorMap[$floor['name']] ?? $defaultId;
            for ($i = 1; $i <= $floor['tables']; $i++) {
                while (Tables_model::query()->where('table_no', (string)$number)->exists()) {
                    $number++;
                }

                $col = ($i - 1) % 5;
                $row = intdiv($i - 1, 5);

                $table = new Tables_model();
                $table->fill($this->filterColumns('tables', [
                    'table_no' => (string)$number,
                    'table_name' => 'Table '.$number,
                    'min_capacity' => 1,
                    'max_capacity' => 4,
                    'preferred_capacity' => 4,
                    'priority' => $number,
                    'is_joinable' => 1,
                    'table_status' => 1,
                    'operational_status' => 'available',
                    'floor_x' => 24 + ($col * 178),
                    'floor_y' => 24 + ($row * 118),
                    'floor_width' => 150,
                    'floor_height' => 88,
                    'floor_shape' => 'rectangle',
                    'floor_name' => $floor['name'],
                    'floor_sort' => ($floorIndex + 1) * 10,
                    'reservable' => 1,
                    'visible_on_floor_plan' => 1,
                ]));
                $table->save();
                $table->locations()->syncWithoutDetaching([$locationId]);

                if ($floorId !== '' && $floorId !== $defaultId) {
                    $registry->assignTable($locationId, (int)$table->table_id, $floorId);
                }

                $createdTables[] = (int)$table->table_id;
                $number++;
            }
        }

        return [
            'created_floors' => count($createdFloors),
            'created_tables' => count($createdTables),
            'floor_names' => array_column($floors, 'name'),
        ];
    }

    protected function ensureKdsStations(int $locationId, array $names): array
    {
        if (!$names) return ['created' => 0, 'stations' => []];
        if (!Schema::hasTable('kds_stations')) {
            throw new \RuntimeException('Tenant KDS baseline is missing the kds_stations table.');
        }

        $columns = Schema::getColumnListing('kds_stations');
        $created = 0;
        $stations = [];

        foreach ($names as $priority => $name) {
            $base = Str::slug($name) ?: 'kds-station';
            $row = DB::table('kds_stations')
                ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
                ->first();

            if ($row) {
                $slug = trim((string)($row->slug ?? $base)) ?: $base;
                $stations[] = ['name' => $name, 'slug' => $slug, 'created' => false];
                continue;
            }

            $slug = $base;
            $suffix = 2;
            while (DB::table('kds_stations')->where('slug', $slug)->exists()) {
                $slug = $base.'-'.$suffix++;
            }

            $data = [
                'name' => $name,
                'slug' => $slug,
                'description' => 'Created by PayMyDine Quick Setup.',
                'category_ids' => json_encode([]),
                'status_ids' => json_encode([]),
                'can_change_status' => 1,
                'is_active' => 1,
                'notification_sound' => 'doorbell',
                'refresh_interval' => 5,
                'priority' => ($priority + 1) * 10,
                'location_id' => $locationId,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            DB::table('kds_stations')->insert(array_intersect_key($data, array_flip($columns)));
            $created++;
            $stations[] = ['name' => $name, 'slug' => $slug, 'created' => true];
        }

        return ['created' => $created, 'stations' => $stations];
    }

    protected function ensureStaff(int $locationId, array $targets): array
    {
        $roleService = app(PmdDefaultStaffRoleService::class);
        $roles = collect($roleService->ensure())->keyBy('code');
        $codes = [
            'manager' => PmdDefaultStaffRoleService::MANAGER,
            'waiter' => PmdDefaultStaffRoleService::WAITER,
            'cashier' => PmdDefaultStaffRoleService::CASHIER,
            'reservations' => PmdDefaultStaffRoleService::RESERVATIONS,
            'accountant' => PmdDefaultStaffRoleService::ACCOUNTANT,
        ];

        $created = [];
        foreach ($targets as $kind => $target) {
            $code = $codes[$kind] ?? null;
            if (!$code || !$roles->has($code) || $target < 1) continue;
            $role = $roles->get($code);

            $existing = Staffs_model::query()
                ->whereNotSuperUser()
                ->where('staff_role_id', (int)$role->staff_role_id)
                ->count();

            $needed = max(0, $target - $existing);
            for ($i = 1; $i <= $needed; $i++) {
                $ordinal = $existing + $i;
                $label = $this->roleLabel($kind).' '.$ordinal;
                $username = $this->uniqueUsername($kind.$ordinal);
                $password = bin2hex(random_bytes(8));

                $member = new Staffs_model();
                $member->staff_name = $label;
                $member->staff_role_id = (int)$role->staff_role_id;
                $member->staff_status = 1;
                $member->sale_permission = 1;
                $member->staff_email = 'pmd-'.$username.'@staff.local';
                $member->save();

                $member->addStaffUser([
                    'username' => $username,
                    'password' => $password,
                    'super_user' => false,
                    'send_invite' => false,
                    'activate' => true,
                ]);
                $member->addStaffLocations([$locationId]);
                $member->addStaffGroups([]);

                $created[] = [
                    'role' => $this->roleLabel($kind),
                    'name' => $label,
                    'username' => $username,
                    'temporary_password' => $password,
                ];
            }
        }

        return [
            'created' => count($created),
            'credentials' => $created,
            'note' => 'Temporary passwords are returned once. Rename staff and rotate credentials in Team & access.',
        ];
    }

    protected function seedStarterMenu(string $type, int $locationId, array $allergenMap): array
    {
        if ($this->safeCount('menus') > 0 || $this->safeCount('categories') > 0) {
            throw new \RuntimeException('Starter Menu cannot be installed after Menu content exists.');
        }

        $pack = app(PmdStarterMenuLibraryV1::class)->pack($type);
        $categories = [];
        $priority = 10;

        foreach ($pack['categories'] as $name) {
            $category = new Categories_model();
            $category->fill($this->filterColumns('categories', [
                'name' => $name,
                'description' => 'Starter category — review and edit for your restaurant.',
                'parent_id' => null,
                'priority' => $priority,
                'status' => 1,
                'frontend_visible' => 1,
                'pmd_kind' => 'regular',
            ]));
            $category->save();
            $category->locations()->syncWithoutDetaching([$locationId]);
            $categories[$name] = (int)$category->category_id;
            $priority += 10;
        }

        // PMD_STARTER_MENU_IMAGES_V2
        // One shared resolver instance prevents duplicate source photos inside
        // the same starter pack. Image lookup is best-effort and never blocks setup.
        $imageService = app(PmdStarterMenuImageServiceV2::class);
        $imageSummary = ['attached' => 0, 'cached' => 0, 'missing' => 0];

        $itemPriority = 10;
        foreach ($pack['items'] as $item) {
            $categoryId = $categories[$item['category']] ?? null;
            if (!$categoryId) continue;

            $menu = new Menus_model();
            $menu->fill($this->filterColumns('menus', [
                'menu_name' => $item['name'],
                'menu_description' => $item['description'],
                'menu_price' => $item['price'],
                'menu_category_id' => $categoryId,
                'menu_status' => 1,
                'menu_priority' => $itemPriority,
                'minimum_qty' => 1,
                'prep_time_minutes' => $item['prep'],
                'is_stock_out' => 0,
                'is_halal' => !empty($item['halal']),
                'is_vegetarian' => !empty($item['vegetarian']),
                'is_vegan' => !empty($item['vegan']),
                'calories' => $item['nutrition']['calories'],
                'protein' => $item['nutrition']['protein'],
                'carbs' => $item['nutrition']['carbs'],
                'fat' => $item['nutrition']['fat'],
                'sugar' => $item['nutrition']['sugar'],
                'serving_size' => '1 serving',
                'is_chef_recommended' => !empty($item['chef']),
                'is_manual_bestseller' => !empty($item['bestseller']),
                'bestseller_override_mode' => !empty($item['bestseller']) ? 'force_on' : 'auto',
            ]));
            $menu->save();
            $menu->locations()->syncWithoutDetaching([$locationId]);
            $menu->addMenuCategories([$categoryId]);

            $allergenIds = [];
            foreach ((array)$item['allergens'] as $name) {
                if (isset($allergenMap[$name])) $allergenIds[] = $allergenMap[$name];
            }
            if ($allergenIds) $menu->allergens()->sync(array_values(array_unique($allergenIds)));

            try {
                $imageResult = $imageService->attachToMenu($menu, $item, $type);
                if (!empty($imageResult['attached'])) $imageSummary['attached']++;
                if (!empty($imageResult['cached'])) $imageSummary['cached']++;
                if (!empty($imageResult['missing'])) $imageSummary['missing']++;
            } catch (\Throwable $ignored) {
                $imageSummary['missing']++;
            }

            $itemPriority += 10;
        }

        return [
            'created' => true,
            'pack' => $type,
            'categories' => count($categories),
            'items' => count($pack['items']),
            'images' => $imageSummary,
            'review_required' => true,
            'note' => 'Starter prices, allergens and nutrition are suggestions and must be reviewed against the restaurant recipes.',
        ];
    }

    public function refreshStarterMenuImages(): array
    {
        $type = strtolower(trim((string)setting('pmd_onboarding_restaurant_type', '')));
        $starterMenu = (bool)setting('pmd_onboarding_starter_menu', false);

        if ($type === '' || !$starterMenu) {
            throw new \RuntimeException('This restaurant does not have a Quick Setup starter menu to refresh.');
        }

        $types = $this->restaurantTypes();
        if (!isset($types[$type])) {
            throw new \RuntimeException('The saved restaurant type is not available.');
        }

        $images = app(PmdStarterMenuImageServiceV2::class);
        if (!$images->isConfigured()) {
            throw new \RuntimeException('Premium starter photos are not configured yet. Add PMD_PEXELS_API_KEY on the server first.');
        }

        $pack = app(PmdStarterMenuLibraryV1::class)->pack($type);
        $summary = [
            'updated' => 0,
            'cached' => 0,
            'kept_old' => 0,
            'skipped_custom' => 0,
            'menu_missing' => 0,
        ];

        foreach ($pack['items'] as $item) {
            $menu = Menus_model::query()
                ->where('menu_name', (string)$item['name'])
                ->first();

            if (!$menu) {
                $summary['menu_missing']++;
                continue;
            }

            $result = $images->refreshMenu($menu, $item, $type);
            if (!empty($result['attached'])) {
                $summary['updated']++;
                if (!empty($result['cached'])) $summary['cached']++;
            } elseif (!empty($result['skipped_custom'])) {
                $summary['skipped_custom']++;
            } else {
                $summary['kept_old']++;
            }
        }

        return [
            'ok' => true,
            'provider' => 'pexels',
            'restaurant_type' => $type,
            'summary' => $summary,
            'message' => sprintf(
                'Premium starter photos refreshed: %d updated, %d custom photos preserved, %d old starter photos kept.',
                $summary['updated'],
                $summary['skipped_custom'],
                $summary['kept_old']
            ),
        ];
    }

    protected function safeCount(string $table): int
    {
        try {
            return Schema::hasTable($table) ? (int)DB::table($table)->count() : 0;
        } catch (\Throwable $error) {
            return 0;
        }
    }

    protected function filterColumns(string $table, array $data): array
    {
        try {
            $columns = Schema::getColumnListing($table);
            return array_intersect_key($data, array_flip($columns));
        } catch (\Throwable $error) {
            return $data;
        }
    }

    protected function roleLabel(string $kind): string
    {
        return [
            'manager' => 'Manager',
            'waiter' => 'Waiter',
            'cashier' => 'Cashier',
            'reservations' => 'Reservations',
            'accountant' => 'Accountant',
        ][$kind] ?? ucfirst($kind);
    }

    protected function uniqueUsername(string $base): string
    {
        $base = strtolower(trim(preg_replace('/[^a-z0-9_-]+/i', '', $base)));
        if ($base === '') $base = 'staff';
        $candidate = $base;
        $suffix = 2;
        while (DB::table('users')->where('username', $candidate)->exists()) {
            $candidate = $base.$suffix++;
        }
        return $candidate;
    }
}
