<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use App\Http\Controllers\PmdStaffPortalController;
use Illuminate\Http\RedirectResponse;

/** PMD_MY_WORK_STAFF_PORTAL_V3 */
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

    /** PMD_MY_WORK_SELF_PROFILE_V1 */
    public function updateprofile()
    {
        return $this->portalResponse('updateProfile');
    }

    /** Private same-tenant avatar response; no redirect canonicalization needed. */
    public function avatar()
    {
        return $this->portalResponse('avatar');
    }

    public function stafflogout()
    {
        return $this->portalResponse('logout', false);
    }

    /**
     * Reuse one Staff Portal application authority for chat, shifts, requests
     * and self-profile. Mywork only owns the canonical Admin URL boundary.
     */
    private function portalResponse(string $method, bool $withRequest = true)
    {
        $portal = app(PmdStaffPortalController::class);
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
