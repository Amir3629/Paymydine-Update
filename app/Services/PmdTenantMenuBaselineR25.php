<?php

namespace App\Services;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * PMD_TENANT_MENU_BASELINE_R25
 *
 * Idempotent Menu product baseline for cloned/new/existing tenants.
 * Repairs schema drift only. It never creates restaurant menu/category data and
 * never deletes tenant content.
 */
class PmdTenantMenuBaselineR25
{
    public const VERSION = '25.0.0';

    public function repairCurrentTenant(): array
    {
        $report = [
            'ok' => true,
            'version' => self::VERSION,
            'database' => $this->currentDatabaseName(),
            'steps' => [],
            'warnings' => [],
        ];

        $this->step($report, 'categories', fn () => $this->ensureCategoryFields());
        $this->step($report, 'menus', fn () => $this->ensureMenuFields());
        $this->step($report, 'combos', fn () => $this->ensureComboTables());

        $report['ok'] = count($report['warnings']) === 0;

        return $report;
    }

    public function repairTenantRecord($tenant): array
    {
        $value = static function ($row, string $key, $default = null) {
            if (is_array($row)) return $row[$key] ?? $default;
            if (is_object($row)) return $row->{$key} ?? $default;
            return $default;
        };

        $database = trim((string)$value($tenant, 'database', ''));
        if ($database === '') {
            throw new \InvalidArgumentException('Tenant database is required.');
        }

        $originalDefault = DB::getDefaultConnection();
        $originalTenantConfig = (array)Config::get('database.connections.tenant', []);
        $tenantConfig = $originalTenantConfig;
        $tenantConfig['database'] = $database;

        foreach ([
            'host' => 'db_host',
            'port' => 'db_port',
            'username' => 'db_user',
            'password' => 'db_pass',
        ] as $configKey => $tenantKey) {
            $candidate = $value($tenant, $tenantKey);
            if ($candidate !== null && $candidate !== '') {
                $tenantConfig[$configKey] = $candidate;
            }
        }

        try {
            Config::set('database.connections.tenant', $tenantConfig);
            DB::purge('tenant');
            DB::reconnect('tenant');
            DB::setDefaultConnection('tenant');

            return $this->repairCurrentTenant();
        } finally {
            try { DB::purge('tenant'); } catch (\Throwable $ignored) {}
            Config::set('database.connections.tenant', $originalTenantConfig);
            DB::setDefaultConnection($originalDefault);
        }
    }

    protected function step(array &$report, string $name, callable $callback): void
    {
        try {
            $report['steps'][$name] = [
                'ok' => true,
                'result' => $callback(),
            ];
        } catch (\Throwable $error) {
            $report['warnings'][] = $name.': '.$error->getMessage();
            $report['steps'][$name] = [
                'ok' => false,
                'error' => $error->getMessage(),
            ];

            Log::warning('PMD tenant Menu baseline step failed', [
                'database' => $report['database'] ?? null,
                'step' => $name,
                'message' => $error->getMessage(),
            ]);
        }
    }

    protected function currentDatabaseName(): ?string
    {
        try {
            return trim((string)DB::connection()->getDatabaseName()) ?: null;
        } catch (\Throwable $error) {
            return null;
        }
    }

    protected function schema()
    {
        return DB::connection()->getSchemaBuilder();
    }

    protected function ensureCategoryFields(): array
    {
        $schema = $this->schema();

        if (!$schema->hasTable('categories')) {
            throw new \RuntimeException('Menu categories base table is missing: categories');
        }

        $added = [];

        if (!$schema->hasColumn('categories', 'pmd_kind')) {
            $schema->table('categories', function (Blueprint $table): void {
                $table->string('pmd_kind', 24)->default('regular');
            });
            $added[] = 'pmd_kind';
        }

        try {
            DB::table('categories')
                ->where(function ($query) {
                    $query->whereNull('pmd_kind')->orWhere('pmd_kind', '');
                })
                ->update(['pmd_kind' => 'regular']);
        } catch (\Throwable $ignored) {
        }

        return ['columns_added' => $added];
    }

