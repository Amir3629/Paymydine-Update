<?php

namespace Admin\Classes;

use Admin\Facades\AdminAuth;
use Admin\Models\User_preferences_model;
use Admin\Models\Users_model;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Admin User State
 */
class UserState
{
    protected const USER_PREFERENCE_KEY = 'admin_users_state';

    protected const ONLINE_STATUS = 1;

    protected const BACK_SOON_STATUS = 2;

    protected const AWAY_STATUS = 3;

    protected const CUSTOM_STATUS = 4;

    protected $user;

    protected $defaultStateConfig = [
        'status' => 1,
        'isAway' => false,
        'awayMessage' => null,
        'updatedAt' => null,
        'clearAfterMinutes' => 0,
    ];

    protected $stateConfigCache;

    public static function forUser($user = null)
    {
        $instance = new static;
        $instance->user = $user ?: AdminAuth::getUser();

        return $instance;
    }

    public function isAway()
    {
        return (bool)$this->getConfig('isAway');
    }

    public function getStatus()
    {
        return (int)$this->getConfig('status');
    }

    public function getMessage()
    {
        return $this->getConfig('awayMessage');
    }

    public function getClearAfterMinutes()
    {
        return (int)$this->getConfig('clearAfterMinutes', 0);
    }

    public function getUpdatedAt()
    {
        return $this->getConfig('updatedAt');
    }

    public function getClearAfterAt()
    {
        if ($this->getStatus() !== static::CUSTOM_STATUS)
            return null;

        return make_carbon($this->getConfig('updatedAt'))
            ->addMinutes($this->getClearAfterMinutes());
    }

    public function getStatusColorName()
    {
        return $this->isAway() ? 'danger' : 'success';
    }

    public static function getStatusDropdownOptions()
    {
        return [
            static::ONLINE_STATUS => 'admin::lang.staff_status.text_online',
            static::BACK_SOON_STATUS => 'admin::lang.staff_status.text_back_soon',
            static::AWAY_STATUS => 'admin::lang.staff_status.text_away',
            static::CUSTOM_STATUS => 'admin::lang.staff_status.text_custom_status',
        ];
    }

    public static function getClearAfterMinutesDropdownOptions()
    {
        return [
            1440 => 'admin::lang.staff_status.text_clear_tomorrow',
            240 => 'admin::lang.staff_status.text_clear_hours',
            30 => 'admin::lang.staff_status.text_clear_minutes',
            0 => 'admin::lang.staff_status.text_dont_clear',
        ];
    }

    public static function clearExpiredStatus()
    {
        DB::table(User_preferences_model::make()->getTable())
            ->where('item', static::USER_PREFERENCE_KEY)
            ->where('value->status', static::CUSTOM_STATUS)
            ->where('value->clearAfterMinutes', '!=', 0)
            ->get()
            ->each(function ($preference) {
                $state = json_decode($preference->value);
                if (!$state->clearAfterMinutes)
                    return true;

                $clearAfterAt = make_carbon($state->updatedAt)
                    ->addMinutes($state->clearAfterMinutes);

                if (Carbon::now()->lessThan($clearAfterAt))
                    return true;

                // Get user before clearing status
                $user = Users_model::find($preference->user_id);
                $staffName = 'Staff';
                if ($user && $user->staff) {
                    $staffName = $user->staff->staff_name ?? $user->staff_name ?? 'Staff';
                } elseif ($user) {
                    $staffName = $user->staff_name ?? 'Staff';
                }

                // Clear the status (set back to Online)
                DB::table(User_preferences_model::make()->getTable())
                    ->where('id', $preference->id)
                    ->update(['value' => json_encode((new static)->defaultStateConfig)]);

                // Create notification for status auto-clear (back to Online)
                try {
                    DB::table('notifications')->insertGetId([
                        'type' => 'staff_status_change',
                        'title' => "{$staffName} is online again",
                        'table_id' => null,
                        'table_name' => 'Staff Status',
                        'payload' => json_encode([
                            'staff_id' => $user->user_id ?? null,
                            'staff_name' => $staffName,
                            'status' => static::ONLINE_STATUS,
                            'status_name' => 'Online',
                            'message' => '',
                            'changed_at' => Carbon::now()->toDateTimeString(),
                            'auto_cleared' => true
                        ], JSON_UNESCAPED_UNICODE),
                        'status' => 'new',
                        'created_at' => Carbon::now(),
                        'updated_at' => Carbon::now(),
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to create auto-clear status notification', [
                        'error' => $e->getMessage(),
                        'user_id' => $preference->user_id
                    ]);
                }
            });
    }

    //
    //
    //

    public function updateState(array $state = [])
    {
        $state = array_merge($this->defaultStateConfig, $state);

        User_preferences_model::onUser()->set(self::USER_PREFERENCE_KEY, $state);

        $this->stateConfigCache = null;
    }

    protected function getConfig($key = null, $default = null)
    {
        if (is_null($this->stateConfigCache))
            $this->stateConfigCache = $this->loadConfigFromPreference();

        $result = array_merge($this->defaultStateConfig, $this->stateConfigCache);
        if (is_null($key))
            return $result;

        return array_get($result, $key, $default);
    }

    protected function loadConfigFromPreference()
    {
        if (!$this->user)
            return [];

        return User_preferences_model::onUser($this->user)->get(self::USER_PREFERENCE_KEY, []);
    }
}
