<?php namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PmdFloorPlanSaveV1 extends AdminController
{
    public function save()
    {
        try {
            if (!Schema::hasTable('tables')) {
                return response()->json(['ok' => false, 'message' => 'tables table not found'], 500);
            }

            $cols = array_flip(Schema::getColumnListing('tables'));
            $pk = isset($cols['table_id']) ? 'table_id' : (isset($cols['id']) ? 'id' : null);

            if (!$pk || !isset($cols['floor_x']) || !isset($cols['floor_y'])) {
                return response()->json([
                    'ok' => false,
                    'message' => 'Missing table primary key or floor_x/floor_y columns',
                    'columns' => array_keys($cols),
                ], 422);
            }

            $raw = request()->getContent();
            $payload = json_decode($raw, true);
            if (!is_array($payload)) {
                $payload = request()->all();
            }

            $items = $payload['tables'] ?? [];
            if (is_string($items)) {
                $decoded = json_decode($items, true);
                if (is_array($decoded)) $items = $decoded;
            }

            if (!is_array($items) || !count($items)) {
                return response()->json(['ok' => false, 'message' => 'No table layout items received'], 422);
            }

            $updated = 0;
            $skipped = [];

            DB::beginTransaction();

            foreach ($items as $item) {
                if (!is_array($item)) {
                    $skipped[] = ['reason' => 'invalid item'];
                    continue;
                }

                $id = isset($item['id']) ? (int)$item['id'] : 0;
                if ($id <= 0) {
                    $skipped[] = ['reason' => 'invalid id', 'item' => $item];
                    continue;
                }

                $update = [];

                foreach (['floor_x', 'floor_y', 'floor_width', 'floor_height'] as $key) {
                    if (!isset($cols[$key]) || !array_key_exists($key, $item)) continue;

                    $value = is_numeric($item[$key]) ? (float)$item[$key] : null;
                    if ($value === null) continue;

                    if ($key === 'floor_x') $value = max(0, min(3000, $value));
                    if ($key === 'floor_y') $value = max(0, min(1800, $value));
                    if ($key === 'floor_width') $value = max(40, min(900, $value));
                    if ($key === 'floor_height') $value = max(30, min(700, $value));

                    $update[$key] = $value;
                }

                if (isset($cols['visible_on_floor_plan'])) {
                    $update['visible_on_floor_plan'] = 1;
                }

                if (!$update) {
                    $skipped[] = ['id' => $id, 'reason' => 'no allowed fields'];
                    continue;
                }

                $count = DB::table('tables')->where($pk, $id)->update($update);
                if ($count > 0) $updated++;
            }

            DB::commit();

            return response()->json([
                'ok' => true,
                'version' => 'pmd-floor-save-v1',
                'updated' => $updated,
                'received' => count($items),
                'skipped' => $skipped,
            ]);
        } catch (\Throwable $e) {
            try { DB::rollBack(); } catch (\Throwable $ignore) {}
            return response()->json([
                'ok' => false,
                'message' => $e->getMessage(),
                'type' => get_class($e),
            ], 500);
        }
    }
}
