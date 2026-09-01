<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Facades\Template;
use Admin\Models\Staffs_model;
use Admin\Models\Users_model;
use Admin\Services\PmdDefaultStaffRoleService;
use Admin\Traits\HandlesPortalMfa;
use Admin\Traits\ValidatesForm;
use App\Services\PmdOwnerTotpService;
use App\Services\PmdSiteAccessQrService;
use App\Services\PmdSiteAccessService;
use App\Services\PmdSiteAccessSessionBindingService;
use App\Services\PmdTrustedLoginDeviceService;
use App\Services\PmdWorkplaceCodeService;
use App\Services\PmdWorkSessionPolicyService;
use Igniter\Flame\Exception\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/** PMD_LOGIN_CANONICAL_V8 */
class Login extends \Admin\Classes\AdminController
{
    use ValidatesForm;
    use HandlesPortalMfa;

    private const PMD_OWNER_SECURITY_SESSION = 'pmd_login_owner_security_v1';
    private const PORTAL_SUFFIX = 'portal';

    protected $requireAuthentication = false;

    public $bodyClass = 'page-login';

    public function __construct()
    {
        parent::__construct();
        $this->middleware('throttle:'.config('system.authRateLimiter', '8,15'))->only([
            'onLogin',
            'onOwnerMfaConfirm',
            'onOwnerMfaVerify',
            'onPortalMfaConfirm',
            'onPortalMfaVerify',
            'onPortalMfaRecover',
            'onRequestResetPassword',
            'onResetPassword',
        ]);
    }

    public function index()
    {
        if (AdminAuth::isLogged()) {
            // PMD_PORTAL_PERSONAL_MFA_LOGIN_INTEGRATION_V1
            $portalMfa = $this->pmdPortalMfaIndexResponse();
            if ($portalMfa) {
                Template::setTitle('Staff Portal Security - PayMyDine');
                return $portalMfa;
            }

            if (session()->has(self::PMD_OWNER_SECURITY_SESSION)) {
                $security = $this->pmdOwnerSecurityViewState();
                if ($security) {
                    Template::setTitle('Security - PayMyDine');
                    return view('auth.login_workplace_v4', [
                        'pmdLoginSecurity' => $security,
                    ]);
                }

                $this->pmdInvalidateIncompleteSecurityLogin();
                return redirect(admin_url('login'));
            }

            if (session()->has(PmdSiteAccessService::SESSION_PENDING)) {
                $security = $this->pmdWorkplaceSecurityViewState();
                if ($security) {
                    Template::setTitle('Security - PayMyDine');
                    return view('auth.login_workplace_v4', [
                        'pmdLoginSecurity' => $security,
                    ]);
                }

                $this->pmdInvalidateIncompleteSecurityLogin();
                return redirect(admin_url('login'));
            }

            $landing = $this->pmdRoleLandingRoute();
            if (!$landing) {
                $this->pmdInvalidateIncompleteSecurityLogin();
                return redirect(admin_url('login'));
            }

            $destination = (string)session()->get(
                PmdSiteAccessService::SESSION_DESTINATION,
                'workspace'
            );

            return $destination === 'staff'
                ? $this->redirect('mywork')
                : $this->redirect($landing);
        }

        Template::setTitle(lang('admin::lang.login.text_title'));
        return view('auth.login_workplace_v4');
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
        $roles = app(PmdDefaultStaffRoleService::class);
        $code = $roles->roleCodeForUser(AdminAuth::getUser());
        return $roles->routeForRoleCode($code);
    }

