<div class="row-fluid">
    @php($status = $localHardwareStatus ?? ['state' => 'not_configured', 'message' => 'Local hardware status unavailable.'])
    <div class="alert {{ ($status['state'] ?? '') === 'online' || (($status['drawer']->setup_state ?? '') === 'ready') ? 'alert-success' : (($status['state'] ?? '') === 'offline' ? 'alert-warning' : 'alert-info') }}">
        <strong>Local Hardware Status:</strong> {{ $status['message'] ?? 'Unknown' }}
        @if(!empty($status['device']))
            <div style="margin-top:6px;">
                <small>
                    Terminal: {{ $status['device']->name ?? 'N/A' }} |
                    Last seen: {{ $status['device']->last_seen_at ?? 'never' }}
                </small>
            </div>
        @endif
        @if(!empty($status['drawer']) && !empty($status['drawer']->last_command_status))
            <div style="margin-top:6px;">
                <small>
                    Last command: {{ $status['drawer']->last_command_status }} -
                    {{ $status['drawer']->last_command_message ?: 'No details' }}
                </small>
            </div>
        @endif
        @if(!empty($status['drawer']) && !empty($status['drawer']->setup_state))
            <div style="margin-top:6px;">
                <small>Setup state: {{ $status['drawer']->setup_state }}{{ !empty($status['drawer']->setup_message) ? ' - '.$status['drawer']->setup_message : '' }}</small>
            </div>
        @endif
    </div>

    @if(!empty($formModel->drawer_id))
    <details style="margin-bottom: 15px;">
        <summary><strong>Advanced / Troubleshooting</strong></summary>
        <div style="margin-top: 10px;">
            <a class="btn btn-warning" data-request="onRepairLocalHardware">Repair Local Hardware Connection</a>
            <a class="btn btn-secondary" href="{{ admin_url('cash_drawers/windows_connector/'.$formModel->drawer_id) }}">Download Windows Connector</a>
            <a class="btn btn-info" data-request="onCopySetupLink">Copy Setup Link</a>
        </div>
    </details>
    @endif

    {!! form_open([
        'id'     => 'edit-form',
        'role'   => 'form',
        'method' => 'POST',
    ]) !!}

    {!! $this->renderForm() !!}

    {!! form_close() !!}
</div>
