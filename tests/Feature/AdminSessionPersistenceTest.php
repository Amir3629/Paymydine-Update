<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Session;

/**
 * Admin Session Persistence Test
 * 
 * Purpose: Verify admin authentication persists across requests
 *          and doesn't cause unexpected "logouts".
 * 
 * Run: php artisan test --filter AdminSessionPersistenceTest
 */
class AdminSessionPersistenceTest extends TestCase
{
    /**
     * Test admin login persists across multiple GET requests.
     *
     * @return void
     */
    public function test_admin_session_persists_across_navigation()
    {
        // Create admin user (adjust based on your auth system)
        $admin = $this->createAdminUser();
        
        // Login as admin
        $this->actingAs($admin, 'admin');
        
        // First request
        $response1 = $this->get('/admin/dashboard');
        $response1->assertStatus(200);
        $this->assertTrue(auth()->check(), 'User should be authenticated after first request');
        
        // Second request (navigate to orders)
        $response2 = $this->get('/admin/orders');
        $response2->assertStatus(200);
        $this->assertTrue(auth()->check(), 'User should still be authenticated after second request');
        
        // Third request (navigate to menus)
        $response3 = $this->get('/admin/menus');
        $response3->assertStatus(200);
        $this->assertTrue(auth()->check(), 'User should still be authenticated after third request');
        
        // Verify no redirect to login
        $response1->assertDontSeeText('Login');
        $response2->assertDontSeeText('Login');
        $response3->assertDontSeeText('Login');
    }
    
    /**
     * Test admin session persists across POST request with CSRF token.
     *
     * @return void
     */
    public function test_admin_session_persists_across_form_save()
    {
        $admin = $this->createAdminUser();
        $this->actingAs($admin, 'admin');
        
        // Simulate form load (GET)
        $response1 = $this->get('/admin/menus/edit/1');
        $response1->assertStatus(200);
        $this->assertTrue(auth()->check());
        
        // Simulate form save (POST with CSRF token)
        $response2 = $this->post('/admin/menus/edit/1', [
            '_token' => csrf_token(),
            'menu_name' => 'Test Menu',
            'menu_price' => 10.00,
        ]);
        
        // Should not redirect to login
        $response2->assertStatus(200);
        $this->assertFalse($response2->isRedirect());
        $this->assertTrue(auth()->check(), 'User should still be authenticated after POST');
    }
    
    /**
     * Test CSRF protection is actually working.
     *
     * @return void
     */
    public function test_csrf_protection_enabled()
    {
        $admin = $this->createAdminUser();
        $this->actingAs($admin, 'admin');
        
        // POST without CSRF token should fail
        $response = $this->post('/admin/orders/save-table-layout', [
            'layout' => [],
        ]);
        
        // Should return 419 (CSRF token mismatch) NOT redirect to login
        $this->assertEquals(419, $response->getStatusCode(), 'CSRF protection should return 419, not 302 redirect');
    }
    
    /**
     * Test admin endpoints now require authentication.
     *
     * @return void
     */
    public function test_admin_endpoints_require_authentication()
    {
        // Test without authentication
        $response1 = $this->get('/admin/orders/get-table-statuses');
        
        // Should redirect to login or return 401/403
        $this->assertTrue(
            $response1->isRedirect() || in_array($response1->getStatusCode(), [401, 403]),
            'Unprotected admin endpoint should require authentication'
        );
        
        // Test with authentication
        $admin = $this->createAdminUser();
        $this->actingAs($admin, 'admin');
        
        $response2 = $this->get('/admin/orders/get-table-statuses');
        $response2->assertStatus(200);
    }
    
    /**
     * Test Redis session driver (if configured).
     *
     * @return void
     */
    public function test_redis_session_driver()
    {
        if (config('session.driver') !== 'redis') {
            $this->markTestSkipped('Test requires Redis session driver');
        }
        
        // Store value in session
        session()->put('test_key', 'test_value');
        session()->save();
        
        // Verify stored in Redis
        $sessionId = session()->getId();
        $redisKey = 'paymydine_session:' . $sessionId;
        
        $this->assertTrue(
            \Illuminate\Support\Facades\Redis::exists($redisKey),
            'Session should be stored in Redis'
        );
        
        // Retrieve value
        $this->assertEquals('test_value', session()->get('test_key'));
    }
    
    /**
     * Helper: Create admin user for testing.
     *
     * @return \Illuminate\Contracts\Auth\Authenticatable
     */
    private function createAdminUser()
    {
        // Adjust based on your user model
        // This is a simplified example
        
        return \Illuminate\Support\Facades\DB::table('staff')->insertGetId([
            'staff_name' => 'Test Admin',
            'staff_email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'staff_role_id' => 1, // Admin role
            'staff_status' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        // If using Eloquent:
        // return \Admin\Models\Staff::create([...]);
    }
}

