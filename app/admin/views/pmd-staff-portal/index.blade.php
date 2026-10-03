@php
    $shifts = collect($shifts ?? []);
    $openShifts = collect($openShifts ?? []);
    $requests = collect($requests ?? []);
    $managementRequests = collect($managementRequests ?? []);
    $groups = collect($groups ?? []);
    $messages = collect($messages ?? []);
    $teamMembers = collect($teamMembers ?? []);
    $teamMembersByStaff = collect($teamMembersByStaff ?? []);
    $workRuleWarnings = $workRuleWarnings ?? [];
    $today = now()->startOfDay();
    $upcoming = $shifts->filter(fn($s) => \Carbon\Carbon::parse($s->shift_date)->endOfDay()->gte($today))->values();
    $next = $upcoming->first();
    $pending = $requests->where('status', 'pending')->count();
    $requestLabels = [
        'shift_change' => 'Shift change',
        'time_off' => 'Time off',
        'sick' => 'Sick',
        'cover_shift' => 'Open shift',
    ];
    $requestType = old('request_type', 'time_off');
    $selectedShiftId = (int)old('shift_id', 0);
    $selectedShift = $selectedShiftId > 0 ? $shifts->firstWhere('id', $selectedShiftId) : null;
@endphp
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Staff Portal · PayMyDine</title>
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-staff-v5">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-staff-portal-v1.css?v=5">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-staff-portal-v2.css?v=1">
</head>
<body class="pmd-staff-portal-page">
<div class="pmd-staff-app" data-pmd-staff-portal>
    <header class="pmd-staff-topbar">
        <a href="{{ admin_url('mywork') }}" class="pmd-staff-brand" aria-label="PayMyDine Staff Portal">
            <img src="https://mimoza.paymydine.com/brand/paymydine-logo.svg" alt="PayMyDine">
            <span>Staff Portal</span>
        </a>

        <div class="pmd-staff-topbar__actions">
            @if(!empty($workspaceRoute) && $roleCode !== \Admin\Services\PmdDefaultStaffRoleService::TEAM_MEMBER)
                <a class="pmd-staff-workspace-link" href="{{ admin_url($workspaceRoute) }}">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM8 9h8M8 13h5"></path></svg>
                    <span>Workspace</span>
                </a>
            @endif

            <button type="button" class="pmd-staff-person pmd-staff-person-button" data-pmd-profile-open aria-label="Edit my profile">
                <span class="pmd-staff-person__avatar pmd-staff-avatar">
                    @if(!empty($person->avatar_url))
                        <img src="{{ $person->avatar_url }}" alt="{{ $person->display_name }}">
                    @else
                        <span>{{ strtoupper(mb_substr((string)$person->display_name, 0, 1)) }}</span>
                    @endif
                </span>
                <span class="pmd-staff-person__copy">
                    <strong>{{ $person->display_name }}</strong>
                    <small>{{ $person->job_role ?: 'Team member' }}</small>
                </span>
                <svg class="pmd-staff-person__edit" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"></path></svg>
            </button>

            <form method="post" action="{{ admin_url('mywork/stafflogout') }}">
                @csrf
                <button type="submit" class="pmd-staff-signout" aria-label="Sign out">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8l4 4-4 4M18 12H8M8 5V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1"></path></svg>
                    <span>Sign out</span>
                </button>
            </form>
        </div>
    </header>

    @if(session('success'))
        <div class="pmd-staff-flash is-success">{{ session('success') }}</div>
    @endif
    @if(session('error'))
        <div class="pmd-staff-flash is-error">{{ session('error') }}</div>
    @endif
    @if($errors->any())
        <div class="pmd-staff-flash is-error">{{ $errors->first() }}</div>
    @endif

    <nav class="pmd-staff-mobile-nav" aria-label="Staff Portal sections">
        <a href="#chat">
            <svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-15a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path></svg>
            <span>Chat</span>
        </a>
        <a href="#schedule">
            <svg viewBox="0 0 24 24"><path d="M4 5h16v15H4zM8 3v4M16 3v4M4 10h16"></path></svg>
            <span>Shifts</span>
        </a>
        <a href="#requests">
            <svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"></path></svg>
            <span>Requests</span>
            @if($pending)
                <b>{{ $pending }}</b>
            @endif
        </a>
        <button type="button" data-pmd-profile-open>
            <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg>
            <span>Profile</span>
        </button>
        @if($canManage)
            <a href="#management">
                <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path></svg>
                <span>Manage</span>
                @if($managementRequests->count())
                    <b>{{ $managementRequests->count() }}</b>
                @endif
            </a>
        @endif
    </nav>

    <div class="pmd-staff-layout">
        <aside class="pmd-staff-sidebar">
            <section class="pmd-staff-next">
                <div class="pmd-staff-next__icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>
                </div>
                <div>
                    <span>Next shift</span>
                    <strong>{{ $next ? \Carbon\Carbon::parse($next->shift_date)->format('D, d M') : 'Nothing planned' }}</strong>
                    <small>
                        @if($next)
                            {{ $next->starts_at ? substr((string)$next->starts_at, 0, 5) : 'All day' }}
                            @if($next->ends_at)
                                – {{ substr((string)$next->ends_at, 0, 5) }}
                            @endif
                        @else
                            Your schedule will appear here
                        @endif
                    </small>
                </div>
            </section>

            <section class="pmd-staff-groups">
                <header class="pmd-staff-panel-head">
                    <div class="pmd-staff-section-title">
                        <span class="pmd-staff-section-icon">
                            <svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-15a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path></svg>
                        </span>
                        <div><small>Team chat</small><h2>Conversations</h2></div>
                    </div>
                    @if(!empty($chatReady))
                        <button type="button" class="pmd-staff-icon-button" data-pmd-group-toggle aria-label="Create group">
                            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
                        </button>
                    @endif
                </header>

                @if(!empty($chatReady))
                    <div class="pmd-staff-group-list">
                        @foreach($groups as $group)
                            <a href="{{ admin_url('mywork') }}?group={{ (int)$group->id }}#chat" class="{{ $activeGroup && (int)$activeGroup->id === (int)$group->id ? 'is-active' : '' }}">
                                <span class="pmd-staff-group-avatar">{{ strtoupper(mb_substr((string)$group->name, 0, 1)) }}</span>
                                <div>
                                    <strong>{{ $group->name }}</strong>
                                    <small>{{ $group->group_type === 'team' ? 'Everyone in this restaurant' : 'Private staff group' }}</small>
                                </div>
                                <svg class="pmd-staff-chevron" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg>
                            </a>
                        @endforeach
                    </div>

                    <form method="post" action="{{ admin_url('mywork/creategroup') }}" class="pmd-staff-group-create" data-pmd-group-form hidden>
                        @csrf
                        <div class="pmd-staff-inline-form-head">
                            <div><strong>New group</strong><small>Choose who should be in this conversation.</small></div>
                            <button type="button" data-pmd-group-close aria-label="Close group form">
                                <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg>
                            </button>
                        </div>
                        <label>
                            <span>Group name</span>
                            <input name="name" maxlength="96" required placeholder="Kitchen team">
                        </label>
                        <div class="pmd-staff-group-members">
                            @foreach($teamMembers as $member)
                                <label>
                                    <input type="checkbox" name="member_ids[]" value="{{ (int)$member->staff_id }}" {{ (int)$member->staff_id === (int)$staffId ? 'checked disabled' : '' }}>
                                    <span class="pmd-staff-member-option">
                                        <span class="pmd-staff-mini-avatar pmd-staff-avatar">
                                            @if(!empty($member->avatar_url))
                                                <img src="{{ $member->avatar_url }}" alt="">
                                            @else
                                                <span>{{ strtoupper(mb_substr((string)$member->display_name, 0, 1)) }}</span>
                                            @endif
                                        </span>
                                        <span>{{ $member->display_name }}</span>
                                    </span>
                                </label>
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
                <div class="pmd-staff-section-title">
                    <span class="pmd-staff-section-icon">
                        <svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-15a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path></svg>
                    </span>
                    <div><small>Conversation</small><h1>{{ $activeGroup ? $activeGroup->name : 'Team' }}</h1></div>
                </div>
                <span class="pmd-staff-chat-badge">{{ $activeGroup && $activeGroup->group_type === 'team' ? 'Restaurant team' : 'Staff group' }}</span>
            </header>

            <div class="pmd-staff-chat__messages">
                @forelse($messages as $message)
                    @php
                        $sender = $teamMembersByStaff->get((int)$message->staff_id);
                        $isMe = (int)$message->staff_id === (int)$staffId;
                        $senderName = $isMe ? 'You' : ($sender->display_name ?? $message->staff_name ?? 'Team');
                        $senderAvatar = $sender->avatar_url ?? null;
                    @endphp
                    <article class="{{ $isMe ? 'is-me' : '' }}">
                        <span class="pmd-staff-message-avatar pmd-staff-avatar">
                            @if($senderAvatar)
                                <img src="{{ $senderAvatar }}" alt="">
                            @else
                                <span>{{ strtoupper(mb_substr((string)$senderName, 0, 1)) }}</span>
                            @endif
                        </span>
                        <div>
                            <small>{{ $senderName }} · {{ \Carbon\Carbon::parse($message->created_at)->format('H:i') }}</small>
                            <p>{{ $message->message }}</p>
                        </div>
                    </article>
                @empty
                    <div class="pmd-staff-chat-empty">
                        <span class="pmd-staff-chat-empty__icon"><svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3v-15a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path></svg></span>
                        <strong>Start the conversation</strong>
                        <span>Messages stay inside this restaurant team.</span>
                    </div>
                @endforelse
            </div>

            @if(!empty($chatReady) && $activeGroup)
                <form method="post" action="{{ admin_url('mywork/sendmessage') }}" class="pmd-staff-composer">
                    @csrf
                    <input type="hidden" name="group_id" value="{{ (int)$activeGroup->id }}">
                    <textarea name="message" rows="1" maxlength="4000" required placeholder="Message {{ $activeGroup->name }}…"></textarea>
                    <button type="submit" aria-label="Send message">
                        <svg viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4zM22 2 11 13"></path></svg>
                        <span>Send</span>
                    </button>
                </form>
            @endif
        </main>

        <aside class="pmd-staff-tools">
            <section id="schedule" class="pmd-staff-tool-card">
                <header class="pmd-staff-panel-head">
                    <div class="pmd-staff-section-title">
                        <span class="pmd-staff-section-icon is-blue"><svg viewBox="0 0 24 24"><path d="M4 5h16v15H4zM8 3v4M16 3v4M4 10h16"></path></svg></span>
                        <div><small>Schedule</small><h2>My shifts</h2></div>
                    </div>
                    <b class="pmd-staff-count">{{ $upcoming->count() }}</b>
                </header>
                <div class="pmd-staff-shifts">
                    @forelse($upcoming->take(8) as $shift)
                        @php
                            $rule = $workRuleWarnings[(int)$shift->id] ?? null;
                            $shiftTime = ($shift->starts_at ? substr((string)$shift->starts_at, 0, 5) : 'All day').($shift->ends_at ? ' – '.substr((string)$shift->ends_at, 0, 5) : '');
                            $shiftLabel = trim((string)($shift->label ?: 'Shift'));
                        @endphp
                        <article>
                            <time><strong>{{ \Carbon\Carbon::parse($shift->shift_date)->format('d') }}</strong><small>{{ \Carbon\Carbon::parse($shift->shift_date)->format('M') }}</small></time>
                            <div>
                                <strong>{{ $shiftLabel }}</strong>
                                <span>
                                    {{ $shiftTime }}
                                    @if(isset($shift->break_minutes) && (int)$shift->break_minutes > 0)
                                        · {{ (int)$shift->break_minutes }}m break
                                    @endif
                                </span>
                                @if($rule && !empty($rule['warnings']))
                                    <small class="pmd-staff-rule-warning">{{ $rule['warnings'][0]['message'] }}</small>
                                @endif
                            </div>
                            @if(!empty($requestsReady))
                                <button
                                    type="button"
                                    data-pmd-request-shift="{{ (int)$shift->id }}"
                                    data-pmd-request-shift-label="{{ $shiftLabel }}"
                                    data-pmd-request-shift-date="{{ \Carbon\Carbon::parse($shift->shift_date)->format('D, d M') }}"
                                    data-pmd-request-shift-time="{{ $shiftTime }}"
                                >Change</button>
                            @endif
                        </article>
                    @empty
                        <div class="pmd-staff-empty"><strong>No upcoming shifts</strong><span>Your next shifts will appear here.</span></div>
                    @endforelse
                </div>
            </section>

            @if($openShifts->isNotEmpty())
                <section id="open-shifts" class="pmd-staff-tool-card">
                    <header class="pmd-staff-panel-head">
                        <div class="pmd-staff-section-title">
                            <span class="pmd-staff-section-icon is-gold"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg></span>
                            <div><small>Available</small><h2>Open shifts</h2></div>
                        </div>
                        <b class="pmd-staff-count">{{ $openShifts->count() }}</b>
                    </header>
                    <div class="pmd-staff-open-shifts">
                        @foreach($openShifts as $shift)
                            <article>
                                <div>
                                    <strong>{{ \Carbon\Carbon::parse($shift->shift_date)->format('D, d M') }}</strong>
                                    <small>
                                        {{ $shift->starts_at ? substr((string)$shift->starts_at, 0, 5) : 'All day' }}
                                        @if($shift->ends_at)
                                            – {{ substr((string)$shift->ends_at, 0, 5) }}
                                        @endif
                                        · {{ $shift->label ?: 'Shift' }}
                                    </small>
                                </div>
                                @if(!empty($requestsReady))
                                    <form method="post" action="{{ admin_url('mywork/saverequest') }}">
                                        @csrf
                                        <input type="hidden" name="request_type" value="cover_shift">
                                        <input type="hidden" name="shift_id" value="{{ (int)$shift->id }}">
                                        <input type="hidden" name="message" value="I can take this open shift.">
                                        <button type="submit">I can work</button>
                                    </form>
                                @endif
                            </article>
                        @endforeach
                    </div>
                </section>
            @endif

            <section id="requests" class="pmd-staff-tool-card">
                <header class="pmd-staff-panel-head">
                    <div class="pmd-staff-section-title">
                        <span class="pmd-staff-section-icon is-violet"><svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"></path></svg></span>
                        <div><small>Requests</small><h2>Ask management</h2></div>
                    </div>
                    @if($pending)
                        <b class="pmd-staff-count">{{ $pending }}</b>
                    @endif
                </header>

                @if(!empty($requestsReady))
                    <form method="post" action="{{ admin_url('mywork/saverequest') }}" class="pmd-staff-request-form" data-pmd-staff-request-form>
                        @csrf
                        <input type="hidden" name="request_type" value="{{ $requestType }}" data-pmd-request-type>
                        <input type="hidden" name="shift_id" value="{{ $selectedShiftId ?: '' }}" data-pmd-request-shift-id>

                        <div class="pmd-staff-request-types">
                            <button type="button" data-pmd-request-type-button="time_off">Time off</button>
                            <button type="button" data-pmd-request-type-button="sick">Sick</button>
                            <button type="button" data-pmd-request-type-button="shift_change">Shift change</button>
                        </div>

                        <div class="pmd-staff-selected-shift" data-pmd-selected-shift {{ $selectedShift ? '' : 'hidden' }}>
                            <span class="pmd-staff-selected-shift__icon"><svg viewBox="0 0 24 24"><path d="M4 5h16v15H4zM8 3v4M16 3v4M4 10h16"></path></svg></span>
                            <div>
                                <small>Selected shift</small>
                                <strong data-pmd-selected-shift-title>{{ $selectedShift ? ($selectedShift->label ?: 'Shift') : 'Choose a shift above' }}</strong>
                                <span data-pmd-selected-shift-meta>
                                    @if($selectedShift)
                                        {{ \Carbon\Carbon::parse($selectedShift->shift_date)->format('D, d M') }} · {{ $selectedShift->starts_at ? substr((string)$selectedShift->starts_at, 0, 5) : 'All day' }}@if($selectedShift->ends_at) – {{ substr((string)$selectedShift->ends_at, 0, 5) }}@endif
                                    @endif
                                </span>
                            </div>
                            <button type="button" data-pmd-clear-shift aria-label="Clear selected shift"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>
                        </div>

                        <p class="pmd-staff-request-help" data-pmd-request-help>Choose what you need and add a short note for management.</p>

                        <div class="pmd-staff-dates" data-pmd-request-dates>
                            <label><span>From</span><input type="date" name="date_from" value="{{ old('date_from') }}"></label>
                            <label><span>To</span><input type="date" name="date_to" value="{{ old('date_to') }}"></label>
                        </div>

                        <label class="pmd-staff-request-note">
                            <span>Message</span>
                            <textarea name="message" rows="3" maxlength="2000" required placeholder="Add a short note for management…" data-pmd-request-message>{{ old('message') }}</textarea>
                        </label>
                        <button type="submit" class="pmd-staff-primary" data-pmd-request-submit>Send request</button>
                    </form>

                    <div class="pmd-staff-request-history">
                        @forelse($requests->whereIn('request_type', ['shift_change','time_off','sick','cover_shift'])->take(10) as $item)
                            <article>
                                <div class="pmd-staff-request-history__top">
                                    <span>{{ $requestLabels[$item->request_type] ?? ucfirst(str_replace('_', ' ', $item->request_type)) }}</span>
                                    <strong class="is-{{ $item->status }}">{{ ucfirst((string)$item->status) }}</strong>
                                </div>
                                @if(!empty($item->request_shift_date))
                                    <small>{{ \Carbon\Carbon::parse($item->request_shift_date)->format('D, d M') }} · {{ $item->request_shift_label ?: 'Shift' }}</small>
                                @elseif(!empty($item->date_from))
                                    <small>{{ \Carbon\Carbon::parse($item->date_from)->format('d M Y') }}@if(!empty($item->date_to) && $item->date_to !== $item->date_from) – {{ \Carbon\Carbon::parse($item->date_to)->format('d M Y') }}@endif</small>
                                @endif
                                <p>{{ $item->message }}</p>
                                @if(!empty($item->manager_reply))
                                    <div class="pmd-staff-manager-reply"><b>Management</b><span>{{ $item->manager_reply }}</span></div>
                                @endif
                            </article>
                        @empty
                            <div class="pmd-staff-empty is-compact"><strong>No requests yet</strong><span>Your requests and decisions will appear here.</span></div>
                        @endforelse
                    </div>
                @else
                    <div class="pmd-staff-empty"><strong>Requests are not ready</strong><span>Request storage is not available for this restaurant yet.</span></div>
                @endif
            </section>

            @if($canManage)
                <section id="management" class="pmd-staff-tool-card is-management">
                    <header class="pmd-staff-panel-head">
                        <div class="pmd-staff-section-title">
                            <span class="pmd-staff-section-icon is-green"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path></svg></span>
                            <div><small>Management</small><h2>Team actions</h2></div>
                        </div>
                        @if($managementRequests->count())
                            <b class="pmd-staff-count">{{ $managementRequests->count() }}</b>
                        @endif
                    </header>
                    <div class="pmd-staff-management-links">
                        <a href="{{ admin_url('shifts') }}"><svg viewBox="0 0 24 24"><path d="M4 5h16v15H4zM8 3v4M16 3v4M4 10h16"></path></svg><span>Open Shifts</span></a>
                        <a href="{{ admin_url('settings/team') }}"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path></svg><span>Manage Team</span></a>
                    </div>
                    <div class="pmd-staff-management-list">
                        @forelse($managementRequests as $item)
                            <article>
                                <div>
                                    <strong>{{ $item->person_name ?: 'Team member' }}</strong>
                                    <small>{{ $requestLabels[$item->request_type] ?? ucfirst(str_replace('_', ' ', $item->request_type)) }} · {{ \Carbon\Carbon::parse($item->created_at)->format('d M H:i') }}</small>
                                    @if(!empty($item->request_shift_date))
                                        <span class="pmd-staff-management-shift">{{ \Carbon\Carbon::parse($item->request_shift_date)->format('D, d M') }} · {{ $item->request_shift_label ?: 'Shift' }}</span>
                                    @endif
                                    <p>{{ $item->message }}</p>
                                </div>
                                <form method="post" action="{{ admin_url('mywork/handlerequest') }}">
                                    @csrf
                                    <input type="hidden" name="id" value="{{ (int)$item->id }}">
                                    <textarea name="manager_reply" rows="2" maxlength="1000" placeholder="Optional reply…"></textarea>
                                    <div>
                                        <button name="decision" value="approved" type="submit">Approve</button>
                                        <button name="decision" value="declined" type="submit" class="is-decline">Decline</button>
                                    </div>
                                </form>
                            </article>
                        @empty
                            <div class="pmd-staff-empty"><strong>All caught up</strong><span>Nothing is waiting for approval.</span></div>
                        @endforelse
                    </div>
                </section>
            @endif
        </aside>
    </div>

    <div class="pmd-staff-modal" data-pmd-profile-modal hidden>
        <button type="button" class="pmd-staff-modal__backdrop" data-pmd-profile-close aria-label="Close profile"></button>
        <section id="profile" class="pmd-staff-profile-card" role="dialog" aria-modal="true" aria-labelledby="pmd-profile-title">
            <header>
                <div class="pmd-staff-section-title">
                    <span class="pmd-staff-section-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg></span>
                    <div><small>My account</small><h2 id="pmd-profile-title">Profile</h2></div>
                </div>
                <button type="button" class="pmd-staff-modal-close" data-pmd-profile-close aria-label="Close profile"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>
            </header>

            <form method="post" action="{{ admin_url('mywork/updateprofile') }}" enctype="multipart/form-data" class="pmd-staff-profile-form">
                @csrf
                <div class="pmd-staff-profile-photo-row">
                    <span class="pmd-staff-profile-avatar pmd-staff-avatar" data-pmd-profile-preview>
                        @if(!empty($person->avatar_url))
                            <img src="{{ $person->avatar_url }}" alt="{{ $person->display_name }}">
                        @else
                            <span>{{ strtoupper(mb_substr((string)$person->display_name, 0, 1)) }}</span>
                        @endif
                    </span>
                    <div>
                        <strong>Profile photo</strong>
                        <small>JPG, PNG or WebP · max 2 MB</small>
                        @if(!empty($avatarReady))
                            <label class="pmd-staff-upload-button">
                                <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp" data-pmd-avatar-input>
                                <svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"></path></svg>
                                <span>Choose photo</span>
                            </label>
                        @else
                            <span class="pmd-staff-profile-unavailable">Photo storage is not ready yet.</span>
                        @endif
                    </div>
                </div>

                <label class="pmd-staff-profile-field">
                    <span>Display name</span>
                    <input type="text" name="display_name" maxlength="128" value="{{ old('display_name', $person->display_name) }}" required>
                    <small>This name is used in Team, chat and your shift profile.</small>
                </label>

                <div class="pmd-staff-profile-readonly">
                    <div><small>Job role</small><strong>{{ $person->job_role ?: 'Team member' }}</strong></div>
                    <div><small>Department</small><strong>{{ ucfirst((string)($person->department ?: 'other')) }}</strong></div>
                </div>

                @if(!empty($person->avatar_url))
                    <label class="pmd-staff-remove-photo">
                        <input type="checkbox" name="remove_avatar" value="1">
                        <span>Remove my current photo</span>
                    </label>
                @endif

                <p class="pmd-staff-profile-note">Role, department and login username are managed by the restaurant Owner/Manager in Settings → Team.</p>

                <footer>
                    <button type="button" class="pmd-staff-secondary" data-pmd-profile-close>Cancel</button>
                    <button type="submit" class="pmd-staff-primary">Save profile</button>
                </footer>
            </form>
        </section>
    </div>
