<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TerminalDevicePlatform extends Model
{
    protected $table = 'terminal_devices_platform';

    protected $fillable = [
        'name',
        'ip_address',
        'status',
        'model',
        'last_active',
        'connection_type',
        'location',
        'last_sync',
    ];

    protected $casts = [
        'last_active' => 'datetime',
        'last_sync' => 'datetime',
    ];

    public const STATUS_ACTIVE = 'active';
    public const STATUS_INACTIVE = 'inactive';

    public const CONNECTION_SUMUP = 'SumUp';
    public const CONNECTION_WORLDLINE = 'Worldline';
    public const CONNECTION_OTHER = 'Other';

    public static function statusOptions(): array
    {
        return [
            self::STATUS_ACTIVE => 'Active',
            self::STATUS_INACTIVE => 'Inactive',
        ];
    }

    public static function connectionTypeOptions(): array
    {
        return [
            self::CONNECTION_SUMUP => 'SumUp',
            self::CONNECTION_WORLDLINE => 'Worldline',
            self::CONNECTION_OTHER => 'Other',
        ];
    }
}
