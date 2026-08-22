@php
    $roleOptions = $pmdTeam['role_options'] ?? [];
    $roleSelections = $pmdTeam['role_selections'] ?? [];
@endphp
<div id="pmd-team-inline-templates" data-pmd-inline-templates hidden>
    <template data-pmd-inline-template="team:staff:create">
        @include('admin::pmdteam._inline_staff_form_v1', [
            'mode' => 'create',
            'member' => null,
            'roleOptions' => $roleOptions,
            'selectedRoleValue' => '',
        ])
    </template>
    @foreach($staff as $member)
        <template data-pmd-inline-template="team:staff:edit:{{ $member->staff_id }}">
            @include('admin::pmdteam._inline_staff_form_v1', [
                'mode' => 'edit',
                'member' => $member,
                'roleOptions' => $roleOptions,
                'selectedRoleValue' => $roleSelections[(int)$member->staff_id] ?? '',
            ])
        </template>
    @endforeach
</div>
