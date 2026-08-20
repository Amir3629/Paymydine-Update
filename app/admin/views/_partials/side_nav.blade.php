{{-- PMD GLOBAL SIDE MENU 2 AUTHORITY --}}
@include('admin::_partials.pmd_side_menu2_global')

{{-- PMD_SIDEBAR_LANGUAGE_DIRECT_TOGGLE_20260807 --}}
@php
    $pmdCurrentLocale = strtolower(
        (string)request()->cookie(
            'pmd_admin_locale',
            app()->getLocale()
        )
    );

    if (!in_array(
        $pmdCurrentLocale,
        ['en', 'de'],
        true
    )) {
        $pmdCurrentLocale = 'en';
    }

    $pmdNextLocale =
        $pmdCurrentLocale === 'de'
            ? 'en'
            : 'de';

    $pmdLanguageEndpoint = url(
        config('system.adminUri', 'admin')
        .'/_pmd/language-switch-v3'
    );
@endphp


<!-- PMD_LANGUAGE_TRUE_FIRST_PAINT_V5 -->
<script id="pmd-language-first-paint-state-v5">
(function () {
    'use strict';

    if (window.innerWidth <= 820) {
        return;
    }

    var state = 'collapsed';

    try {
        state =
            localStorage.getItem(
                'pmd.sideMenu2.state'
            ) === 'expanded'
                ? 'expanded'
                : 'collapsed';
    } catch (error) {
        state = 'collapsed';
    }

    var html =
        document.documentElement;

    html.classList.toggle(
        'pmd-sm2-expanded',
        state === 'expanded'
    );

    html.classList.toggle(
        'pmd-sm2-collapsed',
        state !== 'expanded'
    );
})();
</script>

<style id="pmd-language-first-paint-css-v5">
#pmd-sidebar-language {
    position: fixed;
    left: 18px;
    bottom: 88px;
    z-index: 99999;
    font-family: inherit;
}

#pmd-sidebar-language,
#pmd-sidebar-language * {
    box-sizing: border-box;
}

#pmd-language-trigger {
    width: 52px;
    height: 46px;

    padding: 0 7px;

    border: 0;
    border-radius: 14px;

    background: rgba(255,255,255,.11);
    color: #fff;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 4px;

    cursor: pointer;

    font-family: inherit;

    transition:
        background .15s ease,
        transform .15s ease,
        width .18s ease;
}

#pmd-language-trigger:hover {
    background: rgba(255,255,255,.18);
}

#pmd-language-trigger:active {
    transform: scale(.97);
}

.pmd-language-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    width: 24px;
    height: 24px;

    color: #ffffff;

    flex: 0 0 auto;
}

.pmd-language-icon svg {
    display: block;

    width: 22px;
    height: 22px;

    stroke: currentColor;
}

.pmd-language-label {
    display: none;

    flex: 1;

    color: #fff;

    font-size: 13px;
    font-weight: 700;

    text-align: left;
}

.pmd-current-language {
    min-width: 27px;

    padding: 4px 5px;

    border-radius: 8px;

    background: #fff;
    color: #07594c;

    font-size: 10px;
    line-height: 1;
    font-weight: 900;

    text-align: center;
}

#pmd-sidebar-language.is-wide
#pmd-language-trigger {
    width: 142px;

    padding: 0 13px;

    justify-content: flex-start;

    gap: 9px;
}

#pmd-sidebar-language.is-wide
.pmd-language-label {
    display: block;
}

#pmd-sidebar-language.is-loading
#pmd-language-trigger {
    opacity: .55;
    pointer-events: none;
}

@media (max-width: 820px) {
    #pmd-sidebar-language {
        bottom: 82px;
    }
}

html.pmd-sm2-collapsed #pmd-sidebar-language {
    overflow: visible !important;
}

html.pmd-sm2-collapsed #pmd-language-trigger {
    position: relative !important;

    width: 52px !important;
    min-width: 52px !important;
    height: 46px !important;

    padding: 0 !important;

    display: block !important;

    overflow: visible !important;
}

