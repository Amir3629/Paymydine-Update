@php
    $cards = $pmdMenuManagerCards ?? [];
    $categories = $pmdMenuManagerCategories ?? collect();
    $combos = $pmdMenuManagerCombos ?? [];
    $canManageCategories = !empty($pmdMenuManagerCanManageCategories);
    $canDeleteCategories = !empty($pmdMenuManagerCanDeleteCategories);
    $canManageCombos = !empty($pmdMenuManagerCanManageCombos);
    // PMD_MENU_COMBO_CATEGORY_SINGLE_AUTHORITY_V1
    $comboCategoryId = (int)($pmdMenuManagerComboCategoryId ?? 0);
    $comboCategoryName = trim((string)($pmdMenuManagerComboCategoryName ?? ''));
    $stats = $pmdMenuManagerStats ?? ['total' => 0, 'published' => 0, 'stock_out' => 0, 'foods' => 0, 'combos' => 0];
    $disabledCount = max(0, (int)$stats['total'] - (int)$stats['published']);
    $categoryCount = is_countable($categories) ? count($categories) : 0;
    $totalCatalogueCards = count($cards) + count($combos);
    $kitchenCapacity = $pmdMenuManagerKitchenCapacity ?? [];
    $canManageKitchenCapacity = !empty($pmdMenuManagerCanManageKitchenCapacity);

    // PMD_MENU_HEADER_SERVER_COUNT_V2
    try {
        $pmdMenuHeaderServerCountV2 =
            app(
                \Admin\Services\PmdNotificationCountV1::class
            )->currentNewCount();
    } catch (\Throwable $error) {
        $pmdMenuHeaderServerCountV2 = 0;
    }

    // PMD_MENU_MANAGER_PLATFORM_I18N_GLOBAL_V1
    $pmdMenuLocale = \Admin\Classes\PmdPlatformI18n::currentLocale();
    $pmdMenuPlatformPrefix = 'menu.manager.';
    $pmdMenuCopy = [];
    $pmdMenuPlatformMessages = \Admin\Classes\PmdPlatformI18n::messages($pmdMenuLocale);

    foreach ($pmdMenuPlatformMessages as $pmdMenuMessageKey => $pmdMenuMessageValue) {
        if (!str_starts_with($pmdMenuMessageKey, $pmdMenuPlatformPrefix)) {
            continue;
        }

        $pmdMenuCopy[substr($pmdMenuMessageKey, strlen($pmdMenuPlatformPrefix))] = $pmdMenuMessageValue;
    }

    $pmdT = static function ($key) use ($pmdMenuCopy) {
        return $pmdMenuCopy[(string)$key] ?? (string)$key;
    };

    // PMD_MENU_SERVER_I18N_R4_1
    $pmdCategoryDisplayName = static function ($category) use ($pmdMenuPlatformMessages) {
        $name = trim((string)($category->name ?? ''));
        $kind = strtolower(trim((string)($category->pmd_kind ?? 'regular')));

        if ($kind === 'chef') {
            return $pmdMenuPlatformMessages['menu.smart.chef'] ?? $name;
        }
        if ($kind === 'bestseller') {
            return $pmdMenuPlatformMessages['menu.smart.bestseller'] ?? $name;
        }
        if ($kind === 'combos') {
            return $pmdMenuPlatformMessages['menu.smart.combos'] ?? $name;
        }

        return $name;
    };

    // PMD_ALLERGEN_DISPLAY_I18N_V14
    $pmdAllergenLabel = static function ($name) use ($pmdMenuPlatformMessages) {
        $raw = trim((string)$name);
        $slug = strtolower($raw);
        $slug = preg_replace('/[^a-z0-9]+/', '_', $slug) ?? '';
        $slug = trim($slug, '_');
        if ($slug === '') return $raw;
        return $pmdMenuPlatformMessages['allergen.'.$slug] ?? $raw;
    };
@endphp


{{-- PMD_MENU_NOTIFICATION_SERVER_FIRST_V13 --}}
@php
    $pmdMenuNotificationCountV13 = 0;

    try {
        $pmdMenuNotificationCountV13 =
            app(
                \Admin\Services\PmdNotificationCountV1::class
            )->currentNewCount();
    } catch (\Throwable $error) {
        $pmdMenuNotificationCountV13 = 0;
    }
@endphp

<div
    id="pmd-menu-manager-main"
    class="pmd-owner-page pmd-menu-manager"
    data-pmd-menu-manager
    data-pmd-combo-builder="0"
    data-pmd-can-manage-combos="{{ $canManageCombos ? '1' : '0' }}"
    data-pmd-combo-category-id="{{ $comboCategoryId > 0 ? $comboCategoryId : '' }}"
    data-pmd-can-delete-categories="{{ $canDeleteCategories ? '1' : '0' }}"
    data-pmd-category-context="all"
>
    <!-- PMD_DASHBOARD_HEADER_CLONE_V1_MENU_START -->
<header
    id="pmd-r2-clean-header"
    class="pmd-owner-header pmd-dashboard-lab__dashboard2-header pmd-menu-manager__topbar"
    aria-label="{{ $pmdT('menu_header') }}"
    data-pmd-dashboard-header-clone="menu-v1"
