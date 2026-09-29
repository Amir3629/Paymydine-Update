@php
    $inventory = is_array($pmdInventory ?? null) ? $pmdInventory : [];
    $snapshot = is_array($inventory['snapshot'] ?? null) ? $inventory['snapshot'] : [];
    $summary = is_array($snapshot['summary'] ?? null) ? $snapshot['summary'] : [];
    $ready = (bool)($inventory['ready'] ?? false);
    $aiReceipts = (bool)($inventory['ai_receipts'] ?? false);
    $currency = (string)($inventory['currency'] ?? 'EUR');
    $units = is_array($inventory['units'] ?? null) ? $inventory['units'] : [];
    $wasteReasons = is_array($inventory['waste_reasons'] ?? null) ? $inventory['waste_reasons'] : [];
    $commonStock = is_array($inventory['common_stock'] ?? null) ? $inventory['common_stock'] : [];

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
    ];
@endphp

<main id="pmd-inventory-v1" class="pmd-inv pmd-owner-page" data-pmd-inventory-root>
    {{-- PMD_INVENTORY_DASHBOARD_UI_R2 --}}
    <header id="pmd-inv-clean-header" class="pmd-owner-header pmd-inv__mother-header" aria-label="Stock control header">
        <div class="pmd-owner-header__left pmd-inv__mother-header-left">
            <h1>Stock control</h1>
        </div>

        @if($ready)
            <div class="pmd-owner-header__actions pmd-inv__mother-actions" aria-label="Primary stock actions">
                <button type="button" class="pmd-inv-header-btn is-blue" data-pmd-inv-open="purchase">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v14H4zM8 6V4h8v2M8 11h8M8 15h5"/></svg>
                    <span>Purchase</span>
                </button>
                <button type="button" class="pmd-inv-header-btn is-ink" data-pmd-inv-open="count">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 9l2 2 4-4M8 15h8"/></svg>
                    <span>Count stock</span>
                </button>

                <span class="pmd-inv__header-divider" aria-hidden="true"></span>
                <span class="pmd-inv__notif-slot" data-pmd-inv-notif-slot aria-label="Notifications">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                </span>
            </div>
        @endif
    </header>

    <div class="pmd-inv__stage">
        @if(!$ready)
            <section class="pmd-inv__setup pmd-inv-card">
                <div class="pmd-inv__setup-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M4 7 12 3l8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/></svg>
                </div>
                <div class="pmd-inv__setup-copy">
                    <span>Setup required</span>
                    <h2>Inventory Control needs its database update.</h2>
                    <p>{{ (string)($inventory['error'] ?? 'Run the PayMyDine inventory update, then reload this page.') }}</p>
                </div>
                <code>sudo -u www-data php artisan igniter:up --no-interaction</code>
            </section>
        @else
            <section class="pmd-inv__toolbar" aria-label="Inventory actions">
                <div class="pmd-inv__toolbar-copy">
                    <span>Inventory control</span>
                    <strong>Physical stock · purchases · recipe usage · waste · counts</strong>
                </div>

                <div class="pmd-inv__toolbar-actions">
                    <span class="pmd-inv__attention-pill">
                        <b data-pmd-inv-stat="attention">{{ (int)(($summary['critical_items'] ?? 0) + ($summary['low_items'] ?? 0)) }}</b>
                        needs action
                    </span>

                    <button type="button" class="pmd-inv-btn pmd-inv-btn--ghost" data-pmd-inv-open="item">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                        Stock item
                    </button>
                    <button type="button" class="pmd-inv-btn pmd-inv-btn--ghost" data-pmd-inv-open="recipe">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></svg>
                        Menu links
                    </button>
                    <button type="button" class="pmd-inv-btn pmd-inv-btn--amber" data-pmd-inv-open="waste">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>
                        Waste
                    </button>
                    <button type="button" class="pmd-inv-btn pmd-inv-btn--ghost" data-pmd-inv-open="shopping">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h15l-2 8H8L6 4H3M9 20h.01M18 20h.01"/></svg>
                        Shopping list
                    </button>
                </div>
            </section>

            @if(!empty($inventory['error']))
                <div class="pmd-inv__error-banner" role="alert">
                    <strong>Inventory data could not be fully loaded.</strong>
                    <span>{{ (string)$inventory['error'] }}</span>
                </div>
            @endif

            <section id="pmd-inventory-kpis-r2" class="pmd-inv__kpis" aria-label="Inventory KPIs">
                <article class="pmd-inv-kpi is-blue">
                    <span class="pmd-inv-kpi__icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M4 6h16v14H4zM8 6V4h8v2M8 11h8M8 15h5"/></svg>
                    </span>
                    <div class="pmd-inv-kpi__copy">
                        <span>Purchases · 30 days</span>
                        <strong data-pmd-inv-money="purchases">{{ number_format((float)($summary['purchases_cost_30d'] ?? 0), 2) }}</strong>
                        <small>Stock received · {{ $currency }}</small>
                    </div>
                </article>

                <article class="pmd-inv-kpi is-purple">
                    <span class="pmd-inv-kpi__icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M4 7 12 3l8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/></svg>
                    </span>
                    <div class="pmd-inv-kpi__copy">
                        <span>Estimated stock value</span>
                        <strong data-pmd-inv-money="stock">{{ number_format((float)($summary['estimated_stock_value'] ?? 0), 2) }}</strong>
                        <small>Latest item cost · {{ $currency }}</small>
                    </div>
                </article>

                <article class="pmd-inv-kpi is-orange">
                    <span class="pmd-inv-kpi__icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>
                    </span>
                    <div class="pmd-inv-kpi__copy">
                        <span>Waste · 30 days</span>
                        <strong data-pmd-inv-money="waste">{{ number_format((float)($summary['waste_cost_30d'] ?? 0), 2) }}</strong>
                        <small>Explicitly recorded · {{ $currency }}</small>
                    </div>
                </article>

                <article class="pmd-inv-kpi is-red">
                    <span class="pmd-inv-kpi__icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 4.3 2.7 18a2 2 0 0 0 1.75 3h15.1a2 2 0 0 0 1.75-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/></svg>
                    </span>
                    <div class="pmd-inv-kpi__copy">
                        <span>Unexplained loss</span>
                        <strong data-pmd-inv-money="variance">{{ number_format((float)($summary['unexplained_loss_value'] ?? 0), 2) }}</strong>
                        <small>Latest physical count · {{ $currency }}</small>
                    </div>
                </article>
            </section>

            @if(empty($snapshot['items']))
                <section class="pmd-inv__onboarding pmd-inv-card">
                    <div class="pmd-inv__onboarding-head">
                        <div>
                            <span>First setup</span>
                            <h2>Start with the stock that physically exists in the restaurant.</h2>
                            <p>Receiving a supplier bill can create stock items automatically. Then connect recipes and complete the first physical count.</p>
                        </div>
                        <button type="button" class="pmd-inv-btn pmd-inv-btn--blue" data-pmd-inv-open="purchase">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v14H4zM8 6V4h8v2M8 11h8M8 15h5"/></svg>
                            Add first purchase
                        </button>
                    </div>
                    <div class="pmd-inv__onboarding-steps">
                        <div><b>1</b><span><strong>Receive stock</strong><small>Enter a supplier bill or scan a photo/PDF.</small></span></div>
                        <div><b>2</b><span><strong>Link recipes</strong><small>Tell PMD what each sold menu item consumes.</small></span></div>
                        <div><b>3</b><span><strong>Count stock</strong><small>Create the clean physical baseline for variance.</small></span></div>
                    </div>
                </section>
            @endif

            <aside class="pmd-inv__variance-note">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4M12 17h.01M10.3 4.3 2.7 18a2 2 0 0 0 1.75 3h15.1a2 2 0 0 0 1.75-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/></svg>
                <p><strong>Variance is a review signal, not proof of theft.</strong> Shortages can also come from portioning, spills, comps, count mistakes, unrecorded waste or stock moved without a record.</p>
                <span data-pmd-inv-last-count>
                    @if(!empty($snapshot['last_count']['counted_at']))
                        Last count {{ $snapshot['last_count']['counted_at'] }}
                    @else
                        No physical count yet
                    @endif
                </span>
            </aside>

            <div class="pmd-inv__workspace">
                <section class="pmd-inv__ledger pmd-inv-card">
                    <div class="pmd-inv__ledger-head">
                        <div>
                            <span class="pmd-inv__section-kicker">Store room ledger</span>
                            <h2>What should be on hand</h2>
                        </div>
                        <label class="pmd-inv__search">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
                            <input type="search" placeholder="Search stock…" data-pmd-inv-search autocomplete="off">
                        </label>
                    </div>

                    <div class="pmd-inv__table-wrap">
                        <table class="pmd-inv__table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>On hand</th>
                                    <th>Sales use / day</th>
                                    <th>Days left</th>
                                    <th>Par</th>
                                    <th>Last variance</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody data-pmd-inv-stock-body></tbody>
                        </table>
                    </div>
                </section>

                <aside class="pmd-inv__action-rail pmd-inv-card">
                    <div class="pmd-inv__rail-head">
                        <div>
                            <span class="pmd-inv__section-kicker">Automatic shopping list</span>
                            <h2>Needs action</h2>
                        </div>
                        <span class="pmd-inv__recipe-coverage"><b data-pmd-inv-recipe-coverage>{{ (int)($summary['recipe_coverage_pct'] ?? 0) }}%</b> recipes linked</span>
                    </div>
                    <div data-pmd-inv-attention></div>
                </aside>
            </div>

            <section class="pmd-inv__activity pmd-inv-card">
                <div class="pmd-inv__tabs" role="tablist" aria-label="Inventory activity">
                    <button type="button" class="is-active" role="tab" aria-selected="true" data-pmd-inv-tab="purchases">Purchases</button>
                    <button type="button" role="tab" aria-selected="false" data-pmd-inv-tab="waste">Waste</button>
                    <button type="button" role="tab" aria-selected="false" data-pmd-inv-tab="recipes">Menu links</button>
                    <button type="button" role="tab" aria-selected="false" data-pmd-inv-tab="counts">Counts</button>
                </div>

                <div class="pmd-inv__activity-panel is-active" data-pmd-inv-panel="purchases"></div>
                <div class="pmd-inv__activity-panel" data-pmd-inv-panel="waste" hidden></div>
                <div class="pmd-inv__activity-panel" data-pmd-inv-panel="recipes" hidden></div>
                <div class="pmd-inv__activity-panel" data-pmd-inv-panel="counts" hidden></div>
            </section>
        @endif
    </div>
    <div class="pmd-inv-toast" role="status" aria-live="polite" data-pmd-inv-toast></div>

    @if($ready)
        {{-- New physical stock item --}}
        <div class="pmd-inv-modal" data-pmd-inv-modal="item" hidden aria-hidden="true">
            <div class="pmd-inv-modal__backdrop" data-pmd-inv-close></div>
            <section class="pmd-inv-modal__sheet" role="dialog" aria-modal="true" aria-labelledby="pmd-inv-item-title">
                <header>
                    <div><span>Catalog</span><h2 id="pmd-inv-item-title" data-pmd-inv-item-title>Add stock item</h2></div>
                    <button type="button" class="pmd-inv-icon-btn" data-pmd-inv-close aria-label="Close">×</button>
                </header>
                <form data-pmd-inv-form="item">
                    <input type="hidden" name="item_id" value="">

                    <div class="pmd-inv-common-stock">
                        <div class="pmd-inv-common-stock__head">
                            <div>
                                <strong>Start fast</strong>
                                <span>Search common restaurant stock, or type your own item below.</span>
                            </div>
                            <label>
                                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
                                <input type="search" placeholder="Water, beef, wine…" data-pmd-inv-common-search autocomplete="off">
                            </label>
                        </div>
                        <div class="pmd-inv-common-stock__results" data-pmd-inv-common-results></div>
                    </div>

                    <div class="pmd-inv-form-grid">
                        <label class="is-wide"><span>Stock item name</span><input name="name" required placeholder="e.g. Champagne Brut"></label>
                        <label><span>Category</span><input name="category" placeholder="Bar / Produce / Meat"></label>
                        <label><span>SKU / code</span><input name="sku" placeholder="Optional"></label>

                        <label>
                            <span>Track in</span>
                            <select name="unit">@foreach($units as $value => $label)<option value="{{ $value }}">{{ $label }}</option>@endforeach</select>
                            <small>Use ml or g when this item can be used partially.</small>
                        </label>

                        <label>
                            <span>Bought as</span>
                            <select name="purchase_unit">@foreach($units as $value => $label)<option value="{{ $value }}">{{ $label }}</option>@endforeach</select>
                            <small>Example: bottle, case, kg, tray.</small>
                        </label>

                        <label>
                            <span>Amount in one purchase unit</span>
                            <input type="number" min="0.0001" step="0.0001" name="purchase_to_base" value="1" placeholder="e.g. 750">
                            <small data-pmd-inv-package-help>Example: 1 bottle = 750 ml.</small>
                        </label>

                        <label>
                            <span>Cost per purchase unit</span>
                            <input type="number" min="0" step="0.0001" name="purchase_cost" value="0" placeholder="e.g. 18.50">
                        </label>

                        <label data-pmd-inv-opening-field>
                            <span>Opening stock</span>
                            <input type="number" min="0" step="0.0001" name="opening_qty" value="0">
                            <small>Enter this in the tracking unit.</small>
                        </label>

                        <label><span>Reorder at</span><input type="number" min="0" step="0.0001" name="reorder_point" value="0"></label>
                        <label><span>Target / par level</span><input type="number" min="0" step="0.0001" name="par_level" value="0"></label>
                        <label class="is-wide"><span>Supplier</span><input name="supplier_name" placeholder="Optional"></label>
                    </div>
                    <footer><button type="button" class="pmd-inv-btn pmd-inv-btn--ghost" data-pmd-inv-close>Cancel</button><button type="submit" class="pmd-inv-btn pmd-inv-btn--ink" data-pmd-inv-item-save>Add item</button></footer>
                </form>
            </section>
        </div>

        {{-- Purchase / supplier bill --}}
        <div class="pmd-inv-modal" data-pmd-inv-modal="purchase" hidden aria-hidden="true">
            <div class="pmd-inv-modal__backdrop" data-pmd-inv-close></div>
            <section class="pmd-inv-modal__sheet pmd-inv-modal__sheet--large" role="dialog" aria-modal="true" aria-labelledby="pmd-inv-purchase-title">
                <header>
                    <div><span>Incoming stock</span><h2 id="pmd-inv-purchase-title">Add purchase</h2></div>
                    <button type="button" class="pmd-inv-icon-btn" data-pmd-inv-close aria-label="Close">×</button>
                </header>

                <div class="pmd-inv-receipt-scan">
                    <div>
                        <strong>Scan supplier bill</strong>
                        <span>{{ $aiReceipts ? 'Photo or PDF → AI extracts the lines. You review before stock changes.' : 'Photo/PDF can be attached. AI extraction is currently unavailable, so enter the lines manually.' }}</span>
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
                        <label><span>Supplier</span><input name="supplier_name" placeholder="Supplier"></label>
                        <label><span>Purchase date</span><input type="date" name="purchased_at" value="{{ now()->toDateString() }}"></label>
                    </div>

                    <div class="pmd-inv-lines-head">
                        <div><strong>What arrived</strong><span>For known stock items, use the supplier unit (for example bottle or case). PayMyDine converts it to the tracking unit.</span></div>
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
            <section class="pmd-inv-modal__sheet" role="dialog" aria-modal="true" aria-labelledby="pmd-inv-waste-title">
                <header>
                    <div><span>Stock outflow</span><h2 id="pmd-inv-waste-title">Record waste</h2></div>
                    <button type="button" class="pmd-inv-icon-btn" data-pmd-inv-close aria-label="Close">×</button>
                </header>
                <form data-pmd-inv-form="waste">
                    <div class="pmd-inv-form-grid">
                        <label class="is-wide"><span>Stock item</span><select name="item_id" required data-pmd-inv-item-select><option value="">Choose item</option></select></label>
                        <label><span>Quantity in tracking unit</span><input type="number" min="0.0001" step="0.0001" name="quantity" required></label>
                        <label><span>Reason</span><select name="reason">@foreach($wasteReasons as $reason)<option value="{{ $reason }}">{{ $reason }}</option>@endforeach</select></label>
                        <label class="is-wide"><span>Note</span><textarea name="note" rows="3" placeholder="Optional detail"></textarea></label>
                    </div>
                    <footer><button type="button" class="pmd-inv-btn pmd-inv-btn--ghost" data-pmd-inv-close>Cancel</button><button type="submit" class="pmd-inv-btn pmd-inv-btn--amber">Record waste</button></footer>
                </form>
            </section>
        </div>

        {{-- Recipe --}}
        <div class="pmd-inv-modal" data-pmd-inv-modal="recipe" hidden aria-hidden="true">
            <div class="pmd-inv-modal__backdrop" data-pmd-inv-close></div>
            <section class="pmd-inv-modal__sheet pmd-inv-modal__sheet--large" role="dialog" aria-modal="true" aria-labelledby="pmd-inv-recipe-title">
                <header>
                    <div><span>Menu → stock</span><h2 id="pmd-inv-recipe-title">Connect menu to stock</h2></div>
                    <button type="button" class="pmd-inv-icon-btn" data-pmd-inv-close aria-label="Close">×</button>
                </header>
                <form data-pmd-inv-form="recipe">
                    <div class="pmd-inv-recipe-intro">
                        <div>
                            <strong>Connect this menu item to real stock</strong>
                            <span>Every POS sale will consume the quantities below automatically.</span>
                        </div>
                    </div>

                    <div class="pmd-inv-form-grid">
                        <label class="is-wide"><span>Menu item</span><select name="menu_id" required data-pmd-inv-menu-select><option value="">Choose menu item</option></select></label>
                    </div>

                    <div class="pmd-inv-lines-head">
                        <div>
                            <strong>Used per one sale</strong>
                            <span>Example: Mojito → 50 ml rum + 20 ml lime juice. For a bottled item sold as-is, use the direct-sale shortcut.</span>
                        </div>
                        <div class="pmd-inv-lines-head__actions">
                            <button type="button" class="pmd-inv-mini-btn" data-pmd-inv-direct-recipe>Direct sale · one package</button>
                            <button type="button" class="pmd-inv-mini-btn is-primary" data-pmd-inv-add-recipe-line>+ Ingredient</button>
                        </div>
                    </div>

                    <div class="pmd-inv-recipe-line-head" aria-hidden="true">
                        <span>Stock item</span><span>Amount per sale</span><span>Unit</span><span></span>
                    </div>
                    <div class="pmd-inv-lines" data-pmd-inv-recipe-lines></div>

                    <div class="pmd-inv-recipe-tip">
                        <strong>Tip:</strong>
                        Water, beer, cans and bottles can usually be linked directly. Food and cocktails normally use several stock items.
                    </div>

                    <footer><button type="button" class="pmd-inv-btn pmd-inv-btn--ghost" data-pmd-inv-close>Cancel</button><button type="submit" class="pmd-inv-btn pmd-inv-btn--ink">Save connection</button></footer>
                </form>
            </section>
        </div>

        {{-- Automatic shopping list --}}
        <div class="pmd-inv-modal" data-pmd-inv-modal="shopping" hidden aria-hidden="true">
            <div class="pmd-inv-modal__backdrop" data-pmd-inv-close></div>
            <section class="pmd-inv-modal__sheet pmd-inv-modal__sheet--large" role="dialog" aria-modal="true" aria-labelledby="pmd-inv-shopping-title">
                <header>
                    <div><span>Reorder plan</span><h2 id="pmd-inv-shopping-title">Shopping list</h2></div>
                    <button type="button" class="pmd-inv-icon-btn" data-pmd-inv-close aria-label="Close">×</button>
                </header>
                <div class="pmd-inv-shopping-intro">
                    <strong>Plan the next shop</strong>
                    <span>Choose how far ahead you want to cover. PayMyDine uses current stock, recent sales usage and your reorder level.</span>
                </div>

                <div class="pmd-inv-shopping-horizon">
                    <div class="pmd-inv-shopping-horizon__presets" role="group" aria-label="Shopping horizon">
                        <button type="button" class="is-active" data-pmd-shopping-days="1">Today</button>
                        <button type="button" data-pmd-shopping-days="3">3 days</button>
                        <button type="button" data-pmd-shopping-days="7">7 days</button>
                    </div>
                    <label>
                        <span>Or cover until</span>
                        <input type="date" min="{{ now()->toDateString() }}" value="{{ now()->toDateString() }}" data-pmd-shopping-date>
                    </label>
                </div>

                <div class="pmd-inv-shopping-summary" data-pmd-inv-shopping-summary></div>
                <div class="pmd-inv-shopping-list" data-pmd-inv-shopping-list></div>
                <footer class="pmd-inv-modal__static-footer">
                    <button type="button" class="pmd-inv-btn pmd-inv-btn--ghost" data-pmd-inv-copy-shopping>Copy list</button>
                    <button type="button" class="pmd-inv-btn pmd-inv-btn--ink" data-pmd-inv-print-shopping>Print</button>
                </footer>
            </section>
        </div>

        {{-- Physical count --}}
        <div class="pmd-inv-modal" data-pmd-inv-modal="count" hidden aria-hidden="true">
            <div class="pmd-inv-modal__backdrop" data-pmd-inv-close></div>
            <section class="pmd-inv-modal__sheet pmd-inv-modal__sheet--count" role="dialog" aria-modal="true" aria-labelledby="pmd-inv-count-title">
                <header>
                    <div><span>Physical verification</span><h2 id="pmd-inv-count-title">Count stock</h2></div>
                    <button type="button" class="pmd-inv-icon-btn" data-pmd-inv-close aria-label="Close">×</button>
                </header>
                <form data-pmd-inv-form="count">
                    <div class="pmd-inv-count-help">Enter what is physically there now. The variance preview compares it with purchases − recipe usage − recorded waste.</div>
                    <div class="pmd-inv-count-grid" data-pmd-inv-count-lines></div>
                    <label class="pmd-inv-count-note"><span>Count note</span><textarea name="note" rows="2" placeholder="Optional"></textarea></label>
                    <footer><button type="button" class="pmd-inv-btn pmd-inv-btn--ghost" data-pmd-inv-close>Cancel</button><button type="submit" class="pmd-inv-btn pmd-inv-btn--ink">Complete count</button></footer>
                </form>
            </section>
        </div>
    @endif
</main>

<script id="pmd-inventory-bootstrap" type="application/json">{!! json_encode(
    $bootstrap,
    JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE |
    JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
) !!}</script>
