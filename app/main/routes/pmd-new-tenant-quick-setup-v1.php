<?php

/*
|--------------------------------------------------------------------------
| PMD_NEW_TENANT_QUICK_SETUP_V1
|--------------------------------------------------------------------------
| Read-only tenant-scoped state for the Owner Dashboard quick-setup card.
| A restaurant is considered pre-launch until it has received its first order.
| Reuses the existing Admin onboarding step registry; no new setup authority,
| schema or persistence is introduced here.
|--------------------------------------------------------------------------
*/

if (!defined('PMD_NEW_TENANT_QUICK_SETUP_V1')) {
    define('PMD_NEW_TENANT_QUICK_SETUP_V1', true);

    \Illuminate\Support\Facades\Route::get('/api/v1/pmd-new-tenant-quick-setup', function () {
        $db = \Illuminate\Support\Facades\DB::connection();
        $schema = \Illuminate\Support\Facades\Schema::connection($db->getName());

        $normalizeLocale = static function ($locale): string {
            $locale = strtolower(trim(str_replace('_', '-', (string)$locale)));
            if (!preg_match('/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/', $locale)) return 'en';
            return explode('-', $locale)[0] ?: 'en';
        };

        $locale = $normalizeLocale(request()->query('locale', 'en'));
        if (!in_array($locale, ['en', 'de', 'tr', 'ar', 'fa', 'ja'], true)) $locale = 'en';

        $previousLocale = app()->getLocale();
        app()->setLocale($locale);

        try {
            $hasOrders = $schema->hasTable('orders')
                ? $db->table('orders')->limit(1)->exists()
                : false;

            // The Quick Setup card is deliberately a pre-launch aid. Once the
            // restaurant has a real order it disappears permanently without a
            // second preference flag or migration.
            if ($hasOrders) {
                return response()->json([
                    'success' => true,
                    'api_version' => 'pmd-new-tenant-quick-setup-v1',
                    'show' => false,
                    'steps' => [],
                ])->header('Cache-Control', 'no-store, no-cache, must-revalidate');
            }

            $steps = [];
            $onboarding = \Admin\Classes\OnboardingSteps::instance();

            foreach ($onboarding->listSteps() as $step) {
                $code = (string)($step->code ?? '');
                if ($code === '') continue;

                // Keep the proven onboarding catalogue, but point Menu at the
                // clean PayMyDine workspace instead of the retired legacy page.
                $url = (string)($step->url ?? '');
                if ($code === 'admin::menus') $url = admin_url('menu');

                $completed = false;
                try {
                    $completion = $step->completed ?? null;
                    $completed = is_callable($completion) ? (bool)$completion() : false;
                } catch (\Throwable $ignored) {
                    $completed = false;
                }

                // Legacy Menu did not have a completion callable. The current
                // tenant menu table is the canonical source for that step.
                if ($code === 'admin::menus') {
                    $completed = $schema->hasTable('menus')
                        ? $db->table('menus')->limit(1)->exists()
                        : false;
                }

                // Mail is an optional legacy setup item. It should not keep a
                // modern restaurant visually stuck in onboarding.
                if ($code === 'admin::mail') continue;

                $steps[] = [
                    'code' => $code,
                    'label' => lang((string)($step->label ?? '')),
                    'description' => lang((string)($step->description ?? '')),
                    'icon' => (string)($step->icon ?? 'fa-check'),
                    'url' => $url,
                    'completed' => $completed,
                ];
            }

            return response()->json([
                'success' => true,
                'api_version' => 'pmd-new-tenant-quick-setup-v1',
                'show' => true,
                'title' => lang('admin::lang.dashboard.onboarding.title'),
                'steps' => $steps,
            ])->header('Cache-Control', 'no-store, no-cache, must-revalidate');
        } catch (\Throwable $error) {
            return response()->json([
                'success' => false,
                'show' => false,
                'steps' => [],
            ], 200)->header('Cache-Control', 'no-store, no-cache, must-revalidate');
        } finally {
            app()->setLocale($previousLocale);
        }
    });
}
