<?php

use PHPUnit\Framework\TestCase;

final class PmdGuestAiFoundationTest extends TestCase
{
    public function testGuestServiceIsFailClosedAndMenuOnly(): void
    {
        $source = file_get_contents(
            dirname(__DIR__, 2).'/app/Services/AI/GuestMenuAiService.php'
        );

        self::assertIsString($source);
        self::assertStringContainsString("pmd_ai.guest_enabled", $source);
        self::assertStringContainsString("guest_tenant_allowlist", $source);
        self::assertStringContainsString("pmd_menu_highlights_response_20260607", $source);
        self::assertStringContainsString("CURRENT_CUSTOMER_MENU", $source);
        self::assertStringContainsString("Allergy safety is strict", $source);

        // Guest service must not gain owner/admin data authorities.
        self::assertStringNotContainsString('PmdReadAuthority', $source);
        self::assertStringNotContainsString('PmdKitchenWorkforceService', $source);
        self::assertStringNotContainsString('owner_kpis', $source);
        self::assertStringNotContainsString('report_range', $source);
        self::assertStringNotContainsString('workforce_schedule_range', $source);
    }

    public function testGuestApiIsReadOnlyAndTenantMiddlewareLoaderOwnsIt(): void
    {
        $route = file_get_contents(
            dirname(__DIR__, 2).'/app/main/routes/api-v1-guest-ai.php'
        );
        $loader = file_get_contents(
            dirname(__DIR__, 2).'/app/main/routes/api-health-media.php'
        );

        self::assertIsString($route);
        self::assertIsString($loader);
        self::assertStringContainsString("Route::get('/guest-ai/status'", $route);
        self::assertStringContainsString("Route::post('/guest-ai/ask'", $route);
        self::assertStringContainsString("'read_only' => true", $route);
        self::assertStringContainsString("require_once __DIR__.'/api-v1-guest-ai.php'", $loader);
        self::assertStringContainsString('DetectTenant', $loader);

        self::assertStringNotContainsString("Route::put('/guest-ai", $route);
        self::assertStringNotContainsString("Route::delete('/guest-ai", $route);
    }

    public function testGuestConfigDefaultsToDisabledAndRequiresAllowlist(): void
    {
        $config = file_get_contents(
            dirname(__DIR__, 2).'/config/pmd_ai.php'
        );

        self::assertIsString($config);
        self::assertStringContainsString("env('PMD_AI_GUEST_ENABLED', false)", $config);
        self::assertStringContainsString("env('PMD_AI_GUEST_TENANT_ALLOWLIST', '')", $config);
        self::assertStringContainsString("PMD_AI_GUEST_REQUESTS_PER_MINUTE", $config);
        self::assertStringContainsString("PMD_AI_GUEST_DAILY_REQUESTS", $config);
    }
}