>
    <div class="pmd-owner-header__left">
        <h1 class="pmd-r2-clean-title">{{ $pmdT('title') }}</h1>
    </div>

    <div
        class="pmd-owner-header__actions pmd-r2-clean-actions"
        data-pmd-menu-header-actions
        aria-label="{{ $pmdT('menu_actions') }}"
    >
        <button
            type="button"
            class="pmd-dashboard-lab__header-action"
            data-pmd-menu-header-primary
            data-pmd-menu-create
            style="display:none!important"
            aria-hidden="true"
            tabindex="-1"
            aria-label="{{ $pmdT('create_food') }}"
            title="{{ $pmdT('create_food') }}"
        >
            <svg
                data-pmd-menu-primary-glyph
                data-pmd-glyph="create"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <path d="M12 5v14"></path>
                <path d="M5 12h14"></path>
            </svg>

            <span
                class="pmd-menu-header-action__count"
                data-pmd-combo-selection-count
                hidden
            >0</span>
        </button>

        @if($canManageCombos)
            <button
                type="button"
                class="pmd-dashboard-lab__header-action"
                data-pmd-menu-header-secondary
                data-pmd-combo-build
                style="display:none!important"
                aria-hidden="true"
                tabindex="-1"
                aria-label="{{ $pmdT('create_combo') }}"
                title="{{ $pmdT('create_combo') }}"
            >
                <svg
                    data-pmd-menu-secondary-glyph
                    data-pmd-glyph="build"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path d="M4 7l8-4 8 4-8 4-8-4z"></path>
                    <path d="m4 12 8 4 8-4"></path>
                    <path d="m4 17 8 4 8-4"></path>
                    <path d="M18 3v6"></path>
                    <path d="M15 6h6"></path>
                </svg>
            </button>
        @endif

        @if($canManageKitchenCapacity)
            <button
                type="button"
                class="pmd-dashboard-lab__header-action"
                data-pmd-menu-capacity-open
                aria-label="{{ $pmdT('kitchen_capacity') }}"
                title="{{ $pmdT('kitchen_capacity') }}"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3c1.8 3 5 4.6 5 9a5 5 0 0 1-10 0c0-2.3 1.2-4.4 3.5-6.5.2 2 1 3 1.5 3.5 1.2-1.4 1.2-3.7 0-6z"></path>
                </svg>
            </button>
        @endif



            <span
                data-pmd-main-header-notification-gap-r67=""
                aria-hidden="true"
                style="
                    position:relative!important;
                    display:block!important;
                    flex:0 0 10px!important;
                    width:10px!important;
                    min-width:10px!important;
                    max-width:10px!important;
                    height:46px!important;
                    min-height:46px!important;
                    max-height:46px!important;
                    margin:0!important;
                    padding:0!important;
                    border:0!important;
                    background:transparent!important;
                    pointer-events:none!important;
                    overflow:visible!important;
                "
            >
                <span
                    data-pmd-main-header-notification-divider-r67=""
                    aria-hidden="true"
                    style="
                        position:absolute!important;
                        top:50%!important;
                        right:5px!important;
                        transform:translateY(-50%)!important;
                        display:block!important;
                        width:1px!important;
                        min-width:1px!important;
                        max-width:1px!important;
                        height:34px!important;
                        min-height:34px!important;
                        max-height:34px!important;
                        margin:0!important;
                        padding:0!important;
                        border:0!important;
                        background:#cfe0ec!important;
                        pointer-events:none!important;
                    
                        left:auto!important;"
                ></span>
            </span>


        <span
            class="pmd-owner-notif-slot pmd-dashboard-lab__notif-slot pmd-dashboard-header-clone__notif-slot"
            data-pmd-menu-notif-slot
            data-pmd-dashboard-header-clone-notif-slot
            aria-label="{{ $pmdT('notifications') }}"
        >
            <span
                class="pmd-dashboard-lab__notif-fallback"
                aria-hidden="true"
            >
                <svg viewBox="0 0 24 24">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
            
                    @if($pmdMenuNotificationCountV13 > 0)
                        <span
                            class="pmd-header-server-count-v13"
                            data-pmd-menu-count-v13
                            aria-hidden="true"
                        >{{ $pmdMenuNotificationCountV13 }}</span>
                    @endif
</span>
        </span>
    </div>