html.pmd-sm2-collapsed
#pmd-language-trigger
.pmd-language-icon {
    position: absolute !important;

    left: 50% !important;
    top: 50% !important;

    width: 24px !important;
    height: 24px !important;

    margin: 0 !important;

    transform:
        translate(-50%, -50%) !important;

    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
}

html.pmd-sm2-collapsed
#pmd-language-trigger
.pmd-language-icon svg {
    width: 22px !important;
    height: 22px !important;

    margin: 0 !important;

    display: block !important;
}

html.pmd-sm2-collapsed
#pmd-language-trigger
.pmd-current-language {
    position: absolute !important;

    left: calc(100% - 2px) !important;
    top: 50% !important;

    margin: 0 !important;

    transform:
        translateY(-50%) !important;

    z-index: 2 !important;
}

html.pmd-sm2-collapsed
#pmd-language-trigger
.pmd-language-label {
    display: none !important;
}

html.pmd-sm2-collapsed
#pmd-language-trigger
.pmd-language-icon {
    left: calc(50% - 4px) !important;
}

html.pmd-sm2-collapsed
#pmd-sidebar-language {
    transform: none !important;
}

html.pmd-sm2-collapsed
#pmd-language-trigger
.pmd-language-icon {
    left: 50% !important;
}

html:not(.pmd-sm2-runtime-ready)
#pmd-sidebar-language,
html:not(.pmd-sm2-runtime-ready)
#pmd-language-trigger,
html:not(.pmd-sm2-runtime-ready)
#pmd-language-trigger * {
    transition: none !important;
    animation: none !important;
}

/* ============================================================
   PMD_LANGUAGE_SERVER_GEOMETRY_FINAL_V7

   pmd-language-first-paint-state-v5 already reads the stored
   sidebar state before this markup is parsed.

   Therefore expanded/collapsed HTML classes are the first-paint
   geometry authority. Runtime may observe state, but may not
   reposition or resize this control after paint.
   ============================================================ */

#pmd-sidebar-language {
    left: 18px !important;
    transform: none !important;
}

html.pmd-sm2-collapsed #pmd-sidebar-language {
    left: 18px !important;
    transform: none !important;
}

html.pmd-sm2-expanded #pmd-sidebar-language {
    left: 20px !important;
    transform: none !important;
}

html.pmd-sm2-collapsed #pmd-language-trigger {
    width: 52px !important;
    min-width: 52px !important;
    max-width: 52px !important;

    padding: 0 !important;

    display: block !important;
}

html.pmd-sm2-collapsed
#pmd-language-trigger
.pmd-language-label {
    display: none !important;
}

html.pmd-sm2-expanded #pmd-language-trigger {
    width: 142px !important;
    min-width: 142px !important;
    max-width: 142px !important;

    padding: 0 13px !important;

    display: flex !important;
    justify-content: flex-start !important;

    gap: 9px !important;
}

html.pmd-sm2-expanded
#pmd-language-trigger
.pmd-language-label {
    display: block !important;
}

html.pmd-sm2-expanded
#pmd-language-trigger
.pmd-language-icon {
    position: static !important;

    width: 24px !important;
    height: 24px !important;

    margin: 0 !important;

    transform: none !important;
}

html.pmd-sm2-expanded
#pmd-language-trigger
.pmd-current-language {
    position: static !important;

    margin: 0 !important;

    transform: none !important;
}

/* Runtime class is allowed to exist but has no geometry authority. */
html.pmd-sm2-collapsed
#pmd-sidebar-language.is-wide
#pmd-language-trigger {
    width: 52px !important;
    min-width: 52px !important;
    max-width: 52px !important;
}

html.pmd-sm2-expanded
#pmd-sidebar-language:not(.is-wide)
#pmd-language-trigger {
    width: 142px !important;
    min-width: 142px !important;
    max-width: 142px !important;
}

</style>

