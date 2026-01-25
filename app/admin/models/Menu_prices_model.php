<?php

namespace Admin\Models;

use Carbon\Carbon;
use Igniter\Flame\Database\Model;

/**
 * Menu Prices Model Class
 * Handles multiple price levels for menu items
 */
class Menu_prices_model extends Model
{
    /**
     * @var string The database table name
     */
    protected $table = 'menu_prices';

    protected $primaryKey = 'price_id';

    protected $fillable = [
        'menu_id',
        'price_type',
        'price',
        'is_active',
        'time_from',
        'time_to',
        'days_of_week',
        'priority',
    ];

    protected $casts = [
        'menu_id' => 'integer',
        'price' => 'float',
        'is_active' => 'boolean',
        'time_from' => 'time',
        'time_to' => 'time',
        'priority' => 'integer',
    ];

    /**
     * Convert days_of_week from array to comma-separated string when saving
     */
    public function setDaysOfWeekAttribute($value)
    {
        if (is_array($value)) {
            // Filter out empty values and join with comma
            $value = implode(',', array_filter($value));
        }
        // If empty string, null, or empty array, set to null
        if (empty($value) || (is_string($value) && trim($value) === '')) {
            $this->attributes['days_of_week'] = null;
        } else {
            $this->attributes['days_of_week'] = $value;
        }
    }

    /**
     * Convert days_of_week from comma-separated string to array when reading
     * This is used by the form widget which expects an array
     */
    public function getDaysOfWeekAttribute($value)
    {
        // Always return array for form compatibility
        if (empty($value)) {
            return [];
        }
        // If already an array (from form), return as is
        if (is_array($value)) {
            return $value;
        }
        // Convert comma-separated string to array
        return explode(',', $value);
    }

    public $timestamps = true;

    /**
     * Get available price types
     */
    public static function getPriceTypeOptions()
    {
        return [
            'default' => 'Default Price',
            'bar' => 'Bar Price',
            'dining_room' => 'Dining Room Price',
            'room_service' => 'Room Service Price',
            'happy_hour' => 'Happy Hour Price',
        ];
    }

    /**
     * Get days of week options
     */
    public static function getDaysOfWeekOptions()
    {
        return [
            'Mon' => 'Monday',
            'Tue' => 'Tuesday',
            'Wed' => 'Wednesday',
            'Thu' => 'Thursday',
            'Fri' => 'Friday',
            'Sat' => 'Saturday',
            'Sun' => 'Sunday',
        ];
    }

    /**
     * Check if this price is currently active based on time
     */
    public function isCurrentlyActive()
    {
        if (!$this->is_active) {
            return false;
        }

        // If no time restrictions, it's always active
        if (!$this->time_from && !$this->time_to) {
            return true;
        }

        $now = Carbon::now();

        // Check days of week if specified
        // Get raw value from database (bypass accessor to get original string)
        $daysOfWeekRaw = $this->getOriginal('days_of_week');
        if ($daysOfWeekRaw) {
            // Convert comma-separated string to array
            $days = explode(',', $daysOfWeekRaw);
            $days = array_filter(array_map('trim', $days)); // Clean up
            if (!empty($days)) {
                $currentDay = $now->format('D');
                if (!in_array($currentDay, $days)) {
                    return false;
                }
            }
        }

        // Check time range
        if ($this->time_from && $this->time_to) {
            $timeFrom = Carbon::parse($this->time_from);
            $timeTo = Carbon::parse($this->time_to);
            $currentTime = $now->copy()->setTime($now->hour, $now->minute, 0);

            // Handle overnight hours (e.g., 22:00 - 02:00)
            if ($timeFrom->greaterThan($timeTo)) {
                return $currentTime->greaterThanOrEqualTo($timeFrom) || $currentTime->lessThanOrEqualTo($timeTo);
            }

            return $currentTime->between($timeFrom, $timeTo);
        }

        return true;
    }

    /**
     * Get the effective price for a given context and time
     */
    public static function getPriceForContext($menuId, $priceType = 'default', $datetime = null)
    {
        if (is_null($datetime)) {
            $datetime = Carbon::now();
        }

        if (!$datetime instanceof Carbon) {
            $datetime = Carbon::parse($datetime);
        }

        // Get all active prices for this menu and context
        $prices = self::where('menu_id', $menuId)
            ->where('price_type', $priceType)
            ->where('is_active', 1)
            ->orderBy('priority', 'desc')
            ->get();

        // Filter by time and day restrictions
        $matchingPrices = $prices->filter(function ($price) use ($datetime) {
            return $price->isCurrentlyActive();
        });

        // Get the highest priority matching price
        $price = $matchingPrices->first();

        // If no context-specific price found, try default
        if (!$price && $priceType !== 'default') {
            $defaultPrices = self::where('menu_id', $menuId)
                ->where('price_type', 'default')
                ->where('is_active', 1)
                ->whereNull('time_from')
                ->whereNull('time_to')
                ->orderBy('priority', 'desc')
                ->get();
            
            $price = $defaultPrices->first();
        }

        return $price ? $price->price : null;
    }
}

