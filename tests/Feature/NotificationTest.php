<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\DB;
use App\Helpers\NotificationHelper;

class NotificationTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Set up tenant database for testing
        $this->setupTenantDatabase();
    }

    private function setupTenantDatabase()
    {
        // Create a test tenant database
        $tenantId = 1;
        $dbName = "tenant_{$tenantId}_db";
        
        // Switch to tenant database
        config(['database.connections.mysql.database' => $dbName]);
        DB::purge('mysql');
        DB::reconnect('mysql');
        
        // Run migrations
        $this->artisan('migrate', ['--path' => 'app/admin/database/migrations']);
    }

    /** @test */
    public function it_can_create_waiter_call_notification()
    {
        // Create a test table
        $tableId = DB::table('ti_tables')->insertGetId([
            'table_name' => 'Test Table',
            'min_capacity' => 2,
            'max_capacity' => 4,
            'table_status' => 1,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        // Test notification creation
        $notification = NotificationHelper::createWaiterCallNotification([
            'tenant_id' => 1,
            'table_id' => $tableId,
            'message' => 'Customer needs assistance'
        ]);

        $this->assertNotNull($notification);
        $this->assertEquals('waiter_call', $notification->type);
        $this->assertEquals('Waiter Call - Test Table', $notification->title);
        $this->assertEquals('Customer needs assistance', $notification->message);
        $this->assertEquals('new', $notification->status);
    }

    /** @test */
    public function it_can_create_valet_request_notification()
    {
        // Create a test table
        $tableId = DB::table('ti_tables')->insertGetId([
            'table_name' => 'Test Table',
            'min_capacity' => 2,
            'max_capacity' => 4,
            'table_status' => 1,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        // Test notification creation
        $notification = NotificationHelper::createValetRequestNotification([
            'tenant_id' => 1,
            'table_id' => $tableId,
            'customer_name' => 'John Smith',
            'car_make' => 'Toyota Camry',
            'license_plate' => 'ABC123'
        ]);

        $this->assertNotNull($notification);
        $this->assertEquals('valet_request', $notification->type);
        $this->assertEquals('Valet Request - Test Table', $notification->title);
        $this->assertEquals('new', $notification->status);
    }

    /** @test */
    public function it_can_create_table_note_notification()
    {
        // Create a test table
        $tableId = DB::table('ti_tables')->insertGetId([
            'table_name' => 'Test Table',
            'min_capacity' => 2,
            'max_capacity' => 4,
            'table_status' => 1,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        // Test notification creation
        $notification = NotificationHelper::createTableNoteNotification([
            'tenant_id' => 1,
            'table_id' => $tableId,
            'note' => 'Please bring extra napkins',
            'timestamp' => now()->toISOString()
        ]);

        $this->assertNotNull($notification);
        $this->assertEquals('table_note', $notification->type);
        $this->assertEquals('Table Note - Test Table', $notification->title);
        $this->assertEquals('new', $notification->status);
    }

    /** @test */
    public function it_prevents_duplicate_notifications()
    {
        // Create a test table
        $tableId = DB::table('ti_tables')->insertGetId([
            'table_name' => 'Test Table',
            'min_capacity' => 2,
            'max_capacity' => 4,
            'table_status' => 1,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        // Create first notification
        $notification1 = NotificationHelper::createWaiterCallNotification([
            'tenant_id' => 1,
            'table_id' => $tableId,
            'message' => 'Customer needs assistance'
        ]);

        $this->assertNotNull($notification1);

        // Try to create duplicate notification within 60 seconds
        $notification2 = NotificationHelper::createWaiterCallNotification([
            'tenant_id' => 1,
            'table_id' => $tableId,
            'message' => 'Customer needs assistance'
        ]);

        $this->assertNull($notification2);
    }

    /** @test */
    public function it_enforces_rate_limiting()
    {
        // Create a test table
        $tableId = DB::table('ti_tables')->insertGetId([
            'table_name' => 'Test Table',
            'min_capacity' => 2,
            'max_capacity' => 4,
            'table_status' => 1,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        // Create 5 notifications (rate limit)
        for ($i = 0; $i < 5; $i++) {
            $notification = NotificationHelper::createWaiterCallNotification([
                'tenant_id' => 1,
                'table_id' => $tableId,
                'message' => "Customer needs assistance {$i}"
            ]);
            $this->assertNotNull($notification);
        }

        // Try to create 6th notification (should be rate limited)
        $notification = NotificationHelper::createWaiterCallNotification([
            'tenant_id' => 1,
            'table_id' => $tableId,
            'message' => 'Customer needs assistance 6'
        ]);

        $this->assertNull($notification);
    }

    /** @test */
    public function it_can_get_notification_counts()
    {
        // Create test notifications
        DB::table('notifications')->insert([
            [
                'tenant_id' => 1,
                'type' => 'waiter_call',
                'title' => 'Test 1',
                'message' => 'Test message 1',
                'status' => 'new',
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'tenant_id' => 1,
                'type' => 'valet_request',
                'title' => 'Test 2',
                'message' => 'Test message 2',
                'status' => 'seen',
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);

        $counts = NotificationHelper::getNotificationCounts(1);

        $this->assertEquals(1, $counts['new']);
        $this->assertEquals(1, $counts['seen']);
        $this->assertEquals(0, $counts['in_progress']);
        $this->assertEquals(0, $counts['resolved']);
        $this->assertEquals(2, $counts['total']);
    }
}