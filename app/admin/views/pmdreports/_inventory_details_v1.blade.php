{{-- PMD_INVENTORY_REPORTS_V1: read-only detail from canonical inventory snapshot. --}}
@php
    $inventoryReportDetails = (array)($report['inventory_details'] ?? []);
    $inventorySuppliers = array_values(array_filter((array)($inventoryReportDetails['supplier_performance'] ?? []), 'is_array'));
    $inventoryPriceChanges = array_values(array_filter((array)($inventoryReportDetails['price_changes'] ?? []), 'is_array'));
    $inventoryWasteReasons = array_values(array_filter((array)($inventoryReportDetails['waste_by_reason'] ?? []), 'is_array'));
    $inventoryMenuRisk = array_values(array_filter((array)($inventoryReportDetails['menu_risk'] ?? []), 'is_array'));
@endphp
<section class="pmd-owner-card pmd-report-card" data-accent="green" style="margin-top:18px">
    <div class="pmd-owner-card__header">
        <div class="pmd-owner-card__title">
            <h2>Inventory exports</h2>
            <p>Stock quantities and the movement ledger from the current restaurant. The report toolbar exports the ledger.</p>
        </div>
        <button type="button" class="pmd-owner-header-button pmd-report-inventory-stock-export" data-pmd-report-inventory-stock-export aria-label="Export stock CSV">Export stock CSV</button>
    </div>
</section>
<div class="pmd-report-workspace" style="margin-top:18px">
    <section class="pmd-owner-card pmd-report-card" data-accent="blue">
        <div class="pmd-owner-card__header"><div class="pmd-owner-card__title"><h2>Supplier performance</h2><p>Purchasing spend, delivery reliability and lead times.</p></div></div>
        <div class="pmd-owner-card__body pmd-report-table-body">
            <div class="pmd-report-table-wrap"><table class="pmd-report-table">
                <thead><tr><th>Supplier</th><th>Spend · 90d</th><th>Receipts</th><th>PO deliveries</th><th>On time</th><th>Avg delay</th><th>Lead time</th></tr></thead>
                <tbody>
                @forelse($inventorySuppliers as $row)
                    <tr><td>{{ $row['supplier_name'] ?? 'Supplier' }}</td><td>{{ $report['currency']['symbol'] ?? '€' }}{{ number_format((float)($row['spend_90d'] ?? 0),2) }}</td><td>{{ (int)($row['receipts_90d'] ?? 0) }}</td><td>{{ (int)($row['po_deliveries_180d'] ?? 0) }}</td><td>{{ isset($row['on_time_pct']) ? number_format((float)$row['on_time_pct'],1).'%' : '—' }}</td><td>{{ isset($row['avg_delay_days']) ? number_format((float)$row['avg_delay_days'],1).' days' : '—' }}</td><td>{{ (int)($row['lead_time_days'] ?? 0) }} days</td></tr>
                @empty
                    <tr><td colspan="7">No supplier delivery history yet.</td></tr>
                @endforelse
                </tbody>
            </table></div>
        </div>
    </section>
    <section class="pmd-owner-card pmd-report-card" data-accent="orange">
        <div class="pmd-owner-card__header"><div class="pmd-owner-card__title"><h2>Supplier price changes</h2><p>Recent purchase cost movement for stock items.</p></div></div>
        <div class="pmd-owner-card__body pmd-report-table-body">
            <div class="pmd-report-table-wrap"><table class="pmd-report-table">
                <thead><tr><th>Item</th><th>Supplier</th><th>Price change</th></tr></thead>
                <tbody>
                @forelse($inventoryPriceChanges as $row)
                    <tr><td>{{ $row['item_name'] ?? '' }}</td><td>{{ $row['supplier_name'] ?? 'Supplier' }}</td><td>{{ (float)($row['change_pct'] ?? 0) > 0 ? '+' : '' }}{{ number_format((float)($row['change_pct'] ?? 0),1) }}%</td></tr>
                @empty
                    <tr><td colspan="3">No supplier price changes recorded yet.</td></tr>
                @endforelse
                </tbody>
            </table></div>
        </div>
    </section>
    <section class="pmd-owner-card pmd-report-card" data-accent="rose">
        <div class="pmd-owner-card__header"><div class="pmd-owner-card__title"><h2>Waste by reason</h2><p>Cost of waste movements recorded over the last 30 days.</p></div></div>
        <div class="pmd-owner-card__body pmd-report-table-body">
            <div class="pmd-report-table-wrap"><table class="pmd-report-table">
                <thead><tr><th>Reason</th><th>Value</th></tr></thead>
                <tbody>
                @forelse($inventoryWasteReasons as $row)
                    <tr><td>{{ $row['reason'] ?? 'Unspecified' }}</td><td>{{ $report['currency']['symbol'] ?? '€' }}{{ number_format((float)($row['value'] ?? 0),2) }}</td></tr>
                @empty
                    <tr><td colspan="2">No waste recorded in the last 30 days.</td></tr>
                @endforelse
                </tbody>
            </table></div>
        </div>
    </section>
    <section class="pmd-owner-card pmd-report-card" data-accent="orange">
        <div class="pmd-owner-card__header"><div class="pmd-owner-card__title"><h2>Menu availability risks</h2><p>Menu items affected by current ingredient levels.</p></div></div>
        <div class="pmd-owner-card__body pmd-report-table-body">
            <div class="pmd-report-table-wrap"><table class="pmd-report-table">
                <thead><tr><th>Menu item</th><th>Ingredient risk</th><th>Status</th></tr></thead>
                <tbody>
                @forelse($inventoryMenuRisk as $row)
                    <tr><td>{{ $row['menu_name'] ?? 'Menu item' }}</td><td>{{ implode(', ', (array)($row['blocking_items'] ?? [])) ?: implode(', ', (array)($row['warning_items'] ?? [])) }}</td><td>{{ ($row['level'] ?? '') === 'out' ? 'Stock out' : 'At risk' }}</td></tr>
                @empty
                    <tr><td colspan="3">No recipe-driven availability risks.</td></tr>
                @endforelse
                </tbody>
            </table></div>
        </div>
    </section>
</div>
<script type="application/json" id="pmd-report-inventory-stock-data">{!! json_encode(
    (array)($inventoryReportDetails['stock_csv'] ?? []),
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES |
    JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
) !!}</script>
