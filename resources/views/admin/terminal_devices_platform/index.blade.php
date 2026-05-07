@extends('layouts.platform')

@section('title', 'Terminal Devices Platform')
@section('page-title', 'Terminal Devices')

@push('styles')
<style>
    .tdp-header { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; margin-bottom:20px; }
    .tdp-header h2 { margin:0 0 6px; font-size:28px; }
    .tdp-header p { margin:0; color:#6b7280; }
    .tdp-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; border:0; border-radius:10px; padding:10px 14px; font-weight:700; text-decoration:none; cursor:pointer; transition:.18s ease; white-space:nowrap; }
    .tdp-btn-primary { background:#2563eb; color:#fff; }
    .tdp-btn-secondary { background:#e0e7ff; color:#1e40af; }
    .tdp-btn-success { background:#dcfce7; color:#166534; }
    .tdp-btn-warning { background:#fef3c7; color:#92400e; }
    .tdp-btn-danger { background:#fee2e2; color:#991b1b; }
    .tdp-btn:hover { transform:translateY(-1px); text-decoration:none; filter:brightness(.98); }
    .tdp-filters { padding:18px; display:grid; grid-template-columns: minmax(220px, 1fr) 180px 200px auto; gap:12px; align-items:end; margin-bottom:18px; }
    .tdp-field label { display:block; font-size:12px; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; font-weight:800; margin-bottom:6px; }
    .tdp-field input, .tdp-field select { width:100%; border:1px solid #d1d5db; border-radius:10px; padding:10px 12px; background:#fff; min-height:42px; }
    .tdp-table-wrap { overflow-x:auto; }
    .tdp-table { width:100%; border-collapse:separate; border-spacing:0; min-width:980px; }
    .tdp-table th { background:#f8fafc; color:#475569; font-size:12px; text-align:left; text-transform:uppercase; letter-spacing:.05em; padding:14px 16px; border-bottom:1px solid #e5e7eb; }
    .tdp-table td { padding:15px 16px; border-bottom:1px solid #eef2f7; vertical-align:middle; }
    .tdp-table tr:last-child td { border-bottom:0; }
    .tdp-device-name { font-weight:800; color:#111827; }
    .tdp-muted { color:#6b7280; font-size:13px; }
    .tdp-badge { display:inline-flex; align-items:center; gap:6px; padding:5px 9px; border-radius:999px; font-size:12px; font-weight:800; }
    .tdp-badge.active { background:#dcfce7; color:#166534; }
    .tdp-badge.inactive { background:#f1f5f9; color:#475569; }
    .tdp-actions { display:flex; flex-wrap:wrap; gap:8px; }
    .tdp-empty { padding:32px; text-align:center; color:#6b7280; }
    @media (max-width: 900px) { .tdp-header { flex-direction:column; } .tdp-filters { grid-template-columns:1fr; } }
</style>
@endpush

@section('main')
    <div class="tdp-header">
        <div>
            <h2>Terminal Devices Platform</h2>
            <p>Independent POS terminal management for SumUp, Worldline, and future payment-device integrations.</p>
        </div>
        <a class="tdp-btn tdp-btn-primary" href="{{ route('terminal_devices_platform.create') }}">+ Add Terminal</a>
    </div>

    @if (session('terminal_devices_platform_message'))
        <script>document.addEventListener('DOMContentLoaded', function(){ PlatformToast(@json(session('terminal_devices_platform_message')), 'success'); });</script>
    @endif

    <form class="platform-card tdp-filters" method="GET" action="{{ route('terminal_devices_platform.index') }}">
        <div class="tdp-field">
            <label for="search">Search name or IP</label>
            <input id="search" name="search" value="{{ $filters['search'] ?? '' }}" placeholder="Front Counter or 192.168...">
        </div>
        <div class="tdp-field">
            <label for="status">Status</label>
            <select id="status" name="status">
                <option value="">All statuses</option>
                @foreach ($statusOptions as $value => $label)
                    <option value="{{ $value }}" {{ (($filters['status'] ?? '') === $value) ? 'selected' : '' }}>{{ $label }}</option>
                @endforeach
            </select>
        </div>
        <div class="tdp-field">
            <label for="connection_type">Connection type</label>
            <select id="connection_type" name="connection_type">
                <option value="">All types</option>
                @foreach ($connectionTypeOptions as $value => $label)
                    <option value="{{ $value }}" {{ (($filters['connection_type'] ?? '') === $value) ? 'selected' : '' }}>{{ $label }}</option>
                @endforeach
            </select>
        </div>
        <div style="display:flex; gap:8px;">
            <button class="tdp-btn tdp-btn-secondary" type="submit">Filter</button>
            <a class="tdp-btn" href="{{ route('terminal_devices_platform.index') }}" style="background:#f3f4f6;color:#374151;">Reset</a>
        </div>
    </form>

    <div class="platform-card tdp-table-wrap">
        <table class="tdp-table" id="terminalDevicesPlatformTable">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>IP Address</th>
                    <th>Model</th>
                    <th>Status</th>
                    <th>Connection Type</th>
                    <th>Last Active</th>
                    <th>Last Sync</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($devices as $device)
                    <tr data-device-id="{{ $device->id }}">
                        <td><div class="tdp-device-name">{{ $device->name }}</div><div class="tdp-muted">{{ $device->location ?: 'No location set' }}</div></td>
                        <td data-field="ip_address">{{ $device->ip_address ?: '—' }}</td>
                        <td>{{ $device->model ?: '—' }}</td>
                        <td data-field="status"><span class="tdp-badge {{ $device->status }}">{{ ucfirst($device->status) }}</span></td>
                        <td>{{ $device->connection_type }}</td>
                        <td data-field="last_active">{{ optional($device->last_active)->format('Y-m-d H:i') ?: '—' }}</td>
                        <td data-field="last_sync">{{ optional($device->last_sync)->format('Y-m-d H:i') ?: '—' }}</td>
                        <td>
                            <div class="tdp-actions">
                                <a class="tdp-btn tdp-btn-secondary" href="{{ route('terminal_devices_platform.edit', $device->id) }}">Edit</a>
                                <button class="tdp-btn tdp-btn-success" type="button" data-action="connect" data-url="{{ route('terminal_devices_platform.connect', $device->id) }}">Test Connection</button>
                                <button class="tdp-btn tdp-btn-warning" type="button" data-action="sync" data-url="{{ route('terminal_devices_platform.sync', $device->id) }}">Sync Device</button>
                                <button class="tdp-btn {{ $device->status === 'active' ? 'tdp-btn-danger' : 'tdp-btn-success' }}" type="button" data-action="toggle" data-url="{{ route('terminal_devices_platform.toggle', $device->id) }}">{{ $device->status === 'active' ? 'Deactivate' : 'Activate' }}</button>
                            </div>
                        </td>
                    </tr>
                @empty
                    <tr><td class="tdp-empty" colspan="8">No terminals found. Use “Add Terminal” to create one.</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>
@endsection

@push('scripts')
<script>
(function () {
    var csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    function formatDate(value) {
        if (!value) return '—';
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0') + ' ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
    }

    function refreshRow(row, device) {
        if (!device) return;
        var statusCell = row.querySelector('[data-field="status"]');
        var toggleButton = row.querySelector('[data-action="toggle"]');
        statusCell.innerHTML = '<span class="tdp-badge ' + device.status + '">' + device.status.charAt(0).toUpperCase() + device.status.slice(1) + '</span>';
        row.querySelector('[data-field="last_active"]').textContent = formatDate(device.last_active);
        row.querySelector('[data-field="last_sync"]').textContent = formatDate(device.last_sync);
        toggleButton.textContent = device.status === 'active' ? 'Deactivate' : 'Activate';
        toggleButton.className = 'tdp-btn ' + (device.status === 'active' ? 'tdp-btn-danger' : 'tdp-btn-success');
    }

    document.querySelectorAll('[data-action]').forEach(function (button) {
        button.addEventListener('click', function () {
            var row = button.closest('tr');
            var originalLabel = button.textContent;
            button.disabled = true;
            button.textContent = 'Working...';

            fetch(button.dataset.url, {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrfToken, 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            }).then(function (response) {
                return response.json().then(function (json) { return { ok: response.ok, json: json }; });
            }).then(function (payload) {
                refreshRow(row, payload.json.device);
                PlatformToast(payload.json.message || 'Action completed.', payload.ok && payload.json.success ? 'success' : 'error');
            }).catch(function () {
                PlatformToast('Unexpected error while contacting the terminal endpoint.', 'error');
            }).finally(function () {
                button.disabled = false;
                if (button.dataset.action !== 'toggle') button.textContent = originalLabel;
            });
        });
    });
})();
</script>
@endpush