<style id="pmd-language-exact-center-v8">
/*
 * PMD_LANGUAGE_EXACT_CENTER_V8
 *
 * Canonical desktop Side Menu geometry:
 *   left gap  = 14px
 *   collapsed = 72px
 *   expanded  = 184px
 *
 * Language:
 *   collapsed = 52px -> left = 14 + 10 = 24px
 *   expanded  = 142px -> left = 14 + 21 = 35px
 *
 * No runtime measurement and no post-paint correction.
 */
@media (min-width: 821px) {
    html.pmd-sm2-collapsed
    #pmd-sidebar-language {
        left:
            calc(
                var(--pmd-sm2-gap, 14px)
                + 10px
            ) !important;

        transform: none !important;
    }

    html.pmd-sm2-expanded
    #pmd-sidebar-language {
        left:
            calc(
                var(--pmd-sm2-gap, 14px)
                + 21px
            ) !important;

        transform: none !important;
    }
}
</style>

<!-- /PMD_LANGUAGE_TRUE_FIRST_PAINT_V5 -->

<div
    id="pmd-sidebar-language"
    data-endpoint="{{ $pmdLanguageEndpoint }}"
    data-current="{{ $pmdCurrentLocale }}"
    data-next="{{ $pmdNextLocale }}"
    data-pmd-language-v13
>
    <button
        type="button"
        id="pmd-language-trigger"
        aria-label="Switch language to {{ strtoupper($pmdNextLocale) }}"
        title="Switch to {{ $pmdNextLocale === 'de' ? 'Deutsch' : 'English' }}"
    >
        <span
            class="pmd-language-v13__collapsed-code"
            aria-hidden="true"
        >
            {{ strtoupper($pmdNextLocale) }}
        </span>

        <span
            class="pmd-language-v13__expanded-icon"
            aria-hidden="true"
        >
            <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <circle
                    cx="12"
                    cy="12"
                    r="9"
                ></circle>

                <path
                    d="M3 12h18"
                ></path>

                <path
                    d="M12 3a15 15 0 0 1 0 18"
                ></path>

                <path
                    d="M12 3a15 15 0 0 0 0 18"
                ></path>
            </svg>
        </span>

        <span
            class="pmd-language-v13__expanded-label"
        >
            {{ $pmdNextLocale === 'de' ? 'Deutsch' : 'English' }}
        </span>
    </button>
</div>

<style>
#pmd-sidebar-language {
    position: fixed;
    left: 18px;
    bottom: 88px;
    z-index: 99999;
    font-family: inherit;
}

#pmd-sidebar-language,
#pmd-sidebar-language * {
    box-sizing: border-box;
}

#pmd-language-trigger {
    width: 52px;
    height: 46px;

    padding: 0 7px;

    border: 0;
    border-radius: 14px;

    background: rgba(255,255,255,.11);
    color: #fff;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 4px;

    cursor: pointer;

    font-family: inherit;

    transition:
        background .15s ease,
        transform .15s ease,
        width .18s ease;
}

#pmd-language-trigger:hover {
    background: rgba(255,255,255,.18);
}

#pmd-language-trigger:active {
    transform: scale(.97);
}

.pmd-language-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    width: 24px;
    height: 24px;

    color: #ffffff;

    flex: 0 0 auto;
}

.pmd-language-icon svg {
    display: block;

    width: 22px;
    height: 22px;

    stroke: currentColor;
}

.pmd-language-label {
    display: none;

    flex: 1;

    color: #fff;

    font-size: 13px;
    font-weight: 700;

    text-align: left;
}

.pmd-current-language {
    min-width: 27px;

    padding: 4px 5px;

    border-radius: 8px;

    background: #fff;
    color: #07594c;

    font-size: 10px;
    line-height: 1;
    font-weight: 900;

    text-align: center;
}

#pmd-sidebar-language.is-wide
#pmd-language-trigger {
    width: 142px;

    padding: 0 13px;

    justify-content: flex-start;

    gap: 9px;
}

#pmd-sidebar-language.is-wide
.pmd-language-label {
    display: block;
}

