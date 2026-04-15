<div class="row-fluid cash-drawer-simple-page">
    @php($status = $localHardwareStatus ?? ['state' => 'not_configured', 'message' => 'Local hardware status unavailable.'])

    <div class="panel panel-default" style="margin-bottom: 15px;">
        <div class="panel-heading"><strong>Connection Status</strong></div>
        <div class="panel-body">
            <div class="alert {{ ($status['state'] ?? '') === 'online' || (($status['drawer']->setup_state ?? '') === 'ready') ? 'alert-success' : (($status['state'] ?? '') === 'offline' ? 'alert-warning' : 'alert-info') }}" style="margin-bottom: 10px;">
                {{ $status['message'] ?? 'Unknown status.' }}
            </div>

            <div class="table-responsive">
                <table class="table table-bordered" style="margin-bottom: 0;">
                    <tbody>
                        <tr>
                            <th style="width: 30%;">Terminal</th>
                            <td>{{ $status['device']->name ?? 'Not configured' }}</td>
                        </tr>
                        <tr>
                            <th>Last Seen</th>
                            <td>{{ $status['device']->last_seen_at ?? 'Never' }}</td>
                        </tr>
                        <tr>
                            <th>Last Command</th>
                            <td>
                                {{ $status['drawer']->last_command_status ?? 'None' }}
                                @if(!empty($status['drawer']->last_command_message))
                                    — {{ $status['drawer']->last_command_message }}
                                @endif
                            </td>
                        </tr>
                        <tr>
                            <th>Last Queue Status</th>
                            <td>{{ $status['command']->status ?? 'None' }}</td>
                        </tr>
                        <tr>
                            <th>Last Queue Time</th>
                            <td>{{ $status['command']->queued_at ?? 'N/A' }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    {!! form_open([
        'id'     => 'edit-form',
        'role'   => 'form',
        'method' => 'POST',
    ]) !!}

    {!! $this->renderForm() !!}

    {!! form_close() !!}
</div>
