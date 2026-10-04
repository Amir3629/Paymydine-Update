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
            $owners = $db->table('users')->where('super_user', 1)->lockForUpdate()->get();
            $locations = $db->table('locations')->where('location_status', 1)->get();
            $roles = $db->table('staff_roles')->where('code', 'pmd-owner')->get();
            if ($owners->count() !== 1 || $locations->count() !== 1 || $roles->count() !== 1) {
                throw new \DomainException('The template must have exactly one Owner, one active location and one pmd-owner role.');
            }
            $user = $owners->first();
            $userId = (int)$user->user_id;
            $staffId = (int)$user->staff_id;
            if (!$db->table('staffs')->where('staff_id', $staffId)->exists()) {
                throw new \DomainException('The template Owner has no staff profile.');
            }
            $conflict = $db->table('users')->whereRaw('LOWER(username) = ?', [strtolower((string)$owner->username)])
                ->where('user_id', '!=', $userId)->exists();
            if ($conflict) throw new \DomainException('The shared Owner username conflicts with a template user.');

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
            $db->table('staffs')->update(['staff_status' => 0]);
            $db->table('users')->where('user_id', $userId)->update(['username' => strtolower((string)$owner->username)]);
            $db->table('staffs')->where('staff_id', $staffId)->update([
                'staff_name' => (string)$owner->name, 'staff_email' => (string)$owner->email,
                'staff_role_id' => (int)$roles->first()->staff_role_id, 'staff_status' => 1,
            ]);
            $locationId = (int)$locations->first()->location_id;
            $db->table('locations')->where('location_id', $locationId)->update(['location_name' => trim($label)]);
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
