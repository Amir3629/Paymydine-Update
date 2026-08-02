<script id="pmd-dashboard2-r2-exact-route-class">
document.documentElement.classList.add('pmd-dashboard2-r2-exact');
</script>

<style id="pmd-dashboard2-r2-exact-shell-geometry">
html.pmd-dashboard2-r2-exact body.page {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    min-height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
}

html.pmd-dashboard2-r2-exact body.page > .page-wrapper {
    display: block !important;
    position: relative !important;
    inset: auto !important;
    flex: none !important;
    width: 100vw !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: none !important;
}

@media (min-width: 821px) {
    html.pmd-dashboard2-r2-exact.pmd-sm2-collapsed
    body #pmd-reservations2 {
        width: calc(100vw - 114px) !important;
        max-width: calc(100vw - 114px) !important;
        margin-left: 100px !important;
        margin-right: 14px !important;
    }

    html.pmd-dashboard2-r2-exact.pmd-sm2-expanded
    body #pmd-reservations2 {
        width: calc(100vw - 226px) !important;
        max-width: calc(100vw - 226px) !important;
        margin-left: 212px !important;
        margin-right: 14px !important;
    }
}

@media (max-width: 820px) {
    html.pmd-dashboard2-r2-exact body.page > .page-wrapper,
    html.pmd-dashboard2-r2-exact body #pmd-reservations2,
    html.pmd-dashboard2-r2-exact.pmd-sm2-collapsed
    body #pmd-reservations2,
    html.pmd-dashboard2-r2-exact.pmd-sm2-expanded
    body #pmd-reservations2 {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
    }
}
</style>

@include('admin::reservations2.index')
