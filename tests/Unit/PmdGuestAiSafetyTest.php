<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class PmdGuestAiSafetyTest extends TestCase
{
    private function source(string $relative): string
    {
        $path = dirname(__DIR__, 2).'/'.$relative;
        $contents = file_get_contents($path);
        $this->assertNotFalse($contents, 'Could not read '.$relative);
        return (string)$contents;
    }

    public function test_guest_ai_is_fail_closed_and_tenant_allowlisted(): void
    {
        $config = $this->source('config/pmd_ai.php');
        $this->assertStringContainsString("env('PMD_AI_GUEST_ENABLED', false)", $config);
        $this->assertStringContainsString("env('PMD_AI_GUEST_TENANT_ALLOWLIST', '')", $config);

        $service = $this->source('app/Services/AI/GuestMenuAiService.php');
        $this->assertStringContainsString('if (!$allowlist)', $service);
        $this->assertStringContainsString("config('pmd_ai.guest_enabled', false)", $service);
    }

    public function test_guest_ai_only_projects_public_menu_and_has_allergy_guard(): void
    {
        $service = $this->source('app/Services/AI/GuestMenuAiService.php');

        $this->assertStringContainsString('pmd_menu_highlights_response_20260607', $service);
        $this->assertStringContainsString('Never guarantee that an item is allergen-free', $service);
        $this->assertStringContainsString('confirm with restaurant staff before ordering', $service);
        $this->assertStringNotContainsString('PmdReadAuthority', $service);
        $this->assertStringNotContainsString('PmdKitchenWorkforceService', $service);
        $this->assertStringNotContainsString('owner_kpis', $service);
    }

    public function test_guest_ai_routes_run_inside_detect_tenant_v1_loader(): void
    {
        $loader = $this->source('app/main/routes/api-health-media.php');
        $routes = $this->source('app/main/routes/api-v1-guest-ai.php');

        $this->assertStringContainsString('DetectTenant::class', $loader);
        $this->assertStringContainsString("require_once __DIR__.'/api-v1-guest-ai.php'", $loader);
        $this->assertStringContainsString("Route::get('/guest-ai/status'", $routes);
        $this->assertStringContainsString("Route::post('/guest-ai/ask'", $routes);
        $this->assertStringContainsString("'read_only' => true", $routes);
    }
}
