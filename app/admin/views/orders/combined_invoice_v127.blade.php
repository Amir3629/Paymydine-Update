@php
    /* PMD_QPOS_COMBINED_INVOICE_VIEW_V127
     * Customer-facing 80mm combined document for one verified V114
     * multi-check settlement. Every canonical order remains identifiable. */
    $siteName = trim((string)setting('site_name', 'PayMyDine')) ?: 'PayMyDine';
    $taxTitle = trim((string)setting('tax_title', 'VAT')) ?: 'VAT';
    $currency = (string)($currency ?? '€');
    $orderIds = array_values(array_map('intval', (array)($orderIds ?? [])));
    $orders = array_values((array)($orders ?? []));
    $combinedSubtotal = (float)($combinedSubtotal ?? 0);
    $combinedTax = (float)($combinedTax ?? 0);
    $combinedTotal = (float)($combinedTotal ?? 0);
    $tableName = trim((string)($tableName ?? ''));
    $paymentMethod = trim((string)($paymentMethod ?? 'payment'));
    $printRequested = !empty($printRequested);

    try {
        $paidAtLabel = \Illuminate\Support\Carbon::parse($paidAt ?? now())
            ->format('Y-m-d H:i');
    } catch (\Throwable $ignored) {
        $paidAtLabel = (string)($paidAt ?? '');
    }

    $orderLabel = collect($orderIds)
        ->map(static fn ($id) => '#'.$id)
        ->implode(' + ');
