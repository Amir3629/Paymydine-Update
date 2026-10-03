<?php

namespace App\Services\RestaurantGroups;

use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

final class OwnerLinker
{
    public function __construct(
        private Store $store,
        private Schema $schema
    ) {
    }

    public function link(
        int $ownerId,
        int $tenantId,
        string $label
    ): array {
        $owner = $this->store->central()->table('pmd_group_owners')
            ->where('id', $ownerId)
            ->first();

        if (!$owner || $owner->status !== 'active') {
            throw new \DomainException('Business owner account is not active.');
        }

        $db = $this->store->connection($tenantId, false);
        $this->schema->installTenant($db);

        return $db->transaction(function () use ($db, $owner, $ownerId, $tenantId, $label) {
            $owners = $db->table('users')
                ->where('super_user', 1)
                ->orderBy('user_id')
                ->get();

            if ($owners->count() !== 1) {
                throw new \DomainException(
                    $owners->isEmpty()
                        ? 'The tenant template has no Owner account.'
                        : 'The tenant template contains more than one Owner account.'
                );
            }

            $user = $owners->first();
            $userId = (int)$user->user_id;
            $staffId = (int)($user->staff_id ?? 0);

            if ($staffId < 1 || !$db->table('staffs')->where('staff_id', $staffId)->exists()) {
                throw new \DomainException('The tenant Owner has no staff profile.');
            }

            $usernameConflict = $db->table('users')
                ->whereRaw('LOWER(username) = ?', [strtolower((string)$owner->username)])
                ->where('user_id', '!=', $userId)
                ->exists();

            if ($usernameConflict) {
                throw new \DomainException('The shared Owner username is already used by another tenant user.');
            }

            $roleId = (int)$db->table('staff_roles')
                ->where('code', 'pmd-owner')
                ->value('staff_role_id');

            if ($roleId < 1) {
                $roleId = (int)$db->table('staff_roles')
                    ->whereRaw('LOWER(name) = ?', ['owner'])
                    ->value('staff_role_id');
            }

            if ($roleId < 1) {
                throw new \DomainException('The tenant Owner role is missing.');
            }

            $location = $db->table('locations')
                ->where('location_status', 1)
                ->orderBy('location_id')
                ->first();

            if (!$location) {
                throw new \DomainException('The tenant has no active restaurant location.');
            }

            $locationId = (int)$location->location_id;

            // The central password is never copied into a tenant database.
            $db->table('users')->where('user_id', $userId)->update([
                'username' => strtolower((string)$owner->username),
                'password' => Hash::make(Str::random(64)),
                'super_user' => 1,
            ]);

            $staffUpdate = [
                'staff_name' => (string)$owner->name,
                'staff_email' => (string)$owner->email,
                'staff_role_id' => $roleId,
                'staff_status' => 1,
            ];

            if ($db->getSchemaBuilder()->hasColumn('staffs', 'updated_at')) {
                $staffUpdate['updated_at'] = now();
            }

            $db->table('staffs')->where('staff_id', $staffId)->update($staffUpdate);

            $locationUpdate = ['location_name' => trim($label)];
            if ($db->getSchemaBuilder()->hasColumn('locations', 'updated_at')) {
                $locationUpdate['updated_at'] = now();
            }

            $db->table('locations')->where('location_id', $locationId)->update($locationUpdate);

            $hasLocation = $db->table('locationables')
                ->where('location_id', $locationId)
                ->where('locationable_id', $staffId)
                ->whereIn('locationable_type', ['staffs', 'Admin\\Models\\Staffs_model'])
                ->exists();

            if (!$hasLocation) {
                $db->table('locationables')->insert([
                    'location_id' => $locationId,
                    'locationable_id' => $staffId,
                    'locationable_type' => 'staffs',
                    'options' => serialize([]),
                ]);
            }

            $db->table('pmd_group_identity')->updateOrInsert(
                ['user_id' => $userId],
                [
                    'owner_uuid' => (string)$owner->uuid,
                    'linked_at' => now(),
                ]
            );

            $this->store->central()->table('pmd_group_access')->updateOrInsert(
                ['owner_id' => $ownerId, 'tenant_id' => $tenantId],
                [
                    'user_id' => $userId,
                    'can_publish' => 1,
                    'revoked_at' => null,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );

            return [
                'user_id' => $userId,
                'staff_id' => $staffId,
                'location_id' => $locationId,
            ];
        });
    }
}
