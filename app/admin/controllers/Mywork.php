<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use App\Http\Controllers\PmdStaffPortalV5Controller;
use Illuminate\Http\RedirectResponse;

/** PMD_MY_WORK_STAFF_PORTAL_V5 */
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

    public function index()
    {
        return $this->portalResponse('index');
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

    /** Fallback dynamic action. V5 also has an explicit priority avatar route. */
    public function avatar()
    {
        return $this->portalResponse('avatar');
    }

    public function stafflogout()
    {
        return $this->portalResponse('logout', false);
    }

    /**
     * V5 overrides month/report/avatar/shift ownership while inheriting the
     * already-proven chat, profile save, group and management actions from V4.
     */
    private function portalResponse(string $method, bool $withRequest = true)
    {
        $portal = app(PmdStaffPortalV5Controller::class);
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
