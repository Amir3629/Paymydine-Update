{{-- PMD GLOBAL SIDE MENU 2 AUTHORITY --}}
@include('admin::_partials.pmd_side_menu2_global')

{{-- PMD_SIDEBAR_LANGUAGE_SWITCHER_V2_BEGIN --}}
@php
    $pmdLanguages = \System\Models\Languages_model::isEnabled()
        ->whereIn('code', ['en', 'de'])
        ->orderByRaw(
            "CASE WHEN code = 'en' THEN 0 ELSE 1 END"
        )
        ->get();

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

    $pmdLanguageEndpoint = url(
        config('system.adminUri', 'admin').
        '/_pmd/language-switch-v3'
    );
@endphp

@if($pmdLanguages->count() > 1)
<div
    id="pmd-sidebar-language"
    data-endpoint="{{ $pmdLanguageEndpoint }}"
>
    <button
        type="button"
        id="pmd-language-trigger"
        aria-label="Change language"
        title="Change language"
    >
        <span class="pmd-language-icon">🌐</span>

        <span class="pmd-language-label">
            Language
        </span>

        <span class="pmd-current-language">
            {{ strtoupper(substr($pmdCurrentLocale, 0, 2)) }}
        </span>
    </button>

    <div id="pmd-language-menu">
        <div class="pmd-language-title">
            Select language
        </div>

        @foreach($pmdLanguages as $pmdLanguage)
            @php
                $pmdCode = strtolower(
                    (string)$pmdLanguage->code
                );

                $pmdActive =
                    $pmdCode === $pmdCurrentLocale;
            @endphp

            <button
                type="button"
                class="pmd-language-choice
                    {{ $pmdActive ? 'is-active' : '' }}"
                data-language-code="{{ $pmdCode }}"
            >
                <span class="pmd-choice-code">
                    {{ strtoupper($pmdCode) }}
                </span>

                <span class="pmd-choice-name">
                    {{ $pmdLanguage->name }}
                </span>

                @if($pmdActive)
                    <span class="pmd-choice-check">✓</span>
                @endif
            </button>
        @endforeach

        <div id="pmd-language-error"></div>
    </div>
</div>

<style>
#pmd-sidebar-language {
    position: fixed;
    left: 28px;
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
    height: 52px;
    padding: 0;
    border: 0;
    border-radius: 14px;
    background: rgba(255,255,255,.10);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 11px;
    font-family: inherit;
    font-weight: 700;
    transition:
        background .15s ease,
        transform .15s ease,
        width .18s ease;
}

#pmd-sidebar-language.is-wide #pmd-language-trigger {
    width: 230px;
    padding: 0 17px;
    justify-content: flex-start;
}

#pmd-language-trigger:hover {
    background: rgba(255,255,255,.18);
    transform: translateY(-1px);
}

.pmd-language-icon {
    font-size: 20px;
    line-height: 1;
    flex: 0 0 auto;
}

.pmd-language-label {
    display: none;
    flex: 1;
    font-size: 16px;
    text-align: left;
}

#pmd-sidebar-language.is-wide .pmd-language-label {
    display: block;
}

.pmd-current-language {
    min-width: 25px;
    padding: 4px 5px;
    border-radius: 7px;
    background: #fff;
    color: #00483c;
    font-size: 10px;
    font-weight: 900;
    text-align: center;
}

#pmd-language-menu {
    position: absolute;
    left: calc(100% + 13px);
    bottom: 0;
    width: 235px;
    padding: 9px;
    border: 1px solid #dfe8e4;
    border-radius: 16px;
    background: #fff;
    color: #142c25;
    box-shadow: 0 18px 50px rgba(0,0,0,.24);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transform: translateX(-8px) scale(.98);
    transition:
        opacity .15s ease,
        transform .15s ease,
        visibility .15s ease;
}

#pmd-sidebar-language.is-open #pmd-language-menu {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transform: translateX(0) scale(1);
}

.pmd-language-title {
    padding: 9px 10px 11px;
    border-bottom: 1px solid #e9efec;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: .08em;
    text-transform: uppercase;
}

.pmd-language-choice {
    width: 100%;
    min-height: 48px;
    margin-top: 5px;
    padding: 7px 10px;
    border: 1px solid transparent;
    border-radius: 11px;
    background: transparent;
    color: #17342c;
    cursor: pointer;
    display: grid;
    grid-template-columns: 42px 1fr 18px;
    gap: 8px;
    align-items: center;
    text-align: left;
    font-family: inherit;
}

.pmd-language-choice:hover {
    border-color: #cfe5dc;
    background: #eff8f4;
}

.pmd-language-choice.is-active {
    border-color: #a5ddca;
    background: #e2f5ee;
    color: #00604d;
}

.pmd-choice-code {
    padding: 5px 6px;
    border-radius: 7px;
    background: #e9efec;
    font-size: 11px;
    font-weight: 900;
    text-align: center;
}

.pmd-language-choice.is-active .pmd-choice-code {
    background: #006b57;
    color: #fff;
}

.pmd-choice-name {
    font-size: 14px;
    font-weight: 700;
}

.pmd-choice-check {
    color: #00745e;
    font-weight: 900;
}

#pmd-language-error {
    display: none;
    margin-top: 7px;
    padding: 8px 9px;
    border-radius: 8px;
    background: #fff0f0;
    color: #a52020;
    font-size: 12px;
}

#pmd-sidebar-language.is-loading
    .pmd-language-choice {
    opacity: .45;
    pointer-events: none;
}
</style>

