{{-- PMD_CASHIER_TITLELESS_TOOLS_V3_3_2 --}}
@php
    $orders = $pmdCashierCurrentOrders ?? [];
    $text = $pmdCashierCurrentOrdersText ?? [];
    $range = $pmdCashierOrdersRange ?? [];
    $debug = $pmdCashierOrdersDebug ?? [];
    $count = count($orders);
@endphp

<section
    data-pmd-titleless-v3-3-2="true"
    id="pmd-cashier-current-orders-v2"
    class="pmd-ops-section"
    aria-label="{{ $text['orders'] ?? 'Orders' }}"
    data-pmd-ops-kind="orders"
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

            <span class="pmd-ops-section__count">
                <strong>{{ $count }}</strong>
                {{ $count === 1
                    ? ($text['order'] ?? 'Order')
                    : ($text['orders'] ?? 'Orders') }}
            </span>
        </div>
    </header>

    @if($count === 0)
        <div class="pmd-ops-empty">
            <strong>{{ $text['empty_title'] ?? 'No orders in this date range' }}</strong>
            <span>{{ $text['empty_text'] ?? 'No table orders were found for the selected date range.' }}</span>
        </div>
    @else
        <div class="pmd-ops-grid">
            @foreach($orders as $order)
                <article
                    class="pmd-ops-card"
                    data-pmd-cashier-order="{{ $order['id'] }}"
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

                    <footer class="pmd-ops-card__footer">
                        <a href="{{ $order['edit_url'] }}">
                            {{ $text['open_order'] ?? 'Open order' }}
                        </a>
                    </footer>
                </article>
            @endforeach
        </div>
    @endif
</section>
