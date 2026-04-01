<?php

namespace Admin\Models;

use Igniter\Flame\Database\Model;
use Illuminate\Support\Str;

/**
 * KDS Stations Model Class
 * Manages Kitchen Display System stations/screens
 */
class Kds_stations_model extends Model
{
    /**
     * @var string The database table name
     */
    protected $table = 'kds_stations';

    /**
     * @var string The database table primary key
     */
    protected $primaryKey = 'station_id';

    public $timestamps = true;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'category_ids',
        'status_ids',
        'can_change_status',
        'is_active',
        'notification_sound',
        'refresh_interval',
        'theme_color',
        'location_id',
        'priority',
    ];

    protected $casts = [
        'category_ids' => 'array',
        'status_ids' => 'array',
        'can_change_status' => 'boolean',
        'is_active' => 'boolean',
        'refresh_interval' => 'integer',
        'location_id' => 'integer',
        'priority' => 'integer',
    ];

    public $relation = [
        'belongsTo' => [
            'location' => ['Admin\Models\Locations_model', 'foreignKey' => 'location_id'],
        ],
    ];

    /**
     * Available notification sounds
     */
    public static $notificationSounds = [
        'doorbell' => 'Doorbell',
        'chime' => 'Chime',
        'bell' => 'Bell',
        'alert' => 'Alert',
        'notification' => 'Notification',
        'ding' => 'Ding',
        'double-beep' => 'Double Beep',
        'triple-beep' => 'Triple Beep',
        'whoosh' => 'Whoosh',
        'pop' => 'Pop',
        'success' => 'Success',
        'warning' => 'Warning',
    ];

    /**
     * Available theme colors
     */
    public static $themeColors = [
        '#4CAF50' => 'Green (Kitchen)',
        '#2196F3' => 'Blue (Bar)',
        '#FF9800' => 'Orange (Grill)',
        '#9C27B0' => 'Purple (Desserts)',
        '#F44336' => 'Red (Priority)',
        '#00BCD4' => 'Cyan (Cold Station)',
        '#795548' => 'Brown (Bakery)',
        '#607D8B' => 'Gray (General)',
    ];

    /**
     * Boot method to auto-generate slug
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->slug)) {
                $model->slug = Str::slug($model->name);
            }
            // Ensure slug is unique
            $originalSlug = $model->slug;
            $counter = 1;
            while (static::where('slug', $model->slug)->exists()) {
                $model->slug = $originalSlug . '-' . $counter;
                $counter++;
            }
        });

        static::updating(function ($model) {
            if ($model->isDirty('name') && empty($model->slug)) {
                $model->slug = Str::slug($model->name);
            }
        });
    }

    /**
     * Scope: Only active stations
     */
    public function scopeIsActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Order by priority
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('priority', 'asc')->orderBy('name', 'asc');
    }

    /**
     * Get categories assigned to this station
     */
    public function getCategories()
    {
        if (empty($this->category_ids)) {
            return collect();
        }

        return Categories_model::whereIn('category_id', $this->category_ids)
            ->where('status', 1)
            ->orderBy('priority', 'asc')
            ->get();
    }

    /**
     * Get statuses available for this station
     */
    public function getStatuses()
    {
        if (empty($this->status_ids)) {
            // Default statuses if none specified
            return Statuses_model::whereIn('status_name', ['Preparation', 'Completed', 'Canceled'])
                ->where('status_for', 'order')
                ->get();
        }

        return Statuses_model::whereIn('status_id', $this->status_ids)
            ->where('status_for', 'order')
            ->get();
    }

    /**
     * Check if a category belongs to this station
     */
    public function hasCategory($categoryId)
    {
        if (empty($this->category_ids)) {
            return true; // If no categories specified, show all
        }

        return in_array($categoryId, $this->category_ids);
    }

    /**
     * Check if station can use a specific status
     */
    public function canUseStatus($statusId)
    {
        if (!$this->can_change_status) {
            return false;
        }

        if (empty($this->status_ids)) {
            return true; // If no statuses specified, can use all
        }

        return in_array($statusId, $this->status_ids);
    }

    /**
     * Get dropdown options for forms
     */
    public static function getDropdownOptions()
    {
        return static::isActive()
            ->ordered()
            ->pluck('name', 'station_id')
            ->toArray();
    }

    /**
     * Get all available categories for selection
     */
    public static function getAvailableCategories()
    {
        return Categories_model::where('status', 1)
            ->orderBy('priority', 'asc')
            ->orderBy('name', 'asc')
            ->get()
            ->map(function ($category) {
                return [
                    'id' => $category->category_id,
                    'name' => $category->name,
                ];
            });
    }

    /**
     * Get all available statuses for selection
     */
    public static function getAvailableStatuses()
    {
        return Statuses_model::where('status_for', 'order')
            ->orderBy('status_id', 'asc')
            ->get()
            ->map(function ($status) {
                return [
                    'id' => $status->status_id,
                    'name' => $status->status_name,
                    'color' => $status->status_color,
                ];
            });
    }

    /**
     * Get URL for this KDS station
     */
    public function getKdsUrl()
    {
        return admin_url('kitchendisplay/' . $this->slug);
    }

    /**
     * Get notification sound options
     */
    public static function getNotificationSoundOptions()
    {
        return self::$notificationSounds;
    }

    /**
     * Get theme color options
     */
    public static function getThemeColorOptions()
    {
        return self::$themeColors;
    }
}

