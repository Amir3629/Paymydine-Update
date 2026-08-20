{{-- PMD_SETTINGS_FAMILY_FIRST_PAINT_V18 --}}
<style id="pmd-settings-family-first-paint-v18">

/*
 * ============================================================
 * SETTINGS DETAIL FAMILY V18
 *
 * IMPORTANT:
 * This partial is rendered AFTER each page's own legacy/local CSS
 * but BEFORE the visible page root/header.
 *
 * Therefore first paint already equals final geometry.
 * ============================================================
 */


/* ------------------------------------------------------------
   SHELL
   ------------------------------------------------------------ */

html.pmd-settings-family-v18-route {
    scrollbar-gutter: stable !important;
    scroll-behavior: auto !important;
    background: #f8fbfd !important;
}


html.pmd-settings-family-v18-route body {
    margin-left: 0 !important;
    padding-left: 0 !important;

    overflow-x: hidden !important;

    background: #f8fbfd !important;
}


html.pmd-settings-family-v18-route
.page-wrapper {
    position: relative !important;

    left: 0 !important;
    right: auto !important;
    top: 0 !important;
    bottom: auto !important;

    margin-right: 0 !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;

    padding-left: 0 !important;
    padding-right: 0 !important;

    max-width: none !important;
    min-width: 0 !important;

    height: auto !important;
    min-height: 100vh !important;
    max-height: none !important;

    box-sizing: border-box !important;

    overflow-x: hidden !important;
    overflow-y: visible !important;

    opacity: 1 !important;
    visibility: visible !important;

    transform: none !important;
    translate: none !important;

    animation: none !important;
    transition: none !important;

    will-change: auto !important;
}


@media (min-width: 821px) {

    html.pmd-settings-family-v18-route.pmd-sm2-collapsed
    body
    .page-wrapper {
        margin-left: 86px !important;
        width: calc(100vw - 86px) !important;
    }


    html.pmd-settings-family-v18-route.pmd-sm2-expanded
    body
    .page-wrapper {
        margin-left: 198px !important;
        width: calc(100vw - 198px) !important;
    }
}


@media (max-width: 820px) {

    html.pmd-settings-family-v18-route
    body
    .page-wrapper {
        margin-left: 0 !important;
        width: 100% !important;
    }
}


html.pmd-settings-family-v18-route
.page-content {
    position: relative !important;

    left: 0 !important;
    right: auto !important;
    top: 0 !important;
    bottom: auto !important;

    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;

    margin: 0 !important;

    padding-left: 0 !important;
    padding-right: 0 !important;

    box-sizing: border-box !important;

    overflow-x: hidden !important;

    opacity: 1 !important;
    visibility: visible !important;

    transform: none !important;
    translate: none !important;

    animation: none !important;
    transition: none !important;

    will-change: auto !important;
}


html.pmd-settings-family-v18-route:not(.pmd-sm2-runtime-ready)
#pmd-side-menu2 {
    transition: none !important;
}


/* ------------------------------------------------------------
   HEADER
   ------------------------------------------------------------ */

html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
) {
    box-sizing: border-box !important;

    position: relative !important;
    inset: auto !important;

    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;

    gap: 20px !important;

    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;

    height: 64px !important;
    min-height: 64px !important;
    max-height: 64px !important;

    margin-top: 0 !important;
    margin-bottom: 18px !important;

    padding-top: 0 !important;
    padding-bottom: 0 !important;

    border: 0 !important;
    border-radius: 0 !important;

    background: transparent !important;
    box-shadow: none !important;

    opacity: 1 !important;
    visibility: visible !important;

    transform: none !important;
    translate: none !important;

    animation: none !important;
    transition: none !important;
}


html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
:is(
    .pmd-profile-header__left,
    .pmd-menu-header__left,
    .pmd-team-header__left,
    .pmd-frontend-header__left,
    .pmd-owner-header__left
) {
    display: flex !important;
    align-items: center !important;

    gap: 10px !important;

    min-width: 0 !important;

    margin: 0 !important;
    padding: 0 !important;
}


html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
:is(
    .pmd-profile-header__actions,
    .pmd-menu-header__actions,
    .pmd-team-header__actions,
    .pmd-frontend-header__actions,
    .pmd-owner-header__actions,
    [data-pmd-profile-header-actions],
    [data-pmd-menu-header-actions],
    [data-pmd-team-actions],
    [data-pmd-owner-header-actions]
) {
    box-sizing: border-box !important;

    position: relative !important;

    display: flex !important;
    flex-direction: row !important;
    direction: ltr !important;

    align-items: center !important;
    justify-content: flex-end !important;

    gap: 10px !important;

    min-width: 0 !important;
    min-height: 46px !important;

    margin-left: auto !important;
    margin-right: 0 !important;

    padding: 0 !important;

    transform: none !important;

    animation: none !important;
    transition: none !important;
}


