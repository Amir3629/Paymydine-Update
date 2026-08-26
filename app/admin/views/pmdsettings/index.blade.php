@php
    /*
     * PMD_SETTINGS_CONTENT_HASH_ASSETS
     *
     * Browser cache key follows REAL file content.
     * No manual version number.
     */
    $pmdSettingsCenterCssPath =
        base_path(
            'app/admin/assets/css/'.
            'pmd-settings-center-v1.css'
        );

    $pmdSettingsSuiteCssPath =
        base_path(
            'app/admin/assets/css/'.
            'pmd-settings-suite-first-paint-v1.css'
        );

    $pmdSettingsCenterJsPath =
        base_path(
            'app/admin/assets/js/'.
            'pmd-settings-center-v1.js'
        );

    $pmdSettingsCenterCssVersion =
        is_file($pmdSettingsCenterCssPath)
            ? substr(
                hash_file(
                    'sha256',
                    $pmdSettingsCenterCssPath
                ),
                0,
                16
            )
            : '1';

    $pmdSettingsSuiteCssVersion =
        is_file($pmdSettingsSuiteCssPath)
            ? substr(
                hash_file(
                    'sha256',
                    $pmdSettingsSuiteCssPath
                ),
                0,
                16
            )
            : '1';

    $pmdSettingsCenterJsVersion =
        is_file($pmdSettingsCenterJsPath)
            ? substr(
                hash_file(
                    'sha256',
                    $pmdSettingsCenterJsPath
                ),
                0,
                16
            )
            : '1';
@endphp

<style id="pmd-settings-critical-v11">
/*
 * PMD_SETTINGS_SERVER_FIRST_HEADER_V11
 * Exact Dashboard first-paint geometry.
 */

html,
body,
.page,
.page-wrapper,
.page-content,
.content-wrapper,
.container-fluid,
#pmd-settings-center {
  background:#f8fbfd!important;
}

.navbar-top,
.navbar-fixed-top,
.page-title-section {
  display:none!important;
  visibility:hidden!important;
  opacity:0!important;
  pointer-events:none!important;

  position:absolute!important;

  width:0!important;
  min-width:0!important;
  max-width:0!important;

  height:0!important;
  min-height:0!important;
  max-height:0!important;

  margin:0!important;
  padding:0!important;

  overflow:hidden!important;
}

#pmd-settings-center {
  width:100%!important;
  min-width:0!important;
  min-height:100vh!important;

  margin:0!important;

  padding:
    0 30px 72px
    !important;

  box-sizing:border-box!important;

  opacity:1!important;
  visibility:visible!important;

  transform:none!important;
  transition:none!important;
  animation:none!important;
}

#pmd-settings-clean-header {
  position:relative!important;
  z-index:120!important;

  display:flex!important;
  align-items:center!important;
  justify-content:space-between!important;

  width:min(1480px,100%)!important;

  height:64px!important;
  min-height:64px!important;
  max-height:64px!important;

  margin:0 auto!important;

  padding:
    0 2px
    !important;

  box-sizing:border-box!important;

  background:transparent!important;

  overflow:visible!important;

  transform:none!important;
  transition:none!important;
  animation:none!important;
}

#pmd-settings-clean-header
.pmd-settings-clean-actions {
  display:flex!important;
  align-items:center!important;
  justify-content:flex-end!important;

  gap:10px!important;

  height:46px!important;
  min-height:46px!important;
  max-height:46px!important;

  margin-left:auto!important;

  padding:0!important;
}

#pmd-settings-clean-header
.pmd-settings-header-search,

#pmd-settings-clean-header
.pmd-settings-notif-slot-v11 {
  display:grid!important;
  place-items:center!important;

  flex:0 0 46px!important;

  width:46px!important;
  min-width:46px!important;
  max-width:46px!important;

  height:46px!important;
  min-height:46px!important;
  max-height:46px!important;

  margin:0!important;
  padding:0!important;

  box-sizing:border-box!important;

  border:
    1px solid #cfe0ec
    !important;

  border-radius:14px!important;

  background:#fff!important;
  color:#173752!important;

  overflow:visible!important;

  transform:none!important;
  transition:none!important;
  animation:none!important;
}

