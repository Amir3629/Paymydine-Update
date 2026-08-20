<?php

namespace Admin\Services;

use Admin\Facades\AdminAuth;
use App\Helpers\SettingsHelper;
use Illuminate\Support\Facades\DB;

/**
 * PMD_NOTIFICATION_COUNT_SERVER_FIRSTPAINT_V1
 *
 * One count authority for:
 * - server-rendered Header badge
 * - notification count API
 *
 * The value is cached only on the current HTTP Request object.
 * It never persists between requests.
 */
class PmdNotificationCountV1
{
    private const REQUEST_CACHE_KEY =
        '_pmd_notification_new_count_v1';

    public function currentNewCount(): int
    {
        try {
            $request = request();

            if (
                $request
                && $request->attributes->has(
                    self::REQUEST_CACHE_KEY
                )
            ) {
                return max(
                    0,
                    (int)$request->attributes->get(
                        self::REQUEST_CACHE_KEY
                    )
                );
            }

            $user = AdminAuth::getUser();

            if (
                $user
                && !SettingsHelper::areOrderNotificationsEnabledForUser(
                    $user
                )
            ) {
                $count = 0;
            } else {
                $count = (int)DB::table(
                    'notifications'
                )
                    ->where(
                        'status',
                        'new'
                    )
                    ->count();
            }

            $count = max(
                0,
                $count
            );

            if ($request) {
                $request->attributes->set(
                    self::REQUEST_CACHE_KEY,
                    $count
                );
            }

            return $count;
        } catch (\Throwable $error) {
            return 0;
        }
    }
}