html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
h1 {
    margin: 0 !important;
    padding: 0 !important;

    color: #17231f !important;

    font-size: 22px !important;
    line-height: 1.15 !important;
    font-weight: 760 !important;

    letter-spacing: -.02em !important;
}


/* ------------------------------------------------------------
   FINAL DASHBOARD BUTTON CONTRACT
   ------------------------------------------------------------ */

html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
:is(
    .pmd-profile-header-button,
    .pmd-menu-header-button,
    .pmd-team-btn,
    .pmd-frontend-icon-button,
    .pmd-frontend-save-icon,
    .pmd-owner-header-button,
    [data-pmd-owner-save]
) {
    box-sizing: border-box !important;

    width: 46px !important;
    min-width: 46px !important;
    max-width: 46px !important;

    height: 46px !important;
    min-height: 46px !important;
    max-height: 46px !important;

    flex: 0 0 46px !important;

    margin: 0 !important;
    padding: 0 !important;

    border: 1px solid #cfe0ec !important;
    border-radius: 14px !important;

    background: #fff !important;
    color: #173752 !important;

    box-shadow:
        0 3px 10px rgba(23,55,82,.05)
        !important;

    transform: none !important;

    animation: none !important;
    transition: none !important;

    -webkit-appearance: none !important;
    appearance: none !important;
}


html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
:is(
    .pmd-profile-header-button,
    .pmd-menu-header-button,
    .pmd-team-btn,
    .pmd-frontend-icon-button,
    .pmd-frontend-save-icon,
    .pmd-owner-header-button,
    [data-pmd-owner-save]
)
svg {
    display: block !important;

    width: 21px !important;
    height: 21px !important;

    margin: auto !important;
    padding: 0 !important;

    fill: none !important;
    stroke: currentColor !important;
    stroke-width: 2 !important;

    stroke-linecap: round !important;
    stroke-linejoin: round !important;

    transform: none !important;
}


/* ------------------------------------------------------------
   CLEAN SAVE MUST NEVER FLASH
   ------------------------------------------------------------ */

html.pmd-settings-family-v18-route
body
#pmd-profile-header
button.pmd-profile-save-icon:not(.is-visible) {
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;

    width: 0 !important;
    min-width: 0 !important;
    max-width: 0 !important;

    flex: 0 0 0 !important;

    margin: 0 -10px 0 0 !important;
    padding: 0 !important;

    border-width: 0 !important;

    transform: none !important;

    animation: none !important;
    transition: none !important;
}


html.pmd-settings-family-v18-route
body
#pmd-profile-header
button.pmd-profile-save-icon.is-visible {
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;

    width: 46px !important;
    min-width: 46px !important;
    max-width: 46px !important;

    flex: 0 0 46px !important;

    margin: 0 !important;

    border-width: 1px !important;

    transform: none !important;

    transition: none !important;
}


html.pmd-settings-family-v18-route
body
#pmd-menu-header
.pmd-menu-save-icon {
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;

    width: 0 !important;
    min-width: 0 !important;
    max-width: 0 !important;

    flex: 0 0 0 !important;

    margin: 0 -10px 0 0 !important;

    border-width: 0 !important;

    transform: none !important;

    animation: none !important;
    transition: none !important;
}


html.pmd-settings-family-v18-route.pmd-menu-dirty
body
#pmd-menu-header
.pmd-menu-save-icon {
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;

    width: 46px !important;
    min-width: 46px !important;
    max-width: 46px !important;

    flex: 0 0 46px !important;

    margin: 0 !important;

    border-width: 1px !important;
}


html.pmd-settings-family-v18-route
body
.pmd-owner-header
[data-pmd-owner-save]:not(.is-visible) {
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;

    width: 0 !important;
    min-width: 0 !important;
    max-width: 0 !important;

    flex: 0 0 0 !important;

    margin: 0 -10px 0 0 !important;

    border-width: 0 !important;

    transform: none !important;

    animation: none !important;
    transition: none !important;
}


html.pmd-settings-family-v18-route
body
.pmd-owner-header
[data-pmd-owner-save].is-visible {
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;

    width: 46px !important;
    min-width: 46px !important;
    max-width: 46px !important;

    flex: 0 0 46px !important;

    margin: 0 !important;

    border-width: 1px !important;

    transform: none !important;
}


