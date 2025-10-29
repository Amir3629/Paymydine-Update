<?php

namespace App\Helpers;

use Illuminate\Support\Facades\DB;

class SettingsHelper
{
    /**
     * Get a setting value by key
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public static function get($key, $default = null)
    {
        try {
            $setting = DB::table('settings')->where('item', $key)->first();
            
            if (!$setting) {
                return $default;
            }
            
            // Handle serialized values
            if ($setting->serialized) {
                return unserialize($setting->value);
            }
            
            return $setting->value;
            
        } catch (\Exception $e) {
            \Log::warning('Failed to get setting', [
                'key' => $key,
                'error' => $e->getMessage()
            ]);
            return $default;
        }
    }
    
    /**
     * Set a setting value
     *
     * @param string $key
     * @param mixed $value
     * @param bool $serialized
     * @return bool
     */
    public static function set($key, $value, $serialized = false)
    {
        try {
            $data = [
                'item' => $key,
                'value' => $serialized ? serialize($value) : $value,
                'serialized' => $serialized ? 1 : 0,
                'sort' => 'order_notifications'
            ];
            
            $exists = DB::table('settings')->where('item', $key)->exists();
            
            if ($exists) {
                return DB::table('settings')->where('item', $key)->update($data);
            } else {
                return DB::table('settings')->insert($data);
            }
            
        } catch (\Exception $e) {
            \Log::error('Failed to set setting', [
                'key' => $key,
                'value' => $value,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
    
    /**
     * Check if order notifications are enabled
     *
     * @return bool
     */
    public static function areOrderNotificationsEnabled()
    {
        return (bool) self::get('order_notifications_enabled', true);
    }
    
    /**
     * Check if new order notifications are enabled
     *
     * @return bool
     */
    public static function areNewOrderNotificationsEnabled()
    {
        return (bool) self::get('new_order_notifications_enabled', true);
    }
    
    /**
     * Check if order status change notifications are enabled
     *
     * @return bool
     */
    public static function areOrderStatusChangeNotificationsEnabled()
    {
        return (bool) self::get('order_status_change_notifications_enabled', true);
    }
    
    /**
     * Enable or disable order notifications
     *
     * @param bool $enabled
     * @return bool
     */
    public static function setOrderNotificationsEnabled($enabled)
    {
        return self::set('order_notifications_enabled', $enabled ? '1' : '0');
    }
    
    /**
     * Enable or disable new order notifications
     *
     * @param bool $enabled
     * @return bool
     */
    public static function setNewOrderNotificationsEnabled($enabled)
    {
        return self::set('new_order_notifications_enabled', $enabled ? '1' : '0');
    }
    
    /**
     * Enable or disable order status change notifications
     *
     * @param bool $enabled
     * @return bool
     */
    public static function setOrderStatusChangeNotificationsEnabled($enabled)
    {
        return self::set('order_status_change_notifications_enabled', $enabled ? '1' : '0');
    }
}
