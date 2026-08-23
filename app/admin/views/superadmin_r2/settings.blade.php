@extends('admin::superadmin_r2.layout')
@section('title','Settings')
@push('head')
<style>
    .pmd-settings-shell{width:100%;max-width:none}.pmd-settings-card{width:100%;padding:28px}.pmd-settings-card .field-grid{gap:18px}.pmd-settings-card .field label{font-size:14px}.pmd-settings-card .field input{min-height:54px;font-size:16px}.pmd-settings-actions{grid-column:1/-1;display:flex;justify-content:flex-end;padding-top:8px}.pmd-settings-actions .btn{min-width:180px;min-height:48px;font-size:15px}
    @media(max-width:820px){.pmd-settings-card{padding:20px}.pmd-settings-actions{grid-column:auto}.pmd-settings-actions .btn{width:100%}}
</style>
@endpush
@section('content')
<div class="hero"><div><h2>Platform settings</h2></div></div>
<div class="pmd-settings-shell">
    <div class="card pmd-settings-card">
        <form method="POST" action="https://paymydine.com/superadmin/settings/save">
            @csrf
            <div class="field-grid">
                <div class="field"><label>Company name</label><input name="company_name" value="{{ old('company_name',$superadmin->company_name ?? '') }}" required></div>
                <div class="field"><label>Company website</label><input name="company_website" value="{{ old('company_website',$superadmin->company_website ?? '') }}" required></div>
                <div class="field full"><label>Super Admin email</label><input type="email" name="email" value="{{ old('email',$superadmin->email ?? '') }}" required></div>
                <div class="pmd-settings-actions"><button class="btn btn-primary" type="submit">Save settings</button></div>
            </div>
        </form>
    </div>
</div>
@endsection
