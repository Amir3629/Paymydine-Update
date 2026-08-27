{{-- PMD_PLATFORM_I18N_COUPONS_V1 --}}
@include('admin::_partials.pmd_platform_messages')
@php
    $cards = $pmdCouponCards ?? [];
    $catalog = $pmdCouponCatalog ?? [];
    $stats = $pmdCouponStats ?? ['total' => 0, 'active' => 0, 'redemptions' => 0, 'stored_balance' => 0];

    $pmdCouponLocale = strtolower(trim((string)request()->cookie('pmd_admin_locale', app()->getLocale())));
    $pmdCouponLocale = str_starts_with($pmdCouponLocale, 'de') ? 'de' : 'en';

    // PMD_COUPON_HEADER_SERVER_COUNT_V2
    try {
        $pmdCouponHeaderServerCountV2 =
            app(
                \Admin\Services\PmdNotificationCountV1::class
            )->currentNewCount();
    } catch (\Throwable $error) {
        $pmdCouponHeaderServerCountV2 = 0;
    }

    $pmdCouponCopy = [
        'en' => [
            'title' => 'Coupons', 'header' => 'Coupon header', 'actions' => 'Coupon actions', 'create' => 'Create coupon / card', 'notifications' => 'Notifications',
            'overview' => 'Coupon overview', 'total' => 'Codes', 'total_help' => 'Coupons + cards', 'active' => 'Active', 'active_help' => 'Usable right now',
            'redemptions' => 'Redemptions', 'redemptions_help' => 'Successful uses', 'stored_balance' => 'Stored balance', 'stored_balance_help' => 'Gift cards + credits',
            'search' => 'Search name or code...', 'status_filter' => 'Status filter', 'all' => 'All', 'active_only' => 'Active', 'inactive' => 'Inactive',
            'types' => 'Coupon types', 'all_types' => 'All types', 'coupon' => 'Coupon', 'gift_card' => 'Gift card', 'voucher' => 'Voucher', 'credit' => 'Credit', 'comp' => 'Comp',
            'no_description' => 'No description', 'discount' => 'Discount', 'balance' => 'Balance', 'min_order' => 'Min. order', 'uses' => 'Uses', 'unlimited' => 'Unlimited',
            'expires' => 'Expires', 'no_expiry' => 'No expiry', 'expired' => 'Expired', 'disabled' => 'Disabled', 'enabled' => 'Enabled', 'created' => 'Created',
            'disable' => 'Disable', 'enable' => 'Enable', 'edit' => 'Edit', 'copy_code' => 'Copy code', 'copied' => 'Copied',
            'empty' => 'No coupons or cards yet', 'empty_help' => 'Create the first code and it will appear here.', 'no_results' => 'No coupons match these filters.',
            'modal_create' => 'Create coupon / card', 'modal_edit' => 'Edit coupon / card', 'close' => 'Close', 'cancel' => 'Cancel', 'save' => 'Save', 'saving' => 'Saving...', 'saved' => 'Saved',
            'delete' => 'Delete', 'delete_permanently' => 'Delete permanently', 'delete_confirm' => 'Delete this coupon/card permanently? This cannot be undone.', 'deleting' => 'Deleting...', 'deleted' => 'Deleted',
            'basic' => 'Basic information', 'basic_help' => 'Name, code and the kind of value this code provides.', 'card_type' => 'Type', 'name' => 'Name', 'code' => 'Code', 'generate' => 'Generate', 'description' => 'Description',
            'discount_section' => 'Discount', 'discount_help' => 'Choose a fixed amount or a percentage discount.', 'fixed' => 'Fixed amount', 'percentage' => 'Percentage', 'discount_value' => 'Discount value',
            'balance_section' => 'Stored value', 'balance_help' => 'Starting balance for a new gift card, credit or comp.', 'starting_balance' => 'Starting balance', 'current_balance' => 'Current balance',
            'gift_options' => 'Gift card options', 'gift_options_help' => 'Only applies to gift cards.', 'purchasable' => 'Purchasable', 'purchase_price' => 'Purchase price', 'reloadable' => 'Reloadable', 'transferable' => 'Transferable',
            'rules' => 'Usage rules', 'rules_help' => 'Keep only the limits that are useful for this code.', 'minimum_order' => 'Minimum order', 'max_redemptions' => 'Maximum redemptions', 'per_customer' => 'Per customer', 'zero_unlimited' => '0 = unlimited', 'expiry_date' => 'Expiry date',
            'status' => 'Active', 'status_help' => 'Inactive codes stay saved but cannot be used.', 'code_help' => 'Leave blank and PMD generates a unique code.',
            'save_error' => 'Could not save this coupon/card.', 'delete_error' => 'Could not delete this coupon/card.', 'toggle_error' => 'Could not change status.', 'refresh_error' => 'Saved, but the coupon workspace could not refresh.',
        ],
        'de' => [
            'title' => 'Gutscheine', 'header' => 'Gutschein-Kopfbereich', 'actions' => 'Gutschein-Aktionen', 'create' => 'Gutschein / Karte erstellen', 'notifications' => 'Benachrichtigungen',
            'overview' => 'Gutscheinübersicht', 'total' => 'Gutscheincodes', 'total_help' => 'Gutscheine + Karten', 'active' => 'Aktiv', 'active_help' => 'Jetzt verwendbar',
            'redemptions' => 'Einlösungen', 'redemptions_help' => 'Erfolgreiche Nutzungen', 'stored_balance' => 'Guthaben', 'stored_balance_help' => 'Geschenkkarten + Guthaben',
            'search' => 'Name oder Code suchen...', 'status_filter' => 'Statusfilter', 'all' => 'Alle', 'active_only' => 'Aktiv', 'inactive' => 'Inaktiv',
            'types' => 'Gutscheinarten', 'all_types' => 'Alle Arten', 'coupon' => 'Gutschein', 'gift_card' => 'Geschenkkarte', 'voucher' => 'Wertgutschein', 'credit' => 'Guthaben', 'comp' => 'Kulanz',
            'no_description' => 'Keine Beschreibung', 'discount' => 'Rabatt', 'balance' => 'Guthaben', 'min_order' => 'Mindestwert', 'uses' => 'Nutzungen', 'unlimited' => 'Unbegrenzt',
            'expires' => 'Gültig bis', 'no_expiry' => 'Kein Ablaufdatum', 'expired' => 'Abgelaufen', 'disabled' => 'Deaktiviert', 'enabled' => 'Aktiv', 'created' => 'Erstellt',
            'disable' => 'Deaktivieren', 'enable' => 'Aktivieren', 'edit' => 'Bearbeiten', 'copy_code' => 'Code kopieren', 'copied' => 'Kopiert',
            'empty' => 'Noch keine Gutscheine oder Karten', 'empty_help' => 'Erstelle den ersten Code. Er erscheint anschließend hier.', 'no_results' => 'Keine Gutscheine entsprechen diesen Filtern.',
            'modal_create' => 'Gutschein / Karte erstellen', 'modal_edit' => 'Gutschein / Karte bearbeiten', 'close' => 'Schließen', 'cancel' => 'Abbrechen', 'save' => 'Speichern', 'saving' => 'Wird gespeichert...', 'saved' => 'Gespeichert',
            'delete' => 'Löschen', 'delete_permanently' => 'Endgültig löschen', 'delete_confirm' => 'Diesen Gutschein / diese Karte endgültig löschen? Dies kann nicht rückgängig gemacht werden.', 'deleting' => 'Wird gelöscht...', 'deleted' => 'Gelöscht',
            'basic' => 'Grundinformationen', 'basic_help' => 'Name, Code und die Art des Werts, den dieser Code bietet.', 'card_type' => 'Art', 'name' => 'Name', 'code' => 'Code', 'generate' => 'Generieren', 'description' => 'Beschreibung',
            'discount_section' => 'Rabatt', 'discount_help' => 'Wähle einen festen Betrag oder einen prozentualen Rabatt.', 'fixed' => 'Fester Betrag', 'percentage' => 'Prozent', 'discount_value' => 'Rabattwert',
            'balance_section' => 'Guthaben', 'balance_help' => 'Startguthaben für eine neue Geschenkkarte, ein Guthaben oder eine Kulanzkarte.', 'starting_balance' => 'Startguthaben', 'current_balance' => 'Aktuelles Guthaben',
            'gift_options' => 'Geschenkkarten-Optionen', 'gift_options_help' => 'Gilt nur für Geschenkkarten.', 'purchasable' => 'Kaufbar', 'purchase_price' => 'Kaufpreis', 'reloadable' => 'Aufladbar', 'transferable' => 'Übertragbar',
            'rules' => 'Nutzungsregeln', 'rules_help' => 'Lege nur die Grenzen fest, die für diesen Code sinnvoll sind.', 'minimum_order' => 'Mindestbestellwert', 'max_redemptions' => 'Maximale Einlösungen', 'per_customer' => 'Pro Gast', 'zero_unlimited' => '0 = unbegrenzt', 'expiry_date' => 'Ablaufdatum',
            'status' => 'Aktiv', 'status_help' => 'Inaktive Codes bleiben gespeichert, können aber nicht verwendet werden.', 'code_help' => 'Leer lassen und PMD erzeugt einen eindeutigen Code.',
            'save_error' => 'Gutschein / Karte konnte nicht gespeichert werden.', 'delete_error' => 'Gutschein / Karte konnte nicht gelöscht werden.', 'toggle_error' => 'Status konnte nicht geändert werden.', 'refresh_error' => 'Gespeichert, aber die Gutscheinansicht konnte nicht aktualisiert werden.',
        ],
    ];
    $pmdT = static fn(string $key) => $pmdCouponCopy[$pmdCouponLocale][$key] ?? $pmdCouponCopy['en'][$key] ?? $key;
    $typeLabel = static fn(string $type) => $pmdT($type);
    $statusSearch = static fn(array $item) => $item['is_active'] ? 'active' : 'inactive';
