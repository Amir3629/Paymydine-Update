<div class="row-fluid">
    @php
        $mode = (string)request()->get('mode', (string)session('payments.form_mode', 'methods'));
        if (!in_array($mode, ['methods', 'providers'], true)) {
            $mode = 'methods';
        }
        $isProvidersMode = $mode === 'providers';
        $toggleLabel = $isProvidersMode ? 'Manage Methods' : 'Manage Providers';
        $toggleHref = $isProvidersMode ? admin_url('payments?mode=methods') : admin_url('payments?mode=providers');
    @endphp

    <div class="toolbar-action" style="margin: 12px 0 16px 0;">
        <div class="progress-indicator-container">
            <a href="{{ $toggleHref }}" class="btn btn-primary">
                {{ $toggleLabel }}
            </a>
        </div>
    </div>

    {!! $this->renderList() !!}
</div>
