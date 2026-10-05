<?php

namespace App\Services\RestaurantGroups;

use Carbon\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

final class Store
{
    private ?bool $installedCache = null;
    private ?int $currentTenantCache = null;

    public function central()
    {
        return DB::connection('pmd_groups_central');
    }

    public function installed(): bool
    {
        if ($this->installedCache !== null) {
            return $this->installedCache;
        }

        try {
            $schema = $this->central()->getSchemaBuilder();

            return $this->installedCache = (
                $schema->hasTable('pmd_group_schema')
                && (int)$this->central()->table('pmd_group_schema')
                    ->where('name', 'restaurant-groups')
                    ->value('version') === Schema::VERSION
            );
        } catch (\Throwable $error) {
            return $this->installedCache = false;
        }
    }

    public function enabled(): bool
    {
        return (bool)config('pmd_groups.enabled', true) && $this->installed();
    }

    public function currentTenantId(): int
    {
        if ($this->currentTenantCache !== null) {
            return $this->currentTenantCache;
        }

        $tenant = request()->attributes->get('tenant');

        if ($tenant && !empty($tenant->id)) {
            return $this->currentTenantCache = (int)$tenant->id;
        }

        $host = strtolower(trim((string)request()->getHost()));

        if ($host === '') {
            return $this->currentTenantCache = 0;
        }

        try {
            return $this->currentTenantCache = (int)$this->central()
                ->table('tenants')
                ->whereRaw('LOWER(domain) = ?', [$host])
                ->value('id');
        } catch (\Throwable $error) {
            return $this->currentTenantCache = 0;
        }
    }

    public function tenant(int $tenantId, bool $requireActive = true): object
    {
        $tenant = $this->central()->table('tenants')->where('id', $tenantId)->first();

        if (
            !$tenant
            || !preg_match('/^[A-Za-z0-9_]{1,64}$/D', (string)($tenant->database ?? ''))
        ) {
            throw new \DomainException('Restaurant not found.');
        }

        if ($requireActive) {
            $status = strtolower(trim((string)($tenant->status ?? '')));
            if ($status !== 'active') {
                throw new \DomainException('Restaurant is not active.');
            }

            if (!empty($tenant->start) && Carbon::parse($tenant->start)->startOfDay()->isFuture()) {
                throw new \DomainException('Restaurant subscription has not started.');
            }

            if (!empty($tenant->end) && Carbon::parse($tenant->end)->endOfDay()->isPast()) {
                throw new \DomainException('Restaurant subscription has expired.');
            }
        }

        return $tenant;
    }

    public function connection(int $tenantId, bool $requireActive = true)
    {
        $tenant = $this->tenant($tenantId, $requireActive);
        $name = 'pmd_group_tenant_'.$tenantId;

        $config = (array)config(
            'pmd_groups.tenant_template',
            config('database.connections.tenant', config('database.connections.mysql'))
        );

        unset($config['read'], $config['write'], $config['url']);
        $config['database'] = (string)$tenant->database;

        foreach ([
            'db_host' => 'host',
            'db_port' => 'port',
            'db_user' => 'username',
            'db_pass' => 'password',
        ] as $field => $key) {
            if (isset($tenant->{$field}) && trim((string)$tenant->{$field}) !== '') {
                $config[$key] = $tenant->{$field};
            }
        }

        if (Config::get('database.connections.'.$name) !== $config) {
            DB::purge($name);
            Config::set('database.connections.'.$name, $config);
        }

        // This connection is intentionally isolated. Never change the default
        // connection, AdminLocation, AdminAuth, or tenant-scoped settings.
        return DB::connection($name);
    }

    public function managedLocalUser(int $userId): bool
    {
        try {
            return ManagedIdentity::isManaged($userId);
        } catch (\Throwable $error) {
            return false;
        }
    }

    public function site(int $tenantId): object
    {
        $site = $this->central()->table('pmd_group_sites')->where('tenant_id', $tenantId)->first();
        if (!$site) throw new \DomainException('Restaurant has no business account.');
        return $site;
    }