    /**
     * PMD_PORTAL_USERNAME_SUFFIX_V1
     *
     * There is one stored username per person. Appending the literal word
     * "portal" at sign-in selects My Work without creating a second account:
     *   mohsen       -> role workspace
     *   mohsenportal -> Staff Portal / My Work
     */
    private function pmdLoginIdentity(string $typedUsername): array
    {
        $typedUsername = trim($typedUsername);
        $lower = strtolower($typedUsername);
        $suffixLength = strlen(self::PORTAL_SUFFIX);
        $portal = strlen($typedUsername) > $suffixLength
            && substr($lower, -$suffixLength) === self::PORTAL_SUFFIX;

        $username = $portal
            ? trim(substr($typedUsername, 0, -$suffixLength))
            : $typedUsername;

        return [
            'username' => $username,
            'destination' => $portal ? 'staff' : 'workspace',
        ];
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

        $login = $this->pmdLoginIdentity((string)array_get($data, 'username', ''));
        if ($login['username'] === '') {
            throw new ValidationException([
                'username' => lang('admin::lang.login.alert_username_not_found'),
            ]);
        }

        $credentials = [
            'username' => $login['username'],
            'password' => array_get($data, 'password'),
        ];

        if (!AdminAuth::authenticate($credentials, true, true)) {
            throw new ValidationException([
                'username' => lang('admin::lang.login.alert_username_not_found'),
            ]);
        }

        session()->regenerate();
        session()->forget(self::PMD_OWNER_SECURITY_SESSION);

        try {
            app(PmdSiteAccessService::class)->clearVerification();
            app(PmdWorkSessionPolicyService::class)->clear();
            app(PmdOwnerTotpService::class)->clearSessionVerification();
        } catch (\Throwable $error) {
        }

        $landing = $this->pmdRoleLandingRoute();
        if (!$landing) {
            $this->pmdAbortInvalidAccount();
        }

        $destination = (string)$login['destination'];
        session()->put(PmdSiteAccessService::SESSION_DESTINATION, $destination);
        $target = $destination === 'staff'
            ? admin_url('mywork')
            : admin_url($landing);

        $this->pmdQueueAccountLocale();

        try {
            app(\Admin\Services\PmdAdminPresenceService::class)->loginCurrentSession();
        } catch (\Throwable $error) {
            logger()->warning('PMD admin presence login registration failed', [
                'user_id' => (int)optional(AdminAuth::getUser())->getKey(),
                'message' => $error->getMessage(),
            ]);
        }

        // PMD_PORTAL_PERSONAL_MFA_DESTINATION_V1
        // username + "portal" always uses the person's own Authenticator.
        // Never create or wait for a Workplace/Admin approval challenge here.
        if ($destination === 'staff') {
            try {
                $this->pmdBeginPortalMfa();
                return redirect(admin_url('login'));
            } catch (ValidationException $error) {
                throw $error;
            } catch (\Throwable $error) {
                logger()->error('PMD Portal MFA start failed', [
                    'user_id' => (int)optional(AdminAuth::getUser())->getKey(),
                    'message' => $error->getMessage(),
                ]);
                $this->pmdAbortBootstrapLogin(
                    'Portal security is temporarily unavailable. Try again shortly.'
                );
            }
        }

        // PMD_TRUSTED_PASSWORD_POST_RESUME_V3
        // Password authentication has established the exact user/location.
        // Resume the trusted browser NOW, before creating another TOTP
        // or Workplace challenge.
        try {
            $trustedLogin = app(PmdTrustedLoginDeviceService::class)
                ->resumeIfPossible(request());

            if ($trustedLogin) {
                return $trustedLogin;
            }
        } catch (\Throwable $error) {
            logger()->warning(
                'PMD trusted password-post resume failed',
                [
                    'user_id' =>
                        (int)optional(AdminAuth::getUser())->getKey(),
                    'message' => $error->getMessage(),
                ]
            );
        }

        // PMD_WORKPLACE_LOGIN_ALL_USERS_V8
        // Every configured second factor is rendered on the SAME /admin/login
        // card. Once Site Access storage exists, exceptions fail closed here;
        // only untouched legacy tenants with no schema retain rollout fallback.
        try {
            $siteAccess = app(PmdSiteAccessService::class);
            $identity = $siteAccess->identity();
            $locationId = (int)$identity['location_id'];
            $userId = (int)$identity['user_id'];
            $role = app(PmdDefaultStaffRoleService::class)
                ->roleCodeForUser(AdminAuth::getUser());
            $isOwner = $role === PmdDefaultStaffRoleService::OWNER;
            $ownerTotp = app(PmdOwnerTotpService::class);

            if (!$siteAccess->ready()) {
                logger()->warning('PMD Workplace Access schema not installed for legacy tenant login', [
                    'host' => request()->getHost(),
                    'user_id' => $userId,
                ]);
            } elseif (!$ownerTotp->ready()) {
                $this->pmdAbortBootstrapLogin(
                    'Restaurant security is temporarily unavailable. Try again shortly.'
                );
            } elseif ($locationId < 1) {
                $this->pmdAbortBootstrapLogin(
                    'Restaurant security is not ready for this account.'
                );
            } elseif (!$siteAccess->policyEnabled($locationId)) {
                if (!$isOwner) {
                    $this->pmdAbortBootstrapLogin(
                        'The restaurant Owner must finish the first security setup before team members can sign in.'
                    );
                }

                session()->put('pmd_owner_totp_after_v1', admin_url('siteaccess/hub'));
                $this->pmdQueueOwnerSecurityStep(
                    $ownerTotp->enabled($userId) ? 'verify' : 'setup',
                    $identity
                );

                return redirect(admin_url('login'));
            } else {
                if ($isOwner) {
                    session()->put('pmd_owner_totp_after_v1', $target);
                    $this->pmdQueueOwnerSecurityStep(
                        $ownerTotp->enabled($userId) ? 'verify' : 'setup',
                        $identity
                    );
                    return redirect(admin_url('login'));
                }

                $challengeRequest = request()->duplicate(null, null, null, []);
                $challenge = $siteAccess->beginChallenge(
                    PmdSiteAccessService::PURPOSE_WORKSPACE,
                    $target,
                    $challengeRequest
                );

                if (!$challenge) {
                    $this->pmdAbortBootstrapLogin(
                        'Restaurant verification could not be started for this account.'
                    );
                }

                return redirect(admin_url('login'));
            }
        } catch (ValidationException $error) {
            throw $error;
        } catch (\Throwable $error) {
            logger()->error('PMD Workplace Access login step-up failed', [
                'user_id' => (int)optional(AdminAuth::getUser())->getKey(),
                'message' => $error->getMessage(),
            ]);

            try {
                $site = app(PmdSiteAccessService::class);
                if ($site->ready()) {
                    $this->pmdAbortBootstrapLogin(
                        'Restaurant security is temporarily unavailable. Try again shortly.'
                    );
                }
            } catch (ValidationException $closed) {
                throw $closed;
            } catch (\Throwable $stateError) {
            }
        }

        return $destination === 'staff'
            ? $this->redirect('mywork')
            : $this->redirect($landing);
    }