@endphp
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta
        name="viewport"
        content="width=device-width,initial-scale=1,viewport-fit=cover"
    >
    <title>Combined Invoice {{ $orderLabel }}</title>
    <style>
        :root {
            color-scheme: light;
            --pmd-ink: #111827;
            --pmd-muted: #64748b;
            --pmd-line: #d7dde5;
            --pmd-green: #064e3b;
        }

        * { box-sizing: border-box; }

        @page {
            size: 80mm auto;
            margin: 4mm;
        }

        body {
            margin: 0;
            padding: 16px 12px 24px;
            background: #f5f6f7;
            color: var(--pmd-ink);
            font-family: Arial, Helvetica, sans-serif;
        }

        .pmd-combined-invoice {
            width: 72mm;
            max-width: calc(100vw - 24px);
            margin: 0 auto;
            padding: 10px 8px;
            border: 1px solid #d5d9de;
            background: #fff;
        }

        .center { text-align: center; }

        .brand {
            margin: 0;
            font-size: 15px;
            font-weight: 800;
        }

        .doc-title {
            margin-top: 4px;
            font-size: 12px;
            font-weight: 800;
        }

        .paid {
            display: inline-block;
            margin-top: 6px;
            padding: 2px 8px;
            border: 1px solid #166534;
            border-radius: 999px;
            color: #166534;
            font-size: 10px;
            font-weight: 800;
        }

        .sep {
            margin: 8px 0;
            border-top: 1px dashed #777;
        }

        .row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            font-size: 11px;
            line-height: 1.45;
        }

        .row > :last-child {
            text-align: right;
        }

        .orders-label {
            max-width: 60%;
            overflow-wrap: anywhere;
            font-weight: 800;
        }

        .order-block + .order-block {
            margin-top: 10px;
            padding-top: 9px;
            border-top: 1px dotted #a7adb5;
        }

        .order-title {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
            margin-bottom: 5px;
            font-size: 11px;
            font-weight: 800;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        td {
            padding: 2px 0;
            vertical-align: top;
            font-size: 11px;
            line-height: 1.35;
        }

        td:first-child {
            width: 74%;
            padding-right: 6px;
            overflow-wrap: anywhere;
        }

        td:last-child {
            width: 26%;
            text-align: right;
            white-space: nowrap;
        }

        .order-total {
            margin-top: 5px;
            color: #374151;
            font-size: 10px;
        }

        .totals .row {
            margin: 2px 0;
        }

        .totals .total {
            margin-top: 4px;
            font-size: 13px;
            font-weight: 900;
        }

        .invoice-actions {
            width: 72mm;
            max-width: calc(100vw - 24px);
            margin: 12px auto 0;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }

        .invoice-actions button {
            min-height: 44px;
            border: 1px solid #1f2937;
            border-radius: 9px;
            padding: 0 12px;
            background: #fff;
            color: #111827;
            font: inherit;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
        }

        .invoice-actions .back-btn {
            border-color: var(--pmd-green);
            background: var(--pmd-green);
            color: #fff;
        }

        @media (max-width: 480px) {
            body {
                padding-top: max(12px, env(safe-area-inset-top));
                padding-bottom: max(18px, env(safe-area-inset-bottom));
            }

            .pmd-combined-invoice,
            .invoice-actions {
                width: 100%;
                max-width: 100%;
            }

            .invoice-actions button {
                min-height: 52px;
                font-size: 15px;
            }
        }

        @media print {
            body {
                padding: 0;
                background: #fff;
            }

            .pmd-combined-invoice {
                width: 100%;
                max-width: 100%;
                margin: 0;
                padding: 0;
                border: 0;
            }

            .invoice-actions {
                display: none !important;
            }
        }
    </style>
</head>
<body>
    <main class="pmd-combined-invoice">
        <header class="center">
            <h1 class="brand">{{ $siteName }}</h1>
            <div class="doc-title">Combined Invoice</div>
            <span class="paid">Paid</span>
        </header>

        <div class="sep"></div>

        <section>
            <div class="row">
                <span>Orders</span>
                <span class="orders-label">{{ $orderLabel }}</span>
            </div>
            <div class="row">
                <span>Date</span>
                <span>{{ $paidAtLabel }}</span>
            </div>
            @if($tableName !== '')
                <div class="row">
                    <span>Context</span>
                    <span>{{ $tableName }}</span>
                </div>
            @endif
            <div class="row">
                <span>Payment</span>
                <span>{{ ucfirst(str_replace('_', ' ', $paymentMethod)) }}</span>
            </div>
        </section>

        <div class="sep"></div>

        <section>
            @foreach($orders as $order)
                @php
                    $oid = (int)($order['order_id'] ?? 0);
                    $items = (array)($order['items'] ?? []);
                    $orderTotal = (float)($order['total'] ?? 0);
                @endphp
                <article class="order-block">
                    <div class="order-title">
                        <span>Order #{{ $oid }}</span>
                        <span>{{ $currency }}{{ number_format($orderTotal, 2) }}</span>
                    </div>

                    <table>
                        <tbody>
                            @forelse($items as $item)
                                @php
                                    $qty = (float)($item['quantity'] ?? 1);
                                    $qtyLabel = rtrim(
                                        rtrim(
                                            number_format($qty, 2, '.', ''),
                                            '0'
                                        ),
                                        '.'
                                    );
                                    $lineTotal = (float)(
                                        $item['line_total'] ?? 0
                                    );
                                @endphp
                                <tr>
                                    <td>
                                        {{ $qtyLabel }} x
                                        {{ $item['name'] ?? 'Item' }}
                                    </td>
                                    <td>
                                        {{ $currency }}{{ number_format($lineTotal, 2) }}
                                    </td>
                                </tr>
                            @empty
                                <tr>
                                    <td colspan="2">No item details available.</td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </article>
            @endforeach
        </section>

        <div class="sep"></div>

        <section class="totals">
            @if($combinedTax > 0.0001)
                <div class="row">
                    <span>Subtotal</span>
                    <strong>
                        {{ $currency }}{{ number_format($combinedSubtotal, 2) }}
                    </strong>
                </div>
                <div class="row">
                    <span>{{ $taxTitle }}</span>
                    <span>
                        {{ $currency }}{{ number_format($combinedTax, 2) }}
                    </span>
                </div>
            @endif
            <div class="row total">
                <span>Total</span>
                <strong>
                    {{ $currency }}{{ number_format($combinedTotal, 2) }}
                </strong>
            </div>
        </section>

        <div class="sep"></div>
        <div class="center" style="font-size:10px;color:#64748b">
            Thank you
        </div>
    </main>

    <div class="invoice-actions">
        <button
            type="button"
            class="back-btn"
            onclick="return window.pmdInvoiceBackV127(event)"
        >Back</button>
        <button
            type="button"
            onclick="return window.pmdPrintReceipt(event)"
        >Print invoice</button>
    </div>

    <script>
    window.pmdInvoiceBackV127 = function (event) {
        if (event) event.preventDefault();

        if (window.history && window.history.length > 1) {
            window.history.back();
            return false;
        }

        window.location.href = '/admin/pos/cashier';
        return false;
    };

    window.pmdPrintReceipt = function (event) {
        if (event) event.preventDefault();
        window.print();
        return false;
    };
    </script>

    @if($printRequested)
        <script>
        window.addEventListener('load', function () {
            window.setTimeout(function () {
                window.pmdPrintReceipt();
            }, 250);
        });
        </script>
    @endif
</body>
</html>