/* ------------------------------------------------------------
   NOTIFICATION FOOTPRINT
   ------------------------------------------------------------ */

html.pmd-settings-family-v18-route
body
.pmd-settings-family-notif-slot-v18 {
    box-sizing: border-box !important;

    position: relative !important;

    order: 100 !important;

    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;

    width: 66px !important;
    min-width: 66px !important;
    max-width: 66px !important;

    height: 46px !important;
    min-height: 46px !important;
    max-height: 46px !important;

    flex: 0 0 66px !important;

    margin: 0 !important;
    padding: 0 !important;

    border: 0 !important;

    background: transparent !important;

    overflow: visible !important;

    transform: none !important;

    animation: none !important;
    transition: none !important;
}


html.pmd-settings-family-v18-route
body
.pmd-settings-family-notif-slot-v18::before {
    content: "" !important;

    position: absolute !important;

    left: 5px !important;
    top: 6px !important;

    width: 1px !important;
    height: 34px !important;

    margin: 0 !important;
    padding: 0 !important;

    border: 0 !important;

    background: #cfe0ec !important;

    pointer-events: none !important;
}


html.pmd-settings-family-v18-route
body
.pmd-settings-family-notif-visual-v18 {
    box-sizing: border-box !important;

    position: relative !important;

    display: grid !important;
    place-items: center !important;

    width: 46px !important;
    min-width: 46px !important;
    max-width: 46px !important;

    height: 46px !important;
    min-height: 46px !important;
    max-height: 46px !important;

    margin: 0 !important;
    padding: 0 !important;

    border: 1px solid #cfe0ec !important;
    border-radius: 14px !important;

    background: #fff !important;
    color: #173752 !important;

    box-shadow:
        0 3px 10px rgba(23,55,82,.05)
        !important;

    pointer-events: none !important;
}


html.pmd-settings-family-v18-route
body
.pmd-settings-family-notif-bell-v18,
html.pmd-settings-family-v18-route
body
.pmd-settings-family-notif-bell-v18 svg {
    display: block !important;

    width: 21px !important;
    height: 21px !important;

    margin: 0 !important;
    padding: 0 !important;
}


html.pmd-settings-family-v18-route
body
.pmd-settings-family-notif-bell-v18 svg {
    fill: none !important;
    stroke: currentColor !important;
    stroke-width: 2 !important;

    stroke-linecap: round !important;
    stroke-linejoin: round !important;
}


html.pmd-settings-family-v18-route
body
.pmd-settings-family-notif-count-v18 {
    box-sizing: border-box !important;

    position: absolute !important;

    top: -7px !important;
    right: -8px !important;

    z-index: 20 !important;

    display: flex !important;
    align-items: center !important;
    justify-content: center !important;

    min-width: 22px !important;

    height: 18px !important;
    min-height: 18px !important;
    max-height: 18px !important;

    padding: 0 5px !important;

    border: 2px solid #f8fbfd !important;
    border-radius: 999px !important;

    background: #df3b32 !important;
    color: #fff !important;

    font-size: 9px !important;
    line-height: 14px !important;
    font-weight: 800 !important;

    white-space: nowrap !important;
}


/* ------------------------------------------------------------
   OLD PAGE JS MAY TEMPORARILY APPEND REAL ROOT DIRECTLY.
   KEEP IT ABSOLUTE OVER THE ALREADY-RESERVED SLOT.
   ------------------------------------------------------------ */

html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
:is(
    .pmd-profile-header__actions,
    .pmd-menu-header__actions,
    .pmd-team-header__actions,
    .pmd-frontend-header__actions,
    .pmd-owner-header__actions,
    [data-pmd-profile-header-actions],
    [data-pmd-menu-header-actions],
    [data-pmd-team-actions],
    [data-pmd-owner-header-actions]
)
> #notif-root {
    position: absolute !important;

    top: 0 !important;
    right: 0 !important;
    bottom: auto !important;
    left: auto !important;

    z-index: 30 !important;

    margin: 0 !important;

    opacity: 1 !important;
    visibility: visible !important;
}


