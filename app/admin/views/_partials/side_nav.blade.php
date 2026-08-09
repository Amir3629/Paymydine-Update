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

<div
    id="pmd-sidebar-language"
    data-endpoint="{{ $pmdLanguageEndpoint }}"
    data-current="{{ $pmdCurrentLocale }}"
    data-next="{{ $pmdNextLocale }}"
>
    <button
        type="button"
        id="pmd-language-trigger"
        aria-label="Switch language to {{ strtoupper($pmdNextLocale) }}"
        title="Switch to {{ strtoupper($pmdNextLocale) }}"
    >
        <span
            class="pmd-language-icon"
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
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M3 12h18"></path>
                <path d="M12 3a15 15 0 0 1 0 18"></path>
                <path d="M12 3a15 15 0 0 0 0 18"></path>
            </svg>
        </span>

        <span class="pmd-language-label">
            Language
        </span>

        <span class="pmd-current-language">
            {{ strtoupper($pmdCurrentLocale) }}
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
            var sidebar =
                document.getElementById(
                    'pmd-side-menu2'
                );

            if (!sidebar) {
                return;
            }

            var rect =
                sidebar.getBoundingClientRect();

            root.classList.toggle(
                'is-wide',
                rect.width > 120
            );

            root.style.left =
                (
                    rect.left
                    + (
                        rect.width > 120
                            ? 20
                            : 18
                    )
                )
                + 'px';
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
    transform: translateX(-5px) !important;
}

html.pmd-sm2-collapsed
#pmd-language-trigger
.pmd-language-icon {
    left: 50% !important;
}
</style>