#pmd-sidebar-language.is-loading
#pmd-language-trigger {
    opacity: .55;
    pointer-events: none;
}

@media (max-width: 820px) {
    #pmd-sidebar-language {
        bottom: 82px;
    }
}
</style>

<script>
/*
 * PMD_LANGUAGE_DIRECT_TOGGLE_STABLE_20260807
 *
 * One click:
 *
 * DE -> EN
 * EN -> DE
 *
 * No popup.
 */
(function () {
    'use strict';

    function bootLanguageToggle() {
        var root =
            document.getElementById(
                'pmd-sidebar-language'
            );

        var trigger =
            document.getElementById(
                'pmd-language-trigger'
            );

        if (
            !root
            || !trigger
            || root.dataset.stableReady === '1'
        ) {
            return;
        }

        root.dataset.stableReady = '1';

        var endpoint =
            root.getAttribute(
                'data-endpoint'
            );

        var nextLocale =
            String(
                root.getAttribute(
                    'data-next'
                ) || ''
            )
            .trim()
            .toLowerCase();

        function csrfToken() {
            var meta =
                document.querySelector(
                    'meta[name="csrf-token"]'
                );

            if (
                meta
                && meta.getAttribute(
                    'content'
                )
            ) {
                return meta.getAttribute(
                    'content'
                );
            }

            var hidden =
                document.querySelector(
                    'input[name="_token"]'
                );

            return hidden
                ? hidden.value
                : '';
        }

        function syncWidth() {
            /*
             * Side Menu 2 html classes own state/geometry.
             *
             * Remove any stale legacy runtime state only.
             * NO DOM width measurement.
             * NO inline left write.
             */
            root.classList.remove(
                'is-wide'
            );

            root.style.removeProperty(
                'left'
            );
        }

        syncWidth();

        window.addEventListener(
            'resize',
            syncWidth,
            { passive: true }
        );

        document.addEventListener(
            'pmd:side-menu2-state',
            syncWidth
        );

        trigger.addEventListener(
            'click',
            async function (event) {
                event.preventDefault();
                event.stopPropagation();

                if (
                    root.classList.contains(
                        'is-loading'
                    )
                ) {
                    return;
                }

                if (
                    nextLocale !== 'de'
                    && nextLocale !== 'en'
                ) {
                    console.error(
                        '[PMD Language] Invalid next locale',
                        nextLocale
                    );

                    return;
                }

                root.classList.add(
                    'is-loading'
                );

                try {
                    var body =
                        new URLSearchParams();

                    body.set(
                        'code',
                        nextLocale
                    );

                    var token =
                        csrfToken();

                    if (token) {
                        body.set(
                            '_token',
                            token
                        );
                    }

                    var headers = {
                        'Content-Type':
                            'application/x-www-form-urlencoded; charset=UTF-8',

                        'X-Requested-With':
                            'XMLHttpRequest',

                        'Accept':
                            'application/json'
                    };

                    if (token) {
                        headers[
                            'X-CSRF-TOKEN'
                        ] = token;
                    }

                    var response =
                        await fetch(
                            endpoint,
                            {
                                method: 'POST',
                                credentials:
                                    'same-origin',
                                cache:
                                    'no-store',
                                headers:
                                    headers,
                                body:
                                    body.toString()
                            }
                        );

                    var raw =
                        await response.text();

                    var data = {};

                    try {
                        data =
                            raw
                                ? JSON.parse(raw)
                                : {};
                    } catch (ignore) {}

                    if (
                        !response.ok
                        || !data.ok
                    ) {
                        throw new Error(
                            data.message
                            || (
                                'Language switch failed: HTTP '
                                + response.status
                            )
                        );
                    }

                    /*
                     * Cookie is written by backend.
                     * Hard navigation guarantees every page-level
                     * translation authority starts in new locale.
                     */
                    window.location.href =
                        window.location.pathname
                        + window.location.search
                        + window.location.hash;
                } catch (error) {
                    root.classList.remove(
                        'is-loading'
                    );

                    console.error(
                        '[PMD Language Toggle]',
                        error
                    );
                }
            }
        );
    }

    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            bootLanguageToggle,
            { once: true }
        );
    } else {
        bootLanguageToggle();
    }
})();
</script>
{{-- PMD_SIDEBAR_LANGUAGE_DIRECT_TOGGLE_20260807_END --}}