<script>
(function () {
    'use strict';

    function initializePmdLanguageButton() {
        var root = document.getElementById(
            'pmd-sidebar-language'
        );

        if (!root || root.dataset.ready === '1') {
            return;
        }

        root.dataset.ready = '1';

        var trigger = document.getElementById(
            'pmd-language-trigger'
        );

        var menu = document.getElementById(
            'pmd-language-menu'
        );

        var errorBox = document.getElementById(
            'pmd-language-error'
        );

        var sidebar =
            root.closest('.sidebar') ||
            document.querySelector('.sidebar');

        var endpoint = root.getAttribute(
            'data-endpoint'
        );

        var csrfMeta = document.querySelector(
            'meta[name="csrf-token"]'
        );

        var csrfToken = csrfMeta
            ? csrfMeta.getAttribute('content')
            : '';

        function synchronizePosition() {
            if (!sidebar) {
                return;
            }

            var rectangle =
                sidebar.getBoundingClientRect();

            var wide = rectangle.width > 150;

            root.classList.toggle(
                'is-wide',
                wide
            );

            root.style.left =
                (rectangle.left + (wide ? 52 : 18)) +
                'px';
        }

        function closeMenu() {
            root.classList.remove('is-open');
        }

        function showError(message) {
            errorBox.textContent = message;
            errorBox.style.display = 'block';
        }

        function clearError() {
            errorBox.textContent = '';
            errorBox.style.display = 'none';
        }

        synchronizePosition();

        window.addEventListener(
            'resize',
            synchronizePosition
        );

        window.setInterval(
            synchronizePosition,
            700
        );

        trigger.addEventListener(
            'click',
            function (event) {
                event.preventDefault();
                event.stopPropagation();

                root.classList.toggle('is-open');
            }
        );

        menu.addEventListener(
            'click',
            function (event) {
                event.stopPropagation();
            }
        );

        document.addEventListener(
            'click',
            closeMenu
        );

        document.addEventListener(
            'keydown',
            function (event) {
                if (event.key === 'Escape') {
                    closeMenu();
                }
            }
        );

        root.querySelectorAll(
            '.pmd-language-choice'
        ).forEach(function (button) {
            button.addEventListener(
                'click',
                function () {
                    var code = button.getAttribute(
                        'data-language-code'
                    );

                    if (!code) {
                        return;
                    }

                    clearError();
                    root.classList.add('is-loading');

                    var body =
                        new URLSearchParams();

                    body.append('code', code);

                    fetch(endpoint, {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                            'Content-Type':
                                'application/x-www-form-urlencoded; charset=UTF-8',
                            'X-CSRF-TOKEN': csrfToken,
                            'X-Requested-With':
                                'XMLHttpRequest',
                            'Accept':
                                'application/json'
                        },
                        body: body.toString()
                    })
                    .then(function (response) {
                        return response
                            .json()
                            .then(function (data) {
                                return {
                                    ok: response.ok,
                                    data: data
                                };
                            });
                    })
                    .then(function (result) {
                        if (
                            !result.ok ||
                            !result.data.ok
                        ) {
                            throw new Error(
                                result.data.message ||
                                'Unable to change language.'
                            );
                        }

                        window.location.reload();
                    })
                    .catch(function (error) {
                        root.classList.remove(
                            'is-loading'
                        );

                        showError(error.message);
                    });
                }
            );
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            initializePmdLanguageButton
        );
    } else {
        initializePmdLanguageButton();
    }
})();
</script>
@endif
{{-- PMD_SIDEBAR_LANGUAGE_SWITCHER_V2_END --}}

{{-- PMD_CUSTOM_SIDEBAR_LABELS_V3_BEGIN --}}
<script>
(function () {
    'use strict';

    var translations = {
        en: {
            'Dashboard': 'Dashboard',
            'Orders': 'Orders',
            'Coupons & Gifts': 'Coupons & Gifts',
            'Restaurant': 'Restaurant',
            'Kitchen Display': 'Kitchen Display',
            'Design': 'Design',
            'System': 'System',
            'Logout': 'Logout',
            'Language': 'Language',
            'Select language': 'Select language'
        },

        de: {
            'Dashboard': 'Übersicht',
            'Orders': 'Bestellungen',
            'Coupons & Gifts': 'Gutscheine & Geschenke',
            'Restaurant': 'Restaurant',
            'Kitchen Display': 'Küchenanzeige',
            'Design': 'Design',
            'System': 'System',
            'Logout': 'Abmelden',
            'Language': 'Sprache',
            'Select language': 'Sprache auswählen'
        }
    };

    function readLocale() {
        var match = document.cookie.match(
            /(?:^|;\s*)pmd_admin_locale=([^;]+)/
        );

        var locale = match
            ? decodeURIComponent(match[1]).toLowerCase()
            : 'en';

        return locale === 'de' ? 'de' : 'en';
    }

    function translateSidebar() {
        var locale = readLocale();
        var map = translations[locale];

        document.querySelectorAll(
            '.sidebar a, .sidebar button, ' +
            '.sidebar span, .sidebar div'
        ).forEach(function (element) {
            if (element.children.length > 0) {
                return;
            }

            var text = (
                element.textContent || ''
            ).trim();

            if (!text || !map[text]) {
                return;
            }

            element.textContent = map[text];
        });

        document.documentElement.setAttribute(
            'lang',
            locale
        );
    }

    function run() {
        translateSidebar();

        window.setTimeout(
            translateSidebar,
            250
        );

        window.setTimeout(
            translateSidebar,
            1000
        );
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            run
        );
    } else {
        run();
    }

    var observer = new MutationObserver(function () {
        translateSidebar();
    });

    window.setTimeout(function () {
        var sidebar = document.querySelector(
            '.sidebar'
        );

        if (sidebar) {
            observer.observe(sidebar, {
                childList: true,
                subtree: true
            });
        }
    }, 300);
})();
</script>
{{-- PMD_CUSTOM_SIDEBAR_LABELS_V3_END --}}