@endphp


{{-- PMD_COUPON_NOTIFICATION_SERVER_FIRST_V13 --}}
@php
    $pmdCouponNotificationCountV13 = 0;

    try {
        $pmdCouponNotificationCountV13 =
            app(
                \Admin\Services\PmdNotificationCountV1::class
            )->currentNewCount();
    } catch (\Throwable $error) {
        $pmdCouponNotificationCountV13 = 0;
    }
@endphp

<div id="pmd-coupon-manager-main" class="pmd-owner-page pmd-coupon-manager" data-pmd-coupon-manager data-pmd-locale="{{ $pmdCouponLocale }}">
    <!-- PMD_DASHBOARD_HEADER_CLONE_V1_COUPON_START -->
<header
    id="pmd-r2-clean-header"
    class="pmd-owner-header pmd-dashboard-lab__dashboard2-header pmd-coupon-manager__topbar"
    aria-label="{{ $pmdT('header') }}"
    data-pmd-dashboard-header-clone="coupon-v1"
>
    <div class="pmd-owner-header__left">
        <h1 class="pmd-r2-clean-title">{{ $pmdT('title') }}</h1>
    </div>

    <div
        class="pmd-owner-header__actions pmd-r2-clean-actions"
        aria-label="{{ $pmdT('actions') }}"
    >
        <button
            type="button"
            class="pmd-dashboard-lab__header-action"
            data-pmd-coupon-create
            aria-label="{{ $pmdT('create') }}"
            title="{{ $pmdT('create') }}"
        >
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <path d="M12 5v14"></path>
                <path d="M5 12h14"></path>
            </svg>
        </button>


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
            
                    @if($pmdCouponNotificationCountV13 > 0)
                        <span
                            class="pmd-header-server-count-v13"
                            data-pmd-coupon-count-v13
                            aria-hidden="true"
                        >{{ $pmdCouponNotificationCountV13 }}</span>
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
        trigger.setAttribute(
          'aria-label',
          'Notifications'
        );
        trigger.setAttribute(
          'title',
          'Notifications'
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
<!-- PMD_DASHBOARD_HEADER_CLONE_V1_COUPON_END -->

    <div data-pmd-coupon-refresh-zone>
    <section class="pmd-coupon-kpis" aria-label="{{ $pmdT('overview') }}">
        <article class="pmd-coupon-kpi">
            <div class="pmd-coupon-kpi__icon"><svg viewBox="0 0 24 24"><path d="M4 7h16v10H4z"></path><path d="M8 7v10M16 7v10"></path><path d="M10 12h4"></path></svg></div>
            <div class="pmd-coupon-kpi__copy"><span>{{ $pmdT('total') }}</span><strong>{{ (int)$stats['total'] }}</strong><small>{{ $pmdT('total_help') }}</small></div>
        </article>
        <article class="pmd-coupon-kpi">
            <div class="pmd-coupon-kpi__icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="m8 12 2.5 2.5L16.5 9"></path></svg></div>
            <div class="pmd-coupon-kpi__copy"><span>{{ $pmdT('active') }}</span><strong>{{ (int)$stats['active'] }}</strong><small>{{ $pmdT('active_help') }}</small></div>
        </article>
        <article class="pmd-coupon-kpi">
            <div class="pmd-coupon-kpi__icon is-warm"><svg viewBox="0 0 24 24"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path><path d="M5 6h4v12H5z"></path></svg></div>
            <div class="pmd-coupon-kpi__copy"><span>{{ $pmdT('redemptions') }}</span><strong>{{ (int)$stats['redemptions'] }}</strong><small>{{ $pmdT('redemptions_help') }}</small></div>
        </article>
        <article class="pmd-coupon-kpi">
            <div class="pmd-coupon-kpi__icon is-money"><svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z"></path><path d="M8 10h8M8 14h5"></path></svg></div>
            <div class="pmd-coupon-kpi__copy"><span>{{ $pmdT('stored_balance') }}</span><strong>{{ currency_format((float)$stats['stored_balance']) }}</strong><small>{{ $pmdT('stored_balance_help') }}</small></div>
        </article>
    </section>

    <section class="pmd-coupon-manager__panel">
        <div class="pmd-coupon-manager__toolbar">
            <label class="pmd-coupon-manager__search">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>
                <input type="search" placeholder="{{ $pmdT('search') }}" autocomplete="off" data-pmd-coupon-search>
            </label>
            <div class="pmd-coupon-manager__status-filters" aria-label="{{ $pmdT('status_filter') }}">
                <button type="button" class="is-active" data-pmd-status-filter="all">{{ $pmdT('all') }}</button>
                <button type="button" data-pmd-status-filter="active">{{ $pmdT('active_only') }}</button>
                <button type="button" data-pmd-status-filter="inactive">{{ $pmdT('inactive') }}</button>
            </div>
        </div>

        <div class="pmd-coupon-manager__types" aria-label="{{ $pmdT('types') }}">
            <button type="button" class="is-active" data-pmd-type-filter="all">{{ $pmdT('all_types') }}</button>
            @foreach(['coupon', 'gift_card', 'voucher', 'credit', 'comp'] as $type)
                <button type="button" data-pmd-type-filter="{{ $type }}">{{ $typeLabel($type) }}</button>
            @endforeach
        </div>

        <div class="pmd-coupon-manager__grid" data-pmd-coupon-grid>
            @forelse($cards as $item)
                @php
                    $isBalance = in_array($item['card_type'], ['gift_card', 'credit', 'comp'], true);
                    $primaryValue = $isBalance
                        ? currency_format((float)$item['current_balance'])
                        : ($item['discount_type'] === 'P' ? rtrim(rtrim(number_format((float)$item['discount'], 2, '.', ''), '0'), '.').'%' : currency_format((float)$item['discount']));
                    $searchText = mb_strtolower(trim($item['name'].' '.$item['code'].' '.$item['description'].' '.$typeLabel($item['card_type'])));
                    $maxUses = (int)$item['redemptions'] > 0 ? (string)(int)$item['redemptions'] : $pmdT('unlimited');
                @endphp
                <article class="pmd-coupon-card {{ !$item['is_active'] ? 'is-inactive' : '' }} {{ $item['is_expired'] ? 'is-expired' : '' }}" data-pmd-coupon-card data-coupon-id="{{ (int)$item['id'] }}" data-card-type="{{ e($item['card_type']) }}" data-status="{{ $statusSearch($item) }}" data-search="{{ e($searchText) }}">
                    <div class="pmd-coupon-card__head">
                        <div class="pmd-coupon-card__type-icon" data-card-type="{{ e($item['card_type']) }}" aria-hidden="true">
                            @if($item['card_type'] === 'gift_card')
                                <svg viewBox="0 0 24 24"><path d="M4 8h16v12H4z"></path><path d="M4 12h16"></path><path d="M12 8v12"></path><path d="M9 8c-2 0-3-1-3-2.5S7 3 8.5 3C11 3 12 8 12 8"></path><path d="M15 8c2 0 3-1 3-2.5S17 3 15.5 3C13 3 12 8 12 8"></path></svg>
                            @elseif($item['card_type'] === 'voucher')
                                <svg viewBox="0 0 24 24"><path d="M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4z"></path><path d="M12 7v12"></path></svg>
                            @elseif($item['card_type'] === 'credit')
                                <svg viewBox="0 0 24 24"><path d="M4 7h16v10H4z"></path><path d="M8 11h8M8 14h5"></path></svg>
                            @elseif($item['card_type'] === 'comp')
                                <svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.3 6.8 19l1-5.8-4.3-4.1 5.9-.9z"></path></svg>
                            @else
                                <svg viewBox="0 0 24 24"><path d="M4 7h16v10H4z"></path><path d="M8 7v10M16 7v10"></path><path d="M10 12h4"></path></svg>
                            @endif
                        </div>
                        <div class="pmd-coupon-card__head-copy">
                            <span class="pmd-coupon-card__type">{{ $typeLabel($item['card_type']) }}</span>
                            <h2>{{ $item['name'] !== '' ? $item['name'] : $item['code'] }}</h2>
                        </div>
                        <span class="pmd-coupon-card__state {{ $item['is_active'] ? 'is-active' : 'is-off' }}">
                            <i></i>{{ $item['is_expired'] ? $pmdT('expired') : ($item['is_active'] ? $pmdT('enabled') : $pmdT('disabled')) }}
                        </span>
                    </div>

                    <div class="pmd-coupon-card__code-row">
                        <code>{{ $item['code'] }}</code>
                        <button type="button" data-pmd-copy-code="{{ e($item['code']) }}" aria-label="{{ $pmdT('copy_code') }}" title="{{ $pmdT('copy_code') }}"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg></button>
                    </div>

                    <div class="pmd-coupon-card__value">
                        <span>{{ $isBalance ? $pmdT('balance') : $pmdT('discount') }}</span><strong>{{ $primaryValue }}</strong>
                    </div>

                    @if($item['description'] !== '')
                        <p class="pmd-coupon-card__description">{{ $item['description'] }}</p>
                    @else
                        <p class="pmd-coupon-card__description is-empty">{{ $pmdT('no_description') }}</p>
                    @endif

                    <div class="pmd-coupon-card__meta">
                        <span><small>{{ $pmdT('min_order') }}</small><b>{{ currency_format((float)$item['min_total']) }}</b></span>
                        <span><small>{{ $pmdT('uses') }}</small><b>{{ (int)$item['redemption_count'] }} / {{ $maxUses }}</b></span>
                        <span><small>{{ $pmdT('expires') }}</small><b>{{ $item['expiry_date'] !== '' ? $item['expiry_date'] : $pmdT('no_expiry') }}</b></span>
                    </div>

                    <div class="pmd-coupon-card__actions">
                        <button type="button" class="pmd-coupon-card__status-btn" data-pmd-coupon-toggle="{{ (int)$item['id'] }}" {{ $item['is_expired'] ? 'disabled' : '' }}>{{ $item['status'] ? $pmdT('disable') : $pmdT('enable') }}</button>
                        <button type="button" class="pmd-coupon-card__edit-btn" data-pmd-coupon-edit="{{ (int)$item['id'] }}">{{ $pmdT('edit') }}</button>
                    </div>
                </article>
            @empty
                <div class="pmd-coupon-manager__empty" data-pmd-coupon-empty>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v10H4z"></path><path d="M8 7v10M16 7v10"></path><path d="M10 12h4"></path></svg>
                    <h2>{{ $pmdT('empty') }}</h2><p>{{ $pmdT('empty_help') }}</p>
                </div>
            @endforelse
            <div class="pmd-coupon-manager__no-results" data-pmd-coupon-no-results hidden>{{ $pmdT('no_results') }}</div>
        </div>
    </section>
    </div>
</div>

@include('pmdcoupons._modal_host', ['pmdT' => $pmdT, 'pmdCouponLocale' => $pmdCouponLocale])

<script type="application/json" id="pmd-coupon-manager-catalog">{!! json_encode($catalog, JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE) !!}</script>
<script type="application/json" id="pmd-coupon-manager-copy">{!! json_encode($pmdCouponCopy[$pmdCouponLocale], JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE) !!}</script>
