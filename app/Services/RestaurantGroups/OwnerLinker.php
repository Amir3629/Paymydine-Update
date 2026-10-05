<?php
namespace App\Services\RestaurantGroups;

use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/** Bootstrap the local shadow Owner on a newly prepared, disabled tenant only. */
final class OwnerLinker
{
    public function __construct(private Store $store, private Schema $schema) {}

    private function context(int $ownerId, int $tenantId): array
    {
        $site = $this->store->site($tenantId);
        $group = $this->store->group((int)$site->group_id);
        $owner = $this->store->central()->table('pmd_group_owners')->where('id', $ownerId)->first();
        if (!$owner) throw new \DomainException('Business Owner is missing.');
        $mark = ProvisioningRules::checkpoint($site, $group, $owner);
        if ($mark['phase'] !== 'profile_ready' || $site->state === 'ready') {
            throw new \DomainException('Owner linking requires a prepared, unpublished location.');
        }
        ProvisioningRules::tenant($site, $this->store->tenant($tenantId, false));
        return [$site, $owner];
    }

    public function link(int $ownerId, int $tenantId, string $label): array
    {
        [$site, $owner] = $this->context($ownerId, $tenantId);
        if ($this->store->central()->table('pmd_group_access')->where('tenant_id', $tenantId)->exists()) {
            throw new \DomainException('An existing tenant access mapping cannot be replaced during provisioning.');
        }
        $db = $this->store->connection($tenantId, false);
        $this->schema->installTenant($db);
        $tables = ['users', 'staffs', 'staff_roles', 'locations', 'locationables', 'pmd_group_identity'];
        PublicationLock::transactional($db, $tables);
        $linked = $db->transaction(function () use ($db, $site, $owner, $label) {
            $identities = $db->table('pmd_group_identity')->get();
            if ($identities->count() > 0) {
                // Local commit may have succeeded just before a crash. Reuse the
                // exact identity, without rotating credentials or reviving staff.
                if ($identities->count() !== 1 || !hash_equals((string)$owner->uuid, (string)$identities->first()->owner_uuid)) {
                    throw new \DomainException('This database contains an Owner identity from another account.');
                }
                $userId = (int)$identities->first()->user_id;
                $user = $db->table('users')->where('user_id', $userId)->first();
                $locations = $db->table('locations')->where('location_status', 1)->get();
                if (!$user || $locations->count() !== 1) throw new \DomainException('Existing Owner link is incomplete.');
                return ['user_id' => $userId, 'staff_id' => (int)$user->staff_id, 'location_id' => (int)$locations->first()->location_id];
            }
            $skeleton = $this->normalizePreparedTemplate($db, $owner);
            $userId = (int)$skeleton['user_id'];
            $staffId = (int)$skeleton['staff_id'];
            $roleId = (int)$skeleton['role_id'];
            $locationId = (int)$skeleton['location_id'];

            // Inherited staff credentials must not become valid accounts in a
            // new customer's restaurant. Operational tokens are not cloned by
            // the deferred creator; all inherited staff are disabled here.
            foreach ($db->table('users')->get() as $inherited) {
                $changes = ['password' => Hash::make(Str::random(64))];
                foreach (['reset_code', 'reset_password_code', 'remember_token', 'persist_code', 'activation_code'] as $column) {
                    if ($db->getSchemaBuilder()->hasColumn('users', $column)) $changes[$column] = '';
                }
                $db->table('users')->where('user_id', $inherited->user_id)->update($changes);
            }

            $targetUsername = strtolower((string)$owner->username);
            foreach ($db->table('users')->whereRaw('LOWER(username) = ?', [$targetUsername])->get() as $conflict) {
                if ((int)$conflict->user_id === $userId) continue;
                $db->table('users')->where('user_id', (int)$conflict->user_id)->update([
                    'username' => 'pmd-disabled-'.(int)$conflict->user_id.'-'.substr(hash('sha256', (string)$owner->uuid.'|'.(int)$conflict->user_id), 0, 8),
                    'super_user' => 0,
                ]);
            }

            $db->table('users')->where('user_id', '!=', $userId)->update(['super_user' => 0]);
            $db->table('users')->where('user_id', $userId)->update([
                'username' => $targetUsername,
                'super_user' => 1,
            ]);
            $db->table('staffs')->update(['staff_status' => 0]);
            $db->table('staffs')->where('staff_id', $staffId)->update([
                'staff_name' => (string)$owner->name,
                'staff_email' => (string)$owner->email,
                'staff_role_id' => $roleId,
                'staff_status' => 1,
            ]);
            $db->table('locations')->where('location_id', '!=', $locationId)->update(['location_status' => 0]);
            $db->table('locations')->where('location_id', $locationId)->update([
                'location_name' => trim($label),
                'location_status' => 1,
            ]);
            $db->table('locationables')->where('locationable_id', $staffId)
                ->whereIn('locationable_type', ['staffs', 'Admin\\Models\\Staffs_model'])->delete();
            $db->table('locationables')->insert([
                'location_id' => $locationId, 'locationable_id' => $staffId, 'locationable_type' => 'staffs', 'options' => serialize([]),
            ]);
            $db->table('pmd_group_identity')->insert(['user_id' => $userId, 'owner_uuid' => (string)$owner->uuid, 'linked_at' => now()]);
            return ['user_id' => $userId, 'staff_id' => $staffId, 'location_id' => $locationId];
        });
        $this->verify($ownerId, $tenantId, $linked);
        return $linked;
    }

