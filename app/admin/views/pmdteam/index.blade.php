@php
    $pmdSettingsText = $pmdSettingsText ?? static function ($value) {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish((string)$value, 'settings.');
    };
    $roles = collect($pmdTeam['roles'] ?? []);
    $stats = $pmdTeam['stats'] ?? ['total'=>0,'with_login'=>0,'needs_login'=>0];
    $rosterReady = !empty($pmdTeam['roster_ready']);
    $roster = collect($pmdTeam['roster'] ?? []);
    $staffById = collect($pmdTeam['staff_by_id'] ?? []);
    $legacyAccessOnly = collect($pmdTeam['legacy_access_only'] ?? []);
    $departmentLabels = $pmdTeam['departments'] ?? [];
@endphp

<style id="pmd-team-v5-first-paint">
html,body,.page,.page-wrapper,.page-content,.content-wrapper,.container,.container-fluid,#pmd-team-access{background:#f8fbfd!important}.navbar-top,.navbar-fixed-top{display:none!important}#pmd-team-access{min-height:100vh;padding:0 16px 64px;color:#112823}#pmd-team-access *{box-sizing:border-box}.pmd-team-header{height:64px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 auto 18px;max-width:1480px}.pmd-team-header__left,.pmd-team-header__actions{display:flex;align-items:center;gap:10px}.pmd-team-header__actions{margin-left:auto}.pmd-team-header h1{margin:0;font-size:22px;font-weight:800;letter-spacing:-.025em}.pmd-team-btn{width:42px;height:42px;display:inline-flex;align-items:center;justify-content:center;border:1px solid #c9e0ef;border-radius:11px;background:#fff;color:#17231f;text-decoration:none}.pmd-team-btn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.pmd-team-header-link{min-height:42px;display:inline-flex;align-items:center;gap:7px;padding:0 13px;border:1px solid #c9e0ef;border-radius:11px;background:#fff;color:#173752;text-decoration:none;font-size:12px;font-weight:800}.pmd-team-header-link svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.pmd-team-shell{max-width:1480px;margin:0 auto}.pmd-team-card{overflow:hidden;margin-bottom:18px;border:1px solid #dfe9e6;border-radius:18px;background:#fff;box-shadow:0 10px 28px rgba(17,40,35,.05)}.pmd-team-card__header{min-height:80px;display:flex;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid #e7efec;background:linear-gradient(90deg,#edf9f4 0,#fff 31%,#fff 100%)}.pmd-team-card__header h2{margin:0;font-size:20px;font-weight:850}.pmd-team-card__header p{margin:4px 0 0;color:#6f7f7b;font-size:12px}.pmd-team-header-actions{margin-left:auto;display:flex;gap:8px}.pmd-team-action{height:38px;display:inline-flex;align-items:center;padding:0 12px;border:1px solid #bcdacf;border-radius:10px;background:#fff;color:#0d5b4b;font-size:12px;font-weight:780;cursor:pointer;text-decoration:none}.pmd-team-action.is-primary{background:#075f4f;border-color:#075f4f;color:#fff}.pmd-team-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:16px}.pmd-team-stat{position:relative;overflow:hidden;padding:14px;border:1px solid #e2ece9;border-radius:14px;background:#fff}.pmd-team-stat:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#8fbeb1}.pmd-team-stat.is-green:before{background:#1aa37a}.pmd-team-stat.is-blue:before{background:#4a8fd4}.pmd-team-stat.is-amber:before{background:#d79a2b}.pmd-team-stat span{display:block;color:#74837f;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}.pmd-team-stat strong{display:block;margin-top:7px;font-size:24px;font-weight:900}.pmd-team-list{padding:0 16px 8px}.pmd-team-row{display:grid;grid-template-columns:minmax(220px,1.5fr) minmax(150px,.85fr) minmax(150px,.8fr) 42px;align-items:center;gap:14px;min-height:74px;border-top:1px solid #e9f0ee}.pmd-team-person{display:flex;align-items:center;gap:11px;min-width:0}.pmd-team-avatar{width:38px;height:38px;display:grid;place-items:center;flex:0 0 38px;border-radius:11px;background:#edf8f4;color:#075f4f;font-size:13px;font-weight:900}.pmd-team-person-copy{min-width:0}.pmd-team-person strong{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pmd-team-person small{display:block;margin-top:3px;color:#788682;font-size:11px}.pmd-team-role{font-size:12px;font-weight:760}.pmd-team-status{font-size:11px;font-weight:800;color:#087052}.pmd-team-status.is-needs{display:inline-flex;width:max-content;padding:5px 8px;border-radius:999px;background:#fff5df;color:#97620c}.pmd-team-edit{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:1px solid #d7e5e1;border-radius:9px;background:#fff;color:#56716a;cursor:pointer}.pmd-team-empty{padding:22px 4px;color:#71807c;font-size:12px}.pmd-team-empty strong{display:block;margin-bottom:4px;color:#243d37;font-size:13px}.pmd-team-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:16px}.pmd-team-panel{min-height:112px;padding:14px;border:1px solid #e1ebe8;border-radius:14px;background:#fff}.pmd-team-panel strong{font-size:13px}.pmd-team-panel p{margin:6px 0 0;color:#71807c;font-size:11px;line-height:1.45}.pmd-team-lock{display:inline-flex;margin-top:10px;padding:4px 8px;border-radius:999px;background:#eef5f2;color:#41675e;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.pmd-team-note{margin:16px;padding:13px 15px;border:1px solid #efd9aa;border-left:4px solid #d79a2b;border-radius:13px;background:#fffaf0;color:#6e531d;font-size:11px;line-height:1.5}.pmd-team-note strong{display:block;margin-bottom:3px}.pmd-team-portal-note{padding:0 16px 16px;color:#6d8079;font-size:11px;line-height:1.5}@media(max-width:760px){.pmd-team-stats,.pmd-team-grid{grid-template-columns:1fr}.pmd-team-row{grid-template-columns:1fr 42px;padding:10px 0}.pmd-team-role,.pmd-team-status{grid-column:1}.pmd-team-edit{grid-column:2;grid-row:1}.pmd-team-header-link span{display:none}}
</style>

