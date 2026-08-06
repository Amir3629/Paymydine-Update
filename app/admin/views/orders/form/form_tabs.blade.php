@php
    $activeTab = $activeTab ?: '#'.$tabs->section.'tab-1';
@endphp

<div class="tab-heading pmd-order-tabs" data-pmd-order-tabs>
    <ul class="form-nav nav nav-tabs" role="tablist">
        @foreach ($tabs as $name => $fields)
            @php($tabId = $tabs->section.'tab-'.$loop->iteration)
            <li class="nav-item" role="presentation">
                <a
                    class="nav-link{{ ('#'.$tabId === $activeTab) ? ' active' : '' }}"
                    href="#{{ $tabId }}"
                    role="tab"
                    aria-controls="{{ $tabId }}"
                    aria-selected="{{ ('#'.$tabId === $activeTab) ? 'true' : 'false' }}"
                    data-pmd-order-tab
                >@lang($name)</a>
            </li>
        @endforeach
    </ul>
</div>

<div class="tab-content pmd-order-tab-content" data-pmd-order-tab-content>
    @foreach ($tabs as $name => $fields)
        @php
            $tabId = $tabs->section.'tab-'.$loop->iteration;
            $isActive = '#'.$tabId === $activeTab;
        @endphp

        <section
            class="tab-pane{{ $isActive ? ' active show' : '' }}"
            id="{{ $tabId }}"
            role="tabpanel"
            aria-hidden="{{ $isActive ? 'false' : 'true' }}"
            {{ $isActive ? '' : 'hidden' }}
        >
            @if ($loop->iteration === 1)
                <div class="order-edit-pos-layout">
                    <main class="pos-bill-column" aria-label="Order items">
                        @isset($fields['order_menus'])
                            <div class="order-bill-card">
                                <div class="card-body">
                                    {!! $this->renderFieldElement($fields['order_menus']) !!}
                                </div>
                            </div>
                        @endisset
                    </main>

                    <aside class="pos-info-column" aria-label="Order summary">
                        <div class="pos-combined-info-card">
                            <div class="card-body">
                                @isset($fields['order_details'])
                                    <section class="pmd-order-section pmd-order-section-invoice">
                                        <h2 class="card-title">@lang($fields['order_details']->label ?? 'admin::lang.orders.label_invoice')</h2>
                                        {!! $this->renderFieldElement($fields['order_details']) !!}
                                    </section>
                                @endisset

                                @isset($fields['customer'])
                                    <section class="pmd-order-section pmd-order-section-customer">
                                        {!! $this->renderFieldElement($fields['customer']) !!}
                                    </section>
                                @endisset

                                @isset($fields['location'])
                                    <section class="pmd-order-section pmd-order-section-location">
                                        <h2 class="card-title">@lang($fields['location']->label)</h2>
                                        {!! $this->renderFieldElement($fields['location']) !!}
                                    </section>
                                @endisset
                            </div>
                        </div>

                        @if($formModel->comment)
                            <div class="pos-comment-card">
                                <div class="card-body">
                                    <h2 class="card-title">@lang('admin::lang.orders.label_comment')</h2>
                                    <p>{{ $formModel->comment }}</p>
                                </div>
                            </div>
                        @endif

                        @if($formModel->delivery_comment)
                            <div class="pos-comment-card">
                                <div class="card-body">
                                    <h2 class="card-title">@lang('admin::lang.orders.label_delivery_comment')</h2>
                                    <p>{{ $formModel->delivery_comment }}</p>
                                </div>
                            </div>
                        @endif
                    </aside>
                </div>
            @else
                <div class="pmd-order-secondary-pane">
                    {!! $this->makePartial('form/form_fields', ['fields' => $fields]) !!}
                    <div class="pmd-order-empty-state" data-pmd-order-empty-state hidden>
                        <span class="pmd-order-empty-state-icon" aria-hidden="true">⌁</span>
                        <div>
                            <strong>@lang($name)</strong>
                            <span>No activity has been recorded for this order yet.</span>
                        </div>
                    </div>
                </div>
            @endif
        </section>
    @endforeach
</div>

<script>
(function () {
    'use strict';

    function usefulContent(pane) {
        if (!pane) return false;
        var clone = pane.cloneNode(true);
        clone.querySelectorAll('[data-pmd-order-empty-state], script, style, template').forEach(function (node) {
            node.remove();
        });
        return Boolean(
            String(clone.textContent || '').replace(/\s+/g, ' ').trim() ||
            clone.querySelector('table, form, input, select, textarea, button, .card, .list-group, [data-record-id]')
        );
    }

    function bootOrderTabs() {
        var root = document.querySelector('[data-pmd-order-tabs]');
        var content = document.querySelector('[data-pmd-order-tab-content]');
        if (!root || !content || root.getAttribute('data-pmd-ready') === '1') return;

        root.setAttribute('data-pmd-ready', '1');
        var links = Array.prototype.slice.call(root.querySelectorAll('[data-pmd-order-tab]'));
        var panes = Array.prototype.slice.call(content.querySelectorAll('.tab-pane[id]'));

        function paneFor(link) {
            var href = String(link.getAttribute('href') || '');
            return href.charAt(0) === '#' ? document.getElementById(href.slice(1)) : null;
        }

        function activate(link, updateHash) {
            var pane = paneFor(link);
            if (!pane) return;

            links.forEach(function (candidate) {
                var active = candidate === link;
                candidate.classList.toggle('active', active);
                candidate.setAttribute('aria-selected', active ? 'true' : 'false');
                candidate.setAttribute('tabindex', active ? '0' : '-1');
            });

            panes.forEach(function (candidate) {
                var active = candidate === pane;
                candidate.hidden = !active;
                candidate.classList.toggle('active', active);
                candidate.classList.toggle('show', active);
                candidate.setAttribute('aria-hidden', active ? 'false' : 'true');
            });

            var emptyState = pane.querySelector('[data-pmd-order-empty-state]');
            if (emptyState) emptyState.hidden = usefulContent(pane);

            if (updateHash && window.history && window.history.replaceState) {
                window.history.replaceState(null, '', window.location.pathname + window.location.search + link.getAttribute('href'));
            }
        }

        links.forEach(function (link) {
            link.addEventListener('click', function (event) {
                event.preventDefault();
                activate(link, true);
            });

            link.addEventListener('keydown', function (event) {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                var current = links.indexOf(link);
                var next = current;
                if (event.key === 'ArrowLeft') next = (current - 1 + links.length) % links.length;
                if (event.key === 'ArrowRight') next = (current + 1) % links.length;
                if (event.key === 'Home') next = 0;
                if (event.key === 'End') next = links.length - 1;
                links[next].focus();
                activate(links[next], true);
            });
        });

        var initial = links.find(function (link) {
            return link.getAttribute('href') === window.location.hash;
        }) || links.find(function (link) {
            return link.classList.contains('active');
        }) || links[0];

        activate(initial, false);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootOrderTabs, { once: true });
    } else {
        bootOrderTabs();
    }
})();
</script>
