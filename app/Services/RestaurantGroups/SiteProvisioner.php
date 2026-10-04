<?php
namespace App\Services\RestaurantGroups;

use App\Services\SuperAdminTenantLifecycleService;
use App\Services\SuperAdminTenantDomainProvisioner;
use App\Services\Platform\SuperAdminTenantMarketService;

/** Resumable creation only: it never adopts or deletes an existing database. */
final class SiteProvisioner
{
    public function __construct(private Store $store, private OwnerLinker $linker) {}

    public function run(int $siteId): array
    {
        if (!$this->store->enabled()) throw new \DomainException('Restaurant groups are not enabled.');
        $central = $this->store->central();
        PublicationLock::transactional($central, ['tenants', 'pmd_group_sites', 'pmd_groups', 'pmd_group_owners', 'pmd_group_access', 'pmd_group_audit']);
        // This stable central connection is NOT the mysql connection which the
        // legacy creator temporarily repoints while cloning the template.
        return PublicationLock::run($central, 'provision-site:'.$siteId, function () use ($siteId, $central) {
            [$site, $group, $owner] = $this->state($central, $siteId);
            if ($site->state === 'ready') {
                $tenant = $this->store->tenant((int)$site->tenant_id, false);
                ProvisioningRules::tenant($site, $tenant, true);
                // A Retry POST must not re-enable a suspended restaurant, reset
                // its local password, reapply a country profile or rerun TLS.
                return ['ok' => true, 'site_id' => $siteId, 'tenant_id' => (int)$tenant->id, 'state' => 'already_ready'];
            }
            $data = ProvisioningRules::input($site);
            if (!isset($data['_provisioning_r4'])) {
                if ($site->tenant_id) throw new \DomainException('Legacy incomplete location requires review; automatic adoption is disabled.');
                $data['_provisioning_r4'] = [
                    'version' => 1, 'token' => bin2hex(random_bytes(16)), 'phase' => 'reserved',
                    'group_id' => (int)$group->id, 'owner_id' => (int)$owner->id,
                    'owner_uuid' => (string)$owner->uuid, 'tenant_id' => 0,
                ];
                $central->transaction(function () use ($central, $siteId, $data) {
                    $this->state($central, $siteId, true);
                    $central->table('pmd_group_sites')->where('id', $siteId)->update([
                        'payload' => Policy::canonical($data), 'state' => 'pending', 'last_error' => null, 'updated_at' => now(),
                    ]);
                });
            }
            [$site, $group, $owner] = $this->state($central, $siteId);
            $mark = ProvisioningRules::checkpoint($site, $group, $owner);
            $token = $mark['token'];
            try {
                if ($mark['phase'] === 'reserved') {
                    $request = ProvisioningRules::input($site);
                    unset($request['_provisioning_r4']);
                    $result = app(SuperAdminTenantLifecycleService::class)->createDeferred(
                        $request,
                        function (string $phase, int $tenantId, $db) use ($siteId, $token, $central) {
                            if ($db->getDatabaseName() !== $central->getDatabaseName()) {
                                throw new \DomainException('Provisioning checkpoint is not on the central database.');
                            }
                            $this->checkpoint($db, $siteId, $token, $phase, $tenantId);
                        }
                    );
                    if (empty($result['ok'])) throw new \RuntimeException('Tenant database creation did not complete.');
                    [$site, $group, $owner] = $this->state($central, $siteId);
                    $mark = ProvisioningRules::checkpoint($site, $group, $owner);
                }
                // A crash before the prepared checkpoint leaves an ambiguous
                // schema. Never reclone over it or assume it is complete.
                if ($mark['phase'] === 'registered') {
                    throw new \DomainException('Database preparation was interrupted. Review the disabled tenant; do not recreate or adopt it automatically.');
                }
                $tenant = $this->store->tenant((int)$site->tenant_id, false);
                ProvisioningRules::tenant($site, $tenant);
                if ($mark['phase'] === 'prepared') {
                    $result = app(SuperAdminTenantDomainProvisioner::class)->provision((string)$tenant->domain);
                    if (empty($result['ok'])) throw new \DomainException('Domain or TLS setup failed. The location remains disabled; retry after correcting the domain setup.');
                    $this->checkpoint($central, $siteId, $token, 'domain_ready', (int)$tenant->id);
                    $mark['phase'] = 'domain_ready';
                }
                if ($mark['phase'] === 'domain_ready') {
                    $payload = ProvisioningRules::input($site);
                    $result = app(SuperAdminTenantMarketService::class)->applyToTenant($tenant, (string)$payload['country_code']);
                    if ((isset($result['database']) && $result['database'] !== $tenant->database)
                        || (isset($result['ok']) && !$result['ok']) || !empty($result['warnings'])) {
                        throw new \DomainException('Regional setup needs attention. The location remains disabled; resolve its readiness warnings before retrying.');
                    }
                    $this->checkpoint($central, $siteId, $token, 'profile_ready', (int)$tenant->id);
                    $mark['phase'] = 'profile_ready';
                }
                if ($mark['phase'] !== 'profile_ready') throw new \DomainException('Location is not ready for Owner linking.');
                // link() commits only tenant-local state. It does not publish
                // a central access row until that local transaction commits.
                $linked = $this->linker->link((int)$owner->id, (int)$tenant->id, (string)$site->label);
                $central->transaction(function () use ($central, $siteId, $token, $linked) {
                    [$current, $group, $owner] = $this->state($central, $siteId, true);
                    $mark = ProvisioningRules::checkpoint($current, $group, $owner);
                    if (!hash_equals($token, $mark['token']) || $mark['phase'] !== 'profile_ready') {
                        throw new \DomainException('Location provisioning changed before activation.');
                    }
                    $tenant = $central->table('tenants')->where('id', $current->tenant_id)->lockForUpdate()->first();
                    if (!$tenant) throw new \DomainException('Reserved tenant is missing.');
                    ProvisioningRules::tenant($current, $tenant);
                    $this->linker->verify((int)$owner->id, (int)$tenant->id, $linked);
                    if ($central->table('pmd_group_access')->where('tenant_id', $tenant->id)->exists()) {
                        throw new \DomainException('This tenant already has an access mapping; review it before activation.');
                    }
                    $central->table('pmd_group_access')->insert([
                        'owner_id' => (int)$owner->id, 'tenant_id' => (int)$tenant->id,
                        'user_id' => (int)$linked['user_id'], 'can_publish' => 1, 'revoked_at' => null,
                        'created_at' => now(), 'updated_at' => now(),
                    ]);
                    $payload = ProvisioningRules::input($current);
                    ProvisioningRules::transition($mark['phase'], 'ready');
                    $payload['_provisioning_r4']['phase'] = 'ready';
                    $central->table('pmd_group_sites')->where('id', $siteId)->update([
                        'location_id' => (int)$linked['location_id'], 'state' => 'ready',
                        'payload' => Policy::canonical($payload), 'last_error' => null, 'updated_at' => now(),
                    ]);
                    $central->table('tenants')->where('id', $tenant->id)->update([
                        'name' => (string)$current->label, 'status' => 'active', 'updated_at' => now(),
                    ]);
                    // Completed locations work even when another location is
                    // awaiting Retry. Failed sites still have no access mapping.
                    if ($group->status === 'provisioning') {
                        $central->table('pmd_groups')->where('id', $group->id)->update(['status' => 'active', 'updated_at' => now()]);
                    }
                    $central->table('pmd_group_audit')->insert([
                        'group_id' => (int)$group->id, 'actor_type' => 'superadmin',
                        'actor_id' => (int)session()->get('superadmin_id', 0), 'action' => 'group_site_activated',
                        'details' => Policy::canonical(['site_id' => $siteId, 'tenant_id' => (int)$tenant->id]), 'created_at' => now(),
                    ]);
                });
                return ['ok' => true, 'site_id' => $siteId, 'tenant_id' => (int)$tenant->id, 'domain' => (string)$tenant->domain];
            } catch (\Throwable $error) {
                $reference = 'rg-'.bin2hex(random_bytes(6));
                logger()->error('PMD group location provisioning stopped', [
                    'reference' => $reference, 'site_id' => $siteId, 'exception' => get_class($error), 'message' => $error->getMessage(),
                ]);
                // Keep the last completed phase; never disable an already-ready
                // tenant and never delete a database to make a retry pass.
                $central->table('pmd_group_sites')->where('id', $siteId)->where('state', '!=', 'ready')->update([
                    'state' => 'failed', 'last_error' => 'Provisioning stopped. Check server log reference '.$reference.'.', 'updated_at' => now(),
                ]);
                return ['ok' => false, 'site_id' => $siteId, 'reference' => $reference,
                    'message' => 'Location remains disabled. Check server log reference '.$reference.'.'];
            }
        });
    }