<style>
/*
 * PMD_LANGUAGE_COLLAPSED_CENTER_ALIGNMENT_20260807
 *
 * Language icon follows the same centered geometry as every
 * other collapsed Side Menu icon.
 *
 * The DE/EN badge floats outside and does not participate in
 * centering the globe.
 */

html.pmd-sm2-collapsed #pmd-sidebar-language {
    overflow: visible !important;
}

html.pmd-sm2-collapsed #pmd-language-trigger {
    position: relative !important;

    width: 52px !important;
    min-width: 52px !important;
    height: 46px !important;

    padding: 0 !important;

    display: block !important;

    overflow: visible !important;
}

html.pmd-sm2-collapsed
#pmd-language-trigger
.pmd-language-icon {
    position: absolute !important;

    left: 50% !important;
    top: 50% !important;

    width: 24px !important;
    height: 24px !important;

    margin: 0 !important;

    transform:
        translate(-50%, -50%) !important;

    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
}

html.pmd-sm2-collapsed
#pmd-language-trigger
.pmd-language-icon svg {
    width: 22px !important;
    height: 22px !important;

    margin: 0 !important;

    display: block !important;
}

html.pmd-sm2-collapsed
#pmd-language-trigger
.pmd-current-language {
    position: absolute !important;

    left: calc(100% - 2px) !important;
    top: 50% !important;

    margin: 0 !important;

    transform:
        translateY(-50%) !important;

    z-index: 2 !important;
}

html.pmd-sm2-collapsed
#pmd-language-trigger
.pmd-language-label {
    display: none !important;
}
</style>


<style>
/*
 * PMD_LANGUAGE_COLLAPSED_ICON_LEFT_NUDGE_20260807
 *
 * Optical alignment only.
 * Does not change language behaviour.
 */
html.pmd-sm2-collapsed
#pmd-language-trigger
.pmd-language-icon {
    left: calc(50% - 4px) !important;
}
</style>


<style>
/*
 * PMD_LANGUAGE_WHOLE_CONTROL_ALIGN_20260807
 *
 * Move the complete collapsed language control:
 * frame + icon + badge.
 *
 * Undo previous icon-only optical nudge.
 */

html.pmd-sm2-collapsed
#pmd-sidebar-language {
    transform: none !important;
}

html.pmd-sm2-collapsed
#pmd-language-trigger
.pmd-language-icon {
    left: 50% !important;
}
</style>


{{-- PMD_LANGUAGE_TEXT_ONLY_GLOBAL_V3_3 --}}
<style id="pmd-language-text-only-global-v3-3">
#pmd-sidebar-language #pmd-language-trigger .pmd-language-icon,
#pmd-sidebar-language #pmd-language-trigger .pmd-language-label {
  display: none !important;
  visibility: hidden !important;
}
#pmd-sidebar-language #pmd-language-trigger,
#pmd-sidebar-language.is-wide #pmd-language-trigger,
html.pmd-sm2-collapsed #pmd-sidebar-language #pmd-language-trigger,
html.pmd-sm2-expanded #pmd-sidebar-language #pmd-language-trigger {
  position: relative !important;
  display: grid !important;
  place-items: center !important;
  width: 52px !important;
  min-width: 52px !important;
  max-width: 52px !important;
  height: 46px !important;
  min-height: 46px !important;
  max-height: 46px !important;
  padding: 0 !important;
  gap: 0 !important;
}
#pmd-sidebar-language #pmd-language-trigger .pmd-current-language,
html.pmd-sm2-collapsed #pmd-sidebar-language #pmd-language-trigger .pmd-current-language,
html.pmd-sm2-expanded #pmd-sidebar-language #pmd-language-trigger .pmd-current-language {
  position: static !important;
  inset: auto !important;
  display: inline !important;
  min-width: 0 !important;
  width: auto !important;
  height: auto !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  color: #ffffff !important;
  font-size: 13px !important;
  font-weight: 900 !important;
  line-height: 1 !important;
  text-align: center !important;
  transform: none !important;
}
</style>