html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
:is(
    .pmd-profile-header__actions,
    .pmd-menu-header__actions,
    .pmd-team-header__actions,
    .pmd-frontend-header__actions,
    .pmd-owner-header__actions,
    [data-pmd-profile-header-actions],
    [data-pmd-menu-header-actions],
    [data-pmd-team-actions],
    [data-pmd-owner-header-actions]
):has(> #notif-root)
.pmd-settings-family-notif-visual-v18 {
    opacity: 0 !important;
    visibility: hidden !important;
}


/* ------------------------------------------------------------
   REAL NOTIFICATION IN FINAL SLOT
   ------------------------------------------------------------ */

html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
.pmd-settings-family-notif-slot-v18
> #notif-root,
html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
:is(
    .pmd-profile-header__actions,
    .pmd-menu-header__actions,
    .pmd-team-header__actions,
    .pmd-frontend-header__actions,
    .pmd-owner-header__actions,
    [data-pmd-profile-header-actions],
    [data-pmd-menu-header-actions],
    [data-pmd-team-actions],
    [data-pmd-owner-header-actions]
)
> #notif-root {
    box-sizing: border-box !important;

    width: 46px !important;
    min-width: 46px !important;
    max-width: 46px !important;

    height: 46px !important;
    min-height: 46px !important;
    max-height: 46px !important;

    flex: 0 0 46px !important;

    padding: 0 !important;

    border: 0 !important;

    background: transparent !important;

    list-style: none !important;

    overflow: visible !important;

    opacity: 1 !important;
    visibility: visible !important;

    transform: none !important;

    animation: none !important;
    transition: none !important;
}


html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
.pmd-settings-family-notif-slot-v18
> #notif-root {
    position: relative !important;
    inset: auto !important;
    margin: 0 !important;
}


html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
#notif-root
> .media-toolbar-tooltip-wrap {
    box-sizing: border-box !important;

    display: block !important;

    width: 46px !important;
    height: 46px !important;

    margin: 0 !important;
    padding: 0 !important;
}


html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
#notifDropdown {
    box-sizing: border-box !important;

    position: relative !important;
    inset: auto !important;

    display: grid !important;
    place-items: center !important;

    width: 46px !important;
    min-width: 46px !important;
    max-width: 46px !important;

    height: 46px !important;
    min-height: 46px !important;
    max-height: 46px !important;

    margin: 0 !important;
    padding: 0 !important;

    border: 1px solid #cfe0ec !important;
    border-radius: 14px !important;

    background: #fff !important;
    color: #173752 !important;

    box-shadow:
        0 3px 10px rgba(23,55,82,.05)
        !important;

    line-height: 1 !important;

    overflow: visible !important;

    opacity: 1 !important;
    visibility: visible !important;

    transform: none !important;

    animation: none !important;
    transition: none !important;
}


html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
#notifDropdown::after {
    display: none !important;
    content: none !important;
}


html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
#bell-icon {
    box-sizing: border-box !important;

    position: static !important;
    inset: auto !important;

    display: grid !important;
    place-items: center !important;

    width: 21px !important;
    min-width: 21px !important;
    max-width: 21px !important;

    height: 21px !important;
    min-height: 21px !important;
    max-height: 21px !important;

    margin: 0 !important;
    padding: 0 !important;

    color: #173752 !important;

    font-size: 0 !important;
    line-height: 0 !important;

    transform: none !important;

    pointer-events: none !important;
}


html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
#bell-icon svg {
    display: block !important;

    width: 21px !important;
    height: 21px !important;

    margin: 0 !important;
    padding: 0 !important;

    fill: none !important;
    stroke: currentColor !important;
    stroke-width: 2 !important;

    stroke-linecap: round !important;
    stroke-linejoin: round !important;

    transform: none !important;
}


html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
#notification-count {
    box-sizing: border-box !important;

    position: absolute !important;

    top: -7px !important;
    right: -8px !important;
    left: auto !important;

    z-index: 20 !important;

    display: flex !important;
    align-items: center !important;
    justify-content: center !important;

    min-width: 22px !important;

    height: 18px !important;
    min-height: 18px !important;
    max-height: 18px !important;

    margin: 0 !important;
    padding: 0 5px !important;

    border: 2px solid #f8fbfd !important;
    border-radius: 999px !important;

    background: #df3b32 !important;
    color: #fff !important;

    font-size: 9px !important;
    line-height: 14px !important;
    font-weight: 800 !important;

    white-space: nowrap !important;

    opacity: 1 !important;
    visibility: visible !important;

    transform: none !important;
}


html.pmd-settings-family-v18-route
body
#notification-count.d-none {
    display: none !important;
}


html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
[data-pmd-main-header-notification-divider-r66],
html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
[data-pmd-main-header-notification-divider-r67] {
    display: none !important;
}


/*
 * Restaurant/Menu boot CSS used to hide the real #notif-root.
 * Once it is mounted into the V18 Header it must be visible.
 */
html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
#notif-root {
    opacity: 1 !important;
    visibility: visible !important;
}


/* ------------------------------------------------------------
   PAGE STRUCTURE NEVER DOES BOOT ANIMATION
   ------------------------------------------------------------ */

