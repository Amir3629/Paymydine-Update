<?php

namespace App\Console\Commands;

use App\Services\RestaurantGroups\Store;
use App\Services\WhatsApp\PmdWhatsAppGateway;
use App\Services\WhatsApp\PmdWhatsAppSchema;
use App\Services\WhatsApp\PmdSharedWhatsAppService;
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
        {action=health : health|requests|install|bind|activate|deactivate|purge|shared-health|shared-register|shared-activate-number|shared-deactivate-number|shared-bind-location|shared-activate-location|shared-deactivate-location}
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
            $shared = app(PmdSharedWhatsAppService::class);
            $this->line('Shared-number schema: '.($shared->installed() ? 'ready' : 'missing (install after central DB backup)'));
            if ($shared->installed()) {
                $this->line('Shared senders: '.$central->table('pmd_wa_shared_senders')->count());
                $this->line('Shared active senders: '.$central->table('pmd_wa_shared_senders')->where('enabled', 1)->count());
                $this->line('Shared active restaurant grants: '.$central->table('pmd_wa_shared_locations')->where('enabled', 1)->count());
                $this->line('Unrouted shared messages: '.$central->table('pmd_wa_shared_unrouted')->count());
            }
            return 0;
        }

        if ($action === 'shared-health') {
            $this->call('pmd:whatsapp', ['action' => 'health']);
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

            if (str_starts_with($action, 'shared-')) {
                return $this->runSharedOperatorAction(
                    $action, app(PmdSharedWhatsAppService::class), $store
                );
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
                // A Meta number cannot be both a shared and dedicated sender.
                if (app(PmdSharedWhatsAppService::class)->installed()
                    && $central->table('pmd_wa_shared_senders')
                        ->where('phone_number_id', $phoneId)->exists()) {
                    throw new RuntimeException('This phone belongs to PayMyDine shared sender.');
                }
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
    /**
     * R33: only the platform operator may register PayMyDine's OWN number and
     * explicitly permit tenant/location use. Never accepts sender routing
     * from an Admin form, customer POST or webhook payload.
     */
    private function runSharedOperatorAction(
        string $action,
        PmdSharedWhatsAppService $shared,
        Store $store
    ): int {
        if (!$shared->installed()) {
            throw new RuntimeException('Shared schema missing. Back up central DB, then run install.');
        }

        $central = DB::connection('mysql');
        $phoneId = trim((string)$this->option('phone-number-id'));
        if (!preg_match('/^[0-9]{5,32}$/D', $phoneId)) {
            throw new RuntimeException('Numeric PayMyDine-owned Meta phone number ID required.');
        }
        $sender = $central->table('pmd_wa_shared_senders')
            ->where('phone_number_id', $phoneId)->first();

        if ($action === 'shared-register') {
            $wabaId = trim((string)$this->option('waba-id'));
            if (!preg_match('/^[0-9]{5,32}$/D', $wabaId)) {
                throw new RuntimeException('Numeric PayMyDine-owned Meta WABA ID required.');
            }
            if ($central->table('pmd_whatsapp_channels')
                ->where('phone_number_id', $phoneId)->exists()) {
                throw new RuntimeException('Sender already belongs to a dedicated restaurant mapping.');
            }
            if ($sender && (int)$sender->enabled === 1
                && $sender->waba_id !== $wabaId) {
                throw new RuntimeException('Deactivate sender before changing its Meta WABA.');
            }
            if ($sender) {
                $central->table('pmd_wa_shared_senders')->where('id', $sender->id)
                    ->update(['waba_id' => $wabaId, 'updated_at' => now()]);
            } else {
                $central->table('pmd_wa_shared_senders')->insert([
                    'phone_number_id' => $phoneId,
                    'waba_id' => $wabaId,
                    'enabled' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $this->info('PayMyDine shared sender registered; remains INACTIVE.');
            return 0;
        }

        if (!$sender) {
            throw new RuntimeException('Register PayMyDine-owned sender first.');
        }

        if (in_array($action, ['shared-activate-number', 'shared-deactivate-number'], true)) {
            if ($action === 'shared-activate-number') {
                if (!$shared->globalReady()) {
                    throw new RuntimeException('Central Meta webhook and shared sending are not ready.');
                }
                if ($central->table('pmd_whatsapp_channels')
                    ->where('phone_number_id', $phoneId)->exists()) {
                    throw new RuntimeException('Number already mapped to a dedicated restaurant.');
                }
                if ($central->table('pmd_wa_shared_senders')
                    ->where('id', '<>', $sender->id)->where('enabled', 1)->exists()) {
                    throw new RuntimeException('Only one shared PayMyDine sender may be active.');
                }
            }
            $central->table('pmd_wa_shared_senders')->where('id', $sender->id)
                ->update([
                    'enabled' => $action === 'shared-activate-number' ? 1 : 0,
                    'updated_at' => now(),
                ]);
            $this->info('Shared number status updated.');
            return 0;
        }

        if (!in_array($action, [
            'shared-bind-location',
            'shared-activate-location',
            'shared-deactivate-location',
        ], true)) {
            throw new RuntimeException('Unsupported shared-number operation.');
        }

        $tenantId = (int)$this->option('tenant-id');
        $locationId = (int)$this->option('location-id');
        if ($tenantId < 1 || $locationId < 1) {
            throw new RuntimeException('Tenant and location IDs are mandatory.');
        }
        // Store checks active central subscription; tenant specific DB is
        // consulted without changing the request's default connection.
        $tenantDb = $store->connection($tenantId, true);
        if (!$tenantDb->table('locations')
            ->where('location_id', $locationId)
            ->where('location_status', 1)->exists()) {
            throw new RuntimeException('Active tenant location not found.');
        }

        $scope = [
            'sender_id' => (int)$sender->id,
            'tenant_id' => $tenantId,
            'location_id' => $locationId,
        ];
        $record = $central->table('pmd_wa_shared_locations')
            ->where($scope)->first();

        if ($action === 'shared-bind-location') {
            $central->table('pmd_wa_shared_locations')->updateOrInsert(
                $scope,
                [
                    'enabled' => 0, 'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
            $this->info('Restaurant authorized in registry but INACTIVE.');
            return 0;
        }

        if (!$record) {
            throw new RuntimeException('Bind tenant/location first.');
        }
        if ($action === 'shared-activate-location') {
            if (!$shared->globalReady() || (int)$sender->enabled !== 1) {
                throw new RuntimeException('Shared sender not active and configured.');
            }
            if ($central->table('pmd_wa_shared_locations')
                ->where('tenant_id', $tenantId)
                ->where('location_id', $locationId)
                ->where('sender_id', '<>', (int)$sender->id)
                ->where('enabled', 1)->exists()) {
                throw new RuntimeException('Restaurant already mapped to another active shared sender.');
            }
        }
        $central->table('pmd_wa_shared_locations')
            ->where($scope)->update([
                'enabled' => $action === 'shared-activate-location' ? 1 : 0,
                'updated_at' => now(),
            ]);
        $this->info('Shared restaurant scope status updated.');
        return 0;
    }

}