</div>

<script>
(function () {
    'use strict';

    var root = document.querySelector('[data-pmd-staff-portal]');
    if (!root) return;

    var groupToggle = root.querySelector('[data-pmd-group-toggle]');
    var groupForm = root.querySelector('[data-pmd-group-form]');
    var groupClose = root.querySelector('[data-pmd-group-close]');

    function setGroupForm(open) {
        if (!groupForm) return;
        groupForm.hidden = !open;
        if (open) {
            var input = groupForm.querySelector('input[name="name"]');
            if (input) input.focus();
        }
    }

    if (groupToggle) groupToggle.addEventListener('click', function () { setGroupForm(groupForm ? groupForm.hidden : false); });
    if (groupClose) groupClose.addEventListener('click', function () { setGroupForm(false); });

    var requestForm = root.querySelector('[data-pmd-staff-request-form]');
    if (requestForm) {
        var typeInput = requestForm.querySelector('[data-pmd-request-type]');
        var shiftInput = requestForm.querySelector('[data-pmd-request-shift-id]');
        var dates = requestForm.querySelector('[data-pmd-request-dates]');
        var selected = requestForm.querySelector('[data-pmd-selected-shift]');
        var selectedTitle = requestForm.querySelector('[data-pmd-selected-shift-title]');
        var selectedMeta = requestForm.querySelector('[data-pmd-selected-shift-meta]');
        var help = requestForm.querySelector('[data-pmd-request-help]');
        var message = requestForm.querySelector('[data-pmd-request-message]');
        var submit = requestForm.querySelector('[data-pmd-request-submit]');
        var clearShift = requestForm.querySelector('[data-pmd-clear-shift]');

        function setType(value) {
            typeInput.value = value;
            requestForm.querySelectorAll('[data-pmd-request-type-button]').forEach(function (button) {
                button.classList.toggle('is-active', button.getAttribute('data-pmd-request-type-button') === value);
            });

            var isShift = value === 'shift_change';
            dates.hidden = isShift;

            if (value === 'time_off') {
                help.textContent = 'Choose the dates you need off and add a short note.';
                message.placeholder = 'Why do you need time off?';
                submit.textContent = 'Send time-off request';
            } else if (value === 'sick') {
                help.textContent = 'Choose the first sick day. Add the expected end date if known.';
                message.placeholder = 'Add a short note for management…';
                submit.textContent = 'Report sickness';
            } else {
                help.textContent = shiftInput.value ? 'Tell management what should change about this shift.' : 'Select one of your shifts above, then describe the change you need.';
                message.placeholder = 'For example: start later, swap with a colleague, or change this day…';
                submit.textContent = 'Send shift-change request';
            }
        }

        function chooseShift(button) {
            shiftInput.value = button.getAttribute('data-pmd-request-shift') || '';
            selectedTitle.textContent = button.getAttribute('data-pmd-request-shift-label') || 'Shift';
            selectedMeta.textContent = [button.getAttribute('data-pmd-request-shift-date'), button.getAttribute('data-pmd-request-shift-time')].filter(Boolean).join(' · ');
            selected.hidden = false;
            setType('shift_change');
            requestForm.scrollIntoView({behavior: 'smooth', block: 'center'});
            window.setTimeout(function () { message.focus(); }, 350);
        }

        root.querySelectorAll('[data-pmd-request-type-button]').forEach(function (button) {
            button.addEventListener('click', function () {
                setType(button.getAttribute('data-pmd-request-type-button'));
            });
        });

        root.querySelectorAll('[data-pmd-request-shift]').forEach(function (button) {
            button.addEventListener('click', function () { chooseShift(button); });
        });

        if (clearShift) {
            clearShift.addEventListener('click', function () {
                shiftInput.value = '';
                selected.hidden = true;
                setType('shift_change');
            });
        }

        requestForm.addEventListener('submit', function (event) {
            if (typeInput.value === 'shift_change' && !shiftInput.value) {
                event.preventDefault();
                selected.hidden = false;
                selectedTitle.textContent = 'Choose a shift above';
                selectedMeta.textContent = 'A shift-change request must be linked to one of your upcoming shifts.';
                selected.classList.add('is-warning');
                root.querySelector('#schedule').scrollIntoView({behavior: 'smooth', block: 'start'});
            }
        });

        setType(typeInput.value || 'time_off');
    }

    var profileModal = root.querySelector('[data-pmd-profile-modal]');
    var profileOpeners = root.querySelectorAll('[data-pmd-profile-open]');
    var profileClosers = root.querySelectorAll('[data-pmd-profile-close]');

    function setProfile(open) {
        if (!profileModal) return;
        profileModal.hidden = !open;
        document.body.classList.toggle('pmd-staff-modal-open', open);
        if (open) {
            var nameInput = profileModal.querySelector('input[name="display_name"]');
            if (nameInput) window.setTimeout(function () { nameInput.focus(); }, 40);
        }
    }

    profileOpeners.forEach(function (button) { button.addEventListener('click', function () { setProfile(true); }); });
    profileClosers.forEach(function (button) { button.addEventListener('click', function () { setProfile(false); }); });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && profileModal && !profileModal.hidden) setProfile(false);
    });

    var avatarInput = root.querySelector('[data-pmd-avatar-input]');
    var preview = root.querySelector('[data-pmd-profile-preview]');
    if (avatarInput && preview) {
        avatarInput.addEventListener('change', function () {
            var file = avatarInput.files && avatarInput.files[0];
            if (!file || !file.type.match(/^image\//)) return;
            var url = URL.createObjectURL(file);
            preview.innerHTML = '';
            var img = document.createElement('img');
            img.src = url;
            img.alt = 'New profile photo preview';
            img.onload = function () { URL.revokeObjectURL(url); };
            preview.appendChild(img);
        });
    }

    if (window.location.hash === '#profile') setProfile(true);

    var messages = root.querySelector('.pmd-staff-chat__messages');
    if (messages) messages.scrollTop = messages.scrollHeight;
})();
</script>
</body>
</html>
