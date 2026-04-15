<div class="row-fluid cash-drawer-simple-page">
    @php($status = $localHardwareStatus ?? ['state' => 'not_configured', 'message' => 'Local hardware status unavailable.'])
    @php($localPrinters = $status['localPrinters'] ?? [])

    <div class="panel panel-default" style="margin-bottom: 15px;">
        <div class="panel-heading"><strong>Connection Status</strong></div>
        <div class="panel-body">
            <div class="alert {{ ($status['state'] ?? '') === 'online' || (($status['drawer']->setup_state ?? '') === 'ready') ? 'alert-success' : (($status['state'] ?? '') === 'offline' ? 'alert-warning' : 'alert-info') }}" style="margin-bottom: 10px;">
                {{ $status['message'] ?? 'Unknown status.' }}
            </div>

            <div class="table-responsive">
                <table class="table table-bordered" style="margin-bottom: 10px;">
                    <tbody>
                        <tr>
                            <th style="width: 30%;">Local Agent Reachable</th>
                            <td>{{ ($status['state'] ?? '') === 'online' ? 'Yes' : 'No' }}</td>
                        </tr>
                        <tr>
                            <th>Selected Printer Target</th>
                            <td>{{ $formModel->device_path ?? 'Not selected' }}</td>
                        </tr>
                        <tr>
                            <th>Terminal</th>
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

            <div class="form-inline" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                <a class="btn btn-default" href="{{ admin_url('cash_drawers/windows_connector/'.$formModel->drawer_id) }}"><i class="fa fa-download"></i> Download Connector</a>
                <a class="btn btn-default" data-request="onCheckAgentBridge"><i class="fa fa-heartbeat"></i> Check Agent</a>
                <a class="btn btn-default" data-request="onLoadLocalPrinters"><i class="fa fa-list"></i> Load Printers</a>
                <a class="btn btn-default" data-request="onApplyLocalPrinter" data-request-form="#local-printer-form"><i class="fa fa-link"></i> Use Selected Printer</a>
                <a class="btn btn-info" data-request="onTestConnection"><i class="fa fa-plug"></i> Test Drawer</a>
                <a class="btn btn-info" data-request="onTestPrintLocal" data-request-form="#local-printer-form"><i class="fa fa-print"></i> Test Print</a>
                <a class="btn btn-success" data-request="onOpenDrawer"><i class="fa fa-unlock"></i> Open Drawer</a>
            </div>

            <form id="local-printer-form" style="margin-top:10px;">
                <select name="local_printer_name" class="form-control" style="min-width:260px;">
                    <option value="">Select printer from terminal...</option>
                    @foreach($localPrinters as $printer)
                        @php($printerName = $printer['name'] ?? null)
                        @php($printerTarget = $printer['port_name'] ?? $printerName)
                        @if($printerName)
                            <option value="{{ $printerName }}" data-target="{{ $printerTarget }}">{{ $printerName }} ({{ $printerTarget }})</option>
                        @endif
                    @endforeach
                </select>
                <input type="hidden" name="local_printer_target" id="local_printer_target" value="">
            </form>
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

<script>
(function () {
    const select = document.querySelector('#local-printer-form select[name="local_printer_name"]');
    const targetInput = document.getElementById('local_printer_target');

    if (!select || !targetInput) return;

    function syncTarget() {
        const selected = select.options[select.selectedIndex];
        targetInput.value = selected ? (selected.dataset.target || selected.value || '') : '';
    }

    select.addEventListener('change', syncTarget);
    syncTarget();
})();
</script>