</header>


    <script data-pmd-dashboard-header-clone-mount>
    (function () {
      'use strict';

      function setImportant(node, property, value) {
        if (!node) return;
        node.style.setProperty(
          property,
          value,
          'important'
        );
      }

      function bellSvg() {
        return ''
          + '<svg viewBox="0 0 24 24" aria-hidden="true">'
          + '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>'
          + '<path d="M13.73 21a2 2 0 0 1-3.46 0"></path>'
          + '</svg>';
      }

      function normalizeNotification(root) {
        if (!root) return false;

        var trigger = root.querySelector(
          '#notifDropdown'
        );

        if (!trigger) return false;

        root.classList.remove('show');

        Array.prototype.forEach.call(
          root.querySelectorAll(
            '.dropdown-menu.show'
          ),
          function (menu) {
            menu.classList.remove('show');
            menu.style.removeProperty('display');
          }
        );

        trigger.classList.remove('show');
        trigger.setAttribute(
          'aria-expanded',
          'false'
        );
        var pmdMenuNotificationLabel = @json($pmdT('notifications'));
        trigger.setAttribute(
          'aria-label',
          pmdMenuNotificationLabel
        );
        trigger.setAttribute(
          'title',
          pmdMenuNotificationLabel
        );

        Array.prototype.forEach.call(
          trigger.querySelectorAll(
            ':scope > i'
          ),
          function (node) {
            node.remove();
          }
        );

        var bell = trigger.querySelector(
          ':scope > #bell-icon'
        );

        if (!bell) {
          bell = document.createElement('span');
          bell.id = 'bell-icon';

          trigger.insertBefore(
            bell,
            trigger.firstChild || null
          );
        }

        bell.innerHTML = bellSvg();

        var count = trigger.querySelector(
          '#notification-count'
        );

        var panel =
          root.querySelector('#notification-panel')
          || root.querySelector('.dropdown-menu');

        setImportant(root, 'position', 'relative');
        setImportant(root, 'display', 'flex');
        setImportant(root, 'align-items', 'center');
        setImportant(root, 'justify-content', 'center');
        setImportant(root, 'box-sizing', 'border-box');

        setImportant(root, 'width', '46px');
        setImportant(root, 'min-width', '46px');
        setImportant(root, 'max-width', '46px');

        setImportant(root, 'height', '46px');
        setImportant(root, 'min-height', '46px');
        setImportant(root, 'max-height', '46px');

        setImportant(root, 'flex', '0 0 46px');

        /*
         * Kills the old inline
         * margin-left:24px!important authority.
         */
        setImportant(root, 'margin', '0');
        setImportant(root, 'margin-left', '0');

        setImportant(root, 'padding', '0');
        setImportant(root, 'border', '0');
        setImportant(
          root,
          'background',
          'transparent'
        );
        setImportant(root, 'overflow', 'visible');
        setImportant(root, 'list-style', 'none');
        setImportant(root, 'transform', 'none');

        setImportant(
          trigger,
          'position',
          'relative'
        );
        setImportant(trigger, 'display', 'grid');
        setImportant(
          trigger,
          'place-items',
          'center'
        );
        setImportant(
          trigger,
          'box-sizing',
          'border-box'
        );

        setImportant(trigger, 'width', '46px');
        setImportant(
          trigger,
          'min-width',
          '46px'
        );
        setImportant(
          trigger,
          'max-width',
          '46px'
        );

        setImportant(trigger, 'height', '46px');
        setImportant(
          trigger,
          'min-height',
          '46px'
        );
        setImportant(
          trigger,
          'max-height',
          '46px'
        );

        setImportant(trigger, 'margin', '0');
        setImportant(trigger, 'padding', '0');

        setImportant(
          trigger,
          'border',
          '1px solid #cfe0ec'
        );
        setImportant(
          trigger,
          'border-radius',
          '14px'
        );
        setImportant(
          trigger,
          'background',
          '#ffffff'
        );
        setImportant(
          trigger,
          'color',
          '#173752'
        );
        setImportant(
          trigger,
          'box-shadow',
          '0 3px 10px rgba(23,55,82,.05)'
        );

        setImportant(
          trigger,
          'line-height',
          '1'
        );
        setImportant(
          trigger,
          'text-indent',
          '0'
        );
        setImportant(trigger, 'opacity', '1');
        setImportant(
          trigger,
          'visibility',
          'visible'
        );
        setImportant(
          trigger,
          'overflow',
          'visible'
        );
        setImportant(
          trigger,
          'transform',
          'none'
        );

        setImportant(bell, 'position', 'static');
        setImportant(
          bell,
          'display',
          'inline-flex'
        );
        setImportant(
          bell,
          'align-items',
          'center'
        );
        setImportant(
          bell,
          'justify-content',
          'center'
        );
        setImportant(bell, 'width', '21px');
        setImportant(bell, 'height', '21px');
        setImportant(bell, 'margin', '0');
        setImportant(bell, 'padding', '0');
        setImportant(bell, 'color', '#173752');
        setImportant(bell, 'line-height', '1');
        setImportant(bell, 'transform', 'none');
        setImportant(
          bell,
          'pointer-events',
          'none'
        );

        var svg = bell.querySelector('svg');

        if (svg) {
          setImportant(svg, 'display', 'block');
          setImportant(svg, 'width', '21px');
          setImportant(svg, 'height', '21px');
          setImportant(svg, 'margin', '0');
          setImportant(svg, 'padding', '0');
          setImportant(svg, 'fill', 'none');
          setImportant(
            svg,
            'stroke',
            'currentColor'
          );
          setImportant(
            svg,
            'stroke-width',
            '2'
          );
          setImportant(
            svg,
            'stroke-linecap',
            'round'
          );
          setImportant(
            svg,
            'stroke-linejoin',
            'round'
          );
          setImportant(svg, 'transform', 'none');
        }

        if (count) {
          setImportant(
            count,
            'position',
            'absolute'
          );
          setImportant(count, 'top', '-7px');
          setImportant(count, 'right', '-8px');
          setImportant(count, 'left', 'auto');
          setImportant(count, 'bottom', 'auto');
          setImportant(count, 'z-index', '8');

          setImportant(
            count,
            'min-width',
            '18px'
          );
          setImportant(count, 'height', '18px');

          setImportant(count, 'margin', '0');
          setImportant(
            count,
            'padding',
            '0 4px'
          );

          setImportant(
            count,
            'border',
            '2px solid #ffffff'
          );
          setImportant(
            count,
            'border-radius',
            '999px'
          );
          setImportant(
            count,
            'background',
            '#d83a31'
          );
          setImportant(count, 'color', '#fff');

          setImportant(
            count,
            'font-size',
            '9px'
          );
          setImportant(
            count,
            'font-weight',
            '800'
          );
          setImportant(
            count,
            'line-height',
            '14px'
          );
          setImportant(
            count,
            'text-align',
            'center'
          );
          setImportant(
            count,
            'white-space',
            'nowrap'
          );
          setImportant(
            count,
            'transform',
            'none'
          );
        }

        if (panel) {
          setImportant(
            panel,
            'position',
            'absolute'
          );
          setImportant(panel, 'top', '54px');
          setImportant(panel, 'right', '0');
          setImportant(panel, 'left', 'auto');
          setImportant(panel, 'margin', '0');
          setImportant(
            panel,
            'z-index',
            '10050'
          );
          setImportant(
            panel,
            'transform',
            'none'
          );
        }

        root.removeAttribute('hidden');
        root.removeAttribute('aria-hidden');

        root.setAttribute(
          'data-pmd-dashboard-header-notification',
          'mounted-v1'
        );

        return true;
      }

      function mount() {
        var header = document.getElementById(
          'pmd-r2-clean-header'
        );

        var slot = header
          ? header.querySelector(
              '[data-pmd-dashboard-header-clone-notif-slot]'
            )
          : null;

        var root = document.getElementById(
          'notif-root'
        );

        if (
          !header
          || !root
          || !root.querySelector('#notifDropdown')
        ) {
          return false;
        }

        if (
          slot
          && !header.contains(root)
        ) {
          slot.replaceWith(root);
        }

        if (!header.contains(root)) {
          return false;
        }

        return normalizeNotification(root);
      }

      var mounted = mount();

      if (
        !mounted
        && document.readyState === 'loading'
      ) {
        document.addEventListener(
          'DOMContentLoaded',
          mount,
          { once: true }
        );
      }
    })();
    </script>
