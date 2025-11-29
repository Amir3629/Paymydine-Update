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
                        .order-edit-three-columns .col-md-4 {
                            padding-left: 8px;
                            padding-right: 8px;
                        }
                        .order-edit-three-columns .card {
                            margin-bottom: 10px !important;
                        }
                        .order-edit-three-columns .card-body {
                            padding: 12px !important;
                        }
                    </style>
                    <div class="row w-100 order-edit-three-columns">
                        <div class="col-md-4">
                            @isset($fields['order_menus'])
                                <div class="card bg-light shadow-sm mb-2 order-bill-card">
                                    <div class="card-body p-2">
                                        {!! $this->renderFieldElement($fields['order_menus']) !!}
                                    </div>
                                </div>
                            @endisset
                        </div>
                        <div class="col-md-4">
                            @isset($fields['order_details'])
                                <div class="card bg-light shadow-sm mb-2 order-details-card">
                                    <div class="card-body p-2">
                                        {!! $this->renderFieldElement($fields['order_details']) !!}
                                    </div>
                                </div>
                            @endisset
                        </div>
                        <div class="col-md-4">
                            @if($formModel->comment)
                                <div class="card bg-light shadow-sm mb-2">
                                    <div class="card-body p-2">
                                        <h6 class="card-title mb-1" style="font-size: 11px; font-weight: 600;">@lang('admin::lang.orders.label_comment')</h6>
                                        <p class="mb-0" style="font-size: 10px;">{{ $formModel->comment }}</p>
                                    </div>
                                </div>
                            @endif
                            @if($formModel->delivery_comment)
                                <div class="card bg-light shadow-sm mb-2">
                                    <div class="card-body p-2">
                                        <h6 class="card-title mb-1" style="font-size: 11px; font-weight: 600;">@lang('admin::lang.orders.label_delivery_comment')</h6>
                                        <p class="mb-0" style="font-size: 10px;">{{ $formModel->delivery_comment }}</p>
                                    </div>
                                </div>
                            @endif
                            <div class="card bg-light shadow-sm mb-2 customer-card-wrapper" style="border-radius: 10px; overflow: hidden; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid #e5e9f2;">
                                @isset($fields['customer'])
                                    <div class="card-body p-2" style="padding: 14px !important; width: 100%;">
                                        {!! $this->renderFieldElement($fields['customer']) !!}
                                    </div>
                                @endisset
                            </div>
                            @isset($fields['location'])
                                <div class="card bg-light shadow-sm mb-2">
                                    <div class="card-body p-2" style="padding: 12px !important;">
                                        <h6 class="card-title mb-1" style="font-size: 11px; font-weight: 600;">@lang($fields['location']->label)</h6>
                                        {!! $this->renderFieldElement($fields['location']) !!}
                                    </div>
                                </div>
                            @endisset
                        </div>
                    </div>
                @else
                    {!! $this->makePartial('form/form_fields', ['fields' => $fields]) !!}
                @endif
            </div>
        </div>
    @endforeach
</div>
