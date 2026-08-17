@php
    $mode = $mode ?? 'create';
    $member = $member ?? null;
    $isEdit = $mode === 'edit' && $member;
    $groups = $groups ?? collect();
    $roles = $roles ?? collect();
    $languages = $languages ?? collect();
    $canSuperUser = !empty($canSuperUser);
    $selectedGroups = $isEdit ? $member->groups->pluck('staff_group_id')->map(fn($v)=>(string)$v)->all() : [];
    $url = $isEdit ? admin_url('staffs/edit/'.$member->staff_id) : admin_url('staffs/create');
    $title = $isEdit ? 'Edit staff member' : 'Add staff member';
    $username = $isEdit ? (string)optional($member->user)->username : '';
    $superUser = $isEdit ? (bool)optional($member->user)->super_user : false;
@endphp
<form class="pmd-inline-form" data-pmd-inline-form data-pmd-inline-title="{{ $title }}" data-pmd-backend-url="{{ $url }}" data-pmd-save-handler="onSave" data-pmd-refresh-selectors="#pmd-team-members-section,#pmd-team-auth-section">
    <input type="hidden" name="_token" value="{{ csrf_token() }}">
    <input type="hidden" name="form_context" value="{{ $mode }}">

    <section class="pmd-inline-section">
        <div class="pmd-inline-section__head"><h3>Identity & login</h3><p>Staff identity and the admin account used to sign in.</p></div>
        <div class="pmd-inline-grid">
            <div class="pmd-inline-field"><label>Name</label><input type="text" name="Staff[staff_name]" value="{{ $isEdit ? $member->staff_name : '' }}" required minlength="2" maxlength="128"></div>
            <div class="pmd-inline-field"><label>Email</label><input type="email" name="Staff[staff_email]" value="{{ $isEdit ? $member->staff_email : '' }}" required maxlength="96"></div>
            <div class="pmd-inline-field"><label>Username</label><input type="text" name="Staff[user][username]" value="{{ $username }}" required minlength="2" maxlength="32"></div>
            <div class="pmd-inline-field"><label>Language</label><select name="Staff[language_id]"><option value="">Default language</option>@foreach($languages as $language)<option value="{{ $language->language_id }}" {{ $isEdit && (string)$member->language_id === (string)$language->language_id ? 'selected' : '' }}>{{ $language->name }}</option>@endforeach</select></div>
            @if(!$isEdit)
                <div class="pmd-inline-field pmd-inline-field--full">
                    <div class="pmd-inline-setting-row"><div class="pmd-inline-setting-copy"><strong>Send invite</strong><small>Keep enabled to create the account without requiring a password here.</small></div><label class="pmd-inline-switch"><input type="hidden" name="Staff[user][send_invite]" value="0"><input type="checkbox" name="Staff[user][send_invite]" value="1" checked><span></span></label></div>
                </div>
            @endif
            <div class="pmd-inline-field"><label>{{ $isEdit ? 'New password' : 'Password' }}</label><input type="password" name="Staff[user][password]" value="" autocomplete="new-password" data-pmd-omit-empty {{ $isEdit ? '' : '' }}><small>{{ $isEdit ? 'Leave blank to keep the current password.' : 'Required only when Send invite is disabled.' }}</small></div>
            <div class="pmd-inline-field"><label>Confirm password</label><input type="password" name="Staff[user][password_confirm]" value="" autocomplete="new-password" data-pmd-omit-empty></div>
        </div>
    </section>

    <section class="pmd-inline-section">
        <div class="pmd-inline-section__head"><h3>Role & access</h3><p>Role, status and order access stay owned by the existing Staff backend.</p></div>
        <div class="pmd-inline-grid">
            <div class="pmd-inline-field"><label>Role</label><select name="Staff[staff_role_id]" required><option value="">Choose role</option>@foreach($roles as $role)<option value="{{ $role->staff_role_id }}" {{ $isEdit && (string)$member->staff_role_id === (string)$role->staff_role_id ? 'selected' : '' }}>{{ $role->name }}</option>@endforeach</select></div>
            <div class="pmd-inline-field"><label>Sale / order access</label><select name="Staff[sale_permission]"><option value="1" {{ $isEdit && (int)$member->sale_permission === 1 ? 'selected' : '' }}>Global access</option><option value="2" {{ $isEdit && (int)$member->sale_permission === 2 ? 'selected' : '' }}>Assigned groups</option><option value="3" {{ $isEdit && (int)$member->sale_permission === 3 ? 'selected' : '' }}>Restricted</option></select></div>
        </div>
        <div class="pmd-inline-setting-row"><div class="pmd-inline-setting-copy"><strong>Active staff member</strong><small>Disabled staff stay saved but cannot use active staff access.</small></div><label class="pmd-inline-switch"><input type="hidden" name="Staff[staff_status]" value="0"><input type="checkbox" name="Staff[staff_status]" value="1" {{ !$isEdit || !empty($member->staff_status) ? 'checked' : '' }}><span></span></label></div>
        @if($canSuperUser)
            <div class="pmd-inline-setting-row"><div class="pmd-inline-setting-copy"><strong>Super user</strong><small>Grant only when this account should bypass normal staff permission limits.</small></div><label class="pmd-inline-switch"><input type="hidden" name="Staff[user][super_user]" value="0"><input type="checkbox" name="Staff[user][super_user]" value="1" {{ $superUser ? 'checked' : '' }}><span></span></label></div>
        @endif
    </section>

    <section class="pmd-inline-section">
        <div class="pmd-inline-section__head"><h3>Groups</h3><p>At least one staff group is required by the existing Staff request contract.</p></div>
        <div class="pmd-inline-check-grid">
            @foreach($groups as $group)
                <label class="pmd-inline-check"><input type="checkbox" name="Staff[groups][]" value="{{ $group->staff_group_id }}" {{ in_array((string)$group->staff_group_id, $selectedGroups, true) ? 'checked' : '' }}><span>{{ $group->staff_group_name }}</span></label>
            @endforeach
        </div>
    </section>


    <section class="pmd-inline-section">
        <div class="pmd-inline-section__head"><h3>Card & biometric access</h3><p>RFID/NFC and fingerprint access stay connected to the existing staff model.</p></div>
        <div class="pmd-inline-grid">
            <div class="pmd-inline-field"><label>Card ID (RFID/NFC)</label><input type="text" name="Staff[card_id]" value="{{ $isEdit ? $member->card_id : '' }}" placeholder="Scan card to get ID"></div>
            <div class="pmd-inline-field"><label>Biometric authentication</label><div class="pmd-inline-setting-row"><div class="pmd-inline-setting-copy"><strong>Enable fingerprint access</strong><small>Uses the existing biometric staff authority.</small></div><label class="pmd-inline-switch"><input type="hidden" name="Staff[biometric_enabled]" value="0"><input type="checkbox" name="Staff[biometric_enabled]" value="1" {{ $isEdit && !empty($member->biometric_enabled) ? 'checked' : '' }}><span></span></label></div></div>
        </div>
    </section>
</form>
