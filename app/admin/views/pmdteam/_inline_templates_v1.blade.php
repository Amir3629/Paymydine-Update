@php
    $groups = $pmdTeam['groups'] ?? collect();
    $languages = $pmdTeam['languages'] ?? collect();
    $permissions = $pmdTeam['permissions'] ?? [];
    $canSuperUser = !empty($pmdTeam['can_super_user']);
@endphp
<div id="pmd-team-inline-templates" data-pmd-inline-templates hidden>
    <template data-pmd-inline-template="team:staff:create">
        @include('admin::pmdteam._inline_staff_form_v1', ['mode'=>'create','member'=>null,'groups'=>$groups,'roles'=>$roles,'languages'=>$languages,'canSuperUser'=>$canSuperUser])
    </template>
    @foreach($staff as $member)
        <template data-pmd-inline-template="team:staff:edit:{{ $member->staff_id }}">
            @include('admin::pmdteam._inline_staff_form_v1', ['mode'=>'edit','member'=>$member,'groups'=>$groups,'roles'=>$roles,'languages'=>$languages,'canSuperUser'=>$canSuperUser])
        </template>
    @endforeach
    <template data-pmd-inline-template="team:role:create">
        @include('admin::pmdteam._inline_role_form_v1', ['mode'=>'create','role'=>null,'permissions'=>$permissions])
    </template>
    @foreach($roles as $role)
        <template data-pmd-inline-template="team:role:edit:{{ $role->staff_role_id }}">
            @include('admin::pmdteam._inline_role_form_v1', ['mode'=>'edit','role'=>$role,'permissions'=>$permissions])
        </template>
    @endforeach
</div>