#pmd-settings-clean-header
[data-pmd-settings-header-gap-v11] {
  position:relative!important;

  display:block!important;

  flex:0 0 10px!important;

  width:10px!important;
  min-width:10px!important;
  max-width:10px!important;

  height:46px!important;
}

#pmd-settings-clean-header
[data-pmd-settings-header-divider-v11] {
  position:absolute!important;

  top:50%!important;
  right:5px!important;

  width:1px!important;
  height:34px!important;

  background:#cfe0ec!important;

  transform:
    translateY(-50%)
    !important;
}

@media(max-width:820px) {
  #pmd-settings-center {
    padding:
      0 10px 40px
      !important;
  }
}
</style>

<script id="pmd-settings-center-v11-boot">
document.documentElement.classList.add(
    'pmd-settings-center-v2',
    'pmd-settings-server-header-v11'
);
</script>

<link rel="stylesheet" href="/app/admin/assets/css/pmd-settings-center-v1.css?v={{ $pmdSettingsCenterCssVersion }}">
<link rel="stylesheet" href="/app/admin/assets/css/pmd-settings-suite-first-paint-v1.css?v={{ $pmdSettingsSuiteCssVersion }}">

@php
    /*
     * PMD_SETTINGS_SIMPLIFY_V8_SAFE
     *
     * One accent color per settings family.
     */
    $pmdGroupAccents = [
        'restaurant' => [
            'name' => 'blue',
            'color' => '#2563eb',
            'soft' => '#edf3ff',
        ],

        'guest' => [
            'name' => 'rose',
            'color' => '#e11d48',
            'soft' => '#fff0f3',
        ],

        'reservations' => [
            'name' => 'violet',
            'color' => '#7c3aed',
            'soft' => '#f3edff',
        ],

        'team' => [
            'name' => 'emerald',
            'color' => '#047857',
            'soft' => '#e7f7f0',
        ],

        'devices' => [
            'name' => 'cyan',
            'color' => '#0891b2',
            'soft' => '#e9f9fc',
        ],

        'finance' => [
            'name' => 'orange',
            'color' => '#ea580c',
            'soft' => '#fff2e9',
        ],

        'brand' => [
            'name' => 'indigo',
            'color' => '#4f46e5',
            'soft' => '#efefff',
        ],

        'advanced' => [
            'name' => 'slate',
            'color' => '#475569',
            'soft' => '#f0f3f6',
        ],
    ];
@endphp

<div id="pmd-settings-center" class="pmd-settings-center" data-pmd-settings-center>

    {{-- PMD_SETTINGS_SERVER_FIRST_HEADER_V11 --}}
    @php
        $pmdSettingsNotificationCountV11 = 0;

        try {
            $pmdSettingsNotificationCountV11 =
                app(
                    \Admin\Services\PmdNotificationCountV1::class
                )->currentNewCount();
        } catch (\Throwable $error) {
            $pmdSettingsNotificationCountV11 = 0;
        }
    @endphp

    <header
        id="pmd-settings-clean-header"
        class="pmd-owner-header pmd-dashboard-lab__dashboard2-header"
        aria-label="Settings header"
        data-pmd-settings-server-header-v11
    >
        <div class="pmd-owner-header__left">
            <h1 class="pmd-settings-clean-title">
                Settings
            </h1>
        </div>

        <div
            class="pmd-settings-clean-actions"
            data-pmd-settings-header-actions-v11
        >
            <div
                class="pmd-settings-search-wrap pmd-settings-header-search"
                role="search"
                aria-expanded="false"
            >
                <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <circle
                        cx="11"
                        cy="11"
                        r="7"
                    ></circle>

                    <path
                        d="m20 20-4-4"
                    ></path>
                </svg>

                <input
                    type="search"
                    class="pmd-settings-search"
                    data-pmd-settings-search
                    placeholder="Search settings..."
                    autocomplete="off"
                    aria-label="Search settings"
                >

                <kbd>⌘ K</kbd>
            </div>

            

            
        </div>
    </header>

