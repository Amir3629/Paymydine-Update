<?php

use Admin\Controllers\Siteaccess;
use Admin\Facades\AdminAuth;
use App\Http\Controllers\PmdCashierTrustedDeviceResumeController;
use App\Http\Controllers\PmdFirstWorkplaceDeviceController;
use App\Http\Controllers\PmdLoginWorkplaceVerifyController;
use App\Http\Controllers\PmdOwnerEmergencyAccessController;
use App\Http\Controllers\PmdRestaurantSignInApprovalController;
use App\Http\Controllers\PmdSiteAccessHubDataController;
use App\Http\Controllers\PmdSiteAccessSessionPingController;
use App\Http\Middleware\PmdSiteAccessBindVerificationMiddleware;
use App\Http\Middleware\PmdSiteAccessGateMiddleware;
use App\Http\Middleware\PmdSiteAccessManageTrustMiddleware;
use App\Services\PmdSiteAccessQrService;
use App\Services\PmdSiteAccessQrTokenService;
use App\Services\PmdSiteAccessService;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/** PMD_SITE_ACCESS_ROUTES_V14 */
if (!defined('PMD_SITE_ACCESS_ROUTES_V1')) {
    define('PMD_SITE_ACCESS_ROUTES_V1', true);

    app(Kernel::class)->appendMiddlewareToGroup('web', PmdSiteAccessGateMiddleware::class);

    Route::group([
        'middleware' => ['web', PmdSiteAccessBindVerificationMiddleware::class],
        'prefix' => config('system.adminUri', 'admin'),
    ], function () {
        Route::get('siteaccess', [Siteaccess::class, 'index'])->name('pmd.siteaccess');

        Route::post('siteaccess/login-verify', PmdLoginWorkplaceVerifyController::class)
            ->middleware('throttle:120,1')
            ->name('pmd.siteaccess.login.verify');

        // A remembered Main Restaurant Device may satisfy Workplace Access only
        // for the Cashier role. Every other non-Owner role still uses a fresh
        // code/QR/direct approval on each new password login.
        Route::post('siteaccess/cashier-resume', PmdCashierTrustedDeviceResumeController::class)
            ->middleware('throttle:30,1')
            ->name('pmd.siteaccess.cashier.resume');

        // PMD_OWNER_EMERGENCY_LOGIN_ROUTES_V1
        // Canonical Owner setup/verification remains on /admin/login. These POST
        // endpoints keep the UI on that same card while adding one-time offline
        // recovery codes as the emergency path when the Authenticator phone is lost.
        Route::post('siteaccess/owner-security/setup-confirm', [PmdOwnerEmergencyAccessController::class, 'confirm'])
            ->middleware('throttle:8,15')
            ->name('pmd.siteaccess.owner_security.confirm');
        Route::post('siteaccess/owner-security/verify', [PmdOwnerEmergencyAccessController::class, 'verify'])
            ->middleware('throttle:8,15')
            ->name('pmd.siteaccess.owner_security.verify');
        Route::post('siteaccess/owner-security/recover', [PmdOwnerEmergencyAccessController::class, 'recover'])
            ->middleware('throttle:8,15')
            ->name('pmd.siteaccess.owner_security.recover');
        Route::post('siteaccess/owner-security/recovery-codes-saved', [PmdOwnerEmergencyAccessController::class, 'codesSaved'])
            ->middleware('throttle:8,15')
            ->name('pmd.siteaccess.owner_security.codes_saved');

        Route::post('siteaccess/verify', [Siteaccess::class, 'verify'])
            ->middleware('throttle:120,1')
            ->name('pmd.siteaccess.verify');
        Route::post('siteaccess/finalize', [Siteaccess::class, 'finalize'])->middleware('throttle:30,1')->name('pmd.siteaccess.finalize');
        Route::get('siteaccess/status', [Siteaccess::class, 'status'])->middleware('throttle:60,1')->name('pmd.siteaccess.status');
        Route::post('siteaccess/recovery', [Siteaccess::class, 'recovery'])->middleware('throttle:8,15')->name('pmd.siteaccess.recovery');

        Route::get('siteaccess/session/ping', PmdSiteAccessSessionPingController::class)
            ->middleware('throttle:30,1')
            ->name('pmd.siteaccess.session.ping');

        // PMD_RESTAURANT_SIGNIN_TRANSPORT_V1
        // Hidden under the Cashier route vocabulary so the existing managed-role
        // path guard can transport Cashier requests. The controller is still the
        // final authority and permits only Owner, Manager, or trusted Cashier.
        Route::get('cashierlab/_pmd/signin/data', [PmdRestaurantSignInApprovalController::class, 'data'])
            ->middleware('throttle:120,1')
            ->name('pmd.restaurant.signin.data');
        Route::post('cashierlab/_pmd/signin/approve', [PmdRestaurantSignInApprovalController::class, 'approve'])
            ->middleware('throttle:60,1')
            ->name('pmd.restaurant.signin.approve');
        Route::post('cashierlab/_pmd/signin/decline', [PmdRestaurantSignInApprovalController::class, 'decline'])
            ->middleware('throttle:60,1')
            ->name('pmd.restaurant.signin.decline');

        // Legacy Owner MFA routes remain for old links; canonical password login
        // renders Authenticator setup/verification inside /admin/login.
        Route::get('siteaccess/owner-mfa/setup', [Siteaccess::class, 'ownermfasetup'])->name('pmd.siteaccess.owner_mfa.setup');
        Route::get('siteaccess/owner-mfa/qr', [Siteaccess::class, 'ownermfaqr'])->middleware('throttle:60,1')->name('pmd.siteaccess.owner_mfa.qr');
        Route::post('siteaccess/owner-mfa/confirm', [Siteaccess::class, 'ownermfaconfirm'])->middleware('throttle:8,15')->name('pmd.siteaccess.owner_mfa.confirm');
        Route::get('siteaccess/owner-mfa', [Siteaccess::class, 'ownermfa'])->name('pmd.siteaccess.owner_mfa');
        Route::post('siteaccess/owner-mfa/verify', [Siteaccess::class, 'ownermfaverify'])->middleware('throttle:8,15')->name('pmd.siteaccess.owner_mfa.verify');

        Route::get('siteaccess/hub/qr/{challenge}', function ($challenge, Request $request) {
            if (!AdminAuth::isLogged()) return response('Authentication required.', 401);
            $site = app(PmdSiteAccessService::class);
            $identity = $site->identity();
            $hub = $site->currentHub($request, $identity['location_id']);
            if (!$hub) return response('Trusted Workplace Access device required.', 403);
            $site->touchDevice((int)$hub->id);

            $record = DB::table('pmd_site_access_challenges')
                ->where('id', (int)$challenge)
                ->where('location_id', $identity['location_id'])
                ->where('status', 'pending')
                ->where('expires_at', '>', now())
                ->first();
            if (!$record) return response('Challenge expired.', 404);

            $url = app(PmdSiteAccessQrTokenService::class)->signedUrl($record);
            try {
                $svg = app(PmdSiteAccessQrService::class)->svg($url, 5);
            } catch (\Throwable $error) {
                report($error);
                return response('QR unavailable.', 500);
            }

            return response($svg, 200)
                ->header('Content-Type', 'image/svg+xml; charset=UTF-8')
                ->header('Cache-Control', 'no-store, private, max-age=0')
                ->header('X-Content-Type-Options', 'nosniff');
        })->where('challenge', '[1-9][0-9]*')->middleware('throttle:120,1')->name('pmd.siteaccess.hub.qr');

        Route::get('siteaccess/q', function (Request $request) {
            if (!AdminAuth::isLogged()) return redirect(admin_url('login'));
            $site = app(PmdSiteAccessService::class);
            $id = max(0, (int)$request->query('i', 0));
            $signature = strtolower(trim((string)$request->query('s', '')));
            $challenge = app(PmdSiteAccessQrTokenService::class)->challengeForToken($id, $signature);
            $sessionChallenge = $site->challengeForSession();
            $identity = $site->identity();

            if (!$challenge || !$sessionChallenge || (int)$challenge->id !== (int)$sessionChallenge->id || (int)$challenge->user_id !== (int)$identity['user_id']) {
                return redirect(admin_url('login'))->with('error', 'This QR is not valid for your current login.');
            }
            if (!$site->hasOnlineHub((int)$challenge->location_id)) {
                return redirect(admin_url('login'))->with('error', 'The restaurant Cashier device is offline.');
            }

            DB::table('pmd_site_access_challenges')->where('id', $challenge->id)->update([
                'status' => 'approved',
                'approved_at' => now(),
                'updated_at' => now(),
            ]);
            $site->audit('challenge_qr_verified', true, $identity, null, (int)$challenge->id, $request, [
                'surface' => 'canonical_login_camera',
            ]);

            try {
                $result = $site->finalizeCurrent($request);
                app(\App\Services\PmdSiteAccessSessionBindingService::class)->bindCurrentUser();
                app(\App\Services\PmdWorkSessionPolicyService::class)->apply($site->identity());
                return redirect((string)$result['redirect'])->with('success', 'Security verified.');
            } catch (\Throwable $error) {
                return redirect(admin_url('login'))->with('error', $error->getMessage());
            }
        })->middleware('throttle:20,1')->name('pmd.siteaccess.q.short');

        // The standalone hub page is retired from normal UX. The first Owner
        // Authenticator verification automatically makes that exact browser the
        // restaurant's main security device, then returns to the requested PMD area.
        Route::get('siteaccess/hub', PmdFirstWorkplaceDeviceController::class)
            ->name('pmd.siteaccess.hub');

        // Kept for backward compatibility / explicit advanced trust operations.
        Route::post('siteaccess/hub/activate', [Siteaccess::class, 'activatehub'])
            ->middleware([PmdSiteAccessManageTrustMiddleware::class, 'throttle:10,5'])
            ->name('pmd.siteaccess.hub.activate');
        Route::post('siteaccess/hub/heartbeat', [Siteaccess::class, 'heartbeat'])->middleware('throttle:120,1')->name('pmd.siteaccess.hub.heartbeat');
        Route::get('siteaccess/hub/data', PmdSiteAccessHubDataController::class)->middleware('throttle:120,1')->name('pmd.siteaccess.hub.data');
        Route::post('siteaccess/hub/approve', [Siteaccess::class, 'approve'])->middleware('throttle:60,1')->name('pmd.siteaccess.hub.approve');
        Route::post('siteaccess/hub/decline', [Siteaccess::class, 'decline'])->middleware('throttle:60,1')->name('pmd.siteaccess.hub.decline');
        Route::post('siteaccess/recovery-codes', [Siteaccess::class, 'recoverycodes'])
            ->middleware([PmdSiteAccessManageTrustMiddleware::class, 'throttle:4,15'])
            ->name('pmd.siteaccess.recoverycodes');
        Route::post('siteaccess/device/revoke', [Siteaccess::class, 'revokedevice'])
            ->middleware([PmdSiteAccessManageTrustMiddleware::class, 'throttle:20,1'])
            ->name('pmd.siteaccess.device.revoke');
    });
}
