@php
    $roles = $pmdTeam['roles'] ?? collect();
@endphp
<div id="pmd-team-inline-templates" data-pmd-inline-templates hidden>
    <template data-pmd-inline-template="team:staff:create">
        @include('admin::pmdteam._inline_staff_form_v1', ['mode'=>'create','member'=>null,'roles'=>$roles])
    </template>
    @foreach($staff as $member)
        <template data-pmd-inline-template="team:staff:edit:{{ $member->staff_id }}">
            @include('admin::pmdteam._inline_staff_form_v1', ['mode'=>'edit','member'=>$member,'roles'=>$roles])
        </template>
    @endforeach
</div>
