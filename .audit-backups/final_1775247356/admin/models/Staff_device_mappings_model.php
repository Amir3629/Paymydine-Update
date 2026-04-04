<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;

/**
 * Staff Device Mappings Model
 * Tracks which staff members are enrolled on which devices
 */
class Staff_device_mappings_model extends Model
{
    protected $table = 'staff_device_mappings';

    protected $primaryKey = 'mapping_id';

    public $timestamps = true;

    protected $fillable = [
        'staff_id',
        'device_id',
        'device_uid',
        'enrollment_type',
        'sync_status',
        'enrollment_data',
        'enrolled_at',
        'last_synced_at',
    ];

    protected $casts = [
        'staff_id' => 'integer',
        'device_id' => 'integer',
        'device_uid' => 'integer',
        'enrolled_at' => 'datetime',
        'last_synced_at' => 'datetime',
    ];

    public $relation = [
        'belongsTo' => [
            'staff' => ['Admin\Models\Staffs_model', 'foreignKey' => 'staff_id'],
            'device' => ['Admin\Models\FingerDevices_model', 'foreignKey' => 'device_id'],
        ],
    ];

    /**
     * Get enrollment data (decrypted)
     * @param string|null $value
     * @return array
     */
    public function getEnrollmentDataAttribute($value)
    {
        if (!$value) {
            return [];
        }

        try {
            return json_decode(decrypt($value), true) ?? [];
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Set enrollment data (encrypted)
     * @param array|string $value
     */
    public function setEnrollmentDataAttribute($value)
    {
        if (is_array($value)) {
            $value = json_encode($value);
        }

        $this->attributes['enrollment_data'] = encrypt($value);
    }

    /**
     * Scope: Pending sync
     */
    public function scopePendingSync($query)
    {
        return $query->where('sync_status', 'pending');
    }

    /**
     * Scope: Synced
     */
    public function scopeSynced($query)
    {
        return $query->where('sync_status', 'synced');
    }

    /**
     * Scope: By device
     */
    public function scopeByDevice($query, $deviceId)
    {
        return $query->where('device_id', $deviceId);
    }

    /**
     * Scope: By staff
     */
    public function scopeByStaff($query, $staffId)
    {
        return $query->where('staff_id', $staffId);
    }
}

