@php
    $activeTab = $activeTab ?: '#'.$tabs->section.'tab-1';
@endphp

<div class="pmd-oe-tabs" data-pmd-oe-tabs>
    <div class="pmd-oe-tab-list" role="tablist" aria-label="Order sections">
        @foreach ($tabs as $name => $fields)
            @php
                $tabId = $tabs->section.'tab-'.$loop->iteration;
                $isActive = '#'.$tabId === $activeTab;
            @endphp
            <button
                type="button"
                class="pmd-oe-tab{{ $isActive ? ' is-active' : '' }}"
                role="tab"
                aria-controls="{{ $tabId }}"
                aria-selected="{{ $isActive ? 'true' : 'false' }}"
                data-pmd-oe-tab="#{{ $tabId }}"
            >@lang($name)</button>
        @endforeach
    </div>
</div>

<div class="pmd-oe-panes" data-pmd-oe-panes>
    @foreach ($tabs as $name => $fields)
        @php
            $tabId = $tabs->section.'tab-'.$loop->iteration;
            $isActive = '#'.$tabId === $activeTab;
        @endphp

        <section
            id="{{ $tabId }}"
            class="pmd-oe-pane{{ $isActive ? ' is-active' : '' }}"
            role="tabpanel"
            aria-hidden="{{ $isActive ? 'false' : 'true' }}"
            {{ $isActive ? '' : 'hidden' }}
        >
            @if ($loop->first)
                <div class="pmd-oe-workspace">
                    <main class="pmd-oe-main" aria-label="Order items">
                        @isset($fields['order_menus'])
                            <section class="pmd-oe-surface pmd-oe-items">
                                {!! $this->renderFieldElement($fields['order_menus']) !!}
                            </section>
                        @endisset
                    </main>

                    <aside class="pmd-oe-side" aria-label="Order summary">
                        <section class="pmd-oe-surface pmd-oe-summary">
                            @isset($fields['order_details'])
                                <div class="pmd-oe-summary-section pmd-oe-summary-payment">
                                    <h2>@lang($fields['order_details']->label ?? 'admin::lang.orders.label_invoice')</h2>
                                    {!! $this->renderFieldElement($fields['order_details']) !!}
                                </div>
                            @endisset

                            @isset($fields['customer'])
                                <div class="pmd-oe-summary-section pmd-oe-summary-customer">
                                    {!! $this->renderFieldElement($fields['customer']) !!}
                                </div>
                            @endisset

                            @isset($fields['location'])
                                <div class="pmd-oe-summary-section pmd-oe-summary-location">
                                    <h2>@lang($fields['location']->label)</h2>
                                    {!! $this->renderFieldElement($fields['location']) !!}
                                </div>
                            @endisset
                        </section>

                        @if($formModel->comment)
                            <section class="pmd-oe-surface pmd-oe-note-card" data-pmd-oe-machine-note>
                                <h2>@lang('admin::lang.orders.label_comment')</h2>
                                <p>{{ $formModel->comment }}</p>
                            </section>
                        @endif

                        @if($formModel->delivery_comment)
                            <section class="pmd-oe-surface pmd-oe-note-card">
                                <h2>@lang('admin::lang.orders.label_delivery_comment')</h2>
                                <p>{{ $formModel->delivery_comment }}</p>
                            </section>
                        @endif
                    </aside>
                </div>
            @else
                <section class="pmd-oe-surface pmd-oe-secondary">
                    <div class="pmd-oe-secondary-content" data-pmd-oe-secondary-content>
                        {!! $this->makePartial('form/form_fields', ['fields' => $fields]) !!}
                    </div>
                    <div class="pmd-oe-empty" data-pmd-oe-empty hidden>
                        <span class="pmd-oe-empty-icon" aria-hidden="true">—</span>
                        <div>
                            <strong>@lang($name)</strong>
                            <span>No activity has been recorded for this order yet.</span>
                        </div>
                    </div>
                </section>
            @endif
        </section>
    @endforeach
</div>