<!-- PMD_LANGUAGE_EXPANDED_LABEL_V13_START -->
<style id="pmd-language-expanded-label-v13">
/*
 * PMD_LANGUAGE_EXPANDED_LABEL_V13
 *
 * Consolidated existing V13 authority.
 *
 * COLLAPSED:
 *   DE / EN only
 *
 * EXPANDED:
 *   Globe + Deutsch / English
 *
 * The icon and label are explicitly positioned on ONE row,
 * therefore legacy flex/block rules cannot stack them.
 */

#pmd-sidebar-language[data-pmd-language-v13] {
    position: fixed !important;

    left: 24px !important;
    bottom: 88px !important;

    z-index: 99999 !important;

    width: 52px !important;
    min-width: 52px !important;
    max-width: 52px !important;

    height: 46px !important;
    min-height: 46px !important;
    max-height: 46px !important;

    margin: 0 !important;
    padding: 0 !important;

    box-sizing: border-box !important;

    overflow: visible !important;

    transform: none !important;
}


#pmd-sidebar-language[data-pmd-language-v13]
#pmd-language-trigger {
    position: relative !important;

    display: block !important;

    width: 52px !important;
    min-width: 52px !important;
    max-width: 52px !important;

    height: 46px !important;
    min-height: 46px !important;
    max-height: 46px !important;

    margin: 0 !important;
    padding: 0 !important;

    border: 0 !important;
    border-radius: 14px !important;

    background:
        rgba(255,255,255,.11)
        !important;

    color: #fff !important;

    box-shadow: none !important;

    overflow: visible !important;

    transform: none !important;
}


/* ----------------------------------------------------------
   Legacy language children must not compete with V13.
   ---------------------------------------------------------- */

#pmd-sidebar-language[data-pmd-language-v13]
.pmd-language-label,

#pmd-sidebar-language[data-pmd-language-v13]
.pmd-current-language {
    display: none !important;
}


/* ----------------------------------------------------------
   COLLAPSED CODE
   ---------------------------------------------------------- */

#pmd-sidebar-language[data-pmd-language-v13]
.pmd-language-v13__collapsed-code {
    position: absolute !important;

    inset: 0 !important;

    display: grid !important;
    place-items: center !important;

    width: 52px !important;
    height: 46px !important;

    margin: 0 !important;
    padding: 0 !important;

    color: #fff !important;

    font-family: inherit !important;
    font-size: 13px !important;
    font-weight: 800 !important;
    line-height: 1 !important;

    text-align: center !important;

    opacity: 1 !important;
    visibility: visible !important;
}


/* Expanded children hidden by default. */

#pmd-sidebar-language[data-pmd-language-v13]
.pmd-language-v13__expanded-icon,

#pmd-sidebar-language[data-pmd-language-v13]
.pmd-language-v13__expanded-label {
    display: none !important;

    opacity: 0 !important;
    visibility: hidden !important;
}


/* ----------------------------------------------------------
   EXPANDED ROOT
   ---------------------------------------------------------- */

html.pmd-sm2-expanded
#pmd-sidebar-language[data-pmd-language-v13] {
    left: 24px !important;

    width: 142px !important;
    min-width: 142px !important;
    max-width: 142px !important;

    height: 46px !important;
}


html.pmd-sm2-expanded
#pmd-sidebar-language[data-pmd-language-v13]
#pmd-language-trigger {
    width: 142px !important;
    min-width: 142px !important;
    max-width: 142px !important;

    height: 46px !important;

    background: transparent !important;

    border-radius: 13px !important;
}


