<?php

namespace Admin\Services;

use Admin\Facades\AdminAuth;
use Illuminate\Http\Request;

/**
 * PMD_FIXED_ROLE_PRESENTATION_R43
 *
 * Route access is enforced separately by PmdFixedRoleAuthorityV1. This only
 * removes navigation that the current fixed role must never see, at first paint.
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
        $roleCode = $authority->roleCodeForUser($user);
        $html = (string)$response->getContent();

        if ($html === '' || str_contains($html, 'data-pmd-fixed-role-presentation-r43')) {
            return $response;
        }

        $style = '';

        if ($roleCode === 'manager') {
            $style = <<<'HTML'
<style data-pmd-fixed-role-presentation-r43>
  a[href$="/admin/pmdsettings"],
  a[href*="/admin/pmdsettings/"],
  a[href$="/admin/dashboardlab"],
  a[href$="/admin/dashboard2"],
  a[href$="/admin/dashboard"] {
    display: none !important;
  }
</style>
HTML;
        } elseif (in_array($roleCode, ['cashier', 'waiter', 'kds', 'accountant', 'reservations'], true)) {
            $style = <<<'HTML'
<style data-pmd-fixed-role-presentation-r43>
  #pmd-side-menu2 {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }

  html.pmd-side-menu2-global-page .page-wrapper,
  html.pmd-side-menu2-global-page.pmd-sm2-collapsed .page-wrapper,
  html.pmd-side-menu2-global-page.pmd-sm2-expanded .page-wrapper {
    left: 0 !important;
    margin-left: 0 !important;
    width: 100% !important;
    max-width: none !important;
  }
</style>
HTML;
        }

        if ($style === '') {
            return $response;
        }

        $count = 0;
        $html = str_replace('</head>', $style."\n</head>", $html, $count);
        if ($count === 1) {
            $response->setContent($html);
        }

        return $response;
    }
}
