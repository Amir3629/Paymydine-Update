<div class="row-fluid">
    @php($status = $localHardwareStatus ?? ['state' => 'not_configured', 'message' => 'Local hardware status unavailable.'])
    <div class="panel panel-default" style="margin-bottom: 15px;">
        <div class="panel-heading"><strong>Connection Status</strong></div>
        <div class="panel-body">
            <div class="alert {{ ($status['state'] ?? '') === 'online' || (($status['drawer']->setup_state ?? '') === 'ready') ? 'alert-success' : (($status['state'] ?? '') === 'offline' ? 'alert-warning' : 'alert-info') }}" style="margin-bottom:10px;">
                <strong>{{ ucfirst(str_replace('_', ' ', $status['state'] ?? 'unknown')) }}:</strong>
                {{ $status['message'] ?? 'Unknown' }}
            </div>

            <div class="table-responsive">
                <table class="table table-sm table-bordered" style="margin-bottom: 0;">
                    <tbody>
                    <tr>
                        <th style="width:30%;">Terminal</th>
                        <td>{{ $status['device']->name ?? 'N/A' }}</td>
                    </tr>
                    <tr>
                        <th>Last Seen</th>
                        <td>{{ $status['device']->last_seen_at ?? 'never' }}</td>
                    </tr>
                    <tr>
                        <th>Last Command</th>
                        <td>
                            {{ $status['drawer']->last_command_status ?? 'none' }}
                            @if(!empty($status['drawer']->last_command_message))
                                - {{ $status['drawer']->last_command_message }}
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <th>Last Queue Status</th>
                        <td>{{ $status['command']->status ?? 'none' }}</td>
                    </tr>
                    <tr>
                        <th>Last Queue Time</th>
                        <td>{{ $status['command']->queued_at ?? 'n/a' }}</td>
                    </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    @if(!empty($formModel->drawer_id))
    <details class="panel panel-default" style="margin-bottom: 15px; padding: 10px;">
        <summary><strong>Setup & Troubleshooting Tools</strong></summary>
        <div style="margin-top: 12px;">
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
