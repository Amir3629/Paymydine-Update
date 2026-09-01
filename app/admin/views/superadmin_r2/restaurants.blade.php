@extends('admin::superadmin_r2.layout')
@section('title','Restaurants')

@php
    $pmdPlatformProfiles = app(\App\Services\Platform\CountryPlatformProfileRegistry::class);
    $pmdCountryOptions = $pmdPlatformProfiles->countryOptions();
    $pmdMarketProfiles = $pmdPlatformProfiles->publicProfiles();
    $pmdCreateCountry = $pmdPlatformProfiles->normalizeCountry(old('_pmd_form') === 'create' ? old('country','DE') : 'DE');
    if (!isset($pmdCountryOptions[$pmdCreateCountry])) $pmdCreateCountry = 'DE';
@endphp

@push('head')
<style>
    .pmd-tenant-hero{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 18px}
    .pmd-tenant-hero h2{font-size:32px;line-height:1.08;margin:0}
    .pmd-registry-card{padding:18px}
    .pmd-registry-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}
    .pmd-registry-toolbar .card-head{margin:0}.pmd-registry-toolbar .card-head h3{font-size:19px}
    .pmd-registry-toolbar .filters{justify-content:flex-end}
    .pmd-registry-table table{min-width:1160px}.pmd-registry-table th,.pmd-registry-table td{padding:16px 14px}
    .pmd-registry-table th:nth-child(4),.pmd-registry-table th:nth-child(5),.pmd-registry-table td:nth-child(4),.pmd-registry-table td:nth-child(5){white-space:nowrap;width:110px}
    .tenant-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap;min-width:340px}
    .tenant-actions form{margin:0}.tenant-status-form{display:flex;align-items:center;gap:8px}
    .tenant-status-form select{height:44px;min-width:118px;border:1px solid #d6e4df;border-radius:11px;padding:0 12px;background:#fff;color:var(--ink);font-size:14px}
    .tenant-actions .btn{min-height:44px;padding:10px 17px;font-size:14px}
    .pmd-pagination{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:16px;flex-wrap:wrap}
    .pmd-page-summary{font-size:13px;color:var(--muted);font-weight:700}
    .pmd-page-links{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.pmd-page-link{min-width:40px;height:40px;padding:0 12px;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:10px;background:#fff;color:#36534b;font-size:13px;font-weight:800}.pmd-page-link:hover{background:#eef5f2}.pmd-page-link.active{border-color:#123d32;background:#123d32;color:#fff}.pmd-page-link.disabled{opacity:.45;pointer-events:none}
    .pmd-modal[hidden]{display:none!important}.pmd-modal{position:fixed;inset:0;z-index:13050;display:grid;place-items:center;padding:22px;background:rgba(4,20,17,.32);backdrop-filter:blur(7px)}
    .pmd-modal-card{width:min(820px,calc(100vw - 32px));max-height:min(92vh,900px);overflow:auto;background:#fff;border:1px solid var(--line);border-radius:22px;box-shadow:0 24px 70px rgba(5,32,27,.2)}
    .pmd-modal-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 22px;background:#fff;border-bottom:1px solid #edf2f0}
    .pmd-modal-head h3{margin:0;font-size:22px}.pmd-modal-close{display:grid;place-items:center;flex:0 0 42px;width:42px;height:42px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--ink);cursor:pointer;font-size:24px;line-height:1}
    .pmd-modal-body{padding:22px}.pmd-modal-body .field-grid{gap:15px 16px;align-items:start}.pmd-modal-body .field{align-content:start}.pmd-modal-body .field input,.pmd-modal-body .field select{height:50px;min-height:50px}.pmd-modal-body .field textarea{min-height:105px}
    .pmd-domain-control{width:100%;height:50px;display:flex;align-items:center;overflow:hidden;border:1px solid #d8e5e0;border-radius:12px;background:#fff;transition:border-color .15s ease,box-shadow .15s ease}
    .pmd-domain-control:focus-within{border-color:#67a391;box-shadow:0 0 0 3px rgba(44,111,89,.10)}
    .pmd-domain-control input{flex:1 1 auto;min-width:0;width:auto!important;height:48px!important;min-height:48px!important;border:0!important;border-radius:0!important;padding:11px 4px 11px 13px!important;box-shadow:none!important;outline:0!important;background:transparent!important}
    .pmd-domain-control input:focus{border:0!important;box-shadow:none!important}
    .pmd-domain-suffix{flex:0 0 auto;padding:0 13px 0 3px;color:#526961;font-size:14px;font-weight:800;white-space:nowrap;user-select:none}
    .pmd-modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px;padding-top:17px;border-top:1px solid #edf2f0}.pmd-modal-actions .btn{min-width:132px}
    .pmd-edit-domain{display:flex;align-items:center;height:50px;padding:0 14px;border:1px solid #e0ebe7;border-radius:12px;background:#f7faf9;color:#667a73;font-size:14px;font-weight:700}
    .pmd-market-cell{display:flex;flex-direction:column;gap:3px}.pmd-market-cell strong{font-size:14px}.pmd-market-cell span{font-size:12px;color:var(--muted);white-space:nowrap}
    .pmd-market-preview{grid-column:1/-1;border:1px solid #dfeae6;border-radius:16px;background:#f8fbfa;padding:16px 17px}
    .pmd-market-preview-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.pmd-market-preview-head strong{font-size:15px}.pmd-market-code{font-size:12px;font-weight:800;color:#2d6655;background:#e7f2ee;border-radius:999px;padding:5px 9px}
    .pmd-market-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.pmd-market-item{padding:10px 11px;border:1px solid #e8efec;border-radius:11px;background:#fff}.pmd-market-item b{display:block;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#73857f;margin-bottom:4px}.pmd-market-item span{font-size:13px;color:#24443a;line-height:1.45}
    body.pmd-modal-open{overflow:hidden}
    @media(max-width:1000px){.pmd-registry-toolbar{align-items:flex-start;flex-direction:column}.pmd-registry-toolbar .filters{justify-content:flex-start}.tenant-actions{min-width:300px}}
    @media(max-width:820px){.pmd-tenant-hero{align-items:flex-start}.pmd-modal{padding:10px}.pmd-modal-card{width:100%;max-height:94vh;border-radius:20px}.pmd-modal-body .field-grid{grid-template-columns:1fr}.pmd-modal-body .field.full,.pmd-market-preview{grid-column:auto}.pmd-market-grid{grid-template-columns:1fr}}
    @media(max-width:560px){.pmd-tenant-hero{flex-direction:column}.pmd-tenant-hero .btn{width:100%}.pmd-registry-toolbar .filters{width:100%}.pmd-registry-toolbar .filters input{flex:1;min-width:160px}.pmd-pagination{align-items:flex-start;flex-direction:column}.pmd-domain-suffix{font-size:13px;padding-right:10px}}
</style>
@endpush

@section('content')
<div class="pmd-tenant-hero">
    <h2>Restaurants</h2>
    <button class="btn btn-primary" type="button" data-pmd-open-create>+ Create restaurant</button>
</div>

<div class="card pmd-registry-card">
    <div class="pmd-registry-toolbar">
        <div class="card-head"><div><h3>Restaurant registry</h3></div></div>
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
            <thead><tr><th>Restaurant</th><th>Domain</th><th>Market</th><th>From</th><th>To</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
            @forelse($tenants as $tenant)
                @php $pmdTenantProfile = $pmdPlatformProfiles->profile($tenant->country ?? ''); @endphp
                <tr>
                    <td><span class="tenant-name">{{ $tenant->name }}</span><span class="sub">{{ $tenant->email }}</span></td>
                    <td>{{ $tenant->domain }}</td>
                    <td>
                        <div class="pmd-market-cell">
                            <strong>{{ $pmdTenantProfile['country_name'] ?? ($tenant->country ?: 'Unresolved') }}</strong>
                            @if($pmdTenantProfile)
                                <span>{{ $pmdTenantProfile['currency']['code'] }} · {{ $pmdTenantProfile['timezone'] }}</span>
                            @else
                                <span>Profile not configured</span>
                            @endif
                        </div>
                    </td>
                    <td>{{ $tenant->start }}</td>
                    <td>{{ $tenant->end }}</td>
                    <td><span class="badge {{ $tenant->status==='active'?'ok':($tenant->status==='removed'?'warn':'bad') }}">{{ $tenant->status }}</span></td>
                    <td>
                        <div class="tenant-actions">
                            @if($tenant->status==='removed')
                                <form method="POST" action="/superadmin/tenants/restore">@csrf<input type="hidden" name="id" value="{{ $tenant->id }}"><button class="btn btn-soft" type="submit">Restore</button></form>
                            @else
                                <button
                                    class="btn btn-soft"
                                    type="button"
                                    data-pmd-open-edit
                                    data-id="{{ $tenant->id }}"
                                    data-name="{{ $tenant->name }}"
                                    data-domain="{{ $tenant->domain }}"
                                    data-email="{{ $tenant->email }}"
                                    data-phone="{{ $tenant->phone }}"
                                    data-country="{{ $tenant->country }}"
                                    data-start="{{ $tenant->start }}"
                                    data-end="{{ $tenant->end }}"
                                    data-type="{{ $tenant->type ?: 'People' }}"
                                    data-description="{{ $tenant->description }}"
                                >Edit</button>
                                {{-- PMD_SUPERADMIN_OWNER_PORTAL_MFA_RESET_V1 --}}
                                <form
                                    method="POST"
                                    action="/superadmin/tenants/reset-owner-portal-mfa"
                                    onsubmit="return confirm('Reset the Owner Portal Authenticator for this restaurant? The old Authenticator and all Portal recovery codes will stop working. The Owner must sign in with their password and enroll a new QR.');"
                                >
                                    @csrf
                                    <input type="hidden" name="id" value="{{ $tenant->id }}">
                                    <input type="hidden" name="confirmation" value="reset-owner-portal-mfa">
                                    <button class="btn btn-soft" type="submit" title="Support emergency recovery only">Reset Owner MFA</button>
                                </form>
                                <form class="tenant-status-form" method="POST" action="/superadmin/tenants/status">
                                    @csrf<input type="hidden" name="id" value="{{ $tenant->id }}">
                                    <select name="status" aria-label="Restaurant status"><option value="active" {{ $tenant->status==='active'?'selected':'' }}>Active</option><option value="disabled" {{ $tenant->status==='disabled'?'selected':'' }}>Disabled</option></select>
                                    <button class="btn btn-soft" type="submit">Save</button>
                                </form>
                                @if($tenant->status==='disabled')
                                    <form method="POST" action="/superadmin/tenants/remove" onsubmit="return confirm('Remove {{ addslashes($tenant->name) }} from service? The restaurant stays offline and its database is retained for recovery.')">@csrf<input type="hidden" name="id" value="{{ $tenant->id }}"><button class="btn btn-danger" type="submit">Remove</button></form>
                                @endif
                            @endif
                        </div>
                    </td>
                </tr>
            @empty
                <tr><td colspan="7" class="empty">No restaurants found.</td></tr>
            @endforelse
            </tbody>
        </table>
    </div>

    @if($tenants->total() > 0)
        <div class="pmd-pagination">
            <div class="pmd-page-summary">Showing {{ $tenants->firstItem() }}–{{ $tenants->lastItem() }} of {{ $tenants->total() }} restaurants</div>
            @if($tenants->lastPage() > 1)
                <nav class="pmd-page-links" aria-label="Restaurant pages">
                    <a class="pmd-page-link {{ $tenants->onFirstPage() ? 'disabled' : '' }}" href="{{ $tenants->previousPageUrl() ?: '#' }}">Previous</a>
                    @for($page = 1; $page <= $tenants->lastPage(); $page++)
                        <a class="pmd-page-link {{ $page === $tenants->currentPage() ? 'active' : '' }}" href="{{ $tenants->url($page) }}" @if($page === $tenants->currentPage()) aria-current="page" @endif>{{ $page }}</a>
                    @endfor
                    <a class="pmd-page-link {{ $tenants->hasMorePages() ? '' : 'disabled' }}" href="{{ $tenants->nextPageUrl() ?: '#' }}">Next</a>
                </nav>
            @endif
        </div>
    @endif
</div>

<div class="pmd-modal" data-pmd-create-modal hidden aria-hidden="true">
    <div class="pmd-modal-card" role="dialog" aria-modal="true" aria-labelledby="pmd-create-title">
        <div class="pmd-modal-head">
            <h3 id="pmd-create-title">Create a new restaurant</h3>
            <button class="pmd-modal-close" type="button" data-pmd-close-create aria-label="Close">×</button>
        </div>
        <div class="pmd-modal-body">
            <form method="POST" action="/superadmin/new/store" data-pmd-create-form>
                @csrf
                <input type="hidden" name="_pmd_form" value="create">
                <input type="hidden" name="database" value="{{ old('database') }}" data-pmd-database>
                <input type="hidden" name="domain" value="{{ old('domain') }}" data-pmd-domain>
                <input type="hidden" name="type" value="{{ old('type','People') }}">
                <div class="field-grid">
                    <div class="field"><label>Restaurant name</label><input name="name" value="{{ old('_pmd_form') === 'create' ? old('name') : '' }}" required data-pmd-restaurant-name></div>
                    <div class="field">
                        <label>Restaurant subdomain</label>
                        <div class="pmd-domain-control">
                            <input type="text" value="{{ old('_pmd_form') === 'create' ? preg_replace('/\.paymydine\.com$/i', '', old('domain','')) : '' }}" placeholder="restaurant" autocomplete="off" autocapitalize="none" spellcheck="false" required data-pmd-domain-slug aria-label="Restaurant subdomain">
                            <span class="pmd-domain-suffix">.paymydine.com</span>
                        </div>
                    </div>
                    <div class="field"><label>Email</label><input type="email" name="email" value="{{ old('_pmd_form') === 'create' ? old('email') : '' }}" required></div>
                    <div class="field"><label>Phone</label><input name="phone" value="{{ old('_pmd_form') === 'create' ? old('phone') : '' }}" required></div>
                    <div class="field">
                        <label>Country / platform market</label>
                        <select name="country" required data-pmd-market-country>
                            @foreach($pmdCountryOptions as $code => $label)
                                <option value="{{ $code }}" {{ $pmdCreateCountry === $code ? 'selected' : '' }}>{{ $label }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div class="field"><label>Start date</label><input type="date" name="start" value="{{ old('_pmd_form') === 'create' ? old('start',now()->toDateString()) : now()->toDateString() }}" required></div>
                    <div class="field"><label>End date</label><input type="date" name="end" value="{{ old('_pmd_form') === 'create' ? old('end',now()->addYear()->toDateString()) : now()->addYear()->toDateString() }}" required></div>
                    <div class="field full"><label>Description</label><textarea name="description">{{ old('_pmd_form') === 'create' ? old('description') : '' }}</textarea></div>
                    <div class="pmd-market-preview" data-pmd-market-preview></div>
                </div>
                <div class="pmd-modal-actions"><button class="btn btn-soft" type="button" data-pmd-close-create>Cancel</button><button class="btn btn-primary" type="submit">Create restaurant</button></div>
            </form>
        </div>
    </div>
</div>

<div class="pmd-modal" data-pmd-edit-modal hidden aria-hidden="true">
    <div class="pmd-modal-card" role="dialog" aria-modal="true" aria-labelledby="pmd-edit-title">
        <div class="pmd-modal-head">
            <h3 id="pmd-edit-title">Edit restaurant</h3>
            <button class="pmd-modal-close" type="button" data-pmd-close-edit aria-label="Close">×</button>
        </div>
        <div class="pmd-modal-body">
            <form method="POST" action="/superadmin/tenants/update" data-pmd-edit-form>
                @csrf
                <input type="hidden" name="_pmd_form" value="edit">
                <input type="hidden" name="id" data-pmd-edit-id>
                <input type="hidden" name="type" value="People" data-pmd-edit-type>
                <div class="field-grid">
                    <div class="field"><label>Restaurant name</label><input name="name" required data-pmd-edit-name></div>
                    <div class="field"><label>Domain</label><div class="pmd-edit-domain" data-pmd-edit-domain></div></div>
                    <div class="field"><label>Email</label><input type="email" name="email" required data-pmd-edit-email></div>
                    <div class="field"><label>Phone</label><input name="phone" required data-pmd-edit-phone></div>
                    <div class="field">
                        <label>Country / platform market</label>
                        <select name="country" required data-pmd-edit-country data-pmd-market-country>
                            @foreach($pmdCountryOptions as $code => $label)
                                <option value="{{ $code }}">{{ $label }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div class="field"><label>Start date</label><input type="date" name="start" required data-pmd-edit-start></div>
                    <div class="field"><label>End date</label><input type="date" name="end" required data-pmd-edit-end></div>
                    <div class="field full"><label>Description</label><textarea name="description" data-pmd-edit-description></textarea></div>
                    <div class="pmd-market-preview" data-pmd-market-preview></div>
                </div>
                <div class="pmd-modal-actions"><button class="btn btn-soft" type="button" data-pmd-close-edit>Cancel</button><button class="btn btn-primary" type="submit">Save restaurant</button></div>
            </form>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
(function(){
    var marketProfiles=@json($pmdMarketProfiles);
    var createModal=document.querySelector('[data-pmd-create-modal]');
    var editModal=document.querySelector('[data-pmd-edit-modal]');
    var createForm=createModal&&createModal.querySelector('[data-pmd-create-form]');
    var nameInput=createModal&&createModal.querySelector('[data-pmd-restaurant-name]');
    var databaseInput=createModal&&createModal.querySelector('[data-pmd-database]');
    var domainInput=createModal&&createModal.querySelector('[data-pmd-domain]');
    var domainSlugInput=createModal&&createModal.querySelector('[data-pmd-domain-slug]');

    function databaseFromName(value){return String(value||'').trim().replace(/[^A-Za-z0-9_]+/g,'_').replace(/^_+|_+$/g,'').slice(0,64)}
    function domainFromSlug(value){return String(value||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/.*$/,'').replace(/\.paymydine\.com$/,'').replace(/[^a-z0-9-]+/g,'-').replace(/-+/g,'-').replace(/^-+|-+$/g,'').slice(0,63)}
    function syncDatabase(){if(nameInput&&databaseInput)databaseInput.value=databaseFromName(nameInput.value)}
    function syncDomain(){if(!domainSlugInput||!domainInput)return;var slug=domainFromSlug(domainSlugInput.value);domainSlugInput.value=slug;domainInput.value=slug?slug+'.paymydine.com':''}
    function setBodyLock(){document.body.classList.toggle('pmd-modal-open',!!document.querySelector('.pmd-modal:not([hidden])'))}
    function openModal(modal,focusTarget){if(!modal)return;modal.hidden=false;modal.setAttribute('aria-hidden','false');setBodyLock();renderMarket(modal);setTimeout(function(){if(focusTarget)focusTarget.focus();},0)}
    function closeModal(modal){if(!modal)return;modal.hidden=true;modal.setAttribute('aria-hidden','true');setBodyLock()}
    function editField(selector){return editModal?editModal.querySelector(selector):null}
    function escapeHtml(value){return String(value==null?'':value).replace(/[&<>'"]/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]})}
    function countryCode(value){
        value=String(value||'').trim().toUpperCase();
        if(marketProfiles[value])return value;
        var found='';Object.keys(marketProfiles).some(function(code){if(String(marketProfiles[code].country_name||'').toUpperCase()===value){found=code;return true}return false});
        return found||'DE';
    }
    function renderMarket(root){
        if(!root)return;var select=root.querySelector('[data-pmd-market-country]');var preview=root.querySelector('[data-pmd-market-preview]');if(!select||!preview)return;
        var code=countryCode(select.value);if(select.value!==code)select.value=code;var p=marketProfiles[code];if(!p){preview.innerHTML='';return}
        var langs=((p.languages&&p.languages.eligible)||[]).map(function(x){return String(x).toUpperCase()}).join(', ');
        var methods=(p.payment_methods||[]).join(', ');
        var providers=(p.payment_providers||[]).map(function(x){return x==='paymob'?'Paymob':(x==='vr_payment'?'VR Payment':x.charAt(0).toUpperCase()+x.slice(1))}).join(', ');
        preview.innerHTML='<div class="pmd-market-preview-head"><strong>'+escapeHtml(p.country_name)+' platform profile</strong><span class="pmd-market-code">'+escapeHtml(code)+'</span></div>'+
            '<div class="pmd-market-grid">'+
            '<div class="pmd-market-item"><b>Timezone</b><span>'+escapeHtml(p.timezone)+'</span></div>'+
            '<div class="pmd-market-item"><b>Currency</b><span>'+escapeHtml(p.currency.code)+' · '+escapeHtml(p.currency.minor_exponent)+' minor decimals</span></div>'+
            '<div class="pmd-market-item"><b>Languages</b><span>'+escapeHtml(langs||'Framework fallback')+'</span></div>'+
            '<div class="pmd-market-item"><b>Payment providers</b><span>'+escapeHtml(providers||'None')+'</span></div>'+
            '<div class="pmd-market-item" style="grid-column:1/-1"><b>Payment methods</b><span>'+escapeHtml(methods||'None')+'</span></div>'+
            '</div>';
    }
    function fillEdit(data){
        var map={'[data-pmd-edit-id]':'id','[data-pmd-edit-name]':'name','[data-pmd-edit-email]':'email','[data-pmd-edit-phone]':'phone','[data-pmd-edit-start]':'start','[data-pmd-edit-end]':'end','[data-pmd-edit-type]':'type','[data-pmd-edit-description]':'description'};
        Object.keys(map).forEach(function(selector){var el=editField(selector);if(el)el.value=data[map[selector]]||''});
        var country=editField('[data-pmd-edit-country]');if(country)country.value=countryCode(data.country);
        var domain=editField('[data-pmd-edit-domain]');if(domain)domain.textContent=data.domain||'';
        var title=editModal&&editModal.querySelector('#pmd-edit-title');if(title)title.textContent=data.name?'Edit '+data.name:'Edit restaurant';
        renderMarket(editModal);
    }

    if(nameInput)nameInput.addEventListener('input',syncDatabase);
    if(domainSlugInput){domainSlugInput.addEventListener('input',syncDomain);domainSlugInput.addEventListener('blur',syncDomain)}
    if(createForm)createForm.addEventListener('submit',function(){syncDatabase();syncDomain()});
    document.querySelectorAll('[data-pmd-market-country]').forEach(function(select){select.addEventListener('change',function(){renderMarket(select.closest('.pmd-modal'))})});

    document.addEventListener('click',function(e){
        var createOpen=e.target.closest('[data-pmd-open-create]');if(createOpen){e.preventDefault();openModal(createModal,nameInput);return}
        if(e.target.closest('[data-pmd-close-create]')){e.preventDefault();closeModal(createModal);return}
        var editOpen=e.target.closest('[data-pmd-open-edit]');
        if(editOpen){e.preventDefault();fillEdit({id:editOpen.dataset.id,name:editOpen.dataset.name,domain:editOpen.dataset.domain,email:editOpen.dataset.email,phone:editOpen.dataset.phone,country:editOpen.dataset.country,start:editOpen.dataset.start,end:editOpen.dataset.end,type:editOpen.dataset.type,description:editOpen.dataset.description});openModal(editModal,editField('[data-pmd-edit-name]'));return}
        if(e.target.closest('[data-pmd-close-edit]')){e.preventDefault();closeModal(editModal);return}
        if(e.target===createModal)closeModal(createModal);if(e.target===editModal)closeModal(editModal);
    });
    document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;if(createModal&&!createModal.hidden)closeModal(createModal);if(editModal&&!editModal.hidden)closeModal(editModal)});
    syncDomain();renderMarket(createModal);

    @if(old('_pmd_form') === 'create')
        openModal(createModal,nameInput);
    @elseif(old('_pmd_form') === 'edit')
        @php
            $pmdOldEdit = ['id'=>old('id'),'name'=>old('name'),'domain'=>old('domain'),'email'=>old('email'),'phone'=>old('phone'),'country'=>old('country'),'start'=>old('start'),'end'=>old('end'),'type'=>old('type','People'),'description'=>old('description')];
        @endphp
        fillEdit(@json($pmdOldEdit));openModal(editModal,editField('[data-pmd-edit-name]'));
    @endif
})();
</script>
@endpush
