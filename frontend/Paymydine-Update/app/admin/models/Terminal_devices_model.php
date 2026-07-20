<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

class Terminal_devices_model extends Model
{
    protected $table = 'terminal_devices';
    protected $primaryKey = 'terminal_device_id';
    public $timestamps = true;

    protected $casts = [
        'metadata' => 'array',
        'is_active' => 'boolean',
    ];

    protected $fillable = [
        'provider_code',
        'location_id',
        'affiliate_key',
        'reader_id',
        'reader_label',
        'pairing_state',
        'terminal_status',
        'metadata',
        'is_active',
    ];

    public $relation = [
        'belongsTo' => [
            'location' => ['Admin\\Models\\Locations_model', 'foreignKey' => 'location_id'],
        ],
    ];

    public function scopeIsActive($query)
    {
        return $query->where('is_active', 1);
    }

    public static function listProviderOptions(): array
    {
        return [
            'sumup' => 'SumUp',
        ];
    }

    public static function listPairingStateOptions(): array
    {
        return [
            'unpaired' => 'Unpaired',
            'paired' => 'Paired',
            'needs_attention' => 'Needs Attention',
            'unknown' => 'Unknown',
        ];
    }

    public static function listLocationOptions(): array
    {
        if (!class_exists(Locations_model::class)) {
            return [];
        }

        return Locations_model::query()
            ->orderBy('location_name')
            ->pluck('location_name', 'location_id')
            ->toArray();
    }
}
