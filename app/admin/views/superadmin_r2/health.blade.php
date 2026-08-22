@extends('admin::superadmin_r2.layout')
@section('title','Tenant Health')
@section('page_title','Tenant Health')
@section('page_subtitle','Database, DNS, TLS and subscription visibility')
@section('content')
<div class="hero"><div><h2>Tenant health</h2><p>Read-only health view for every registered restaurant.</p></div></div>
<div class="card"><div class="table-wrap"><table><thead><tr><th>Restaurant</th><th>Database</th><th>DNS</th><th>TLS</th><th>Subscription</th><th>Registry status</th></tr></thead><tbody>@forelse($rows as $row)<tr><td><span class="tenant-name">{{ $row->tenant->name }}</span><span class="sub">{{ $row->tenant->domain }}</span></td><td><span class="health-dot {{ $row->db_ok?'ok':'bad' }}"></span> {{ $row->db_ok?'Ready':'Missing' }}<span class="sub">{{ $row->tenant->database }}</span></td><td><span class="health-dot {{ $row->dns_ok?'ok':'bad' }}"></span> {{ $row->dns_ok?'Resolved':'Missing' }}@if($row->resolved_ip)<span class="sub">{{ $row->resolved_ip }}</span>@endif</td><td><span class="health-dot {{ $row->tls_ok?'ok':'bad' }}"></span> {{ $row->tls_ok?'Certificate present':'Certificate missing' }}</td><td><span class="badge {{ $row->expired?'bad':'ok' }}">{{ $row->expired?'Expired':'Current' }}</span><span class="sub">Ends {{ $row->tenant->end }}</span></td><td><span class="badge {{ $row->tenant->status==='active'?'ok':($row->tenant->status==='provisioning'?'warn':'bad') }}">{{ $row->tenant->status }}</span></td></tr>@empty<tr><td colspan="6" class="empty">No tenants registered.</td></tr>@endforelse</tbody></table></div></div>
@endsection
