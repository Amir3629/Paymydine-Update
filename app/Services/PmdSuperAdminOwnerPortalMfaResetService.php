<?php

namespace App\Services;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_SUPERADMIN_OWNER_PORTAL_MFA_RESET_V1
 *
 * Support-only recovery primitive for a restaurant Owner who has lost both
 * their personal Authenticator device and recovery codes.
 *
 * Security properties:
 * - runs only after the SuperAdmin route/controller authorizes the request
 * - resolves the Owner from the tenant's actual Staff/User role records
 * - fails closed when Owner identity is missing or ambiguous
 * - reuses PmdPortalTotpService::resetUser(), so it never authenticates or
 *   approves the Owner; the next password-authenticated Portal login must
 *   enroll a brand-new factor
 * - restores the landlord/default DB context in a finally block
 */
class PmdSuperAdminOwnerPortalMfaResetService
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

            if (
                !Schema::connection('tenant')->hasTable('staffs')
                || !Schema::connection('tenant')->hasTable('staff_roles')
                || !Schema::connection('tenant')->hasTable('users')
            ) {
                return $this->failure('identity_schema_missing', 'Restaurant Owner identity tables are unavailable.');
            }

            $owners = DB::connection('tenant')
                ->table('staffs as staff')
                ->join('users as user', 'user.staff_id', '=', 'staff.staff_id')
                ->leftJoin('staff_roles as role', 'role.staff_role_id', '=', 'staff.staff_role_id')
                ->where(function ($query) {
                    $query->whereRaw("LOWER(TRIM(COALESCE(role.code, ''))) IN (?, ?)", ['pmd-owner', 'owner'])
                        ->orWhere('user.super_user', 1);
                })
                ->where('staff.staff_status', 1)
                ->select([
                    'user.user_id',
                    'user.username',
                    'user.super_user',
                    'staff.staff_id',
                    'staff.staff_name',
                    'role.code as role_code',
                    'role.name as role_name',
                ])
                ->orderBy('user.user_id')
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
                return $this->failure('owner_user_missing', 'Owner Portal user could not be resolved.');
            }

            $portal = app(PmdPortalTotpService::class);
            if (!$portal->ready()) {
                return $this->failure(
                    'portal_mfa_storage_unavailable',
                    'Portal MFA storage is unavailable for this restaurant. No reset was performed.'
                );
            }

            $hadActiveFactor = $portal->enabled($userId);
            if (!$portal->resetUser($userId)) {
                return $this->failure('reset_failed', 'Owner Portal Authenticator reset failed.');
            }

            if ($portal->enabled($userId)) {
                return $this->failure(
                    'reset_verification_failed',
                    'Owner Portal Authenticator still appears active after reset. Support action was not verified.'
                );
            }

            return [
                'ok' => true,
                'code' => $hadActiveFactor ? 'reset' : 'already_inactive',
                'had_active_factor' => $hadActiveFactor,
                'tenant_database' => $database,
                'owner_user_id' => $userId,
                'owner_staff_id' => (int)($owner->staff_id ?? 0),
                'owner_username' => trim((string)($owner->username ?? '')),
                'owner_name' => trim((string)($owner->staff_name ?? '')) ?: 'Owner',
                'message' => $hadActiveFactor
                    ? 'Owner Portal Authenticator was reset. The old factor and recovery codes are revoked; the next password-authenticated Portal login must enroll a NEW QR.'
                    : 'The Owner had no active Portal Authenticator. Any remaining recovery codes were cleared; the next Portal login can enroll a fresh factor.',
            ];
        } catch (\Throwable $error) {
            logger()->error('PMD SuperAdmin Owner Portal MFA tenant reset failed', [
                'tenant_id' => (int)($tenant->id ?? 0),
                'tenant_database' => $database,
                'error' => $error->getMessage(),
                'exception' => get_class($error),
            ]);

            return $this->failure(
                'exception',
                'Owner Portal Authenticator reset could not be completed. No successful reset was confirmed.'
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
            'owner_user_id' => 0,
            'owner_staff_id' => 0,
            'owner_username' => '',
            'owner_name' => '',
            'message' => $message,
        ];
    }
}