<!-- PMD_DASHBOARD_HEADER_CLONE_V1_MENU_END -->

    <section class="pmd-menu-kpis" aria-label="{{ $pmdT('menu_overview') }}">
        <article class="pmd-menu-kpi" data-pmd-menu-kpi="foods">
            <div class="pmd-menu-kpi__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"></path><path d="M8 9h8M8 13h8M8 17h5"></path></svg>
            </div>
            <div class="pmd-menu-kpi__copy">
                <span>{{ $pmdT('menu_items') }}</span><strong data-pmd-stat-total>{{ (int)$stats['total'] }}</strong><small>{{ $pmdT('foods_combos') }}</small>
            </div>
        </article>

        <article class="pmd-menu-kpi" data-pmd-menu-kpi="categories">
            <div class="pmd-menu-kpi__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"></path></svg>
            </div>
            <div class="pmd-menu-kpi__copy">
                <span>{{ $pmdT('categories') }}</span><strong data-pmd-stat-categories>{{ (int)$categoryCount }}</strong><small>{{ $pmdT('enabled_categories') }}</small>
            </div>
        </article>

        <article class="pmd-menu-kpi" data-pmd-menu-kpi="stock-out">
            <div class="pmd-menu-kpi__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6L5 8z"></path><path d="M9 8V6a3 3 0 0 1 6 0v2"></path><path d="m9 12 6 6M15 12l-6 6"></path></svg>
            </div>
            <div class="pmd-menu-kpi__copy">
                <span>{{ $pmdT('stock_out') }}</span><strong data-pmd-stat-stockout>{{ (int)$stats['stock_out'] }}</strong><small>{{ $pmdT('unavailable_foods') }}</small>
            </div>
        </article>

        <article class="pmd-menu-kpi" data-pmd-menu-kpi="disabled">
            <div class="pmd-menu-kpi__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M3 3l18 18"></path><path d="M10.6 10.6A2 2 0 0 0 13.4 13.4"></path><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9 8 9 8a16.6 16.6 0 0 1-2.1 3.2"></path><path d="M6.6 6.6C4.3 8.2 3 12 3 12s3.5 8 9 8a9.6 9.6 0 0 0 3.4-.6"></path></svg>
            </div>
            <div class="pmd-menu-kpi__copy">
                <span>{{ $pmdT('disabled') }}</span><strong data-pmd-stat-disabled>{{ (int)$disabledCount }}</strong><small>{{ $pmdT('legacy_hidden_items') }}</small>
            </div>
        </article>
    </section>

    <section class="pmd-menu-manager__panel" aria-label="{{ $pmdT('menu_catalogue') }}">
        <div class="pmd-menu-manager__toolbar" data-pmd-food-toolbar>
            <label class="pmd-menu-manager__search">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
                <input type="search" placeholder="{{ $pmdT('search_menu') }}" autocomplete="off" data-pmd-menu-search>
            </label>
            <div class="pmd-menu-manager__toolbar-actions">
                <div class="pmd-menu-manager__stock-filters" aria-label="{{ $pmdT('stock_filter') }}">
                    <button type="button" class="is-active" data-pmd-stock-filter="all">{{ $pmdT('all') }}</button>
                    <button type="button" data-pmd-stock-filter="in">{{ $pmdT('in_stock') }}</button>
                    <button type="button" data-pmd-stock-filter="out">{{ $pmdT('stock_out') }}</button>
                </div>
                <button type="button" class="pmd-menu-manager__sort-toggle" data-pmd-menu-sort-toggle aria-pressed="false" title="{{ $pmdT('sort_title') }}">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12"></path><path d="M4 5v2M4 11v2M4 17v2"></path></svg>
                    <span data-pmd-menu-sort-label>{{ $pmdT('sort_edit') }}</span>
                </button>
                <span class="pmd-menu-manager__sort-status" data-pmd-menu-sort-status aria-live="polite"></span>
            </div>
        </div>

        <div class="pmd-menu-manager__categories" aria-label="{{ $pmdT('menu_categories') }}" data-pmd-food-categories>
            <button type="button" class="is-active" data-pmd-category-filter="all" data-pmd-category-fixed>{{ $pmdT('all_foods') }}</button>
            <!-- PMD_MENU_CATEGORY_DELETE_OWNER_MANAGER_V130 -->
            @foreach($categories as $category)
                <button
                    type="button"
                    data-pmd-category-filter="{{ (int)$category->category_id }}"
                    data-pmd-category-id="{{ (int)$category->category_id }}"
                    data-pmd-category-kind="{{ strtolower(trim((string)($category->pmd_kind ?? 'regular'))) }}"
                    @if($canManageCategories) data-pmd-category-sortable @endif
                >
                    <span class="pmd-menu-manager__category-label">{{ $pmdCategoryDisplayName($category) }}</span>

                    @if($canDeleteCategories)
                        <span
                            class="pmd-menu-manager__category-delete-hit"
                            data-pmd-category-delete="{{ (int)$category->category_id }}"
                            aria-hidden="true"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path d="M7 12h10"></path>
                            </svg>
                        </span>
                    @endif
                </button>
            @endforeach
            @if($canManageCategories)
                <button
                    type="button"
                    class="pmd-menu-manager__category-add"
                    data-pmd-category-create
                    aria-label="{{ $pmdT('add_category') }}"
                    title="{{ $pmdT('add_category') }}"
                ><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg></button>
            @endif
        </div>

        {{-- PMD_MENU_SERVER_FIRST_ACTION_CARD_V1_6_7 --}}
        @php
            $pmdServerAddFoodTitle = $pmdMenuPlatformMessages['menu.smart.add_food']
                ?? $pmdT('create_food');
            $pmdServerAddFoodHelp = $pmdMenuPlatformMessages['menu.smart.add_food_help']
                ?? '';
        @endphp

        <div class="pmd-menu-manager__grid" data-pmd-menu-grid>
            <div
                class="pmd-smart-add-card"
                data-pmd-smart-server-action-card
                role="button"
                tabindex="0"
            >
                <span
                    class="pmd-smart-add-card__plus"
                    data-pmd-smart-add-icon
                    aria-hidden="true"
                >+</span>
                <span class="pmd-smart-add-card__copy">
                    <strong data-pmd-smart-add-title>{{ $pmdServerAddFoodTitle }}</strong>
                    <small data-pmd-smart-add-help>{{ $pmdServerAddFoodHelp }}</small>
                </span>
            </div>

            @foreach($cards as $item)
                @php
                    $searchText = mb_strtolower(trim($item['name'].' '.$item['description'].' '.implode(' ', $item['category_names'] ?? []).' '.implode(' ', $item['allergen_names'] ?? [])));
                    $categoryIdsText = implode(',', array_map('intval', $item['category_ids'] ?? []));
                    $categoryExtra = max(0, count($item['category_names'] ?? []) - 1);
                @endphp
                <article
                    class="pmd-menu-card {{ $item['is_stock_out'] ? 'is-stock-out' : '' }} {{ !$item['menu_status'] ? 'is-hidden-menu' : '' }}"
                    data-pmd-menu-card
                    data-item-type="food"
                    data-menu-id="{{ (int)$item['id'] }}"
                    data-category-ids="{{ $categoryIdsText }}"
                    data-stock-out="{{ $item['is_stock_out'] ? '1' : '0' }}"
                    data-published="{{ $item['menu_status'] ? '1' : '0' }}"
                    data-combo-selectable="{{ $item['menu_status'] ? '1' : '0' }}"
                    data-search="{{ e($searchText) }}"
                >
                    {{-- PMD_MENU_EDIT_CARD_DELETE_V132_FOOD --}}
                    <button
                        type="button"
                        class="pmd-menu-card__edit-delete"
                        data-pmd-edit-delete-kind="food"
                        data-pmd-edit-delete-id="{{ (int)$item['id'] }}"
                        draggable="false"
                        aria-label="{{ $pmdT('delete_food') }}"
                        title="{{ $pmdT('delete_food') }}"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path d="M7 12h10"></path>
                        </svg>
                    </button>

                    <div class="pmd-menu-card__media">
                        <div class="pmd-menu-card__placeholder" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"></path><circle cx="9" cy="10" r="2"></circle><path d="m5 17 4-4 3 3 2-2 5 4"></path></svg>
                        </div>
                        @if(!empty($item['image']))
                            <img
                                src="{{ e($item['image']) }}"
                                alt="{{ e($item['name']) }}"
                                loading="{{ $loop->index < 4 ? 'eager' : 'lazy' }}"
                                decoding="async"
                                @if($loop->index < 4) fetchpriority="high" @endif
                                data-pmd-menu-image
                            >
                        @endif
                        <span class="pmd-menu-card__category">
                            {{ $item['category_name'] === 'Uncategorized' ? $pmdT('uncategorized') : $item['category_name'] }}@if($categoryExtra > 0) <b>+{{ $categoryExtra }}</b>@endif
                        </span>
                        @if(!$item['menu_status'])<span class="pmd-menu-card__visibility">{{ $pmdT('disabled') }}</span>@endif
                        <span class="pmd-menu-card__select-mark" data-pmd-combo-select-mark aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg>
                        </span>
                    </div>

                    <div class="pmd-menu-card__body">
                        <div class="pmd-menu-card__title-row">
                            <h2>{{ $item['name'] }}</h2><strong>{{ currency_format($item['price']) }}</strong>
                        </div>

                        @if($item['description'] !== '')
                            <p class="pmd-menu-card__description">{{ $item['description'] }}</p>
                        @else
                            <p class="pmd-menu-card__description is-empty">{{ $pmdT('no_description') }}</p>
                        @endif

                        @if($item['is_halal'] || $item['is_vegetarian'] || $item['is_vegan'] || count($item['allergen_names'] ?? []))
                            <div class="pmd-menu-card__traits" aria-label="{{ $pmdT('food_attributes') }}">
                                @if($item['is_halal'])<span title="{{ $pmdT('halal') }}"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 1 1-9-9z"></path><path d="m17 4 .7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2L17 4z"></path></svg>{{ $pmdT('halal') }}</span>@endif
                                @if($item['is_vegetarian'])<span title="{{ $pmdT('vegetarian') }}"><svg viewBox="0 0 24 24"><path d="M20 4c-8 0-14 3-14 10 0 3 2 6 6 6 7 0 8-10 8-16z"></path><path d="M4 20c3-5 7-8 12-11"></path></svg>{{ $pmdT('vegetarian') }}</span>@endif
                                @if($item['is_vegan'])<span title="{{ $pmdT('vegan') }}"><svg viewBox="0 0 24 24"><path d="M12 21V10"></path><path d="M12 14c-5 0-8-3-8-8 5 0 8 3 8 8z"></path><path d="M12 11c0-5 3-8 8-8 0 5-3 8-8 8z"></path></svg>{{ $pmdT('vegan') }}</span>@endif
                                @if(count($item['allergen_names'] ?? []))<span class="is-allergen" title="{{ e(implode(', ', $item['allergen_names'])) }}"><svg viewBox="0 0 24 24"><path d="M12 3 2.5 20h19L12 3z"></path><path d="M12 9v4M12 17h.01"></path></svg>{{ count($item['allergen_names']) }} allergen{{ count($item['allergen_names']) === 1 ? '' : 's' }}</span>@endif
                            </div>
                        @endif

                        <div class="pmd-menu-card__availability">
                            <span class="pmd-menu-card__stock-state" data-pmd-stock-state><i></i><span>{{ $item['is_stock_out'] ? $pmdT('stock_out') : $pmdT('in_stock') }}</span></span>
                        </div>

                        <div class="pmd-menu-card__actions">
                            <button type="button" class="pmd-menu-card__stock-btn" data-pmd-menu-stock data-menu-id="{{ (int)$item['id'] }}">{{ $item['is_stock_out'] ? $pmdT('stock_in') : $pmdT('stock_out') }}</button>
                            <button type="button" class="pmd-menu-card__edit-btn" data-pmd-menu-edit="{{ (int)$item['id'] }}">{{ $pmdT('edit') }}</button>
                        </div>
                    </div>
                </article>
            @endforeach

            @foreach($combos as $combo)
                @php
                    $comboSearch = mb_strtolower(trim($combo['name'].' '.$combo['description'].' '.implode(' ', array_column($combo['items'] ?? [], 'name')).' '.implode(' ', $combo['allergen_names'] ?? []).' combos'));
                    $comboImages = array_values(array_filter($combo['images'] ?? []));
                    $comboCustomImage = trim((string)($combo['image'] ?? ''));
                @endphp
                <article
                    class="pmd-menu-card pmd-menu-card--combo {{ !$combo['combo_status'] ? 'is-hidden-menu' : '' }}"
                    data-pmd-menu-card
                    data-item-type="combo"
                    data-combo-id="{{ (int)$combo['id'] }}"
                    data-category-ids="{{ $comboCategoryId > 0 ? $comboCategoryId : '' }}"
                    data-stock-out="0"
                    data-published="{{ $combo['combo_status'] ? '1' : '0' }}"
                    data-combo-selectable="0"
                    data-search="{{ e($comboSearch) }}"
                >
                    {{-- PMD_MENU_EDIT_CARD_DELETE_V132_COMBO --}}
                    @if($canManageCombos)
                        <button
                            type="button"
                            class="pmd-menu-card__edit-delete"
                            data-pmd-edit-delete-kind="combo"
                            data-pmd-edit-delete-id="{{ (int)$combo['id'] }}"
                            draggable="false"
                            aria-label="{{ $pmdT('delete_combo') }}"
                            title="{{ $pmdT('delete_combo') }}"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path d="M7 12h10"></path>
                            </svg>
                        </button>
                    @endif

                    <div class="pmd-menu-card__media {{ count($comboImages) ? 'has-image' : '' }}">
                        <div class="pmd-menu-card__placeholder pmd-menu-card__placeholder--combo" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M4 7l8-4 8 4-8 4-8-4z"></path><path d="m4 12 8 4 8-4"></path><path d="m4 17 8 4 8-4"></path></svg>
                        </div>
                        @if($comboCustomImage !== '')
                            <img src="{{ e($comboCustomImage) }}" alt="{{ e($combo['name']) }}" loading="lazy" decoding="async" data-pmd-menu-image>
                        @elseif(count($comboImages))
                            <div class="pmd-menu-card__combo-mosaic pmd-menu-card__combo-mosaic--{{ min(4, count($comboImages)) }}" aria-hidden="true">
                                @foreach(array_slice($comboImages, 0, 4) as $comboImage)
                                    <img src="{{ e($comboImage) }}" alt="" loading="lazy" decoding="async">
                                @endforeach
                            </div>
                        @endif
                        <span class="pmd-menu-card__category">{{ $comboCategoryName !== '' ? $comboCategoryName : $pmdT('combos') }}</span>
                        @if(!$combo['combo_status'])<span class="pmd-menu-card__visibility">{{ $pmdT('disabled') }}</span>@endif
                    </div>

                    <div class="pmd-menu-card__body">
                        <div class="pmd-menu-card__title-row">
                            <h2>{{ $combo['name'] }}</h2><strong>{{ currency_format($combo['price']) }}</strong>
                        </div>

                        @if($combo['description'] !== '')
                            <p class="pmd-menu-card__description">{{ $combo['description'] }}</p>
                        @else
                            <p class="pmd-menu-card__description is-empty">{{ $pmdT('no_description') }}</p>
                        @endif

                        <div class="pmd-menu-card__combo-items" aria-label="{{ $pmdT('combo_foods') }}">
                            @foreach(array_slice($combo['items'] ?? [], 0, 4) as $comboItem)
                                <span>{{ ($comboItem['quantity'] ?? 1) > 1 ? (int)$comboItem['quantity'].'x ' : '' }}{{ $comboItem['name'] }}</span>
                            @endforeach
                            @if(count($combo['items'] ?? []) > 4)<span>+{{ count($combo['items']) - 4 }} {{ $pmdT('more') }}</span>@endif
                        </div>

                        @if($combo['is_halal'] || $combo['is_vegetarian'] || $combo['is_vegan'] || count($combo['allergen_names'] ?? []))
                            <div class="pmd-menu-card__traits" aria-label="{{ $pmdT('combo_attrs') }}">
                                @if($combo['is_halal'])<span title="{{ $pmdT('all_foods_halal') }}"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 1 1-9-9z"></path><path d="m17 4 .7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2L17 4z"></path></svg>{{ $pmdT('halal') }}</span>@endif
                                @if($combo['is_vegetarian'])<span title="{{ $pmdT('all_foods_vegetarian') }}"><svg viewBox="0 0 24 24"><path d="M20 4c-8 0-14 3-14 10 0 3 2 6 6 6 7 0 8-10 8-16z"></path><path d="M4 20c3-5 7-8 12-11"></path></svg>{{ $pmdT('vegetarian') }}</span>@endif
                                @if($combo['is_vegan'])<span title="{{ $pmdT('all_foods_vegan') }}"><svg viewBox="0 0 24 24"><path d="M12 21V10"></path><path d="M12 14c-5 0-8-3-8-8 5 0 8 3 8 8z"></path><path d="M12 11c0-5 3-8 8-8 0 5-3 8-8 8z"></path></svg>{{ $pmdT('vegan') }}</span>@endif
                                @if(count($combo['allergen_names'] ?? []))<span class="is-allergen" title="{{ e(implode(', ', array_map($pmdAllergenLabel, (array)$combo['allergen_names']))) }}"><svg viewBox="0 0 24 24"><path d="M12 3 2.5 20h19L12 3z"></path><path d="M12 9v4M12 17h.01"></path></svg>{{ count($combo['allergen_names']) }} {{ count($combo['allergen_names']) === 1 ? $pmdT('allergen_singular') : $pmdT('allergen_plural') }}</span>@endif
                            </div>
                        @endif

                        <div class="pmd-menu-card__availability">
                            <span class="pmd-menu-card__combo-count"><i></i><span>{{ (int)$combo['item_count'] }} {{ $pmdT('items') }}</span></span>
                        </div>

                        <div class="pmd-menu-card__actions pmd-menu-card__actions--combo">
                            <button type="button" class="pmd-menu-card__edit-btn pmd-menu-card__edit-btn--wide" data-pmd-combo-edit="{{ (int)$combo['id'] }}">{{ $pmdT('edit_combo') }}</button>
                        </div>
                    </div>
                </article>
            @endforeach

            {{-- V1.6.7: legacy empty-state CTA removed; the first Add card is the only create-food CTA. --}}
        </div>

        <div class="pmd-menu-manager__no-results" data-pmd-menu-no-results hidden>{{ $pmdT('no_results') }}</div>
    </section>


