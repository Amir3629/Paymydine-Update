<?php

namespace App\Services\RestaurantGroups;

use Admin\Facades\AdminAuth;
use App\Services\PmdSiteAccessService;
use App\Services\PmdTrustedLoginDeviceService;
use Illuminate\Http\Request;

final class TrustedLogin extends PmdTrustedLoginDeviceService
{
    public function resumeIfPossible(Request $request)
    {
        $owner = $this->groupOwner();

        if ($owner) {
            // Support reset must force a fresh QR enrollment. A trusted browser
            // is not allowed to turn a reset central factor back into a login.
            if (empty($owner->confirmed_at)) {
                return null;
            }

            try {
                $identity = app(PmdSiteAccessService::class)->identity();
                $device = $this->current($request, $identity);

                if (
                    $device
                    && !empty($owner->mfa_reset_at)
                    && !empty($device->paired_at)
                    && \Carbon\Carbon::parse($device->paired_at)
                        ->lte(\Carbon\Carbon::parse($owner->mfa_reset_at))
                ) {
                    return null;
                }
            } catch (\Throwable $error) {
                // A managed group identity fails closed on ambiguous trusted
                // device state and continues through the normal MFA screen.
                return null;
            }
        }

        $response = parent::resumeIfPossible($request);

        if ($response && $owner) {
            $this->markGroupVerified();
        }

        return $response;
    }

    public function trustAfterVerifiedSecondFactor(
        Request $request,
        ?array $identity = null
    ): bool {
        $trusted = parent::trustAfterVerifiedSecondFactor($request, $identity);

        if ($trusted && $this->groupOwner()) {
            $this->markGroupVerified($identity);
        }

        return $trusted;
    }

    private function groupOwner(): ?object
    {
        try {
            $user = AdminAuth::getUser();
            if (
                !$user
                || !app(Store::class)->managedLocalUser((int)$user->getKey())
            ) {
                return null;
            }

            return app(Auth::class)->owner(false, $user);
        } catch (\Throwable $error) {
            return null;
        }
    }

    private function markGroupVerified(?array $identity = null): void
    {
        try {
            $identity = $identity ?: app(PmdSiteAccessService::class)->identity();

            $userId = (int)($identity['user_id'] ?? 0);
            $locationId = (int)($identity['location_id'] ?? 0);

            if ($userId > 0 && $locationId > 0) {
                app(Auth::class)->verified($userId, $locationId);
            }
        } catch (\Throwable $error) {
            logger()->warning('PMD group trusted-device proof could not be bound', [
                'message' => $error->getMessage(),
            ]);
        }
    }
}
