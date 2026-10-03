@extends('admin::superadmin_r2.layout')
@section('title','Restaurants')
@section('page_title','Restaurants')
@section('page_subtitle','Create, review and manage PayMyDine tenants')

@push('head')
<style>
    .pmd-tenant-hero{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:6px 0 16px}
    .pmd-tenant-hero h2{font-size:28px;margin:0 0 5px}.pmd-tenant-hero p{margin:0;color:var(--muted);font-size:13px}
    .pmd-registry-card{padding:16px}
    .pmd-registry-toolbar{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin-bottom:12px}
    .pmd-registry-toolbar .card-head{margin:0}
    .pmd-registry-toolbar .filters{justify-content:flex-end}
    .pmd-registry-table table{min-width:980px}
    .pmd-registry-table th,.pmd-registry-table td{padding:12px 12px}
    .pmd-registry-table th:nth-child(4),.pmd-registry-table th:nth-child(5),
    .pmd-registry-table td:nth-child(4),.pmd-registry-table td:nth-child(5){white-space:nowrap;width:92px}
    .tenant-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap;min-width:230px}
    .tenant-actions form{margin:0}.tenant-status-form{display:flex;align-items:center;gap:6px}
    .tenant-status-form select{min-height:36px;border:1px solid #dfe9e5;border-radius:10px;padding:7px 9px;background:#fff;color:var(--ink)}
    .pmd-modal[hidden]{display:none!important}
    .pmd-modal{position:fixed;inset:0;z-index:13050;display:grid;place-items:center;padding:22px;background:rgba(4,20,17,.32);backdrop-filter:blur(7px)}
    .pmd-modal-card{width:min(720px,calc(100vw - 32px));max-height:min(88vh,840px);overflow:auto;background:#fff;border:1px solid var(--line);border-radius:22px;box-shadow:0 24px 70px rgba(5,32,27,.2)}
    .pmd-modal-head{position:sticky;top:0;z-index:2;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px 20px 15px;background:#fff;border-bottom:1px solid #edf2f0}
    .pmd-modal-head h3{margin:0;font-size:18px}.pmd-modal-head p{margin:5px 0 0;color:var(--muted);font-size:11px;max-width:540px;line-height:1.45}
    .pmd-modal-close{display:grid;place-items:center;flex:0 0 38px;width:38px;height:38px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--ink);cursor:pointer;font-size:22px;line-height:1}
    .pmd-modal-body{padding:18px 20px 20px}.pmd-modal-body .field-grid{gap:12px 14px}.pmd-modal-body .field textarea{min-height:78px}
    .pmd-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;padding-top:15px;border-top:1px solid #edf2f0}
    body.pmd-modal-open{overflow:hidden}
    @media(max-width:980px){.pmd-registry-toolbar{align-items:flex-start;flex-direction:column}.pmd-registry-toolbar .filters{justify-content:flex-start}}
    @media(max-width:820px){.pmd-tenant-hero{align-items:flex-start}.pmd-modal{padding:10px}.pmd-modal-card{width:100%;max-height:94vh;border-radius:20px}.pmd-modal-body .field-grid{grid-template-columns:1fr}.pmd-modal-body .field.full{grid-column:auto}}
    @media(max-width:560px){.pmd-tenant-hero{flex-direction:column}.pmd-tenant-hero .btn{width:100%}.pmd-registry-toolbar .filters{width:100%}.pmd-registry-toolbar .filters input{flex:1;min-width:160px}}
</style>
@endpush

@section('content')
<div class="pmd-tenant-hero">
    <div>
        <h2>Restaurants</h2>
        <p>Central tenant registry and onboarding.</p>
    </div>
    <button class="btn btn-primary" type="button" data-pmd-open-create>+ Create restaurant</button>
</div>

<div class="card pmd-registry-card">
    <div class="pmd-registry-toolbar">
        <div class="card-head">
            <div>
                <h3>Restaurant registry</h3>
                <p>Search by name, domain, database or email.</p>
            </div>
        </div>
        <form class="filters" method="GET" action="/superadmin/new">
            <input name="q" value="{{ $search }}" placeholder="Search restaurants">
            <select name="status">
                <option value="">All statuses</option>
                <option value="active" {{ $status==='active'?'selected':'' }}>Active</option>
                <option value="disabled" {{ $status==='disabled'?'selected':'' }}>Disabled</option>
                <option value="removed" {{ $status==='removed'?'selected':'' }}>Removed</option>
            </select>
            <button class="btn btn-soft" type="submit">Filter</button>
        </form>
    </div>

    <div class="table-wrap pmd-registry-table">
        <table>
            <thead>
                <tr>
                    <th>Restaurant</th>
                    <th>Domain</th>
                    <th>Database</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
            @forelse($tenants as $tenant)
                <tr>
                    <td><span class="tenant-name">{{ $tenant->name }}</span><span class="sub">{{ $tenant->email }}</span></td>
                    <td>{{ $tenant->domain }}</td>
                    <td>{{ $tenant->database }}</td>
                    <td>{{ $tenant->start }}</td>
                    <td>{{ $tenant->end }}</td>
                    <td><span class="badge {{ $tenant->status==='active'?'ok':($tenant->status==='removed'?'warn':'bad') }}">{{ $tenant->status }}</span></td>
                    <td>
                        <div class="tenant-actions">
                            @if($tenant->status==='removed')
                                <form method="POST" action="/superadmin/tenants/restore">
                                    @csrf
                                    <input type="hidden" name="id" value="{{ $tenant->id }}">
                                    <button class="btn btn-soft" type="submit">Restore</button>
                                </form>
                            @else
                                <a class="btn btn-soft" href="/superadmin/tenants/{{ $tenant->id }}/edit">Edit</a>
                                <form class="tenant-status-form" method="POST" action="/superadmin/tenants/status">
                                    @csrf
                                    <input type="hidden" name="id" value="{{ $tenant->id }}">
                                    <select name="status" aria-label="Tenant status">
                                        <option value="active" {{ $tenant->status==='active'?'selected':'' }}>Active</option>
                                        <option value="disabled" {{ $tenant->status==='disabled'?'selected':'' }}>Disabled</option>
                                    </select>
                                    <button class="btn btn-soft" type="submit">Save</button>
                                </form>
                                @if($tenant->status==='disabled')
                                    <form method="POST" action="/superadmin/tenants/remove" onsubmit="return confirm('Remove {{ addslashes($tenant->name) }} from service? The tenant stays offline and its database is retained for recovery.')">
                                        @csrf
                                        <input type="hidden" name="id" value="{{ $tenant->id }}">
                                        <button class="btn btn-danger" type="submit">Remove</button>
                                    </form>
                                @endif
                            @endif
                        </div>
                    </td>
                </tr>
            @empty
                <tr><td colspan="7" class="empty">No tenants found.</td></tr>
            @endforelse
            </tbody>
        </table>
    </div>
    <div style="margin-top:12px">{{ $tenants->links() }}</div>
</div>

<div class="pmd-modal" data-pmd-create-modal hidden aria-hidden="true">
    <div class="pmd-modal-card" role="dialog" aria-modal="true" aria-labelledby="pmd-create-title">
        <div class="pmd-modal-head">
            <div>
                <h3 id="pmd-create-title">Create restaurant</h3>
                <p>Creates a clean tenant database, applies the PayMyDine identity baseline and provisions its subdomain/TLS.</p>
            </div>
            <button class="pmd-modal-close" type="button" data-pmd-close-create aria-label="Close">×</button>
        </div>
        <div class="pmd-modal-body">
            <form method="POST" action="/superadmin/new/store">
                @csrf
                <div class="field-grid">
                    <div class="field"><label>Restaurant name</label><input name="name" value="{{ old('name') }}" required></div>
                    <div class="field"><label>Tenant subdomain</label><input name="domain" value="{{ old('domain') }}" placeholder="restaurant" autocomplete="off" required><span class="sub">Use <strong>restaurant</strong> or <strong>restaurant.paymydine.com</strong>.</span></div>
                    <div class="field"><label>Database</label><input name="database" value="{{ old('database') }}" placeholder="restaurant" required></div>
                    <div class="field"><label>Email</label><input type="email" name="email" value="{{ old('email') }}" required></div>
                    <div class="field"><label>Phone</label><input name="phone" value="{{ old('phone') }}" required></div>
                    <div class="field"><label>Country</label><input name="country" value="{{ old('country','Germany') }}" required></div>
                    <div class="field"><label>Start date</label><input type="date" name="start" value="{{ old('start',now()->toDateString()) }}" required></div>
                    <div class="field"><label>End date</label><input type="date" name="end" value="{{ old('end',now()->addYear()->toDateString()) }}" required></div>
                    <div class="field"><label>Plan / type</label><input name="type" value="{{ old('type','People') }}" required></div>
                    <div class="field full"><label>Description</label><textarea name="description">{{ old('description') }}</textarea></div>
                </div>
                <div class="pmd-modal-actions">
                    <button class="btn btn-soft" type="button" data-pmd-close-create>Cancel</button>
                    <button class="btn btn-primary" type="submit">Create restaurant</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
(function(){
    var modal=document.querySelector('[data-pmd-create-modal]');
    if(!modal)return;
    function openModal(){modal.hidden=false;modal.setAttribute('aria-hidden','false');document.body.classList.add('pmd-modal-open');setTimeout(function(){var input=modal.querySelector('input[name="name"]');if(input)input.focus();},0)}
    function closeModal(){modal.hidden=true;modal.setAttribute('aria-hidden','true');document.body.classList.remove('pmd-modal-open')}
    document.addEventListener('click',function(e){
        if(e.target.closest('[data-pmd-open-create]')){e.preventDefault();openModal();return}
        if(e.target.closest('[data-pmd-close-create]')){e.preventDefault();closeModal();return}
        if(e.target===modal)closeModal();
    });
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!modal.hidden)closeModal()});
    @if(old('domain') || old('database') || old('email')) openModal(); @endif
})();
</script>
@endpush
