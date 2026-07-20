<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

class Pos_configs_model extends Model
{
    protected $table = 'pos_configs';
    protected $primaryKey = 'config_id';
    public $timestamps = true;

    public $relation = [
        'belongsTo' => [
            'devices' => ['Admin\Models\Pos_devices_model', 'foreignKey' => 'device_id'],
        ],
    ];

    protected static function booted()
    {
        static::addGlobalScope('exclude_worldline_pos', function ($query) {
            $query->whereHas('devices', function ($deviceQuery) {
                $deviceQuery->whereRaw('LOWER(name) NOT LIKE ?', ['%worldline%'])
                    ->whereRaw('LOWER(code) <> ?', ['sumup']);
            });
        });
    }

    public static function getDropdownOptions()
    {
        return static::dropdown('url');
    }

    public static function listDropdownOptions()
    {
        return self::select('config_id', 'url')
            ->get()
            ->keyBy('config_id')
            ->map(function ($model) {
                return [$model->url];
            });
    }

    protected function afterSave()
    {
        if (array_key_exists('devices', $this->attributes)) {
            $this->addDevices($this->attributes['devices']);
        }
    }

    public function addDevices($devices = [])
    {
        return $this->devices()->sync($devices);
    }

    public function getPosDevicesOptions()
    {
        return \Admin\Models\Pos_devices_model::query()
            ->whereRaw('LOWER(name) NOT LIKE ?', ['%worldline%'])
            ->whereRaw('LOWER(code) <> ?', ['sumup'])
            ->get()
            ->mapWithKeys(function ($device) {
            $img = $device->getImageUrl() ? '<img src="'.$device->getImageUrl().'" style="height:30px;margin-right:5px;" />' : '';
            return [$device->device_id => $img . $device->name];
        })->toArray();
    }


    public function syncReady2OrderTables()
    {
        try {
            $sync1 = '/home/ubuntu/pmd_r2o_sync_tables.php';
            $sync2 = '/home/ubuntu/pmd_r2o_auto_create_tables.php';

            $out1 = [];
            $out2 = [];
            $rc1 = 0;
            $rc2 = 0;

            if (file_exists($sync1)) {
                exec('php ' . escapeshellarg($sync1) . ' 2>&1', $out1, $rc1);
            } else {
                $out1[] = 'Missing file: ' . $sync1;
                $rc1 = 1;
            }

            if (file_exists($sync2)) {
                exec('php ' . escapeshellarg($sync2) . ' 2>&1', $out2, $rc2);
            } else {
                $out2[] = 'Missing file: ' . $sync2;
                $rc2 = 1;
            }

            $ok = ($rc1 === 0 && $rc2 === 0);

            return response()->json([
                'success' => $ok,
                'message' => $ok ? 'Tables synced successfully' : 'Sync failed',
                'step1_code' => $rc1,
                'step2_code' => $rc2,
                'step1_output' => $out1,
                'step2_output' => $out2,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }


}
