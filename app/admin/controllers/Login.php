<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Facades\Template;
use Admin\Models\Staffs_model;
use Admin\Models\Users_model;
use Admin\Services\PmdDefaultStaffRoleService;
use Admin\Traits\ValidatesForm;
use App\Services\PmdOwnerTotpService;
use App\Services\PmdSiteAccessQrService;
use App\Services\PmdSiteAccessService;
use App\Services\PmdSiteAccessSessionBindingService;
use App\Services\PmdWorkSessionPolicyService;
use Igniter\Flame\Exception\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class Login extends \Admin\Classes\AdminController
{
    use ValidatesForm;

    private const PMD_OWNER_SECURITY_SESSION = 'pmd_login_owner_security_v1';

    protected $requireAuthentication = false;

    public $bodyClass = 'page-login';

    public function __construct()
    {
        parent::__construct();
        $this->middleware('throttle:'.config('system.authRateLimiter', '8,15'))->only([
            'onLogin',
            'onOwnerMfaConfirm',
            'onOwnerMfaVerify',
            'onRequestResetPassword',
            'onResetPassword',
        ]);
    }

    public function index()
    {
        if (AdminAuth::isLogged()) {
            if (session()->has(self::PMD_OWNER_SECURITY_SESSION)) {
                $security = $this->pmdOwnerSecurityViewState();
                if ($security) {
                    Template::setTitle('Owner security - PayMyDine');
                    return view('auth.login_workplace_v3', [
                        'pmdLoginSecurity' => $security,
                    ]);
                }

                $this->pmdInvalidateIncompleteSecurityLogin();
                return redirect(admin_url('login'));
            }

            if (session()->has(PmdSiteAccessService::SESSION_PENDING)) {
                return redirect(admin_url('siteaccess'));
            }

            if ($this->pmdRequestedDestination() === 'staff') return $this->redirect('mywork');
            if ($landing = $this->pmdRoleLandingRoute()) return $this->redirect($landing);
            return $this->redirect('dashboard');
        }

        Template::setTitle(lang('admin::lang.login.text_title'));
        return view('auth.login_workplace_v3');
    }

    public function reset()
    {
        if (AdminAuth::isLogged()) return $this->redirect('dashboard');

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
        return app(\Admin\Services\PmdRoleLandingService::class)->routeFor(AdminAuth::getUser());
    }

    private function pmdRequestedDestination(): string
    {
        return strtolower(trim((string)input('destination'))) === 'staff' ? 'staff' : 'workspace';
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

        if (!AdminAuth::authenticate($credentials, true, true)) {
            throw new ValidationException(['username' => lang('admin::lang.login.alert_username_not_found')]);
        }

        session()->regenerate();
        session()->forget(self::PMD_OWNER_SECURITY_SESSION);

        // PMD_LOGIN_CLEAR_OLD_WORK_SESSION_V2
        try {
            app(PmdSiteAccessService::class)->clearVerification();
            app(PmdWorkSessionPolicyService::class)->clear();
            app(PmdOwnerTotpService::class)->clearSessionVerification();
        } catch (\Throwable $error) {
        }

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
        $target = $destination === 'staff' ? admin_url('mywork') : $workspaceTarget;

        // PMD_WORKPLACE_LOGIN_ALL_USERS_V6
        // Password is step one. Owner Authenticator is rendered as step two inside
        // the SAME canonical /admin/login surface. Team members continue to the
        // restaurant Workplace Code flow. The trusted POS never silently skips
        // the explicit second factor on a fresh password login.
        try {
            $siteAccess = app(PmdSiteAccessService::class);
            $identity = $siteAccess->identity();
            $locationId = (int)$identity['location_id'];
            $userId = (int)$identity['user_id'];
            $role = app(PmdDefaultStaffRoleService::class)->roleCodeForUser(AdminAuth::getUser());
            $isOwner = $role === PmdDefaultStaffRoleService::OWNER;
            $ownerTotp = app(PmdOwnerTotpService::class);

            if ($siteAccess->ready() && $locationId > 0 && !$siteAccess->policyEnabled($locationId)) {
                if (!$isOwner) {
                    $this->pmdAbortBootstrapLogin(
                        'The restaurant Owner must finish Authenticator and Workplace Access setup before team logins are allowed.'
                    );
                }

                if (!$ownerTotp->ready()) {
                    $this->pmdAbortBootstrapLogin(
                        'Owner Authenticator storage is not ready yet. Complete the PMD security setup before logging in.'
                    );
                }

                session()->put(PmdSiteAccessService::SESSION_DESTINATION, 'workspace');
                session()->put('pmd_owner_totp_after_v1', admin_url('siteaccess/hub'));
                $this->pmdQueueOwnerSecurityStep(
                    $ownerTotp->enabled($userId) ? 'verify' : 'setup',
                    $identity
                );

                return redirect(admin_url('login'));
            }

            // Remove only the hub cookie from the synthetic challenge request so
            // PmdSiteAccessService cannot auto-pass the second factor at login.
            $challengeRequest = request()->duplicate(null, null, null, []);
            $challenge = $siteAccess->beginChallenge(
                PmdSiteAccessService::PURPOSE_WORKSPACE,
                $target,
                $challengeRequest
            );

            if ($challenge) {
                // Owner can use personal TOTP without leaving /admin/login.
                // A link in step two still allows falling back to Workplace Code.
                if ($isOwner && $ownerTotp->ready() && $ownerTotp->enabled($userId)) {
                    session()->put('pmd_owner_totp_after_v1', $target);
                    $this->pmdQueueOwnerSecurityStep('verify', $identity);
                    return redirect(admin_url('login'));
                }

                return redirect(admin_url('siteaccess'));
            }
        } catch (ValidationException $error) {
            throw $error;
        } catch (\Throwable $error) {
            logger()->warning('PMD Workplace Access login step-up skipped', [
                'user_id' => (int)optional(AdminAuth::getUser())->getKey(),
                'message' => $error->getMessage(),
            ]);
        }

        if ($destination === 'staff') return $this->redirect('mywork');
        if ($landing) return $this->redirect($landing);
        if ($redirectUrl = input('redirect')) return $this->redirect($redirectUrl);
        return $this->redirectIntended('dashboard');
    }

    /** PMD_LOGIN_INLINE_OWNER_MFA_V1 */
    public function onOwnerMfaConfirm()
    {
        [$state, $identity] = $this->pmdRequireOwnerSecurityStep('setup');
        $data = post();
        $this->validate($data, [
            'code' => ['required', 'regex:/^[0-9]{6}$/'],
        ], [], [
            'code' => 'Authenticator code',
        ]);

        $totp = app(PmdOwnerTotpService::class);
        if (!$totp->confirmEnrollment(
            (int)$identity['user_id'],
            (int)$identity['location_id'],
            (string)array_get($data, 'code', '')
        )) {
            throw new ValidationException([
                'code' => 'That Authenticator code is not valid. Check the phone time and try again.',
            ]);
        }

        app(PmdSiteAccessService::class)->audit(
            'owner_totp_enrolled',
            true,
            $identity,
            null,
            null,
            request(),
            ['surface' => 'canonical_login']
        );

        session()->forget(self::PMD_OWNER_SECURITY_SESSION);
        session()->forget('pmd_owner_totp_after_v1');

        return redirect(admin_url('siteaccess/hub'))
            ->with('success', 'Owner Authenticator connected. Now activate Workplace Access on the restaurant device.');
    }

    public function onOwnerMfaVerify()
    {
        [$state, $identity] = $this->pmdRequireOwnerSecurityStep('verify');
        $data = post();
        $this->validate($data, [
            'code' => ['required', 'regex:/^[0-9]{6}$/'],
        ], [], [
            'code' => 'Authenticator code',
        ]);

        $totp = app(PmdOwnerTotpService::class);
        if (!$totp->verify((int)$identity['user_id'], (string)array_get($data, 'code', ''))) {
            app(PmdSiteAccessService::class)->audit(
                'owner_totp_failed',
                false,
                $identity,
                null,
                null,
                request(),
                ['surface' => 'canonical_login']
            );
            throw new ValidationException([
                'code' => 'The Authenticator code is not correct or was already used.',
            ]);
        }

        $service = app(PmdSiteAccessService::class);
        $pending = (array)session()->get(PmdSiteAccessService::SESSION_PENDING, []);
        $challenge = $service->challengeForSession();
        $target = (string)session()->pull('pmd_owner_totp_after_v1', '');
        if ($target === '') $target = (string)($pending['redirect'] ?? admin_url('dashboard'));

        if ($challenge && (int)$challenge->user_id === (int)$identity['user_id']) {
            DB::table('pmd_site_access_challenges')->where('id', $challenge->id)->update([
                'status' => 'used',
                'approved_at' => $challenge->approved_at ?: now(),
                'used_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $service->markWorkspaceVerified((int)$identity['location_id'], 'owner_totp', 0);
        app(PmdSiteAccessSessionBindingService::class)->bindCurrentUser();
        $policy = app(PmdWorkSessionPolicyService::class)->apply($identity);
        session()->forget(PmdSiteAccessService::SESSION_PENDING);
        session()->forget(self::PMD_OWNER_SECURITY_SESSION);

        $service->audit(
            'owner_totp_verified',
            true,
            $identity,
            null,
            $challenge ? (int)$challenge->id : null,
            request(),
            [
                'surface' => 'canonical_login',
                'session_until' => $policy['expires_at']->toIso8601String(),
                'session_reason' => $policy['reason'],
            ]
        );

        return redirect($target)->with('success', 'Owner Authenticator verified.');
    }

    private function pmdQueueOwnerSecurityStep(string $mode, array $identity): void
    {
        session()->put(self::PMD_OWNER_SECURITY_SESSION, [
            'mode' => $mode === 'setup' ? 'setup' : 'verify',
            'user_id' => (int)($identity['user_id'] ?? 0),
            'location_id' => (int)($identity['location_id'] ?? 0),
            'session_id' => (string)session()->getId(),
            'created_at' => time(),
        ]);
    }

    private function pmdOwnerSecurityViewState(): ?array
    {
        $state = (array)session()->get(self::PMD_OWNER_SECURITY_SESSION, []);
        $identity = $this->pmdOwnerIdentity();
        if (!$identity || !$this->pmdOwnerSecurityStateMatches($state, $identity)) return null;

        $mode = (string)($state['mode'] ?? '');
        $security = [
            'mode' => $mode,
            'destination' => (string)session()->get(PmdSiteAccessService::SESSION_DESTINATION, 'workspace'),
            'can_use_workplace' => app(PmdSiteAccessService::class)->policyEnabled((int)$identity['location_id']),
            'secret' => null,
            'qr_svg' => null,
        ];

        if ($mode === 'setup') {
            $totp = app(PmdOwnerTotpService::class);
            if (!$totp->ready() || $totp->enabled((int)$identity['user_id'])) return null;

            $enrollment = $totp->enrollment((int)$identity['user_id'], (int)$identity['location_id']);
            $security['secret'] = (string)$enrollment['secret'];

            try {
                // Render the SVG directly into canonical Login. No secondary IMG
                // request means no broken-image state if a route/session layer moves.
                $security['qr_svg'] = app(PmdSiteAccessQrService::class)->svg(
                    $totp->provisioningUri($enrollment),
                    5
                );
            } catch (\Throwable $error) {
                logger()->warning('PMD inline Owner Authenticator QR render failed', [
                    'user_id' => (int)$identity['user_id'],
                    'message' => $error->getMessage(),
                ]);
            }
        } elseif ($mode !== 'verify') {
            return null;
        }

        return $security;
    }

    private function pmdRequireOwnerSecurityStep(string $mode): array
    {
        $state = (array)session()->get(self::PMD_OWNER_SECURITY_SESSION, []);
        $identity = $this->pmdOwnerIdentity();

        if (
            !$identity
            || !$this->pmdOwnerSecurityStateMatches($state, $identity)
            || (string)($state['mode'] ?? '') !== $mode
        ) {
            throw new ValidationException([
                'code' => 'This security step expired. Sign in again.',
            ]);
        }

        return [$state, $identity];
    }

    private function pmdOwnerSecurityStateMatches(array $state, array $identity): bool
    {
        $createdAt = (int)($state['created_at'] ?? 0);
        return in_array((string)($state['mode'] ?? ''), ['setup', 'verify'], true)
            && (int)($state['user_id'] ?? 0) === (int)$identity['user_id']
            && (int)($state['location_id'] ?? 0) === (int)$identity['location_id']
            && hash_equals((string)($state['session_id'] ?? ''), (string)session()->getId())
            && $createdAt > (time() - 900);
    }

    private function pmdOwnerIdentity(): ?array
    {
        if (!AdminAuth::isLogged()) return null;

        try {
            $service = app(PmdSiteAccessService::class);
            $identity = $service->identity();
            $role = app(PmdDefaultStaffRoleService::class)->roleCodeForUser($identity['user']);
            if ($role !== PmdDefaultStaffRoleService::OWNER) return null;
            if ((int)$identity['user_id'] < 1 || (int)$identity['location_id'] < 1) return null;
            return $identity;
        } catch (\Throwable $error) {
            return null;
        }
    }

    private function pmdInvalidateIncompleteSecurityLogin(): void
    {
        session()->forget(self::PMD_OWNER_SECURITY_SESSION);
        try {
            app(PmdOwnerTotpService::class)->clearSessionVerification();
            AdminAuth::logout();
        } catch (\Throwable $error) {
        }
        session()->invalidate();
        session()->regenerateToken();
    }

    private function pmdAbortBootstrapLogin(string $message): void
    {
        try {
            AdminAuth::logout();
        } catch (\Throwable $logoutError) {
        }
        session()->invalidate();
        session()->regenerateToken();
        throw new ValidationException(['username' => $message]);
    }

    /** PMD_LOGIN_ACCOUNT_LOCALE_V1 */
    private function pmdQueueAccountLocale(): void
    {
        try {
            $user = AdminAuth::getUser();
            $staff = $user ? $user->staff : null;
            $languageId = (int)($staff->language_id ?? 0);
            if ($languageId < 1) return;

            $language = \System\Models\Languages_model::find($languageId);
            if (!$language || empty($language->status)) return;

            $code = strtolower(trim((string)($language->code ?? '')));
            if (!in_array($code, ['en', 'de'], true)) return;

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
            if (!$user->resetPassword()) {
                throw new ValidationException(['email' => lang('admin::lang.login.alert_failed_reset')]);
            }
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
        if (!$user || !$user->completeResetPassword($code, post('password'))) {
            throw new ValidationException(['password' => lang('admin::lang.login.alert_failed_reset')]);
        }

        $data = ['staff_name' => $user->staff->staff_name];
        Mail::queue('admin::_mail.password_reset', $data, function ($message) use ($user) {
            $message->to($user->staff->staff_email, $user->staff->staff_name);
        });

        flash()->success(lang('admin::lang.login.alert_success_reset'));
        return $this->redirect('login?reset=success');
    }
}
