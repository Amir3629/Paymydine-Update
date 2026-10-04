<?php
namespace App\Services\RestaurantGroups;

use App\Services\Platform\CountryPlatformProfileRegistry;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

final class Provisioner
{
    public function __construct(private Store $store, private OwnerLinker $linker) {}

    public function create(array $input): array
    {
        if (!$this->store->enabled()) throw new \DomainException('Install and enable Restaurant Groups before creating an account.');
        $type = Policy::type((string)($input['organization_type'] ?? 'independent'));
        $sites = array_values((array)($input['sites'] ?? []));
        if (count($sites) > 20 || ($type === 'independent' && count($sites) !== 1)
            || ($type !== 'independent' && count($sites) < 2)) {
            throw new \InvalidArgumentException('Choose one location for an independent restaurant, or 2 to 20 for a group.');
        }
        $username = strtolower(trim((string)($input['owner_username'] ?? '')));
        $email = strtolower(trim((string)($input['owner_email'] ?? '')));
        $ownerName = trim((string)($input['owner_name'] ?? ''));
        $password = (string)($input['owner_password'] ?? '');
        $name = trim((string)($input['organization_name'] ?? ''));
        $phone = trim((string)($input['phone'] ?? ''));
        if (!preg_match('/^[a-z0-9][a-z0-9._-]{2,99}$/D', $username)
            || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 191
            || $ownerName === '' || strlen($ownerName) > 191
            || strlen($password) < 14 || strlen($password) > 128
            || $name === '' || strlen($name) > 191 || $phone === '' || strlen($phone) > 40) {
            throw new \InvalidArgumentException('Enter the business and Owner details, with a password of at least 14 characters.');
        }
        $start = (string)($input['start'] ?? '');
        $end = (string)($input['end'] ?? '');
        foreach ([$start, $end] as $date) {
            $parsed = \DateTimeImmutable::createFromFormat('!Y-m-d', $date);
            if (!$parsed || $parsed->format('Y-m-d') !== $date) throw new \InvalidArgumentException('Enter valid start and end dates.');
        }
        if ($end < $start) throw new \InvalidArgumentException('End date cannot be before start date.');
        $prepared = [];
        $slugs = [];
        $databases = [];
        $central = $this->store->central();
        foreach ($sites as $site) {
            $label = trim((string)($site['label'] ?? ''));
            $slug = Policy::slug((string)($site['slug'] ?? ''));
            $database = trim(str_replace([' ', '-'], '_', (string)($site['database'] ?? '')));
            if ($label === '' || strlen($label) > 191 || !preg_match('/^[A-Za-z0-9_]{1,64}$/D', $database)) {
                throw new \InvalidArgumentException('Each location needs a name, subdomain and valid database name.');
            }
            if (isset($slugs[$slug]) || isset($databases[strtolower($database)])) {
                throw new \InvalidArgumentException('Each location needs a different subdomain and database.');
            }
            $profile = app(CountryPlatformProfileRegistry::class)->profile((string)($site['country'] ?? $input['country'] ?? ''));
            if (!$profile) throw new \InvalidArgumentException('Choose a supported country for every location.');
            $domain = $slug.'.paymydine.com';
            if ($central->table('tenants')->where('domain', $domain)->exists()
                || $central->table('tenants')->where('database', $database)->exists()
                || $central->table('pmd_group_sites')->where('slug', $slug)->exists()
                || $central->table('pmd_group_sites')->where('database_name', $database)->exists()) {
                throw new \InvalidArgumentException('That location domain or database is already reserved.');
            }
            $slugs[$slug] = true;
            $databases[strtolower($database)] = true;
            $prepared[] = ['label' => $label, 'slug' => $slug, 'database_name' => $database, 'payload' => [
                'name' => $label, 'domain' => $domain, 'database' => $database, 'email' => $email, 'phone' => $phone,
                'start' => $start, 'end' => $end, 'type' => trim((string)($input['plan_type'] ?? 'People')) ?: 'People',
                'country' => (string)$profile['country_name'], 'country_code' => (string)$profile['country_code'],
                'description' => trim((string)($input['description'] ?? '')),
            ]];
        }
        PublicationLock::transactional($central, ['pmd_group_owners', 'pmd_groups', 'pmd_group_sites', 'pmd_group_audit']);
        [$ownerId, $groupId] = $central->transaction(function () use ($central, $username, $email, $ownerName, $password, $name, $type, $prepared) {
            if ($central->table('pmd_group_owners')->whereRaw('LOWER(username) = ?', [$username])->exists()) {
                throw new \DomainException('That shared Owner username is already in use.');
            }
            $ownerId = (int)$central->table('pmd_group_owners')->insertGetId([
                'uuid' => (string)Str::uuid(), 'username' => $username, 'email' => $email, 'name' => $ownerName,
                'password' => Hash::make($password), 'status' => 'active', 'auth_version' => 1,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $groupId = (int)$central->table('pmd_groups')->insertGetId([
                'uuid' => (string)Str::uuid(), 'name' => $name, 'type' => $type,
                'status' => 'provisioning', 'owner_id' => $ownerId, 'created_at' => now(), 'updated_at' => now(),
            ]);
            foreach ($prepared as $site) {
                $central->table('pmd_group_sites')->insert([
                    'group_id' => $groupId, 'tenant_id' => null, 'location_id' => null,
                    'label' => $site['label'], 'slug' => $site['slug'], 'database_name' => $site['database_name'],
                    'state' => 'pending', 'payload' => Policy::canonical($site['payload']),
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            $central->table('pmd_group_audit')->insert([
                'group_id' => $groupId, 'actor_type' => 'superadmin', 'actor_id' => (int)session()->get('superadmin_id', 0),
                'action' => 'group_reserved', 'details' => Policy::canonical(['owner_id' => $ownerId, 'type' => $type, 'locations' => count($prepared)]), 'created_at' => now(),
            ]);
            return [$ownerId, $groupId];
        });
        $results = [];
        foreach ($central->table('pmd_group_sites')->where('group_id', $groupId)->orderBy('id')->get() as $site) {
            try { $results[] = $this->provisionSite((int)$site->id); }
            catch (\Throwable $error) {
                logger()->error('PMD group location could not start', ['site_id' => (int)$site->id, 'exception' => get_class($error)]);
                $results[] = ['ok' => false, 'site_id' => (int)$site->id];
            }
        }
        $failed = count(array_filter($results, static fn ($row) => empty($row['ok'])));
        return ['ok' => $failed === 0, 'group_id' => $groupId, 'owner_id' => $ownerId, 'results' => $results,
            'message' => $failed ? 'Business account saved. '.$failed.' location(s) need provisioning review or Retry.' : 'Business account and all locations are ready.'];
    }

    public function provisionSite(int $siteId): array
    {
        return (new SiteProvisioner($this->store, $this->linker))->run($siteId);
    }
}
