<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

class SeedSampleNotifications extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Only seed if we're in a development environment
        if (app()->environment('local', 'development')) {
            // Get the current tenant ID from the active database
            $tenantId = $this->getCurrentTenantId();
            
            if ($tenantId) {
                // Insert sample notifications
                DB::table('notifications')->insert([
                    [
                        'tenant_id' => $tenantId,
                        'type' => 'waiter_call',
                        'title' => 'Waiter Call - Table 5',
                        'message' => 'Customer needs assistance with the menu',
                        'table_id' => 5,
                        'table_name' => 'Table 5',
                        'payload' => json_encode([
                            'customer_message' => 'Need assistance with the menu',
                            'urgency' => 'medium'
                        ]),
                        'status' => 'new',
                        'priority' => 'medium',
                        'created_at' => now()->subMinutes(5),
                        'updated_at' => now()->subMinutes(5)
                    ],
                    [
                        'tenant_id' => $tenantId,
                        'type' => 'valet_request',
                        'title' => 'Valet Request - Table 3',
                        'message' => 'Customer John Smith needs valet service for Toyota Camry (ABC123)',
                        'table_id' => 3,
                        'table_name' => 'Table 3',
                        'payload' => json_encode([
                            'customer_name' => 'John Smith',
                            'car_make' => 'Toyota Camry',
                            'license_plate' => 'ABC123',
                            'estimated_duration' => '2 hours'
                        ]),
                        'status' => 'new',
                        'priority' => 'medium',
                        'created_at' => now()->subMinutes(10),
                        'updated_at' => now()->subMinutes(10)
                    ],
                    [
                        'tenant_id' => $tenantId,
                        'type' => 'table_note',
                        'title' => 'Table Note - Table 7',
                        'message' => 'Please bring extra napkins',
                        'table_id' => 7,
                        'table_name' => 'Table 7',
                        'payload' => json_encode([
                            'note' => 'Please bring extra napkins',
                            'timestamp' => now()->subMinutes(15)->toISOString()
                        ]),
                        'status' => 'seen',
                        'priority' => 'low',
                        'seen_at' => now()->subMinutes(2),
                        'created_at' => now()->subMinutes(15),
                        'updated_at' => now()->subMinutes(2)
                    ]
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // Only clean up if we're in a development environment
        if (app()->environment('local', 'development')) {
            $tenantId = $this->getCurrentTenantId();
            
            if ($tenantId) {
                DB::table('notifications')
                    ->where('tenant_id', $tenantId)
                    ->whereIn('type', ['waiter_call', 'valet_request', 'table_note'])
                    ->delete();
            }
        }
    }

    /**
     * Get the current tenant ID from the active database
     *
     * @return int|null
     */
    private function getCurrentTenantId()
    {
        try {
            // Try to get tenant ID from the current database name
            $dbName = DB::connection()->getDatabaseName();
            
            // Extract tenant ID from database name (assuming format: tenant_1_db)
            if (preg_match('/tenant_(\d+)_db/', $dbName, $matches)) {
                return (int) $matches[1];
            }
            
            // Fallback: try to get from ti_tenants table
            $tenant = DB::table('tenants')
                ->where('database', $dbName)
                ->first();
                
            return $tenant ? $tenant->id : null;
        } catch (\Exception $e) {
            return null;
        }
    }
}