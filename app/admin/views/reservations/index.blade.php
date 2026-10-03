{{-- PMD_CLEAN_WORKSPACE_SHARED_V1 --}}
@include('admin::_partials.pmd_clean_workspace_shared_v1')

<style id="pmd-public-booking-admin-link-v1-style">
#pmd-r2-clean-header .pmd-public-booking-admin-link-v1 {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 8px !important;
    min-width: 132px !important;
    height: 46px !important;
    margin: 0 !important;
    padding: 0 14px !important;
    border: 1px solid #9fc9bb !important;
    border-radius: 14px !important;
    background: #edf8f3 !important;
    color: #075548 !important;
    box-shadow: none !important;
    font-size: 12px !important;
    font-weight: 850 !important;
    line-height: 1 !important;
    text-decoration: none !important;
    white-space: nowrap !important;
}
#pmd-r2-clean-header .pmd-public-booking-admin-link-v1:hover,
#pmd-r2-clean-header .pmd-public-booking-admin-link-v1:focus-visible {
    border-color: #075548 !important;
    background: #dff2e9 !important;
    outline: 2px solid rgba(7,85,72,.16) !important;
    outline-offset: 2px !important;
}
#pmd-r2-clean-header .pmd-public-booking-admin-link-v1 svg {
    width: 18px !important;
    height: 18px !important;
    fill: none !important;
    stroke: currentColor !important;
    stroke-width: 1.8 !important;
    stroke-linecap: round !important;
    stroke-linejoin: round !important;
}
@media (max-width: 760px) {
    #pmd-r2-clean-header .pmd-public-booking-admin-link-v1 {
        min-width: 46px !important;
        width: 46px !important;
        max-width: 46px !important;
        padding: 0 !important;
    }
    #pmd-r2-clean-header .pmd-public-booking-admin-link-v1 span {
        display: none !important;
    }
}
</style>

<script id="pmd-public-booking-admin-link-v1">
(function () {
    'use strict';

    function mountPublicBookingLink() {
        var actions = document.querySelector('#pmd-r2-clean-header .pmd-r2-clean-actions');
        if (!actions || actions.querySelector('.pmd-public-booking-admin-link-v1')) return;

        var link = document.createElement('a');
        link.className = 'pmd-public-booking-admin-link-v1';
        link.href = window.location.origin + '/book';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.title = 'Open public booking page';
        link.setAttribute('aria-label', 'Open public booking page');
        link.innerHTML =
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 12h8M12 8v8"></path><rect x="4" y="4" width="16" height="16" rx="3"></rect></svg>' +
            '<span>Booking page</span>';

        actions.insertBefore(link, actions.firstChild);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountPublicBookingLink, { once: true });
    } else {
        mountPublicBookingLink();
    }
})();
</script>
