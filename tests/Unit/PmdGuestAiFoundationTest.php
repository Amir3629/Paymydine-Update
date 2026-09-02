<?php

use PHPUnit\Framework\TestCase;

final class PmdGuestAiFoundationTest extends TestCase
{
    public function testGuestServiceIsFailClosedLocationScopedAndMenuOnly(): void
    {
        $source = file_get_contents(dirname(__DIR__, 2).'/app/Services/AI/GuestMenuAiService.php');

        self::assertIsString($source);
        self::assertStringContainsString("pmd_ai.guest_enabled", $source);
        self::assertStringContainsString("guest_tenant_allowlist", $source);
        self::assertStringContainsString("guest_location_allowlist", $source);
        self::assertStringContainsString("locationExists", $source);
        self::assertStringContainsString("filterAndReconcileForLocation", $source);
        self::assertStringContainsString("is_stock_out", $source);
        self::assertStringContainsString("pmd_menu_highlights_response_20260607", $source);
        self::assertStringContainsString("CURRENT_CUSTOMER_MENU", $source);
        self::assertStringContainsString("Allergy safety is strict", $source);
        self::assertStringContainsString("looksLikePromptExtraction", $source);
        self::assertStringContainsString("RateLimiter", $source);
        self::assertStringContainsString("'tools' => []", $source);

        self::assertStringNotContainsString('PmdReadAuthority', $source);
        self::assertStringNotContainsString('PmdKitchenWorkforceService', $source);
        self::assertStringNotContainsString('owner_kpis', $source);
        self::assertStringNotContainsString('report_range', $source);
        self::assertStringNotContainsString('workforce_schedule_range', $source);
    }

    public function testGuestPopularityIsMeasuredLocationScopedAndDistinctFromChefChoice(): void
    {
        $root = dirname(__DIR__, 2);
        $guest = file_get_contents($root.'/app/Services/AI/GuestMenuAiService.php');
        $popularity = file_get_contents($root.'/app/Services/MenuPopularityService.php');

        self::assertIsString($guest);
        self::assertIsString($popularity);
        self::assertStringContainsString('attachPopularityForLocation', $guest);
        self::assertStringContainsString('POPULARITY RULE:', $guest);
        self::assertStringContainsString('CUISINE SIMILARITY RULE:', $guest);
        self::assertStringContainsString("'popularity_rank'", $guest);
        self::assertStringContainsString("'top_items' => \$popularity['top_items']", $guest);
        self::assertStringContainsString('?int $locationId = null', $popularity);
        self::assertStringContainsString("where('o.location_id', \$locationId)", $popularity);
        self::assertStringContainsString("where('o.processed', 1)", $popularity);
        self::assertStringContainsString("['paid', 'settled']", $popularity);
        self::assertStringContainsString('existing callers that omit location retain', strtolower($popularity));
    }

    public function testGuestApiIsReadOnlyAndRequiresLocation(): void
    {
        $route = file_get_contents(dirname(__DIR__, 2).'/app/main/routes/api-v1-guest-ai.php');
        $loader = file_get_contents(dirname(__DIR__, 2).'/app/main/routes/api-health-media.php');

        self::assertIsString($route);
        self::assertIsString($loader);
        self::assertStringContainsString("Route::get('/guest-ai/status'", $route);
        self::assertStringContainsString("Route::post('/guest-ai/ask'", $route);
        self::assertStringContainsString("'location_id' => 'required|integer|min:1'", $route);
        self::assertStringContainsString("'read_only' => true", $route);
        self::assertStringContainsString("'surface' => 'frontend_v2'", $route);
        self::assertStringContainsString("require_once __DIR__.'/api-v1-guest-ai.php'", $loader);
        self::assertStringContainsString('DetectTenant', $loader);

        self::assertStringNotContainsString("Route::put('/guest-ai", $route);
        self::assertStringNotContainsString("Route::patch('/guest-ai", $route);
        self::assertStringNotContainsString("Route::delete('/guest-ai", $route);
    }

    public function testGuestConfigDefaultsToDisabledAndDoubleAllowlisted(): void
    {
        $config = file_get_contents(dirname(__DIR__, 2).'/config/pmd_ai.php');

        self::assertIsString($config);
        self::assertStringContainsString("env('PMD_AI_GUEST_ENABLED', false)", $config);
        self::assertStringContainsString("env('PMD_AI_GUEST_TENANT_ALLOWLIST', '')", $config);
        self::assertStringContainsString("env('PMD_AI_GUEST_LOCATION_ALLOWLIST', '')", $config);
        self::assertStringContainsString("env('PMD_AI_GUEST_ALLOW_WILDCARD', false)", $config);
        self::assertStringContainsString("env('PMD_AI_GUEST_MAX_OUTPUT_TOKENS', 1400)", $config);
        self::assertStringContainsString("env('PMD_AI_GUEST_MAX_ANSWER_CHARS', 3200)", $config);
        self::assertStringContainsString('PMD_AI_GUEST_REQUESTS_PER_MINUTE', $config);
        self::assertStringContainsString('PMD_AI_GUEST_DAILY_REQUESTS_PER_IP', $config);
        self::assertStringContainsString('PMD_AI_GUEST_DAILY_REQUESTS_PER_TENANT', $config);
        self::assertStringContainsString('PMD_AI_GUEST_PROMPT_GUARD', $config);
    }

    public function testOnlyFrontendV2OwnsTheGuestAiSurface(): void
    {
        $root = dirname(__DIR__, 2);
        $v2Base = $root.'/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815';
        $v2RootPage = file_get_contents($v2Base.'/app/page.tsx');
        $v2TablePage = file_get_contents($v2Base.'/app/table/[tableId]/page.tsx');
        $v2Component = file_get_contents($v2Base.'/src/runtime/components/GuestAiConcierge.tsx');
        $legacyLayout = $root.'/frontend/app/clientLayout.tsx';

        self::assertIsString($v2RootPage);
        self::assertIsString($v2TablePage);
        self::assertIsString($v2Component);
        self::assertStringContainsString('GuestAiConcierge', $v2RootPage);
        self::assertStringContainsString('GuestAiConcierge', $v2TablePage);
        self::assertStringContainsString('bootstrap.table.locationId', $v2Component);
        self::assertStringContainsString("data-pmd-guest-ai=\"v2\"", $v2Component);

        if (is_file($legacyLayout)) {
            $legacy = file_get_contents($legacyLayout);
            self::assertIsString($legacy);
            self::assertStringNotContainsString('GuestAiConcierge', $legacy);
        }
    }
}
