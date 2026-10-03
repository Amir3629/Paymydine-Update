@php
    $roles = $pmdTeam['roles'] ?? collect();
    $roster = collect($pmdTeam['roster'] ?? []);
    $departments = $pmdTeam['departments'] ?? [];
    $operationalRoles = $pmdTeam['operational_roles'] ?? [];
    $staffById = collect($pmdTeam['staff_by_id'] ?? []);
@endphp
<div id="pmd-team-inline-templates" data-pmd-inline-templates hidden>
    @if(!empty($pmdTeam['roster_ready']))
        <template data-pmd-inline-template="team:person:create">
            @include('admin::pmdteam._inline_roster_person_form_v1', [
                'mode'=>'create',
                'person'=>null,
                'member'=>null,
                'departments'=>$departments,
                'operationalRoles'=>$operationalRoles,
                'roles'=>$roles,
            ])
        </template>

        @foreach($roster as $person)
            @php $member = !empty($person->staff_id) ? $staffById->get((int)$person->staff_id) : null; @endphp
            <template data-pmd-inline-template="team:person:edit:{{ $person->id }}">
                @include('admin::pmdteam._inline_roster_person_form_v1', [
                    'mode'=>'edit',
                    'person'=>$person,
                    'member'=>$member,
                    'departments'=>$departments,
                    'operationalRoles'=>$operationalRoles,
                    'roles'=>$roles,
                ])
            </template>
        @endforeach
    @endif
</div>
