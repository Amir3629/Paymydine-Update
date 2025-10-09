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
        return \Admin\Models\Pos_devices_model::all()->mapWithKeys(function ($device) {
            $img = $device->getImageUrl() ? '<img src="'.$device->getImageUrl().'" style="height:30px;margin-right:5px;" />' : '';
            return [$device->device_id => $img . $device->name];
        })->toArray();
    }
}
