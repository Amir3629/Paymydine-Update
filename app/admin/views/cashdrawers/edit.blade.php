<div class="row-fluid cash-drawer-simple-page">
    @php($status = $localHardwareStatus ?? ['state' => 'not_configured', 'message' => 'Local hardware status unavailable.'])

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
                            <td id="local-agent-health">Unknown</td>
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
                <button type="button" class="btn btn-default" id="btn-check-agent"><i class="fa fa-heartbeat"></i> Check Agent</button>
                <button type="button" class="btn btn-default" id="btn-load-printers"><i class="fa fa-list"></i> Load Printers</button>
                <select id="local-printer-select" class="form-control" style="min-width:260px;">
                    <option value="">Select printer from local POS...</option>
                </select>
                <button type="button" class="btn btn-default" id="btn-use-printer"><i class="fa fa-link"></i> Use Selected Printer</button>
                <button type="button" class="btn btn-info" id="btn-test-drawer"><i class="fa fa-plug"></i> Test Drawer</button>
                <button type="button" class="btn btn-info" id="btn-test-print"><i class="fa fa-print"></i> Test Print</button>
                <button type="button" class="btn btn-success" id="btn-open-drawer-local"><i class="fa fa-unlock"></i> Open Drawer</button>
            </div>
            <p id="local-action-result" style="margin-top:8px;margin-bottom:0;"></p>
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
    const base = 'http://127.0.0.1:17877';
    const resultEl = document.getElementById('local-action-result');
    const healthEl = document.getElementById('local-agent-health');
    const printersSelect = document.getElementById('local-printer-select');

    const $ = (sel) => document.querySelector(sel);
    const field = (name) => document.querySelector(`[name$='[${name}]']`);

    function setResult(message, ok = true) {
        if (!resultEl) return;
        resultEl.textContent = message;
        resultEl.style.color = ok ? '#0a7f4f' : '#b42318';
    }

    async function callLocal(path, options = {}) {
        const response = await fetch(`${base}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) {
            throw new Error(data.message || `Request failed (${response.status})`);
        }
        return data;
    }

    async function checkAgent() {
        try {
            const data = await callLocal('/health', { method: 'GET' });
            healthEl.textContent = `Yes (${data.agent?.device_code || 'unknown device'})`;
            setResult('Local agent is reachable.');
            return true;
        } catch (e) {
            healthEl.textContent = 'No';
            setResult(`Local agent not reachable: ${e.message}`, false);
            return false;
        }
    }

    async function loadPrinters() {
        try {
            const data = await callLocal('/printers', { method: 'GET' });
            printersSelect.innerHTML = '<option value="">Select printer from local POS...</option>';
            (data.printers || []).forEach((printer) => {
                const option = document.createElement('option');
                option.value = printer.name;
                option.textContent = `${printer.name} (${printer.port_name || 'no port'})`;
                option.dataset.port = printer.port_name || '';
                printersSelect.appendChild(option);
            });
            setResult(`Loaded ${data.printers?.length || 0} printer(s) from local POS.`);
        } catch (e) {
            setResult(`Failed to load printers: ${e.message}`, false);
        }
    }

    function applySelectedPrinter() {
        const selected = printersSelect.options[printersSelect.selectedIndex];
        if (!selected || !selected.value) {
            setResult('Select a printer first.', false);
            return;
        }

        const devicePathInput = field('device_path');
        const printerInput = field('printer_id');

        if (devicePathInput) {
            devicePathInput.value = selected.dataset.port || selected.value;
            devicePathInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (printerInput) {
            printerInput.value = '';
            printerInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        setResult(`Selected printer applied to drawer target: ${selected.dataset.port || selected.value}`);
    }

    function buildDrawerPayload() {
        const target = field('device_path')?.value || '';
        const command = field('esc_pos_command')?.value || '27,112,0,60,120';
        const printerName = printersSelect.value || '';
        return {
            target,
            esc_pos_command: command,
            printer_name: printerName,
        };
    }

    async function testDrawer() {
        try {
            await callLocal('/test-drawer', {
                method: 'POST',
                body: JSON.stringify(buildDrawerPayload()),
            });
            setResult('Drawer test command sent to local POS successfully.');
        } catch (e) {
            setResult(`Drawer test failed: ${e.message}`, false);
        }
    }

    async function openDrawer() {
        try {
            await callLocal('/open-drawer', {
                method: 'POST',
                body: JSON.stringify(buildDrawerPayload()),
            });
            setResult('Open drawer command sent to local POS successfully.');
        } catch (e) {
            setResult(`Open drawer failed: ${e.message}`, false);
        }
    }

    async function testPrint() {
        const printerName = printersSelect.value;
        if (!printerName) {
            setResult('Select a local printer before test print.', false);
            return;
        }

        try {
            await callLocal('/test-print', {
                method: 'POST',
                body: JSON.stringify({ printer_name: printerName }),
            });
            setResult('Test print sent to local printer spooler.');
        } catch (e) {
            setResult(`Test print failed: ${e.message}`, false);
        }
    }

    document.getElementById('btn-check-agent')?.addEventListener('click', checkAgent);
    document.getElementById('btn-load-printers')?.addEventListener('click', loadPrinters);
    document.getElementById('btn-use-printer')?.addEventListener('click', applySelectedPrinter);
    document.getElementById('btn-test-drawer')?.addEventListener('click', testDrawer);
    document.getElementById('btn-open-drawer-local')?.addEventListener('click', openDrawer);
    document.getElementById('btn-test-print')?.addEventListener('click', testPrint);

    checkAgent();
})();
</script>
