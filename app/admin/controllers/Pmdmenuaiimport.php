<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Models\Categories_model;
use Admin\Models\Menus_model;
use Admin\Services\PmdAiImportTableService;
use App\Services\AI\AiContext;
use App\Services\AI\MenuImportAiService;
use App\Services\AI\PmdReadAuthority;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Throwable;

/**
 * Human-reviewed migration workspace for menus from previous restaurant systems.
 * AI analysis is read-only. Category/Food writes stay in Menus.php; detected
 * Floor/Table structure is committed through the same service used by Quick Setup.
 */
final class Pmdmenuaiimport extends AdminController
{
    protected $requiredPermissions = 'Admin.Menus';

    public function __construct()
    {
        parent::__construct();
        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-settings-suite pmd-menu-ai-import-page');
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addCss('css/pmd-menu-ai-import-v1.css');
        $this->addJs('js/pmd-menu-ai-import-v1.js');
        AdminMenu::setContext('menus', 'restaurant');
    }

    public function index()
    {
        Template::setTitle('AI Menu Import');
        Template::setHeading('AI Menu Import');

        $user = AdminAuth::getUser();
        $categories = Categories_model::query();
        if (Schema::hasColumn('categories', 'status')) $categories->where('status', 1);
        $categories = $categories->orderByRaw('COALESCE(priority, 999999) ASC')->orderBy('name')->get(['category_id', 'name']);

        $this->vars['pmdAiImportCategories'] = $categories->map(static fn ($row) => [
            'id' => (int)$row->category_id,
            'name' => (string)$row->name,
        ])->values()->all();
        $this->vars['pmdAiImportExistingItems'] = Menus_model::query()
            ->orderBy('menu_name')
            ->pluck('menu_name')
            ->map(static fn ($name) => trim((string)$name))
            ->filter()
            ->values()
            ->all();
        $this->vars['pmdAiImportCanCreateCategories'] = (bool)($user && $user->hasPermission('Admin.Categories'));
        $this->vars['pmdAiImportCanImportTables'] = (bool)($user && $user->hasPermission('Site.Settings'));
        $this->vars['pmdAiImportEnabled'] = (bool)config('pmd_ai.enabled', false);

        return $this->makeView('pmdmenuaiimport/index');
    }