    protected function ensureMenuFields(): array
    {
        $schema = $this->schema();

        if (!$schema->hasTable('menus')) {
            throw new \RuntimeException('Menu base table is missing: menus');
        }

        $wanted = [
            'is_stock_out',
            'is_halal',
            'is_vegetarian',
            'is_vegan',
            'calories',
            'protein',
            'carbs',
            'fat',
            'sugar',
            'serving_size',
            'prep_time_minutes',
            'is_chef_recommended',
            'is_manual_bestseller',
            'bestseller_override_mode',
        ];

        $missing = array_values(array_filter(
            $wanted,
            static fn (string $column): bool => !$schema->hasColumn('menus', $column)
        ));

        if ($missing) {
            $schema->table('menus', function (Blueprint $table) use ($missing): void {
                if (in_array('is_stock_out', $missing, true)) {
                    $table->boolean('is_stock_out')->default(false);
                }
                if (in_array('is_halal', $missing, true)) {
                    $table->boolean('is_halal')->default(false);
                }
                if (in_array('is_vegetarian', $missing, true)) {
                    $table->boolean('is_vegetarian')->default(false);
                }
                if (in_array('is_vegan', $missing, true)) {
                    $table->boolean('is_vegan')->default(false);
                }
                if (in_array('calories', $missing, true)) {
                    $table->unsignedInteger('calories')->nullable();
                }
                if (in_array('protein', $missing, true)) {
                    $table->decimal('protein', 8, 2)->nullable();
                }
                if (in_array('carbs', $missing, true)) {
                    $table->decimal('carbs', 8, 2)->nullable();
                }
                if (in_array('fat', $missing, true)) {
                    $table->decimal('fat', 8, 2)->nullable();
                }
                if (in_array('sugar', $missing, true)) {
                    $table->decimal('sugar', 8, 2)->nullable();
                }
                if (in_array('serving_size', $missing, true)) {
                    $table->string('serving_size', 64)->nullable();
                }
                if (in_array('prep_time_minutes', $missing, true)) {
                    $table->unsignedSmallInteger('prep_time_minutes')->default(15);
                }
                if (in_array('is_chef_recommended', $missing, true)) {
                    $table->boolean('is_chef_recommended')->default(false);
                }
                if (in_array('is_manual_bestseller', $missing, true)) {
                    $table->boolean('is_manual_bestseller')->default(false);
                }
                if (in_array('bestseller_override_mode', $missing, true)) {
                    $table->string('bestseller_override_mode', 20)->default('auto');
                }
            });
        }

        return ['columns_added' => $missing];
    }

    protected function ensureComboTables(): array
    {
        $schema = $this->schema();
        $created = [];
        $added = [];

        if (!$schema->hasTable('menu_combos')) {
            $schema->create('menu_combos', function (Blueprint $table): void {
                $table->bigIncrements('combo_id');
                $table->string('combo_name', 128);
                $table->text('combo_description')->nullable();
                $table->decimal('combo_price', 15, 4);
                $table->unsignedInteger('location_id')->nullable();
                $table->boolean('combo_status')->default(true);
                $table->boolean('is_stock_out')->default(false);
                $table->integer('combo_priority')->default(0);
                $table->string('thumb')->nullable();
                $table->timestamps();
                $table->index(['combo_status', 'combo_priority']);
                $table->index('is_stock_out');
            });
            $created[] = 'menu_combos';
        } else {
            $comboMissing = [];
            foreach ([
                'combo_description',
                'location_id',
                'combo_status',
                'is_stock_out',
                'combo_priority',
                'thumb',
            ] as $column) {
                if (!$schema->hasColumn('menu_combos', $column)) {
                    $comboMissing[] = $column;
                }
            }

            if ($comboMissing) {
                $schema->table('menu_combos', function (Blueprint $table) use ($comboMissing): void {
                    if (in_array('combo_description', $comboMissing, true)) $table->text('combo_description')->nullable();
                    if (in_array('location_id', $comboMissing, true)) $table->unsignedInteger('location_id')->nullable();
                    if (in_array('combo_status', $comboMissing, true)) $table->boolean('combo_status')->default(true);
                    if (in_array('is_stock_out', $comboMissing, true)) $table->boolean('is_stock_out')->default(false);
                    if (in_array('combo_priority', $comboMissing, true)) $table->integer('combo_priority')->default(0);
                    if (in_array('thumb', $comboMissing, true)) $table->string('thumb')->nullable();
                });
                $added['menu_combos'] = $comboMissing;
            }
        }

        if (!$schema->hasTable('menu_combo_items')) {
            $schema->create('menu_combo_items', function (Blueprint $table): void {
                $table->bigIncrements('id');
                $table->unsignedBigInteger('combo_id');
                $table->unsignedBigInteger('menu_id');
                $table->integer('quantity')->default(1);
                $table->timestamps();
                $table->index(['combo_id', 'menu_id']);
            });
            $created[] = 'menu_combo_items';
        } else {
            $itemMissing = [];
            foreach (['combo_id', 'menu_id', 'quantity'] as $column) {
                if (!$schema->hasColumn('menu_combo_items', $column)) {
                    $itemMissing[] = $column;
                }
            }

            if ($itemMissing) {
                $schema->table('menu_combo_items', function (Blueprint $table) use ($itemMissing): void {
                    if (in_array('combo_id', $itemMissing, true)) $table->unsignedBigInteger('combo_id');
                    if (in_array('menu_id', $itemMissing, true)) $table->unsignedBigInteger('menu_id');
                    if (in_array('quantity', $itemMissing, true)) $table->integer('quantity')->default(1);
                });
                $added['menu_combo_items'] = $itemMissing;
            }
        }

        return [
            'tables_created' => $created,
            'columns_added' => $added,
        ];
    }
}
