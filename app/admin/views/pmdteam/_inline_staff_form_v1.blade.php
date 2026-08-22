@php
    $mode = $mode ?? 'create';
    $member = $member ?? null;
    $isEdit = $mode === 'edit' && $member;
    $roles = $roles ?? collect();
    $title = $isEdit ? 'Edit staff member' : 'Add staff member';
    $username = $isEdit ? (string)optional($member->user)->username : '';
@endphp
<form
    class="pmd-inline-form"
    data-pmd-inline-form
    data-pmd-inline-title="{{ $title }}"
    data-pmd-backend-url="{{ admin_url('pmdteam') }}"
    data-pmd-save-handler="onSavePmdStaff"
    data-pmd-refresh-selectors="#pmd-team-members-section,#pmd-team-roles-section"
    data-pmd-simple-staff-form="r43"
>
    <input type="hidden" name="_token" value="{{ csrf_token() }}">
    <input type="hidden" name="staff[id]" value="{{ $isEdit ? (int)$member->staff_id : 0 }}">

    <section class="pmd-inline-section">
        <div class="pmd-inline-section__head">
            <h3>{{ $isEdit ? 'Staff member' : 'Add staff member' }}</h3>
            <p>Choose who this person is, then create their login.</p>
        </div>

        <div class="pmd-inline-grid">
            <div class="pmd-inline-field pmd-inline-field--full">
                <label>Role</label>
                <select name="staff[role_id]" required autofocus>
                    <option value="">Choose role</option>
                    @foreach($roles as $code => $role)
                        <option
                            value="{{ $role->staff_role_id }}"
                            {{ $isEdit && (string)$member->staff_role_id === (string)$role->staff_role_id ? 'selected' : '' }}
                        >{{ $role->name }}</option>
                    @endforeach
                </select>
            </div>

            <div class="pmd-inline-field pmd-inline-field--full">
                <label>Name</label>
                <input
                    type="text"
                    name="staff[name]"
                    value="{{ $isEdit ? $member->staff_name : '' }}"
                    required
                    minlength="2"
                    maxlength="128"
                    autocomplete="name"
                >
            </div>

            <div class="pmd-inline-field pmd-inline-field--full">
                <label>Username</label>
                <input
                    type="text"
                    name="staff[username]"
                    value="{{ $username }}"
                    required
                    minlength="2"
                    maxlength="32"
                    pattern="[A-Za-z0-9_-]+"
                    autocomplete="username"
                >
            </div>

            <div class="pmd-inline-field pmd-inline-field--full">
                <label>{{ $isEdit ? 'New password' : 'Password' }}</label>
                <input
                    type="password"
                    name="staff[password]"
                    value=""
                    minlength="6"
                    maxlength="32"
                    autocomplete="new-password"
                    {{ $isEdit ? '' : 'required' }}
                    data-pmd-omit-empty
                >
                @if($isEdit)
                    <small>Leave blank to keep the current password.</small>
                @endif
            </div>
        </div>
    </section>
</form>
