@php
    $embedded = !empty($pmdInventoryEmbedded);
    $inventory = is_array($pmdInventory ?? null) ? $pmdInventory : [];
    $snapshot = is_array($inventory['snapshot'] ?? null) ? $inventory['snapshot'] : [];
    $summary = is_array($snapshot['summary'] ?? null) ? $snapshot['summary'] : [];
    $ready = (bool)($inventory['ready'] ?? false);
    $aiReceipts = (bool)($inventory['ai_receipts'] ?? false);
    $currency = (string)($inventory['currency'] ?? 'EUR');
    $units = is_array($inventory['units'] ?? null) ? $inventory['units'] : [];
    $wasteReasons = is_array($inventory['waste_reasons'] ?? null) ? $inventory['waste_reasons'] : [];
    $commonStock = is_array($inventory['common_stock'] ?? null) ? $inventory['common_stock'] : [];
    $hasItems = !empty($snapshot['items']);
    $attentionCount = (int)(($summary['critical_items'] ?? 0) + ($summary['low_items'] ?? 0));

    // PMD_INVENTORY_WORKSPACE_R19_SERVER_FIRST
    $r19StockRows = is_array($snapshot['items'] ?? null) ? $snapshot['items'] : [];
    $r19ItemsInStock = count(array_filter($r19StockRows, static fn ($row) =>
        (float)($row['estimated_on_hand'] ?? 0) > 0
    ));
    $r19HealthValues = array_values(array_filter(array_map(static function ($row) {
        return (float)($row['par_level'] ?? 0) > 0 && $row['stock_percent'] !== null
            ? (int)$row['stock_percent']
            : null;
    }, $r19StockRows), static fn ($value) => $value !== null));
    $r19StockHealth = count($r19HealthValues)
        ? (int)round(array_sum($r19HealthValues) / count($r19HealthValues))
        : null;

    $r19ImageByKey = [];
    foreach ($commonStock as $catalogRow) {
        if (!is_array($catalogRow)) continue;
        $url = trim((string)($catalogRow['image_url'] ?? ''));
        if ($url === '') continue;
        $keys = array_merge(
            [(string)($catalogRow['name'] ?? '')],
            is_array($catalogRow['aliases'] ?? null) ? $catalogRow['aliases'] : []
        );
        foreach ($keys as $key) {
            $slug = \Illuminate\Support\Str::slug((string)$key);
            if ($slug !== '' && !isset($r19ImageByKey[$slug])) {
                $r19ImageByKey[$slug] = $url;
            }
        }
    }

    $r19StockGroups = [];
    $r19CategoryCounts = [];
    foreach ($r19StockRows as $row) {
        $category = trim((string)($row['category'] ?? '')) ?: 'Other';
        $r19StockGroups[$category] ??= [];
        $r19StockGroups[$category][] = $row;
        $r19CategoryCounts[$category] = ($r19CategoryCounts[$category] ?? 0) + 1;
    }
    ksort($r19StockGroups, SORT_NATURAL | SORT_FLAG_CASE);
    ksort($r19CategoryCounts, SORT_NATURAL | SORT_FLAG_CASE);

    // PMD_INVENTORY_KPI_PARITY_R20
    // Use the same four-slot interaction model as Owner Dashboard. The two
    // additional Inventory KPIs stay available through each card's chooser.
    $r20KpiCards = [
        'stock_value' => [
            'key' => 'stock_value',
            'title' => 'Stock value',
            'value' => currency_format((float)($summary['estimated_stock_value'] ?? 0)),
            'description' => 'Current inventory value',
            'info' => 'Estimated value of the restaurant stock currently on hand.',
            'tone' => 'green',
            'icon' => '<path d="M4 7 12 3l8 4-8 4-8-4Z"></path><path d="M4 7v10l8 4 8-4V7"></path>',
        ],
        'stock_health' => [
            'key' => 'stock_health',
            'title' => 'Stock health',
            'value' => $r19StockHealth === null ? 'Set targets' : $r19StockHealth.'%',
            'description' => 'Against target / par levels',
            'info' => 'Average availability across stock items that have a target / par level.',
            'tone' => 'cyan',
            'icon' => '<path d="M4 18V9M10 18V5M16 18v-7M22 18H2"></path>',
        ],
        'attention' => [
            'key' => 'attention',
            'title' => 'Needs attention',
            'value' => (string)$attentionCount,
            'description' => 'Low or critical items',
            'info' => 'Items currently at or below their low / critical stock threshold.',
            'tone' => 'orange',
            'icon' => '<path d="M12 9v4M12 17h.01"></path><path d="M10.3 3.6 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"></path>',
        ],
        'waste' => [
            'key' => 'waste',
            'title' => 'Waste · 30 days',
            'value' => currency_format((float)($summary['waste_cost_30d'] ?? 0)),
            'description' => 'Recorded stock loss',
            'info' => 'Cost of waste movements recorded during the last 30 days.',
            'tone' => 'red',
            'icon' => '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"></path><path d="M10 10v6M14 10v6"></path>',
        ],
        'variance' => [
            'key' => 'variance',
            'title' => 'Latest variance',
            'value' => currency_format((float)($summary['unexplained_loss_value'] ?? 0)),
            'description' => 'Count difference to review',
            'info' => 'Value difference found at the latest completed physical count.',
            'tone' => 'purple',
            'icon' => '<path d="M4 12h16M12 4v16"></path><path d="M5 5l14 14"></path>',
        ],
        'in_stock' => [
            'key' => 'in_stock',
            'title' => 'Items in stock',
            'value' => (string)$r19ItemsInStock,
            'description' => count($r19StockRows).' tracked inventory items',
            'info' => 'Tracked inventory items whose current estimated on-hand quantity is above zero.',
            'tone' => 'blue',
            'icon' => '<path d="M4 7h16v13H4z"></path><path d="M8 7V4h8v3M8 12h8"></path>',
        ],
    ];
    $r20KpiSelection = ['stock_value', 'stock_health', 'attention', 'waste'];

    $bootstrap = [
        'ready' => $ready,
        'ai_receipts' => $aiReceipts,
        'currency' => $currency,
        'snapshot' => $snapshot,
        'units' => $units,
        'waste_reasons' => $wasteReasons,
        'common_stock' => $commonStock,
        'error' => $inventory['error'] ?? null,
        'today' => now()->toDateString(),
        'endpoint' => admin_url('pmdinventory'),
        'embedded' => $embedded,
    ];
@endphp

