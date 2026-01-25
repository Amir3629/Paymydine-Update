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
                            padding: 0 8px 0 0;
                            display: block !important;
                        }
                        
                        /* Bill Card - Larger for POS */
                        .order-bill-card {
                            margin-bottom: 16px !important;
                            border-radius: 12px !important;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
                            border: 2px solid #e5e9f2 !important;
                            overflow: hidden !important;
                            width: 100% !important;
                        }
                        
                        .order-bill-card .card-body {
                            padding: 20px !important;
                            overflow-x: auto !important;
                            -webkit-overflow-scrolling: touch !important;
                        }
                        
                        /* Responsive table wrapper */
                        .order-bill-card table {
                            width: 100% !important;
                            min-width: 100% !important;
                            table-layout: auto !important;
                        }
                        
                        /* Combined Info Card - Invoice + Customer + Location */
                        .pos-combined-info-card {
                            margin-bottom: 16px !important;
                            margin-left: -8px !important;
                            border-radius: 12px !important;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
                            border: 2px solid #e5e9f2 !important;
                            overflow: visible !important;
                            width: 100% !important;
                            display: block !important;
                            visibility: visible !important;
                            opacity: 1 !important;
                        }
                        
                        .pos-combined-info-card .card-body {
                            padding: 20px 20px 20px 16px !important;
                            overflow: visible !important;
                            width: 100% !important;
                            max-width: 100% !important;
                            display: block !important;
                            visibility: visible !important;
                            opacity: 1 !important;
                        }
                        
                        /* Ensure all sections inside combined card are visible */
                        .pos-combined-info-card .card-body > div {
                            display: block !important;
                            visibility: visible !important;
                            opacity: 1 !important;
                            width: 100% !important;
                            overflow: visible !important;
                        }
                        
                        /* Ensure tables in info card are responsive */
                        .pos-combined-info-card table {
                            width: 100% !important;
                            min-width: 100% !important;
                            table-layout: auto !important;
                            display: table !important;
                            visibility: visible !important;
                            opacity: 1 !important;
                        }
                        
                        .pos-combined-info-card table tbody {
                            display: table-row-group !important;
                            visibility: visible !important;
                        }
                        
                        .pos-combined-info-card table tr {
                            display: table-row !important;
                            visibility: visible !important;
                        }
                        
                        .pos-combined-info-card table td {
                            display: table-cell !important;
                            visibility: visible !important;
                        }
                        
                        /* Touch-friendly button targets */
                        .qty-btn,
                        .btn-add-item,
                        .btn-edit-inline,
                        .btn-save-inline,
                        .btn-cancel-inline {
                            touch-action: manipulation !important;
                            -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1) !important;
                            cursor: pointer !important;
                        }
                        
                        /* Ensure minimum touch targets on mobile */
                        @media (max-width: 768px) {
                            .qty-btn {
                                min-width: 36px !important;
                                min-height: 36px !important;
                            }
                            
                            .btn-add-item {
                                min-width: 44px !important;
                                min-height: 44px !important;
                            }
                            
                            .btn-edit-inline,
                            .btn-save-inline,
                            .btn-cancel-inline {
                                min-width: 36px !important;
                                min-height: 36px !important;
                            }
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
                        
                        /* Responsive Design - All Device Sizes */
                        
                        /* Tablet and below - Stack columns */
                        @media (max-width: 992px) {
                            .order-edit-pos-layout {
                                flex-direction: column !important;
                                gap: 12px !important;
                                display: flex !important;
                            }
                            
                            .order-edit-pos-layout .pos-bill-column {
                                order: 1 !important;
                                flex: 0 0 100% !important;
                                max-width: 100% !important;
                                width: 100% !important;
                                padding: 0 4px !important;
                            }
                            
                            .order-edit-pos-layout .pos-info-column {
                                order: 2 !important;
                                flex: 0 0 100% !important;
                                max-width: 100% !important;
                                width: 100% !important;
                                padding: 0 4px !important;
                            }
                            
                            .order-bill-card,
                            .pos-combined-info-card {
                                margin-bottom: 12px !important;
                                display: block !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                            }
                            
                            .order-bill-card .card-body,
                            .pos-combined-info-card .card-body {
                                padding: 16px !important;
                                display: block !important;
                                visibility: visible !important;
                            }
                            
                            /* Ensure invoice section is visible */
                            .pos-combined-info-card .card-body > div:first-child {
                                display: block !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                            }
                            
                            .order-details-table {
                                display: table !important;
                                visibility: visible !important;
                                width: 100% !important;
                            }
                        }
                        
                        /* Mobile devices */
                        @media (max-width: 768px) {
                            .order-edit-pos-layout {
                                gap: 10px !important;
                                flex-direction: column !important;
                                display: flex !important;
                                flex-wrap: nowrap !important;
                            }
                            
                            /* Ensure columns stack properly */
                            .order-edit-pos-layout .pos-bill-column {
                                order: 1 !important;
                                width: 100% !important;
                                max-width: 100% !important;
                                flex: 0 0 auto !important;
                                padding: 0 4px !important;
                                display: block !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                                height: auto !important;
                                min-height: auto !important;
                                overflow: visible !important;
                                position: relative !important;
                                z-index: 1 !important;
                            }
                            
                            /* CRITICAL: Force second column to be visible on mobile */
                            .order-edit-pos-layout .pos-info-column {
                                order: 2 !important;
                                width: 100% !important;
                                max-width: 100% !important;
                                flex: 0 0 auto !important;
                                padding: 0 4px !important;
                                display: block !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                                height: auto !important;
                                min-height: auto !important;
                                max-height: none !important;
                                overflow: visible !important;
                                position: relative !important;
                                z-index: 2 !important;
                                margin-top: 10px !important;
                                margin-bottom: 10px !important;
                                clear: both !important;
                            }
                            
                            /* Force remove any display:none or visibility:hidden */
                            .pos-info-column,
                            .pos-info-column * {
                                display: block !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                            }
                            
                            /* Force combined card to be visible */
                            .pos-info-column .pos-combined-info-card {
                                display: block !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                                width: 100% !important;
                                max-width: 100% !important;
                                height: auto !important;
                                min-height: 100px !important;
                                max-height: none !important;
                                overflow: visible !important;
                                position: relative !important;
                                z-index: 1 !important;
                                margin: 0 !important;
                                padding: 0 !important;
                            }
                            
                            .order-bill-card .card-body,
                            .pos-combined-info-card .card-body {
                                padding: 12px !important;
                            }
                            
                            /* Ensure combined card is visible */
                            .pos-combined-info-card {
                                display: block !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                                width: 100% !important;
                                max-width: 100% !important;
                                margin-bottom: 16px !important;
                            }
                            
                            /* Ensure all sections inside combined card are visible */
                            .pos-combined-info-card .card-body {
                                display: block !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                                width: 100% !important;
                            }
                            
                            .pos-combined-info-card .card-body > div {
                                display: block !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                                width: 100% !important;
                                margin-bottom: 16px !important;
                                padding-bottom: 16px !important;
                            }
                            
                            /* Ensure invoice/order details table is visible */
                            .order-details-table {
                                display: table !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                                width: 100% !important;
                                font-size: 12px !important;
                            }
                            
                            .order-details-table tbody {
                                display: table-row-group !important;
                                visibility: visible !important;
                            }
                            
                            .order-details-table tr {
                                display: table-row !important;
                                visibility: visible !important;
                            }
                            
                            .order-details-table td {
                                display: table-cell !important;
                                visibility: visible !important;
                                padding: 8px 4px !important;
                                font-size: 12px !important;
                                word-wrap: break-word !important;
                                overflow-wrap: break-word !important;
                            }
                            
                            /* Adjust table font sizes for mobile */
                            .order-bill-table {
                                font-size: 13px !important;
                            }
                            
                            .order-bill-table thead th {
                                font-size: 11px !important;
                                padding: 8px 4px !important;
                            }
                            
                            .order-bill-table tbody td {
                                padding: 8px 4px !important;
                                font-size: 13px !important;
                            }
                            
                            .order-bill-item-name {
                                font-size: 13px !important;
                            }
                            
                            /* Adjust button sizes */
                            .qty-btn {
                                width: 32px !important;
                                height: 32px !important;
                                font-size: 12px !important;
                            }
                            
                            .qty-display {
                                font-size: 14px !important;
                                min-width: 36px !important;
                            }
                            
                            .btn-add-item {
                                padding: 12px 24px !important;
                                font-size: 14px !important;
                                min-height: 44px !important;
                                width: 100% !important;
                            }
                            
                            .total-value {
                                font-size: 14px !important;
                            }
                            
                            .final-total .total-value {
                                font-size: 18px !important;
                            }
                            
                            .customer-card-title {
                                font-size: 14px !important;
                            }
                            
                            .customer-info {
                                font-size: 13px !important;
                            }
                            
                            .editable-value {
                                font-size: 13px !important;
                            }
                            
                            .btn-edit-inline {
                                width: 28px !important;
                                height: 28px !important;
                                font-size: 12px !important;
                            }
                            
                            .editable-input {
                                font-size: 13px !important;
                                padding: 6px 8px !important;
                                height: 36px !important;
                            }
                            
                            .pos-combined-info-card .card-title {
                                font-size: 14px !important;
                            }
                            
                            .pos-comment-card .card-title {
                                font-size: 12px !important;
                            }
                            
                            .pos-comment-card p {
                                font-size: 12px !important;
                            }
                        }
                        
                        /* Small mobile devices */
                        @media (max-width: 480px) {
                            .order-bill-card .card-body,
                            .pos-combined-info-card .card-body {
                                padding: 10px !important;
                            }
                            
                            /* Ensure combined card is visible on small mobile */
                            .pos-combined-info-card {
                                display: block !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                                width: 100% !important;
                                max-width: 100% !important;
                            }
                            
                            .pos-combined-info-card .card-body {
                                display: block !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                                width: 100% !important;
                            }
                            
                            .pos-combined-info-card .card-body > div {
                                display: block !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                                width: 100% !important;
                                margin-bottom: 12px !important;
                                padding-bottom: 12px !important;
                            }
                            
                            /* Ensure invoice table is visible */
                            .order-details-table {
                                display: table !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                                width: 100% !important;
                                font-size: 11px !important;
                            }
                            
                            .order-details-table tbody {
                                display: table-row-group !important;
                                visibility: visible !important;
                            }
                            
                            .order-details-table tr {
                                display: table-row !important;
                                visibility: visible !important;
                            }
                            
                            .order-details-table td {
                                display: table-cell !important;
                                visibility: visible !important;
                                font-size: 11px !important;
                                padding: 6px 3px !important;
                                word-wrap: break-word !important;
                                overflow-wrap: break-word !important;
                                max-width: 50% !important;
                            }
                            
                            .order-bill-table {
                                font-size: 12px !important;
                            }
                            
                            .order-bill-table thead th {
                                font-size: 10px !important;
                                padding: 6px 3px !important;
                            }
                            
                            .order-bill-table tbody td {
                                padding: 6px 3px !important;
                                font-size: 12px !important;
                            }
                            
                            .qty-btn {
                                width: 28px !important;
                                height: 28px !important;
                                font-size: 11px !important;
                            }
                            
                            .qty-display {
                                font-size: 13px !important;
                                min-width: 32px !important;
                            }
                            
                            .btn-add-item {
                                padding: 10px 20px !important;
                                font-size: 13px !important;
                                min-height: 40px !important;
                            }
                            
                            .total-value {
                                font-size: 13px !important;
                            }
                            
                            .final-total .total-value {
                                font-size: 16px !important;
                            }
                            
                            .customer-card-title {
                                font-size: 13px !important;
                            }
                            
                            .customer-info {
                                font-size: 12px !important;
                            }
                        }
                        
                        /* Large screens - ensure proper spacing */
                        @media (min-width: 1400px) {
                            .order-edit-pos-layout {
                                gap: 20px !important;
                            }
                            
                            .order-bill-card .card-body,
                            .pos-combined-info-card .card-body {
                                padding: 24px !important;
                            }
                        }
                        
                        /* Ensure parent container allows flex */
                        .form-fields {
                            width: 100% !important;
                            display: block !important;
                            max-width: 100% !important;
                            overflow-x: hidden !important;
                        }
                        
                        .order-edit-pos-layout {
                            box-sizing: border-box;
                            display: flex !important;
                            flex-direction: row !important;
                            flex-wrap: nowrap !important;
                            max-width: 100% !important;
                            overflow-x: hidden !important;
                        }
                        
                        /* Override any Bootstrap row styles */
                        .order-edit-pos-layout.row {
                            margin-left: 0 !important;
                            margin-right: 0 !important;
                            max-width: 100% !important;
                        }
                        
                        .order-edit-pos-layout.row > * {
                            padding-left: 0 !important;
                            padding-right: 0 !important;
                            max-width: 100% !important;
                        }
                        
                        /* Prevent horizontal overflow */
                        .tab-content,
                        .tab-pane {
                            max-width: 100% !important;
                            overflow-x: hidden !important;
                        }
                        
                        /* Ensure cards don't overflow */
                        .order-bill-card,
                        .pos-combined-info-card,
                        .pos-comment-card {
                            max-width: 100% !important;
                            box-sizing: border-box !important;
                        }
                        
                        /* Hide visible style/script tags that appear as text on mobile */
                        @media (max-width: 768px) {
                            /* Hide any style or script tags */
                            style,
                            script {
                                display: none !important;
                                visibility: hidden !important;
                                opacity: 0 !important;
                                height: 0 !important;
                                width: 0 !important;
                                overflow: hidden !important;
                                position: absolute !important;
                                left: -9999px !important;
                                font-size: 0 !important;
                                line-height: 0 !important;
                                padding: 0 !important;
                                margin: 0 !important;
                            }
                            
                            /* Hide raw CSS/JS code displayed as text in combined card */
                            .pos-combined-info-card style,
                            .pos-combined-info-card script,
                            .pos-combined-info-card .card-body style,
                            .pos-combined-info-card .card-body script,
                            .pos-combined-info-card * style,
                            .pos-combined-info-card * script {
                                display: none !important;
                                visibility: hidden !important;
                                opacity: 0 !important;
                                height: 0 !important;
                                width: 0 !important;
                                overflow: hidden !important;
                                position: absolute !important;
                                left: -9999px !important;
                                font-size: 0 !important;
                                line-height: 0 !important;
                            }
                            
                            /* Hide any text nodes that look like CSS (containing .class or { } */
                            .pos-combined-info-card .card-body > *:not(table):not(div):not(h6):not(p):not(span):not(a):not(button):not(input) {
                                font-size: 0 !important;
                                line-height: 0 !important;
                                height: 0 !important;
                                overflow: hidden !important;
                            }
                        }
                        
                        /* FINAL AGGRESSIVE MOBILE OVERRIDE - Force second card visible */
                        @media (max-width: 768px) {
                            /* Override ANYTHING that might hide the second column */
                            html body .order-edit-pos-layout .pos-info-column,
                            body .order-edit-pos-layout .pos-info-column,
                            .order-edit-pos-layout .pos-info-column,
                            div.order-edit-pos-layout div.pos-info-column {
                                display: block !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                                width: 100% !important;
                                max-width: 100% !important;
                                min-width: 100% !important;
                                height: auto !important;
                                min-height: auto !important;
                                max-height: none !important;
                                flex: 0 0 auto !important;
                                flex-basis: auto !important;
                                position: relative !important;
                                z-index: 999 !important;
                                overflow: visible !important;
                                clip: auto !important;
                                clip-path: none !important;
                                transform: none !important;
                                margin: 10px 0 !important;
                                padding: 0 4px !important;
                                order: 2 !important;
                            }
                            
                            /* Force combined card visible */
                            html body .pos-info-column .pos-combined-info-card,
                            body .pos-info-column .pos-combined-info-card,
                            .pos-info-column .pos-combined-info-card,
                            div.pos-info-column div.pos-combined-info-card,
                            div.pos-info-column .card.pos-combined-info-card {
                                display: block !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                                width: 100% !important;
                                max-width: 100% !important;
                                height: auto !important;
                                min-height: 200px !important;
                                max-height: none !important;
                                position: relative !important;
                                z-index: 1 !important;
                                overflow: visible !important;
                                clip: auto !important;
                                clip-path: none !important;
                                transform: none !important;
                                margin: 0 !important;
                                padding: 0 !important;
                            }
                            
                            /* Force card body visible */
                            .pos-combined-info-card .card-body,
                            div.pos-combined-info-card .card-body {
                                display: block !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                                width: 100% !important;
                                height: auto !important;
                                min-height: 150px !important;
                                max-height: none !important;
                                overflow: visible !important;
                            padding: 12px !important;
                            }
                            
                            /* Force all sections visible */
                            .pos-combined-info-card .card-body > div,
                            div.pos-combined-info-card .card-body > div {
                                display: block !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                                width: 100% !important;
                                height: auto !important;
                                overflow: visible !important;
                            }
                            
                            /* Force table visible */
                            .order-details-table,
                            table.order-details-table {
                                display: table !important;
                                visibility: visible !important;
                                opacity: 1 !important;
                                width: 100% !important;
                            }
                            
                            .order-details-table tbody,
                            table.order-details-table tbody {
                                display: table-row-group !important;
                                visibility: visible !important;
                            }
                            
                            .order-details-table tr,
                            table.order-details-table tr {
                                display: table-row !important;
                                visibility: visible !important;
                            }
                            
                            .order-details-table td,
                            table.order-details-table td {
                                display: table-cell !important;
                                visibility: visible !important;
                            }
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
                        <div class="pos-info-column" style="display: block !important; visibility: visible !important; opacity: 1 !important; width: 100% !important;">
                            <!-- Combined Card: Invoice + Customer + Location -->
                            <div class="card bg-light shadow-sm pos-combined-info-card" style="display: block !important; visibility: visible !important; opacity: 1 !important; width: 100% !important;">
                                <div class="card-body">
                                    <!-- Invoice/Order Details Section -->
                            @isset($fields['order_details'])
                                        <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 2px solid #e5e9f2;">
                                            <h6 class="card-title mb-3" style="font-size: 14px; font-weight: 700; color: #364a63;">@lang($fields['order_details']->label ?? 'admin::lang.orders.label_invoice')</h6>
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
                    
                    <!-- Force second card visible on mobile -->
                    <script>
                    (function() {
                        function forceMobileVisibility() {
                            if (window.innerWidth <= 768) {
                                var infoColumn = document.querySelector('.pos-info-column');
                                var combinedCard = document.querySelector('.pos-combined-info-card');
                                
                                if (infoColumn) {
                                    infoColumn.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; width: 100% !important; height: auto !important; position: relative !important; z-index: 999 !important; margin: 10px 0 !important;';
                                }
                                
                                if (combinedCard) {
                                    combinedCard.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; width: 100% !important; height: auto !important; min-height: 200px !important;';
                                    
                                    var cardBody = combinedCard.querySelector('.card-body');
                                    if (cardBody) {
                                        cardBody.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; width: 100% !important; height: auto !important; padding: 12px !important;';
                                    }
                                }
                                
                                // Force layout to column
                                var layout = document.querySelector('.order-edit-pos-layout');
                                if (layout) {
                                    layout.style.cssText += 'flex-direction: column !important;';
                                }
                            }
                        }
                        
                        function hideVisibleCode() {
                            if (window.innerWidth <= 768) {
                                // Hide any style or script tags
                                var styleTags = document.querySelectorAll('style');
                                var scriptTags = document.querySelectorAll('script');
                                
                                styleTags.forEach(function(tag) {
                                    tag.style.display = 'none';
                                    tag.style.visibility = 'hidden';
                                    tag.style.height = '0';
                                    tag.style.width = '0';
                                    tag.style.overflow = 'hidden';
                                    tag.style.position = 'absolute';
                                    tag.style.left = '-9999px';
                                });
                                
                                scriptTags.forEach(function(tag) {
                                    tag.style.display = 'none';
                                    tag.style.visibility = 'hidden';
                                    tag.style.height = '0';
                                    tag.style.width = '0';
                                    tag.style.overflow = 'hidden';
                                    tag.style.position = 'absolute';
                                    tag.style.left = '-9999px';
                                });
                                
                                // Find and hide any text nodes that look like CSS/JS code in the combined card
                                var combinedCard = document.querySelector('.pos-combined-info-card');
                                if (combinedCard) {
                                    var walker = document.createTreeWalker(
                                        combinedCard,
                                        NodeFilter.SHOW_TEXT,
                                        null,
                                        false
                                    );
                                    
                                    var node;
                                    while (node = walker.nextNode()) {
                                        var text = node.textContent || node.nodeValue || '';
                                        // Check if text looks like CSS or JS code
                                        if (text.trim().match(/^(\.|#|@|function|var |const |let |\(function)/) || 
                                            text.trim().includes('!important') || 
                                            text.trim().includes('display:') ||
                                            text.trim().includes('function(')) {
                                            // Hide the parent element if it's showing code
                                            var parent = node.parentElement;
                                            if (parent && parent.tagName !== 'STYLE' && parent.tagName !== 'SCRIPT') {
                                                parent.style.display = 'none';
                                            }
                                            node.nodeValue = '';
                                        }
                                    }
                                }
                            }
                        }
                        
                        // Run immediately
                        forceMobileVisibility();
                        hideVisibleCode();
                        
                        // Run on load
                        if (document.readyState === 'loading') {
                            document.addEventListener('DOMContentLoaded', function() {
                                forceMobileVisibility();
                                hideVisibleCode();
                            });
                        }
                        
                        // Run after delays
                        setTimeout(function() {
                            forceMobileVisibility();
                            hideVisibleCode();
                        }, 100);
                        setTimeout(function() {
                            forceMobileVisibility();
                            hideVisibleCode();
                        }, 500);
                        setTimeout(function() {
                            forceMobileVisibility();
                            hideVisibleCode();
                        }, 1000);
                        
                        // Run on resize
                        window.addEventListener('resize', function() {
                            forceMobileVisibility();
                            hideVisibleCode();
                        });
                    })();
                    </script>
                @else
                    {!! $this->makePartial('form/form_fields', ['fields' => $fields]) !!}
                @endif
            </div>
        </div>
    @endforeach
</div>
