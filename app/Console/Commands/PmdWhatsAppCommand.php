<?php

namespace App\Console\Commands;

use App\Services\RestaurantGroups\Store;
use App\Services\WhatsApp\PmdWhatsAppGateway;
use App\Services\WhatsApp\PmdWhatsAppSchema;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Throwable;

/**
 * Privileged, explicit central provisioning. No tenant is auto-enrolled.
 * Example: php artisan pmd:whatsapp bind --tenant-id=7 --location-id=1
 *          --phone-number-id=1234567890123 --waba-id=1234567890 --confirm
 */
final class PmdWhatsAppCommand extends Command
{
    protected $signature = 'pmd:whatsapp
        {action=health : health|requests|install|bind|activate|deactivate|purge}
        {--tenant-id=}
        {--location-id=}
        {--phone-number-id=}
        {--waba-id=}
        {--days=90}
        {--confirm : Required for changes to registration or removal of data}';

    protected $description = 'Install, inspect and explicitly link PayMyDine WhatsApp Meta channels.';

    public function handle(PmdWhatsAppSchema $schema, PmdWhatsAppGateway $gateway, Store $store): int
    {
        $action = strtolower(trim((string)$this->argument('action')));
        if ($action === 'health') {
            if (!$schema->installed()) {
                $this->warn('WhatsApp schema is NOT installed. No changes made.');
                return 1;
            }
            $central = DB::connection('mysql');
            $this->line('WhatsApp central schema OK.');
            $this->line('Registered numbers: '.$central->table('pmd_whatsapp_channels')->count());
            $this->line('Active numbers: '.$central->table('pmd_whatsapp_channels')
                ->where('enabled', 1)->count());
            $this->line('Stored events: '.$central->table('pmd_whatsapp_messages')->count());
            $this->line('HTTP ingestion enabled: '.(config('pmd_whatsapp.enabled', false) ? 'yes' : 'no'));
            $this->line('Central managed sending: '.(app(\App\Services\WhatsApp\PmdManagedWhatsAppService::class)->credentialsReady() ? 'configured' : 'disabled / incomplete'));
            $this->line('Connection request registry: '.($central->getSchemaBuilder()->hasTable('pmd_whatsapp_connection_requests') ? 'ready' : 'missing (run install --confirm after DB backup)'));
            return 0;
        }

        if ($action === 'requests') {
            if (!$schema->installed() || !DB::connection('mysql')
                ->getSchemaBuilder()->hasTable('pmd_whatsapp_connection_requests')) {
                $this->warn('WhatsApp onboarding registry is not installed.');
                return 1;
            }
            $rows = DB::connection('mysql')->table('pmd_whatsapp_connection_requests')
                ->orderBy('updated_at', 'desc')->limit(40)
                ->get(['tenant_id', 'location_id', 'status', 'updated_at']);
            $this->table(['Tenant', 'Location', 'Status', 'Updated'],
                $rows->map(static fn ($row) => [
                    (int)$row->tenant_id, (int)$row->location_id,
                    (string)$row->status, (string)$row->updated_at,
                ])->all());
            return 0;
        }

        if (!$this->option('confirm')) {
            $this->error('STOP: Explicit --confirm required for changes.');
            return 2;
        }

        try {
            if ($action === 'install') {
                $schema->install();
                $this->info('Central WhatsApp storage installed. All channels remain inactive.');
                return 0;
            }

            if (!$schema->installed()) {
                $this->error('Install central schema first: php artisan pmd:whatsapp install --confirm');
                return 1;
            }

            if ($action === 'purge') {
                $days = (int)$this->option('days');
                $count = $gateway->purgeOlderThan($days);
                $this->info('Deleted expired WhatsApp messages: '.$count);
                return 0;
            }

            if (!in_array($action, ['bind', 'activate', 'deactivate'], true)) {
                $this->error('Use health, install, bind, activate, deactivate or purge.');
                return 2;
            }

            $tenantId = (int)$this->option('tenant-id');
            $locationId = (int)$this->option('location-id');
            $phoneId = trim((string)$this->option('phone-number-id'));
            $wabaId = trim((string)$this->option('waba-id'));
            if ($tenantId < 1 || $locationId < 1
                || !preg_match('/^[0-9]{5,32}$/D', $phoneId)) {
                $this->error('Tenant ID, location ID and numeric Meta phone number ID are required.');
                return 2;
            }

            // Validates central tenant status and uses a separate tenant-specific
            // connection; never changes the default connection or AdminAuth.
            $tenantDb = $store->connection($tenantId, true);
            $exists = $tenantDb->table('locations')
                ->where('location_id', $locationId)
                ->where('location_status', 1)
                ->exists();
            if (!$exists) {
                throw new RuntimeException('The selected tenant location is not active.');
            }

            $central = DB::connection('mysql');
            $row = $central->table('pmd_whatsapp_channels')
                ->where('phone_number_id', $phoneId)->first();

            if ($row && ((int)$row->tenant_id !== $tenantId
                    || (int)$row->location_id !== $locationId)) {
                throw new RuntimeException('Phone number is already assigned to another location.');
            }

            if ($action === 'bind') {
                if (!preg_match('/^[0-9]{5,32}$/D', $wabaId)) {
                    throw new RuntimeException('Numeric Meta WABA ID is required.');
                }
                if ($row) {
                    $central->table('pmd_whatsapp_channels')
                        ->where('id', $row->id)
                        ->update([
                            'waba_id' => $wabaId,
                            'enabled' => 0,
                            'updated_at' => now(),
                        ]);
                } else {
                    $central->table('pmd_whatsapp_channels')->insert([
                        'tenant_id' => $tenantId,
                        'location_id' => $locationId,
                        'phone_number_id' => $phoneId,
                        'waba_id' => $wabaId,
                        'enabled' => 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
                $this->info('Number registered but INACTIVE. Use activate after end-to-end tests.');
                return 0;
            }

            if (!$row) {
                throw new RuntimeException('Bind the number to this location first.');
            }

            $central->table('pmd_whatsapp_channels')->where('id', $row->id)->update([
                'enabled' => $action === 'activate' ? 1 : 0,
                'updated_at' => now(),
            ]);
            $this->info('Number '.$action.'d.');
            return 0;
        } catch (Throwable $error) {
            // Console diagnostic is intentionally generic; no tenant database
            // passwords, message bodies or access tokens should be printed.
            $this->error('WhatsApp operation rejected: '.$error->getMessage());
            return 1;
        }
    }
}
