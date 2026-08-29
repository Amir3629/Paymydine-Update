@php
    $pmdSettingsText = $pmdSettingsText ?? static function ($value) {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish((string)$value, 'settings.');
    };
    $mode = $mode ?? 'create';
    $person = $person ?? null;
    $isEdit = $mode === 'edit' && $person;
    $departments = $departments ?? [];
    $operationalRoles = $operationalRoles ?? [];
    $staffOptions = collect($staffOptions ?? []);
    $title = $isEdit ? 'Edit person' : 'Add person';
@endphp
<form
    class="pmd-inline-form"
    data-pmd-inline-form
    data-pmd-inline-title="{{ $pmdSettingsText($title) }}"
    data-pmd-backend-url="{{ admin_url('pmdteam') }}"
    data-pmd-save-handler="onSaveOperationalPerson"
    data-pmd-refresh-selectors="#pmd-team-roster-section"
>
    <input type="hidden" name="_token" value="{{ csrf_token() }}">
    <input type="hidden" name="person_id" value="{{ $isEdit ? (int)$person->id : 0 }}">

    <section class="pmd-inline-section">
        <div class="pmd-inline-section__head">
            <h3>{{ $pmdSettingsText($title) }}</h3>
            <p>{{ $pmdSettingsText('Only a name is required. This person does not need email, mobile, username or password.') }}</p>
        </div>

        <div class="pmd-inline-grid">
            <div class="pmd-inline-field pmd-inline-field--full">
                <label>{{ $pmdSettingsText('Name') }}</label>
                <input
                    type="text"
                    name="display_name"
                    value="{{ $isEdit ? $person->display_name : '' }}"
                    required
                    minlength="2"
                    maxlength="128"
                    autocomplete="name"
                    autofocus
                    placeholder="Anna"
                >
            </div>

            <div class="pmd-inline-field">
                <label>{{ $pmdSettingsText('Work area') }} <small>{{ $pmdSettingsText('optional') }}</small></label>
                <select name="department">
                    <option value="">{{ $pmdSettingsText('Not specified') }}</option>
                    @foreach($departments as $key => $label)
                        <option value="{{ $key }}" {{ $isEdit && (string)$person->department === (string)$key ? 'selected' : '' }}>{{ $pmdSettingsText($label) }}</option>
                    @endforeach
                </select>
            </div>

            <div class="pmd-inline-field">
                <label>{{ $pmdSettingsText('Job role') }} <small>{{ $pmdSettingsText('optional') }}</small></label>
                <input
                    type="text"
                    name="job_role"
                    value="{{ $isEdit ? (string)$person->job_role : '' }}"
                    maxlength="64"
                    list="pmd-operational-job-roles"
                    placeholder="Chef, Waiter, Bartender…"
                >
                <datalist id="pmd-operational-job-roles">
                    @foreach($operationalRoles as $role)<option value="{{ $role }}">@endforeach
                    <option value="Waiter"><option value="Cashier"><option value="Bartender"><option value="Host"><option value="Runner"><option value="Cleaner">
                </datalist>
            </div>

            <div class="pmd-inline-field">
                <label>{{ $pmdSettingsText('Kitchen station') }} <small>{{ $pmdSettingsText('optional') }}</small></label>
                <input
                    type="text"
                    name="station_slug"
                    value="{{ $isEdit ? (string)$person->station_slug : '' }}"
                    maxlength="80"
                    placeholder="grill / pizza / pass"
                >
            </div>

            <div class="pmd-inline-field">
                <label>{{ $pmdSettingsText('PMD access account') }} <small>{{ $pmdSettingsText('optional') }}</small></label>
                <select name="staff_id">
                    <option value="">{{ $pmdSettingsText('No login needed') }}</option>
                    @foreach($staffOptions as $staff)
                        <option value="{{ (int)$staff->staff_id }}" {{ $isEdit && (int)$person->staff_id === (int)$staff->staff_id ? 'selected' : '' }}>
                            {{ $staff->staff_name }}{{ optional($staff->role)->name ? ' · '.optional($staff->role)->name : '' }}
                        </option>
                    @endforeach
                </select>
                <small>{{ $pmdSettingsText('Link only if this person also signs in to PMD or uses attendance hardware.') }}</small>
            </div>
        </div>
    </section>
</form>
