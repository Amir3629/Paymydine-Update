<?php

namespace Admin\Services;

use Admin\Facades\AdminAuth;
use Illuminate\Http\Request;

/**
 * PMD_FIXED_ROLE_PRESENTATION_R43
 *
 * Route access is enforced separately by PmdFixedRoleAuthorityV1. This only
 * removes Manager-forbidden navigation from the server-rendered first paint.
 */
class PmdFixedRolePresentationV1
{
    public function decorate(Request $request, $response)
    {
        if (
            !$request->isMethod('GET')
            || !is_object($response)
            || !method_exists($response, 'getContent')
            || !method_exists($response, 'setContent')
        ) {
            return $response;
        }

        $user = AdminAuth::getUser();
        if (!$user) {
            return $response;
        }

        $authority = app(PmdFixedRoleAuthorityV1::class);
        if ($authority->roleCodeForUser($user) !== 'manager') {
            return $response;
        }

        $html = (string)$response->getContent();
        if ($html === '' || str_contains($html, 'data-pmd-manager-nav-r43')) {
            return $response;
        }

        $style = <<<'HTML'
<style data-pmd-manager-nav-r43>
  a[href$="/admin/pmdsettings"],
  a[href*="/admin/pmdsettings/"],
  a[href$="/admin/dashboardlab"],
  a[href$="/admin/dashboard2"],
  a[href$="/admin/dashboard"] {
    display: none !important;
  }
</style>
HTML;

        $count = 0;
        $html = str_replace('</head>', $style."\n</head>", $html, $count);
        if ($count === 1) {
            $response->setContent($html);
        }

        return $response;
    }
}