html.pmd-sm2-expanded
#pmd-sidebar-language[data-pmd-language-v13]
#pmd-language-trigger:hover {
    background:
        rgba(255,255,255,.09)
        !important;
}


/* Hide DE / EN code while Side Menu is expanded. */

html.pmd-sm2-expanded
#pmd-sidebar-language[data-pmd-language-v13]
.pmd-language-v13__collapsed-code {
    display: none !important;

    opacity: 0 !important;
    visibility: hidden !important;
}


/* ----------------------------------------------------------
   EXPANDED ICON
   X = 10
   Y = centered inside 46px
   ---------------------------------------------------------- */

html.pmd-sm2-expanded
#pmd-sidebar-language[data-pmd-language-v13]
.pmd-language-v13__expanded-icon {
    position: absolute !important;

    left: 10px !important;
    top: 12px !important;

    display: grid !important;
    place-items: center !important;

    width: 22px !important;
    min-width: 22px !important;
    max-width: 22px !important;

    height: 22px !important;
    min-height: 22px !important;
    max-height: 22px !important;

    margin: 0 !important;
    padding: 0 !important;

    color: #fff !important;

    opacity: 1 !important;
    visibility: visible !important;

    transform: none !important;
}


html.pmd-sm2-expanded
#pmd-sidebar-language[data-pmd-language-v13]
.pmd-language-v13__expanded-icon
svg {
    display: block !important;

    width: 22px !important;
    height: 22px !important;

    margin: 0 !important;
    padding: 0 !important;

    fill: none !important;

    stroke: currentColor !important;

    transform: none !important;
}


/* ----------------------------------------------------------
   EXPANDED LABEL
   Starts immediately beside Globe.
   SAME vertical center.
   ---------------------------------------------------------- */

html.pmd-sm2-expanded
#pmd-sidebar-language[data-pmd-language-v13]
.pmd-language-v13__expanded-label {
    position: absolute !important;

    left: 42px !important;
    right: 0 !important;

    top: 0 !important;

    display: flex !important;

    align-items: center !important;
    justify-content: flex-start !important;

    height: 46px !important;
    min-height: 46px !important;
    max-height: 46px !important;

    margin: 0 !important;
    padding: 0 !important;

    color: #fff !important;

    font-family: inherit !important;
    font-size: 13px !important;
    font-weight: 700 !important;
    line-height: 1 !important;

    text-align: left !important;
    white-space: nowrap !important;

    opacity: 1 !important;
    visibility: visible !important;

    transform: none !important;
}


/* ----------------------------------------------------------
   EXPLICIT COLLAPSED STATE
   Beats stale legacy states/classes.
   ---------------------------------------------------------- */

html.pmd-sm2-collapsed
#pmd-sidebar-language[data-pmd-language-v13] {
    left: 24px !important;

    width: 52px !important;
    min-width: 52px !important;
    max-width: 52px !important;

    height: 46px !important;
}


html.pmd-sm2-collapsed
#pmd-sidebar-language[data-pmd-language-v13]
#pmd-language-trigger {
    width: 52px !important;
    min-width: 52px !important;
    max-width: 52px !important;

    height: 46px !important;

    background:
        rgba(255,255,255,.11)
        !important;
}


html.pmd-sm2-collapsed
#pmd-sidebar-language[data-pmd-language-v13]
.pmd-language-v13__collapsed-code {
    display: grid !important;

    opacity: 1 !important;
    visibility: visible !important;
}


html.pmd-sm2-collapsed
#pmd-sidebar-language[data-pmd-language-v13]
.pmd-language-v13__expanded-icon,

html.pmd-sm2-collapsed
#pmd-sidebar-language[data-pmd-language-v13]
.pmd-language-v13__expanded-label {
    display: none !important;

    opacity: 0 !important;
    visibility: hidden !important;
}


@media (max-width: 820px) {
    #pmd-sidebar-language[data-pmd-language-v13] {
        bottom: 82px !important;
    }
}
</style>
<!-- PMD_LANGUAGE_EXPANDED_LABEL_V13_END -->
