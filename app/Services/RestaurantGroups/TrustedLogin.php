<?php

namespace App\Services\RestaurantGroups;

use Admin\Facades\AdminAuth;
use App\Services\PmdSiteAccessService;
use App\Services\PmdTrustedLoginDeviceService;
use Illuminate\Http\Request;

final class TrustedLogin extends PmdTrustedLoginDeviceService
{
    private function groupOwner(): ?object
    {
        $user = AdminAuth::getUser();
        if (!$user) return null;

        $auth = app(Auth::class);
        $userId = (int)$user->getKey();

        if ($auth->isLegacySessionForUserId($userId)) return null;
        if (!ManagedIdentity::isManaged($userId)) return null;

        return $auth->owner(false, $user);
    }

    /** Enforce reset cutoffs for every caller, not just the resume endpoint. */
    public function current(Request $request, ?array $identity = null)
    {
        try {
            $owner = $this->groupOwner();
            if ($owner) $identity = $this->checkedIdentity($identity);
            $device = parent::current($request, $identity);
            if (!$owner) return $device;
            return $device && SecurityProof::trustedDevice($device, $owner) ? $device : null;
        } catch (\Throwable $error) {
            return null;
        }
    }

    private function checkedIdentity(?array $identity): array
    {
        $identity = $identity ?: app(PmdSiteAccessService::class)->identity();
        $proof = (array)session()->get(Auth::SESSION, []);
        $site = app(Store::class)->site(app(Store::class)->currentTenantId());
        if ((int)($identity['user_id'] ?? 0) !== (int)($proof['user_id'] ?? 0)
            || (int)($identity['location_id'] ?? 0) !== (int)$site->location_id) {
            throw new \DomainException('Trusted device identity does not match this sign-in.');
        }
        return $identity;
    }

    public function resumeIfPossible(Request $request)
    {
        $managed = false;
        try {
            $owner = $this->groupOwner();
            if (!$owner) return parent::resumeIfPossible($request);
            $managed = true;
            $identity = app(PmdSiteAccessService::class)->identity();
            if (!$this->current($request, $identity)) return null;
            $response = parent::resumeIfPossible($request);
            if ($response) {
                app(Auth::class)->verified((int)($identity['user_id'] ?? 0), (int)($identity['location_id'] ?? 0));
            }
            return $response;
        } catch (\Throwable $error) {
            // Parent resume may already have marked workspace verification.
            if ($managed) {
                app(PmdSiteAccessService::class)->clearVerification();
                app(Auth::class)->logout();
                AdminAuth::logout();
            }
            return null;
        }
    }

    public function trustAfterVerifiedSecondFactor(Request $request, ?array $identity = null): bool
    {
        try {
            if ($this->groupOwner()) {
                // Only a completed central TOTP proof may create new group trust.
                // A local workplace approval must not manufacture that proof.
                app(Auth::class)->owner(true);
                $identity = $this->checkedIdentity($identity);
            }
            return parent::trustAfterVerifiedSecondFactor($request, $identity);
        } catch (\Throwable $error) {
            return false;
        }
    }

    public function rememberVerifiedResponse(Request $request, $response)
    {
        try {
            if ($this->groupOwner()) app(Auth::class)->owner(true);
            return parent::rememberVerifiedResponse($request, $response);
        } catch (\Throwable $error) {
            return $response;
        }
    }
}
