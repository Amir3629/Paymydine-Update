@extends('admin::superadmin_r2.layout')
@section('title','Edit Restaurant')
@section('content')
@push('head')
<style>
    .pmd-edit-shell{max-width:1040px}.pmd-edit-shell .card{padding:22px}.pmd-edit-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:4px}.pmd-edit-actions .btn{min-width:150px}
</style>
@endpush
<div class="hero"><div><h2>{{ $tenant->name }}</h2><p>{{ $tenant->domain }}</p></div><a class="btn btn-soft" href="/superadmin/new">Back to restaurants</a></div>
<div class="pmd-edit-shell"><div class="card"><form method="POST" action="/superadmin/tenants/update">@csrf<input type="hidden" name="id" value="{{ $tenant->id }}"><input type="hidden" name="type" value="{{ old('type',$tenant->type ?: 'People') }}"><div class="field-grid"><div class="field"><label>Restaurant name</label><input name="name" value="{{ old('name',$tenant->name) }}" required></div><div class="field"><label>Email</label><input type="email" name="email" value="{{ old('email',$tenant->email) }}" required></div><div class="field"><label>Phone</label><input name="phone" value="{{ old('phone',$tenant->phone) }}" required></div><div class="field"><label>Country</label><input name="country" value="{{ old('country',$tenant->country) }}" required></div><div class="field"><label>Start date</label><input type="date" name="start" value="{{ old('start',$tenant->start) }}" required></div><div class="field"><label>End date</label><input type="date" name="end" value="{{ old('end',$tenant->end) }}" required></div><div class="field full"><label>Description</label><textarea name="description">{{ old('description',$tenant->description) }}</textarea></div><div class="field full pmd-edit-actions"><button class="btn btn-primary" type="submit">Save restaurant</button></div></div></form></div></div>
@endsection