html.pmd-settings-family-v18-route
body
:is(
    #pmd-restaurant-profile,
    #pmd-frontend-settings,
    #pmd-menu-checkout,
    #pmd-team-access,
    .pmd-owner-page
) {
    opacity: 1 !important;
    visibility: visible !important;

    transform: none !important;
    translate: none !important;

    animation: none !important;
    transition: none !important;

    will-change: auto !important;
}



/* PMD_SETTINGS_FAMILY_SHELL_SPECIFICITY_V18_1_START */

/*
 * ============================================================
 * V18.1 SHELL SPECIFICITY REPAIR
 * ============================================================
 *
 * Several old Settings styles use selectors such as:
 *
 *   body:has(#pmd-restaurant-profile) .page-wrapper
 *
 * and set margin-left:0!important.
 *
 * Because :has(#id) contributes ID specificity, the previous
 * class-only V18 selector could not beat it.
 *
 * This block stays inside the SAME V18 first-paint authority,
 * but uses route-root specificity strong enough to own the shell.
 *
 * The values are derived from the canonical Side Menu variables:
 *
 * collapsed = 14 + 72  = 86px
 * expanded  = 14 + 184 = 198px
 *
 * We use the variables themselves so later legitimate Side Menu
 * dimension changes do not require another Settings patch.
 */


/* ------------------------------------------------------------
   DESKTOP COLLAPSED
   ------------------------------------------------------------ */

