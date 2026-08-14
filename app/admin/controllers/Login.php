<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Facades\Template;
use Admin\Models\Staffs_model;
use Admin\Models\Users_model;
use Admin\Traits\ValidatesForm;
use Igniter\Flame\Exception\ValidationException;
use Illuminate\Support\Facades\Mail;

class Login extends \Admin\Classes\AdminController
{
    use ValidatesForm;

    protected $requireAuthentication = false;

    public $bodyClass = 'page-login';

    public function __construct()
    {
        parent::__construct();

        // PMD auth safety: limit login/reset attempts without blocking normal page refreshes.
        $this->middleware('throttle:'.config('system.authRateLimiter', '8,15'))->only([
            'onLogin',
            'onRequestResetPassword',
            'onResetPassword',
        ]);
    }

    public function index()
    {
        if (AdminAuth::isLogged()) {
            if ($landing = $this->pmdRoleLandingRoute())
                return $this->redirect($landing);

            return $this->redirect('dashboard');
        }

        Template::setTitle(lang('admin::lang.login.text_title'));

        // Return standalone login page (same design as superadmin)
        // Use view() helper directly since we're not using the default layout
        // View is located at app/admin/views/auth/login_standalone.blade.php
        return view('auth.login_standalone');
    }

    public function reset()
    {
        if (AdminAuth::isLogged()) {
            return $this->redirect('dashboard');
        }

        $code = input('code');
        if (strlen($code) && !Users_model::whereResetCode(input('code'))->first()) {
            flash()->error(lang('admin::lang.login.alert_failed_reset'));

            return $this->redirect('login/reset?failed=1');
        }

        Template::setTitle(lang('admin::lang.login.text_password_reset_title'));

        $this->vars['resetCode'] = input('code');

        return $this->makeView('auth/reset');
    }

    /**
     * PMD_ROLE_LANDING_REDIRECT_V1
     *
     * One login-owner for role landing. Super users keep the native dashboard.
     */
    private function pmdRoleLandingRoute(): ?string
    {
        $user = AdminAuth::getUser();

        if (!$user || $user->isSuperUser())
            return null;

        $staff = $user->staff;
        $role = $staff ? $staff->role : null;

        if (!$role)
            return null;

        $code = strtolower(trim((string)($role->code ?? '')));
        $name = strtolower(trim((string)($role->name ?? '')));

        $map = [
            'pmd-owner' => 'dashboardlab',
            'owner' => 'dashboardlab',

            'pmd-accountant' => 'accountantlab',
            'accountant' => 'accountantlab',

            'pmd-cashier' => 'cashierlab',
            'cashier' => 'cashierlab',

            'pmd-manager' => 'managerlab',
            'manager' => 'managerlab',

            'pmd-waiter' => 'cashierlab',
            'waiter' => 'cashierlab',

            'pmd-reservation' => 'reservationslab',
            'reservation' => 'reservationslab',
            'reservations' => 'reservationslab',
        ];

        if ($code !== '' && isset($map[$code]))
            return $map[$code];

        return $map[$name] ?? null;
    }

    public function onLogin()
    {
        $data = post();

        $this->validate($data, [
            'username' => ['required'],
            'password' => ['required', 'min:6'],
        ], [], [
            'username' => lang('admin::lang.login.label_username'),
            'password' => lang('admin::lang.login.label_password'),
        ]);

        $credentials = [
            'username' => array_get($data, 'username'),
            'password' => array_get($data, 'password'),
        ];

        if (!AdminAuth::authenticate($credentials, true, true))
            throw new ValidationException(['username' => lang('admin::lang.login.alert_username_not_found')]);

        session()->regenerate();

        // PMD_ROLE_LANDING_REDIRECT_V1
        // Core operational roles always land in their own workspace.
        if ($landing = $this->pmdRoleLandingRoute())
            return $this->redirect($landing);

        if ($redirectUrl = input('redirect'))
            return $this->redirect($redirectUrl);

        // PMD_MEHDI_ROLE_LANDING_V1
        // These six identities clone existing live roles. Authentication is
        // already valid; send each identity directly to its proven workspace
        // instead of the generic /admin/dashboard fallback.
        $pmdUsername = strtolower(trim((string)optional(AdminAuth::user())->username));
        $pmdMehdiLanding = [
            'mehdiowner' => 'dashboardlab',
            'mehdimanager' => 'managerlab',
            'mehdiwaiter' => 'cashierlab',
            'mehdicashier' => 'cashierlab',
            'mehdiaccountant' => 'accountantlab',
            'mehdireservations' => 'reservationslab',
        ];

        if (isset($pmdMehdiLanding[$pmdUsername]))
            return $this->redirect($pmdMehdiLanding[$pmdUsername]);

        return $this->redirectIntended('dashboard');
    }

    public function onRequestResetPassword()
    {
        $data = post();

        $this->validate($data, [
            'email' => ['required', 'email:filter', 'max:96'],
        ], [], [
            'email' => lang('admin::lang.label_email'),
        ]);

        $staff = Staffs_model::whereStaffEmail(post('email'))->first();
        if ($staff && $user = $staff->user) {
            if (!$user->resetPassword())
                throw new ValidationException(['email' => lang('admin::lang.login.alert_failed_reset')]);
            $data = [
                'staff_name' => $staff->staff_name,
                'reset_link' => admin_url('login/reset?code='.$user->reset_code),
            ];
            Mail::queue('admin::_mail.password_reset_request', $data, function ($message) use ($staff) {
                $message->to($staff->staff_email, $staff->staff_name);
            });
        }

        flash()->success(lang('admin::lang.login.alert_email_sent'));

        return $this->redirect('login/reset?sent=1');
    }

    public function onResetPassword()
    {
        $data = post();

        $this->validate($data, [
            'code' => ['required'],
            'password' => ['required', 'min:6', 'max:32', 'same:password_confirm'],
            'password_confirm' => ['required'],
        ], [], [
            'code' => lang('admin::lang.login.label_reset_code'),
            'password' => lang('admin::lang.login.label_password'),
            'password_confirm' => lang('admin::lang.login.label_password_confirm'),
        ]);

        $code = array_get($data, 'code');
        $user = Users_model::whereResetCode($code)->first();

        if (!$user || !$user->completeResetPassword($code, post('password')))
            throw new ValidationException(['password' => lang('admin::lang.login.alert_failed_reset')]);

        $data = [
            'staff_name' => $user->staff->staff_name,
        ];

        Mail::queue('admin::_mail.password_reset', $data, function ($message) use ($user) {
            $message->to($user->staff->staff_email, $user->staff->staff_name);
        });

        flash()->success(lang('admin::lang.login.alert_success_reset'));

        return $this->redirect('login?reset=success');
    }
}
