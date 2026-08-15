<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;

class Logout extends \Admin\Classes\AdminController
{
    protected $requireAuthentication = false;

    public function index()
    {
        if (AdminAuth::isImpersonator()) {
            AdminAuth::stopImpersonate();
        }
        else {
            // PMD_ADMIN_SESSION_PRESENCE_V1
            // Close only this browser session; another simultaneous session
            // for the same staff member remains online.
            try {
                app(\Admin\Services\PmdAdminPresenceService::class)->logoutCurrentSession();
            } catch (\Throwable $error) {
                logger()->warning('PMD admin presence logout registration failed', [
                    'message' => $error->getMessage(),
                ]);
            }

            AdminAuth::logout();

            session()->invalidate();

            session()->regenerateToken();
        }

        flash()->success(lang('admin::lang.login.alert_success_logout'));

        return $this->redirect('login');
    }
}