    public function group(int $groupId): object
    {
        $group = $this->central()->table('pmd_groups')->where('id', $groupId)->first();
        if (!$group) throw new \DomainException('Business account not found.');
        return $group;
    }

    public function access(int $ownerId, int $tenantId, bool $publish = false): object
    {
        if (!$this->enabled()) {
            throw new \DomainException('Restaurant groups are not enabled.');
        }

        $access = $this->central()->table('pmd_group_access')
            ->where('owner_id', $ownerId)
            ->where('tenant_id', $tenantId)
            ->whereNull('revoked_at')
            ->first();

        if (!$access || ($publish && !(bool)$access->can_publish)) {
            throw new \DomainException('Location access denied.');
        }

        $site = $this->site($tenantId);
        $group = $this->group((int)$site->group_id);
        $owner = $this->central()->table('pmd_group_owners')->where('id', $ownerId)->first();

        if (
            !$owner
            || $owner->status !== 'active'
            || $group->status !== 'active'
            || (int)$group->owner_id !== $ownerId
            || $site->state !== 'ready'
            || (int)$site->location_id < 1
        ) {
            throw new \DomainException('Location access denied.');
        }

        $this->tenant($tenantId, true);
        $db = $this->connection($tenantId, true);

        if (!$db->getSchemaBuilder()->hasTable('pmd_group_identity')) {
            throw new \DomainException('Restaurant owner link is missing.');
        }

        $binding = $db->table('pmd_group_identity')
            ->where('user_id', $access->user_id)
            ->value('owner_uuid');

        $user = $db->table('users')
            ->where('user_id', $access->user_id)
            ->where('super_user', 1)
            ->first();

        $staffOk = $user && $db->table('staffs')
            ->where('staff_id', (int)$user->staff_id)
            ->where('staff_status', 1)
            ->exists();

        $locationOk = $staffOk && $db->table('locationables')
            ->where('location_id', (int)$site->location_id)
            ->where('locationable_id', (int)$user->staff_id)
            ->whereIn('locationable_type', ['staffs', 'Admin\\Models\\Staffs_model'])
            ->exists();

        if (
            !$user
            || !$staffOk
            || !$locationOk
            || !is_string($binding)
            || !hash_equals((string)$owner->uuid, $binding)
        ) {
            throw new \DomainException('Owner access at this location was removed.');
        }

        return $access;
    }

    public function ownerForTenant(int $tenantId): ?object
    {
        if (!$this->installed()) return null;

        $access = $this->central()->table('pmd_group_access')
            ->where('tenant_id', $tenantId)
            ->whereNull('revoked_at')
            ->first();

        if (!$access) return null;

        return $this->central()->table('pmd_group_owners')
            ->where('id', $access->owner_id)
            ->first();
    }

    public function sitesForOwner(int $ownerId): array
    {
        if (!$this->enabled()) return [];

        return $this->central()->table('pmd_group_access as a')
            ->join('pmd_group_sites as s', 's.tenant_id', '=', 'a.tenant_id')
            ->join('pmd_groups as g', 'g.id', '=', 's.group_id')
            ->join('tenants as t', 't.id', '=', 's.tenant_id')
            ->where('a.owner_id', $ownerId)
            ->whereNull('a.revoked_at')
            ->where('g.status', 'active')
            ->where('s.state', 'ready')
            ->orderBy('s.label')
            ->get([
                's.tenant_id',
                's.location_id',
                's.label',
                's.group_id',
                'g.uuid as group_uuid',
                'g.name as group_name',
                'g.type as group_type',
                't.domain',
                'a.can_publish',
            ])
            ->map(static fn ($row) => (array)$row)
            ->all();
    }

    public function audit(
        string $actorType,
        int $actorId,
        string $action,
        ?int $groupId,
        array $details = []
    ): void {
        if (!$this->installed()) return;

        $this->central()->table('pmd_group_audit')->insert([
            'group_id' => $groupId,
            'actor_type' => $actorType,
            'actor_id' => $actorId,
            'action' => $action,
            'details' => Policy::canonical($details),
            'created_at' => now(),
        ]);
    }
}
