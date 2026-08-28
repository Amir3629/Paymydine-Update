@php
    $roles = $pmdTeam['roles'] ?? collect();
    $roster = collect($pmdTeam['roster'] ?? []);
    $departments = $pmdTeam['departments'] ?? [];
    $operationalRoles = $pmdTeam['operational_roles'] ?? [];
    $staffOptions = collect($pmdTeam['staff_options'] ?? []);
@endphp
<div id="pmd-team-inline-templates" data-pmd-inline-templates hidden>
    @if(!empty($pmdTeam['roster_ready']))
        <template data-pmd-inline-template="team:person:create">
            @include('admin::pmdteam._inline_roster_person_form_v1', [
                'mode'=>'create',
                'person'=>null,
                'departments'=>$departments,
                'operationalRoles'=>$operationalRoles,
                'staffOptions'=>$staffOptions,
            ])
        </template>

        @foreach($roster as $person)
            <template data-pmd-inline-template="team:person:edit:{{ $person->id }}">
                @include('admin::pmdteam._inline_roster_person_form_v1', [
                    'mode'=>'edit',
                    'person'=>$person,
                    'departments'=>$departments,
                    'operationalRoles'=>$operationalRoles,
                    'staffOptions'=>$staffOptions,
                ])
            </template>
        @endforeach
    @endif

    <template data-pmd-inline-template="team:staff:create">
        @include('admin::pmdteam._inline_staff_form_v1', ['mode'=>'create','member'=>null,'roles'=>$roles])
    </template>

    @foreach($staff as $member)
        <template data-pmd-inline-template="team:staff:edit:{{ $member->staff_id }}">
            @include('admin::pmdteam._inline_staff_form_v1', ['mode'=>'edit','member'=>$member,'roles'=>$roles])
        </template>
    @endforeach
</div>
