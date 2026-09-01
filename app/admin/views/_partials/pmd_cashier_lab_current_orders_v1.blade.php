{{-- PMD_CASHIER_TITLELESS_TOOLS_V3_3_2 --}}
@php
    $orders = $pmdCashierCurrentOrders ?? [];
    $text = $pmdCashierCurrentOrdersText ?? [];
    $range = $pmdCashierOrdersRange ?? [];
    $debug = $pmdCashierOrdersDebug ?? [];
    $count = count($orders);
    // PMD_CASHIER_TR_SERVER_COPY_R2A
    $pmdCashierLocale = \Admin\Classes\PmdPlatformI18n::normalizeLocale(
        (string)($pmdCleanWorkspaceLocale ?? app()->getLocale())
    );
    $pmdCashierIsGerman = $pmdCashierLocale === 'de';
    $pmdCashierT = static function (string $source) use ($pmdCashierLocale): string {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish(
            $source,
            '',
            [],
            $pmdCashierLocale,
            $source
        );
    };
    if ($pmdCashierLocale === 'tr') {
        $text = \Admin\Classes\PmdPlatformI18n::translateStructure(
            is_array($text) ? $text : [],
            '',
            'tr'
        );
    }
    $pmdCashierAddReservation = $pmdCashierIsGerman
        ? 'Reservierung hinzufügen'
        : $pmdCashierT('Add reservation');
    $pmdCashierAddOrder = $pmdCashierIsGerman
        ? 'Neue Bestellung'
        : $pmdCashierT('New order');

    // PMD_CASHIER_HISTORY_UI_R46
    $pmdCashierHistoryMode = !empty($pmdCashierHistoryMode);
    $pmdCashierRangeQuery = [
        'pmd_from' => (string)($range['from'] ?? ''),
        'pmd_to' => (string)($range['to'] ?? ''),
    ];
    $pmdCashierCurrentUrl = admin_url('cashierlab').'?'.http_build_query($pmdCashierRangeQuery);
    $pmdCashierHistoryUrl = admin_url('cashierlab').'?'.http_build_query(
        array_merge($pmdCashierRangeQuery, ['pmd_history' => 1])
    );
    $pmdCashierHistoryButton = $text['history'] ?? ($pmdCashierIsGerman ? 'Verlauf' : $pmdCashierT('History'));
    $pmdCashierCurrentButton = $text['current'] ?? ($pmdCashierIsGerman ? 'Aktuell' : $pmdCashierT('Current'));

    $pmdCashierCreateDate = (string)($range['today'] ?? \Carbon\Carbon::now('Europe/Berlin')->toDateString());
@endphp

<section
    data-pmd-titleless-v3-3-2="true"
    id="pmd-cashier-current-orders-v2"
    class="pmd-ops-section"
    aria-label="{{ $text['orders'] ?? $pmdCashierT('Orders') }}"
    data-pmd-ops-kind="orders"
    data-pmd-history-mode="{{ $pmdCashierHistoryMode ? 'history' : 'current' }}"
    data-pmd-range-from="{{ $range['from'] ?? '' }}"
    data-pmd-range-to="{{ $range['to'] ?? '' }}"
    data-pmd-source-date-column="{{ $debug['date_column'] ?? '' }}"
    data-pmd-source-rows="{{ $debug['source_rows'] ?? 0 }}"
    data-pmd-mapped-rows="{{ $debug['mapped_rows'] ?? 0 }}"
    data-pmd-unmapped-rows="{{ $debug['unmapped_rows'] ?? 0 }}"
