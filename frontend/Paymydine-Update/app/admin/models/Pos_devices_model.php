<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

/**
 * PosDevices Model Class
 */
class Pos_devices_model extends Model
{
    /**
     * @var string The database table name
     */
    protected $table = 'pos_devices';

    /**
     * @var string The database table primary key
     */
    protected $primaryKey = 'device_id';

    /**
     * @var array The model relationships
     */
    public $relation = [
        'hasMany' => [
            'configs' => ['Admin\Models\Pos_device_configs_model', 'foreignKey' => 'device_id'],
        ],
    ];

    /**
     * @var bool Enable timestamps
     */
    public $timestamps = true;

    protected $casts = [
        'is_local_terminal' => 'boolean',
        'last_seen_at' => 'datetime',
        'capabilities' => 'array',
        'platform_info' => 'array',
    ];

    protected $fillable = [
        'name',
        'code',
        'device_type',
        'description',
        'is_local_terminal',
        'device_code',
        'pairing_token',
        'device_status',
        'last_seen_at',
        'capabilities',
        'platform_info',
    ];

    /**
     * Get dropdown options
     * @return array
     */
    public static function getDropdownOptions()
    {
        return static::dropdown('name');
    }

    /**
     * Get list for dropdown with additional info (optional)
     * @return \Illuminate\Support\Collection
     */
    public static function listDropdownOptions()
    {
        return self::select('device_id', 'name', 'description')
            ->get()
            ->keyBy('device_id')
            ->map(function ($model) {
                return [$model->name, $model->description];
            });
    }

    public function scopeLocalTerminal($query)
    {
        return $query->where('is_local_terminal', true);
    }

    public function isOnline(): bool
    {
        if (empty($this->last_seen_at)) {
            return false;
        }

        return now()->diffInMinutes($this->last_seen_at) <= 2;
    }

    public function getImageUrl()
    {
        return $this->image ? asset('assets/media/uploads/' . $this->image) : null;
    }
}
