{{-- 
PMD_SINGLE_SIDE_MENU_STYLE_V1

This file is copied directly from Reservations2.
It is the single visual authority for Side Menu 2.
--}}
<!-- PMD_SM2_CRITICAL_LOGO_START -->
<style id="pmd-sm2-critical-logo">
  /*
   * Runs inside the initial HTML response.
   * Prevents any incorrect logo from appearing before
   * the external Side Menu stylesheet finishes loading.
   */
  #pmd-side-menu2 .pmd-sm2__brand {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    height: 116px !important;
    min-height: 116px !important;
    padding: 8px !important;
    overflow: hidden !important;
  }

  #pmd-side-menu2 .pmd-sm2__brand
    > :not(#pmd-side-menu2-logo) {
    display: none !important;
  }

  #pmd-side-menu2 .pmd-sm2__brand img,
  #pmd-side-menu2 .pmd-sm2__brand svg,
  #pmd-side-menu2 .pmd-sm2__brand picture,
  #pmd-side-menu2 .pmd-sm2__brand-text,
  #pmd-side-menu2 .logo,
  #pmd-side-menu2 .logo-svg {
    display: none !important;
  }

  #pmd-side-menu2-logo {
    display: block !important;
    width: 96px !important;
    height: 82px !important;
    flex: 0 0 96px !important;
    overflow: hidden !important;

    background-image:
      url("/app/admin/assets/images/paymydine-logo.svg?v=20260718-8")
      !important;

    background-repeat: no-repeat !important;
    background-size: 132px auto !important;
    background-position: center -5px !important;

    opacity: 1 !important;
    visibility: visible !important;
    transform: none !important;
  }

  html.pmd-sm2-collapsed #pmd-side-menu2-logo {
    width: 48px !important;
    height: 54px !important;
    flex-basis: 48px !important;
    background-size: 80px auto !important;
    background-position: center -3px !important;
  }

  html.pmd-sm2-collapsed
    #pmd-side-menu2 .pmd-sm2__brand {
    height: 96px !important;
    min-height: 96px !important;
  }
</style>
<!-- PMD_SM2_CRITICAL_LOGO_END -->
