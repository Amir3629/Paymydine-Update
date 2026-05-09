@extends('layouts.platform')

@section('title', $title.' | Terminal Devices Platform')
@section('page-title', $title)

@push('styles')
<style>
    .tdp-form { max-width: 880px; padding: 22px; }
    .tdp-form-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:16px; }
    .tdp-field label { display:block; font-weight:800; color:#374151; margin-bottom:7px; }
    .tdp-field input, .tdp-field select { width:100%; border:1px solid #d1d5db; border-radius:10px; padding:11px 12px; min-height:44px; }
    .tdp-field.full { grid-column:1 / -1; }
    .tdp-error { color:#b91c1c; font-size:13px; margin-top:5px; }
    .tdp-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:22px; }
    .tdp-btn { display:inline-flex; align-items:center; justify-content:center; border:0; border-radius:10px; padding:10px 14px; font-weight:800; text-decoration:none; cursor:pointer; }
    .tdp-btn-primary { background:#2563eb; color:#fff; }
    .tdp-btn-secondary { background:#f3f4f6; color:#374151; }
    @media (max-width: 760px) { .tdp-form-grid { grid-template-columns:1fr; } }
</style>
@endpush

@section('main')
    <form class="platform-card tdp-form" method="POST" action="{{ $formAction }}">
        @csrf
        <div class="tdp-form-grid">
            <div class="tdp-field">
                <label for="name">Terminal Name *</label>
                <input id="name" name="name" value="{{ old('name', $device->name) }}" required placeholder="Front Counter SumUp 01">
                @error('name') <div class="tdp-error">{{ $message }}</div> @enderror
            </div>
            <div class="tdp-field">
                <label for="ip_address">IP Address</label>
                <input id="ip_address" name="ip_address" value="{{ old('ip_address', $device->ip_address) }}" placeholder="192.168.10.21">
                @error('ip_address') <div class="tdp-error">{{ $message }}</div> @enderror
            </div>
            <div class="tdp-field">
                <label for="model">Model</label>
                <input id="model" name="model" value="{{ old('model', $device->model) }}" placeholder="SumUp Solo">
                @error('model') <div class="tdp-error">{{ $message }}</div> @enderror
            </div>
            <div class="tdp-field">
                <label for="location">Location</label>
                <input id="location" name="location" value="{{ old('location', $device->location) }}" placeholder="Front Counter">
                @error('location') <div class="tdp-error">{{ $message }}</div> @enderror
            </div>
            <div class="tdp-field">
                <label for="status">Status *</label>
                <select id="status" name="status" required>
                    @foreach ($statusOptions as $value => $label)
                        <option value="{{ $value }}" {{ old('status', $device->status) === $value ? 'selected' : '' }}>{{ $label }}</option>
                    @endforeach
                </select>
                @error('status') <div class="tdp-error">{{ $message }}</div> @enderror
            </div>
            <div class="tdp-field">
                <label for="connection_type">Connection Type *</label>
                <select id="connection_type" name="connection_type" required>
                    @foreach ($connectionTypeOptions as $value => $label)
                        <option value="{{ $value }}" {{ old('connection_type', $device->connection_type) === $value ? 'selected' : '' }}>{{ $label }}</option>
                    @endforeach
                </select>
                @error('connection_type') <div class="tdp-error">{{ $message }}</div> @enderror
            </div>
            <div class="tdp-field">
                <label for="last_active">Last Active</label>
                <input id="last_active" type="datetime-local" name="last_active" value="{{ old('last_active', optional($device->last_active)->format('Y-m-d\TH:i')) }}">
                @error('last_active') <div class="tdp-error">{{ $message }}</div> @enderror
            </div>
            <div class="tdp-field">
                <label for="last_sync">Last Sync</label>
                <input id="last_sync" type="datetime-local" name="last_sync" value="{{ old('last_sync', optional($device->last_sync)->format('Y-m-d\TH:i')) }}">
                @error('last_sync') <div class="tdp-error">{{ $message }}</div> @enderror
            </div>
        </div>
        <div class="tdp-actions">
            <a class="tdp-btn tdp-btn-secondary" href="{{ route('terminal_devices_platform.index') }}">Cancel</a>
            <button class="tdp-btn tdp-btn-primary" type="submit">Save Terminal</button>
        </div>
    </form>
@endsection
