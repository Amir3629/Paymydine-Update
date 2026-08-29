<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdKitchenEtaLifecycleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Small Owner/Manager settings endpoint used by Menu's Kitchen timing modal.
 * It owns no UI and creates no second ETA authority.
 */
class Kitchensettings extends AdminController
{
    protected $requiredPermissions = 'Admin.Menus';

    public function settingsjson(): JsonResponse
    {
        $this->assertOwnerOrManager();
        $eta = app(PmdKitchenEtaLifecycleService::class);

        return response()->json([
            'ok' => true,
            'show_customer_eta' => $this->boolSetting('enable_customer_eta', true),
            'extension_minutes' => $eta->extensionMinutes(),
            'extension_cap' => $eta->extensionCap(),
        ]);
    }

    public function save()
    {
        $this->assertOwnerOrManager();

        $extension = (int)request()->input('extension_minutes', 10);
        if (!in_array($extension, [5, 10, 15, 20], true)) {
            $extension = max(1, min(120, (int)request()->input('custom_extension_minutes', $extension)));
        }

        setting()->set([
            'enable_customer_eta' => !empty(request()->input('show_customer_eta')) ? 1 : 0,
            'smart_eta_enabled' => 1,
            'pmd_eta_late_extension_minutes' => $extension,
            'pmd_eta_auto_extension_cap' => 2,
        ]);
        setting()->save();

        return redirect(admin_url('menu'))->with('success', 'Kitchen timing settings saved.');
    }

    private function assertOwnerOrManager(): void
    {
        try {
            $code = app(PmdDefaultStaffRoleService::class)->roleCodeForUser(AdminAuth::getUser());
            if (in_array($code, [PmdDefaultStaffRoleService::OWNER, PmdDefaultStaffRoleService::MANAGER], true)) {
                return;
            }
        } catch (\Throwable $error) {
        }

        abort(403);
    }

    private function boolSetting(string $key, bool $fallback): bool
    {
        try {
            if (!Schema::hasTable('settings')) return $fallback;
            $query = DB::table('settings')->where('item', $key);
            if (Schema::hasColumn('settings', 'setting_id')) $query->orderByDesc('setting_id');
            $value = $query->value('value');
            if ($value === null || $value === '') return $fallback;
            return in_array(strtolower((string)$value), ['1', 'true', 'yes', 'on'], true);
        } catch (\Throwable $error) {
            return $fallback;
        }
    }
}
