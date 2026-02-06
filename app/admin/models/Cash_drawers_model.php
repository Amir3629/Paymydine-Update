<?php

namespace Admin\Models;

use Admin\Facades\AdminLocation;
use Admin\Traits\Locationable;
use Igniter\Flame\Database\Model;
use Illuminate\Support\Facades\DB;

/**
 * Cash Drawers Model Class
 */
class Cash_drawers_model extends Model
{
    use Locationable;

    const LOCATIONABLE_RELATION = 'location';

    protected $table = 'cash_drawers';
    protected $primaryKey = 'drawer_id';
    public $timestamps = true;

    protected $fillable = [
        'name',
        'location_id',
        'pos_device_id',
        'connection_type',
        'device_path',
        'printer_id',
        'esc_pos_command',
        'voltage',
        'network_ip',
        'network_port',
        'serial_port',
        'serial_baud_rate',
        'usb_vendor_id',
        'usb_product_id',
        'connection_config',
        'status',
        'auto_open_on_cash',
        'test_on_save',
        'description',
    ];

    protected $casts = [
        'location_id' => 'integer',
        'pos_device_id' => 'integer',
        'printer_id' => 'integer',
        'network_port' => 'integer',
        'serial_baud_rate' => 'integer',
        'connection_config' => 'array',
        'status' => 'boolean',
        'auto_open_on_cash' => 'boolean',
        'test_on_save' => 'boolean',
    ];

    public $relation = [
        'belongsTo' => [
            'location' => ['Admin\Models\Locations_model', 'foreignKey' => 'location_id'],
            'posDevice' => ['Admin\Models\Pos_devices_model', 'foreignKey' => 'pos_device_id'],
        ],
        'hasMany' => [
            'logs' => ['Admin\Models\Cash_drawer_logs_model', 'foreignKey' => 'drawer_id'],
        ],
    ];

    /**
     * Get connection type options
     */
    public static function getConnectionTypeOptions()
    {
        return [
            'rj11_printer' => 'RJ11/Printer-Driven (Most Common)',
            'usb' => 'USB Direct Connection',
            'serial' => 'Serial (RS-232)',
            'network' => 'Network/Ethernet (IP)',
            'integrated' => 'Integrated Printer+Drawer',
        ];
    }

    /**
     * Get voltage options
     */
    public static function getVoltageOptions()
    {
        return [
            '12V' => '12V',
            '24V' => '24V',
        ];
    }

    /**
     * Get drawers for a specific location
     */
    public static function getLocationDrawers($locationId = null)
    {
        if (!$locationId) {
            $locationId = AdminLocation::getId();
        }

        return static::where('location_id', $locationId)
            ->where('status', true)
            ->get();
    }

    /**
     * Get default drawer for location
     */
    public static function getDefaultDrawer($locationId = null)
    {
        if (!$locationId) {
            $locationId = AdminLocation::getId();
        }

        return static::where('location_id', $locationId)
            ->where('status', true)
            ->orderBy('drawer_id', 'asc')
            ->first();
    }

    /**
     * Get dropdown options
     */
    public static function getDropdownOptions()
    {
        return static::isEnabled()->dropdown('name');
    }

    /**
     * Get location options for form
     */
    public function getLocationOptions()
    {
        return \Admin\Models\Locations_model::getDropdownOptions();
    }

    /**
     * Scope for enabled drawers
     */
    public function scopeIsEnabled($query)
    {
        return $query->where('status', true);
    }

    /**
     * Scope for location-aware queries
     */
    public function scopeWhereHasLocation($query, $locationId)
    {
        return $query->where('location_id', $locationId);
    }

    /**
     * Before save hook
     */
    protected function beforeSave()
    {
        // Ensure location_id is set
        if (empty($this->location_id)) {
            $this->location_id = AdminLocation::getId() ?: null;
        }

        // Set device_path based on connection type
        if ($this->connection_type === 'network' && $this->network_ip) {
            $this->device_path = $this->network_ip . ':' . ($this->network_port ?? 9100);
        } elseif ($this->connection_type === 'serial' && $this->serial_port) {
            $this->device_path = $this->serial_port;
        }
    }

    /**
     * Get connection config as array
     */
    public function getConnectionConfigAttribute($value)
    {
        if (empty($value)) {
            return [];
        }

        if (is_string($value)) {
            return json_decode($value, true) ?: [];
        }

        return $value ?: [];
    }

    /**
     * Set connection config
     */
    public function setConnectionConfigAttribute($value)
    {
        $this->attributes['connection_config'] = is_array($value) ? json_encode($value) : $value;
    }
}
