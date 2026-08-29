@php
    $shifts = collect($shifts ?? []);
    $openShifts = collect($openShifts ?? []);
    $requests = collect($requests ?? []);
    $managementRequests = collect($managementRequests ?? []);
    $groups = collect($groups ?? []);
    $messages = collect($messages ?? []);
    $teamMembers = collect($teamMembers ?? []);
    $workRuleWarnings = $workRuleWarnings ?? [];
    $today = now()->startOfDay();
    $upcoming = $shifts->filter(fn($s) => \Carbon\Carbon::parse($s->shift_date)->endOfDay()->gte($today))->values();
    $next = $upcoming->first();
    $pending = $requests->where('status', 'pending')->count();
    $requestLabels = ['shift_change'=>'Shift change','time_off'=>'Time off','sick'=>'Sick','cover_shift'=>'Open shift'];
@endphp
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <title>Staff Portal · PayMyDine</title>
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-staff-v3">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-staff-portal-v1.css?v=3">
</head>
<body class="pmd-staff-portal-page">
<div class="pmd-staff-app" data-pmd-staff-portal>
    <header class="pmd-staff-topbar">
        <a href="/staff" class="pmd-staff-brand" aria-label="PayMyDine Staff Portal">
            <img src="/app/admin/assets/images/pmd-brand-full.svg" alt="PayMyDine">
            <span>Staff Portal</span>
        </a>
        <div class="pmd-staff-topbar__actions">
            @if(!empty($workspaceRoute) && $roleCode !== \Admin\Services\PmdDefaultStaffRoleService::TEAM_MEMBER)
                <a class="pmd-staff-workspace-link" href="{{ admin_url($workspaceRoute) }}">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM8 9h8M8 13h5"></path></svg>
                    <span>Workspace</span>
                </a>
            @endif
            <div class="pmd-staff-person">
                <span class="pmd-staff-person__avatar">{{ strtoupper(mb_substr((string)$person->display_name,0,1)) }}</span>
                <div><strong>{{ $person->display_name }}</strong><small>{{ $person->job_role ?: 'Team member' }}</small></div>
            </div>
            <form method="post" action="/staff/logout">@csrf<button type="submit" class="pmd-staff-signout" aria-label="Sign out"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8l4 4-4 4M18 12H8M8 5V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1"></path></svg><span>Sign out</span></button></form>
        </div>
    </header>

    @if(session('success'))<div class="pmd-staff-flash is-success">{{ session('success') }}</div>@endif
    @if(session('error'))<div class="pmd-staff-flash is-error">{{ session('error') }}</div>@endif
    @if($errors->any())<div class="pmd-staff-flash is-error">{{ $errors->first() }}</div>@endif

    <nav class="pmd-staff-mobile-nav" aria-label="Staff Portal sections">
        <a href="#chat"><svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-15a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path></svg><span>Chat</span></a>
        <a href="#schedule"><svg viewBox="0 0 24 24"><path d="M4 5h16v15H4zM8 3v4M16 3v4M4 10h16"></path></svg><span>Shifts</span></a>
        <a href="#requests"><svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"></path></svg><span>Requests</span>@if($pending)<b>{{ $pending }}</b>@endif</a>
        @if($canManage)<a href="#management"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path></svg><span>Manage</span>@if($managementRequests->count())<b>{{ $managementRequests->count() }}</b>@endif</a>@endif
    </nav>

    <div class="pmd-staff-layout">
        <aside class="pmd-staff-sidebar">
            <section class="pmd-staff-next">
                <div class="pmd-staff-next__icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg></div>
                <div><span>Next shift</span><strong>{{ $next ? \Carbon\Carbon::parse($next->shift_date)->format('D, d M') : 'Nothing planned' }}</strong><small>{{ $next ? (($next->starts_at ? substr((string)$next->starts_at,0,5) : 'All day').($next->ends_at ? ' – '.substr((string)$next->ends_at,0,5) : '')) : 'Your schedule will appear here' }}</small></div>
            </section>

            <section class="pmd-staff-groups">
                <header class="pmd-staff-panel-head">
                    <div class="pmd-staff-section-title"><span class="pmd-staff-section-icon"><svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-15a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path></svg></span><div><small>Team chat</small><h2>Conversations</h2></div></div>
                    @if(!empty($chatReady))<button type="button" class="pmd-staff-icon-button" data-pmd-group-toggle aria-label="Create group"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg></button>@endif
                </header>
                @if(!empty($chatReady))
                    <div class="pmd-staff-group-list">
                        @foreach($groups as $group)
                            <a href="/staff?group={{ (int)$group->id }}#chat" class="{{ $activeGroup && (int)$activeGroup->id === (int)$group->id ? 'is-active' : '' }}">
                                <span class="pmd-staff-group-avatar">{{ strtoupper(mb_substr((string)$group->name,0,1)) }}</span>
                                <div><strong>{{ $group->name }}</strong><small>{{ $group->group_type === 'team' ? 'Everyone in this restaurant' : 'Private staff group' }}</small></div>
                                <svg class="pmd-staff-chevron" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg>
                            </a>
                        @endforeach
                    </div>
                    <form method="post" action="/staff/groups" class="pmd-staff-group-create" data-pmd-group-form hidden>
                        @csrf
                        <label><span>Group name</span><input name="name" maxlength="96" required placeholder="Kitchen team"></label>
                        <div class="pmd-staff-group-members">
                            @foreach($teamMembers as $member)
                                <label><input type="checkbox" name="member_ids[]" value="{{ (int)$member->staff_id }}" {{ (int)$member->staff_id === (int)$staffId ? 'checked disabled' : '' }}><span>{{ $member->display_name }}</span></label>
                            @endforeach
                        </div>
                        <button type="submit">Create group</button>
                    </form>
                @else
                    <div class="pmd-staff-empty"><strong>Chat is not ready</strong><span>Staff chat becomes available after the Staff Portal database update.</span></div>
                @endif
            </section>
        </aside>

        <main id="chat" class="pmd-staff-chat">
            <header class="pmd-staff-chat__head">
                <div class="pmd-staff-section-title"><span class="pmd-staff-section-icon"><svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-15a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path></svg></span><div><small>Conversation</small><h1>{{ $activeGroup ? $activeGroup->name : 'Team' }}</h1></div></div>
                <span class="pmd-staff-chat-badge">{{ $activeGroup && $activeGroup->group_type === 'team' ? 'Restaurant team' : 'Staff group' }}</span>
            </header>
            <div class="pmd-staff-chat__messages">
                @forelse($messages as $message)
                    <article class="{{ (int)$message->staff_id === (int)$staffId ? 'is-me' : '' }}">
                        <div><small>{{ (int)$message->staff_id === (int)$staffId ? 'You' : ($message->staff_name ?: 'Team') }} · {{ \Carbon\Carbon::parse($message->created_at)->format('H:i') }}</small><p>{{ $message->message }}</p></div>
                    </article>
                @empty
                    <div class="pmd-staff-chat-empty"><span class="pmd-staff-chat-empty__icon"><svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-15a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path></svg></span><strong>Start the conversation</strong><span>Messages stay inside this restaurant team.</span></div>
                @endforelse
            </div>
            @if(!empty($chatReady) && $activeGroup)
                <form method="post" action="/staff/chat/message" class="pmd-staff-composer">
                    @csrf<input type="hidden" name="group_id" value="{{ (int)$activeGroup->id }}">
                    <textarea name="message" rows="1" maxlength="4000" required placeholder="Message {{ $activeGroup->name }}…"></textarea>
                    <button type="submit" aria-label="Send message"><svg viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4zM22 2 11 13"></path></svg><span>Send</span></button>
                </form>
            @endif
        </main>

        <aside class="pmd-staff-tools">
            <section id="schedule" class="pmd-staff-tool-card">
                <header class="pmd-staff-panel-head">
                    <div class="pmd-staff-section-title"><span class="pmd-staff-section-icon is-blue"><svg viewBox="0 0 24 24"><path d="M4 5h16v15H4zM8 3v4M16 3v4M4 10h16"></path></svg></span><div><small>Schedule</small><h2>My shifts</h2></div></div>
                    <b class="pmd-staff-count">{{ $upcoming->count() }}</b>
                </header>
                <div class="pmd-staff-shifts">
                    @forelse($upcoming->take(8) as $shift)
                        @php $rule = $workRuleWarnings[(int)$shift->id] ?? null; @endphp
                        <article>
                            <time><strong>{{ \Carbon\Carbon::parse($shift->shift_date)->format('d') }}</strong><small>{{ \Carbon\Carbon::parse($shift->shift_date)->format('M') }}</small></time>
                            <div><strong>{{ $shift->label ?: 'Shift' }}</strong><span>{{ $shift->starts_at ? substr((string)$shift->starts_at,0,5) : 'All day' }}@if($shift->ends_at) – {{ substr((string)$shift->ends_at,0,5) }}@endif@if(isset($shift->break_minutes) && (int)$shift->break_minutes > 0) · {{ (int)$shift->break_minutes }}m break @endif</span>@if($rule && !empty($rule['warnings']))<small class="pmd-staff-rule-warning">{{ $rule['warnings'][0]['message'] }}</small>@endif</div>
                            <button type="button" data-pmd-request-shift="{{ (int)$shift->id }}">Change</button>
                        </article>
                    @empty<div class="pmd-staff-empty"><strong>No upcoming shifts</strong><span>Your next shifts will appear here.</span></div>@endforelse
                </div>
            </section>

            @if($openShifts->isNotEmpty())
            <section id="open-shifts" class="pmd-staff-tool-card">
                <header class="pmd-staff-panel-head">
                    <div class="pmd-staff-section-title"><span class="pmd-staff-section-icon is-gold"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg></span><div><small>Available</small><h2>Open shifts</h2></div></div>
                    <b class="pmd-staff-count">{{ $openShifts->count() }}</b>
                </header>
                <div class="pmd-staff-open-shifts">
                    @foreach($openShifts as $shift)
                        <article><div><strong>{{ \Carbon\Carbon::parse($shift->shift_date)->format('D, d M') }}</strong><small>{{ $shift->starts_at ? substr((string)$shift->starts_at,0,5) : 'All day' }}@if($shift->ends_at) – {{ substr((string)$shift->ends_at,0,5) }}@endif · {{ $shift->label ?: 'Shift' }}</small></div><form method="post" action="/staff/request">@csrf<input type="hidden" name="request_type" value="cover_shift"><input type="hidden" name="shift_id" value="{{ (int)$shift->id }}"><input type="hidden" name="message" value="I can take this open shift."><button type="submit">I can work</button></form></article>
                    @endforeach
                </div>
            </section>
            @endif

            <section id="requests" class="pmd-staff-tool-card">
                <header class="pmd-staff-panel-head">
                    <div class="pmd-staff-section-title"><span class="pmd-staff-section-icon is-violet"><svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"></path></svg></span><div><small>Requests</small><h2>Ask management</h2></div></div>
                    @if($pending)<b class="pmd-staff-count">{{ $pending }}</b>@endif
                </header>
                @if(!empty($requestsReady))
                    <form method="post" action="/staff/request" class="pmd-staff-request-form" data-pmd-staff-request-form>
                        @csrf<input type="hidden" name="request_type" value="time_off" data-pmd-request-type><input type="hidden" name="shift_id" value="" data-pmd-request-shift-id>
                        <div class="pmd-staff-request-types"><button type="button" class="is-active" data-pmd-request-type-button="time_off">Time off</button><button type="button" data-pmd-request-type-button="shift_change">Shift change</button><button type="button" data-pmd-request-type-button="sick">Sick</button></div>
                        <div class="pmd-staff-dates" data-pmd-request-dates><label><span>From</span><input type="date" name="date_from"></label><label><span>To</span><input type="date" name="date_to"></label></div>
                        <label class="pmd-staff-request-note"><span>Message</span><textarea name="message" rows="3" maxlength="2000" required placeholder="Add a short note for management…"></textarea></label>
                        <button type="submit" class="pmd-staff-primary">Send request</button>
                    </form>
                    <div class="pmd-staff-request-history">
                        @foreach($requests->whereIn('request_type',['shift_change','time_off','sick','cover_shift'])->take(8) as $item)
                            <div><span>{{ $requestLabels[$item->request_type] ?? ucfirst(str_replace('_',' ',$item->request_type)) }}</span><strong class="is-{{ $item->status }}">{{ ucfirst((string)$item->status) }}</strong></div>
                        @endforeach
                    </div>
                @else
                    <div class="pmd-staff-empty"><strong>Requests are not ready</strong><span>Request storage is not available for this restaurant yet.</span></div>
                @endif
            </section>

            @if($canManage)
            <section id="management" class="pmd-staff-tool-card is-management">
                <header class="pmd-staff-panel-head">
                    <div class="pmd-staff-section-title"><span class="pmd-staff-section-icon is-green"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path></svg></span><div><small>Management</small><h2>Team actions</h2></div></div>
                    @if($managementRequests->count())<b class="pmd-staff-count">{{ $managementRequests->count() }}</b>@endif
                </header>
                <div class="pmd-staff-management-links"><a href="{{ admin_url('shifts') }}"><svg viewBox="0 0 24 24"><path d="M4 5h16v15H4zM8 3v4M16 3v4M4 10h16"></path></svg><span>Open Shifts</span></a><a href="{{ admin_url('settings/team') }}"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path></svg><span>Manage Team</span></a></div>
                <div class="pmd-staff-management-list">
                    @forelse($managementRequests as $item)
                        <article><div><strong>{{ $item->person_name ?: 'Team member' }}</strong><small>{{ $requestLabels[$item->request_type] ?? ucfirst(str_replace('_',' ',$item->request_type)) }} · {{ \Carbon\Carbon::parse($item->created_at)->format('d M H:i') }}</small><p>{{ $item->message }}</p></div><form method="post" action="/staff/request/handle">@csrf<input type="hidden" name="id" value="{{ (int)$item->id }}"><button name="decision" value="approved" type="submit">Approve</button><button name="decision" value="declined" type="submit" class="is-decline">Decline</button></form></article>
                    @empty<div class="pmd-staff-empty"><strong>All caught up</strong><span>Nothing is waiting for approval.</span></div>@endforelse
                </div>
            </section>
            @endif
        </aside>
    </div>
