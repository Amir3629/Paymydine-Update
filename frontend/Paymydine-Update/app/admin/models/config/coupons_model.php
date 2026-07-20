<?php

return [
    'list' => [
        'filter' => [
            'search' => [
                'prompt' => 'Search by name or code',
                'mode' => 'all',
            ],
            'scopes' => [
                'card_type' => [
                    'label' => 'Type',
                    'type' => 'select',
                    'conditions' => 'card_type = :filtered',
                    'modelClass' => 'Admin\Models\Coupons_model',
                    'options' => [
                        '' => 'All Types',
                        'coupon' => 'Coupons',
                        'gift_card' => 'Gift Cards',
                        'voucher' => 'Vouchers',
                        'credit' => 'Credits',
                        'comp' => 'Comps',
                    ],
                ],
                'status' => [
                    'label' => 'Status',
                    'type' => 'switch',
                    'conditions' => 'status = :filtered',
                ],
            ],
        ],
        'toolbar' => [
            'buttons' => [
                'create' => [
                    'label' => 'New Coupon / Gift Card',
                    'class' => 'btn btn-primary',
                    'href' => 'coupons/create',
                ],
                'delete' => [
                    'label' => 'Delete Selected',
                    'class' => 'btn btn-danger',
                    'data-request' => 'onDelete',
                    'data-request-confirm' => 'Are you sure?',
                ],
            ],
        ],
        'columns' => [
            'edit' => [
                'type' => 'button',
                'iconCssClass' => 'fa fa-pencil',
                'attributes' => [
                    'class' => 'btn btn-edit',
                    'href' => 'coupons/edit/{coupon_id}',
                ],
            ],
            'name' => [
                'label' => 'Name',
                'type' => 'text',
                'searchable' => true,
            ],
            'code' => [
                'label' => 'Code',
                'type' => 'text',
                'searchable' => true,
            ],
            'card_type' => [
                'label' => 'Type',
                'type' => 'text',
                'sortable' => false,
                'formatter' => function ($record, $column, $value) {
                    $badges = [
                        'coupon' => '<span class="badge badge-primary">Coupon</span>',
                        'gift_card' => '<span class="badge badge-success">Gift Card</span>',
                        'voucher' => '<span class="badge badge-info">Voucher</span>',
                        'credit' => '<span class="badge badge-warning">Credit</span>',
                        'comp' => '<span class="badge badge-secondary">Comp</span>',
                    ];
                    return $badges[$value] ?? '<span class="badge badge-default">Unknown</span>';
                },
            ],
            'type' => [
                'label' => 'Discount Type',
                'type' => 'text',
                'formatter' => function ($record, $column, $value) {
                    return $value === 'P' ? 'Percentage' : 'Fixed';
                },
            ],
            'discount' => [
                'label' => 'Discount',
                'type' => 'text',
                'formatter' => function ($record, $column, $value) {
                    if ($record->card_type === 'gift_card' || $record->card_type === 'credit') {
                        return '-';
                    }
                    return $record->type === 'P' ? round($value) . '%' : currency_format($value);
                },
            ],
            'current_balance' => [
                'label' => 'Balance',
                'type' => 'text',
                'formatter' => function ($record, $column, $value) {
                    if (!in_array($record->card_type, ['gift_card', 'credit', 'comp'])) {
                        return '-';
                    }
                    return currency_format($value ?? 0);
                },
            ],
            'min_total' => [
                'label' => 'Min. Order',
                'type' => 'currency',
            ],
            'redemptions' => [
                'label' => 'Max Uses',
                'type' => 'number',
                'formatter' => function ($record, $column, $value) {
                    return $value > 0 ? $value : 'Unlimited';
                },
            ],
            'status' => [
                'label' => 'Status',
                'type' => 'switch',
            ],
            'created_at' => [
                'label' => 'Date Created',
                'type' => 'datetime',
            ],
            'coupon_id' => [
                'label' => 'ID',
            ],
        ],
    ],
    'form' => [
        'toolbar' => [
            'buttons' => [
                'save' => [
                    'label' => 'Save',
                    'class' => 'btn btn-primary',
                    'data-request' => 'onSave',
                ],
                'saveClose' => [
                    'label' => 'Save & Close',
                    'class' => 'btn btn-default',
                    'data-request' => 'onSave',
                    'data-request-data' => 'close:1',
                ],
                'delete' => [
                    'label' => 'Delete',
                    'class' => 'btn btn-danger',
                    'data-request' => 'onDelete',
                    'data-request-confirm' => 'Are you sure?',
                ],
            ],
        ],
        'fields' => [
            'card_type' => [
                'label' => 'Card Type',
                'type' => 'radiotoggle',
                'span' => 'left',
                'default' => 'coupon',
                'options' => [
                    'coupon' => 'Coupon',
                    'gift_card' => 'Gift Card',
                    'voucher' => 'Voucher',
                    'credit' => 'Credit',
                    'comp' => 'Comp',
                ],
                'comment' => 'Select the type of card to create',
            ],
            'name' => [
                'label' => 'Name',
                'type' => 'text',
                'span' => 'left',
            ],
            'code' => [
                'label' => 'Code',
                'type' => 'text',
                'span' => 'right',
                'comment' => 'Unique code for this coupon/card',
            ],
            'description' => [
                'label' => 'Description',
                'type' => 'textarea',
                'span' => 'full',
            ],
            'type' => [
                'label' => 'Discount Type',
                'type' => 'radiotoggle',
                'span' => 'left',
                'default' => 'F',
                'options' => [
                    'F' => 'Fixed Amount',
                    'P' => 'Percentage',
                ],
                'trigger' => [
                    'action' => 'show',
                    'field' => 'card_type',
                    'condition' => 'value[coupon]||value[voucher]',
                ],
            ],
            'discount' => [
                'label' => 'Discount',
                'type' => 'number',
                'span' => 'right',
                'trigger' => [
                    'action' => 'show',
                    'field' => 'card_type',
                    'condition' => 'value[coupon]||value[voucher]',
                ],
            ],
            'initial_balance' => [
                'label' => 'Initial Balance',
                'type' => 'currency',
                'span' => 'left',
                'trigger' => [
                    'action' => 'show',
                    'field' => 'card_type',
                    'condition' => 'value[gift_card]||value[credit]||value[comp]',
                ],
            ],
            'current_balance' => [
                'label' => 'Current Balance',
                'type' => 'currency',
                'span' => 'right',
                'disabled' => true,
                'trigger' => [
                    'action' => 'show',
                    'field' => 'card_type',
                    'condition' => 'value[gift_card]||value[credit]||value[comp]',
                ],
            ],
            'is_purchasable' => [
                'label' => 'Purchasable',
                'type' => 'switch',
                'span' => 'left',
                'comment' => 'Can customers purchase this card?',
                'trigger' => [
                    'action' => 'show',
                    'field' => 'card_type',
                    'condition' => 'value[gift_card]',
                ],
            ],
            'purchase_price' => [
                'label' => 'Purchase Price',
                'type' => 'currency',
                'span' => 'right',
                'trigger' => [
                    'action' => 'show',
                    'field' => 'card_type',
                    'condition' => 'value[gift_card]',
                ],
            ],
            'is_reloadable' => [
                'label' => 'Reloadable',
                'type' => 'switch',
                'span' => 'left',
                'comment' => 'Can balance be reloaded?',
                'trigger' => [
                    'action' => 'show',
                    'field' => 'card_type',
                    'condition' => 'value[gift_card]',
                ],
            ],
            'is_transferable' => [
                'label' => 'Transferable',
                'type' => 'switch',
                'span' => 'right',
                'comment' => 'Can be transferred to another customer?',
                'trigger' => [
                    'action' => 'show',
                    'field' => 'card_type',
                    'condition' => 'value[gift_card]',
                ],
            ],
            'min_total' => [
                'label' => 'Minimum Order Total',
                'type' => 'currency',
                'span' => 'left',
                'comment' => 'Minimum order amount required to use',
            ],
            'redemptions' => [
                'label' => 'Maximum Redemptions',
                'type' => 'number',
                'span' => 'left',
                'default' => 0,
                'comment' => '0 = unlimited',
            ],
            'customer_redemptions' => [
                'label' => 'Max Redemptions Per Customer',
                'type' => 'number',
                'span' => 'right',
                'default' => 0,
                'comment' => '0 = unlimited',
            ],
            'status' => [
                'label' => 'Status',
                'type' => 'switch',
                'span' => 'left',
                'default' => true,
            ],
            'expiry_date' => [
                'label' => 'Expiry Date',
                'type' => 'datepicker',
                'span' => 'right',
                'comment' => 'When this card expires (optional)',
            ],
        ],
    ],
];

