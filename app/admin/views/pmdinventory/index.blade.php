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
            <section class="pmd-inv-modal__sheet pmd-modal-card" data-pmd-card-language-v1="inventory" role="dialog" aria-modal="true" aria-labelledby="pmd-inv-item-title">
                <header>
                    <div><span>Catalog</span><h2 id="pmd-inv-item-title" data-pmd-inv-item-title>Add stock item</h2></div>
                    <button type="button" class="pmd-inv-icon-btn" data-pmd-inv-close aria-label="Close">×</button>
                </header>
                <form data-pmd-inv-form="item">
                    <input type="hidden" name="item_id" value="">

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
                                <input type="number" min="0.0001" step="0.0001" name="purchase_to_base" value="1" placeholder="750">
                                <select name="unit">@foreach($units as $value => $label)<option value="{{ $value }}">{{ $label }}</option>@endforeach</select>
                            </div>
                            <small data-pmd-inv-package-help>Example: 1 bottle = 750 ml.</small>
                        </label>

                        <label data-pmd-inv-opening-field>
                            <span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-stock"/></svg><b>Current stock</b></span>
                            <input type="number" min="0" step="0.0001" name="opening_qty" value="" placeholder="0" required>
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
                            <label><span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-alert"/></svg><b>Reorder at</b></span><input type="number" min="0" step="0.0001" name="reorder_point" value="0"></label>
                            <label><span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-target"/></svg><b>Target / par</b></span><input type="number" min="0" step="0.0001" name="par_level" value="0"></label>
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
            <section class="pmd-inv-modal__sheet pmd-inv-modal__sheet--large pmd-modal-card" data-pmd-card-language-v1="inventory" role="dialog" aria-modal="true" aria-labelledby="pmd-inv-purchase-title">
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
            <section class="pmd-inv-modal__sheet pmd-modal-card" data-pmd-card-language-v1="inventory" role="dialog" aria-modal="true" aria-labelledby="pmd-inv-waste-title">
                <header>
                    <div><span>Stock outflow</span><h2 id="pmd-inv-waste-title">Record waste</h2></div>
                    <button type="button" class="pmd-inv-icon-btn" data-pmd-inv-close aria-label="Close">×</button>
                </header>
                <form data-pmd-inv-form="waste">
                    <div class="pmd-inv-form-grid">
                        <label class="is-wide"><span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-box"/></svg><b>Stock item</b></span><select name="item_id" required data-pmd-inv-item-select data-pmd-waste-item><option value="">Choose item</option></select></label>
                        <label><span class="pmd-inv-card-field-title"><svg aria-hidden="true"><use href="#pmd-inv-icon-scale"/></svg><b>Quantity</b></span><input type="number" min="0.0001" step="0.0001" name="quantity" required></label>
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
            <section class="pmd-inv-modal__sheet pmd-inv-modal__sheet--large pmd-modal-card" data-pmd-card-language-v1="inventory" role="dialog" aria-modal="true" aria-labelledby="pmd-inv-recipe-title">
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
            <section class="pmd-inv-modal__sheet pmd-inv-modal__sheet--large pmd-modal-card" data-pmd-card-language-v1="inventory" role="dialog" aria-modal="true" aria-labelledby="pmd-inv-shopping-title">
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
            <section class="pmd-inv-modal__sheet pmd-inv-modal__sheet--count pmd-modal-card" data-pmd-card-language-v1="inventory" role="dialog" aria-modal="true" aria-labelledby="pmd-inv-count-title">
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
