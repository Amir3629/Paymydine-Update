@extends('admin::superadmin_r2.layout')
@section('title','Overview')
@section('page_title','Super Admin')
@section('page_subtitle','Platform overview and tenant operations')
@section('content')
<div class="hero"><div><h2>Platform overview</h2><p>Central view of PayMyDine restaurants and operational readiness.</p></div><a class="btn btn-primary" href="/superadmin/new">+ Create restaurant</a></div>
<div class="stats">
    <div class="stat"><div class="label">Restaurants</div><div class="value">{{ $stats['total'] }}</div><div class="hint">Registered tenants</div></div>
    <div class="stat"><div class="label">Active</div><div class="value">{{ $stats['active'] }}</div><div class="hint">Ready for service</div></div>
    <div class="stat"><div class="label">Needs setup</div><div class="value">{{ $stats['needs_setup'] }}</div><div class="hint">Disabled or incomplete</div></div>
    <div class="stat"><div class="label">Expired</div><div class="value">{{ $stats['expired'] }}</div><div class="hint">End date passed</div></div>
</div>
<div class="card"><div class="card-head"><div><h3>Latest restaurants</h3><p>Most recently registered tenants in the central registry.</p></div><a class="btn btn-soft" href="/superadmin/new">View all</a></div><div class="table-wrap"><table><thead><tr><th>Restaurant</th><th>Domain</th><th>Database</th><th>Plan</th><th>Expiry</th><th>Status</th></tr></thead><tbody>@forelse($latest as $tenant)<tr><td><span class="tenant-name">{{ $tenant->name }}</span><span class="sub">#{{ $tenant->id }}</span></td><td>{{ $tenant->domain }}</td><td>{{ $tenant->database }}</td><td>{{ $tenant->type }}</td><td>{{ $tenant->end }}</td><td><span class="badge {{ $tenant->status === 'active' ? 'ok' : 'bad' }}">{{ $tenant->status }}</span></td></tr>@empty<tr><td colspan="6" class="empty">No restaurants registered.</td></tr>@endforelse</tbody></table></div></div>
@endsection
