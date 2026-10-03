@extends('admin::superadmin_r2.layout')
@section('title','Settings')
@section('page_title','Settings')
@section('page_subtitle','Central Super Admin profile and platform identity')
@section('content')
<div class="hero"><div><h2>Platform settings</h2><p>These values belong to the central Super Admin record, not to any restaurant tenant.</p></div></div>
<div class="card" style="max-width:760px"><form method="POST" action="https://paymydine.com/superadmin/settings/save">@csrf<div class="field-grid"><div class="field full"><label>Company name</label><input name="company_name" value="{{ old('company_name',$superadmin->company_name ?? '') }}" required></div><div class="field full"><label>Company website</label><input name="company_website" value="{{ old('company_website',$superadmin->company_website ?? '') }}" required></div><div class="field full"><label>Super Admin email</label><input type="email" name="email" value="{{ old('email',$superadmin->email ?? '') }}" required></div><div class="field full"><button class="btn btn-primary" type="submit">Save settings</button></div></div></form></div>
@endsection
