<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="#064e3b">
    <title>PayMyDine POS</title>
    <link rel="icon" type="image/svg+xml" href="/app/admin/assets/images/pmd-favicon-final-20260822.svg">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-quick-pos-v1.css?v=20260919-13">
</head>
<body class="pmd-qpos-body">
@php
    $pmdInitialFloors = array_values((array)($initialBootstrap['floors'] ?? []));
    $pmdInitialFloorId = (string)(
        $initialBootstrap['active_floor_id']
        ?? $initialBootstrap['default_floor_id']
        ?? ''
    );
    if ($pmdInitialFloorId === '' && !empty($pmdInitialFloors)) {
        $pmdInitialFloorId = (string)($pmdInitialFloors[0]['id'] ?? '');
    }
    $pmdInitialTables = array_values(array_filter(
        (array)($initialBootstrap['tables'] ?? []),
        static fn ($table) =>
            (string)($table['floor_id'] ?? '') === $pmdInitialFloorId
    ));
    $pmdStatusLabels = [
        'available' => 'Free',
        'occupied' => 'Busy',
        'reserved' => 'Res.',
        'cleaning' => 'Clean',
    ];
    $pmdProfile = (array)($initialBootstrap['profile'] ?? []);
    $pmdProfileName = trim((string)($pmdProfile['name'] ?? 'Staff')) ?: 'Staff';
    $pmdProfileRole = trim((string)($pmdProfile['role'] ?? ''));
    $pmdProfileInitial = mb_strtoupper(mb_substr($pmdProfileName, 0, 1));
    $pmdDashboardUrl = $pmdProfile['dashboard_url'] ?? null;
    $pmdLogoutUrl = (string)($pmdProfile['logout_url'] ?? admin_url('logout'));
@endphp
<div
    id="pmd-quick-pos"
    class="pmd-qpos"
    data-mode="{{ $mode }}"
    data-bootstrap-url="/admin/pos/bootstrap/{{ $mode }}"
