{{-- PMD_CASHIER_SAME_ROUTE_WAITER_QUICK_V2 --}}
<style id="pmd-cashier-same-route-waiter-critical-v2">
@media (max-width: 767px) {
  html.pmd-cashier-waiter-switching body {
    visibility: hidden !important;
    opacity: 0 !important;
  }
}
</style>
<script id="pmd-cashier-same-route-waiter-switch-v2">
(function () {
  'use strict';

  if (!window.matchMedia) return;

  var media = window.matchMedia('(max-width: 767px)');

  function enterQuickMode() {
    if (!media.matches) return;

    var url = new URL(window.location.href);

    if (
      String(url.pathname).replace(/\/+$/, '') !== '/admin/cashierlab'
      || url.searchParams.get('pmd_cashier_quick') === '1'
    ) {
      return;
    }

    document.documentElement.classList.add(
      'pmd-cashier-waiter-switching'
    );

    url.searchParams.set('pmd_cashier_quick', '1');
    window.location.replace(
      url.pathname + '?' + url.searchParams.toString()
    );
  }

  enterQuickMode();

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', function (event) {
      if (event.matches) enterQuickMode();
    });
  } else if (typeof media.addListener === 'function') {
    media.addListener(function (event) {
      if (event.matches) enterQuickMode();
    });
  }
})();
</script>
{{-- PMD_CLEAN_WORKSPACE_SHARED_V1 --}}
@include('admin::_partials.pmd_clean_workspace_shared_v1')
