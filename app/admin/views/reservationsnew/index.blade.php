{{--
    Reservationsnew phase 1 mirror.

    This intentionally renders the currently proven Reservations2 workspace
    from a separate route. The old page remains untouched. Subsequent cleanup
    work will replace this include with isolated markup/assets on this route.
--}}
<script>
(function () {
    document.documentElement.classList.add('pmd-reservationsnew-route');
})();
</script>
<link rel="stylesheet" href="/app/admin/assets/css/pmd-reservationsnew-layout-v1.css?v=20260725-2">
@include('admin::reservations2.index')

<style id="pmd-reservationsnew-final-layout-v3">
/* =========================================================
   PMD Reservationsnew Final Layout V3
   Must remain AFTER the Reservations2 include.
   ========================================================= */

html.pmd-reservationsnew-route,
html.pmd-reservationsnew-route body {
    overflow-x: hidden !important;
}

/*
 * The global shell already reserves the sidebar position.
 * Force the final page-content geometry after every old
 * Reservations2/exact-layout stylesheet has loaded.
 */
html.pmd-reservationsnew-route body .page-content {
    position: relative !important;
    left: 0 !important;
    right: auto !important;

    width: calc(100% - 88px) !important;
    max-width: none !important;

    margin-left: 88px !important;
    margin-right: 0 !important;

    padding-left: 16px !important;
    padding-right: 16px !important;

    transform: none !important;
    translate: none !important;
    box-sizing: border-box !important;
}

/* Remove legacy centered/max-width wrappers. */
html.pmd-reservationsnew-route body .page-content > .container,
html.pmd-reservationsnew-route body .page-content > .container-fluid,
html.pmd-reservationsnew-route body .page-content .container,
html.pmd-reservationsnew-route body .page-content .container-fluid {
    width: 100% !important;
    max-width: none !important;

    margin-left: 0 !important;
    margin-right: 0 !important;

    padding-left: 0 !important;
    padding-right: 0 !important;

    transform: none !important;
    box-sizing: border-box !important;
}

/* Reservations workspace itself must begin immediately. */
html.pmd-reservationsnew-route body #pmd-reservations2 {
    position: relative !important;
    left: 0 !important;
    right: auto !important;

    width: 100% !important;
    max-width: none !important;

    margin: 0 !important;
    padding: 0 !important;

    transform: none !important;
    translate: none !important;
    box-sizing: border-box !important;
}

/* All principal sections follow the same left boundary. */
html.pmd-reservationsnew-route body #pmd-r2-clean-header,
html.pmd-reservationsnew-route body .pmd-r2-kpis,
html.pmd-reservationsnew-route body #pmd-r2-shared-floor-canvas-v310,
html.pmd-reservationsnew-route body #pmd-r2-calendar-surface-v160,
html.pmd-reservationsnew-route body .pmd-r2-reservation-cards-v320 {
    width: 100% !important;
    max-width: none !important;

    margin-left: 0 !important;
    margin-right: 0 !important;

    transform: none !important;
    translate: none !important;
    box-sizing: border-box !important;
}

/* Prevent the old exact-layout runtime from visually shifting it. */
html.pmd-reservationsnew-route body #pmd-reservations2,
html.pmd-reservationsnew-route body #pmd-reservations2 * {
    animation-delay: 0s !important;
}

/* Expanded sidebar state. */
html.pmd-reservationsnew-route.pmd-sm2-expanded body .page-content {
    width: calc(100% - 256px) !important;
    margin-left: 256px !important;
}

/* Mobile shell does not reserve desktop sidebar width. */
@media (max-width: 991.98px) {
    html.pmd-reservationsnew-route body .page-content,
    html.pmd-reservationsnew-route.pmd-sm2-expanded body .page-content {
        width: 100% !important;
        margin-left: 0 !important;
        padding-left: 12px !important;
        padding-right: 12px !important;
    }
}
</style>
