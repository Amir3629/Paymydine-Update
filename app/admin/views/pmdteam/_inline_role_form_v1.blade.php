@php
    $mode = $mode ?? 'create';
    $role = $role ?? null;
    $permissions = $permissions ?? [];
    $isEdit = $mode === 'edit' && $role;
    $url = $isEdit ? admin_url('staff_roles/edit/'.$role->staff_role_id) : admin_url('staff_roles/create');
    $title = $isEdit ? 'Edit role & permissions' : 'Add role';
    $selectedPermissions = $isEdit ? (array)$role->permissions : [];
@endphp
<form class="pmd-inline-form" data-pmd-inline-form data-pmd-inline-title="{{ $title }}" data-pmd-backend-url="{{ $url }}" data-pmd-save-handler="onSave" data-pmd-refresh-selectors="#pmd-team-members-section,#pmd-team-roles-section,#pmd-team-auth-section">
    <input type="hidden" name="_token" value="{{ csrf_token() }}">
    <input type="hidden" name="form_context" value="{{ $mode }}">
    <input type="hidden" name="Staff_role[permissions][__pmd_placeholder]" value="0">

    <section class="pmd-inline-section">
        <div class="pmd-inline-section__head"><h3>Role identity</h3><p>Name, code and description use the existing StaffRoles backend.</p></div>
        <div class="pmd-inline-grid">
            <div class="pmd-inline-field"><label>Role name</label><input type="text" name="Staff_role[name]" value="{{ $isEdit ? $role->name : '' }}" required minlength="2" maxlength="128"></div>
            <div class="pmd-inline-field"><label>Role code</label><input type="text" name="Staff_role[code]" value="{{ $isEdit ? $role->code : '' }}" required minlength="2" maxlength="32"></div>
            <div class="pmd-inline-field pmd-inline-field--full"><label>Description</label><textarea name="Staff_role[description]">{{ $isEdit ? $role->description : '' }}</textarea></div>
        </div>
    </section>

    <section class="pmd-inline-section">
        <div class="pmd-inline-section__head"><h3>Permissions</h3><p>The same registered permission codes are saved by StaffRoles; this is only a cleaner in-page editor.</p></div>
        <div class="pmd-inline-permission-groups">
            @foreach($permissions as $group => $items)
                <div class="pmd-inline-permission-group">
                    <h4>{{ ucwords(str_replace(['-','_'], ' ', (string)$group)) }}</h4>
                    @foreach($items as $permission)
                        @php $code = (string)$permission->code; @endphp
                        <label class="pmd-inline-permission-item">
                            <input type="checkbox" name="Staff_role[permissions][{{ $code }}]" value="1" {{ (int)($selectedPermissions[$code] ?? 0) === 1 ? 'checked' : '' }}>
                            <span><strong>@lang($permission->label)</strong><small>{{ $code }}{{ !empty($permission->description) ? ' · '.$permission->description : '' }}</small></span>
                        </label>
                    @endforeach
                </div>
            @endforeach
        </div>
    </section>
</form>