</div>
<script>
(function(){
    var root=document.querySelector('[data-pmd-staff-portal]');if(!root)return;
    var groupToggle=root.querySelector('[data-pmd-group-toggle]'),groupForm=root.querySelector('[data-pmd-group-form]');
    if(groupToggle&&groupForm)groupToggle.addEventListener('click',function(){groupForm.hidden=!groupForm.hidden;});
    var form=root.querySelector('[data-pmd-staff-request-form]');
    if(form){
        var type=form.querySelector('[data-pmd-request-type]'),shift=form.querySelector('[data-pmd-request-shift-id]'),dates=form.querySelector('[data-pmd-request-dates]');
        function pick(value,id){type.value=value;shift.value=id||'';dates.hidden=value==='shift_change';form.querySelectorAll('[data-pmd-request-type-button]').forEach(function(b){b.classList.toggle('is-active',b.dataset.pmdRequestTypeButton===value);});var textarea=form.querySelector('textarea');if(textarea)textarea.focus();}
        root.addEventListener('click',function(e){var b=e.target.closest('[data-pmd-request-type-button]');if(b){e.preventDefault();pick(b.dataset.pmdRequestTypeButton,'');return;}var s=e.target.closest('[data-pmd-request-shift]');if(s){e.preventDefault();pick('shift_change',s.dataset.pmdRequestShift);location.hash='requests';}});
    }
    var messages=root.querySelector('.pmd-staff-chat__messages');if(messages)messages.scrollTop=messages.scrollHeight;
})();
</script>
</body>
</html>
