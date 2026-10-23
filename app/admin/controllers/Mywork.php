<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use App\Http\Controllers\PmdStaffPortalV6Controller;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Services\PmdDefaultStaffRoleService;
use Admin\Services\PmdStaffOperationsCenterV1;
use App\Services\PmdActualWorkShiftV1;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Http\RedirectResponse;

/** PMD_MY_WORK_STAFF_PORTAL_V6 */
class Mywork extends AdminController
{
    protected $requiredPermissions = null;

    public function __construct()
    {
        parent::__construct();

        // /admin/mywork owns authentication/routing, while the returned Staff
        // Portal view is a standalone PMD workspace with no Admin chrome.
        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-my-work-page');
        AdminMenu::setContext('dashboard');
    }

    /**
     * PMD_STAFF_SAME_APP_MANAGEMENT_V1_20261023
     * Existing Android Staff WebView uses /admin/login?destination=staff.
     * The same PMD credentials reveal the mobile manager desk ONLY to roles
     * authenticated as Owner/Manager; regular employees remain in My Work.
     */
    public function index()
    {
        if (!AdminAuth::isLogged()) return redirect(admin_url('login').'?destination=staff');
        if ($this->isWorkforceManager()) return redirect(admin_url('mywork/manage'));
        return $this->portalResponse('index');
    }

    public function manage()
    {
        if (!AdminAuth::isLogged()) return redirect(admin_url('login').'?destination=staff');
        if (!$this->isWorkforceManager()) abort(403);
        try {
            $locationId = max(1, (int)AdminLocation::getId());
        } catch (\Throwable $error) {
            // Preserve the same tenant-local fallback used by Shifts.
            $locationId = 1;
        }
        $center = app(PmdStaffOperationsCenterV1::class)->payload($locationId);
        $extras = app(PmdActualWorkShiftV1::class)
            ->get($locationId, now()->startOfMonth(), now()->endOfMonth(), null, 350);
        $unreviewedExtras = $extras->filter(fn($extra) => !$extra->reviewed)->values();
        $hasPersonalPortal = false;
        if (Schema::hasTable('pmd_operational_people')) {
            $staffId = (int)optional(optional(AdminAuth::getUser())->staff)->staff_id;
            $hasPersonalPortal = $staffId > 0 && DB::table('pmd_operational_people')
                ->where('staff_id', $staffId)->where('location_id', $locationId)
                ->where('is_active', 1)->exists();
        }
        return response()->view('pmd-staff-portal.management_v1', compact(
            'center','extras','unreviewedExtras','locationId','hasPersonalPortal'
        ))->header('Cache-Control', 'no-store, private')
          ->header('X-Content-Type-Options', 'nosniff');
    }

    public function personal()
    {
        if (!AdminAuth::isLogged()) return redirect(admin_url('login').'?destination=staff');
        if (!$this->isWorkforceManager()) abort(403);
        $staffId = (int)optional(optional(AdminAuth::getUser())->staff)->staff_id;
        if (!$staffId || !Schema::hasTable('pmd_operational_people')
            || !DB::table('pmd_operational_people')->where('staff_id', $staffId)
                ->where('is_active', 1)->exists()) {
            return redirect(admin_url('mywork/manage'))
                ->with('error', 'No personal Team profile is linked to this login.');
        }
        return $this->portalResponse('index');
    }

    private function isWorkforceManager(): bool
    {
        $role = app(PmdDefaultStaffRoleService::class)
            ->roleCodeForUser(AdminAuth::getUser());
        return in_array($role, [
            PmdDefaultStaffRoleService::OWNER,
            PmdDefaultStaffRoleService::MANAGER,
        ], true);
    }

    public function saverequest()
    {
        return $this->portalResponse('saveRequest');
    }

    public function handlerequest()
    {
        return $this->portalResponse('handleRequest');
    }

    public function creategroup()
    {
        return $this->portalResponse('createGroup');
    }

    public function sendmessage()
    {
        return $this->portalResponse('sendChatMessage');
    }

    public function updateprofile()
    {
        return $this->portalResponse('updateProfile');
    }

    /** PMD_STAFF_PORTAL_TIME_CLOCK_ACTIONS_V1 */
    public function clockin()
    {
        return $this->portalResponse('clockIn');
    }

    public function clockout()
    {
        return $this->portalResponse('clockOut');
    }
    
    /** PMD_STAFF_BREAK_EVENTS_V1_20261022: authenticated pause/resume, no GPS. */
    public function clockbreak()
    {
        return $this->portalResponse('clockBreak');
    }

    /** Fallback dynamic action. V5 also has an explicit priority avatar route. */
    public function avatar()
    {
        return $this->portalResponse('avatar');
    }

    /** PMD_STAFF_LOCALE_PERSIST_V4_20261023: validated tenant Staff preference. */
    public function stafflocale()
    {
        return $this->portalResponse('setStaffLocale');
    }

    public function stafflogout()
    {
        return $this->portalResponse('logout', false);
    }

    /**
     * V6 adds canonical attendance clocking while V5 continues to own the
     * month/report/avatar/shift layer and inherited V4 chat/profile actions.
     */
    private function portalResponse(string $method, bool $withRequest = true)
    {
        $portal = app(PmdStaffPortalV6Controller::class);
        $response = $withRequest
            ? $portal->{$method}(request())
            : $portal->{$method}();

        if ($response instanceof RedirectResponse) {
            $this->canonicalizePortalRedirect($response);
        }

        return $response;
    }

    /**
     * PMD_MY_WORK_CANONICAL_REDIRECT_V1
     *
     * The shared Staff Portal controller still uses legacy /staff redirects
     * internally. Keep flash/session payload on the original RedirectResponse
     * and replace only its Location header with the Admin-owned authority.
     */
    private function canonicalizePortalRedirect(RedirectResponse $response): void
    {
        $target = (string)$response->getTargetUrl();
        $parts = parse_url($target);
        $path = (string)($parts['path'] ?? '');

        if ($path === '/staff/login') {
            $canonical = admin_url('login').'?destination=staff';

            if (!empty($parts['query'])) {
                $canonical .= '&'.$parts['query'];
            }

            if (!empty($parts['fragment'])) {
                $canonical .= '#'.$parts['fragment'];
            }

            $response->setTargetUrl($canonical);
            return;
        }

        if ($path !== '/staff') {
            return;
        }

        $canonical = admin_url('mywork');

        if (!empty($parts['query'])) {
            $canonical .= '?'.$parts['query'];
        }

        if (!empty($parts['fragment'])) {
            $canonical .= '#'.$parts['fragment'];
        }

        $response->setTargetUrl($canonical);
    }
}
