<?php

use Admin\Controllers\Siteaccess;
use Admin\Facades\AdminAuth;
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

/** PMD_SITE_ACCESS_ROUTES_V8 */
if (!defined('PMD_SITE_ACCESS_ROUTES_V1')) {
    define('PMD_SITE_ACCESS_ROUTES_V1', true);

    app(Kernel::class)->appendMiddlewareToGroup('web', PmdSiteAccessGateMiddleware::class);

    Route::group([
        'middleware' => ['web', PmdSiteAccessBindVerificationMiddleware::class],
        'prefix' => config('system.adminUri', 'admin'),
    ], function () {
        Route::get('siteaccess', [Siteaccess::class, 'index'])->name('pmd.siteaccess');
        Route::post('siteaccess/verify', [Siteaccess::class, 'verify'])->middleware('throttle:12,1')->name('pmd.siteaccess.verify');
        Route::post('siteaccess/finalize', [Siteaccess::class, 'finalize'])->middleware('throttle:30,1')->name('pmd.siteaccess.finalize');
        Route::get('siteaccess/status', [Siteaccess::class, 'status'])->middleware('throttle:60,1')->name('pmd.siteaccess.status');
        Route::post('siteaccess/recovery', [Siteaccess::class, 'recovery'])->middleware('throttle:8,15')->name('pmd.siteaccess.recovery');

        // PMD_WORK_SESSION_KEEPALIVE_ROUTE_V2
        // The absolute PMD deadline gate still runs before this controller. The
        // endpoint only keeps a still-valid Admin session from expiring by idle GC.
        Route::get('siteaccess/session/ping', PmdSiteAccessSessionPingController::class)
            ->middleware('throttle:30,1')
            ->name('pmd.siteaccess.session.ping');

        // Legacy Owner MFA routes remain available for backward compatibility.
        // The canonical password flow now renders Owner MFA inside /admin/login.
        Route::get('siteaccess/owner-mfa/setup', [Siteaccess::class, 'ownermfasetup'])->name('pmd.siteaccess.owner_mfa.setup');
        Route::get('siteaccess/owner-mfa/qr', [Siteaccess::class, 'ownermfaqr'])->middleware('throttle:60,1')->name('pmd.siteaccess.owner_mfa.qr');
        Route::post('siteaccess/owner-mfa/confirm', [Siteaccess::class, 'ownermfaconfirm'])->middleware('throttle:8,15')->name('pmd.siteaccess.owner_mfa.confirm');
        Route::get('siteaccess/owner-mfa', [Siteaccess::class, 'ownermfa'])->name('pmd.siteaccess.owner_mfa');
        Route::post('siteaccess/owner-mfa/verify', [Siteaccess::class, 'ownermfaverify'])->middleware('throttle:8,15')->name('pmd.siteaccess.owner_mfa.verify');

        // PMD_SITE_ACCESS_SIGNED_QR_V2
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

            if (!$challenge || !$sessionChallenge || (int)$challenge->id !== (int)$sessionChallenge->id || (int)$challenge->user_id !== $identity['user_id']) {
                return redirect(admin_url('siteaccess'))->with('error', 'This Workplace Access QR is not valid for your current login.');
            }
            if (!$site->hasOnlineHub((int)$challenge->location_id)) {
                return redirect(admin_url('siteaccess'))->with('error', 'The restaurant Workplace Access device is offline.');
            }

            DB::table('pmd_site_access_challenges')->where('id', $challenge->id)->update([
                'status' => 'approved',
                'approved_at' => now(),
                'updated_at' => now(),
            ]);
            $site->audit('challenge_qr_verified', true, $identity, null, (int)$challenge->id, $request);

            try {
                $result = $site->finalizeCurrent($request);
                app(\App\Services\PmdSiteAccessSessionBindingService::class)->bindCurrentUser();
                app(\App\Services\PmdWorkSessionPolicyService::class)->apply($site->identity());
                return redirect((string)$result['redirect'])->with('success', 'Workplace Access verified.');
            } catch (\Throwable $error) {
                return redirect(admin_url('siteaccess'))->with('error', $error->getMessage());
            }
        })->middleware('throttle:20,1')->name('pmd.siteaccess.q.short');

        Route::get('siteaccess/hub', [Siteaccess::class, 'hub'])->name('pmd.siteaccess.hub');
        Route::post('siteaccess/hub/activate', [Siteaccess::class, 'activatehub'])
            ->middleware([PmdSiteAccessManageTrustMiddleware::class, 'throttle:10,5'])
            ->name('pmd.siteaccess.hub.activate');
        Route::post('siteaccess/hub/heartbeat', [Siteaccess::class, 'heartbeat'])->middleware('throttle:120,1')->name('pmd.siteaccess.hub.heartbeat');
        Route::get('siteaccess/hub/data', [Siteaccess::class, 'hubdata'])->middleware('throttle:120,1')->name('pmd.siteaccess.hub.data');
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
