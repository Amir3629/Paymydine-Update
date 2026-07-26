(function () {
  'use strict';

  if (String(window.location.pathname || '').replace(/\/+$/, '') !== '/admin/reservations2') return;
  if (window.PMDReservations2InternalLayoutV1) return;

  /*
   * Reservations2 shell geometry is intentionally CSS-owned.
   * This runtime exposes design tokens for diagnostics only and never writes
   * wrapper positions, page widths, margins or transforms.
   */
  window.PMDReservations2InternalLayoutV1 = Object.freeze({
    version: '1.0.0',
    desktopGap: 14,
    mobileGap: 10,
    mobileBreakpoint: 820,
    ownsGlobalShellGeometry: false
  });

  console.info(
    '[PMD Reservations2 Internal Layout V1] Ready',
    window.PMDReservations2InternalLayoutV1
  );
})();
