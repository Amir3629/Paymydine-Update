@extends('admin::superadmin_r2.layout')
@section('title','Location Requests')
@push('head')
<style>
    .pmd-location-card{padding:20px}.pmd-location-card table{min-width:900px}.pmd-location-card th,.pmd-location-card td{padding:16px 15px}
</style>
@endpush
@section('content')
<div class="hero"><div><h2>Location requests</h2></div></div>
<div class="card pmd-location-card">
    <div class="table-wrap">
        <table>
            <thead><tr><th>ID</th><th>Restaurant</th><th>Request</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
            @forelse($locationRequests as $requestRow)
                <tr><td>#{{ $requestRow->id ?? '-' }}</td><td>{{ $requestRow->tenant_name ?? $requestRow->restaurant_name ?? '-' }}</td><td>{{ $requestRow->description ?? $requestRow->message ?? '-' }}</td><td><span class="badge">{{ $requestRow->status ?? 'pending' }}</span></td><td>{{ $requestRow->created_at ?? '-' }}</td></tr>
            @empty
                <tr><td colspan="5" class="empty">No location requests yet.</td></tr>
            @endforelse
            </tbody>
        </table>
    </div>
</div>
@endsection