<main id="pmd-inventory-v1" class="pmd-inv pmd-owner-page{{ $embedded ? ' pmd-inv--embedded' : '' }}" data-pmd-inventory-root data-pmd-inventory-embedded="{{ $embedded ? '1' : '0' }}">
    {{-- PMD_INVENTORY_SIMPLE_UI_R6 --}}
    @unless($embedded)
    <header id="pmd-inv-clean-header" class="pmd-owner-header pmd-inv__mother-header pmd-inv-r6-header" aria-label="Stock control header">
        <div class="pmd-owner-header__left pmd-inv__mother-header-left">
            <h1>Stock control</h1>
        </div>

        @if($ready)
            <div class="pmd-owner-header__actions pmd-inv__mother-actions pmd-inv-r6-header__actions">
                <span class="pmd-inv__notif-slot" data-pmd-inv-notif-slot aria-label="Notifications">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                </span>
            </div>
        @endif
    </header>
    @endunless

    <div class="pmd-inv__stage pmd-inv-r6-stage">
        @if(!$ready)
            <section class="pmd-inv__setup pmd-inv-card">
                <div class="pmd-inv__setup-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M4 7 12 3l8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/></svg>
                </div>
                <div class="pmd-inv__setup-copy">
                    <span>Setup required</span>
                    <h2>Inventory needs its database update.</h2>
                    <p>{{ (string)($inventory['error'] ?? 'Run the PayMyDine inventory update, then reload this page.') }}</p>
                </div>
                <code>sudo -u www-data php artisan igniter:up --no-interaction</code>
            </section>
        @else
            @if(!empty($inventory['error']))
                <div class="pmd-inv__error-banner" role="alert">
                    <strong>Inventory data could not be fully loaded.</strong>
                    <span>{{ (string)$inventory['error'] }}</span>
                </div>
            @endif

            {{-- PMD_INVENTORY_WORKSPACE_R19 --}}
            <section class="pmd-inv-r19" data-pmd-inv-r19-workspace>
                @unless($embedded)
                <nav class="pmd-inv-r19-product-switcher" aria-label="Restaurant product workspace">
                    <a href="{{ admin_url('pmdmenus') }}">Menu</a>
                    <a href="{{ admin_url('pmdinventory') }}" class="is-active" aria-current="page">Inventory</a>
                </nav>

                @endunless

                <section
                    id="pmd-r2-reservation-kpis-v307"
                    class="pmd-r2-kpis-v2401 pmd-dashboard2-kpis-v2 pmd-inv-r20-kpis"
                    data-r19-kpis
                    data-r20-inventory-kpis
                    aria-label="Inventory KPIs"
                >
                    @foreach($r20KpiSelection as $slot => $key)
                        {{-- PMD_INVENTORY_R20_KPI_CARD_SCOPE_FIX
                             Do not introduce a temporary KPI card variable here.
                             This Blade is rendered as an embedded view inside Menu
                             and the compiled view lost that local assignment at runtime. --}}
                        <article
                            class="pmd-r2-kpi-v2401-card"
                            data-r20-kpi-slot="{{ $slot }}"
                            data-r20-kpi-key="{{ $key }}"
                            data-pmd-kpi-v2401-key="{{ $key }}"
                            data-pmd-kpi-v2401-tone="{{ $r20KpiCards[$key]['tone'] ?? 'green' }}"
                            data-pmd-kpi-info-copy="{{ $r20KpiCards[$key]['info'] ?? '' }}"
                        >
                            <div class="pmd-r2-kpi-v2401-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" focusable="false">{!! $r20KpiCards[$key]['icon'] ?? '' !!}</svg>
                            </div>

                            <div class="pmd-r2-kpi-v2401-copy">
                                <span class="pmd-r2-kpi-v2401-title">{{ $r20KpiCards[$key]['title'] ?? $key }}</span>
                                <strong class="pmd-r2-kpi-v2401-value" data-r20-kpi-value>{{ $r20KpiCards[$key]['value'] ?? '0' }}</strong>
                                <span class="pmd-r2-kpi-v2401-description">{{ $r20KpiCards[$key]['description'] ?? '' }}</span>
                            </div>

                            <div class="pmd-kpi-info-panel" data-pmd-kpi-info-panel="1" aria-live="polite">
                                <strong>{{ $r20KpiCards[$key]['title'] ?? $key }}</strong>
                                <span>{{ $r20KpiCards[$key]['info'] ?? '' }}</span>
                            </div>

                            <button
                                type="button"
                                class="pmd-kpi-info-button"
                                data-r20-kpi-info
                                aria-pressed="false"
                                aria-label="About this KPI"
                                title="About this KPI"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="9"></circle>
                                    <path d="M12 11v5"></path>
                                    <path d="M12 8h.01"></path>
                                </svg>
                            </button>

                            <button
                                type="button"
                                class="pmd-r2-kpi-v2401-more"
                                data-r20-kpi-menu-button
                                aria-label="Choose KPI"
                                aria-haspopup="menu"
                                aria-expanded="false"
                            ><span></span><span></span><span></span></button>

                            <div class="pmd-r2-kpi-v2401-menu pmd-inv-r20-kpi-menu" data-r20-kpi-menu role="menu" hidden>
                                <span class="pmd-dashboard-lab__kpi-menu-heading">Choose KPI</span>
                                @foreach($r20KpiCards as $choiceKey => $choice)
                                    <button
                                        type="button"
                                        class="pmd-r2-kpi-v2401-option{{ $choiceKey === $key ? ' is-selected' : '' }}"
                                        data-r20-kpi-option="{{ $choiceKey }}"
                                        role="menuitem"
                                    >
                                        <span class="pmd-r2-kpi-v2401-option-copy">
                                            <strong>{{ $choice['title'] }}</strong>
                                            <small>{{ $choiceKey === $key ? 'Visible in this card' : 'Show in this card' }}</small>
                                        </span>
                                        <span class="pmd-r2-kpi-v2401-check">{{ $choiceKey === $key ? '✓' : '' }}</span>
                                    </button>
                                @endforeach
                            </div>
                        </article>
                    @endforeach
                </section>

                <script type="application/json" id="pmd-inventory-r20-kpi-data">{!! json_encode(
                    $r20KpiCards,
                    JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE |
                    JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
                ) !!}</script>

                <nav class="pmd-inv-r19-modes pmd-inv-r24-modes" aria-label="Inventory workspace">
                    <button type="button" class="is-active" data-r19-mode="overview">Overview</button>
                    <button type="button" data-r19-mode="stock">Stock</button>
                    <button type="button" data-r19-mode="purchases">Purchases</button>
                    <button type="button" data-r19-mode="orders">Orders</button>
                    <button type="button" data-r19-mode="suppliers">Suppliers</button>
                    <button type="button" data-r19-mode="waste">Waste</button>
                    <button type="button" data-r19-mode="shopping">Shopping</button>
                    <button type="button" data-r19-mode="operations">Operations</button>
                </nav>

                <section class="pmd-inv-r19-pane is-active" data-r19-pane="overview">
                    <div class="pmd-inv-r19-section-head">
                        <div>
                            <span>Restaurant stock</span>
                            <h2>What you have right now</h2>
                            <p>Availability is compared with each item's target / par level. Items without a target stay neutral.</p>
                        </div>
                        <button type="button" class="pmd-inv-r19-secondary" data-r19-go-mode="stock">Manage stock</button>
                    </div>
                    <div class="pmd-inv-r19-category-summary" data-r19-overview-categories>
                        @foreach($r19CategoryCounts as $category => $count)
                            <span><b>{{ $count }}</b>{{ $category }}</span>
                        @endforeach
                    </div>
                    <div class="pmd-inv-r19-overview-groups" data-r19-overview-stock data-r19-server-overview="1">
                        @if(!count($r19StockRows))
                            <div class="pmd-inv-r19-empty">No restaurant stock yet. Open Purchases to receive your first item.</div>
                        @else
                            @foreach($r19StockGroups as $category => $groupRows)
                                <section class="pmd-inv-r19-overview-group">
                                    <h3>{{ $category }}</h3>
                                    @foreach($groupRows as $row)
                                        @php
                                            $r19Image = $r19ImageByKey[\Illuminate\Support\Str::slug((string)($row['name'] ?? ''))] ?? '';
                                            $r19Pct = $row['stock_percent'] ?? null;
                                            $r19Status = (string)($row['status'] ?? 'healthy');
                                            $r19Factor = max(0.0001, (float)($row['purchase_to_base'] ?? 1));
                                            $r19PurchaseUnit = (string)($row['purchase_unit'] ?? $row['unit'] ?? 'piece');
                                            $r19BaseUnit = (string)($row['unit'] ?? 'piece');
                                            $r19UsePurchase = $r19PurchaseUnit !== '' && strtolower($r19PurchaseUnit) !== strtolower($r19BaseUnit);
                                            $r19OwnerQty = (float)($row['estimated_on_hand'] ?? 0) / ($r19UsePurchase ? $r19Factor : 1);
                                            $r19OwnerUnit = $r19UsePurchase ? $r19PurchaseUnit : $r19BaseUnit;
                                        @endphp
                                        <article class="pmd-inv-r19-stock-row is-{{ $r19Status }}">
                                            <span class="pmd-inv-r19-stock-row__image">
                                                @if($r19Image)<img src="{{ $r19Image }}" alt="" loading="eager" decoding="async">@endif
                                            </span>
                                            <span class="pmd-inv-r19-stock-row__copy">
                                                <strong>{{ (string)($row['name'] ?? '') }}</strong>
                                                <small>{{ (string)($row['category'] ?? 'Stock item') }}</small>
                                                <span class="pmd-inv-r19-health-bar"><i style="width:{{ $r19Pct === null ? 0 : max(0,min(100,(int)$r19Pct)) }}%"></i></span>
                                            </span>
                                            <span class="pmd-inv-r19-stock-row__amount">
                                                <strong>{{ number_format($r19OwnerQty, 2) }} {{ $r19OwnerUnit }}</strong>
                                                <small>{{ $r19Pct === null ? 'Set target' : ((int)$r19Pct).'% of target' }}</small>
                                            </span>
                                        </article>
                                    @endforeach
                                </section>
                            @endforeach
                        @endif
                    </div>
                    <details class="pmd-inv-r19-activity" data-r19-activity>
                        <summary>Activity <span>Purchases, waste and the last physical count</span></summary>
                        <div data-r19-activity-body></div>
                    </details>
                </section>

                <section class="pmd-inv-r19-pane" data-r19-pane="stock" hidden>
                    <div class="pmd-inv-r19-section-head">
                        <div>
                            <span>Current stock</span>
                            <h2>Manage what the restaurant owns</h2>
                            <p>Set targets, review availability and run a physical count without changing stock by hand.</p>
                        </div>
                        <div class="pmd-inv-r19-head-actions">
                            <label class="pmd-inv-r19-search"><input type="search" placeholder="Search your stock…" data-r19-stock-search></label>
                            <button type="button" class="pmd-inv-r19-secondary" data-r19-start-count>Start physical count</button>
                        </div>
                    </div>
                    <div class="pmd-inv-r19-main-categories" data-r19-stock-main></div>
                    <div class="pmd-inv-r19-subcategories" data-r19-stock-sub hidden></div>
                    <div class="pmd-inv-r19-stock-grid" data-r19-stock-grid></div>
                    <section class="pmd-inv-r19-inline-editor" data-r19-stock-editor hidden></section>
                    <section class="pmd-inv-r19-count" data-r19-count hidden></section>
                </section>

                <section class="pmd-inv-r19-pane" data-r19-pane="purchases" hidden>
                    <div class="pmd-inv-r19-section-head">
                        <div>
                            <span>Purchases</span>
                            <h2>Receive stock</h2>
                            <p>Tap an item, enter quantity, unit and cost, then add it directly to stock.</p>
                        </div>
                        <div class="pmd-inv-r19-head-actions">
                            <label class="pmd-inv-r19-scan{{ $aiReceipts ? '' : ' is-disabled' }}">
                                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" data-r19-receipt-input {{ $aiReceipts ? '' : 'disabled' }}>
                                <span>{{ $aiReceipts ? 'Scan supplier bill with AI' : 'AI bill scan unavailable' }}</span>
                            </label>
                            <button type="button" class="pmd-inv-r19-secondary pmd-inv-r23-barcode-button" data-r19-barcode-open>
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M4 5v14M7 5v14M11 5v14M14 5v14M18 5v14M20 5v14"></path>
                                </svg>
                                <span>Scan barcode / QR</span>
                            </button>
                        </div>
                    </div>
                    <div class="pmd-inv-r19-purchase-meta">
                        <label>Supplier<input type="text" placeholder="Optional" data-r19-purchase-supplier></label>
                        <label>Purchase date<input type="date" value="{{ now()->toDateString() }}" data-r19-purchase-date></label>
                        <label class="pmd-inv-r19-search"><span>Search</span><input type="search" placeholder="Tomato, milk, vodka…" data-r19-purchase-search></label>
                    </div>

                    {{-- PMD_INVENTORY_BARCODE_RECEIVING_R23
                         USB/Bluetooth scanners normally act as fast keyboards:
                         focus this input, scan, and Enter completes the code. --}}
                    <section class="pmd-inv-r23-barcode" data-r19-barcode-panel hidden>
                        <div class="pmd-inv-r23-barcode__head">
                            <div>
                                <span>Barcode receiving</span>
                                <h3>Scan product or case codes</h3>
                                <p>Scan a barcode or QR code. Known codes go straight into this purchase draft; unknown codes can be linked once to an existing stock item.</p>
                            </div>
                            <button type="button" class="pmd-inv-r19-secondary" data-r19-barcode-close>Close</button>
                        </div>
                        <label class="pmd-inv-r23-barcode__input">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M4 5v14M7 5v14M11 5v14M14 5v14M18 5v14M20 5v14"></path>
                            </svg>
                            <input type="text" inputmode="text" autocomplete="off" spellcheck="false"
                                placeholder="Scan now, or type a code and press Enter"
                                data-r19-barcode-input>
                        </label>
                        <div class="pmd-inv-r24-barcode-tools">
                            <small class="pmd-inv-r23-barcode__hint">USB/Bluetooth HID scanners work directly. Camera scanning uses the browser BarcodeDetector when the device supports it.</small>
                            <button type="button" class="pmd-inv-r19-secondary" data-r24-barcode-camera>Use camera</button>
                        </div>
                        <div class="pmd-inv-r24-camera" data-r24-barcode-camera-panel hidden>
                            <video playsinline muted data-r24-barcode-video></video>
                            <button type="button" class="pmd-inv-r19-secondary" data-r24-barcode-camera-stop>Stop camera</button>
                        </div>
                        <div class="pmd-inv-r23-barcode__status" data-r19-barcode-status aria-live="polite"></div>
                        <div class="pmd-inv-r23-barcode__unknown pmd-inv-r24-barcode-map" data-r19-barcode-unknown hidden>
                            <div>
                                <strong data-r19-barcode-unknown-code></strong>
                                <span data-r24-barcode-code-type>This code is not linked yet.</span>
                            </div>
                            <label>
                                <span>Link to existing stock</span>
                                <select data-r19-barcode-link-select></select>
                            </label>
                            <label>
                                <span>Code type</span>
                                <select data-r19-barcode-code-type-select>
                                    <option value="auto">Auto detect</option>
                                    <option value="internal">Supplier / internal code</option>
                                    <option value="ean13">EAN-13</option>
                                    <option value="upca">UPC-A</option>
                                    <option value="gtin14">GTIN-14</option>
                                    <option value="gtin8">GTIN-8</option>
                                    <option value="qr">QR / URL</option>
                                </select>
                            </label>
                            <label>
                                <span>Package unit</span>
                                <select data-r19-barcode-package-unit>
                                    @foreach($units as $value => $label)<option value="{{ $value }}">{{ $label }}</option>@endforeach
                                </select>
                            </label>
                            <label>
                                <span>1 scan equals · base quantity</span>
                                <input type="number" min="0.0001" step="0.0001" value="1" data-r19-barcode-base-qty>
                            </label>
                            <label>
                                <span>Supplier · optional</span>
                                <select data-r19-barcode-supplier><option value="">No supplier</option></select>
                            </label>
                            <label class="pmd-inv-r24-check">
                                <input type="checkbox" data-r19-barcode-primary>
                                <span>Primary code for this item</span>
                            </label>
                            <button type="button" class="pmd-inv-r19-primary" data-r19-barcode-link>Link package & add</button>
                            <button type="button" class="pmd-inv-r19-secondary" data-r19-barcode-new>New item</button>
                        </div>
                    </section>

                    <div class="pmd-inv-r19-main-categories" data-r19-purchase-main></div>
                    <div class="pmd-inv-r19-subcategories" data-r19-purchase-sub></div>
                    <div class="pmd-inv-r19-product-grid" data-r19-purchase-grid></div>
                    <button type="button" class="pmd-inv-r19-load-more" data-r19-purchase-more hidden>Show more</button>
                    <section class="pmd-inv-r19-inline-editor" data-r19-purchase-editor hidden></section>
                    <section class="pmd-inv-r19-receipt-review" data-r19-receipt-review hidden></section>
                </section>

                {{-- PMD_INVENTORY_OPERATIONS_V2_R24: supplier purchasing authority --}}
                <section class="pmd-inv-r19-pane pmd-inv-r24-pane" data-r19-pane="orders" hidden>
                    <div class="pmd-inv-r19-section-head">
                        <div>
                            <span>Purchase orders</span>
                            <h2>Order, receive and reconcile supplier stock</h2>
                            <p>Create supplier orders from smart demand, receive partial deliveries and keep ordered versus received quantity visible.</p>
                        </div>
                        <div class="pmd-inv-r19-head-actions">
                            <button type="button" class="pmd-inv-r19-primary" data-r24-po-from-shopping>Create from smart order</button>
                        </div>
                    </div>
                    <div class="pmd-inv-r24-orders" data-r24-orders-list></div>
                    <section class="pmd-inv-r24-editor" data-r24-po-editor hidden></section>
                    <section class="pmd-inv-r24-editor" data-r24-receive-editor hidden></section>
                    <div class="pmd-inv-r24-receipts">
                        <div class="pmd-inv-r19-history__head"><h3>Recent receipts</h3><span>Supplier · invoice · total · audit</span></div>
                        <div data-r24-receipt-list></div>
                    </div>
                </section>

                <section class="pmd-inv-r19-pane pmd-inv-r24-pane" data-r19-pane="suppliers" hidden>
                    <div class="pmd-inv-r19-section-head">
                        <div>
                            <span>Supplier master</span>
                            <h2>Products, package sizes and supplier prices</h2>
                            <p>Keep supplier article codes, case conversion, MOQ, lead time and preferred pricing attached to the stock item.</p>
                        </div>
                        <div class="pmd-inv-r19-head-actions">
                            <button type="button" class="pmd-inv-r19-primary" data-r24-new-supplier>Add supplier</button>
                            <button type="button" class="pmd-inv-r19-secondary" data-r24-new-offer>Add product offer</button>
                        </div>
                    </div>

                    <section class="pmd-inv-r24-editor" data-r24-supplier-editor hidden>
                        <div class="pmd-inv-r19-editor-head">
                            <div><h3>Supplier</h3><small>Restaurant-specific supplier profile</small></div>
                            <button type="button" class="pmd-inv-r19-secondary" data-r24-close-editor>Close</button>
                        </div>
                        <div class="pmd-inv-r24-form-grid">
                            <input type="hidden" data-r24-supplier-id>
                            <label>Name<input type="text" data-r24-supplier-name placeholder="METRO, Transgourmet…"></label>
                            <label>Account / customer no.<input type="text" data-r24-supplier-account></label>
                            <label>Contact<input type="text" data-r24-supplier-contact></label>
                            <label>Email<input type="email" data-r24-supplier-email></label>
                            <label>Phone<input type="text" data-r24-supplier-phone></label>
                            <label>Lead time · days<input type="number" min="0" step="1" value="1" data-r24-supplier-lead></label>
                            <label>Minimum order value<input type="number" min="0" step="0.01" value="0" data-r24-supplier-min></label>
                            <label class="is-wide">Notes<input type="text" data-r24-supplier-notes></label>
                        </div>
                        <div class="pmd-inv-r19-editor-actions">
                            <button type="button" class="pmd-inv-r19-primary" data-r24-save-supplier>Save supplier</button>
                        </div>
                    </section>

                    <section class="pmd-inv-r24-editor" data-r24-offer-editor hidden>
                        <div class="pmd-inv-r19-editor-head">
                            <div><h3>Supplier product offer</h3><small>One item can have several suppliers; one may be preferred.</small></div>
                            <button type="button" class="pmd-inv-r19-secondary" data-r24-close-editor>Close</button>
                        </div>
                        <div class="pmd-inv-r24-form-grid">
                            <label>Supplier<select data-r24-offer-supplier></select></label>
                            <label>Stock item<select data-r24-offer-item></select></label>
                            <label>Supplier SKU<input type="text" data-r24-offer-sku></label>
                            <label>Purchase unit<select data-r24-offer-unit>@foreach($units as $value => $label)<option value="{{ $value }}">{{ $label }}</option>@endforeach</select></label>
                            <label>Base qty / purchase unit<input type="number" min="0.0001" step="0.0001" value="1" data-r24-offer-factor></label>
                            <label>Price / purchase unit<input type="number" min="0" step="0.01" value="0" data-r24-offer-cost></label>
                            <label>MOQ<input type="number" min="0.0001" step="0.01" value="1" data-r24-offer-moq></label>
                            <label>Order multiple<input type="number" min="0.0001" step="0.01" value="1" data-r24-offer-multiple></label>
                            <label>Lead time · days<input type="number" min="0" step="1" data-r24-offer-lead placeholder="Supplier default"></label>
                            <label class="pmd-inv-r24-check"><input type="checkbox" data-r24-offer-preferred><span>Preferred supplier for this item</span></label>
                        </div>
                        <div class="pmd-inv-r19-editor-actions">
                            <button type="button" class="pmd-inv-r19-primary" data-r24-save-offer>Save product offer</button>
                        </div>
                    </section>

                    <div class="pmd-inv-r24-supplier-grid" data-r24-supplier-list></div>
                </section>

                <section class="pmd-inv-r19-pane" data-r19-pane="waste" hidden>
                    <div class="pmd-inv-r19-section-head">
                        <div>
                            <span>Waste & loss</span>
                            <h2>Record what left stock without a normal sale</h2>
                            <p>Choose an item, record the quantity and reason, and keep the waste history visible.</p>
                        </div>
                        <strong class="pmd-inv-r19-waste-today" data-r19-waste-today>Today · {{ currency_format(0) }}</strong>
                    </div>
                    <div class="pmd-inv-r19-main-categories" data-r19-waste-main></div>
                    <div class="pmd-inv-r19-subcategories" data-r19-waste-sub hidden></div>
                    <div class="pmd-inv-r19-stock-grid" data-r19-waste-grid></div>
                    <section class="pmd-inv-r19-inline-editor" data-r19-waste-editor hidden></section>
                    <div class="pmd-inv-r19-history">
                        <div class="pmd-inv-r19-history__head"><h3>Recent waste</h3><span>Item · quantity · reason · value</span></div>
                        <div data-r19-waste-history></div>
                    </div>
                </section>

                <section class="pmd-inv-r19-pane" data-r19-pane="shopping" hidden>
                    <div class="pmd-inv-r19-section-head">
                        <div>
                            <span>Shopping</span>
                            <h2>Plan the next order</h2>
                            <p>Use current stock, target levels and recent usage. Adjust quantities before copying or printing the list.</p>
                        </div>
                    </div>
                    <div class="pmd-inv-r19-shopping-controls">
                        <span>Cover</span>
                        <button type="button" class="is-active" data-r19-shopping-days="1">Today</button>
                        <button type="button" data-r19-shopping-days="3">3 days</button>
                        <button type="button" data-r19-shopping-days="7">7 days</button>
                    </div>
                    <div class="pmd-inv-r19-shopping-summary" data-r19-shopping-summary></div>
                    <div class="pmd-inv-r19-shopping-list" data-r19-shopping-list></div>
                    <div class="pmd-inv-r19-shopping-actions">
                        <button type="button" class="pmd-inv-r19-secondary" data-r19-shopping-copy>Copy list</button>
                        <button type="button" class="pmd-inv-r19-secondary" data-r19-shopping-print>Print</button>
                        <button type="button" class="pmd-inv-r19-primary" data-r19-shopping-purchases>Open Purchases</button>
                    </div>
                </section>

                <section class="pmd-inv-r19-pane pmd-inv-r24-pane" data-r19-pane="operations" hidden>
                    <div class="pmd-inv-r19-section-head">
                        <div>
                            <span>Operations</span>
                            <h2>Storage, expiry, transfers, corrections and prep</h2>
                            <p>Operational controls stay auditable: no silent stock edits, and purchase/transfer/production movements remain in the ledger.</p>
                        </div>
                        <div class="pmd-inv-r19-head-actions">
                            <label class="pmd-inv-r19-secondary pmd-inv-r24-import">
                                <input type="file" accept=".csv,text/csv" data-r24-import-stock hidden>
                                <span>Import stock CSV</span>
                            </label>
                            <button type="button" class="pmd-inv-r19-secondary" data-r24-download-template>CSV template</button>
                            <button type="button" class="pmd-inv-r19-secondary" data-r24-export-stock>Export stock CSV</button>
                            <button type="button" class="pmd-inv-r19-secondary" data-r24-export-purchases>Export purchases CSV</button>
                        </div>
                    </div>

                    <div class="pmd-inv-r24-alerts" data-r24-alerts></div>
                    <section class="pmd-inv-r24-analytics" data-r24-analytics></section>

                    <div class="pmd-inv-r24-ops-grid">
                        <section class="pmd-inv-r24-card">
                            <div class="pmd-inv-r24-card__head"><div><span>Storage</span><h3>Locations</h3></div><button type="button" data-r24-new-storage>+ Add</button></div>
                            <div data-r24-storage-list></div>
                            <div class="pmd-inv-r24-mini-form" data-r24-storage-editor hidden>
                                <input type="text" placeholder="Bar, freezer, cellar…" data-r24-storage-name>
                                <select data-r24-storage-type>
                                    <option value="storage">Storage</option>
                                    <option value="kitchen">Kitchen</option>
                                    <option value="bar">Bar</option>
                                    <option value="fridge">Fridge</option>
                                    <option value="freezer">Freezer</option>
                                    <option value="cellar">Cellar</option>
                                </select>
                                <label class="pmd-inv-r24-check"><input type="checkbox" data-r24-storage-default><span>Default</span></label>
                                <button type="button" class="pmd-inv-r19-primary" data-r24-save-storage>Save</button>
                            </div>
                        </section>

                        <section class="pmd-inv-r24-card">
                            <div class="pmd-inv-r24-card__head"><div><span>Expiry</span><h3>Lots to use first</h3></div></div>
                            <div class="pmd-inv-r24-lot-list" data-r24-lot-list></div>
                        </section>

                        <section class="pmd-inv-r24-card">
                            <div class="pmd-inv-r24-card__head"><div><span>Transfer</span><h3>Move stock</h3></div></div>
                            <div class="pmd-inv-r24-mini-form">
                                <select data-r24-transfer-from></select>
                                <select data-r24-transfer-to></select>
                                <select data-r24-transfer-item></select>
                                <input type="number" min="0.0001" step="0.01" placeholder="Quantity in base unit" data-r24-transfer-qty>
                                <input type="text" placeholder="Note · optional" data-r24-transfer-note>
                                <button type="button" class="pmd-inv-r19-primary" data-r24-transfer-submit>Transfer</button>
                            </div>
                            <div class="pmd-inv-r24-activity" data-r24-transfer-history></div>
                        </section>

                        <section class="pmd-inv-r24-card">
                            <div class="pmd-inv-r24-card__head"><div><span>Supplier return</span><h3>Return delivered stock</h3></div></div>
                            <div class="pmd-inv-r24-mini-form">
                                <select data-r24-return-item></select>
                                <select data-r24-return-supplier><option value="">Supplier · optional</option></select>
                                <input type="number" min="0.0001" step="0.01" placeholder="Quantity in base unit" data-r24-return-qty>
                                <input type="text" placeholder="Reason" value="Return to supplier" data-r24-return-reason>
                                <input type="text" placeholder="Note · optional" data-r24-return-note>
                                <button type="button" class="pmd-inv-r19-primary" data-r24-return-submit>Record return</button>
                            </div>
                        </section>

                        <section class="pmd-inv-r24-card">
                            <div class="pmd-inv-r24-card__head"><div><span>Correction</span><h3>Audited adjustment</h3></div></div>
                            <div class="pmd-inv-r24-mini-form">
                                <select data-r24-adjust-item></select>
                                <input type="number" step="0.01" placeholder="+ / - base quantity" data-r24-adjust-qty>
                                <input type="text" placeholder="Reason · required" data-r24-adjust-reason>
                                <input type="text" placeholder="Note · optional" data-r24-adjust-note>
                                <button type="button" class="pmd-inv-r19-primary" data-r24-adjust-submit>Record adjustment</button>
                            </div>
                        </section>

                        <section class="pmd-inv-r24-card pmd-inv-r24-card--wide">
                            <div class="pmd-inv-r24-card__head"><div><span>Settings</span><h3>Inventory behavior</h3></div></div>
                            <div class="pmd-inv-r24-form-grid">
                                <label>Recipe consumption<select data-r24-setting-trigger>
                                    <option value="paid">Fully paid</option>
                                    <option value="accepted">Order accepted</option>
                                    <option value="kitchen">Kitchen / processing</option>
                                    <option value="completed">Completed</option>
                                </select></label>
                                <label>Expiry warning · days<input type="number" min="1" max="90" step="1" value="7" data-r24-setting-expiry></label>
                                <label>Default storage<select data-r24-setting-storage></select></label>
                                <label class="pmd-inv-r24-check"><input type="checkbox" data-r24-setting-blind><span>Blind physical counts</span></label>
                                <label class="pmd-inv-r24-check"><input type="checkbox" data-r24-setting-low><span>Low-stock alerts</span></label>
                                <label class="pmd-inv-r24-check"><input type="checkbox" data-r24-setting-menu><span>Menu availability warnings</span></label>
                            </div>
                            <div class="pmd-inv-r19-editor-actions">
                                <button type="button" class="pmd-inv-r19-primary" data-r24-save-settings>Save settings</button>
                            </div>
                        </section>

                        <section class="pmd-inv-r24-card pmd-inv-r24-card--wide">
                            <div class="pmd-inv-r24-card__head">
                                <div><span>Prep production</span><h3>Sub-recipes & production batches</h3></div>
                                <button type="button" data-r24-new-prep>+ New prep</button>
                            </div>
                            <div class="pmd-inv-r24-prep-list" data-r24-prep-list></div>
                            <section class="pmd-inv-r24-editor" data-r24-prep-editor hidden>
                                <div class="pmd-inv-r24-form-grid">
                                    <input type="hidden" data-r24-prep-id>
                                    <label>Preparation name<input type="text" placeholder="Tomato sauce" data-r24-prep-name></label>
                                    <label>Output item<select data-r24-prep-output></select></label>
                                    <label>Standard output qty<input type="number" min="0.0001" step="0.01" value="1" data-r24-prep-output-qty></label>
                                </div>
                                <div data-r24-prep-lines></div>
                                <div class="pmd-inv-r19-editor-actions">
                                    <button type="button" class="pmd-inv-r19-secondary" data-r24-prep-add-line>Add ingredient</button>
                                    <button type="button" class="pmd-inv-r19-primary" data-r24-prep-save>Save preparation</button>
                                </div>
                            </section>
                            <section class="pmd-inv-r24-editor" data-r24-produce-editor hidden>
                                <div class="pmd-inv-r24-form-grid">
                                    <input type="hidden" data-r24-produce-prep>
                                    <label>Output quantity<input type="number" min="0.0001" step="0.01" data-r24-produce-qty></label>
                                    <label>Storage<select data-r24-produce-storage></select></label>
                                    <label>Lot / batch code<input type="text" data-r24-produce-lot></label>
                                    <label>Expiry date<input type="date" data-r24-produce-expiry></label>
                                    <label class="is-wide">Note<input type="text" data-r24-produce-note></label>
                                </div>
                                <div class="pmd-inv-r19-editor-actions">
                                    <button type="button" class="pmd-inv-r19-primary" data-r24-produce-submit>Record production</button>
                                </div>
                            </section>
                        </section>
                    </div>
                </section>
            </section>

            {{-- PMD_INVENTORY_LEGACY_DASHBOARD_RETIRED_R19 --}}
        @endif
    </div>
    <div class="pmd-inv-toast" role="status" aria-live="polite" data-pmd-inv-toast></div>

    {{-- PMD_MENU_INVENTORY_UNIFIED_R20
         The combined Menu page uses the inline R20 workflows only. Do not
         mount the legacy compatibility modals into that page. --}}
    @if($ready && !$embedded)
        {{-- New physical stock item --}}
        <div class="pmd-inv-modal" data-pmd-inv-modal="item" hidden aria-hidden="true">
            <div class="pmd-inv-modal__backdrop" data-pmd-inv-close></div>
            <section class="pmd-inv-modal__sheet pmd-inv-modal__sheet--item pmd-modal-card" data-pmd-card-language-v1="inventory" role="dialog" aria-modal="true" aria-labelledby="pmd-inv-item-title">
                <header>
                    <div><span>Catalog</span><h2 id="pmd-inv-item-title" data-pmd-inv-item-title>Add stock item</h2></div>
                    <button type="button" class="pmd-inv-icon-btn" data-pmd-inv-close aria-label="Close">×</button>
                </header>
                <form data-pmd-inv-form="item">
                    <input type="hidden" name="item_id" value="">

                    {{-- PMD_INVENTORY_SELF_CHECKOUT_BROWSER_R10 --}}
                    <section class="pmd-inv-pos-browser pmd-inv-pos-browser--catalog" data-pmd-inv-visual-browser="catalog">
                        <div class="pmd-inv-pos-browser__top">
                            <div>
                                <span>Quick add</span>
                                <strong>Tap what you buy</strong>
                            </div>
                            <label class="pmd-inv-pos-browser__search">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
                                <input type="search" placeholder="Search food, drinks, cleaning, supplies…" autocomplete="off" data-pmd-inv-browser-search="catalog">
                            </label>
                        </div>
                        <div class="pmd-inv-pos-browser__categories" data-pmd-inv-browser-categories="catalog"></div>
                        <div class="pmd-inv-pos-browser__grid" data-pmd-inv-browser-grid="catalog"></div>
                        <button type="button" class="pmd-inv-pos-browser__more" data-pmd-inv-browser-more="catalog" hidden>Show more</button>
                    </section>

                    <div class="pmd-inv-r6-item-basic">
                        <div class="pmd-inv-r6-name-field">
                            <label>
                                <span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-box"/></svg><b>Item name</b></span>
                                <input name="name" required placeholder="Start typing any stock item…" autocomplete="off" data-pmd-inv-common-search>
                            </label>
                            <div class="pmd-inv-r6-suggestions" data-pmd-inv-common-results hidden></div>
                        </div>

                        <label>
                            <span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-package"/></svg><b>Purchase unit</b></span>
                            <select name="purchase_unit">@foreach($units as $value => $label)<option value="{{ $value }}">{{ $label }}</option>@endforeach</select>
                        </label>

                        <label class="pmd-inv-r6-package-field">
                            <span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-scale"/></svg><b>1 purchase unit contains</b></span>
                            <div>
                                <input type="number" min="0.0001" step="0.0001" name="purchase_to_base" value="1" placeholder="750" data-pmd-inv-stepper data-pmd-inv-stepper-step="1">
                                <select name="unit">@foreach($units as $value => $label)<option value="{{ $value }}">{{ $label }}</option>@endforeach</select>
                            </div>
                            <small data-pmd-inv-package-help>Example: 1 bottle = 750 ml.</small>
                        </label>

                        <label data-pmd-inv-opening-field>
                            <span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-stock"/></svg><b>Current stock</b></span>
                            <input type="number" min="0" step="0.0001" name="opening_qty" value="" placeholder="0" required data-pmd-inv-stepper data-pmd-inv-stepper-step="1">
                        </label>

                        <label>
                            <span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-money"/></svg><b>Cost per purchase unit</b></span>
                            <input type="number" min="0" step="0.0001" name="purchase_cost" value="0" placeholder="0.00">
                        </label>
                    </div>

                    <details class="pmd-inv-r6-advanced">
                        <summary><svg aria-hidden="true"><use href="#pmd-inv-icon-sliders"/></svg><span>More settings</span></summary>
                        <div class="pmd-inv-form-grid">
                            <label><span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-tag"/></svg><b>Category</b></span><input name="category" placeholder="Optional"></label>
                            <label><span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-barcode"/></svg><b>SKU / code</b></span><input name="sku" placeholder="Optional"></label>
                            <label><span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-alert"/></svg><b>Reorder at</b></span><input type="number" min="0" step="0.0001" name="reorder_point" value="0" data-pmd-inv-stepper data-pmd-inv-stepper-step="1"></label>
                            <label><span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-target"/></svg><b>Target / par</b></span><input type="number" min="0" step="0.0001" name="par_level" value="0" data-pmd-inv-stepper data-pmd-inv-stepper-step="1"></label>
                            <label class="is-wide"><span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-truck"/></svg><b>Supplier</b></span><input name="supplier_name" placeholder="Optional"></label>
                        </div>
                    </details>

                    <footer>
                        <button type="button" class="pmd-inv-btn pmd-inv-btn--danger-ghost" data-pmd-inv-archive-item hidden>Archive item</button>
                        <span class="pmd-inv-footer-spacer"></span>
                        <button type="button" class="pmd-inv-btn pmd-inv-btn--ghost" data-pmd-inv-close>Cancel</button>
                        <button type="submit" class="pmd-inv-btn pmd-inv-btn--ink" data-pmd-inv-item-save>Add item</button>
                    </footer>
                </form>
            </section>
        </div>

        {{-- Purchase / supplier bill --}}
        <div class="pmd-inv-modal" data-pmd-inv-modal="purchase" hidden aria-hidden="true">
            <div class="pmd-inv-modal__backdrop" data-pmd-inv-close></div>
            <section class="pmd-inv-modal__sheet pmd-inv-modal__sheet--large pmd-inv-modal__sheet--purchase pmd-modal-card" data-pmd-card-language-v1="inventory" role="dialog" aria-modal="true" aria-labelledby="pmd-inv-purchase-title">
                <header>
                    <div><span>Incoming stock</span><h2 id="pmd-inv-purchase-title">Add purchase</h2></div>
                    <button type="button" class="pmd-inv-icon-btn" data-pmd-inv-close aria-label="Close">×</button>
                </header>

                <div class="pmd-inv-receipt-scan">
                    <div>
                        <strong class="pmd-inv-card-section-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-receipt"/></svg><span>Scan supplier bill</span></strong>
                        <span>{{ $aiReceipts ? 'Upload a photo/PDF to fill the items automatically.' : 'Attach the bill or enter the items below.' }}</span>
                    </div>
                    <label class="pmd-inv-upload">
                        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" data-pmd-inv-receipt-file>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M5 14v5h14v-5"/></svg>
                        {{ $aiReceipts ? 'Scan bill' : 'Attach bill' }}
                    </label>
                    <span class="pmd-inv-receipt-status" data-pmd-inv-receipt-status></span>
                </div>

                <form data-pmd-inv-form="purchase">
                    <input type="hidden" name="receipt_id" value="">
                    <div class="pmd-inv-form-grid pmd-inv-form-grid--purchase">
                        <label><span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-truck"/></svg><b>Supplier</b></span><input name="supplier_name" placeholder="Supplier"></label>
                        <label><span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-calendar"/></svg><b>Purchase date</b></span><input type="date" name="purchased_at" value="{{ now()->toDateString() }}"></label>
                    </div>

                    <section class="pmd-inv-pos-browser pmd-inv-pos-browser--compact" data-pmd-inv-visual-browser="purchase">
                        <div class="pmd-inv-pos-browser__top">
                            <div><span>Quick add</span><strong>Tap received items</strong></div>
                            <label class="pmd-inv-pos-browser__search">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
                                <input type="search" placeholder="Search catalogue…" autocomplete="off" data-pmd-inv-browser-search="purchase">
                            </label>
                        </div>
                        <div class="pmd-inv-pos-browser__categories" data-pmd-inv-browser-categories="purchase"></div>
                        <div class="pmd-inv-pos-browser__grid" data-pmd-inv-browser-grid="purchase"></div>
                        <button type="button" class="pmd-inv-pos-browser__more" data-pmd-inv-browser-more="purchase" hidden>Show more</button>
                    </section>

                    <div class="pmd-inv-lines-head">
                        <div><strong class="pmd-inv-card-section-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-stock"/></svg><span>Items received</span></strong></div>
                        <button type="button" class="pmd-inv-mini-btn" data-pmd-inv-add-purchase-line>+ Line</button>
                    </div>
                    <div class="pmd-inv-purchase-line-head" aria-hidden="true">
                        <span>Stock item</span><span>Qty</span><span>Unit</span><span>Cost / unit</span><span></span>
                    </div>
                    <div class="pmd-inv-lines" data-pmd-inv-purchase-lines></div>

                    <footer><button type="button" class="pmd-inv-btn pmd-inv-btn--ghost" data-pmd-inv-close>Cancel</button><button type="submit" class="pmd-inv-btn pmd-inv-btn--blue">Add to stock</button></footer>
                </form>
            </section>
        </div>

        {{-- Waste --}}
        <div class="pmd-inv-modal" data-pmd-inv-modal="waste" hidden aria-hidden="true">
            <div class="pmd-inv-modal__backdrop" data-pmd-inv-close></div>
            <section class="pmd-inv-modal__sheet pmd-inv-modal__sheet--waste pmd-modal-card" data-pmd-card-language-v1="inventory" role="dialog" aria-modal="true" aria-labelledby="pmd-inv-waste-title">
                <header>
                    <div><span>Stock outflow</span><h2 id="pmd-inv-waste-title">Record waste</h2></div>
                    <button type="button" class="pmd-inv-icon-btn" data-pmd-inv-close aria-label="Close">×</button>
                </header>
                <form data-pmd-inv-form="waste">
                    <section class="pmd-inv-pos-browser pmd-inv-pos-browser--compact pmd-inv-pos-browser--stock" data-pmd-inv-visual-browser="waste">
                        <div class="pmd-inv-pos-browser__top">
                            <div><span>Choose stock</span><strong>What was wasted?</strong></div>
                            <label class="pmd-inv-pos-browser__search">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
                                <input type="search" placeholder="Search your stock…" autocomplete="off" data-pmd-inv-browser-search="waste">
                            </label>
                        </div>
                        <div class="pmd-inv-pos-browser__categories" data-pmd-inv-browser-categories="waste"></div>
                        <div class="pmd-inv-pos-browser__grid" data-pmd-inv-browser-grid="waste"></div>
                        <button type="button" class="pmd-inv-pos-browser__more" data-pmd-inv-browser-more="waste" hidden>Show more</button>
                    </section>

                    <div class="pmd-inv-form-grid">
                        <label class="is-wide pmd-inv-pos-browser__bound-field"><span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-box"/></svg><b>Stock item</b></span><select name="item_id" data-pmd-inv-item-select data-pmd-waste-item><option value="">Choose item</option></select></label>
                        <label><span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-scale"/></svg><b>Quantity</b></span><input type="number" min="0.0001" step="0.0001" name="quantity" required data-pmd-inv-stepper data-pmd-inv-stepper-step="1"></label>
                        <label><span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-ruler"/></svg><b>Unit</b></span><select name="quantity_unit" data-pmd-waste-unit><option value="">Choose item first</option></select></label>
                        <label class="is-wide"><span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-trash"/></svg><b>Reason</b></span><select name="reason">@foreach($wasteReasons as $reason)<option value="{{ $reason }}">{{ $reason }}</option>@endforeach</select></label>
                        <label class="is-wide"><span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-note"/></svg><b>Note</b></span><textarea name="note" rows="3" placeholder="Optional detail"></textarea></label>
                    </div>
                    <footer><button type="button" class="pmd-inv-btn pmd-inv-btn--ghost" data-pmd-inv-close>Cancel</button><button type="submit" class="pmd-inv-btn pmd-inv-btn--amber">Record waste</button></footer>
                </form>
            </section>
        </div>

        {{-- Recipe --}}
        <div class="pmd-inv-modal" data-pmd-inv-modal="recipe" hidden aria-hidden="true">
            <div class="pmd-inv-modal__backdrop" data-pmd-inv-close></div>
            <section class="pmd-inv-modal__sheet pmd-inv-modal__sheet--large pmd-inv-modal__sheet--recipe pmd-modal-card" data-pmd-card-language-v1="inventory" role="dialog" aria-modal="true" aria-labelledby="pmd-inv-recipe-title">
                <header>
                    <div><span>Menu → stock</span><h2 id="pmd-inv-recipe-title">Connect menu</h2></div>
                    <button type="button" class="pmd-inv-icon-btn" data-pmd-inv-close aria-label="Close">×</button>
                </header>
                <form data-pmd-inv-form="recipe">
                    <div class="pmd-inv-recipe-intro">
                        <div>
                            <strong>Each sale will reduce the stock items below.</strong>
                        </div>
                    </div>

                    <div class="pmd-inv-form-grid">
                        <label class="is-wide"><span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-menu"/></svg><b>Menu item</b></span><select name="menu_id" required data-pmd-inv-menu-select><option value="">Choose menu item</option></select></label>
                    </div>

                    <section class="pmd-inv-pos-browser pmd-inv-pos-browser--compact pmd-inv-pos-browser--stock" data-pmd-inv-visual-browser="recipe">
                        <div class="pmd-inv-pos-browser__top">
                            <div><span>Ingredients</span><strong>Tap stock used in this menu item</strong></div>
                            <label class="pmd-inv-pos-browser__search">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
                                <input type="search" placeholder="Search your stock…" autocomplete="off" data-pmd-inv-browser-search="recipe">
                            </label>
                        </div>
                        <div class="pmd-inv-pos-browser__categories" data-pmd-inv-browser-categories="recipe"></div>
                        <div class="pmd-inv-pos-browser__grid" data-pmd-inv-browser-grid="recipe"></div>
                        <button type="button" class="pmd-inv-pos-browser__more" data-pmd-inv-browser-more="recipe" hidden>Show more</button>
                    </section>

                    <div class="pmd-inv-lines-head">
                        <div><strong class="pmd-inv-card-section-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-recipe"/></svg><span>Used per sale</span></strong></div>
                        <div class="pmd-inv-lines-head__actions">
                            <button type="button" class="pmd-inv-mini-btn" data-pmd-inv-direct-recipe>Use 1 package</button>
                            <button type="button" class="pmd-inv-mini-btn is-primary" data-pmd-inv-add-recipe-line>+ Ingredient</button>
                        </div>
                    </div>

                    <div class="pmd-inv-recipe-line-head" aria-hidden="true">
                        <span>Stock item</span><span>Amount per sale</span><span>Unit</span><span></span>
                    </div>
                    <div class="pmd-inv-lines" data-pmd-inv-recipe-lines></div>

                    <footer>
                        <button type="button" class="pmd-inv-btn pmd-inv-btn--ghost pmd-inv-btn--danger-ghost" data-pmd-inv-clear-recipe hidden>Remove connection</button>
                        <span class="pmd-inv-footer-spacer"></span>
                        <button type="button" class="pmd-inv-btn pmd-inv-btn--ghost" data-pmd-inv-close>Cancel</button>
                        <button type="submit" class="pmd-inv-btn pmd-inv-btn--ink">Save connection</button>
                    </footer>
                </form>
            </section>
        </div>

        {{-- Automatic shopping list --}}
        <div class="pmd-inv-modal" data-pmd-inv-modal="shopping" hidden aria-hidden="true">
            <div class="pmd-inv-modal__backdrop" data-pmd-inv-close></div>
            <section class="pmd-inv-modal__sheet pmd-inv-modal__sheet--large pmd-inv-modal__sheet--shopping pmd-modal-card" data-pmd-card-language-v1="inventory" role="dialog" aria-modal="true" aria-labelledby="pmd-inv-shopping-title">
                <header>
                    <div><span>Reorder plan</span><h2 id="pmd-inv-shopping-title">Shopping list</h2></div>
                    <button type="button" class="pmd-inv-icon-btn" data-pmd-inv-close aria-label="Close">×</button>
                </header>
                <div class="pmd-inv-shopping-intro">
                    <strong class="pmd-inv-card-section-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-cart"/></svg><span>Plan the next shop</span></strong>
                    <span>Choose how far ahead you want to cover. PayMyDine uses current stock, recent sales usage and your reorder level.</span>
                </div>

                <div class="pmd-inv-shopping-horizon">
                    <div class="pmd-inv-shopping-horizon__presets" role="group" aria-label="Shopping horizon">
                        <button type="button" class="is-active" data-pmd-shopping-days="1">Today</button>
                        <button type="button" data-pmd-shopping-days="3">3 days</button>
                        <button type="button" data-pmd-shopping-days="7">7 days</button>
                    </div>
                    <label>
                        <span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-calendar"/></svg><b>Or cover until</b></span>
                        <input type="date" min="{{ now()->toDateString() }}" value="{{ now()->toDateString() }}" data-pmd-shopping-date>
                    </label>
                </div>

                <div class="pmd-inv-shopping-summary" data-pmd-inv-shopping-summary></div>
                <div class="pmd-inv-shopping-list" data-pmd-inv-shopping-list></div>
                <footer class="pmd-inv-modal__static-footer">
                    <button type="button" class="pmd-inv-btn pmd-inv-btn--ghost" data-pmd-inv-close>Cancel</button>
                    <span class="pmd-inv-footer-spacer"></span>
                    <button type="button" class="pmd-inv-btn pmd-inv-btn--ghost" data-pmd-inv-copy-shopping>Copy list</button>
                    <button type="button" class="pmd-inv-btn pmd-inv-btn--ink" data-pmd-inv-print-shopping>Print</button>
                </footer>
            </section>
        </div>

        {{-- Physical count --}}
        <div class="pmd-inv-modal" data-pmd-inv-modal="count" hidden aria-hidden="true">
            <div class="pmd-inv-modal__backdrop" data-pmd-inv-close></div>
            <section class="pmd-inv-modal__sheet pmd-inv-modal__sheet--count pmd-inv-modal__sheet--physical-count pmd-modal-card" data-pmd-card-language-v1="inventory" role="dialog" aria-modal="true" aria-labelledby="pmd-inv-count-title">
                <header>
                    <div><span>Physical verification</span><h2 id="pmd-inv-count-title">Count stock</h2></div>
                    <button type="button" class="pmd-inv-icon-btn" data-pmd-inv-close aria-label="Close">×</button>
                </header>
                <form data-pmd-inv-form="count">
                    <div class="pmd-inv-count-help"><strong class="pmd-inv-card-section-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-clipboard"/></svg><span>Physical count</span></strong><p>Enter what is physically there now. The variance preview compares it with purchases − recipe usage − recorded waste.</p></div>
                    <div class="pmd-inv-count-grid" data-pmd-inv-count-lines></div>
                    <label class="pmd-inv-count-note"><span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-note"/></svg><b>Count note</b></span><textarea name="note" rows="2" placeholder="Optional"></textarea></label>
                    <footer><button type="button" class="pmd-inv-btn pmd-inv-btn--ghost" data-pmd-inv-close>Cancel</button><button type="submit" class="pmd-inv-btn pmd-inv-btn--ink">Complete count</button></footer>
                </form>
            </section>
        </div>
    @endif
