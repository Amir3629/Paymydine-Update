<?php

namespace App\Services\RestaurantGroups;

use App\Services\Platform\CountryPlatformProfileRegistry;
use App\Services\Platform\SuperAdminTenantMarketService;
use App\Services\SuperAdminTenantDomainProvisioner;
use App\Services\SuperAdminTenantLifecycleService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

final class Provisioner
{
    public function __construct(
        private Store $store,
        private OwnerLinker $linker
    ) {
    }

    public function create(array $input): array
    {
        if (!$this->store->installed()) {
            throw new \RuntimeException(
                'Restaurant Groups schema is not installed. Run php artisan pmd:restaurant-groups install --backfill.'
            );
        }

        $type = Policy::type((string)($input['organization_type'] ?? 'independent'));
        $sites = array_values((array)($input['sites'] ?? []));

        if ($type === 'independent' && count($sites) !== 1) {
            throw new \InvalidArgumentException('Independent restaurants require exactly one location.');
        }

        if (in_array($type, ['multi_location', 'food_court'], true) && count($sites) < 2) {
            throw new \InvalidArgumentException('This business type requires at least two locations.');
        }

        if (count($sites) > 20) {
            throw new \InvalidArgumentException('Create at most 20 locations at once.');
        }

        $profile = app(CountryPlatformProfileRegistry::class)
            ->profile((string)($input['country'] ?? ''));

        if (!$profile) {
            throw new \InvalidArgumentException('Choose a supported PayMyDine country.');
        }

        $username = strtolower(trim((string)($input['owner_username'] ?? '')));
        $email = strtolower(trim((string)($input['owner_email'] ?? '')));
        $name = trim((string)($input['owner_name'] ?? ''));
        $password = (string)($input['owner_password'] ?? '');

        if (
            !preg_match('/^[a-z0-9][a-z0-9._-]{2,99}$/D', $username)
            || !filter_var($email, FILTER_VALIDATE_EMAIL)
            || $name === ''
            || strlen($name) > 191
            || strlen($password) < 14
            || strlen($password) > 128
        ) {
            throw new \InvalidArgumentException(
                'Enter a valid Owner name, email, username and a password of at least 14 characters.'
            );
        }

        $normalizedSites = [];
        $seenSlugs = [];
        $seenDatabases = [];

        foreach ($sites as $index => $site) {
            $label = trim((string)($site['label'] ?? ''));
            $slug = Policy::slug((string)($site['slug'] ?? ''));
            $database = trim(str_replace([' ', '-'], '_', (string)($site['database'] ?? '')));

            if ($label === '' || strlen($label) > 191) {
                throw new \InvalidArgumentException('Every location needs a name.');
            }

            if (!preg_match('/^[A-Za-z0-9_]{1,64}$/D', $database)) {
                throw new \InvalidArgumentException('Every location needs a valid database name.');
            }

            if (isset($seenSlugs[$slug]) || isset($seenDatabases[strtolower($database)])) {
                throw new \InvalidArgumentException('Location subdomains and database names must be unique.');
            }

            $domain = $slug.'.paymydine.com';

            if (
                $this->store->central()->table('tenants')->where('domain', $domain)->exists()
                || $this->store->central()->table('tenants')->where('database', $database)->exists()
                || $this->store->central()->table('pmd_group_sites')->where('slug', $slug)->exists()
                || $this->store->central()->table('pmd_group_sites')->where('database_name', $database)->exists()
            ) {
                throw new \InvalidArgumentException($label.' already uses an existing domain or database.');
            }

            $seenSlugs[$slug] = true;
            $seenDatabases[strtolower($database)] = true;

            $normalizedSites[] = [
                'position' => $index + 1,
                'label' => $label,
                'slug' => $slug,
                'domain' => $domain,
                'database' => $database,
            ];
        }

        if ($this->store->central()->table('pmd_group_owners')
            ->whereRaw('LOWER(username) = ?', [$username])->exists()) {
            throw new \InvalidArgumentException('That Owner username is already in use.');
        }

        $groupName = trim((string)($input['organization_name'] ?? ''));
        if ($groupName === '' || strlen($groupName) > 191) {
            throw new \InvalidArgumentException('Enter a business account name.');
        }

        $ownerUuid = (string)Str::uuid();
        $groupUuid = (string)Str::uuid();
        $now = now();

        [$ownerId, $groupId] = $this->store->central()->transaction(
            function () use (
                $ownerUuid,
                $groupUuid,
                $username,
                $email,
                $name,
                $password,
                $groupName,
                $type,
                $normalizedSites,
                $profile,
                $input,
                $now
            ) {
                $ownerId = $this->store->central()->table('pmd_group_owners')->insertGetId([
                    'uuid' => $ownerUuid,
                    'username' => $username,
                    'email' => $email,
                    'name' => $name,
                    'password' => Hash::make($password),
                    'status' => 'active',
                    'auth_version' => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $groupId = $this->store->central()->table('pmd_groups')->insertGetId([
                    'uuid' => $groupUuid,
                    'name' => $groupName,
                    'type' => $type,
                    'status' => 'provisioning',
                    'owner_id' => $ownerId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                foreach ($normalizedSites as $site) {
                    $payload = [
                        'name' => $site['label'],
                        'domain' => $site['domain'],
                        'database' => $site['database'],
                        'email' => $email,
                        'phone' => trim((string)($input['phone'] ?? '')),
                        'start' => (string)($input['start'] ?? now()->toDateString()),
                        'end' => (string)($input['end'] ?? now()->addYear()->toDateString()),
                        'type' => trim((string)($input['plan_type'] ?? 'People')) ?: 'People',
                        'country' => (string)$profile['country_name'],
                        'country_code' => (string)$profile['country_code'],
                        'description' => trim((string)($input['description'] ?? '')),
                    ];

                    $this->store->central()->table('pmd_group_sites')->insert([
                        'group_id' => $groupId,
                        'tenant_id' => null,
                        'location_id' => null,
                        'label' => $site['label'],
                        'slug' => $site['slug'],
                        'database_name' => $site['database'],
                        'state' => 'pending',
                        'payload' => Policy::canonical($payload),
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }

                return [$ownerId, $groupId];
            }
        );

        $results = [];
        foreach ($this->store->central()->table('pmd_group_sites')
            ->where('group_id', $groupId)->orderBy('id')->get() as $site) {
            $results[] = $this->provisionSite((int)$site->id);
        }

        $failed = array_values(array_filter($results, static fn ($row) => empty($row['ok'])));
        $this->store->central()->table('pmd_groups')->where('id', $groupId)->update([
            'status' => $failed ? 'provisioning' : 'active',
            'updated_at' => now(),
        ]);

        $this->store->audit(
            'superadmin',
            (int)session()->get('superadmin_id', 0),
            'group_created',
            $groupId,
            [
                'owner_id' => $ownerId,
                'type' => $type,
                'locations' => count($results),
                'failed' => count($failed),
            ]
        );

        return [
            'ok' => !$failed,
            'group_id' => $groupId,
            'owner_id' => $ownerId,
            'results' => $results,
            'message' => $failed
                ? 'Business account created. '.count($failed).' location(s) still need Retry provisioning.'
                : 'Business account and all locations are ready.',
        ];
    }

    public function provisionSite(int $siteId): array
    {
        $site = $this->store->central()->table('pmd_group_sites')->where('id', $siteId)->first();
        if (!$site) throw new \DomainException('Business location not found.');

        $group = $this->store->group((int)$site->group_id);
        if (!$group->owner_id) throw new \DomainException('Business Owner is missing.');

        $payload = json_decode((string)$site->payload, true);
        if (!is_array($payload)) throw new \RuntimeException('Location provisioning data is invalid.');

        $tenantIdForFailure = (int)($site->tenant_id ?? 0);

        try {
            $tenant = $tenantIdForFailure > 0
                ? $this->store->central()->table('tenants')->where('id', $tenantIdForFailure)->first()
                : null;

            if (!$tenant) {
                $result = app(SuperAdminTenantLifecycleService::class)->create($payload);

                $tenant = $this->store->central()->table('tenants')
                    ->where('domain', $payload['domain'])
                    ->where('database', $payload['database'])
                    ->first();

                if (!$tenant) {
                    throw new \RuntimeException((string)($result['message'] ?? 'Tenant creation failed.'));
                }

                $tenantIdForFailure = (int)$tenant->id;

                // Persist the tenant link immediately. If TLS/domain provisioning
                // failed inside the lifecycle service, Retry must continue this
                // exact database instead of attempting to create it again.
                $this->store->central()->table('pmd_group_sites')->where('id', $site->id)->update([
                    'tenant_id' => $tenantIdForFailure,
                    'state' => empty($result['ok']) ? 'failed' : 'provisioning',
                    'last_error' => empty($result['ok'])
                        ? substr((string)($result['message'] ?? 'Provisioning failed.'), 0, 500)
                        : null,
                    'updated_at' => now(),
                ]);

                $this->store->central()->table('tenants')->where('id', $tenantIdForFailure)->update([
                    'name' => (string)$site->label,
                    'status' => 'disabled',
                    'updated_at' => now(),
                ]);

                if (empty($result['ok'])) {
                    throw new \RuntimeException(
                        (string)($result['message'] ?? 'Domain/TLS provisioning failed.')
                    );
                }
            } else {
                // Retry path: database already exists; only the privileged
                // domain/TLS authority is allowed to finish provisioning.
                $provision = app(SuperAdminTenantDomainProvisioner::class)
                    ->provision((string)$tenant->domain);

                if (empty($provision['ok'])) {
                    throw new \RuntimeException((string)$provision['message']);
                }

                $this->store->central()->table('tenants')->where('id', $tenant->id)->update([
                    'name' => (string)$site->label,
                    'status' => 'disabled',
                    'updated_at' => now(),
                ]);
            }

            $tenant = $this->store->central()->table('tenants')->where('id', $tenantIdForFailure)->first();
            if (!$tenant) throw new \RuntimeException('Tenant registry row disappeared during provisioning.');

            try {
                app(SuperAdminTenantMarketService::class)->applyToTenant(
                    $tenant,
                    (string)($payload['country_code'] ?? '')
                );
            } catch (\Throwable $marketError) {
                logger()->warning('PMD group location market profile warning', [
                    'tenant_id' => (int)$tenant->id,
                    'error' => $marketError->getMessage(),
                ]);
            }

            $linked = $this->linker->link(
                (int)$group->owner_id,
                (int)$tenant->id,
                (string)$site->label
            );

            $this->store->central()->transaction(function () use ($site, $tenant, $linked) {
                $this->store->central()->table('pmd_group_sites')->where('id', $site->id)->update([
                    'tenant_id' => (int)$tenant->id,
                    'location_id' => (int)$linked['location_id'],
                    'state' => 'ready',
                    'last_error' => null,
                    'updated_at' => now(),
                ]);

                // Activation is the final step, after TLS, market profile and the
                // central Owner mapping all succeeded.
                $this->store->central()->table('tenants')->where('id', $tenant->id)->update([
                    'status' => 'active',
                    'updated_at' => now(),
                ]);
            });

            return [
                'ok' => true,
                'site_id' => (int)$site->id,
                'tenant_id' => (int)$tenant->id,
                'domain' => (string)$tenant->domain,
            ];
        } catch (\Throwable $error) {
            $this->store->central()->table('pmd_group_sites')->where('id', $site->id)->update([
                'tenant_id' => $tenantIdForFailure > 0 ? $tenantIdForFailure : null,
                'state' => 'failed',
                'last_error' => substr($error->getMessage(), 0, 500),
                'updated_at' => now(),
            ]);

            if ($tenantIdForFailure > 0) {
                $this->store->central()->table('tenants')->where('id', $tenantIdForFailure)->update([
                    'status' => 'disabled',
                    'updated_at' => now(),
                ]);
            }

            logger()->error('PMD group location provisioning failed', [
                'site_id' => (int)$site->id,
                'group_id' => (int)$site->group_id,
                'tenant_id' => $tenantIdForFailure ?: null,
                'error' => $error->getMessage(),
            ]);

            return [
                'ok' => false,
                'site_id' => (int)$site->id,
                'tenant_id' => $tenantIdForFailure ?: null,
                'message' => $error->getMessage(),
            ];
        }
    }
}