{{-- PMD_SETTINGS_REAL_NOTIFICATION_MOUNT_V15_START --}}
<script id="pmd-settings-real-notification-mount-v15">
/*
 * PMD_SETTINGS_REAL_NOTIFICATION_MOUNT_V15
 *
 * ONE notification authority.
 *
 * - Uses the real global #notif-root.
 * - Uses the real #notifDropdown.
 * - Uses the real #notification-count.
 * - Replaces only the legacy FontAwesome glyph with inline SVG.
 * - Normalizes Header to exactly ONE R67 divider.
 *
 * No second Bell.
 * No second count.
 * No second dropdown.
 * No observer.
 * No timer.
 */
(function () {
    'use strict';


    function removeNode(node) {
        if (
            node
            && node.parentNode
        ) {
            node.parentNode.removeChild(node);
        }
    }


    function buildGap() {
        var gap =
            document.createElement(
                'span'
            );

        gap.setAttribute(
            'data-pmd-main-header-notification-gap-r67',
            ''
        );

        gap.setAttribute(
            'data-pmd-settings-gap-v15',
            '1'
        );

        gap.setAttribute(
            'aria-hidden',
            'true'
        );


        var divider =
            document.createElement(
                'span'
            );

        divider.setAttribute(
            'data-pmd-main-header-notification-divider-r67',
            ''
        );

        divider.setAttribute(
            'data-pmd-settings-divider-v15',
            '1'
        );

        divider.setAttribute(
            'aria-hidden',
            'true'
        );

        gap.appendChild(
            divider
        );

        return gap;
    }


    function normalizeBell(
        notificationRoot
    ) {
        var button =
            notificationRoot.querySelector(
                '#notifDropdown'
            );

        if (!button) {
            return false;
        }


        var bell =
            notificationRoot.querySelector(
                '#bell-icon'
            );

        if (!bell) {
            bell =
                document.createElement(
                    'span'
                );

            bell.id =
                'bell-icon';

            button.insertBefore(
                bell,
                button.firstChild
            );
        }


        /*
         * Kill FontAwesome glyph authority completely.
         *
         * Keeping the same #bell-icon node means existing code that
         * references the ID remains safe.
         */
        bell.className =
            'pmd-settings-bell-svg-v15';

        bell.removeAttribute(
            'style'
        );

        bell.setAttribute(
            'aria-hidden',
            'true'
        );

        bell.innerHTML =
            '<svg '
            + 'viewBox="0 0 24 24" '
            + 'aria-hidden="true" '
            + 'focusable="false">'
            + '<path d="'
            + 'M18 8'
            + 'a6 6 0 0 0-12 0'
            + 'c0 7-3 7-3 9'
            + 'h18'
            + 'c0-2-3-2-3-9'
            + '"></path>'
            + '<path d="M10 21h4"></path>'
            + '</svg>';


        /*
         * Ensure the old Bootstrap/FontAwesome classes are gone even
         * if another partial re-added them before this mount.
         */
        [
            'fa',
            'fas',
            'far',
            'fal',
            'fab',
            'fa-bell',
            'fa-bell-o'
        ].forEach(function (name) {
            bell.classList.remove(
                name
            );
        });


        button.setAttribute(
            'data-pmd-settings-real-bell-v15',
            '1'
        );

        return true;
    }


    function mount() {
        var header =
            document.getElementById(
                'pmd-settings-clean-header'
            );

        if (!header) {
            return false;
        }


        var actions =
            header.querySelector(
                '.pmd-settings-clean-actions'
            );

        var notificationRoot =
            document.getElementById(
                'notif-root'
            );

        if (
            !actions
            || !notificationRoot
        ) {
            return false;
        }


        /*
         * ======================================================
         * 1. REMOVE EVERY EXISTING SETTINGS NOTIFICATION GAP
         *
         * Screenshot showed TWO vertical lines.
         * We intentionally throw all old R67 spacer copies away.
         * ======================================================
         */

        Array.prototype.slice.call(
            actions.querySelectorAll(
                '[data-pmd-main-header-notification-gap-r67]'
            )
        ).forEach(function (node) {
            if (
                !notificationRoot.contains(
                    node
                )
            ) {
                removeNode(
                    node
                );
            }
        });


        Array.prototype.slice.call(
            actions.querySelectorAll(
                '[data-pmd-main-header-notification-divider-r67]'
            )
        ).forEach(function (node) {
            if (
                !notificationRoot.contains(
                    node
                )
            ) {
                removeNode(
                    node
                );
            }
        });


        /*
         * Remove known Settings fallback Bell slots.
         * NEVER remove the real notificationRoot.
         */
        Array.prototype.slice.call(
            actions.children
        ).forEach(function (node) {
            if (
                node === notificationRoot
                || node.contains(
                    notificationRoot
                )
            ) {
                return;
            }


            if (
                node.classList
                && node.classList.contains(
                    'pmd-settings-header-search'
                )
            ) {
                return;
            }


            var fallback =
                node.matches
                && node.matches(
                    '.pmd-owner-notif-slot,'
                    + '[data-pmd-settings-notif-slot],'
                    + '[data-pmd-settings-notif-slot-v10],'
                    + '[data-pmd-settings-notif-slot-v11],'
                    + '[data-pmd-settings-notif-fallback],'
                    + '[data-pmd-settings-notification-fallback]'
                );


            if (fallback) {
                removeNode(
                    node
                );
            }
        });


        /*
         * ======================================================
         * 2. REMOVE OLD R66 DIVIDER FROM REAL NOTIFICATION
         * ======================================================
         */

        Array.prototype.slice.call(
            notificationRoot.querySelectorAll(
                '[data-pmd-main-header-notification-divider-r66]'
            )
        ).forEach(
            removeNode
        );


        /*
         * ======================================================
         * 3. REMOVE OLD TOP-MENU INLINE SPACING
         * ======================================================
         */

        [
            'margin',
            'margin-left',
            'margin-inline-start',
            'padding',
            'padding-left',
            'padding-inline-start'
        ].forEach(function (name) {
            notificationRoot
                .style
                .setProperty(
                    name,
                    '0',
                    'important'
                );
        });


        /*
         * ======================================================
         * 4. CONVERT REAL LEGACY FA BELL TO DASHBOARD SVG
         * ======================================================
         */

        if (
            !normalizeBell(
                notificationRoot
            )
        ) {
            return false;
        }


        /*
         * ======================================================
         * 5. EXACTLY ONE DIVIDER
         *
         * actions:
         *
         *   Search
         *   [10px R67 spacer with centered 1px divider]
         *   real notification
         * ======================================================
         */

        var gap =
            buildGap();

        actions.appendChild(
            gap
        );

        actions.appendChild(
            notificationRoot
        );


        notificationRoot
            .setAttribute(
                'data-pmd-settings-real-notif-v15',
                '1'
            );


        /*
         * Do not preserve stale Bootstrap dropdown state.
         */
        notificationRoot.classList.remove(
            'show'
        );

        var toggle =
            notificationRoot.querySelector(
                '#notifDropdown'
            );

        if (toggle) {
            toggle.classList.remove(
                'show'
            );

            toggle.setAttribute(
                'aria-expanded',
                'false'
            );
        }


        Array.prototype.slice.call(
            notificationRoot.querySelectorAll(
                '.dropdown-menu.show'
            )
        ).forEach(function (menu) {
            menu.classList.remove(
                'show'
            );

            menu.style.removeProperty(
                'display'
            );
        });


        document.documentElement
            .classList.add(
                'pmd-settings-real-notif-v15-ready'
            );

        return true;
    }


    /*
     * Expected path:
     * notification exists already because Top Menu is before page body.
     */
    if (mount()) {
        return;
    }


    /*
     * Single safety event only.
     */
    document.addEventListener(
        'DOMContentLoaded',
        mount,
        {
            once: true
        }
    );
})();
</script>
{{-- PMD_SETTINGS_REAL_NOTIFICATION_MOUNT_V15_END --}}







    <div class="pmd-settings-shell">


        <main class="pmd-settings-content">
            {{-- PMD_SETTINGS_REMOVE_TOP_SCHEDULE_V9
     Opening hours now live inside Restaurant Profile. --}}

            @foreach(($pmdSettingsGroups ?? []) as $group)
                <section
                    id="pmd-settings-{{ $group['id'] }}"
                    class="pmd-settings-group"
                    data-pmd-settings-section="{{ $group['id'] }}"
                    data-pmd-searchable="{{ strtolower($group['title'].' '.$group['description'].' '.collect($group['items'])->pluck('title')->implode(' ')) }}"
                >
                    <header class="pmd-settings-group__head">
                        <h2>{{ $group['title'] }}</h2>
                    </header>

                    <div class="pmd-settings-card-grid">
                        @foreach($group['items'] as $item)
                            @php
                                $accent = $pmdGroupAccents[$group['id']]
                                    ?? $pmdGroupAccents['advanced'];
                            @endphp
                            <a
                                class="pmd-settings-card"
                                href="{{ $item['href'] }}"
                                data-pmd-settings-card
                                data-accent="{{ $accent['name'] }}"
                                data-pmd-searchable="{{ strtolower($item['title'].' '.$item['description']) }}"
                            >
                                <span
                                    class="pmd-settings-card__icon"
                                    aria-hidden="true"
                                    style="--accent: {{ $accent['color'] }}; --accent-soft: {{ $accent['soft'] }};"
                                >
                                    @switch($item['icon'])
                                        @case('clock') <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg> @break
                                        @case('globe') <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"></path></svg> @break
                                        @case('calendar') <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M3 10h18"></path></svg> @break
                                        @case('users') @case('user') <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"></circle><path d="M3 20c0-4 2-7 6-7s6 3 6 7M16 5a3 3 0 0 1 0 6M17 14c3 .5 4 3 4 6"></path></svg> @break
                                        @case('shield') <svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"></path><path d="m9 12 2 2 4-4"></path></svg> @break
                                        @case('monitor') @case('terminal') <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="14" rx="2"></rect><path d="M8 21h8M12 18v3"></path></svg> @break
                                        @case('cash') <svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"></rect><path d="M7 12h10M8 9h1M15 15h1"></path></svg> @break
                                        @case('card') <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 10h18M7 15h4"></path></svg> @break
                                        @case('mail') <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m4 7 8 6 8-6"></path></svg> @break
                                        @case('star') <svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"></path></svg> @break
                                        @case('image') @case('palette') <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m4 17 5-5 4 4 2-2 5 4"></path></svg> @break
                                        @case('fingerprint') <svg viewBox="0 0 24 24"><path d="M8 8a6 6 0 0 1 10 4c0 4-1 7-3 9M6 12a6 6 0 0 1 10-4M6 16c1-2 1-4 1-5M10 21c2-3 3-6 3-9a2 2 0 0 0-4 0c0 4-1 6-2 8"></path></svg> @break
                                        @case('percent') <svg viewBox="0 0 24 24"><path d="m6 18 12-12"></path><circle cx="7" cy="7" r="2"></circle><circle cx="17" cy="17" r="2"></circle></svg> @break
                                        @case('receipt') @case('invoice') <svg viewBox="0 0 24 24"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"></path><path d="M9 8h6M9 12h6"></path></svg> @break
                                        @case('activity') <svg viewBox="0 0 24 24"><path d="M3 12h4l2-6 4 12 2-6h6"></path></svg> @break
                                        @case('key') <svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"></circle><path d="m11 12 8-8M16 7l2 2M14 9l2 2"></path></svg> @break
                                        @case('settings') <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.4 3.1a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2L3 14.5l2 3.4 2.4-1a8 8 0 0 0 1.7 1l.4 3.1h5l.4-3.1a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2.1-1.5a7 7 0 0 0 .1-1Z"></path></svg> @break
                                        @case('archive') <svg viewBox="0 0 24 24"><path d="M4 7h16v13H4zM3 4h18v4H3zM9 12h6"></path></svg> @break
                                        @case('menu') <svg viewBox="0 0 24 24"><path d="M5 6h14M5 12h14M5 18h14"></path></svg> @break
                                        @case('table') <svg viewBox="0 0 24 24"><path d="M4 8h16v8H4zM7 16v5M17 16v5"></path></svg> @break
                                        @case('booking') <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M7 13l3 3 7-7"></path></svg> @break
                                        @case('building') <svg viewBox="0 0 24 24"><path d="M5 21V5l7-2 7 2v16M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1M3 21h18"></path></svg> @break
                                        @case('restaurant') <svg viewBox="0 0 24 24"><path d="M5 3v8M8 3v8M5 7h3M6.5 11v10M16 3c-2 3-2 7 1 9v9M17 3v9"></path></svg> @break
                                        @default <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M8 12h8M12 8v8"></path></svg>
                                    @endswitch
                                </span>

                                <span class="pmd-settings-card__body">
                                    <span class="pmd-settings-card__title-row">
                                        <strong>{{ $item['title'] }}</strong>
                                    </span>
                                    <span class="pmd-settings-card__description">{{ $item['description'] }}</span>
                                </span>

                                <svg class="pmd-settings-card__arrow" aria-hidden="true" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg>
                            </a>
                        @endforeach
                    </div>
                </section>
            @endforeach

            <div class="pmd-settings-empty" data-pmd-settings-empty hidden>
                <span>No matching settings</span>
                <small>Try another search term.</small>
            </div>
        </main>
    </div>
