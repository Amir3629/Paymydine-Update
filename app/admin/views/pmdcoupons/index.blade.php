@php
    $cards = $pmdCouponCards ?? [];
    $catalog = $pmdCouponCatalog ?? [];
    $stats = $pmdCouponStats ?? ['total' => 0, 'active' => 0, 'redemptions' => 0, 'stored_balance' => 0];

    $pmdCouponLocale = strtolower(trim((string)request()->cookie('pmd_admin_locale', app()->getLocale())));
    $pmdCouponLocale = str_starts_with($pmdCouponLocale, 'de') ? 'de' : 'en';

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
            'overview' => 'Gutscheinübersicht', 'total' => 'Codes', 'total_help' => 'Gutscheine + Karten', 'active' => 'Aktiv', 'active_help' => 'Jetzt verwendbar',
            'redemptions' => 'Einlösungen', 'redemptions_help' => 'Erfolgreiche Nutzungen', 'stored_balance' => 'Guthaben', 'stored_balance_help' => 'Geschenkkarten + Guthaben',
            'search' => 'Name oder Code suchen...', 'status_filter' => 'Statusfilter', 'all' => 'Alle', 'active_only' => 'Aktiv', 'inactive' => 'Inaktiv',
            'types' => 'Gutscheinarten', 'all_types' => 'Alle Arten', 'coupon' => 'Gutschein', 'gift_card' => 'Geschenkkarte', 'voucher' => 'Voucher', 'credit' => 'Guthaben', 'comp' => 'Kulanz',
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

<div id="pmd-coupon-manager-main" class="pmd-owner-page pmd-coupon-manager" data-pmd-coupon-manager data-pmd-locale="{{ $pmdCouponLocale }}">
    <header id="pmd-r2-clean-header" class="pmd-owner-header pmd-dashboard-lab__dashboard2-header pmd-coupon-manager__topbar" aria-label="{{ $pmdT('header') }}">
        <div class="pmd-owner-header__left">
            <h1 class="pmd-r2-clean-title">{{ $pmdT('title') }}</h1>
        </div>
        <div class="pmd-owner-header__actions pmd-r2-clean-actions" aria-label="{{ $pmdT('actions') }}">
            <button type="button" class="pmd-dashboard-lab__header-action pmd-coupon-manager__header-action" data-pmd-coupon-create aria-label="{{ $pmdT('create') }}" title="{{ $pmdT('create') }}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
            </button>
            <span class="pmd-owner-notif-slot pmd-dashboard-lab__notif-slot" aria-label="{{ $pmdT('notifications') }}">
                <span class="pmd-dashboard-lab__notif-fallback" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></span>
            </span>
        </div>
    </header>

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
