<div class="row-fluid pmd-page--payments">
    @php
        $mode = (string)request()->get('mode', (string)session('payments.form_mode', 'methods'));
        if (!in_array($mode, ['methods', 'providers'], true)) {
            $mode = 'methods';
        }
        $isProvidersMode = $mode === 'providers';
        $toggleLabel = $isProvidersMode ? 'Manage Methods' : 'Manage Providers';
        $toggleHref = $isProvidersMode ? admin_url('payments?mode=methods') : admin_url('payments?mode=providers');
        $methodsHref = admin_url('payments?mode=methods');
        $providersHref = admin_url('payments?mode=providers');
    @endphp

    <div class="toolbar-action pmd-payments-toolbar" style="margin: 12px 0 16px 0;">
        <div class="progress-indicator-container pmd-payments-toolbar-container">
            <a
                href="{{ $toggleHref }}"
                class="btn btn-default pmd-payments-mode-toggle"
                data-pmd-toolbar-secondary="true"
                data-methods-label="Manage Methods"
                data-providers-label="Manage Providers"
                data-methods-href="{{ $methodsHref }}"
                data-providers-href="{{ $providersHref }}"
            >{{ $toggleLabel }}</a>
        </div>
    </div>

    {!! $this->renderList() !!}
</div>
