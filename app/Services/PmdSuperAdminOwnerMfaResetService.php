<?php

namespace App\Services;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_SUPERADMIN_OWNER_MFA_RESET_V18B
 *
 * Support-only reset for the restaurant Owner's actual workspace Authenticator.
 *
 * This is deliberately separate from Staff Portal MFA:
 * - disables pmd_owner_mfa for the resolved Owner
 * - revokes only that Owner's trusted_login devices so a remembered browser
 *   cannot skip the next QR enrollment
 * - leaves the restaurant Workplace Hub/site_hub intact
 * - never changes the password and never approves a login
 * - fails closed if the Owner identity is missing or ambiguous
 * - restores the landlord DB context in a finally block
 */
class PmdSuperAdminOwnerMfaResetService
{
    public function resetForTenant(object $tenant): array
    {
        $database = trim((string)($tenant->database ?? ''));
        if ($database === '' || !preg_match('/^[A-Za-z0-9_]+$/', $database)) {
            return $this->failure('invalid_database', 'Restaurant database configuration is invalid.');
        }

        $originalDefault = DB::getDefaultConnection();
        $originalTenantConfig = (array)Config::get('database.connections.tenant', []);
        $tenantConfig = $originalTenantConfig ?: (array)Config::get('database.connections.mysql', []);
        $tenantConfig['database'] = $database;

        foreach ([
            'db_host' => 'host',
            'db_port' => 'port',
            'db_username' => 'username',
            'db_password' => 'password',
        ] as $tenantField => $configKey) {
            $value = $tenant->{$tenantField} ?? null;
            if ($value !== null && trim((string)$value) !== '') {
                $tenantConfig[$configKey] = $value;
            }
        }

        try {
            Config::set('database.connections.tenant', $tenantConfig);
            DB::purge('tenant');
            DB::reconnect('tenant');
            DB::setDefaultConnection('tenant');
            DB::connection('tenant')->getPdo();

            if (!Schema::connection('tenant')->hasTable('users')) {
                return $this->failure('identity_schema_missing', 'Restaurant Owner identity tables are unavailable.');
            }

            // PMD_SUPERADMIN_OWNER_MFA_RESET_V18E
            // Canonical Owner authority is users.super_user. A valid framework
            // Super User may have no staff row, so support recovery must never
            // require staffs/staff_status just to disable that user's MFA.
            $owners = DB::connection('tenant')
                ->table('users')
                ->where('super_user', 1)
                ->select([
                    'user_id',
                    'username',
                    'super_user',
                    'staff_id',
                ])
                ->orderBy('user_id')
                ->get()
                ->unique('user_id')
                ->values();

            if ($owners->count() !== 1) {
                return $this->failure(
                    'owner_identity_ambiguous',
                    $owners->isEmpty()
                        ? 'No enabled Owner login could be resolved for this restaurant.'
                        : 'More than one Owner login was resolved. Support reset was refused for safety.'
                );
            }

            $owner = $owners->first();
            $userId = (int)($owner->user_id ?? 0);
            if ($userId < 1) {
                return $this->failure('owner_user_missing', 'Owner user could not be resolved.');
            }

            $ownerTotp = app(PmdOwnerTotpService::class);
            if (!$ownerTotp->ready()) {
                return $this->failure(
                    'owner_mfa_storage_unavailable',
                    'Owner Authenticator storage is unavailable for this restaurant. No reset was performed.'
                );
            }

            $hadActiveFactor = $ownerTotp->enabled($userId);
            $revokedTrustedDevices = 0;
            $disabledFactors = 0;

            DB::connection('tenant')->transaction(function () use (
                $userId,
                &$revokedTrustedDevices,
                &$disabledFactors
            ) {
                $now = now();

                $disabledFactors = DB::connection('tenant')
                    ->table(PmdOwnerTotpService::TABLE)
                    ->where('user_id', $userId)
                    ->whereNull('disabled_at')
                    ->update([
                        'disabled_at' => $now,
                        'updated_at' => $now,
                    ]);

                if (Schema::connection('tenant')->hasTable('pmd_site_access_devices')) {
                    $revokedTrustedDevices = DB::connection('tenant')
                        ->table('pmd_site_access_devices')
                        ->where('user_id', $userId)
                        ->where('device_kind', PmdTrustedLoginDeviceService::KIND)
                        ->whereNull('revoked_at')
                        ->update([
                            'revoked_at' => $now,
                            'updated_at' => $now,
                        ]);
                }
            });

            if ($ownerTotp->enabled($userId)) {
                return $this->failure(
                    'reset_verification_failed',
                    'Owner Authenticator still appears active after reset. Support action was not verified.'
                );
            }

            return [
                'ok' => true,
                'code' => $hadActiveFactor ? 'reset' : 'already_inactive',
                'had_active_factor' => $hadActiveFactor,
                'disabled_factor_rows' => (int)$disabledFactors,
                'revoked_trusted_devices' => (int)$revokedTrustedDevices,
                'tenant_database' => $database,
                'owner_user_id' => $userId,
                'owner_staff_id' => (int)($owner->staff_id ?? 0),
                'owner_username' => trim((string)($owner->username ?? '')),
                'owner_name' => trim((string)($owner->username ?? '')) ?: 'Owner',
                'message' => $hadActiveFactor
                    ? 'Owner Authenticator reset. Existing Owner sessions/trusted sign-ins are no longer valid; the next password login must connect a NEW QR.'
                    : 'Owner Authenticator was already inactive. Trusted Owner sign-ins were revoked; the next password login must connect a NEW QR.',
            ];
        } catch (\Throwable $error) {
            logger()->error('PMD SuperAdmin Owner MFA tenant reset failed', [
                'tenant_id' => (int)($tenant->id ?? 0),
                'tenant_database' => $database,
                'error' => $error->getMessage(),
                'exception' => get_class($error),
            ]);

            return $this->failure(
                'exception',
                'Owner Authenticator reset could not be completed. No successful reset was confirmed.'
            );
        } finally {
            try {
                DB::setDefaultConnection($originalDefault);
                DB::disconnect('tenant');
                Config::set('database.connections.tenant', $originalTenantConfig);
                DB::purge('tenant');
            } catch (\Throwable $restoreError) {
                logger()->critical('PMD SuperAdmin tenant DB context restore failed after Owner MFA reset', [
                    'tenant_id' => (int)($tenant->id ?? 0),
                    'tenant_database' => $database,
                    'error' => $restoreError->getMessage(),
                ]);
            }
        }
    }

    private function failure(string $code, string $message): array
    {
        return [
            'ok' => false,
            'code' => $code,
            'had_active_factor' => false,
            'disabled_factor_rows' => 0,
            'revoked_trusted_devices' => 0,
            'owner_user_id' => 0,
            'owner_staff_id' => 0,
            'owner_username' => '',
            'owner_name' => '',
            'message' => $message,
        ];
    }
}