>
    <header class="pmd-ops-section__header pmd-ops-section__header--tools-only">
        <div class="pmd-ops-section__tools">
            @include('admin::_partials.pmd_operational_date_range_v1', [
                'pmdOpsRange' => $range,
            ])

            {{-- PMD_CASHIER_R60L_FREE_TABLE_TOOLBAR
                 One canonical table-release action for the Floor selection.
                 The R45 action authority owns the existing backend call. --}}
            @if(!$pmdCashierHistoryMode)
                <button
                    type="button"
                    class="pmd-ops-free-table-toolbar"
                    data-pmd-cashier-table-free-toolbar="1"
                    data-pmd-cashier-table-free="0"
                    data-pmd-cashier-table-label=""
                    aria-disabled="true"
                    disabled
                    title="{{ $pmdCashierT('Select a red occupied table first.') }}"
                >
                    <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <rect x="3" y="5" width="18" height="14" rx="3"></rect>
                        <path d="M3 10h18"></path>
                        <path d="M8 5v14"></path>
                    </svg>

                    <span>
                        {{ $text['free_table'] ?? ($pmdCashierIsGerman ? 'Tisch freigeben' : $pmdCashierT('Free table')) }}
                    </span>
                </button>
            @endif

            {{-- PMD_CASHIER_HISTORY_INLINE_R47
                 Same-page mode toggle. The shared operational async authority
                 replaces only this orders section; the Dashboard/Floor stays mounted. --}}
            <button
                type="button"
                class="pmd-ops-history-toggle{{ $pmdCashierHistoryMode ? ' is-active' : '' }}"
                data-pmd-cashier-history-toggle="1"
                data-pmd-history-target-url="{{ $pmdCashierHistoryMode ? $pmdCashierCurrentUrl : $pmdCashierHistoryUrl }}"
                aria-pressed="{{ $pmdCashierHistoryMode ? 'true' : 'false' }}"
                aria-label="{{ $pmdCashierHistoryMode ? $pmdCashierCurrentButton : $pmdCashierHistoryButton }}"
                title="{{ $pmdCashierHistoryMode ? $pmdCashierCurrentButton : $pmdCashierHistoryButton }}"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 12a9 9 0 1 0 3-6.7"></path>
                    <path d="M3 4v5h5"></path>
                    <path d="M12 7v5l3 2"></path>
                </svg>
                <span>{{ $pmdCashierHistoryMode ? $pmdCashierCurrentButton : $pmdCashierHistoryButton }}</span>
            </button>

            <span class="pmd-ops-section__count">
                <strong>{{ $count }}</strong>
                {{ $pmdCashierHistoryMode
                    ? ($text['history_orders'] ?? $pmdCashierT('History'))
                    : ($count === 1
                        ? ($text['order'] ?? $pmdCashierT('Order'))
                        : ($text['orders'] ?? $pmdCashierT('Orders'))) }}
            </span>
        </div>
    </header>

    <div class="pmd-ops-grid">
        @if(!$pmdCashierHistoryMode)
        {{-- PMD_CASHIERLAB_ADD_ORDER_CARD_R41
             Cashier + means ordering. Reservation creation stays on ReservationsLab. --}}
        <a
            class="pmd-ops-add-card pmd-r2-simple-add-link-v460"
            href="#pmd-cashier-order-composer"
            data-pmd-cashier-order-create="card"
            aria-label="{{ $pmdCashierAddOrder }}"
        >
            <span class="pmd-r2-simple-add-icon-v460" aria-hidden="true">＋</span>
            <span class="pmd-r2-simple-add-title-v460">{{ $pmdCashierAddOrder }}</span>
        </a>
        @endif

        {{-- Deliberately no "No Orders" card. The 0 Orders count and the New
             order action already communicate the empty state without adding
             another visual tile to the Cashier grid. --}}

        @foreach($orders as $order)
                {{-- PMD_CASHIER_ORDER_CARD_TABLE_HINT_R42 --}}
                <article
                    class="pmd-ops-card"
                    data-pmd-cashier-order="{{ $order['id'] }}"
                    data-pmd-cashier-order-paid="{{ !empty($order['is_paid']) ? '1' : '0' }}"
                    data-pmd-cashier-table-id="{{ $order['table_id'] ?? 0 }}"
                    data-pmd-cashier-table-number="{{ $order['table_number'] ?? '' }}"
                    data-pmd-cashier-table-label="{{ $order['table_label'] ?? $order['table'] ?? '' }}"
                >
                    <header class="pmd-ops-card__head">
                        <strong class="pmd-ops-card__title">
                            {{ $order['table'] }}
                        </strong>

                        <span class="pmd-ops-card__status is-{{ $order['status_key'] }}">
                            {{ $order['status_label'] }}
                        </span>
                    </header>

                    <div class="pmd-ops-card__meta">
                        <strong>#{{ $order['id'] }}</strong>

                        @if($order['time'])
                            <span>{{ $order['time'] }}</span>
                        @endif

                        <span>
                            {{ $order['items'] }}
                            {{ $text['items'] ?? $pmdCashierT('Items') }}
                        </span>

                        @if($order['has_note'])
                            <span class="pmd-ops-card__note">
                                {{ $text['note'] ?? $pmdCashierT('Note') }}
                            </span>
                        @endif
                    </div>

                    <dl class="pmd-ops-card__facts pmd-ops-card__facts--money">
                        <div>
                            <dt>{{ $text['total'] ?? $pmdCashierT('Total') }}</dt>
                            <dd>{{ $order['total'] }}</dd>
                        </div>
                    
                        <div>
                            <dt>{{ $text['paid'] ?? $pmdCashierT('Paid') }}</dt>
                            <dd>{{ $order['paid'] }}</dd>
                        </div>
                    
                        {{-- PMD_CASHIER_R60Q2_PAID_CARD_OWNER --}}
                        @if(!empty($order['is_paid']))
                            <div class="pmd-ops-card__paid-state">
                                <dt aria-hidden="true">&nbsp;</dt>
                                <dd class="is-paid-label">
                                    {{ $text['paid'] ?? $pmdCashierT('Paid') }}
                                </dd>
                            </div>
                        @else
                            <div>
                                <dt>{{ $text['due'] ?? $pmdCashierT('Due') }}</dt>
                                <dd class="is-due">{{ $order['due'] }}</dd>
                            </div>
                        @endif
                    </dl>

                    <footer class="pmd-ops-card__footer" style="gap:8px;flex-wrap:wrap;">
                        {{-- PMD_CASHIER_OPEN_ORDER_COMPOSER_R44 --}}
                        <a
                            href="{{ $order['edit_url'] }}"
                            data-pmd-cashier-open-composer="1"
                        >
                            {{ $text['open_order'] ?? $pmdCashierT('Open order') }}
                        </a>


                    </footer>
                </article>
        @endforeach
    </div>
</section>
