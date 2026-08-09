<style id="pmd-team-first-paint">html,body,.page,.page-wrapper,.page-content,.content-wrapper,.container,.container-fluid,.nk-wrap,.nk-content,.nk-content-inner,.nk-content-body,#pmd-team-access{background:#f8fbfd!important}.navbar-top,.navbar-fixed-top{display:none!important}#pmd-team-access{min-height:100vh;background:#f8fbfd!important}#pmd-team-access,#pmd-team-access *{animation:none!important}</style>
<link rel="stylesheet" href="/app/admin/assets/css/pmd-team-v1.css?v=20260809_1">

@php
    $staff = $pmdTeam['staff'] ?? collect();
    $roles = $pmdTeam['roles'] ?? collect();
    $stats = $pmdTeam['stats'] ?? ['total'=>0,'active'=>0,'biometric'=>0,'roles'=>0];
@endphp

<div id="pmd-team-access" data-pmd-team-access>
    <header class="pmd-team-header" id="pmd-team-header">
        <div class="pmd-team-header__left">
            <a class="pmd-team-btn" href="{{ admin_url('pmdsettings') }}" aria-label="Back"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg></a>
            <h1>Team & access</h1>
        </div>
        <div class="pmd-team-header__actions" data-pmd-team-actions></div>
    </header>

    <section class="pmd-team-section">
        <div class="pmd-team-card">
            <div class="pmd-team-card__header">
                <div class="pmd-team-icon"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path></svg></div>
                <div><h2>Team members</h2><p>Staff, roles and access state in one place.</p></div>
                <div class="pmd-team-header-actions"><a class="pmd-team-action" href="{{ admin_url('staffs/create') }}">Add staff</a></div>
            </div>
            <div class="pmd-team-stats">
                <div class="pmd-team-stat"><span>Team members</span><strong>{{ (int)$stats['total'] }}</strong></div>
                <div class="pmd-team-stat"><span>Active</span><strong>{{ (int)$stats['active'] }}</strong></div>
                <div class="pmd-team-stat"><span>Roles</span><strong>{{ (int)$stats['roles'] }}</strong></div>
                <div class="pmd-team-stat"><span>Biometric</span><strong>{{ (int)$stats['biometric'] }}</strong></div>
            </div>
            <div class="pmd-team-list">
                @forelse($staff as $member)
                    <div class="pmd-team-row">
                        <div class="pmd-team-person"><strong>{{ $member->staff_name ?: 'Unnamed staff' }}</strong><small>{{ $member->staff_email ?: optional($member->user)->username }}</small></div>
                        <div class="pmd-team-role">{{ optional($member->role)->name ?: 'No role' }}</div>
                        <div class="pmd-team-status {{ !empty($member->staff_status) ? 'is-active' : '' }}">{{ !empty($member->staff_status) ? 'Active' : 'Disabled' }}</div>
                        <a class="pmd-team-edit" href="{{ admin_url('staffs/edit/'.$member->staff_id) }}" aria-label="Edit"><svg viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg></a>
                    </div>
                @empty
                    <div class="pmd-team-row"><div class="pmd-team-person"><strong>No team members yet</strong><small>Add the first staff member.</small></div></div>
                @endforelse
            </div>
        </div>
    </section>

    <section class="pmd-team-section">
        <div class="pmd-team-card">
            <div class="pmd-team-card__header">
                <div class="pmd-team-icon"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path><path d="m9 12 2 2 4-4"></path></svg></div>
                <div><h2>Roles & permissions</h2><p>Role overview and permission ownership.</p></div>
                <div class="pmd-team-header-actions"><a class="pmd-team-action" href="{{ admin_url('staff_roles/create') }}">Add role</a></div>
            </div>
            <div class="pmd-team-grid">
                @forelse($roles as $role)
                    <div class="pmd-team-panel"><strong>{{ $role->name ?: 'Unnamed role' }}</strong><p>{{ $role->description ?: 'Access rules for this role.' }}</p><a href="{{ admin_url('staff_roles/edit/'.$role->staff_role_id) }}">Edit permissions →</a></div>
                @empty
                    <div class="pmd-team-panel"><strong>No roles yet</strong><p>Create a role before assigning permissions.</p></div>
                @endforelse
            </div>
        </div>
    </section>

    <section class="pmd-team-section">
        <div class="pmd-team-card">
            <div class="pmd-team-card__header"><div class="pmd-team-icon"><svg viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="5.5"></circle><path d="m21 2-9.6 9.6"></path></svg></div><div><h2>Authentication & access</h2><p>Current account, biometric and card access authority.</p></div></div>
            <div class="pmd-team-grid">
                <div class="pmd-team-panel"><strong>Account login</strong><p>Staff usernames and passwords continue to use the existing staff account authority.</p></div>
                <div class="pmd-team-panel"><strong>Biometric access</strong><p>{{ (int)$stats['biometric'] }} staff member(s) currently have biometric authentication enabled.</p></div>
                <div class="pmd-team-panel"><strong>Roles</strong><p>{{ (int)$stats['roles'] }} role(s) currently define staff permissions.</p></div>
            </div>
        </div>
    </section>
</div>
<script defer src="/app/admin/assets/js/pmd-team-v1.js?v=20260809_1"></script>