</div>

    {{-- PMD_CASHIER_SETTINGS_LAUNCHER_V107 --}}
    <style id="pmd-cashier-settings-launcher-v107-style">
        /* PMD_CASHIER_SETTINGS_LAUNCHER_CENTER_R2 */
        #pmd-cashier-settings-launcher-v107 {
            position:fixed!important;
            left:calc(50% + 44px)!important;
            bottom:58px!important;
            z-index:490!important;
            display:flex!important;
            align-items:center!important;
            justify-content:center!important;
            width:auto!important;
            min-width:0!important;
            max-width:none!important;
            margin:0!important;
            padding:0!important;
            border:0!important;
            background:transparent!important;
            transform:translateX(-50%)!important;
            overflow:visible!important;
        }

        #pmd-cashier-settings-launcher-v107,
        #pmd-cashier-settings-launcher-v107 * {
            box-sizing:border-box;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__button {
            position:relative!important;
            display:flex!important;
            align-items:center!important;
            justify-content:center!important;
            gap:8px!important;
            width:184px!important;
            min-width:184px!important;
            max-width:184px!important;
            height:44px!important;
            min-height:44px!important;
            max-height:44px!important;
            margin:0!important;
            padding:5px 10px 5px 6px!important;
            border:1px solid #d8e4e8!important;
            border-radius:14px!important;
            background:#fff!important;
            color:#053a32!important;
            box-shadow:0 7px 22px rgba(5,58,50,.10)!important;
            cursor:pointer!important;
            font:inherit!important;
            text-align:left!important;
            line-height:1!important;
            overflow:hidden!important;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__button:hover,
        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__button:focus-visible {
            border-color:#b8d3cb;
            box-shadow:0 0 0 3px rgba(5,58,50,.08),0 8px 24px rgba(5,58,50,.12);
            outline:none;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__brand {
            display:grid!important;
            place-items:center!important;
            flex:0 0 32px!important;
            width:32px!important;
            min-width:32px!important;
            max-width:32px!important;
            height:32px!important;
            min-height:32px!important;
            max-height:32px!important;
            margin:0!important;
            border-radius:9px!important;
            background:#f5faf7!important;
            overflow:hidden!important;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__brand img {
            display:block;
            width:27px;
            height:27px;
            object-fit:contain;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__label {
            position:static!important;
            display:block!important;
            flex:0 1 auto!important;
            width:auto!important;
            min-width:0!important;
            height:auto!important;
            margin:0!important;
            padding:0!important;
            color:#102f42!important;
            font-size:13.5px!important;
            line-height:1!important;
            font-weight:900!important;
            white-space:nowrap!important;
            transform:none!important;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__chevron {
            flex:0 0 16px;
            width:16px;
            height:16px;
            color:#6b7f88;
            transition:transform .16s ease;
        }

        #pmd-cashier-settings-launcher-v107[data-open="1"] .pmd-cashier-launcher-v107__chevron {
            transform:rotate(180deg);
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__menu {
            position:absolute!important;
            left:50%!important;
            bottom:54px!important;
            width:292px!important;
            margin:0!important;
            padding:7px!important;
            border:1px solid #d8e4e8!important;
            border-radius:16px!important;
            background:#fff!important;
            box-shadow:0 18px 46px rgba(5,35,43,.18)!important;
            transform:translateX(-50%)!important;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__menu[hidden] {
            display:none!important;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__download {
            display:flex;
            align-items:center;
            gap:10px;
            min-height:52px;
            padding:7px 9px;
            border:0;
            border-radius:11px;
            color:#102f42;
            text-decoration:none!important;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__download:hover,
        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__download:focus-visible {
            background:#f4f8f7;
            outline:none;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__platform {
            display:grid;
            place-items:center;
            flex:0 0 36px;
            width:36px;
            height:36px;
            border-radius:10px;
            background:#f7fafb;
            overflow:hidden;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__platform svg {
            display:block;
            width:24px;
            height:24px;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__platform--windows {
            color:#0078d4;
            background:#eef7ff;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__platform--apple {
            color:#000;
            background:#f5f5f5;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__platform--intel {
            color:#0071c5;
            background:#eef7ff;
            font-family:Arial,Helvetica,sans-serif;
            font-size:13px;
            font-weight:900;
            letter-spacing:-.7px;
            text-transform:lowercase;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__copy {
            min-width:0;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__copy strong,
        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__copy small {
            display:block;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__copy strong {
            margin:0 0 3px;
            color:#102f42;
            font-size:13.5px;
            line-height:1.15;
            font-weight:900;
        }

        #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__copy small {
            color:#6b7f88;
            font-size:11px;
            line-height:1.2;
        }

        @media(max-width:820px) {
            #pmd-cashier-settings-launcher-v107 {
                left:50%!important;
                bottom:22px!important;
                transform:translateX(-50%)!important;
            }

            #pmd-cashier-settings-launcher-v107 .pmd-cashier-launcher-v107__menu {
                width:min(292px,calc(100vw - 28px))!important;
            }
        }
    </style>

    <section
        id="pmd-cashier-settings-launcher-v107"
        aria-label="Cashier App downloads"
        data-open="0"
    >
        <div
            class="pmd-cashier-launcher-v107__menu"
            id="pmd-cashier-launcher-menu-v107"
            hidden
        >
            <a
                class="pmd-cashier-launcher-v107__download"
                href="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-cashier-v1-preview/PayMyDine-Cashier-Setup-1.0.7.exe"
                target="_blank"
                rel="noopener noreferrer"
            >
                <span class="pmd-cashier-launcher-v107__platform pmd-cashier-launcher-v107__platform--windows" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.4 4.6 10.6 3.5v7.8H2.4V4.6Zm9.2-1.25L21.6 2v9.3h-10V3.35ZM2.4 12.3h8.2v7.9l-8.2-1.15V12.3Zm9.2 0h10v9.45l-10-1.4V12.3Z"/>
                    </svg>
                </span>
                <span class="pmd-cashier-launcher-v107__copy">
                    <strong>Windows 10 / 11</strong>
                    <small>Download .exe</small>
                </span>
            </a>

            <a
                class="pmd-cashier-launcher-v107__download"
                href="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-cashier-v1-preview/PayMyDine-Cashier-1.0.7-mac-arm64.dmg"
                target="_blank"
                rel="noopener noreferrer"
            >
                <span class="pmd-cashier-launcher-v107__platform pmd-cashier-launcher-v107__platform--apple" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.55 2.1c.08 1.45-.49 2.55-1.2 3.35-.77.86-1.93 1.52-3.06 1.43-.1-1.39.4-2.46 1.13-3.27.74-.83 1.98-1.48 3.13-1.51ZM19.36 17.1c-.57 1.29-.84 1.86-1.58 3-.99 1.51-2.39 3.4-4.12 3.42-1.53.02-1.93-1-4.01-.99-2.08.01-2.52 1.02-4.05.99-1.72-.03-3.04-1.72-4.03-3.23C-1.2 16.05-1.49 11.08.22 8.46c1.22-1.86 3.13-2.95 4.92-2.95 1.83 0 2.98 1 4.49 1 1.47 0 2.36-1 4.47-1 1.59 0 3.28.87 4.5 2.37-3.95 2.17-3.31 7.82.76 9.22Z" transform="translate(2 0) scale(.82)"/>
                    </svg>
                </span>
                <span class="pmd-cashier-launcher-v107__copy">
                    <strong>Mac · Apple Silicon</strong>
                    <small>M1 / M2 / M3 / M4</small>
                </span>
            </a>

            <a
                class="pmd-cashier-launcher-v107__download"
                href="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-cashier-v1-preview/PayMyDine-Cashier-1.0.7-mac-x64.dmg"
                target="_blank"
                rel="noopener noreferrer"
            >
                <span class="pmd-cashier-launcher-v107__platform pmd-cashier-launcher-v107__platform--intel" aria-hidden="true">intel</span>
                <span class="pmd-cashier-launcher-v107__copy">
                    <strong>Mac · Intel</strong>
                    <small>Intel x64</small>
                </span>
            </a>
        </div>

        <button
            type="button"
            class="pmd-cashier-launcher-v107__button"
            id="pmd-cashier-launcher-button-v107"
            aria-haspopup="menu"
            aria-controls="pmd-cashier-launcher-menu-v107"
            aria-expanded="false"
        >
            <span class="pmd-cashier-launcher-v107__brand" aria-hidden="true">
                <img src="/brand/paymydine-logo.svg" alt="">
            </span>
            <span class="pmd-cashier-launcher-v107__label">Cashier App</span>
            <svg class="pmd-cashier-launcher-v107__chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="m5 7.5 5 5 5-5"/>
            </svg>
        </button>
    </section>

    <script id="pmd-cashier-settings-launcher-v107-script">
    (function () {
        'use strict';

        var root = document.getElementById('pmd-cashier-settings-launcher-v107');
        var button = document.getElementById('pmd-cashier-launcher-button-v107');
        var menu = document.getElementById('pmd-cashier-launcher-menu-v107');

        if (!root || !button || !menu) return;

        function setOpen(open) {
            root.setAttribute('data-open', open ? '1' : '0');
            button.setAttribute('aria-expanded', open ? 'true' : 'false');
            menu.hidden = !open;
        }

        button.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(root.getAttribute('data-open') !== '1');
        });

        menu.addEventListener('click', function (event) {
            event.stopPropagation();
        });

        document.addEventListener('click', function () {
            setOpen(false);
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') setOpen(false);
        });
    }());
    </script>

<script defer src="/app/admin/assets/js/pmd-settings-center-v1.js?v={{ $pmdSettingsCenterJsVersion }}"></script>