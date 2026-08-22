@extends('admin::superadmin_r2.layout')
@section('title','Location Requests')
@section('page_title','Location Requests')
@section('page_subtitle','Central requests for additional restaurant locations')
@section('content')
<div class="hero"><div><h2>Location requests</h2><p>This section remains read-only until a central location_requests table is configured.</p></div></div>
<div class="card"><div class="table-wrap"><table><thead><tr><th>ID</th><th>Restaurant</th><th>Request</th><th>Status</th><th>Created</th></tr></thead><tbody>@forelse($locationRequests as $requestRow)<tr><td>#{{ $requestRow->id ?? '-' }}</td><td>{{ $requestRow->tenant_name ?? $requestRow->restaurant_name ?? '-' }}</td><td>{{ $requestRow->description ?? $requestRow->message ?? '-' }}</td><td><span class="badge">{{ $requestRow->status ?? 'pending' }}</span></td><td>{{ $requestRow->created_at ?? '-' }}</td></tr>@empty<tr><td colspan="5" class="empty">No location requests are configured yet.</td></tr>@endforelse</tbody></table></div></div>
@endsection
