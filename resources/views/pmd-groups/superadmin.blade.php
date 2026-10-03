@extends('admin::superadmin_r2.layout')

@section('title', 'Business Accounts')

@push('head')
<style>
.pmd-groups-layout{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(340px,.8fr);gap:18px;align-items:start}
.pmd-group-types{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:4px 0 18px}
.pmd-group-type{display:block;border:1px solid var(--line);border-radius:15px;padding:14px;background:#fff;cursor:pointer}
.pmd-group-type:has(input:checked){border-color:#123d32;box-shadow:0 0 0 3px rgba(18,61,50,.09)}
.pmd-group-type input{position:absolute;opacity:0;pointer-events:none}
.pmd-group-type strong{display:block;font-size:14px}.pmd-group-type span{display:block;color:var(--muted);font-size:12px;line-height:1.45;margin-top:5px}
.pmd-sites{display:grid;gap:10px}.pmd-site-row{border:1px solid var(--line);border-radius:14px;padding:14px;background:#fbfdfc}
.pmd-site-row-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
.pmd-site-row-head strong{font-size:13px}.pmd-site-fields{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:10px}
.pmd-site-remove{border:0;background:transparent;color:var(--danger);font-weight:800;cursor:pointer}
.pmd-form-actions{display:flex;align-items:center;gap:10px;margin-top:18px;flex-wrap:wrap}
.pmd-group-card{border:1px solid var(--line);border-radius:16px;background:#fff;padding:16px;margin-bottom:12px}
.pmd-group-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.pmd-group-card h4{margin:0;font-size:16px}
.pmd-group-sites{display:grid;gap:7px;margin-top:13px}.pmd-group-site{display:flex;justify-content:space-between;gap:10px;padding:9px 10px;background:#f7faf9;border-radius:10px;font-size:13px}
.pmd-group-site small{color:var(--muted)}.pmd-install-warning{border:1px solid #fed7aa;background:#fff7ed;color:#9a3412;padding:16px;border-radius:14px;line-height:1.5}
.pmd-help{font-size:12px;color:var(--muted);line-height:1.5;margin-top:6px}
@media(max-width:1050px){.pmd-groups-layout{grid-template-columns:1fr}.pmd-group-types{grid-template-columns:1fr}.pmd-site-fields{grid-template-columns:1fr}}
</style>
@endpush

@section('content')
<div class="hero">
    <div>
        <h2>Business Accounts</h2>
        <p>Keep every restaurant isolated while one Owner manages approved locations.</p>
    </div>
</div>

@if(!$installed)
    <div class="pmd-install-warning">
        Restaurant Groups storage is not installed yet. Run
        <strong>php artisan pmd:restaurant-groups install --backfill</strong>
        on the VPS before creating a Business Account.
    </div>
@else
<div class="pmd-groups-layout">
    <section class="card">
        <div class="card-head">
            <div>
                <h3>Create Business Account</h3>
                <p>Each location receives its own subdomain and tenant database.</p>
            </div>
        </div>

        <form method="post" action="/superadmin/groups/store" id="pmd-group-create-form">
            @csrf

            <div class="pmd-group-types">
                <label class="pmd-group-type">
                    <input type="radio" name="organization_type" value="independent" {{ old('organization_type','multi_location') === 'independent' ? 'checked' : '' }}>
                    <strong>Independent Restaurant</strong>
                    <span>One restaurant, one tenant, one Owner workspace.</span>
                </label>
                <label class="pmd-group-type">
                    <input type="radio" name="organization_type" value="multi_location" {{ old('organization_type','multi_location') === 'multi_location' ? 'checked' : '' }}>
                    <strong>Multi-Location Restaurant</strong>
                    <span>Several tenant restaurants controlled by one Owner account.</span>
                </label>
                <label class="pmd-group-type">
                    <input type="radio" name="organization_type" value="food_court" {{ old('organization_type') === 'food_court' ? 'checked' : '' }}>
                    <strong>Food Court / Venue</strong>
                    <span>Independent vendors plus a shared pickup display and group overview.</span>
                </label>
            </div>

            <div class="field-grid">
                <div class="field full">
                    <label for="organization_name">Business account name</label>
                    <input id="organization_name" name="organization_name" value="{{ old('organization_name') }}" required>
                </div>
                <div class="field">
                    <label for="owner_name">Owner name</label>
                    <input id="owner_name" name="owner_name" value="{{ old('owner_name') }}" required>
                </div>
                <div class="field">
                    <label for="owner_email">Owner email</label>
                    <input id="owner_email" type="email" name="owner_email" value="{{ old('owner_email') }}" required>
                </div>
                <div class="field">
                    <label for="owner_username">Shared Owner username</label>
                    <input id="owner_username" name="owner_username" value="{{ old('owner_username') }}" autocomplete="off" required>
                    <div class="pmd-help">This username works on every location in this Business Account.</div>
                </div>
                <div class="field">
                    <label for="phone">Phone</label>
                    <input id="phone" name="phone" value="{{ old('phone') }}" required>
                </div>
                <div class="field">
                    <label for="owner_password">Shared Owner password</label>
                    <input id="owner_password" type="password" name="owner_password" minlength="14" maxlength="128" autocomplete="new-password" required>
                </div>
                <div class="field">
                    <label for="owner_password_confirmation">Confirm password</label>
                    <input id="owner_password_confirmation" type="password" name="owner_password_confirmation" minlength="14" maxlength="128" autocomplete="new-password" required>
                </div>
                <div class="field">
                    <label for="country">Country</label>
                    <select id="country" name="country" required>
                        @foreach($countryOptions as $value => $label)
                            <option value="{{ $value }}" {{ old('country') == $value ? 'selected' : '' }}>{{ $label }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="field">
                    <label for="plan_type">Plan</label>
                    <input id="plan_type" name="plan_type" value="{{ old('plan_type','People') }}">
                </div>
                <div class="field">
                    <label for="start">Start</label>
                    <input id="start" type="date" name="start" value="{{ old('start', now()->toDateString()) }}" required>
                </div>
                <div class="field">
                    <label for="end">End</label>
                    <input id="end" type="date" name="end" value="{{ old('end', now()->addYear()->toDateString()) }}" required>
                </div>
                <div class="field full">
                    <label for="description">Internal note</label>
                    <textarea id="description" name="description">{{ old('description') }}</textarea>
                </div>
            </div>

            <div class="card-head" style="margin-top:22px">
                <div>
                    <h3>Locations</h3>
                    <p>Each row creates a separate PayMyDine tenant.</p>
                </div>
                <button class="btn btn-soft" type="button" data-pmd-add-site>Add location</button>
            </div>

            <div class="pmd-sites" data-pmd-sites></div>

            <div class="pmd-form-actions">
                <button class="btn btn-primary" type="submit">Create Business Account</button>
                <span class="pmd-help">If one location fails provisioning, completed tenants stay safe and the failed row can be retried.</span>
            </div>
        </form>
    </section>

    <aside>
        <div class="card">
            <div class="card-head">
                <div>
                    <h3>Existing Business Accounts</h3>
                    <p>{{ $groups->count() }} account(s)</p>
                </div>
            </div>

            @forelse($groups as $group)
                <article class="pmd-group-card">
                    <div class="pmd-group-card-head">
                        <div>
                            <h4>{{ $group->name }}</h4>
                            <span class="sub">
                                {{ str_replace('_',' ', ucfirst($group->type)) }}
                                @if($group->owner_username)
                                    · {{ $group->owner_username }}
                                @endif
                            </span>
                        </div>
                        <span class="badge {{ $group->status === 'active' ? 'ok' : 'warn' }}">{{ $group->status }}</span>
                    </div>

                    <div class="pmd-group-sites">
                        @foreach($group->sites as $site)
                            <div class="pmd-group-site">
                                <div>
                                    <strong>{{ $site->label }}</strong>
                                    <small>{{ $site->domain ?: $site->slug.'.paymydine.com' }}</small>
                                    @if($site->last_error)
                                        <small>{{ $site->last_error }}</small>
                                    @endif
                                </div>
                                <div style="text-align:right">
                                    <span class="badge {{ $site->state === 'ready' ? 'ok' : 'warn' }}">{{ $site->state }}</span>
                                    @if($site->state !== 'ready')
                                        <form method="post" action="/superadmin/groups/retry" style="margin-top:6px">
                                            @csrf
                                            <input type="hidden" name="site_id" value="{{ $site->id }}">
                                            <button class="btn btn-soft" type="submit" style="min-height:32px;padding:5px 9px">Retry</button>
                                        </form>
                                    @endif
                                </div>
                            </div>
                        @endforeach
                    </div>
                </article>
            @empty
                <div class="empty">No Business Accounts yet.</div>
            @endforelse
        </div>
    </aside>
</div>
@endif
@endsection

@push('scripts')
@if($installed)
<script>
(function () {
    'use strict';

    var container = document.querySelector('[data-pmd-sites]');
    var add = document.querySelector('[data-pmd-add-site]');
    var form = document.getElementById('pmd-group-create-form');
    if (!container || !add || !form) return;

    var oldSites = @json(array_values(old('sites', [])));

    function type() {
        var selected = form.querySelector('input[name="organization_type"]:checked');
        return selected ? selected.value : 'multi_location';
    }

    function row(data) {
        var index = container.children.length;
        var article = document.createElement('div');
        article.className = 'pmd-site-row';
        article.innerHTML =
            '<div class="pmd-site-row-head"><strong>Location ' + (index + 1) + '</strong>' +
            '<button type="button" class="pmd-site-remove" data-pmd-remove-site>Remove</button></div>' +
            '<div class="pmd-site-fields">' +
              '<div class="field"><label>Location name</label><input name="sites['+index+'][label]" required></div>' +
              '<div class="field"><label>Subdomain</label><input name="sites['+index+'][slug]" placeholder="berlin-mitte" required></div>' +
              '<div class="field"><label>Database</label><input name="sites['+index+'][database]" placeholder="pmd_berlin_mitte" required></div>' +
            '</div>';

        article.querySelector('[name$="[label]"]').value = data && data.label ? data.label : '';
        article.querySelector('[name$="[slug]"]').value = data && data.slug ? data.slug : '';
        article.querySelector('[name$="[database]"]').value = data && data.database ? data.database : '';

        container.appendChild(article);
        normalize();
    }

    function normalize() {
        Array.prototype.forEach.call(container.children, function (article, index) {
            article.querySelector('strong').textContent = 'Location ' + (index + 1);
            ['label','slug','database'].forEach(function (key) {
                var field = article.querySelector('[name$="['+key+']"]');
                field.name = 'sites['+index+']['+key+']';
            });
        });

        var minimum = type() === 'independent' ? 1 : 2;
        Array.prototype.forEach.call(container.querySelectorAll('[data-pmd-remove-site]'), function (button) {
            button.disabled = container.children.length <= minimum;
        });
    }

    function ensureMinimum() {
        var minimum = type() === 'independent' ? 1 : 2;
        if (type() === 'independent') {
            while (container.children.length > 1) container.lastElementChild.remove();
        }
        while (container.children.length < minimum) row();
        normalize();
    }

    add.addEventListener('click', function () {
        if (type() === 'independent') return;
        row();
    });

    container.addEventListener('click', function (event) {
        var button = event.target.closest('[data-pmd-remove-site]');
        if (!button || button.disabled) return;
        button.closest('.pmd-site-row').remove();
        normalize();
    });

    form.addEventListener('change', function (event) {
        if (event.target.name === 'organization_type') ensureMinimum();
    });

    if (oldSites.length) {
        oldSites.forEach(row);
    } else {
        row();
        row();
    }

    ensureMinimum();
})();
</script>
@endif
@endpush
