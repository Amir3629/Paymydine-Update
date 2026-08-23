{{-- PMD_CASHIER_TITLELESS_TOOLS_V3_3_2 --}}
@php
    $orders = $pmdCashierCurrentOrders ?? [];
    $text = $pmdCashierCurrentOrdersText ?? [];
    $range = $pmdCashierOrdersRange ?? [];
    $debug = $pmdCashierOrdersDebug ?? [];
    $count = count($orders);
    $pmdCashierIsGerman = strtolower((string)($pmdCleanWorkspaceLocale ?? app()->getLocale())) === 'de';
    $pmdCashierAddReservation = $pmdCashierIsGerman ? 'Reservierung hinzufügen' : 'Add reservation';
    $pmdCashierAddOrder = $pmdCashierIsGerman ? 'Neue Bestellung' : 'New order';

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
    $pmdCashierHistoryButton = $text['history'] ?? ($pmdCashierIsGerman ? 'Verlauf' : 'History');
    $pmdCashierCurrentButton = $text['current'] ?? ($pmdCashierIsGerman ? 'Aktuell' : 'Current');

    $pmdCashierCreateDate = (string)($range['today'] ?? \Carbon\Carbon::now('Europe/Berlin')->toDateString());
@endphp

<section
    data-pmd-titleless-v3-3-2="true"
    id="pmd-cashier-current-orders-v2"
    class="pmd-ops-section"
    aria-label="{{ $text['orders'] ?? 'Orders' }}"
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
                    ? ($text['history_orders'] ?? 'History')
                    : ($count === 1
                        ? ($text['order'] ?? 'Order')
                        : ($text['orders'] ?? 'Orders')) }}
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
                            {{ $text['items'] ?? 'Items' }}
                        </span>

                        @if($order['has_note'])
                            <span class="pmd-ops-card__note">
                                {{ $text['note'] ?? 'Note' }}
                            </span>
                        @endif
                    </div>

                    <dl class="pmd-ops-card__facts pmd-ops-card__facts--money">
                        <div>
                            <dt>{{ $text['total'] ?? 'Total' }}</dt>
                            <dd>{{ $order['total'] }}</dd>
                        </div>
                        <div>
                            <dt>{{ $text['paid'] ?? 'Paid' }}</dt>
                            <dd>{{ $order['paid'] }}</dd>
                        </div>
                        <div>
                            <dt>{{ $text['due'] ?? 'Due' }}</dt>
                            <dd class="is-due">{{ $order['due'] }}</dd>
                        </div>
                    </dl>

                    <footer class="pmd-ops-card__footer" style="gap:8px;flex-wrap:wrap;">
                        {{-- PMD_CASHIER_OPEN_ORDER_COMPOSER_R44 --}}
                        <a
                            href="{{ $order['edit_url'] }}"
                            data-pmd-cashier-open-composer="1"
                        >
                            {{ $text['open_order'] ?? 'Open order' }}
                        </a>

                        {{-- PMD_CASHIER_MANUAL_FREE_BUTTON_R45
                             Payment NEVER changes table occupancy. The staff action is
                             rendered only for a fully-paid card; the endpoint still
                             re-checks every check on the physical table before release. --}}
                        @if(!$pmdCashierHistoryMode && !empty($order['is_paid']) && (int)($order['table_id'] ?? 0) > 0)
                            <button
                                type="button"
                                data-pmd-cashier-table-free="{{ (int)$order['table_id'] }}"
                                data-pmd-cashier-table-label="{{ $order['table'] }}"
                                style="border-color:#b9dcca;background:#f1faf6;color:#246b4b;"
                            >
                                {{ $text['free_table'] ?? 'Set table free' }}
                            </button>
                        @endif
                    </footer>
                </article>
        @endforeach
    </div>
</section>
