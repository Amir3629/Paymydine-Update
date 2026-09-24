<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="#064e3b">
    <title>PayMyDine POS</title>
    <link rel="icon" type="image/svg+xml" href="/app/admin/assets/images/pmd-favicon-final-20260822.svg">
    {{-- PMD_QPOS_EXACT_DASHBOARD_FLOOR_VIEW_V35B
         Reuse the live canonical Dashboard Floor visual stack. --}}
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-floor-v1.css?v=20260920-floor-v35b">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-floor-v1-stable-v11.css?v=20260920-floor-v35b">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-floor-v1-native-smart-v20.css?v=20260920-floor-v35b">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-reservations2-floor-canvas-v310.css?v=20260920-floor-v35b">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-reservations2-floor-toolbar-v316.css?v=20260920-floor-v35b">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-reservations2-floor-reservation-v312.css?v=20260920-floor-v35b">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-dashboard-lab-exact-floor-v1.css?v=20260920-floor-v35b">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-shared-floor-multi-floor-v1.css?v=20260920-floor-v35b">
    <link rel="stylesheet" href="/app/admin/assets/css/push-notifications.css?v=20260922-qpos-v59">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-quick-pos-v1.css?v=20260924-v103">
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
    // PMD_QPOS_FIRST_PAINT_PARITY_V77
    // Render the same catalogue data already present in the inline bootstrap so
    // refresh never paints an empty "All only" shell before Quick POS JS runs.
    $pmdInitialCategories = array_values(
        (array)($initialBootstrap['categories'] ?? [])
    );
    $pmdInitialMenu = array_values(
        (array)($initialBootstrap['menu_items'] ?? [])
    );
    $pmdInitialCurrency = (string)(
        $initialBootstrap['settings']['currency'] ?? '€'
    );
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
                <div class="pmd-qpos-floor-tabs" data-qpos-floors>
                    @foreach($pmdInitialFloors as $floor)
                        <button
                            type="button"
                            data-qpos-floor="{{ $floor['id'] ?? '' }}"
                            class="{{ (string)($floor['id'] ?? '') === $pmdInitialFloorId ? 'is-active' : '' }}"
                        >{{ $floor['name'] ?? 'Floor' }}</button>
                    @endforeach
                </div>

                <div class="pmd-qpos-floor-tools">
                    <button
                        type="button"
                        class="pmd-qpos-floor-map-open"
                        data-qpos-floor-map-open
                    >Map</button>

                    {{-- PMD_QPOS_GUIDE_POPOVER_V39
                         Keep the rail compact. The legend opens only when the
                         small info control is requested. --}}
                    <details class="pmd-qpos-guide-menu">
                        <summary
                            class="pmd-qpos-guide-toggle"
                            aria-label="Guide"
                            title="Guide"
                        >i</summary>

                        <div class="pmd-qpos-table-guide" aria-label="Table colors and icon guide">
                            <div class="pmd-qpos-table-guide-head">
                                <strong>Guide</strong>
                                <small>Table colors & icons</small>
                            </div>

                            <div class="pmd-qpos-table-guide-statuses">
                                <span><i class="free"></i>Free</span>
                                <span><i class="busy"></i>Busy</span>
                                <span><i class="reserved"></i>Reserved</span>
                                <span><i class="clean"></i>Clean</span>
                            </div>

                            <div class="pmd-qpos-table-guide-icons">
                                <span><b>!</b> Attention</span>
                                <span><b>½</b> Part paid</span>
                                <span><b>✓</b> Paid</span>
                            </div>
                        </div>
                    </details>
                </div>
            </section>

            <section class="pmd-qpos-tables">
                <div class="pmd-qpos-table-grid" data-qpos-tables>
                    <button type="button" class="pmd-qpos-table pmd-qpos-pickup" data-qpos-pickup>
                        <strong>Pickup</strong>
                    </button>
                    @foreach($pmdInitialTables as $table)
                        @php
                            // PMD_QPOS_TABLE_SERVER_MARKUP_SAFE_V59
                            // Keep the first server paint deliberately simple.
                            // JS is the authoritative renderer for attention/payment
                            // signals immediately after bootstrap.
                            $pmdStatus = (string)($table['status'] ?? 'available');
                            $pmdCapacity = max(0, (int)($table['capacity'] ?? 0));
                            $pmdPaymentState = (string)($table['payment_state'] ?? 'none');
                            $pmdWaiterCalls = max(0, (int)($table['waiter_calls'] ?? 0));
                            $pmdNoteCount = max(0, (int)($table['note_count'] ?? 0));
                            $pmdHasAttention = $pmdWaiterCalls > 0 || $pmdNoteCount > 0;
                            $pmdAttentionTitleV81 =
                                $pmdWaiterCalls > 0 && $pmdNoteCount > 0
                                    ? 'Waiter call + table note'
                                    : ($pmdWaiterCalls > 0 ? 'Waiter call' : 'Table note');
                        @endphp
                        <button
                            type="button"
                            class="pmd-qpos-table{{ $pmdHasAttention ? ' has-attention' : '' }}"
                            data-qpos-table="{{ $table['id'] ?? 0 }}"
                            data-status="{{ $pmdStatus }}"
                            data-payment-state="{{ $pmdPaymentState }}"
                            @if($pmdHasAttention)
                                data-qpos-attention="1"
                                data-qpos-attention-kind-default="attention"
                            @endif
                        >
                            <strong>{{ $table['number'] ?? ($table['id'] ?? '') }}</strong>
                            <small>{{ $pmdCapacity > 0 ? $pmdCapacity . 's' : '' }}</small>
                            @if($pmdHasAttention || in_array($pmdPaymentState, ['partial', 'paid'], true))
                                <span class="pmd-qpos-table-signals-v57">
                                    @if($pmdHasAttention)
                                        {{-- PMD_QPOS_UNIFIED_ATTENTION_ICON_V81 --}}
                                        <span
                                            class="pmd-qpos-table-signal is-attention-v81"
                                            data-qpos-attention-kind="attention"
                                            title="{{ $pmdAttentionTitleV81 }}"
                                            aria-label="Open attention"
                                        ><b>!</b></span>
                                    @endif
                                    @if($pmdPaymentState === 'partial')
                                        <span class="pmd-qpos-table-signal is-partial" title="Part paid" aria-label="Part paid"><b>½</b></span>
                                    @elseif($pmdPaymentState === 'paid')
                                        <span class="pmd-qpos-table-signal is-paid" title="Paid" aria-label="Paid"><b>✓</b></span>
                                    @endif
                                </span>
                            @endif
                        </button>
                    @endforeach
                </div>
            </section>

            {{-- PMD_QPOS_PROFILE_HISTORY_DOCK_V85
                 Keep the rail bottom focused: Profile on the left, History on the right.
                 Dashboard now belongs inside the profile menu. --}}
            <div class="pmd-qpos-profile-dock pmd-qpos-profile-dock-v85">
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
                        @if($pmdDashboardUrl)
                            <a
                                class="pmd-qpos-profile-dashboard-v85"
                                href="{{ $pmdDashboardUrl }}"
                            >Dashboard</a>
                        @endif
                        <a href="{{ $pmdLogoutUrl }}">Sign out</a>
                    </div>
                </div>

                <button
                    type="button"
                    class="pmd-qpos-history-button pmd-qpos-history-rail-button-v85"
                    data-qpos-history-open
                >History</button>
            </div>

            {{-- PMD_QPOS_HISTORY_RAIL_ACTIONS_V82
                 History replaces Back/Profile with scope + close controls. --}}
            <div class="pmd-qpos-history-rail-actions-v82" aria-label="History controls">
                <button
                    type="button"
                    class="pmd-qpos-history-all-v82"
                    data-qpos-history-scope="all"
                >All tables</button>
                <button
                    type="button"
                    class="pmd-qpos-history-close-v82"
                    data-qpos-history-close
                    aria-label="Close history"
                    title="Close history"
                >×</button>
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
                </div>
            </div>

            <div class="pmd-qpos-categories" data-qpos-categories>
                <button type="button" class="is-active" data-qpos-category="all">All</button>
                @foreach($pmdInitialCategories as $category)
                    @php
                        $pmdCategoryId = (string)($category['id'] ?? '');
                    @endphp
                    @if($pmdCategoryId !== '' && $pmdCategoryId !== 'all')
                        <button type="button" data-qpos-category="{{ $pmdCategoryId }}">{{ $category['name'] ?? 'Menu' }}</button>
                    @endif
                @endforeach
            </div>

            <div class="pmd-qpos-catalog-status" data-qpos-catalog-status>
                Select table
            </div>

            <div class="pmd-qpos-product-grid" data-qpos-products>
                @forelse($pmdInitialMenu as $item)
                    @php
                        $pmdItemId = (int)($item['id'] ?? 0);
                        $pmdPrice = (float)($item['price'] ?? 0);
                        $pmdOrderable =
                            ($item['orderable'] ?? true) !== false
                            && ($item['price_configured'] ?? true) !== false
                            && $pmdPrice > 0;
                        $pmdImage = trim((string)($item['image'] ?? ''));
                        $pmdPlaceholder =
                            $pmdImage === ''
                            || preg_match(
                                '~(?:^|/)paymydine-logo\.svg(?:$|[?#])~i',
                                $pmdImage
                            );
                        $pmdMenuNumber = (int)($item['menu_number'] ?? 0);
                        $pmdHasOptions = !empty($item['has_options']);
                    @endphp
                    <button
                        type="button"
                        class="pmd-qpos-product{{ $pmdOrderable ? '' : ' is-disabled' }}"
                        data-qpos-product="{{ $pmdItemId }}"
                        @if(!$pmdOrderable) disabled @endif
                    >
                        @if($pmdPlaceholder)
                            <div class="pmd-qpos-product-image is-placeholder is-inline-v72" aria-hidden="true">
                                <svg viewBox="0 0 428.72 420" focusable="false" aria-hidden="true">
                                    <path d="M242.42 38.65H45.83c8.89 34.02 37.63 60.01 73.1 64.85 3.93.54 7.94.82 12.02.82h111.47c46.54 0 84.28 37.73 84.28 84.28s-37.74 84.28-84.28 84.28h-67.53c-16.46 0-29.8 13.34-29.8 29.8v35.87h95.89c83.02 0 151.35-66.86 151.39-149.89.03-82.85-67.12-150.01-149.95-150.01Z"></path>
                                    <path d="M219.64 246.47v-25.53h-91.75c-6.1 0-11.05 4.95-11.05 11.05v88.72c0 4.08-.28 8.09-.82 12.02-4.84 35.47-30.83 64.21-64.85 73.1V209.24c0-1.3 0-2.58.01-3.84 1.73-25.71 21.8-46.39 47.24-49.07h11.14l110.08-.07v-25.53l58.55 57.87-58.55 57.87Z"></path>
                                </svg>
                            </div>
                        @else
                            <div
                                class="pmd-qpos-product-image"
                                style="background-image:url(&quot;{{ $pmdImage }}&quot;)"
                            ></div>
                        @endif

                        @if(!empty($item['is_bestseller']))
                            <span class="pmd-qpos-product-badge">Popular</span>
                        @endif

                        <span class="pmd-qpos-product-body">
                            <strong class="pmd-qpos-product-name">
                                @if($pmdMenuNumber > 0)
                                    <span class="pmd-qpos-product-number" aria-label="Food number {{ $pmdMenuNumber }}">{{ $pmdMenuNumber }}.</span>
                                @endif
                                <span>{{ $item['name'] ?? 'Item' }}</span>
                            </strong>
                            <span class="pmd-qpos-product-meta">
                                <span>{{ $pmdHasOptions ? 'Options' : '' }}</span>
                                <b>{{ $pmdOrderable ? $pmdInitialCurrency.number_format($pmdPrice, 2, '.', '') : 'No price' }}</b>
                            </span>
                        </span>
                    </button>
                @empty
                    <div class="pmd-qpos-no-products">No menu items match this filter.</div>
                @endforelse
            </div>
        </section>

        <aside class="pmd-qpos-cart">
            <div class="pmd-qpos-cart-head">
                <div>
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
                    <span class="pmd-qpos-sent-head-v72">
                        <button
                            type="button"
                            class="pmd-qpos-undo-v72"
                            data-qpos-sent-undo
                            hidden
                        >↶ Undo</button>
                        <span data-qpos-sent-total></span>
                    </span>
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
                {{-- PMD_QPOS_VAT_SUMMARY_VIEW_V74 --}}
                <div data-qpos-vat-row hidden>
                    <span data-qpos-vat-label>VAT</span>
                    <strong data-qpos-vat-total>€0.00</strong>
                </div>
                <div class="grand"><span>Total</span><strong data-qpos-total>€0.00</strong></div>
            </div>

            <div class="pmd-qpos-cart-actions">
                <button type="button" class="primary" data-qpos-send disabled>Send to Kitchen</button>
                <button type="button" class="pay" data-qpos-pay disabled>Pay</button>
            </div>

            {{-- PMD_QPOS_DIRECT_MOVE_SCOPE_CHOOSER_VIEW_V44
                 Compact scope picker only appears when the selected table has
                 multiple open checks. Destination selection still happens
                 directly from the left table rail. --}}
            <div
                id="pmd-qpos-move-scope-choice-v44"
                class="pmd-qpos-move-scope-choice"
                data-qpos-move-scope-choice
                role="menu"
                aria-label="Choose what to move"
                aria-hidden="true"
                hidden
            >
                <button
                    type="button"
                    role="menuitem"
                    data-qpos-direct-move-scope="order"
                >
                    <strong>This order</strong>
                    <small data-qpos-direct-move-order-meta>Current check</small>
                </button>
                <button
                    type="button"
                    role="menuitem"
                    data-qpos-direct-move-scope="table"
                >
                    <strong>Whole table</strong>
                    <small data-qpos-direct-move-table-meta>All checks</small>
                </button>
            </div>

            <div class="pmd-qpos-table-actions" data-qpos-table-actions hidden>
                <button type="button" data-qpos-table-cleaning>Cleaning</button>
                <button
                    type="button"
                    data-qpos-table-move
                    aria-haspopup="menu"
                    aria-controls="pmd-qpos-move-scope-choice-v44"
                    aria-expanded="false"
                >Move</button>
                <button type="button" data-qpos-table-free>Free</button>
            </div>
        </aside>
    </main>

    {{-- PMD_QPOS_EXACT_DASHBOARD_FLOOR_WORKSPACE_V35B
         Same live shared Floor partial as the main Dashboard Floor. --}}
    <section
        class="pmd-qpos-exact-floor-workspace"
        data-qpos-floor-map-workspace
        hidden
        aria-hidden="true"
    >
        <div class="pmd-qpos-exact-floor-host">
            @include('admin::_partials.pmd_dashboard_lab_exact_floor_v1', [
                'floorBootstrap' => (array)($pmdQuickPosExactFloor['bootstrap'] ?? []),
                'displayTables' => (array)($pmdQuickPosExactFloor['display_tables'] ?? []),
                'floorMode' => (string)($pmdQuickPosExactFloor['mode'] ?? 'full'),
                'floorZoom' => (float)($pmdQuickPosExactFloor['zoom'] ?? 1.0),
                'pmdCleanWorkspaceLocationId' => (int)($pmdQuickPosExactFloor['location_id'] ?? 0),
                'pmdCleanWorkspaceFloorRegistry' => (array)($pmdQuickPosExactFloor['registry'] ?? []),
                'pmdCleanWorkspaceFloorActive' => (array)($pmdQuickPosExactFloor['active'] ?? []),
                'pmdCleanWorkspaceFloorCookie' => (string)($pmdQuickPosExactFloor['cookie_name'] ?? ''),
                'pmdCleanWorkspaceFloorTableMap' => (array)($pmdQuickPosExactFloor['table_floor_map'] ?? []),
                'deferReservationBusy' => true,
            ])
        </div>

        <button
            type="button"
            class="pmd-r2-floor-tool-v316 pmd-qpos-exact-floor-return"
            data-qpos-floor-map-close
            aria-label="Back to POS"
            title="Back to POS"
        >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 18l-6-6 6-6"></path>
                <path d="M9 12h10"></path>
            </svg>
            <span>POS</span>
        </button>
    </section>

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

    <div class="pmd-qpos-modal pmd-qpos-workspace-modal" data-qpos-payment-modal aria-hidden="true">
        <div class="pmd-qpos-modal-card pmd-qpos-payment-card">
            <div class="pmd-qpos-payment-body">
                <section class="pmd-qpos-payment-main">
                    <div class="pmd-qpos-payment-inline-head">
                        <div>
                            <span class="pmd-qpos-section-label">Payment</span>
                            <strong data-qpos-payment-title>Collect payment</strong>
                        </div>
                        <button type="button" class="pmd-qpos-modal-close" data-qpos-payment-close aria-label="Close payment">×</button>
                    </div>

                    <div class="pmd-qpos-payment-balance">
                        <span>Due</span>
                        <strong data-qpos-payment-remaining>€0.00</strong>
                        <small data-qpos-payment-settled></small>
                    </div>

                    <div class="pmd-qpos-payment-methods" data-qpos-payment-methods>
                        <button type="button" class="is-active" data-payment-method="cash">Cash</button>
                    </div>

                    {{-- PMD_QPOS_CASH_FIRST_FIELD_V46
                         Cash received is intentionally first so the payment
                         screen opens ready for cashier entry. --}}
                    <div class="pmd-qpos-payment-grid">
                        <label class="pmd-qpos-field" data-qpos-cash-field>
                            <span>Cash received</span>
                            <input
                                type="text"
                                inputmode="none"
                                autocomplete="off"
                                spellcheck="false"
                                data-qpos-cash-received
                                data-qpos-keypad-target="cash"
                            >
                        </label>
                        <label class="pmd-qpos-field">
                            <span>Pay now</span>
                            <input
                                type="text"
                                inputmode="none"
                                autocomplete="off"
                                spellcheck="false"
                                data-qpos-payment-amount
                                data-qpos-keypad-target="amount"
                            >
                        </label>
                    </div>

                    <div class="pmd-qpos-cash-presets" data-qpos-cash-presets>
                        <button type="button" data-cash-preset="exact">Exact</button>
                    </div>

                    <section class="pmd-qpos-split-panel" data-qpos-split-row>
                        <header>
                            <div>
                                <span class="pmd-qpos-section-label">Split bill</span>
                                <strong data-qpos-split-summary>Pay full bill</strong>
                            </div>
                        </header>

                        <div class="pmd-qpos-split-modes">
                            <button type="button" class="is-active" data-qpos-split-mode="full">
                                <b>Full bill</b><small>Everything</small>
                            </button>
                            <button type="button" data-qpos-split-mode="equal">
                                <b>Split equally</b><small>By people</small>
                            </button>
                            <button type="button" data-qpos-split-mode="items">
                                <b>By items</b><small>Choose dishes</small>
                            </button>
                            <button type="button" data-qpos-split-mode="shares">
                                <b>By shares</b><small>% or amount</small>
                            </button>
                        </div>

                        <div class="pmd-qpos-split-detail pmd-qpos-split-equal" data-qpos-split-equal hidden>
                            <div>
                                <span>People</span>
                                <div class="pmd-qpos-split-stepper">
                                    <button type="button" data-qpos-split-people-minus aria-label="Remove person">−</button>
                                    <strong data-qpos-split-people>2</strong>
                                    <button type="button" data-qpos-split-people-plus aria-label="Add person">+</button>
                                </div>
                            </div>
                            <div class="pmd-qpos-split-each">
                                <span>Collect now</span>
                                <strong data-qpos-split-each>€0.00</strong>
                            </div>
                        </div>

                        <div class="pmd-qpos-split-detail pmd-qpos-split-items" data-qpos-split-items hidden>
                            <div class="pmd-qpos-split-items-head">
                                <span>Choose unpaid items for this payer</span>
                                <strong data-qpos-split-items-total>€0.00</strong>
                            </div>
                            <div class="pmd-qpos-split-items-list" data-qpos-split-items-list></div>
                        </div>

                        <div class="pmd-qpos-split-detail pmd-qpos-split-shares" data-qpos-split-shares hidden>
                            <div class="pmd-qpos-share-presets">
                                <button type="button" data-qpos-share-preset="25">25%</button>
                                <button type="button" data-qpos-share-preset="33.33">⅓</button>
                                <button type="button" class="is-active" data-qpos-share-preset="50">50%</button>
                                <button type="button" data-qpos-share-preset="75">75%</button>
                            </div>
                            <label class="pmd-qpos-share-custom">
                                <span>Share %</span>
                                <input
                                    type="text"
                                    inputmode="none"
                                    autocomplete="off"
                                    spellcheck="false"
                                    value="50"
                                    data-qpos-share-percent
                                    data-qpos-keypad-target="share"
                                >
                            </label>
                            <div class="pmd-qpos-split-each">
                                <span>Collect now</span>
                                <strong data-qpos-share-amount>€0.00</strong>
                            </div>
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

                    {{-- PMD_QPOS_TERMINAL_TIP_DISPLAY_V46
                         Terminal tips are read-only here. The customer chooses
                         the tip on the physical terminal. --}}
                    <div class="pmd-qpos-terminal-tip" data-qpos-terminal-tip hidden>
                        <span>Terminal tip</span>
                        <strong data-qpos-terminal-tip-amount>€0.00</strong>
                    </div>

                    <div class="pmd-qpos-change" data-qpos-change hidden>
                        Change <strong data-qpos-change-amount>€0.00</strong>
                    </div>

                    <div class="pmd-qpos-payment-error" data-qpos-payment-error hidden></div>
                </section>

                <aside class="pmd-qpos-payment-keypad-column">
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
                            {{-- PMD_QPOS_KEYPAD_NEXT_FIELD_V46 --}}
                            <button
                                type="button"
                                class="next-field"
                                data-qpos-keypad-key="next"
                                data-qpos-keypad-next
                                aria-label="Next field"
                                title="Next field"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M5 12h12m-5-5 5 5-5 5"></path>
                                </svg>
                            </button>

                            <button type="button" data-qpos-keypad-key="00">00</button>
                            <button type="button" data-qpos-keypad-key="0">0</button>
                            <button type="button" data-qpos-keypad-key=".">.</button>
                            <button type="button" class="done pmd-qpos-keypad-pay" data-qpos-payment-submit>Record payment</button>
                        </div>
                    </section>
                </aside>
            </div>

        </div>
    </div>

    <div class="pmd-qpos-modal pmd-qpos-workspace-modal" data-qpos-history-modal aria-hidden="true">
        {{-- PMD_QPOS_HISTORY_CARD_SHELL_V84
             History mirrors the live POS: left card | large middle card | table rail. --}}
        <div class="pmd-qpos-modal-card pmd-qpos-history-card pmd-qpos-history-shell-v84">
            <section class="pmd-qpos-history-master-v82 pmd-qpos-history-left-card-v84">
                <header class="pmd-qpos-history-left-head-v84">
                    <span class="pmd-qpos-section-label">History</span>
                    <h2 data-qpos-history-title>History</h2>
                </header>

                <div class="pmd-qpos-history-kind-tabs-v82">
                    <button type="button" class="is-active" data-qpos-history-kind="orders">Orders</button>
                    <button type="button" data-qpos-history-kind="payments">Payments</button>
                    <button type="button" data-qpos-history-kind="notes">Notes</button>
                    <button type="button" data-qpos-history-kind="calls">Call</button>
                </div>

                <div class="pmd-qpos-history-list" data-qpos-history-list>
                    <div class="pmd-qpos-history-empty">Loading…</div>
                </div>

                {{-- PMD_QPOS_HISTORY_RANGE_DOCK_V84
                     Date range behaves like the bottom action dock of Check. --}}
                <div class="pmd-qpos-history-range pmd-qpos-history-range-v84">
                    <div class="pmd-qpos-history-presets">
                        <button type="button" class="is-today-v84" data-qpos-history-preset="today">Today</button>
                        <button type="button" class="is-active is-week-v84" data-qpos-history-preset="7d">7 days</button>
                        <button type="button" class="is-month-v84" data-qpos-history-preset="30d">30 days</button>
                        <button type="button" class="is-all-v84" data-qpos-history-preset="all">All time</button>
                    </div>

                    {{-- PMD_QPOS_HISTORY_DATES_V85
                         No From/To captions; the arrow makes the range direction obvious. --}}
                    <div class="pmd-qpos-history-dates-v84 pmd-qpos-history-dates-v85">
                        <label aria-label="History start date">
                            <input
                                type="date"
                                aria-label="History start date"
                                data-qpos-history-from
                            >
                        </label>
                        <span
                            class="pmd-qpos-history-date-arrow-v85"
                            aria-hidden="true"
                        >→</span>
                        <label aria-label="History end date">
                            <input
                                type="date"
                                aria-label="History end date"
                                data-qpos-history-to
                            >
                        </label>
                    </div>
                </div>
            </section>

            <section class="pmd-qpos-history-center-card-v84">
                {{-- PMD_QPOS_HISTORY_WORKBAR_V84
                     Same placement/language as Search + Clock in the live catalogue. --}}
                <header class="pmd-qpos-history-workbar-v84">
                    <label class="pmd-qpos-search pmd-qpos-history-search-v84">
                        <span>⌕</span>
                        <input
                            type="search"
                            autocomplete="off"
                            placeholder="Search history…"
                            data-qpos-history-search
                        >
                    </label>

                    <time
                        class="pmd-qpos-clock pmd-qpos-history-clock-v84"
                        data-qpos-history-clock
                    >{{ now()->format('H:i') }}</time>
                </header>

                <aside class="pmd-qpos-history-detail" data-qpos-history-detail>
                    <div class="pmd-qpos-history-empty">
                        Select an order to see invoice, items, payments and notes.
                    </div>
                </aside>
            </section>
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

    {{-- PMD_QPOS_TRANSFER_V25
         Full workspace instead of another floating card. --}}
    <div class="pmd-qpos-modal pmd-qpos-workspace-modal pmd-qpos-transfer-workspace" data-qpos-transfer-modal aria-hidden="true">
        <div class="pmd-qpos-modal-card pmd-qpos-transfer-card">
            <div class="pmd-qpos-transfer-topbar">
                <div>
                    <span class="pmd-qpos-section-label">Move</span>
                    <strong data-qpos-transfer-title>Table</strong>
                </div>
                <button type="button" class="pmd-qpos-modal-close" data-qpos-transfer-close aria-label="Close move">×</button>
            </div>

            <div class="pmd-qpos-transfer-body">
                <div class="pmd-qpos-transfer-scope">
                    <button type="button" data-qpos-transfer-scope="order">
                        <strong>Order only</strong>
                        <span data-qpos-transfer-order-label>Order</span>
                    </button>
                    <button type="button" data-qpos-transfer-scope="table">
                        <strong>Whole table</strong>
                        <span data-qpos-transfer-table-count>All orders</span>
                    </button>
                </div>

                <div class="pmd-qpos-transfer-heading">
                    <strong>Move to</strong>
                    <span data-qpos-transfer-selection>Choose table</span>
                </div>

                <div class="pmd-qpos-transfer-tables" data-qpos-transfer-tables></div>
            </div>

            <footer>
                <button type="button" class="pmd-qpos-modal-primary" data-qpos-transfer-submit disabled>Move</button>
            </footer>
        </div>
    </div>

    <div class="pmd-qpos-modal pmd-qpos-confirm-modal" data-qpos-confirm-modal aria-hidden="true">
        <div class="pmd-qpos-modal-card pmd-qpos-confirm-card" role="dialog" aria-modal="true" aria-labelledby="pmd-qpos-confirm-title">
            <div class="pmd-qpos-confirm-icon" data-qpos-confirm-icon>!</div>
            <div class="pmd-qpos-confirm-copy">
                <span class="pmd-qpos-section-label">Confirm</span>
                <h2 id="pmd-qpos-confirm-title" data-qpos-confirm-title>Confirm action</h2>
                <p data-qpos-confirm-message></p>
            </div>
            <footer>
                <button type="button" class="pmd-qpos-confirm-cancel" data-qpos-confirm-cancel>Cancel</button>
                <button type="button" class="pmd-qpos-confirm-accept" data-qpos-confirm-accept>Confirm</button>
            </footer>
        </div>
    </div>

    <section class="pmd-qpos-text-keyboard" data-qpos-text-keyboard hidden aria-hidden="true">
        <header>
            <strong data-qpos-text-keyboard-label>Keyboard</strong>
            <button type="button" data-qpos-text-key="hide">Hide</button>
        </header>
        <div class="pmd-qpos-text-keyboard-row">
            @foreach(str_split('1234567890') as $key)
                <button type="button" data-qpos-text-key="{{ $key }}">{{ $key }}</button>
            @endforeach
        </div>
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
    initialBootstrap: @json($initialBootstrap ?? null)
};
</script>
{{-- PMD_QPOS_RESERVATION_BUSY_INLINE_OVERRIDE_V54
     The shared Floor partial is root-owned on production. Do not patch it.
     Override only this Quick POS instance before the Floor runtime mounts. --}}
<script>
(function () {
    var floorRoot = document.getElementById('pmd-r2-shared-floor-canvas-v310');
    if (!floorRoot) return;
    floorRoot.setAttribute(
        'data-pmd-reservation-busy-url',
        '/admin/pos/reservation-busy'
    );
})();
</script>
{{-- Canonical Floor runtime mounts after the Quick POS endpoint override. --}}
<script src="/app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js?v=20260920-floor-v35b"></script>
<script src="/app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js?v=20260920-floor-v35b"></script>
{{-- PMD_QPOS_PUSH_NOTIFICATIONS_V57
     Reuse the canonical Admin push stream for immediate notifications.
     V73 also runs one lean operational-state heartbeat for table/KDS sync. --}}
<script src="/app/admin/assets/js/push-notifications.js?v=20260922-qpos-v59"></script>
{{-- PMD_QPOS_OFFLINE_COMPLETE_CACHE_BUSTER_V94 --}}
<script src="/app/admin/assets/js/pmd-quick-pos-v1.js?v=20260924-v103"></script>
<script src="/app/admin/assets/js/pmd-site-access-hub-v13.js?v=20260921-androidpair-v16"></script>
</body>
</html>