</main>


{{-- PMD_INVENTORY_CARD_GEOMETRY_R9 --}}
{{-- Inventory modals use the same centered viewport card/control geometry as Owner Dashboard table management. --}}

{{-- PMD_INVENTORY_CARD_LANGUAGE_R8 --}}
<svg class="pmd-inv-card-sprite" aria-hidden="true" width="0" height="0"><defs>
  <symbol id="pmd-inv-icon-box" viewBox="0 0 24 24"><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></symbol>
  <symbol id="pmd-inv-icon-package" viewBox="0 0 24 24"><path d="M4 7h16v13H4zM7 7l2-4h6l2 4M8 12h8"/></symbol>
  <symbol id="pmd-inv-icon-scale" viewBox="0 0 24 24"><path d="M12 4v16M5 7h14M7 7l-3 6h6L7 7ZM17 7l-3 6h6l-3-6ZM8 20h8"/></symbol>
  <symbol id="pmd-inv-icon-stock" viewBox="0 0 24 24"><rect x="3" y="4" width="8" height="7" rx="1"/><rect x="13" y="4" width="8" height="7" rx="1"/><rect x="3" y="13" width="8" height="7" rx="1"/><rect x="13" y="13" width="8" height="7" rx="1"/></symbol>
  <symbol id="pmd-inv-icon-money" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5c-.8-.7-1.8-1-3-1-1.7 0-3 .8-3 2s1.1 1.8 3.2 2.2c2 .4 2.8 1.1 2.8 2.3s-1.3 2-3 2c-1.3 0-2.5-.4-3.4-1.2M12 5.8v12.4"/></symbol>
  <symbol id="pmd-inv-icon-sliders" viewBox="0 0 24 24"><path d="M4 6h6M14 6h6M10 4v4M4 12h10M18 12h2M14 10v4M4 18h2M10 18h10M6 16v4"/></symbol>
  <symbol id="pmd-inv-icon-tag" viewBox="0 0 24 24"><path d="M20 13 13 20 4 11V4h7l9 9Z"/><circle cx="8.5" cy="8.5" r="1.5"/></symbol>
  <symbol id="pmd-inv-icon-barcode" viewBox="0 0 24 24"><path d="M4 5v14M7 5v14M11 5v14M14 5v14M18 5v14M20 5v14"/></symbol>
  <symbol id="pmd-inv-icon-alert" viewBox="0 0 24 24"><path d="m12 3 9 17H3L12 3Z"/><path d="M12 9v5M12 17h.01"/></symbol>
  <symbol id="pmd-inv-icon-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 4V2M20 12h2M12 20v2M4 12H2"/></symbol>
  <symbol id="pmd-inv-icon-truck" viewBox="0 0 24 24"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></symbol>
  <symbol id="pmd-inv-icon-receipt" viewBox="0 0 24 24"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h4"/></symbol>
  <symbol id="pmd-inv-icon-calendar" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></symbol>
  <symbol id="pmd-inv-icon-ruler" viewBox="0 0 24 24"><path d="m4 17 13-13 3 3L7 20l-3-3Z"/><path d="m9 15-2-2M12 12l-2-2M15 9l-2-2"/></symbol>
  <symbol id="pmd-inv-icon-trash" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></symbol>
  <symbol id="pmd-inv-icon-note" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></symbol>
  <symbol id="pmd-inv-icon-menu" viewBox="0 0 24 24"><path d="M5 3v8M3 3v5a2 2 0 0 0 4 0V3M5 11v10M15 3v18M15 3c4 2 5 5 5 8h-5"/></symbol>
  <symbol id="pmd-inv-icon-recipe" viewBox="0 0 24 24"><path d="M5 6h14M7 6v14h10V6M9 3h6v3M9 11h6M9 15h4"/></symbol>
  <symbol id="pmd-inv-icon-cart" viewBox="0 0 24 24"><path d="M3 4h2l2 11h10l3-7H7M9 20h.01M17 20h.01"/></symbol>
  <symbol id="pmd-inv-icon-clipboard" viewBox="0 0 24 24"><path d="M8 5H5v16h14V5h-3M9 3h6v4H9zM8 12h8M8 16h6"/></symbol>
</defs></svg>

<script id="pmd-inventory-bootstrap" type="application/json">{!! json_encode(
    $bootstrap,
    JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE |
    JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
) !!}</script>
