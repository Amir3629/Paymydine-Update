@extends('admin::superadmin_r2.layout')
@section('title','Status')
@section('content')
<div class="hero"><div><h2>Status</h2></div></div>
<div class="card"><div class="table-wrap"><table><thead><tr><th>Restaurant</th><th>Database</th><th>DNS</th><th>TLS</th><th>Subscription</th><th>Status</th><th>Recovery</th></tr></thead><tbody>
@forelse($rows as $row)
<tr>
    <td><span class="tenant-name">{{ $row->tenant->name }}</span><span class="sub">{{ $row->tenant->domain }}</span></td>
    <td><span class="health-dot {{ $row->db_ok?'ok':'bad' }}"></span> {{ $row->db_ok?'Ready':'Missing' }}</td>
    <td><span class="health-dot {{ $row->dns_ok?'ok':'bad' }}"></span> {{ $row->dns_ok?'Resolved':'Missing' }}@if($row->resolved_ip)<span class="sub">{{ $row->resolved_ip }}</span>@endif</td>
    <td><span class="health-dot {{ $row->tls_ok?'ok':'bad' }}"></span> {{ $row->tls_ok?'Valid for restaurant':'Missing / wrong certificate' }}@if($row->tls_name)<span class="sub">Served: {{ $row->tls_name }}</span>@endif @if($row->tls_expires)<span class="sub">Expires {{ $row->tls_expires }}</span>@endif</td>
    <td><span class="badge {{ $row->expired?'bad':'ok' }}">{{ $row->expired?'Expired':'Current' }}</span><span class="sub">Ends {{ $row->tenant->end }}</span></td>
    <td><span class="badge {{ $row->tenant->status==='active'?'ok':'bad' }}">{{ $row->tenant->status }}</span></td>
    <td>@if(!$row->ready)<form method="POST" action="/superadmin/tenants/provision">@csrf<input type="hidden" name="id" value="{{ $row->tenant->id }}"><button class="btn btn-soft" type="submit">Retry provisioning</button></form>@else<span class="badge ok">Healthy</span>@endif</td>
</tr>
@empty<tr><td colspan="7" class="empty">No restaurants registered.</td></tr>@endforelse
</tbody></table></div></div>
@endsection
