@php
    $activeTab = $activeTab ? $activeTab : '#'.$tabs->section.'tab-1';
@endphp
<style>
    /* Move tabs navigation higher */
    .tab-heading {
        margin-top: -42px !important;
        margin-bottom: 0 !important;
    }
    
    /* Responsive tabs navigation */
    @media (max-width: 768px) {
        .tab-heading {
            margin-top: -25px !important;
        }
        
        .tab-heading .form-nav {
            flex-wrap: wrap;
            gap: 4px;
        }
        
        .tab-heading .nav-item {
            flex: 1 1 auto;
            min-width: 0;
        }
        
        .tab-heading .nav-link {
            font-size: 13px;
            padding: 8px 12px;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    }
    
    @media (max-width: 480px) {
        .tab-heading {
            margin-top: -20px !important;
        }
        
        .tab-heading .nav-link {
            font-size: 12px;
            padding: 6px 10px;
        }
    }
</style>
<div class="tab-heading">
    <ul class="form-nav nav nav-tabs">
        @foreach ($tabs as $name => $fields)
            <li class="nav-item">
                <a
                    class="nav-link{{ (('#'.$tabs->section.'tab-'.$loop->iteration) == $activeTab) ? ' active' : '' }}"
                    href="{{ '#'.$tabs->section.'tab-'.$loop->iteration }}"
                    data-bs-toggle="tab"
                >@lang($name)</a>
            </li>
        @endforeach
    </ul>
</div>

<div class="tab-content">
    @foreach ($tabs as $name => $fields)
        <div
            class="tab-pane {{ (('#'.$tabs->section.'tab-'.$loop->iteration) == $activeTab) ? 'active' : '' }}"
            id="{{ $tabs->section.'tab-'.$loop->iteration }}">
            <div class="form-fields">
                @if ($loop->iteration == 1)
                    {{-- PMD_ORDER_EDIT_V2_BASE_STYLE_MOVED_TO_ASSET --}}
                    
                    <div class="order-edit-pos-layout">
                        <!-- Bill Column - Larger for POS -->
                        <div class="pos-bill-column">
                            @isset($fields['order_menus'])
                                <div class="card bg-light shadow-sm order-bill-card">
                                    <div class="card-body">
                                        {!! $this->renderFieldElement($fields['order_menus']) !!}
                                    </div>
                                </div>
                            @endisset
                        </div>
                        
                        <!-- Combined Info Column - Invoice + Customer + Location All Together -->
                        <div class="pos-info-column">
                            <!-- Combined Card: Invoice + Customer + Location -->
                            <div class="card bg-light shadow-sm pos-combined-info-card">
                                <div class="card-body">
                                    <!-- Invoice/Order Details Section -->
                            @isset($fields['order_details'])
                                        <div class="pmd-order-section pmd-order-section-invoice">
                                            <h6 class="card-title mb-3" style="font-size: 14px; font-weight: 700; color: #364a63;">@lang($fields['order_details']->label ?? 'admin::lang.orders.label_invoice')</h6>
                                        {!! $this->renderFieldElement($fields['order_details']) !!}
                                    </div>
                                    @endisset
                                    
                                    <!-- Customer Section -->
                                    @isset($fields['customer'])
                                        <div class="pmd-order-section pmd-order-section-customer">
                                            {!! $this->renderFieldElement($fields['customer']) !!}
                                        </div>
                                    @endisset
                                    
                                    <!-- Location Section -->
                                    @isset($fields['location'])
                                        <div class="pmd-order-section pmd-order-section-location">
                                            <h6 class="card-title mb-3" style="font-size: 14px; font-weight: 700; color: #364a63;">@lang($fields['location']->label)</h6>
                                            {!! $this->renderFieldElement($fields['location']) !!}
                                </div>
                            @endisset
                        </div>
                            </div>
                            
                            <!-- PMD_ORDER_EDIT_CLEAN_CUSTOMER_NOTE_V1 -->
                            @php
                                $__pmdVisibleOrderCommentParts = collect(explode('|', (string)($formModel->comment ?? '')))
                                    ->map(static fn ($part) => trim($part))
                                    ->reject(static function ($part) {
                                        if ($part === '' || strcasecmp($part, 'Table Draft Basket') === 0) return true;
                                        if (preg_match('/^(Table ID|Table)\s*:/i', $part)) return true;
                                        return preg_match('/^\[(table_draft_id|submitted_by|guest_session|guest_session_id):/i', $part) === 1;
                                    })
                                    ->values();
                                $__pmdVisibleOrderComment = $__pmdVisibleOrderCommentParts->implode(' | ');
                            @endphp
                            @if($__pmdVisibleOrderComment !== '')
                                <div class="card bg-light shadow-sm pos-comment-card">
                                    <div class="card-body p-3">
                                        <h6 class="card-title mb-2">@lang('admin::lang.orders.label_comment')</h6>
                                        <p class="mb-0">{{ $__pmdVisibleOrderComment }}</p>
                                    </div>
                                </div>
                            @endif
                            @if($formModel->delivery_comment)
                                <div class="card bg-light shadow-sm pos-comment-card">
                                    <div class="card-body p-3">
                                        <h6 class="card-title mb-2">@lang('admin::lang.orders.label_delivery_comment')</h6>
                                        <p class="mb-0">{{ $formModel->delivery_comment }}</p>
                                    </div>
                                </div>
                            @endif
                        </div>
                    </div>
                    
                    {{-- PMD_ORDER_EDIT_V2_LEGACY_MOBILE_SCRIPT_REMOVED --}}

                @else
                    {!! $this->makePartial('form/form_fields', ['fields' => $fields]) !!}
                @endif
            </div>
        </div>
    @endforeach
</div>


<script>
(function() {
    function pmdHideImportedReady2OrderNotes() {
        var bodyText = document.body ? (document.body.innerText || '') : '';
        var isPosImport =
            bodyText.indexOf('ready2order') !== -1 ||
            bodyText.indexOf('Imported from ready2order') !== -1 ||
            bodyText.indexOf('r2o-invoice') !== -1;

        if (!isPosImport) return;

        document.querySelectorAll('.card, .card-body, .row, .col, .col-12, .col-md-6, .col-lg-4').forEach(function(el) {
            var txt = (el.innerText || '').trim();
            if (!txt) return;

            var hasNotesHeading =
                txt.indexOf('Notes') !== -1 ||
                txt.indexOf('Delivery Notes') !== -1;

            var hasImportPayload =
                txt.indexOf('Imported from ready2order') !== -1 ||
                txt.indexOf('ready2order') !== -1 ||
                txt.indexOf('r2o-invoice') !== -1;

            if (hasNotesHeading && hasImportPayload) {
                el.style.display = 'none';
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', pmdHideImportedReady2OrderNotes);
    } else {
        pmdHideImportedReady2OrderNotes();
    }

    setTimeout(pmdHideImportedReady2OrderNotes, 100);
    setTimeout(pmdHideImportedReady2OrderNotes, 500);
    setTimeout(pmdHideImportedReady2OrderNotes, 1200);

    const obs = new MutationObserver(pmdHideImportedReady2OrderNotes);
    obs.observe(document.body, {childList: true, subtree: true});

    document.addEventListener('ajaxUpdate', function() {
        setTimeout(pmdHideImportedReady2OrderNotes, 100);
    });
})();
</script>
