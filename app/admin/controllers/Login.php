<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Facades\Template;
use Admin\Models\Staffs_model;
use Admin\Models\Users_model;
use Admin\Traits\ValidatesForm;
use App\Services\PmdSiteAccessService;
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
            // PMD_SITE_ACCESS_LOGIN_V1
            // A password-authenticated session that is waiting for workplace
            // verification must never skip the step-up page by revisiting login.
            if (session()->has(PmdSiteAccessService::SESSION_PENDING)) {
                return redirect(admin_url('siteaccess'));
            }

            // PMD_LOGIN_DESTINATION_V3
            if ($this->pmdRequestedDestination() === 'staff')
                return $this->redirect('mywork');

            if ($landing = $this->pmdRoleLandingRoute())
                return $this->redirect($landing);

            return $this->redirect('dashboard');
        }

        Template::setTitle(lang('admin::lang.login.text_title'));

        // PMD_LOGIN_WORKSPACE_V4
        // One AdminAuth login surface exposes Workspace/Staff destinations and
        // Site Access is the shared step-up authority after password success.
        return view('auth.login_workspace_v2');
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

    private function pmdRoleLandingRoute(): ?string
    {
        return app(\Admin\Services\PmdRoleLandingService::class)
            ->routeFor(AdminAuth::getUser());
    }

    private function pmdRequestedDestination(): string
    {
        return strtolower(trim((string)input('destination'))) === 'staff'
            ? 'staff'
            : 'workspace';
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
        $this->pmdQueueAccountLocale();

        try {
            app(\Admin\Services\PmdAdminPresenceService::class)->loginCurrentSession();
        } catch (\Throwable $error) {
            logger()->warning('PMD admin presence login registration failed', [
                'user_id' => (int)optional(AdminAuth::getUser())->getKey(),
                'message' => $error->getMessage(),
            ]);
        }

        $destination = $this->pmdRequestedDestination();
        session()->put(PmdSiteAccessService::SESSION_DESTINATION, $destination);

        $landing = $this->pmdRoleLandingRoute();
        $workspaceTarget = $landing
            ? admin_url($landing)
            : (input('redirect') ? (string)input('redirect') : admin_url('dashboard'));
        $target = $destination === 'staff'
            ? admin_url('mywork')
            : $workspaceTarget;

        // PMD_SITE_ACCESS_LOGIN_V1
        // Staff Portal: first untrusted personal browser is paired at restaurant.
        // Workspace: requires restaurant verification unless this browser itself
        // is the activated trusted Site Access POS hub.
        try {
            $siteAccess = app(PmdSiteAccessService::class);
            $purpose = $destination === 'staff'
                ? PmdSiteAccessService::PURPOSE_PAIR_STAFF
                : PmdSiteAccessService::PURPOSE_WORKSPACE;
            $challenge = $siteAccess->beginChallenge($purpose, $target, request());
            if ($challenge) {
                return redirect(admin_url('siteaccess'));
            }
        } catch (\Throwable $error) {
            // Rollout safety: Site Access never blocks password login before the
            // additive schema/hub is known-good. Once a challenge is created,
            // the global pending-session gate prevents bypass.
            logger()->warning('PMD Site Access login step-up skipped', [
                'user_id' => (int)optional(AdminAuth::getUser())->getKey(),
                'message' => $error->getMessage(),
            ]);
        }

        if ($destination === 'staff')
            return $this->redirect('mywork');

        if ($landing)
            return $this->redirect($landing);

        if ($redirectUrl = input('redirect'))
            return $this->redirect($redirectUrl);

        return $this->redirectIntended('dashboard');
    }

    /** PMD_LOGIN_ACCOUNT_LOCALE_V1 */
    private function pmdQueueAccountLocale(): void
    {
        try {
            $user = AdminAuth::getUser();
            $staff = $user ? $user->staff : null;
            $languageId = (int)($staff->language_id ?? 0);

            if ($languageId < 1) {
                return;
            }

            $language = \System\Models\Languages_model::find($languageId);
            if (!$language || empty($language->status)) {
                return;
            }

            $code = strtolower(trim((string)($language->code ?? '')));
            if (!in_array($code, ['en', 'de'], true)) {
                return;
            }

            app()->setLocale($code);
            if (app()->bound('translator.localization')) {
                app('translator.localization')->setLocale($code, true);
            }

            \Illuminate\Support\Facades\Cookie::queue(cookie(
                'pmd_admin_locale',
                $code,
                60 * 24 * 365,
                '/',
                null,
                request()->isSecure(),
                false,
                false,
                'Lax'
            ));
        } catch (\Throwable $error) {
            logger()->warning('PMD login account locale restore failed', [
                'message' => $error->getMessage(),
            ]);
        }
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