    /** PMD_LOGIN_INLINE_OWNER_MFA_V2 */
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
            ->with('success', 'Authenticator connected. Activate this restaurant device once.');
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
        if ($target === '') $target = (string)($pending['redirect'] ?? admin_url('ownerdashboard'));

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

        return redirect($target)->with('success', 'Security verified.');
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

        // PMD_OWNER_SUPPORT_RESET_STALE_VERIFY_GUARD_V18C
        // A Support reset disables pmd_owner_mfa and revokes trusted Owner
        // sign-ins. A browser that was already parked on the old 6-digit
        // verify screen must NOT be allowed to keep that authenticated state,
        // and must NOT be silently converted straight to QR enrollment.
        // Returning null makes index() call pmdInvalidateIncompleteSecurityLogin(),
        // which logs the Owner out and invalidates the whole session. The Owner
        // must then enter the password again; only that fresh password login may
        // queue setup and render a brand-new Authenticator QR.
        if ($mode === 'verify') {
            $totp = app(PmdOwnerTotpService::class);
            $userId = (int)$identity['user_id'];

            if (!$totp->ready() || !$totp->enabled($userId)) {
                logger()->warning('PMD stale Owner TOTP verify session rejected', [
                    'user_id' => $userId,
                    'location_id' => (int)$identity['location_id'],
                    'reason' => $totp->ready()
                        ? 'factor_inactive_or_support_reset'
                        : 'owner_mfa_storage_unavailable',
                ]);

                return null;
            }
        }

        $security = [
            'mode' => $mode,
            'destination' => (string)session()->get(PmdSiteAccessService::SESSION_DESTINATION, 'workspace'),
            'secret' => null,
            'qr_svg' => null,
        ];

        if ($mode === 'setup') {
            $totp = app(PmdOwnerTotpService::class);
            if (!$totp->ready() || $totp->enabled((int)$identity['user_id'])) return null;

            $enrollment = $totp->enrollment((int)$identity['user_id'], (int)$identity['location_id']);
            $security['secret'] = (string)$enrollment['secret'];

            try {
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

    /** PMD_LOGIN_INLINE_WORKPLACE_V1 */
    private function pmdWorkplaceSecurityViewState(): ?array
    {
        try {
            $site = app(PmdSiteAccessService::class);
            if (!$site->ready()) return null;

            $identity = $site->identity();
            $challenge = $site->challengeForSession();
            if (
                !$challenge
                || (int)$challenge->user_id !== (int)$identity['user_id']
                || !in_array((string)$challenge->status, ['pending', 'approved'], true)
            ) {
                return null;
            }

            $localCode = null;
            $hub = $site->currentHub(request(), (int)$challenge->location_id);
            if ($hub) {
                $site->touchDevice((int)$hub->id);
                $localCode = app(PmdWorkplaceCodeService::class)
                    ->current((int)$challenge->location_id);
            }

            return [
                'mode' => 'workplace',
                'destination' => (string)session()->get(PmdSiteAccessService::SESSION_DESTINATION, 'workspace'),
                'challenge_id' => (int)$challenge->id,
                'challenge_status' => (string)$challenge->status,
                'expires_at' => (string)$challenge->expires_at,
                'online_hub' => $site->hasOnlineHub((int)$challenge->location_id),
                'local_workplace_code' => $localCode,
            ];
        } catch (\Throwable $error) {
            logger()->warning('PMD inline Workplace security state failed', [
                'message' => $error->getMessage(),
            ]);
            return null;
        }
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
            app(PmdSiteAccessService::class)->clearVerification();
            app(PmdWorkSessionPolicyService::class)->clear();
            app(PmdOwnerTotpService::class)->clearSessionVerification();
            AdminAuth::logout();
        } catch (\Throwable $error) {
        }
        session()->invalidate();
        session()->regenerateToken();
    }

    private function pmdAbortInvalidAccount(): void
    {
        try {
            AdminAuth::logout();
        } catch (\Throwable $error) {
        }
        session()->invalidate();
        session()->regenerateToken();
        throw new ValidationException([
            'username' => lang('admin::lang.login.alert_username_not_found'),
        ]);
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
