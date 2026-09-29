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
    $hasItems = !empty($snapshot['items']);
    $attentionCount = (int)(($summary['critical_items'] ?? 0) + ($summary['low_items'] ?? 0));

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
    {{-- PMD_INVENTORY_SIMPLE_UI_R6 --}}
    <header id="pmd-inv-clean-header" class="pmd-owner-header pmd-inv__mother-header pmd-inv-r6-header" aria-label="Stock control header">
        <div class="pmd-owner-header__left pmd-inv__mother-header-left">
            <h1>Stock control</h1>
        </div>

        @if($ready)
            <div class="pmd-owner-header__actions pmd-inv__mother-actions pmd-inv-r6-header__actions">
                <div class="pmd-inv-r6-header__ops" data-pmd-inv-header-ops @unless($hasItems) hidden @endunless>
                    <button type="button" class="pmd-inv-header-btn is-blue" data-pmd-inv-open="purchase">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v14H4zM8 6V4h8v2M8 11h8M8 15h5"/></svg>
                        <span>Add purchase</span>
                    </button>

                    <div class="pmd-inv-r6-action-menu" data-pmd-inv-action-menu>
                        <button type="button" class="pmd-inv-r6-action-menu__toggle" data-pmd-inv-actions-toggle aria-expanded="false">
                            Actions
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>
                        </button>
                        <div class="pmd-inv-r6-action-menu__panel" data-pmd-inv-actions-panel hidden>
                            <button type="button" data-pmd-inv-open="item">
                                <span>Add stock item</span><small>Manual entry</small>
                            </button>
                            <button type="button" data-pmd-inv-open="recipe" data-pmd-inv-requires-items @unless($hasItems) hidden @endunless>
                                <span>Connect menu</span><small>What each sale uses</small>
                            </button>
                            <button type="button" data-pmd-inv-open="count" data-pmd-inv-requires-items @unless($hasItems) hidden @endunless>
                                <span>Count stock</span><small>Physical count</small>
                            </button>
                            <button type="button" data-pmd-inv-open="waste" data-pmd-inv-requires-items @unless($hasItems) hidden @endunless>
                                <span>Record waste</span><small>Spill, spoilage, staff meal…</small>
                            </button>
                            <button type="button" data-pmd-inv-open="shopping" data-pmd-inv-requires-items @unless($hasItems) hidden @endunless>
                                <span>Shopping list</span><small>Plan the next order</small>
                            </button>
                        </div>
                    </div>
                </div>

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

            <section class="pmd-inv-r6-empty" data-pmd-inv-empty-state @if($hasItems) hidden @endif>
                <div class="pmd-inv-r6-empty__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M4 7 12 3l8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/></svg>
                </div>
                <span>First setup</span>
                <h2>Add the stock that is in the restaurant now.</h2>
                <p>Start from a supplier bill, or add one item manually.</p>
                <div class="pmd-inv-r6-empty__actions">
                    <button type="button" class="pmd-inv-btn pmd-inv-btn--blue" data-pmd-inv-open="purchase">
                        Add purchase
                    </button>
                    <button type="button" class="pmd-inv-btn pmd-inv-btn--ghost" data-pmd-inv-open="item">
                        Add item manually
                    </button>
                </div>
                <small>After that, PayMyDine will guide you to connect menu sales and make the first count.</small>
            </section>

            <div class="pmd-inv-r6-dashboard" data-pmd-inv-dashboard @unless($hasItems) hidden @endunless>
                <section class="pmd-inv-r6-next" data-pmd-inv-next-step hidden></section>

                <section class="pmd-inv-r6-kpis" aria-label="Inventory summary">
                    <article>
                        <span>Stock value</span>
                        <strong data-pmd-inv-money="stock">{{ number_format((float)($summary['estimated_stock_value'] ?? 0), 2) }}</strong>
                        <small>{{ $currency }}</small>
                    </article>
                    <article>
                        <span>Needs attention</span>
                        <strong data-pmd-inv-stat="attention">{{ $attentionCount }}</strong>
                        <small>low or critical items</small>
                    </article>
                    <article>
                        <span>Latest variance</span>
                        <strong data-pmd-inv-money="variance">{{ number_format((float)($summary['unexplained_loss_value'] ?? 0), 2) }}</strong>
                        <small>review signal · {{ $currency }}</small>
                    </article>
                </section>

                <div class="pmd-inv-r6-workspace">
                    <section class="pmd-inv-r6-stock pmd-inv-card">
                        <div class="pmd-inv-r6-card-head">
                            <div>
                                <span>Stock</span>
                                <h2>What should be on hand</h2>
                            </div>
                            <label class="pmd-inv__search">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
                                <input type="search" placeholder="Search stock…" data-pmd-inv-search autocomplete="off">
                            </label>
                        </div>

                        <div class="pmd-inv__table-wrap">
                            <table class="pmd-inv__table pmd-inv-r6-table">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>On hand</th>
                                        <th>Days left</th>
                                        <th>Last variance</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody data-pmd-inv-stock-body></tbody>
                            </table>
                        </div>
                    </section>

                    <aside class="pmd-inv-r6-order pmd-inv-card">
                        <div class="pmd-inv-r6-card-head">
                            <div>
                                <span>Next order</span>
                                <h2>What needs buying</h2>
                            </div>
                        </div>
                        <div class="pmd-inv-r6-order__body" data-pmd-inv-attention></div>
                        <button type="button" class="pmd-inv-r6-order__button" data-pmd-inv-open="shopping">
                            Plan shopping list
                        </button>
                    </aside>
                </div>

                <section class="pmd-inv-r6-activity pmd-inv-card">
                    <div class="pmd-inv-r6-card-head">
                        <div>
                            <span>Recent activity</span>
                            <h2>What changed</h2>
                        </div>
                    </div>
                    <div class="pmd-inv-r6-recent" data-pmd-inv-recent></div>
                </section>
            </div>
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

                    <div class="pmd-inv-r6-item-basic">
                        <div class="pmd-inv-r6-name-field">
                            <label>
                                <span>Item name</span>
                                <input name="name" required placeholder="e.g. Vodka" autocomplete="off" data-pmd-inv-common-search>
                            </label>
                            <div class="pmd-inv-r6-suggestions" data-pmd-inv-common-results hidden></div>
                        </div>

                        <label>
                            <span>Bought as</span>
                            <select name="purchase_unit">@foreach($units as $value => $label)<option value="{{ $value }}">{{ $label }}</option>@endforeach</select>
                        </label>

                        <label class="pmd-inv-r6-package-field">
                            <span>Each one contains</span>
                            <div>
                                <input type="number" min="0.0001" step="0.0001" name="purchase_to_base" value="1" placeholder="750">
                                <select name="unit">@foreach($units as $value => $label)<option value="{{ $value }}">{{ $label }}</option>@endforeach</select>
                            </div>
                            <small data-pmd-inv-package-help>Example: 1 bottle = 750 ml.</small>
                        </label>

                        <label data-pmd-inv-opening-field>
                            <span>Current stock</span>
                            <input type="number" min="0" step="0.0001" name="opening_qty" value="0">
                        </label>

                        <label>
                            <span>Cost per purchase unit</span>
                            <input type="number" min="0" step="0.0001" name="purchase_cost" value="0" placeholder="0.00">
                        </label>
                    </div>

                    <details class="pmd-inv-r6-advanced">
                        <summary>More settings</summary>
                        <div class="pmd-inv-form-grid">
                            <label><span>Category</span><input name="category" placeholder="Optional"></label>
                            <label><span>SKU / code</span><input name="sku" placeholder="Optional"></label>
                            <label><span>Reorder at</span><input type="number" min="0" step="0.0001" name="reorder_point" value="0"></label>
                            <label><span>Target / par</span><input type="number" min="0" step="0.0001" name="par_level" value="0"></label>
                            <label class="is-wide"><span>Supplier</span><input name="supplier_name" placeholder="Optional"></label>
                        </div>
                    </details>

                    <footer>
                        <button type="button" class="pmd-inv-btn pmd-inv-btn--ghost" data-pmd-inv-close>Cancel</button>
                        <button type="submit" class="pmd-inv-btn pmd-inv-btn--ink" data-pmd-inv-item-save>Add item</button>
                    </footer>
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
                        <label><span>Supplier</span><input name="supplier_name" placeholder="Supplier"></label>
                        <label><span>Purchase date</span><input type="date" name="purchased_at" value="{{ now()->toDateString() }}"></label>
                    </div>

                    <div class="pmd-inv-lines-head">
                        <div><strong>Items received</strong></div>
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
                        <label class="is-wide"><span>Stock item</span><select name="item_id" required data-pmd-inv-item-select data-pmd-waste-item><option value="">Choose item</option></select></label>
                        <label><span>Quantity</span><input type="number" min="0.0001" step="0.0001" name="quantity" required></label>
                        <label><span>Unit</span><select name="quantity_unit" data-pmd-waste-unit><option value="">Choose item first</option></select></label>
                        <label class="is-wide"><span>Reason</span><select name="reason">@foreach($wasteReasons as $reason)<option value="{{ $reason }}">{{ $reason }}</option>@endforeach</select></label>
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
                        <label class="is-wide"><span>Menu item</span><select name="menu_id" required data-pmd-inv-menu-select><option value="">Choose menu item</option></select></label>
                    </div>

                    <div class="pmd-inv-lines-head">
                        <div><strong>Used per sale</strong></div>
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
