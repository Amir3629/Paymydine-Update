<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use App\Services\PmdRestaurantApprovalPresenceService;
use App\Services\PmdSiteAccessService;
use App\Services\PmdSiteAccessSessionBindingService;
use App\Services\PmdTrustedLoginDeviceService;
use App\Services\PmdWorkplaceCodeService;
use App\Services\PmdWorkSessionPolicyService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** PMD_LOGIN_WORKPLACE_VERIFY_V2 */
class PmdLoginWorkplaceVerifyController
{
    public function __invoke(Request $request)
    {
        if (!AdminAuth::isLogged()) return redirect(admin_url('login'));

        $site = app(PmdSiteAccessService::class);
        $identity = $site->identity();
        $challenge = $site->challengeForSession();

        if (!$challenge || (int)$challenge->user_id !== (int)$identity['user_id']) {
            return redirect(admin_url('login'))->with('error', 'Start the login again.');
        }
        if ((string)$challenge->status !== 'pending') {
            return redirect(admin_url('login'))->with('error', 'This login request is no longer active.');
        }
        if (Carbon::parse($challenge->expires_at)->isPast()) {
            return redirect(admin_url('login'))->with('error', 'This login request expired. Sign in again.');
        }

        $attempts = (int)$challenge->attempts + 1;
        DB::table('pmd_site_access_challenges')
            ->where('id', $challenge->id)
            ->update(['attempts' => $attempts, 'updated_at' => now()]);

        if ($attempts > 8) {
            DB::table('pmd_site_access_challenges')
                ->where('id', $challenge->id)
                ->update(['status' => 'declined', 'updated_at' => now()]);
            $site->audit('workplace_code_locked', false, $identity, null, (int)$challenge->id, $request);
            return redirect(admin_url('login'))->with('error', 'Too many attempts. Sign in again.');
        }

        $locationId = (int)$challenge->location_id;
        $valid = app(PmdWorkplaceCodeService::class)->verify(
            $locationId,
            (string)$request->input('code', '')
        );

        if (!$valid) {
            $site->audit('workplace_code_failed', false, $identity, null, (int)$challenge->id, $request);
            return redirect(admin_url('login'))->with('error', 'The 6-digit code is not correct.');
        }

        // The code must actually be visible on an authorized PMD screen now.
        // A trusted restaurant hub proves this directly. Remote Owner/Manager
        // screens create only a short cache presence while their approval card
        // is open/active; they never become permanent trusted devices.
        $authorityVisible = $site->hasOnlineHub($locationId)
            || app(PmdRestaurantApprovalPresenceService::class)
                ->recentlyVisible($locationId);

        if (!$authorityVisible) {
            return redirect(admin_url('login'))->with(
                'error',
                'Open Team sign-in on the restaurant Cashier, Owner or Manager screen and use its current code.'
            );
        }

        DB::table('pmd_site_access_challenges')
            ->where('id', $challenge->id)
            ->update([
                'status' => 'approved',
                'approved_at' => now(),
                'updated_at' => now(),
            ]);

        $site->audit('workplace_code_verified', true, $identity, null, (int)$challenge->id, $request, [
            'surface' => 'canonical_login',
            'authority_visible' => true,
        ]);

        try {
            $result = $site->finalizeCurrent($request);
            app(PmdSiteAccessSessionBindingService::class)->bindCurrentUser();
            $policy = app(PmdWorkSessionPolicyService::class)->apply($site->identity());
            $site->audit('workplace_login_completed', true, $site->identity(), null, (int)$challenge->id, $request, [
                'session_until' => $policy['expires_at']->toIso8601String(),
                'session_reason' => $policy['reason'],
            ]);
            // PMD_STAFF_TRUST_EXACT_SUCCESS_V3
            // PMD_STAFF_DIRECT_TRUST_V16_FINAL
            app(PmdTrustedLoginDeviceService::class)
                ->trustAfterVerifiedSecondFactor(
                    $request,
                    $identity
                );

            $response = redirect((string)$result['redirect'])
                ->with('success', 'Security verified.');

            return app(PmdTrustedLoginDeviceService::class)
                ->rememberVerifiedResponse($request, $response);
        } catch (\Throwable $error) {
            return redirect(admin_url('login'))->with('error', $error->getMessage());
        }
    }
}
