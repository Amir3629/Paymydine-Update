<?php

namespace App\Console\Commands;

use App\Services\RestaurantGroups\Schema;
use App\Services\RestaurantGroups\Store;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

final class RestaurantGroupsCommand extends Command
{
    protected $signature = 'pmd:restaurant-groups
        {action=install : install|health}
        {--backfill : Register existing tenants as independent business accounts}';

    protected $description = 'Install and verify PayMyDine restaurant-group control-plane storage.';

    public function handle(Store $store, Schema $schema): int
    {
        $action = strtolower((string)$this->argument('action'));

        if ($action === 'health') {
            return $this->health($store);
        }

        if ($action !== 'install') {
            $this->error('Use install or health.');
            return 2;
        }

        $schema->installCentral($store);
        $this->info('Central Restaurant Groups schema: ready.');

        if ($this->option('backfill')) {
            $this->backfill($store, $schema);
        }

        return $this->health($store);
    }

    private function backfill(Store $store, Schema $schema): void
    {
        $tenants = $store->central()->table('tenants')->orderBy('id')->get();
        $created = 0;

        foreach ($tenants as $tenant) {
            if ($store->central()->table('pmd_group_sites')->where('tenant_id', $tenant->id)->exists()) {
                continue;
            }

            $groupId = $store->central()->table('pmd_groups')->insertGetId([
                'uuid' => (string)Str::uuid(),
                'name' => trim((string)$tenant->name) ?: (string)$tenant->domain,
                'type' => 'independent',
                'status' => 'active',
                'owner_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $locationId = null;
            $state = 'ready';
            $lastError = null;

            try {
                $db = $store->connection((int)$tenant->id, false);
                $schema->installTenant($db);
                $locationId = (int)$db->table('locations')
                    ->where('location_status', 1)
                    ->orderBy('location_id')
                    ->value('location_id');

                if ($locationId < 1) {
                    $state = 'unavailable';
                    $lastError = 'No active tenant location.';
                    $locationId = null;
                }
            } catch (\Throwable $error) {
                $state = 'unavailable';
                $lastError = substr($error->getMessage(), 0, 500);
            }

            $slug = strtolower((string)$tenant->domain);
            $slug = preg_replace('/\.paymydine\.com$/', '', $slug) ?: 'tenant-'.$tenant->id;

            $store->central()->table('pmd_group_sites')->insert([
                'group_id' => $groupId,
                'tenant_id' => (int)$tenant->id,
                'location_id' => $locationId,
                'label' => trim((string)$tenant->name) ?: (string)$tenant->domain,
                'slug' => $slug,
                'database_name' => (string)$tenant->database,
                'state' => $state,
                'payload' => null,
                'last_error' => $lastError,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $created++;
        }

        $this->info('Existing tenants registered: '.$created.'.');
    }

    private function health(Store $store): int
    {
        if (!$store->installed()) {
            $this->error('Restaurant Groups schema is not installed.');
            return 1;
        }

        $central = $store->central();
        $tables = [
            'pmd_group_owners',
            'pmd_groups',
            'pmd_group_sites',
            'pmd_group_access',
            'pmd_group_operations',
            'pmd_group_operation_targets',
            'pmd_group_audit',
            'pmd_group_displays',
        ];

        foreach ($tables as $table) {
            if (!$central->getSchemaBuilder()->hasTable($table)) {
                $this->error('Missing central table: '.$table);
                return 1;
            }
        }

        $this->info('Restaurant Groups health: OK');
        $this->line('Groups: '.$central->table('pmd_groups')->count());
        $this->line('Sites: '.$central->table('pmd_group_sites')->count());
        $this->line('Shared owners: '.$central->table('pmd_group_owners')->count());

        return 0;
    }
}
