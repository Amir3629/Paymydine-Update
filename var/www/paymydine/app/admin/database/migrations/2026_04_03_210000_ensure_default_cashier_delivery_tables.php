<?php

namespace Admin\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class EnsureDefaultCashierDeliveryTables extends Migration
{
    protected array $defaultTables = [
        'Cashier' => ['table_no' => 'cashier', 'priority' => 998, 'qr_code' => 'cashier'],
        'Delivery' => ['table_no' => 'delivery', 'priority' => 999, 'qr_code' => 'delivery'],
    ];

    public function up()
    {
        if (!Schema::hasTable('tables')) {
            return;
        }

        foreach ($this->resolveLocationIds() as $locationId) {
            foreach ($this->defaultTables as $tableName => $meta) {
                $tableId = $this->findTableIdForLocation($tableName, $locationId)
                    ?: $this->findTableIdAnyLocation($tableName);

                if (!$tableId) {
                    $insert = [
                        'table_name' => $tableName,
                        'table_status' => 1,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];

                    if (Schema::hasColumn('tables', 'table_no')) {
                        $insert['table_no'] = $meta['table_no'];
                    }
                    if (Schema::hasColumn('tables', 'min_capacity')) {
                        $insert['min_capacity'] = 1;
                    }
                    if (Schema::hasColumn('tables', 'max_capacity')) {
                        $insert['max_capacity'] = 1;
                    }
                    if (Schema::hasColumn('tables', 'extra_capacity')) {
                        $insert['extra_capacity'] = 0;
                    }
                    if (Schema::hasColumn('tables', 'is_joinable')) {
                        $insert['is_joinable'] = 0;
                    }
                    if (Schema::hasColumn('tables', 'priority')) {
                        $insert['priority'] = $meta['priority'];
                    }
                    if (Schema::hasColumn('tables', 'qr_code')) {
                        $insert['qr_code'] = $meta['qr_code'];
                    }
                    if (Schema::hasColumn('tables', 'location_id')) {
                        $insert['location_id'] = $locationId;
                    }

                    $tableId = (int)DB::table('tables')->insertGetId($insert);
                } elseif (Schema::hasColumn('tables', 'location_id')) {
                    DB::table('tables')->where('table_id', $tableId)->update(['location_id' => $locationId]);
                }

                $this->ensureLocationableLink($tableId, $locationId);
            }
        }
    }

    public function down()
    {
        // Intentionally left empty. Default tables are required operational records.
    }

    protected function resolveLocationIds(): array
    {
        if (!Schema::hasTable('locations')) {
            return [1];
        }

        $ids = DB::table('locations')->pluck('location_id')->filter()->map(fn ($id) => (int)$id)->values()->all();

        return count($ids) ? $ids : [1];
    }

    protected function findTableIdForLocation(string $tableName, int $locationId): ?int
    {
        $query = DB::table('tables as t')
            ->whereRaw('LOWER(TRIM(t.table_name)) = ?', [strtolower($tableName)]);

        if (Schema::hasColumn('tables', 'location_id')) {
            $query->where('t.location_id', $locationId);
        } elseif (Schema::hasTable('locationables')) {
            $query->whereExists(function ($sub) use ($locationId) {
                $sub->select(DB::raw(1))
                    ->from('locationables as l')
                    ->whereColumn('l.locationable_id', 't.table_id')
                    ->where('l.locationable_type', 'tables')
                    ->where('l.location_id', $locationId);
            });
        }

        $id = $query->value('t.table_id');

        return $id ? (int)$id : null;
    }

    protected function findTableIdAnyLocation(string $tableName): ?int
    {
        $id = DB::table('tables')
            ->whereRaw('LOWER(TRIM(table_name)) = ?', [strtolower($tableName)])
            ->value('table_id');

        return $id ? (int)$id : null;
    }

    protected function ensureLocationableLink(int $tableId, int $locationId): void
    {
        if (!Schema::hasTable('locationables')) {
            return;
        }

        $query = DB::table('locationables')
            ->where('location_id', $locationId)
            ->where('locationable_id', $tableId)
            ->where('locationable_type', 'tables');

        if (!$query->exists()) {
            DB::table('locationables')->insert([
                'location_id' => $locationId,
                'locationable_id' => $tableId,
                'locationable_type' => 'tables',
                'options' => null,
            ]);
        }
    }
}