    private function state($db, int $siteId, bool $lock = false): array
    {
        $site = $db->table('pmd_group_sites')->where('id', $siteId)->first();
        if (!$site) throw new \DomainException('Business location not found.');
        // Same lock ordering as activation: group, owner, then site.
        $groups = $db->table('pmd_groups')->where('id', $site->group_id);
        if ($lock) $groups->lockForUpdate();
        $group = $groups->first();
        if (!$group) throw new \DomainException('Business account not found.');
        $owners = $db->table('pmd_group_owners')->where('id', $group->owner_id);
        if ($lock) $owners->lockForUpdate();
        $owner = $owners->first();
        if (!$owner) throw new \DomainException('Business Owner not found.');
        if ($lock) $site = $db->table('pmd_group_sites')->where('id', $siteId)->lockForUpdate()->first();
        if (!$site || (int)$site->group_id !== (int)$group->id) throw new \DomainException('Location was moved to another account.');
        ProvisioningRules::owner($group, $owner);
        return [$site, $group, $owner];
    }

    private function checkpoint($db, int $siteId, string $token, string $phase, int $tenantId): void
    {
        $db->transaction(function () use ($db, $siteId, $token, $phase, $tenantId) {
            [$site, $group, $owner] = $this->state($db, $siteId, true);
            $mark = ProvisioningRules::checkpoint($site, $group, $owner);
            if (!hash_equals($token, $mark['token'])) throw new \DomainException('Provisioning attempt no longer owns this location.');
            ProvisioningRules::transition($mark['phase'], $phase);
            if ($phase !== 'registered' && (int)$site->tenant_id !== $tenantId) throw new \DomainException('Provisioning tenant changed.');
            $bound = clone $site;
            $bound->tenant_id = $tenantId;
            $tenant = $db->table('tenants')->where('id', $tenantId)->lockForUpdate()->first();
            if (!$tenant) throw new \DomainException('Reserved tenant was not created.');
            ProvisioningRules::tenant($bound, $tenant);
            $payload = ProvisioningRules::input($site);
            $payload['_provisioning_r4']['phase'] = $phase;
            $payload['_provisioning_r4']['tenant_id'] = $tenantId;
            $db->table('pmd_group_sites')->where('id', $siteId)->update([
                'tenant_id' => $tenantId, 'payload' => Policy::canonical($payload),
                'state' => 'provisioning', 'last_error' => null, 'updated_at' => now(),
            ]);
        });
    }
}
