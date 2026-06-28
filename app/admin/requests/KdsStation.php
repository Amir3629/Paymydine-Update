<?php

namespace Admin\Requests;

use System\Classes\FormRequest;

class KdsStation extends FormRequest
{
    public function attributes()
    {
        return [
            'name' => 'Station Name',
            'slug' => 'URL Slug',
            'description' => 'Description',
            'category_ids' => 'Categories',
            'status_ids' => 'Statuses',
            'can_change_status' => 'Can Change Status',
            'is_active' => 'Active',
            'notification_sound' => 'Notification Sound',
            'refresh_interval' => 'Refresh Interval',
            'theme_color' => 'Theme Color',
            'priority' => 'Priority',
            'order_limit' => 'Max Orders On Screen',
            'auto_hide_completed_minutes' => 'Hide Completed After Minutes',
            'ready_pickup_timeout_minutes' => 'Ready Pickup Warning Minutes',
            'reservation_window_minutes' => 'Reservation Window Minutes',
            'show_reservations' => 'Show Reservations',
            'display_density' => 'Display Density',
            'sound_enabled' => 'Sound Enabled',
            'station_type' => 'Station Type',
        ];
    }

    public function rules()
    {
        return [
            'name' => ['required', 'min:2', 'max:128'],
            'slug' => ['nullable', 'max:128', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'], // PMD_KDS_SLUG_RULE_V53
            'description' => ['sometimes', 'max:500'],
            'category_ids' => ['sometimes', 'array'],
            'status_ids' => ['sometimes', 'array'],
            'can_change_status' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'notification_sound' => ['sometimes', 'string', 'max:50'],
            'refresh_interval' => ['sometimes', 'integer', 'min:1', 'max:60'],
            'theme_color' => ['sometimes', 'string', 'max:20'],
            'priority' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}