@if($canManageKitchenCapacity)
<div class="pmd-menu-capacity-modal" data-pmd-menu-capacity-modal hidden aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="pmd-menu-capacity-title">
    <button type="button" class="pmd-menu-capacity-modal__backdrop" data-pmd-menu-capacity-close tabindex="-1" aria-label="Close"></button>
    <section class="pmd-menu-capacity-card" role="document">
        <header class="pmd-menu-capacity-card__header">
            <h2 id="pmd-menu-capacity-title">Kitchen capacity</h2>
            <button type="button" data-pmd-menu-capacity-close aria-label="Close">×</button>
        </header>
        <form method="post" action="{{ admin_url('shifts/saveeta') }}">
            @csrf
            <input type="hidden" name="return_to" value="{{ request()->getRequestUri() }}">
            <div class="pmd-menu-capacity-card__body">
                <div class="pmd-menu-capacity-grid">
                    <label><span>Busy at</span><input type="number" name="busy_item_threshold" min="1" max="500" value="{{ (int)($kitchenCapacity['busy_item_threshold'] ?? 10) }}"></label>
                    <label><span>+ minutes</span><input type="number" name="busy_extra_minutes" min="0" max="120" value="{{ (int)($kitchenCapacity['busy_extra_minutes'] ?? 5) }}"></label>
                    <label><span>Very busy at</span><input type="number" name="very_busy_item_threshold" min="2" max="1000" value="{{ (int)($kitchenCapacity['very_busy_item_threshold'] ?? 25) }}"></label>
                    <label><span>+ minutes</span><input type="number" name="very_busy_extra_minutes" min="0" max="240" value="{{ (int)($kitchenCapacity['very_busy_extra_minutes'] ?? 10) }}"></label>
                </div>
                <label class="pmd-menu-capacity-toggle">
                    <input type="hidden" name="peak_enabled_present" value="1">
                    <input type="checkbox" name="peak_enabled" value="1" {{ !empty($kitchenCapacity['peak_enabled']) ? 'checked' : '' }}>
                    <span>Peak time</span>
                </label>
                <div class="pmd-menu-capacity-grid">
                    <label><span>Starts</span><input type="time" name="peak_start" value="{{ $kitchenCapacity['peak_start'] ?? '18:00' }}"></label>
                    <label><span>Ends</span><input type="time" name="peak_end" value="{{ $kitchenCapacity['peak_end'] ?? '21:00' }}"></label>
                    <label><span>Peak buffer</span><input type="number" name="peak_extra_minutes" min="0" max="120" value="{{ (int)($kitchenCapacity['peak_extra_minutes'] ?? 5) }}"></label>
                </div>
            </div>
            <footer class="pmd-menu-capacity-card__footer">
                <button type="button" class="is-soft" data-pmd-menu-capacity-close>Cancel</button>
                <button type="submit">Save</button>
            </footer>
        </form>
    </section>
</div>
<script data-pmd-menu-capacity-v17>
(function () {
  'use strict';
  var modal = document.querySelector('[data-pmd-menu-capacity-modal]');
  if (!modal) return;
  function openModal() {
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
  }
  function closeModal() {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  }
  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-pmd-menu-capacity-open]')) { event.preventDefault(); openModal(); return; }
    if (event.target.closest('[data-pmd-menu-capacity-close]')) { event.preventDefault(); closeModal(); }
  });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !modal.hidden) closeModal(); });
})();
</script>
@endif

</div>

<script type="application/json" id="pmd-menu-manager-i18n">{!! json_encode($pmdMenuCopy, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!}</script>
<script type="application/json" id="pmd-menu-manager-catalog">{!! json_encode($pmdMenuManagerCatalog ?? [], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!}</script>
<script type="application/json" id="pmd-menu-manager-combo-catalog">{!! json_encode($pmdMenuManagerComboCatalog ?? [], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) !!}</script>

@include('pmdmenus/_modal_host')