    /**
     * The source template is controlled by PayMyDine, but real production
     * templates can contain historical extra super-users, locations or roles.
     * A brand-new group clone has no customer identity yet, so normalize that
     * unpublished skeleton deterministically instead of leaving the tenant
     * permanently stuck. This is never called once pmd_group_identity exists.
     */
    private function normalizePreparedTemplate($db, object $owner): array
    {
        $users = $db->table('users')->lockForUpdate()->get()
            ->sortBy(static fn ($row) => (int)$row->user_id)
            ->values();

        if ($users->isEmpty()) {
            throw new \DomainException('The prepared tenant has no Owner candidate.');
        }

        $candidates = [];
        $preferred = [];

        foreach ($users as $candidate) {
            if ((int)($candidate->super_user ?? 0) !== 1) continue;

            $staff = $db->table('staffs')->where('staff_id', (int)$candidate->staff_id)->first();
            if (!$staff) continue;

            $role = !empty($staff->staff_role_id)
                ? $db->table('staff_roles')->where('staff_role_id', (int)$staff->staff_role_id)->first()
                : null;

            $entry = [$candidate, $staff, $role];
            $candidates[] = $entry;

            $code = strtolower(trim((string)($role->code ?? '')));
            if (in_array($code, ['pmd-owner', 'owner'], true)) {
                $preferred[] = $entry;
            }
        }

        $selected = $preferred[0] ?? $candidates[0] ?? null;

        if (!$selected) {
            throw new \DomainException('The prepared tenant has no usable super-user Owner candidate.');
        }

        [$user, $staff, $currentRole] = $selected;
        $userId = (int)$user->user_id;
        $staffId = (int)$staff->staff_id;

        $ownerRole = null;
        if ($currentRole && strtolower(trim((string)($currentRole->code ?? ''))) === 'pmd-owner') {
            $ownerRole = $currentRole;
        }

        if (!$ownerRole) {
            $ownerRole = $db->table('staff_roles')
                ->whereRaw('LOWER(TRIM(COALESCE(code, \'\'))) = ?', ['pmd-owner'])
                ->orderBy('staff_role_id')
                ->first();
        }

        if (!$ownerRole && $currentRole) {
            $db->table('staff_roles')->where('staff_role_id', (int)$currentRole->staff_role_id)->update([
                'name' => 'Owner',
                'code' => 'pmd-owner',
                'updated_at' => now(),
            ]);
            $ownerRole = $db->table('staff_roles')->where('staff_role_id', (int)$currentRole->staff_role_id)->first();
        }

        if (!$ownerRole) {
            throw new \DomainException('The prepared tenant has no usable Owner role.');
        }

        $locations = $db->table('locations')->get()
            ->sortBy(static fn ($row) => (int)$row->location_id)
            ->values();

        if ($locations->isEmpty()) {
            throw new \DomainException('The prepared tenant has no restaurant location.');
        }

        $active = $locations->first(static fn ($row) => (int)($row->location_status ?? 0) === 1);
        $location = $active ?: $locations->first();

        return [
            'user_id' => $userId,
            'staff_id' => $staffId,
            'role_id' => (int)$ownerRole->staff_role_id,
            'location_id' => (int)$location->location_id,
        ];
    }

    public function verify(int $ownerId, int $tenantId, array $linked): void
    {
        [, $owner] = $this->context($ownerId, $tenantId);
        $db = $this->store->connection($tenantId, false);
        $user = $db->table('users')->where('user_id', (int)($linked['user_id'] ?? 0))->where('super_user', 1)->first();
        $staff = $user ? $db->table('staffs')->where('staff_id', $user->staff_id)->where('staff_status', 1)->first() : null;
        $binding = $db->table('pmd_group_identity')->where('user_id', (int)($linked['user_id'] ?? 0))->first();
        $locationId = (int)($linked['location_id'] ?? 0);
        if (!$user || !$staff || !$binding || !hash_equals((string)$owner->uuid, (string)$binding->owner_uuid)
            || (string)$user->username !== strtolower((string)$owner->username)
            || !$db->table('staff_roles')->where('staff_role_id', $staff->staff_role_id)->where('code', 'pmd-owner')->exists()
            || !$db->table('locations')->where('location_id', $locationId)->where('location_status', 1)->exists()
            || !$db->table('locationables')->where('location_id', $locationId)->where('locationable_id', $staff->staff_id)
                ->whereIn('locationable_type', ['staffs', 'Admin\\Models\\Staffs_model'])->exists()) {
            throw new \DomainException('Committed local Owner identity could not be verified.');
        }
    }
}
