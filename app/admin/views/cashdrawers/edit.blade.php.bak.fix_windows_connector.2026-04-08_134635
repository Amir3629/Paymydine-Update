<div class="row-fluid">
    @php($status = $localHardwareStatus ?? ['state' => 'not_configured', 'message' => 'Local hardware status unavailable.'])
    <div class="alert {{ ($status['state'] ?? '') === 'online' ? 'alert-success' : (($status['state'] ?? '') === 'offline' ? 'alert-warning' : 'alert-info') }}">
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
    </div>

    {!! form_open([
        'id'     => 'edit-form',
        'role'   => 'form',
        'method' => 'POST',
    ]) !!}

    {!! $this->renderForm() !!}

    {!! form_close() !!}
</div>