    public function analyse()
    {
        $user = AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Menus')) abort(403);

        $validator = Validator::make(request()->allFiles(), [
            'menu_sources' => ['required', 'array', 'min:1', 'max:12'],
            'menu_sources.*' => ['file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:12288'],
            'item_photos' => ['nullable', 'array', 'max:80'],
            'item_photos.*' => ['file', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
        ]);
        if ($validator->fails()) {
            return response()->json(['ok' => false, 'message' => $validator->errors()->first()], 422);
        }

        $menuSources = array_values(array_filter((array)request()->file('menu_sources', [])));
        $itemPhotos = array_values(array_filter((array)request()->file('item_photos', [])));
        $totalBytes = 0;
        foreach (array_merge($menuSources, $itemPhotos) as $file) $totalBytes += max(0, (int)$file->getSize());
        if ($totalBytes > 48 * 1024 * 1024) {
            return response()->json(['ok' => false, 'message' => 'Please keep the total upload under 48 MB.'], 422);
        }

        $categories = Categories_model::query()->get(['category_id', 'name'])->map(static fn ($row) => [
            'id' => (int)$row->category_id,
            'name' => (string)$row->name,
        ])->values()->all();

        try {
            $result = app(MenuImportAiService::class)->analyse(
                $this->context('menu_import_analysis'),
                $menuSources,
                $itemPhotos,
                $categories
            );
            $result['can_create_categories'] = $user->hasPermission('Admin.Categories');
            $result['can_import_tables'] = $user->hasPermission('Site.Settings');
            return response()->json($result)->withHeaders(['Cache-Control' => 'private, no-store, max-age=0']);
        } catch (Throwable $error) {
            logger()->warning('PMD AI menu import analysis failed', [
                'type' => get_class($error),
                'message' => $error->getMessage(),
                'user_id' => (int)$user->getKey(),
            ]);
            $message = strtolower($error->getMessage());
            $status = str_contains($message, 'rate limit') || str_contains($message, 'budget') ? 429 : 503;
            if (str_contains($message, 'not enabled') || str_contains($message, 'disabled')) $status = 403;
            return response()->json([
                'ok' => false,
                'message' => $status === 429
                    ? 'AI import is busy right now. Please try again shortly.'
                    : ($status === 403 ? 'AI menu import is not enabled for this restaurant.' : 'AI could not read these files. Try clearer images or a smaller PDF.'),
            ], $status)->withHeaders(['Cache-Control' => 'private, no-store, max-age=0']);
        }
    }

    public function importTables()
    {
        $user = AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Menus') || !$user->hasPermission('Site.Settings')) abort(403);

        $raw = (string)request()->input('floors', '[]');
        $rows = json_decode($raw, true);
        if (!is_array($rows)) return response()->json(['ok' => false, 'message' => 'Floor/Table selection is invalid.'], 422);

        $floors = [];
        foreach (array_slice($rows, 0, 8) as $row) {
            if (!is_array($row) || empty($row['selected'])) continue;
            $name = mb_substr(trim((string)($row['name'] ?? '')), 0, 80);
            $tables = max(0, min(60, (int)($row['table_count'] ?? 0)));
            if ($name !== '' && $tables > 0) $floors[] = ['name' => $name, 'tables' => $tables];
        }
        if (!$floors) return response()->json(['ok' => true, 'skipped' => true, 'message' => 'No Floor/Table rows selected.']);

        try {
            $result = app(PmdAiImportTableService::class)->importDetectedLayout($floors);
            return response()->json(['ok' => true, 'result' => $result]);
        } catch (\InvalidArgumentException $error) {
            return response()->json(['ok' => false, 'message' => $error->getMessage()], 422);
        } catch (Throwable $error) {
            logger()->warning('PMD AI Floor/Table import failed', [
                'type' => get_class($error),
                'message' => $error->getMessage(),
            ]);
            return response()->json(['ok' => false, 'message' => 'Floor/Table layout could not be imported. Menu items were not changed by this step.'], 500);
        }
    }

    private function context(string $task): AiContext
    {
        $user = AdminAuth::getUser();
        $staff = $user ? $user->staff : null;
        $tenant = app()->bound('tenant') ? app('tenant') : null;
        $authority = app(PmdReadAuthority::class);
        $tenantId = null;
        foreach (['id', 'tenant_id'] as $key) {
            if ($tenant && isset($tenant->{$key}) && (int)$tenant->{$key} > 0) { $tenantId = (int)$tenant->{$key}; break; }
        }
        $tenantDomain = null;
        foreach (['domain', 'tenant_domain', 'subdomain'] as $key) {
            if ($tenant && !empty($tenant->{$key})) { $tenantDomain = (string)$tenant->{$key}; break; }
        }
        $tenantDb = null;
        try { $tenantDb = (string)DB::connection()->getDatabaseName(); } catch (Throwable $e) {}

        $permissions = ['Admin.Menus'];
        if ($user && $user->hasPermission('Admin.Categories')) $permissions[] = 'Admin.Categories';
        if ($user && $user->hasPermission('Site.Settings')) $permissions[] = 'Site.Settings';

        return new AiContext(
            $tenantId,
            $tenantDb,
            $tenantDomain ?: request()->getHost(),
            $authority->canonicalLocationId(),
            $user ? (int)$user->getKey() : null,
            $staff ? (int)$staff->getKey() : null,
            $permissions,
            (string)app()->getLocale(),
            $authority->canonicalTimezone() ?: (string)config('app.timezone', 'UTC'),
            (string)Str::uuid(),
            $task
        );
    }
}
