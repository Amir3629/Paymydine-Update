<?php

namespace App\Services\RestaurantGroups;

use App\Services\PmdSuperAdminOwnerMfaResetService;

final class SupportMfaReset extends PmdSuperAdminOwnerMfaResetService
{
    public function resetForTenant(object $tenant): array
    {
        $local = parent::resetForTenant($tenant);
        if (empty($local['ok'])) return $local;

        $store = app(Store::class);
        if (!$store->installed()) return $local;

        try {
            $tenantId = (int)($tenant->id ?? 0);
            $access = $store->central()->table('pmd_group_access')
                ->where('tenant_id', $tenantId)
                ->whereNull('revoked_at')
                ->first();

            if (!$access) return $local;

            $owner = $store->central()->table('pmd_group_owners')
                ->where('id', $access->owner_id)
                ->first();

            if (!$owner) {
                return [
                    'ok' => false,
                    'code' => 'group_owner_missing',
                    'message' => 'Local Owner security was reset, but the linked business owner account could not be resolved.',
                ] + $local;
            }

            $changed = $store->central()->table('pmd_group_owners')
                ->where('id', $owner->id)
                ->where('auth_version', $owner->auth_version)
                ->update([
                    'secret_encrypted' => null,
                    'confirmed_at' => null,
                    'last_used_step' => null,
                    'mfa_reset_at' => now(),
                    'auth_version' => (int)$owner->auth_version + 1,
                    'updated_at' => now(),
                ]);

            if ($changed !== 1) {
                return [
                    'ok' => false,
                    'code' => 'group_reset_conflict',
                    'message' => 'Local Owner security was reset, but the business account changed at the same time. Reset it again before allowing sign-in.',
                ] + $local;
            }

            $site = $store->site($tenantId);
            $store->audit(
                'superadmin',
                (int)session()->get('superadmin_id', 0),
                'group_owner_mfa_reset',
                (int)$site->group_id,
                [
                    'owner_id' => (int)$owner->id,
                    'tenant_id' => $tenantId,
                ]
            );

            $local['code'] = 'group_owner_reset';
            $local['message'] = 'Business Owner Authenticator reset. Existing group-owner sessions are invalid; the next password login must connect a new QR.';
            $local['group_owner_id'] = (int)$owner->id;

            return $local;
        } catch (\Throwable $error) {
            logger()->critical('PMD group Owner MFA reset incomplete', [
                'tenant_id' => (int)($tenant->id ?? 0),
                'error' => $error->getMessage(),
            ]);

            return [
                'ok' => false,
                'code' => 'group_reset_incomplete',
                'message' => 'Local Owner security was reset, but central business-account reset could not be verified. Keep the account blocked and retry the reset.',
            ] + $local;
        }
    }
}
