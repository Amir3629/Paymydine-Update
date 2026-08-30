<?php

namespace App\Services;

use Admin\Facades\AdminAuth;

/** PMD_SITE_ACCESS_SESSION_BINDING_V1 */
class PmdSiteAccessSessionBindingService
{
    public const SESSION_VERIFIED_USER = 'pmd_site_verified_user_v1';

    public function bindCurrentUser(): void
    {
        $user = AdminAuth::getUser();
        $userId = (int)($user ? $user->getKey() : 0);
        if ($userId > 0) {
            session()->put(self::SESSION_VERIFIED_USER, $userId);
        }
    }

    public function isBoundToCurrentUser(): bool
    {
        $user = AdminAuth::getUser();
        $userId = (int)($user ? $user->getKey() : 0);
        return $userId > 0 && (int)session()->get(self::SESSION_VERIFIED_USER, 0) === $userId;
    }

    public function clear(): void
    {
        session()->forget(self::SESSION_VERIFIED_USER);
    }
}
