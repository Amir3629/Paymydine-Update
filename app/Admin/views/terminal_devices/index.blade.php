@extends('layouts.simple')

@section('title','Terminal Devices')

@section('main')
<table class="table table-striped">
<thead>
<tr>
<th>Name</th>
<th>IP Address</th>
<th>Status</th>
<th>Last Active</th>
</tr>
</thead>
<tbody>
@foreach ($devices as $device)
<tr>
<td>{{ $device->name }}</td>
<td>{{ $device->ip_address ?? 'N/A' }}</td>
<td>{{ $device->status ?? 'inactive' }}</td>
<td>{{ $device->last_active ?? 'N/A' }}</td>
</tr>
@endforeach
</tbody>
</table>
@endsection