@include('admin::_partials.pmd_settings_family_first_paint_v18')

<div id="pmd-team-access" data-pmd-team-access>
    <header class="pmd-team-header" id="pmd-team-header">
        <div class="pmd-team-header__left">
            <a class="pmd-team-btn" href="{{ admin_url('pmdsettings') }}" aria-label="{{ $pmdSettingsText('Back') }}"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg></a>
            <h1>{{ $pmdSettingsText('Team') }}</h1>
        </div>
        <div class="pmd-team-header__actions" data-pmd-team-actions>
            <a class="pmd-team-header-link" href="{{ admin_url('shifts') }}"><svg viewBox="0 0 24 24"><path d="M4 5h16v15H4z"></path><path d="M8 3v4M16 3v4M4 10h16"></path></svg><span>{{ $pmdSettingsText('Shifts') }}</span></a>
            <a class="pmd-team-header-link" href="{{ url('/staff/login') }}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg><span>{{ $pmdSettingsText('Staff Portal') }}</span></a>
            @include('admin::_partials.pmd_settings_family_notification_placeholder_v18')
        </div>
    </header>

    <div class="pmd-team-shell">
        <section id="pmd-team-roster-section">
            <div class="pmd-team-card">
                <div class="pmd-team-card__header">
                    <div><h2>{{ $pmdSettingsText('Restaurant team') }}</h2><p>{{ $pmdSettingsText('One profile and one login per person. The PMD role controls their workspace; everyone can also use Staff Portal.') }}</p></div>
                    @if($rosterReady)<div class="pmd-team-header-actions"><button type="button" class="pmd-team-action is-primary" data-pmd-inline-open="team:person:create">+ {{ $pmdSettingsText('Add member') }}</button></div>@endif
                </div>

                @if(!$rosterReady)
                    <div class="pmd-team-note"><strong>{{ $pmdSettingsText('Team data is being prepared.') }}</strong>{{ $pmdSettingsText('Run the latest PMD migration once. Existing staff accounts are unaffected.') }}</div>
                @else
                    <div class="pmd-team-stats">
                        <div class="pmd-team-stat is-blue"><span>{{ $pmdSettingsText('Team') }}</span><strong>{{ (int)$stats['total'] }}</strong></div>
                        <div class="pmd-team-stat is-green"><span>{{ $pmdSettingsText('Ready to sign in') }}</span><strong>{{ (int)$stats['with_login'] }}</strong></div>
                        <div class="pmd-team-stat is-amber"><span>{{ $pmdSettingsText('Needs login') }}</span><strong>{{ (int)$stats['needs_login'] }}</strong></div>
                    </div>

                    <div class="pmd-team-list">
                        @forelse($roster as $person)
                            @php
                                $member = !empty($person->staff_id) ? $staffById->get((int)$person->staff_id) : null;
                                $department = $departmentLabels[$person->department] ?? ucfirst((string)$person->department ?: 'Other');
                                $job = trim((string)$person->job_role);
                                $roleName = $member && $member->role ? (string)$member->role->name : 'Team Member';
                                $username = $member && $member->user ? (string)$member->user->username : '';
                            @endphp
                            <div class="pmd-team-row">
                                <div class="pmd-team-person"><span class="pmd-team-avatar">{{ strtoupper(mb_substr((string)$person->display_name, 0, 1)) }}</span><span class="pmd-team-person-copy"><strong>{{ $person->display_name }}</strong><small>{{ $job !== '' ? $job.' · ' : '' }}{{ $department }}{{ $username !== '' ? ' · @'.$username : '' }}</small></span></div>
                                <div class="pmd-team-role">{{ $member ? $roleName : $pmdSettingsText('Choose PMD role') }}</div>
                                <div class="pmd-team-status {{ $member ? '' : 'is-needs' }}">{{ $member ? $pmdSettingsText('Active') : $pmdSettingsText('Needs login') }}</div>
                                <button type="button" class="pmd-team-edit" data-pmd-inline-open="team:person:edit:{{ $person->id }}" aria-label="Edit {{ $person->display_name }}">✎</button>
                            </div>
                        @empty
                            <div class="pmd-team-empty"><strong>{{ $pmdSettingsText('No team members yet') }}</strong>{{ $pmdSettingsText('Add the first member with their PMD role and login.') }}</div>
                        @endforelse
                    </div>

                    @if($legacyAccessOnly->isNotEmpty())
                        <div class="pmd-team-note"><strong>{{ $pmdSettingsText('Legacy accounts need a Team profile') }}</strong>{{ $legacyAccessOnly->count() }} {{ $pmdSettingsText('existing PMD account(s) are not linked to the shift roster yet. They remain usable; connect them before relying on Staff Portal or scheduling.') }}</div>
                    @endif

                    <div class="pmd-team-portal-note">{{ $pmdSettingsText('Team Member is the role for employees who do not need an operational PMD workspace. Their credentials go directly to Staff Portal. Owner, Manager, Cashier, Waiter, Accountant, Reservations and KDS keep their restricted workspaces and can use the same credentials for Staff Portal whenever they want.') }}</div>
                @endif
            </div>
        </section>

        <section id="pmd-team-roles-section">
            <div class="pmd-team-card">
                <div class="pmd-team-card__header"><div><h2>{{ $pmdSettingsText('PMD roles') }}</h2><p>{{ $pmdSettingsText('Roles decide what the person can open after normal PMD login. They do not create a second person record.') }}</p></div></div>
                <div class="pmd-team-grid">
                    @foreach($roles as $role)
                        <div class="pmd-team-panel"><strong>{{ $role->name }}</strong><p>{{ $role->description }}</p><span class="pmd-team-lock">{{ $pmdSettingsText('Platform role') }}</span></div>
                    @endforeach
                </div>
            </div>
        </section>
    </div>
</div>

@include('admin::pmdteam._inline_templates_v1')
@include('admin::_partials.pmd_settings_inline_modal_host_v1')
