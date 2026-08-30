<?php

namespace App\Services;

use Admin\Services\PmdDefaultStaffRoleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * PMD_WORKPLACE_HUB_BOOTSTRAP_V1
 *
 * The first trusted workplace device must not depend on a separately-created
 * POS record. The Owner may bootstrap the browser currently open inside the
 * restaurant; later trusted devices still require an already-verified context.
 */
class PmdWorkplaceHubBootstrapService
{
    public function activate(Request $request): array
    {
        $site = app(PmdSiteAccessService::class);
        if (!$site->ready()) {
            throw new \RuntimeException('Workplace Access storage is not ready.');
        }

        $identity = $site->identity();
        $locationId = (int)$identity['location_id'];
        if ($identity['staff_id'] < 1 || $locationId < 1) {
            throw new \RuntimeException('A Team identity and restaurant location are required.');
        }

        $role = app(PmdDefaultStaffRoleService::class)->roleCodeForUser($identity['user']);
        $alreadyEnabled = $site->policyEnabled($locationId);

        if (!$alreadyEnabled && $role !== PmdDefaultStaffRoleService::OWNER) {
            throw new \RuntimeException('Only the restaurant Owner can activate Workplace Access for the first time.');
        }

        if ($alreadyEnabled && !in_array($role, [
            PmdDefaultStaffRoleService::OWNER,
            PmdDefaultStaffRoleService::MANAGER,
        ], true)) {
            throw new \RuntimeException('Only an Owner or Manager can add a trusted workplace device.');
        }

        $rawToken = bin2hex(random_bytes(32));
        $deviceName = $this->deviceName($request);
        $platform = $this->platformInfo($request);

        $deviceId = DB::table('pmd_site_access_devices')->insertGetId([
            'location_id' => $locationId,
            'device_kind' => 'site_hub',
            'staff_id' => null,
            'pos_device_id' => null,
            'device_name' => $deviceName,
            'token_hash' => $this->tokenHash($rawToken),
            'capabilities' => json_encode([
                'site_auth_hub',
                'workspace_approval',
                'staff_login_approval',
                'workplace_code_display',
            ]),
            'platform_info' => json_encode($platform),
            'paired_by_staff_id' => $identity['staff_id'],
            'paired_at' => now(),
            'last_seen_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $device = DB::table('pmd_site_access_devices')
            ->where('id', $deviceId)
            ->first();

        $site->audit(
            'workplace_device_activated',
            true,
            $identity,
            $deviceId,
            null,
            $request,
            ['bootstrap' => !$alreadyEnabled]
        );

        return [$device, $rawToken];
    }

    private function tokenHash(string $raw): string
    {
        return hash_hmac(
            'sha256',
            'device|'.$raw,
            (string)config('app.key', 'pmd-workplace-access')
        );
    }

    private function deviceName(Request $request): string
    {
        $ua = strtolower((string)$request->userAgent());

        if (str_contains($ua, 'iphone')) return 'Restaurant iPhone';
        if (str_contains($ua, 'ipad')) return 'Restaurant iPad';
        if (str_contains($ua, 'android')) return 'Restaurant Android device';
        if (str_contains($ua, 'macintosh')) return 'Restaurant Mac';
        if (str_contains($ua, 'windows')) return 'Restaurant Windows device';

        return 'Restaurant Admin device';
    }

    private function platformInfo(Request $request): array
    {
        return [
            'name' => $this->deviceName($request),
            'user_agent' => substr((string)$request->userAgent(), 0, 500),
            'ip' => substr((string)$request->ip(), 0, 45),
        ];
    }
}
