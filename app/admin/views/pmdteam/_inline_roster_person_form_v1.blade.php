@php
    $pmdSettingsText = $pmdSettingsText ?? static function ($value) {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish((string)$value, 'settings.');
    };
    $mode = $mode ?? 'create';
    $person = $person ?? null;
    $member = $member ?? null;
    $isEdit = $mode === 'edit' && $person;
    $departments = $departments ?? [];
    $operationalRoles = $operationalRoles ?? [];
    $roles = collect($roles ?? []);
    $title = $isEdit ? 'Edit team member' : 'Add team member';
    $username = $member && $member->user ? (string)$member->user->username : '';
    $selectedRole = $member ? (int)$member->staff_role_id : (int)optional($roles->first(fn($role) => strtolower((string)$role->code) === \Admin\Services\PmdDefaultStaffRoleService::TEAM_MEMBER))->staff_role_id;
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
            <p>{{ $pmdSettingsText('One person, one PMD login. Their role decides which workspace opens after sign in; the same login also opens Staff Portal.') }}</p>
        </div>

        <div class="pmd-inline-grid">
            <div class="pmd-inline-field pmd-inline-field--full">
                <label>{{ $pmdSettingsText('Name') }}</label>
                <input type="text" name="display_name" value="{{ $isEdit ? $person->display_name : '' }}" required minlength="2" maxlength="128" autocomplete="name" autofocus placeholder="Anna">
            </div>

            <div class="pmd-inline-field">
                <label>{{ $pmdSettingsText('Work area') }}</label>
                <select name="department">
                    @foreach($departments as $key => $label)
                        <option value="{{ $key }}" {{ ($isEdit ? (string)$person->department : 'other') === (string)$key ? 'selected' : '' }}>{{ $pmdSettingsText($label) }}</option>
                    @endforeach
                </select>
            </div>

            <div class="pmd-inline-field">
                <label>{{ $pmdSettingsText('Job role') }} <small>{{ $pmdSettingsText('optional') }}</small></label>
                <input type="text" name="job_role" value="{{ $isEdit ? (string)$person->job_role : '' }}" maxlength="64" list="pmd-operational-job-roles" placeholder="Chef, Waiter, Bartender…">
                <datalist id="pmd-operational-job-roles">
                    @foreach($operationalRoles as $role)<option value="{{ $role }}">@endforeach
                    <option value="Waiter"><option value="Cashier"><option value="Bartender"><option value="Host"><option value="Runner"><option value="Cleaner">
                </datalist>
            </div>

            <div class="pmd-inline-field pmd-inline-field--full">
                <label>{{ $pmdSettingsText('PMD role') }}</label>
                <select name="staff_role_id" required>
                    <option value="">{{ $pmdSettingsText('Choose role') }}</option>
                    @foreach($roles as $role)
                        <option value="{{ (int)$role->staff_role_id }}" {{ $selectedRole === (int)$role->staff_role_id ? 'selected' : '' }}>{{ $role->name }}</option>
                    @endforeach
                </select>
                <small>{{ $pmdSettingsText('Owner/Manager get management workspaces. Cashier/Waiter, Accountant, Reservations and KDS are restricted to their assigned workspace. Team Member opens Staff Portal only.') }}</small>
            </div>

            <div class="pmd-inline-field">
                <label>{{ $pmdSettingsText('Username') }}</label>
                <input type="text" name="username" value="{{ $username }}" required minlength="2" maxlength="32" pattern="[A-Za-z0-9_-]+" autocomplete="username" placeholder="anna">
            </div>

            <div class="pmd-inline-field">
                <label>{{ $member ? $pmdSettingsText('New password') : $pmdSettingsText('Password') }}</label>
                <input type="password" name="password" minlength="6" maxlength="32" autocomplete="new-password" {{ $member ? '' : 'required' }}>
                @if($member)<small>{{ $pmdSettingsText('Leave blank to keep the current password.') }}</small>@endif
            </div>

            <div class="pmd-inline-field pmd-inline-field--full">
                <label>{{ $pmdSettingsText('Kitchen station') }} <small>{{ $pmdSettingsText('optional') }}</small></label>
                <input type="text" name="station_slug" value="{{ $isEdit ? (string)$person->station_slug : '' }}" maxlength="80" placeholder="grill / pizza / pass">
            </div>
        </div>
    </section>
</form>
