@php
    $pmdBusinessOld = old('_pmd_form') === 'business';
    $pmdBusinessType = $pmdBusinessOld ? old('organization_type', 'multi_location') : 'multi_location';
    $pmdBusinessCountry = $pmdBusinessOld ? old('country', $pmdCreateCountry ?? 'DE') : ($pmdCreateCountry ?? 'DE');
@endphp

<form method="POST" action="/superadmin/groups/store" data-pmd-business-form>
    @csrf
    <input type="hidden" name="_pmd_form" value="business">
    <input type="hidden" name="organization_type" value="{{ $pmdBusinessType }}" data-pmd-business-type>

    <div class="field-grid">
        <div class="field full">
            <label data-pmd-business-name-label>Business account name</label>
            <input
                name="organization_name"
                value="{{ $pmdBusinessOld ? old('organization_name') : '' }}"
                maxlength="191"
                required
                data-pmd-business-name
            >
            <span class="pmd-field-help" data-pmd-business-name-help>
                One Owner account will control the restaurants below.
            </span>
        </div>

        <div class="field">
            <label>Owner name</label>
            <input name="owner_name" value="{{ $pmdBusinessOld ? old('owner_name') : '' }}" maxlength="191" required>
        </div>

        <div class="field">
            <label>Owner email</label>
            <input type="email" name="owner_email" value="{{ $pmdBusinessOld ? old('owner_email') : '' }}" maxlength="191" required>
        </div>

        <div class="field">
            <label>Shared Owner username</label>
            <input
                name="owner_username"
                value="{{ $pmdBusinessOld ? old('owner_username') : '' }}"
                maxlength="100"
                autocomplete="off"
                required
            >
            <span class="pmd-field-help">The same username works on every restaurant in this account.</span>
        </div>

        <div class="field">
            <label>Phone</label>
            <input name="phone" value="{{ $pmdBusinessOld ? old('phone') : '' }}" maxlength="40" required>
        </div>

        <div class="field">
            <label>Shared Owner password</label>
            <input type="password" name="owner_password" minlength="14" maxlength="128" autocomplete="new-password" required>
            <span class="pmd-field-help">Minimum 14 characters. It is stored only on the central Owner account.</span>
        </div>

        <div class="field">
            <label>Confirm password</label>
            <input type="password" name="owner_password_confirmation" minlength="14" maxlength="128" autocomplete="new-password" required>
        </div>

        <div class="field">
            <label>Country / platform market</label>
            <select name="country" required data-pmd-market-country>
                @foreach($pmdCountryOptions as $code => $label)
                    <option value="{{ $code }}" {{ $pmdBusinessCountry === $code ? 'selected' : '' }}>{{ $label }}</option>
                @endforeach
            </select>
        </div>

        <div class="field">
            <label>Plan</label>
            <input name="plan_type" value="{{ $pmdBusinessOld ? old('plan_type', 'People') : 'People' }}" maxlength="80">
        </div>

        <div class="field">
            <label>Start date</label>
            <input type="date" name="start" value="{{ $pmdBusinessOld ? old('start', now()->toDateString()) : now()->toDateString() }}" required>
        </div>

        <div class="field">
            <label>End date</label>
            <input type="date" name="end" value="{{ $pmdBusinessOld ? old('end', now()->addYear()->toDateString()) : now()->addYear()->toDateString() }}" required>
        </div>

        <div class="field full">
            <label>Internal note</label>
            <textarea name="description" maxlength="1000">{{ $pmdBusinessOld ? old('description') : '' }}</textarea>
        </div>

        <div class="pmd-market-preview" data-pmd-market-preview></div>
    </div>

    <div class="pmd-business-locations">
        <div class="pmd-business-locations-head">
            <div>
                <strong data-pmd-sites-heading>Restaurant locations</strong>
                <span data-pmd-sites-copy>Each location gets its own subdomain and isolated tenant database.</span>
            </div>
            <button class="btn btn-soft" type="button" data-pmd-add-business-site>Add location</button>
        </div>

        <div class="pmd-business-site-list" data-pmd-business-sites></div>
    </div>

    <div class="pmd-modal-actions">
        <button class="btn btn-soft" type="button" data-pmd-close-create>Cancel</button>
        <button class="btn btn-primary" type="submit" data-pmd-business-submit>Create multi-location restaurant</button>
    </div>
</form>
