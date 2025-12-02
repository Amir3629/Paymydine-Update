@php
    $activeTab = $activeTab ? $activeTab : '#'.$tabs->section.'tab-1';
@endphp
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
                    <style>
                        /* POS-Friendly Layout - Larger Bill, Combined Info - Side by Side */
                        .order-edit-pos-layout {
                            display: flex !important;
                            flex-direction: row !important;
                            gap: 16px;
                            margin: 0;
                            width: 100%;
                            align-items: flex-start;
                        }
                        
                        .order-edit-pos-layout .pos-bill-column {
                            flex: 0 0 60% !important;
                            max-width: 60% !important;
                            width: 60% !important;
                            padding: 0 8px;
                            display: block !important;
                        }
                        
                        .order-edit-pos-layout .pos-info-column {
                            flex: 0 0 40% !important;
                            max-width: 40% !important;
                            width: 40% !important;
                            padding: 0 8px;
                            display: block !important;
                        }
                        
                        /* Bill Card - Larger for POS */
                        .order-bill-card {
                            margin-bottom: 16px !important;
                            border-radius: 12px !important;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
                            border: 2px solid #e5e9f2 !important;
                        }
                        
                        .order-bill-card .card-body {
                            padding: 20px !important;
                        }
                        
                        /* Combined Info Card - Invoice + Customer + Location */
                        .pos-combined-info-card {
                            margin-bottom: 16px !important;
                            border-radius: 12px !important;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
                            border: 2px solid #e5e9f2 !important;
                        }
                        
                        .pos-combined-info-card .card-body {
                            padding: 20px !important;
                        }
                        
                        /* Remove separate location card styles since it's now combined */
                        .pos-location-card {
                            display: none;
                        }
                        
                        /* Section separators in combined card */
                        .pos-combined-info-card .customer-card-content {
                            margin: 0;
                            padding: 0;
                        }
                        
                        .pos-combined-info-card .customer-card-title {
                            font-size: 16px !important;
                            font-weight: 700 !important;
                            margin-bottom: 12px !important;
                            color: #364a63 !important;
                        }
                        
                        /* Location section styling in combined card */
                        .pos-combined-info-card .card-title {
                            font-size: 16px !important;
                            font-weight: 700 !important;
                            color: #364a63 !important;
                        }
                        
                        /* Touch-Friendly Sizing */
                        .order-bill-table {
                            font-size: 15px !important;
                        }
                        
                        .order-bill-table thead th {
                            font-size: 13px !important;
                            padding: 10px 6px !important;
                        }
                        
                        .order-bill-table tbody td {
                            padding: 10px 6px !important;
                        }
                        
                        .order-bill-item-name {
                            font-size: 15px !important;
                            font-weight: 600 !important;
                        }
                        
                        .qty-btn {
                            width: 36px !important;
                            height: 36px !important;
                            font-size: 14px !important;
                        }
                        
                        .qty-display {
                            font-size: 16px !important;
                            min-width: 40px !important;
                        }
                        
                        .btn-add-item {
                            padding: 14px 32px !important;
                            font-size: 16px !important;
                            min-height: 48px !important;
                        }
                        
                        .total-value {
                            font-size: 16px !important;
                        }
                        
                        .final-total .total-value {
                            font-size: 20px !important;
                            font-weight: 700 !important;
                        }
                        
                        /* Info Cards - Touch Friendly */
                        .order-details-table {
                            font-size: 14px !important;
                        }
                        
                        .order-details-table td {
                            padding: 10px 6px !important;
                            font-size: 14px !important;
                        }
                        
                        .customer-card-title {
                            font-size: 16px !important;
                            font-weight: 700 !important;
                            margin-bottom: 12px !important;
                        }
                        
                        .customer-info {
                            font-size: 15px !important;
                            padding: 10px 0 !important;
                        }
                        
                        .editable-value {
                            font-size: 15px !important;
                        }
                        
                        .btn-edit-inline {
                            width: 32px !important;
                            height: 32px !important;
                            font-size: 14px !important;
                        }
                        
                        .editable-input {
                            font-size: 15px !important;
                            padding: 8px 10px !important;
                            height: 40px !important;
                        }
                        
                        .btn-save-inline,
                        .btn-cancel-inline {
                            width: 36px !important;
                            height: 36px !important;
                            font-size: 12px !important;
                        }
                        
                        /* Location Card */
                        .pos-location-card {
                            margin-bottom: 16px !important;
                            border-radius: 12px !important;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
                            border: 2px solid #e5e9f2 !important;
                        }
                        
                        .pos-location-card .card-body {
                            padding: 18px !important;
                        }
                        
                        .pos-location-card .card-title {
                            font-size: 14px !important;
                            font-weight: 700 !important;
                            margin-bottom: 10px !important;
                        }
                        
                        .pos-location-card p {
                            font-size: 15px !important;
                        }
                        
                        /* Comment Cards */
                        .pos-comment-card {
                            margin-bottom: 12px !important;
                            border-radius: 10px !important;
                            border: 1px solid #e5e9f2 !important;
                        }
                        
                        .pos-comment-card .card-title {
                            font-size: 13px !important;
                            font-weight: 600 !important;
                        }
                        
                        .pos-comment-card p {
                            font-size: 13px !important;
                            line-height: 1.5 !important;
                        }
                        
                        /* Force side-by-side layout - only stack on very small screens */
                        @media (max-width: 768px) {
                            .order-edit-pos-layout {
                                flex-direction: column !important;
                            }
                            
                            .order-edit-pos-layout .pos-bill-column,
                            .order-edit-pos-layout .pos-info-column {
                                flex: 0 0 100% !important;
                                max-width: 100% !important;
                                width: 100% !important;
                            }
                        }
                        
                        /* Ensure parent container allows flex */
                        .form-fields {
                            width: 100% !important;
                            display: block !important;
                        }
                        
                        .order-edit-pos-layout {
                            box-sizing: border-box;
                            display: flex !important;
                            flex-direction: row !important;
                            flex-wrap: nowrap !important;
                        }
                        
                        /* Override any Bootstrap row styles */
                        .order-edit-pos-layout.row {
                            margin-left: 0 !important;
                            margin-right: 0 !important;
                        }
                        
                        .order-edit-pos-layout.row > * {
                            padding-left: 0 !important;
                            padding-right: 0 !important;
                        }
                    </style>
                    <div class="order-edit-pos-layout" style="display: flex !important; flex-direction: row !important; width: 100% !important;">
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
                                        <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 2px solid #e5e9f2;">
                                            {!! $this->renderFieldElement($fields['order_details']) !!}
                                        </div>
                                    @endisset
                                    
                                    <!-- Customer Section -->
                                    @isset($fields['customer'])
                                        <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 2px solid #e5e9f2;">
                                            {!! $this->renderFieldElement($fields['customer']) !!}
                                        </div>
                                    @endisset
                                    
                                    <!-- Location Section -->
                                    @isset($fields['location'])
                                        <div style="margin-bottom: 0;">
                                            <h6 class="card-title mb-3" style="font-size: 14px; font-weight: 700; color: #364a63;">@lang($fields['location']->label)</h6>
                                            {!! $this->renderFieldElement($fields['location']) !!}
                                        </div>
                                    @endisset
                                </div>
                            </div>
                            
                            <!-- Comment Cards -->
                            @if($formModel->comment)
                                <div class="card bg-light shadow-sm pos-comment-card">
                                    <div class="card-body p-3">
                                        <h6 class="card-title mb-2">@lang('admin::lang.orders.label_comment')</h6>
                                        <p class="mb-0">{{ $formModel->comment }}</p>
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
                @else
                    {!! $this->makePartial('form/form_fields', ['fields' => $fields]) !!}
                @endif
            </div>
        </div>
    @endforeach
</div>
