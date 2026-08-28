@php
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16
    $pmdSettingsText = $pmdSettingsText ?? static function ($value) {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish((string)$value, 'settings.');
    };
@endphp

<style id="pmd-team-v2-first-paint">
html,body,.page,.page-wrapper,.page-content,.content-wrapper,.container,.container-fluid,#pmd-team-access{background:#f8fbfd!important}
.navbar-top,.navbar-fixed-top{display:none!important}
#pmd-team-access{min-height:100vh;padding:0 16px 64px;color:#112823}
#pmd-team-access *{box-sizing:border-box;animation:none!important;transition:none!important}
.pmd-team-header{height:64px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 18px}
.pmd-team-header__left,.pmd-team-header__actions{display:flex;align-items:center;gap:10px}.pmd-team-header__actions{margin-left:auto}.pmd-team-header h1{margin:0;font-size:22px;font-weight:760}
.pmd-team-btn{width:42px;height:42px;display:inline-flex;align-items:center;justify-content:center;border:1px solid #c9e0ef;border-radius:11px;background:#fff;color:#17231f;text-decoration:none}.pmd-team-btn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2}
.pmd-team-card{overflow:hidden;margin-bottom:18px;border:1px solid #dfe9e6;border-radius:18px;background:#fff;box-shadow:0 10px 28px rgba(17,40,35,.05)}
.pmd-team-card__header{min-height:80px;display:flex;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid #e7efec;background:linear-gradient(90deg,#edf9f4 0,#fff 31%,#fff 100%)}
.pmd-team-card__header h2{margin:0;font-size:20px}.pmd-team-card__header p{margin:4px 0 0;color:#6f7f7b;font-size:12px}.pmd-team-header-actions{margin-left:auto}.pmd-team-action{height:38px;display:inline-flex;align-items:center;padding:0 12px;border:1px solid #bcdacf;border-radius:10px;background:#fff;color:#0d5b4b!important;font-size:12px;font-weight:760}
.pmd-team-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:16px}.pmd-team-stat{padding:14px;border:1px solid #e2ece9;border-radius:14px}.pmd-team-stat span{display:block;color:#74837f;font-size:10px;font-weight:800;text-transform:uppercase}.pmd-team-stat strong{display:block;margin-top:7px;font-size:22px}
.pmd-team-list{padding:0 16px 8px}.pmd-team-row{display:grid;grid-template-columns:minmax(220px,1.5fr) minmax(140px,.8fr) 100px 42px;align-items:center;gap:14px;min-height:74px;border-top:1px solid #e9f0ee}.pmd-team-person strong{display:block;font-size:13px}.pmd-team-person small{display:block;margin-top:3px;color:#788682;font-size:11px}.pmd-team-role{font-size:12px;font-weight:740}.pmd-team-status{font-size:11px;font-weight:800;color:#75837f}.pmd-team-status.is-active{color:#087052}.pmd-team-edit{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:1px solid #d7e5e1;border-radius:9px;background:#fff;color:#56716a}
.pmd-team-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:16px}.pmd-team-panel{min-height:112px;padding:14px;border:1px solid #e1ebe8;border-radius:14px;background:#fff}.pmd-team-panel strong{font-size:13px}.pmd-team-panel p{margin:6px 0 0;color:#71807c;font-size:11px;line-height:1.45}.pmd-team-lock{display:inline-flex;margin-top:10px;padding:4px 8px;border-radius:999px;background:#eef5f2;color:#41675e;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
@media(max-width:760px){.pmd-team-stats,.pmd-team-grid{grid-template-columns:1fr}.pmd-team-row{grid-template-columns:1fr 42px}.pmd-team-role,.pmd-team-status{grid-column:1}.pmd-team-edit{grid-column:2;grid-row:1}.pmd-team-header-actions{display:block}}
</style>

@php
    $staff = $pmdTeam['staff'] ?? collect();
    $roles = $pmdTeam['roles'] ?? collect();
    $stats = $pmdTeam['stats'] ?? ['total'=>0,'active'=>0,'roles'=>0];
@endphp

@include('admin::_partials.pmd_settings_family_first_paint_v18')

<div id="pmd-team-access" data-pmd-team-access>
    <header class="pmd-team-header" id="pmd-team-header">
        <div class="pmd-team-header__left">
            <a class="pmd-team-btn" href="{{ admin_url('pmdsettings') }}" aria-label="{{ $pmdSettingsText('Back') }}">
                <svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg>
            </a>
            <h1>{{ $pmdSettingsText('Team & access') }}</h1>
        </div>
        <div class="pmd-team-header__actions" data-pmd-team-actions>
            @include('admin::_partials.pmd_settings_family_notification_placeholder_v18')
        </div>
    </header>

    <section id="pmd-team-members-section">
        <div class="pmd-team-card">
            <div class="pmd-team-card__header">
                <div>
                    <h2>{{ $pmdSettingsText('Team members') }}</h2>
                    <p>{{ $pmdSettingsText('Simple staff accounts with one locked product role.') }}</p>
                </div>
                <div class="pmd-team-header-actions">
                    <button type="button" class="pmd-team-action" data-pmd-inline-open="team:staff:create">{{ $pmdSettingsText('Add staff member') }}</button>
                </div>
            </div>

            <div class="pmd-team-stats">
                <div class="pmd-team-stat"><span>{{ $pmdSettingsText('Team members') }}</span><strong>{{ (int)$stats['total'] }}</strong></div>
                <div class="pmd-team-stat"><span>{{ $pmdSettingsText('Active') }}</span><strong>{{ (int)$stats['active'] }}</strong></div>
                <div class="pmd-team-stat"><span>{{ $pmdSettingsText('Default roles') }}</span><strong>{{ (int)$stats['roles'] }}</strong></div>
            </div>

            <div class="pmd-team-list">
                @forelse($staff as $member)
                    <div class="pmd-team-row">
                        <div class="pmd-team-person">
                            <strong>{{ $member->staff_name ?: 'Unnamed staff' }}</strong>
                            <small>{{ optional($member->user)->username ?: 'No username' }}</small>
                        </div>
                        <div class="pmd-team-role">{{ optional($member->role)->name ?: 'No role' }}</div>
                        <div class="pmd-team-status {{ !empty($member->staff_status) ? 'is-active' : '' }}">{{ !empty($member->staff_status) ? 'Active' : 'Disabled' }}</div>
                        <button type="button" class="pmd-team-edit" data-pmd-inline-open="team:staff:edit:{{ $member->staff_id }}" aria-label="Edit {{ $member->staff_name }}">✎</button>
                    </div>
                @empty
                    <div class="pmd-team-row"><div class="pmd-team-person"><strong>No team members yet</strong><small>Add the first staff member.</small></div></div>
                @endforelse
            </div>
        </div>
    </section>

    <section id="pmd-team-roles-section">
        <div class="pmd-team-card">
            <div class="pmd-team-card__header">
                <div>
                    <h2>{{ $pmdSettingsText('Default roles') }}</h2>
                    <p>{{ $pmdSettingsText('These roles are product defaults and cannot be edited here.') }}</p>
                </div>
            </div>
            <div class="pmd-team-grid">
                @foreach($roles as $role)
                    <div class="pmd-team-panel">
                        <strong>{{ $role->name }}</strong>
                        <p>{{ $role->description }}</p>
                        <span class="pmd-team-lock">{{ $pmdSettingsText('Locked default') }}</span>
                    </div>
                @endforeach
            </div>
        </div>
    </section>
</div>

@include('admin::pmdteam._inline_templates_v1')
@include('admin::_partials.pmd_settings_inline_modal_host_v1')