@media (min-width: 821px) {

    html.pmd-settings-family-v18-route.pmd-sm2-collapsed
    body:has(#pmd-restaurant-profile)
    .page-wrapper,

    html.pmd-settings-family-v18-route.pmd-sm2-collapsed
    body:has(#pmd-frontend-settings)
    .page-wrapper,

    html.pmd-settings-family-v18-route.pmd-sm2-collapsed
    body:has(#pmd-menu-checkout)
    .page-wrapper,

    html.pmd-settings-family-v18-route.pmd-sm2-collapsed
    body:has(#pmd-team-access)
    .page-wrapper,

    html.pmd-settings-family-v18-route.pmd-sm2-collapsed
    body.page.pmd-admin-theme-v1:has(.pmd-owner-page)
    .page-wrapper,

    html.pmd-settings-family-v18-route.pmd-sm2-collapsed
    body.page.pmd-admin-theme-v1:has(.pmd-device-suite-header)
    .page-wrapper {
        position: relative !important;

        left: 0 !important;
        right: auto !important;

        margin-left:
            calc(
                var(--pmd-sm2-gap, 14px)
                + var(--pmd-sm2-collapsed, 72px)
            )
            !important;

        margin-right: 0 !important;

        width:
            calc(
                100vw
                - var(--pmd-sm2-gap, 14px)
                - var(--pmd-sm2-collapsed, 72px)
            )
            !important;

        max-width: none !important;
        min-width: 0 !important;

        transform: none !important;
        translate: none !important;

        animation: none !important;
        transition: none !important;
    }
}


/* ------------------------------------------------------------
   DESKTOP EXPANDED
   ------------------------------------------------------------ */

@media (min-width: 821px) {

    html.pmd-settings-family-v18-route.pmd-sm2-expanded
    body:has(#pmd-restaurant-profile)
    .page-wrapper,

    html.pmd-settings-family-v18-route.pmd-sm2-expanded
    body:has(#pmd-frontend-settings)
    .page-wrapper,

    html.pmd-settings-family-v18-route.pmd-sm2-expanded
    body:has(#pmd-menu-checkout)
    .page-wrapper,

    html.pmd-settings-family-v18-route.pmd-sm2-expanded
    body:has(#pmd-team-access)
    .page-wrapper,

    html.pmd-settings-family-v18-route.pmd-sm2-expanded
    body.page.pmd-admin-theme-v1:has(.pmd-owner-page)
    .page-wrapper,

    html.pmd-settings-family-v18-route.pmd-sm2-expanded
    body.page.pmd-admin-theme-v1:has(.pmd-device-suite-header)
    .page-wrapper {
        position: relative !important;

        left: 0 !important;
        right: auto !important;

        margin-left:
            calc(
                var(--pmd-sm2-gap, 14px)
                + var(--pmd-sm2-expanded, 184px)
            )
            !important;

        margin-right: 0 !important;

        width:
            calc(
                100vw
                - var(--pmd-sm2-gap, 14px)
                - var(--pmd-sm2-expanded, 184px)
            )
            !important;

        max-width: none !important;
        min-width: 0 !important;

        transform: none !important;
        translate: none !important;

        animation: none !important;
        transition: none !important;
    }
}


/* ------------------------------------------------------------
   MOBILE
   ------------------------------------------------------------ */

@media (max-width: 820px) {

    html.pmd-settings-family-v18-route
    body:has(#pmd-restaurant-profile)
    .page-wrapper,

    html.pmd-settings-family-v18-route
    body:has(#pmd-frontend-settings)
    .page-wrapper,

    html.pmd-settings-family-v18-route
    body:has(#pmd-menu-checkout)
    .page-wrapper,

    html.pmd-settings-family-v18-route
    body:has(#pmd-team-access)
    .page-wrapper,

    html.pmd-settings-family-v18-route
    body.page.pmd-admin-theme-v1:has(.pmd-owner-page)
    .page-wrapper,

    html.pmd-settings-family-v18-route
    body.page.pmd-admin-theme-v1:has(.pmd-device-suite-header)
    .page-wrapper {
        position: relative !important;

        left: 0 !important;
        right: auto !important;

        margin-left: 0 !important;
        margin-right: 0 !important;

        width: 100% !important;
        max-width: 100% !important;

        transform: none !important;
        translate: none !important;

        animation: none !important;
        transition: none !important;
    }
}


/*
 * Restaurant's own V10 spacing authority remains useful:
 * it supplies the one 16px content gutter INSIDE the correctly
 * shifted wrapper. Do not zero or duplicate that gutter here.
 */


/* PMD_SETTINGS_FAMILY_SHELL_SPECIFICITY_V18_1_END */



/* PMD_SETTINGS_FAMILY_NOTIFICATION_STABLE_VISUAL_V18_2_START */

/*
 * ============================================================
 * SETTINGS NOTIFICATION V18.2
 * PERMANENT FIRST-PAINT VISUAL
 * ============================================================
 *
 * The visible button NEVER gets replaced.
 *
 * Visual owner:
 *   .pmd-settings-family-notif-visual-v18
 *
 * Interaction owner:
 *   real #notif-root / #notifDropdown
 *
 * Live count owner:
 *   real #notification-count node
 *
 * The real trigger becomes a transparent overlay on the
 * permanent server-first visual.
 * ============================================================
 */


html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
.pmd-settings-family-notif-slot-v18 {
    position: relative !important;

    display: block !important;

    width: 66px !important;
    min-width: 66px !important;
    max-width: 66px !important;

    height: 46px !important;
    min-height: 46px !important;
    max-height: 46px !important;

    flex: 0 0 66px !important;

    margin: 0 !important;
    padding: 0 !important;

    overflow: visible !important;

    isolation: isolate !important;

    transform: none !important;

    animation: none !important;
    transition: none !important;
}


/*
 * The divider also never changes.
 */
html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
.pmd-settings-family-notif-slot-v18::before {
    content: "" !important;

    position: absolute !important;

    left: 5px !important;
    top: 6px !important;

    display: block !important;

    width: 1px !important;
    min-width: 1px !important;
    max-width: 1px !important;

    height: 34px !important;
    min-height: 34px !important;
    max-height: 34px !important;

    margin: 0 !important;
    padding: 0 !important;

    border: 0 !important;

    background: #cfe0ec !important;

    opacity: 1 !important;
    visibility: visible !important;

    pointer-events: none !important;

    transform: none !important;

    animation: none !important;
    transition: none !important;
}


/*
 * Permanent visible button.
 *
 * IMPORTANT:
 * This stays visible even when a legacy page script temporarily
 * moves #notif-root directly into Header actions.
 */
html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
.pmd-settings-family-notif-slot-v18
> .pmd-settings-family-notif-visual-v18 {
    box-sizing: border-box !important;

    position: absolute !important;

    top: 0 !important;
    right: 0 !important;
    bottom: auto !important;
    left: auto !important;

    z-index: 20 !important;

    display: grid !important;
    place-items: center !important;

    width: 46px !important;
    min-width: 46px !important;
    max-width: 46px !important;

    height: 46px !important;
    min-height: 46px !important;
    max-height: 46px !important;

    margin: 0 !important;
    padding: 0 !important;

    border: 1px solid #cfe0ec !important;
    border-radius: 14px !important;

    background: #fff !important;
    color: #173752 !important;

    box-shadow:
        0 3px 10px rgba(23,55,82,.05)
        !important;

    opacity: 1 !important;
    visibility: visible !important;

    overflow: visible !important;

    pointer-events: none !important;

    transform: none !important;

    animation: none !important;
    transition: none !important;
}


/*
 * Beat the older V18 rule that hid the placeholder when
 * #notif-root became a direct action child.
 */
html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
:is(
    .pmd-profile-header__actions,
    .pmd-menu-header__actions,
    .pmd-team-header__actions,
    .pmd-frontend-header__actions,
    .pmd-owner-header__actions,
    [data-pmd-profile-header-actions],
    [data-pmd-menu-header-actions],
    [data-pmd-team-actions],
    [data-pmd-owner-header-actions]
):has(> #notif-root)
.pmd-settings-family-notif-slot-v18
> .pmd-settings-family-notif-visual-v18 {
    opacity: 1 !important;
    visibility: visible !important;
}


/*
 * Static Bell is the ONLY visible Bell.
 */
html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
.pmd-settings-family-notif-bell-v18,
html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
.pmd-settings-family-notif-bell-v18
svg {
    display: block !important;

    width: 21px !important;
    min-width: 21px !important;
    max-width: 21px !important;

    height: 21px !important;
    min-height: 21px !important;
    max-height: 21px !important;

    margin: 0 !important;
    padding: 0 !important;

    opacity: 1 !important;
    visibility: visible !important;

    transform: none !important;

    animation: none !important;
    transition: none !important;
}


/* ------------------------------------------------------------
   REAL ROOT = TRANSPARENT INTERACTION LAYER
   ------------------------------------------------------------ */

html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
.pmd-settings-family-notif-slot-v18
> #notif-root,

html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
:is(
    .pmd-profile-header__actions,
    .pmd-menu-header__actions,
    .pmd-team-header__actions,
    .pmd-frontend-header__actions,
    .pmd-owner-header__actions,
    [data-pmd-profile-header-actions],
    [data-pmd-menu-header-actions],
    [data-pmd-team-actions],
    [data-pmd-owner-header-actions]
)
> #notif-root {
    box-sizing: border-box !important;

    position: absolute !important;

    top: 0 !important;
    right: 0 !important;
    bottom: auto !important;
    left: auto !important;

    z-index: 30 !important;

    display: block !important;

    width: 46px !important;
    min-width: 46px !important;
    max-width: 46px !important;

    height: 46px !important;
    min-height: 46px !important;
    max-height: 46px !important;

    flex: 0 0 46px !important;

    margin: 0 !important;
    padding: 0 !important;

    border: 0 !important;

    background: transparent !important;
    box-shadow: none !important;

    list-style: none !important;

    overflow: visible !important;

    opacity: 1 !important;
    visibility: visible !important;

    pointer-events: auto !important;

    transform: none !important;

    animation: none !important;
    transition: none !important;
}


/*
 * Beat Restaurant's runtime:
 *
 *   #pmd-profile-header #notifDropdown {
 *       width:42px!important;
 *       background:#fff!important;
 *       border:...
 *   }
 *
 * Real trigger has ZERO visible paint.
 */
html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
#notif-root
#notifDropdown {
    box-sizing: border-box !important;

    position: absolute !important;

    inset: 0 !important;

    z-index: 1 !important;

    display: block !important;

    width: 46px !important;
    min-width: 46px !important;
    max-width: 46px !important;

    height: 46px !important;
    min-height: 46px !important;
    max-height: 46px !important;

    margin: 0 !important;
    padding: 0 !important;

    border: 0 !important;
    border-color: transparent !important;
    border-radius: 14px !important;

    background: transparent !important;

    box-shadow: none !important;

    color: transparent !important;

    opacity: 1 !important;
    visibility: visible !important;

    overflow: visible !important;

    cursor: pointer !important;

    transform: none !important;

    animation: none !important;
    transition: none !important;

    -webkit-appearance: none !important;
    appearance: none !important;
}


html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
#notif-root
#notifDropdown::after {
    display: none !important;
    content: none !important;
}


/*
 * Real Bell remains in the real notification DOM because legacy
 * scripts may expect #bell-icon.
 *
 * But it NEVER paints.
 */
html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
#notif-root
#bell-icon {
    opacity: 0 !important;
    visibility: hidden !important;

    pointer-events: none !important;

    transform: none !important;

    animation: none !important;
    transition: none !important;
}


/*
 * While the live count is still inside #notif-root it must not
 * paint on top of the server-first count.
 */
html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
#notif-root
#notification-count {
    opacity: 0 !important;
    visibility: hidden !important;

    pointer-events: none !important;
}


/*
 * Once V18.2 moves the SAME real count node into the permanent
 * visual, it becomes the sole visible/live badge.
 */
html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
.pmd-settings-family-notif-visual-v18
> #notification-count {
    box-sizing: border-box !important;

    position: absolute !important;

    top: -7px !important;
    right: -8px !important;
    bottom: auto !important;
    left: auto !important;

    z-index: 50 !important;

    display: flex !important;
    align-items: center !important;
    justify-content: center !important;

    width: auto !important;
    min-width: 22px !important;
    max-width: none !important;

    height: 18px !important;
    min-height: 18px !important;
    max-height: 18px !important;

    margin: 0 !important;
    padding: 0 5px !important;

    border: 2px solid #f8fbfd !important;
    border-radius: 999px !important;

    background: #df3b32 !important;
    color: #fff !important;

    font-size: 9px !important;
    line-height: 14px !important;
    font-weight: 800 !important;

    text-align: center !important;
    white-space: nowrap !important;

    opacity: 1 !important;
    visibility: visible !important;

    pointer-events: none !important;

    transform: none !important;

    animation: none !important;
    transition: none !important;
}


html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
.pmd-settings-family-notif-visual-v18
> #notification-count.d-none {
    display: none !important;
}


/*
 * Hover/focus changes the STATIC frame,
 * not the transparent real trigger.
 */
html.pmd-settings-family-v18-route
body
.pmd-settings-family-notif-slot-v18:has(#notifDropdown:hover)
> .pmd-settings-family-notif-visual-v18 {
    background: #f1f7fb !important;
    border-color: #9fc6dc !important;
}


html.pmd-settings-family-v18-route
body
.pmd-settings-family-notif-slot-v18:has(#notifDropdown:focus-visible)
> .pmd-settings-family-notif-visual-v18 {
    outline: 2px solid rgba(23,55,82,.16) !important;
    outline-offset: 2px !important;
}


/* PMD_SETTINGS_FAMILY_NOTIFICATION_STABLE_VISUAL_V18_2_END */



/* PMD_SETTINGS_FAMILY_PERMANENT_COUNT_V18_3_START */

/*
 * ============================================================
 * V18.3 PERMANENT NOTIFICATION COUNTER
 * ============================================================
 *
 * There is no visible badge-node replacement anymore.
 *
 * The server-rendered V18 counter stays visible permanently.
 * The real #notification-count remains the notification
 * engine's data node, but never paints.
 * ============================================================
 */


html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
.pmd-settings-family-notif-visual-v18
> [data-pmd-settings-family-notification-count-v18] {
    box-sizing: border-box !important;

    position: absolute !important;

    top: -7px !important;
    right: -8px !important;
    bottom: auto !important;
    left: auto !important;

    z-index: 50 !important;

    display: flex !important;
    align-items: center !important;
    justify-content: center !important;

    width: auto !important;

    min-width: 22px !important;
    max-width: none !important;

    height: 18px !important;
    min-height: 18px !important;
    max-height: 18px !important;

    margin: 0 !important;
    padding: 0 5px !important;

    border: 2px solid #f8fbfd !important;
    border-radius: 999px !important;

    background: #df3b32 !important;
    color: #fff !important;

    font-family: inherit !important;

    font-size: 9px !important;
    line-height: 14px !important;
    font-weight: 800 !important;

    font-variant-numeric: tabular-nums !important;
    font-feature-settings: "tnum" 1 !important;

    letter-spacing: 0 !important;

    text-align: center !important;
    white-space: nowrap !important;

    opacity: 1 !important;
    visibility: visible !important;

    pointer-events: none !important;

    transform: none !important;

    animation: none !important;
    transition: none !important;

    will-change: auto !important;
}


html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
.pmd-settings-family-notif-visual-v18
> [data-pmd-settings-family-notification-count-v18].d-none {
    display: none !important;
}


/*
 * REAL notification count:
 * data/API owner only.
 * Never participates in paint or geometry.
 */
html.pmd-settings-family-v18-route
body
:is(
    #pmd-profile-header,
    #pmd-menu-header,
    #pmd-team-header,
    .pmd-frontend-header,
    .pmd-device-suite-header,
    .pmd-owner-header
)
#notif-root
#notification-count {
    display: none !important;

    opacity: 0 !important;
    visibility: hidden !important;

    width: 0 !important;
    min-width: 0 !important;
    max-width: 0 !important;

    height: 0 !important;
    min-height: 0 !important;
    max-height: 0 !important;

    margin: 0 !important;
    padding: 0 !important;

    border: 0 !important;

    pointer-events: none !important;

    transform: none !important;

    animation: none !important;
    transition: none !important;
}


/* PMD_SETTINGS_FAMILY_PERMANENT_COUNT_V18_3_END */

</style>