>
    <main class="pmd-qpos-main">
        <aside class="pmd-qpos-left">
            <section class="pmd-qpos-floor-switch">
                <div class="pmd-qpos-section-label">Floor</div>
                <div class="pmd-qpos-floor-tabs" data-qpos-floors>
                    @foreach($pmdInitialFloors as $floor)
                        <button
                            type="button"
                            data-qpos-floor="{{ $floor['id'] ?? '' }}"
                            class="{{ (string)($floor['id'] ?? '') === $pmdInitialFloorId ? 'is-active' : '' }}"
                        >{{ $floor['name'] ?? 'Floor' }}</button>
                    @endforeach
                </div>
            </section>

            <section class="pmd-qpos-tables">
                <div class="pmd-qpos-panel-head">
                    <strong data-qpos-table-title>Tables</strong>
                    <span class="pmd-qpos-table-count" data-qpos-table-count>{{ count($pmdInitialTables) }}</span>
                </div>
                <div class="pmd-qpos-table-legend">
                    <span><i class="available"></i>Free</span>
                    <span><i class="occupied"></i>Busy</span>
                    <span><i class="reserved"></i>Res.</span>
                    <span><i class="cleaning"></i>Clean</span>
                </div>
                <div class="pmd-qpos-table-grid" data-qpos-tables>
                    <button type="button" class="pmd-qpos-table pmd-qpos-pickup" data-qpos-pickup>
                        <strong>Pickup</strong>
                    </button>
                    @foreach($pmdInitialTables as $table)
                        @php
                            $pmdStatus = (string)($table['status'] ?? 'available');
                            $pmdCapacity = (int)($table['capacity'] ?? 0);
                        @endphp
                        <button
                            type="button"
                            class="pmd-qpos-table"
                            data-qpos-table="{{ $table['id'] ?? 0 }}"
                            data-status="{{ $pmdStatus }}"
                        >
                            <strong>{{ $table['number'] ?? ($table['id'] ?? '') }}</strong>
                            <small>{{ $pmdStatusLabels[$pmdStatus] ?? 'Free' }}@if($pmdCapacity > 0) · {{ $pmdCapacity }}s @endif</small>
                        </button>
                    @endforeach
                </div>
            </section>

            <div class="pmd-qpos-profile-dock">
                @if($pmdDashboardUrl)
                    <a class="pmd-qpos-back-button" href="{{ $pmdDashboardUrl }}">← Back</a>
                @endif
                <div class="pmd-qpos-profile">
                    <button
                        type="button"
                        class="pmd-qpos-profile-button"
                        data-qpos-profile-toggle
                        aria-expanded="false"
                    >
                        <span>{{ $pmdProfileInitial }}</span>
                        <strong>{{ $pmdProfileName }}</strong>
                    </button>
                    <div class="pmd-qpos-profile-menu" data-qpos-profile-menu hidden>
                        <div>
                            <strong>{{ $pmdProfileName }}</strong>
                            @if($pmdProfileRole)<small>{{ $pmdProfileRole }}</small>@endif
                        </div>
                        <a href="{{ $pmdLogoutUrl }}">Sign out</a>
                    </div>
                </div>
            </div>
        </aside>

        <section class="pmd-qpos-catalog">
            <div class="pmd-qpos-catalog-head">
                <label class="pmd-qpos-search">
                    <span>⌕</span>
                    <input type="search" autocomplete="off" placeholder="Search…" data-qpos-search>
                </label>

                <div class="pmd-qpos-work-meta">
                    <time class="pmd-qpos-clock" data-qpos-clock>{{ now()->format('H:i') }}</time>
                    <button type="button" class="pmd-qpos-history-button" data-qpos-history-open>History</button>
                </div>
            </div>

            <div class="pmd-qpos-categories" data-qpos-categories>
                <button type="button" class="is-active" data-category="all">All</button>
            </div>

            <div class="pmd-qpos-catalog-status" data-qpos-catalog-status>
                Select table
            </div>

            <div class="pmd-qpos-product-grid" data-qpos-products></div>
        </section>

        <aside class="pmd-qpos-cart">
            <div class="pmd-qpos-cart-head">
                <div>
                    <span class="pmd-qpos-section-label">Check</span>
                    <strong data-qpos-check-title>New</strong>
                </div>
                <button type="button" class="pmd-qpos-cart-close" data-qpos-cart-close aria-label="Close cart">×</button>
                <div class="pmd-qpos-guests">
                    <button type="button" data-qpos-guests-minus>−</button>
                    <span><b data-qpos-guests>1</b><small>pax</small></span>
                    <button type="button" data-qpos-guests-plus>+</button>
                </div>
            </div>

            <div class="pmd-qpos-open-checks" data-qpos-open-checks hidden></div>

            <div class="pmd-qpos-sent" data-qpos-sent hidden>
                <div class="pmd-qpos-subhead">
                    <strong>Sent</strong>
                    <span data-qpos-sent-total></span>
                </div>
                <div data-qpos-sent-items></div>
            </div>

            <div class="pmd-qpos-cart-list" data-qpos-cart-list>
                <div class="pmd-qpos-empty-cart">
                    <strong>No items</strong>
                </div>
            </div>

            <label class="pmd-qpos-order-note">
                <span>Note</span>
                <textarea rows="2" placeholder="Kitchen / allergy / request" data-qpos-note></textarea>
            </label>

            <div class="pmd-qpos-cart-summary">
                <div><span>New</span><strong data-qpos-new-total>€0.00</strong></div>
                <div class="grand"><span>Total</span><strong data-qpos-total>€0.00</strong></div>
            </div>

            <div class="pmd-qpos-cart-actions">
                <button type="button" class="primary" data-qpos-send>Send</button>
                <button type="button" class="pay" data-qpos-pay disabled>Pay</button>
            </div>

            <div class="pmd-qpos-table-actions" data-qpos-table-actions hidden>
                <button type="button" data-qpos-table-cleaning>Left</button>
                <button type="button" data-qpos-table-free>Free</button>
            </div>
        </aside>
    </main>

    <button type="button" class="pmd-qpos-mobile-cart" data-qpos-mobile-cart>
        <span><b data-qpos-mobile-count>0</b></span>
        <strong data-qpos-mobile-total>€0.00</strong>
    </button>

    <div class="pmd-qpos-modal" data-qpos-modifier-modal aria-hidden="true">
        <div class="pmd-qpos-modal-card pmd-qpos-modifier-card">
            <header>
                <div>
                    <span class="pmd-qpos-section-label">Item</span>
                    <h2 data-qpos-modifier-name>Product</h2>
                </div>
                <button type="button" class="pmd-qpos-modal-close" data-qpos-modifier-close>×</button>
            </header>
            <div class="pmd-qpos-modifier-body">
                <div class="pmd-qpos-modifier-meta" data-qpos-modifier-meta></div>
                <div data-qpos-modifier-options></div>
                <label class="pmd-qpos-field">
                    <span>Note</span>
                    <input type="text" data-qpos-modifier-note placeholder="No onions, medium, allergy…">
                </label>
            </div>
            <footer>
                <div class="pmd-qpos-modal-qty">
                    <button type="button" data-qpos-modifier-minus>−</button>
                    <strong data-qpos-modifier-qty>1</strong>
                    <button type="button" data-qpos-modifier-plus>+</button>
                </div>
                <button type="button" class="pmd-qpos-modal-primary" data-qpos-modifier-add>Add <span data-qpos-modifier-price></span></button>
            </footer>
        </div>
    </div>

    <div class="pmd-qpos-modal" data-qpos-payment-modal aria-hidden="true">
        <div class="pmd-qpos-modal-card pmd-qpos-payment-card">
            <header>
                <div>
                    <span class="pmd-qpos-section-label">Payment</span>
                    <h2 data-qpos-payment-title>Collect payment</h2>
                </div>
                <button type="button" class="pmd-qpos-modal-close" data-qpos-payment-close>×</button>
            </header>

            <div class="pmd-qpos-payment-body">
                <div class="pmd-qpos-payment-balance">
                    <span>Due</span>
                    <strong data-qpos-payment-remaining>€0.00</strong>
                    <small data-qpos-payment-settled></small>
                </div>

                <div class="pmd-qpos-payment-methods" data-qpos-payment-methods>
                    <button type="button" class="is-active" data-payment-method="cash">Cash</button>
                                    </div>

                <div class="pmd-qpos-payment-grid">
                    <label class="pmd-qpos-field">
                        <span>Pay</span>
                        <input
                            type="text"
                            inputmode="none"
                            autocomplete="off"
                            spellcheck="false"
                            data-qpos-payment-amount
                            data-qpos-keypad-target="amount"
                        >
                    </label>
                    <label class="pmd-qpos-field" data-qpos-cash-field>
                        <span>Cash</span>
                        <input
                            type="text"
                            inputmode="none"
                            autocomplete="off"
                            spellcheck="false"
                            data-qpos-cash-received
                            data-qpos-keypad-target="cash"
                        >
                    </label>
                </div>

                <div class="pmd-qpos-cash-presets" data-qpos-cash-presets>
                    <button type="button" data-cash-preset="exact">Exact</button>
                </div>

                <div class="pmd-qpos-split-row" data-qpos-split-row>
                    <span>Split</span>
                    <button type="button" class="is-active" data-qpos-split="1">Full</button>
                    <button type="button" data-qpos-split="2">1/2</button>
                    <button type="button" data-qpos-split="3">1/3</button>
                    <button type="button" data-qpos-split="4">1/4</button>
                    <button type="button" data-qpos-split="custom">Custom</button>
                </div>

                <section class="pmd-qpos-touch-keypad" data-qpos-touch-keypad>
                    <header>
                        <div>
                            <span data-qpos-touch-keypad-label>Payment amount</span>
                            <strong data-qpos-touch-keypad-value>€0.00</strong>
                        </div>
                        
                    </header>
                    <div class="pmd-qpos-touch-keypad-grid">
                        <button type="button" data-qpos-keypad-key="1">1</button>
                        <button type="button" data-qpos-keypad-key="2">2</button>
                        <button type="button" data-qpos-keypad-key="3">3</button>
                        <button type="button" class="utility" data-qpos-keypad-key="backspace" aria-label="Backspace">⌫</button>

                        <button type="button" data-qpos-keypad-key="4">4</button>
                        <button type="button" data-qpos-keypad-key="5">5</button>
                        <button type="button" data-qpos-keypad-key="6">6</button>
                        <button type="button" class="utility" data-qpos-keypad-key="clear">C</button>

                        <button type="button" data-qpos-keypad-key="7">7</button>
                        <button type="button" data-qpos-keypad-key="8">8</button>
                        <button type="button" data-qpos-keypad-key="9">9</button>
                        <button type="button" class="exact" data-qpos-keypad-key="exact" data-qpos-keypad-exact>Exact</button>

                        <button type="button" data-qpos-keypad-key="00">00</button>
                        <button type="button" data-qpos-keypad-key="0">0</button>
                        <button type="button" data-qpos-keypad-key=".">.</button>
                        <button type="button" class="done" data-qpos-keypad-key="done">Done</button>
                    </div>
                </section>

                <div class="pmd-qpos-tip-row">
                    <span>Tip</span>
                    <button type="button" class="is-active" data-tip="0">No tip</button>
                    <button type="button" data-tip="5">5%</button>
                    <button type="button" data-tip="10">10%</button>
                    <button type="button" data-tip="15">15%</button>
                    <label class="pmd-qpos-tip-custom">
                        <span>Custom</span>
                        <input
                            type="text"
                            inputmode="none"
                            autocomplete="off"
                            spellcheck="false"
                            placeholder="0.00"
                            data-qpos-tip-amount
                            data-qpos-keypad-target="tip"
                        >
                    </label>
                </div>

                <div class="pmd-qpos-terminals" data-qpos-terminals hidden>
                    <span class="pmd-qpos-section-label">Terminal</span>
                    <div data-qpos-terminal-list></div>
                </div>

                <div class="pmd-qpos-change" data-qpos-change hidden>
                    Change <strong data-qpos-change-amount>€0.00</strong>
                </div>

                <div class="pmd-qpos-payment-error" data-qpos-payment-error hidden></div>
            </div>

            <footer class="pmd-qpos-payment-footer">
                <div>
                    <span>Total</span>
                    <strong data-qpos-payment-charge>€0.00</strong>
                </div>
                <div class="pmd-qpos-payment-final-actions">
                    <a
                        class="pmd-qpos-receipt-link"
                        data-qpos-payment-receipt
                        href="#"
                        target="_blank"
                        rel="noopener"
                        hidden
                    >Receipt</a>
                    <button type="button" class="pmd-qpos-modal-primary" data-qpos-payment-submit>Record payment</button>
                </div>
            </footer>
        </div>
    </div>

    <div class="pmd-qpos-modal" data-qpos-history-modal aria-hidden="true">
        <div class="pmd-qpos-modal-card pmd-qpos-history-card">
            <header>
                <div>
                    <span class="pmd-qpos-section-label">History</span>
                    <h2 data-qpos-history-title>History</h2>
                </div>
                <button type="button" class="pmd-qpos-modal-close" data-qpos-history-close>×</button>
            </header>
            <div class="pmd-qpos-history-toolbar">
                <button type="button" class="is-active" data-qpos-history-scope="selected">Selected</button>
                <button type="button" data-qpos-history-scope="all">All</button>
            </div>
            <div class="pmd-qpos-history-list" data-qpos-history-list>
                <div class="pmd-qpos-history-empty">Loading…</div>
            </div>
        </div>
    </div>

    <div class="pmd-qpos-modal" data-qpos-item-note-modal aria-hidden="true">
        <div class="pmd-qpos-modal-card pmd-qpos-item-note-card">
            <header>
                <div>
                    <span class="pmd-qpos-section-label">Item note</span>
                    <h2 data-qpos-item-note-title>Item</h2>
                </div>
                <button type="button" class="pmd-qpos-modal-close" data-qpos-item-note-close>×</button>
            </header>
            <div class="pmd-qpos-item-note-body">
                <label class="pmd-qpos-field">
                    <span>Kitchen / allergy / request</span>
                    <input
                        type="text"
                        autocomplete="off"
                        spellcheck="false"
                        data-qpos-item-note-input
                        placeholder="No onions, allergy, medium…"
                    >
                </label>
            </div>
            <footer>
                <button type="button" class="pmd-qpos-note-clear" data-qpos-item-note-clear>Clear</button>
                <button type="button" class="pmd-qpos-modal-primary" data-qpos-item-note-save>Save note</button>
            </footer>
        </div>
    </div>

    <section class="pmd-qpos-text-keyboard" data-qpos-text-keyboard hidden aria-hidden="true">
        <header>
            <strong data-qpos-text-keyboard-label>Keyboard</strong>
            <button type="button" data-qpos-text-key="done">Done</button>
        </header>
        <div class="pmd-qpos-text-keyboard-row">
            @foreach(str_split('QWERTYUIOP') as $key)
                <button type="button" data-qpos-text-key="{{ $key }}">{{ $key }}</button>
            @endforeach
        </div>
        <div class="pmd-qpos-text-keyboard-row">
            @foreach(str_split('ASDFGHJKL') as $key)
                <button type="button" data-qpos-text-key="{{ $key }}">{{ $key }}</button>
            @endforeach
        </div>
        <div class="pmd-qpos-text-keyboard-row">
            <button type="button" class="wide" data-qpos-text-key="shift">ABC</button>
            @foreach(str_split('ZXCVBNM') as $key)
                <button type="button" data-qpos-text-key="{{ $key }}">{{ $key }}</button>
            @endforeach
            <button type="button" class="wide" data-qpos-text-key="backspace">⌫</button>
        </div>
        <div class="pmd-qpos-text-keyboard-row">
            <button type="button" data-qpos-text-key="-">-</button>
            <button type="button" data-qpos-text-key="/">/</button>
            <button type="button" data-qpos-text-key=",">,</button>
            <button type="button" data-qpos-text-key=".">.</button>
            <button type="button" class="space" data-qpos-text-key="space">Space</button>
            <button type="button" data-qpos-text-key="clear">Clear</button>
        </div>
    </section>

    <div class="pmd-qpos-toast" data-qpos-toast role="status"></div>
</div>

<script>
window.PMDQuickPOSConfig = {
    mode: @json($mode),
    canSwitchMode: @json((bool)$canSwitchMode),
    initialBootstrap: @json($initialBootstrap ?? null)
};
</script>
<script src="/app/admin/assets/js/pmd-quick-pos-v1.js?v=20260919-13"></script>
<script src="/app/admin/assets/js/pmd-site-access-hub-v13.js?v=20260919-qpos1"></script>
</body>
</html>
