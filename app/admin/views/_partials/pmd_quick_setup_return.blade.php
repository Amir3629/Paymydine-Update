{{-- PMD Quick Setup R19: persistent, server-first-paint return entry.
     'Not now' is a welcome-dismissal, NOT a completed setup.
     Permission and eligibility use the same server authority as /admin/pmdquicksetup.
     The current hostname/tenant owns writes even when reporting another group site. --}}
@php
    $pmdQuickSetupReturnEligible = false;
    try {
        $pmdQuickSetupReturnUser = \Admin\Facades\AdminAuth::getUser();
        if (
            $pmdQuickSetupReturnUser
            && $pmdQuickSetupReturnUser->hasPermission('Site.Settings')
            && strtolower(trim((string)setting('pmd_onboarding_status', 'pending'))) !== 'completed'
        ) {
            $pmdQuickSetupReturnState = app(\Admin\Services\PmdTenantQuickSetupServiceV2::class)->status();
            $pmdQuickSetupReturnEligible = !empty($pmdQuickSetupReturnState['eligible']);
        }
    } catch (\Throwable $pmdQuickSetupReturnError) {
        // Fail closed: never expose a Quick Setup entry when status/auth fails.
        $pmdQuickSetupReturnEligible = false;
    }
@endphp
@if($pmdQuickSetupReturnEligible)
<a
    href="{{ admin_url('pmdquicksetup') }}"
    class="pmd-quick-setup-return"
    data-pmd-quick-setup-return
    aria-label="Quick Setup for the signed-in restaurant"
    title="Continue Quick Setup for the signed-in restaurant"
>Quick Setup</a>
@endif
