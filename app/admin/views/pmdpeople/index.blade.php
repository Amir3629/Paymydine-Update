@php
    $data = $pmdPeople ?? [];
    $people = collect($data['people'] ?? []);
    $unlinkedStaff = collect($data['unlinked_staff'] ?? []);
    $person = $data['selected'] ?? null;
    $access = $data['selected_access'] ?? null;
    $shifts = collect($data['shifts'] ?? []);
    $requests = collect($data['requests'] ?? []);
    $roles = collect($data['roles'] ?? []);
    $departments = $data['departments'] ?? [];
    $today = now()->startOfDay();
    $upcoming = $shifts->filter(fn($shift) => \Carbon\Carbon::parse($shift->shift_date)->endOfDay()->gte($today))->values();
    $previous = $shifts->filter(fn($shift) => \Carbon\Carbon::parse($shift->shift_date)->endOfDay()->lt($today))->reverse()->take(6)->values();
    $nextShift = $upcoming->first();
    $scheduleDay = $nextShift ? \Carbon\Carbon::parse($nextShift->shift_date) : now();
    $defaultRole = $roles->first(fn($role) => strtolower((string)$role->code) === \Admin\Services\PmdDefaultStaffRoleService::TEAM_MEMBER) ?: $roles->first();
@endphp

<div class="pmd-people" data-pmd-people>
    <header class="pmd-people__top">
        <div><span>Team</span><h1>People</h1></div>
        <div class="pmd-people__top-actions">
            <a href="{{ admin_url('shifts') }}">Shifts</a>
            <button type="button" data-pmd-people-add>+ Person</button>
        </div>
    </header>

    @if(session('success'))<div class="pmd-people__flash is-success">{{ session('success') }}</div>@endif
    @if(session('error'))<div class="pmd-people__flash is-error">{{ session('error') }}</div>@endif

    <section class="pmd-people__quick-add" data-pmd-people-add-form hidden>
        <form method="post" action="{{ admin_url('people/saveperson') }}">
            @csrf
            <label><span>Name</span><input required maxlength="128" name="display_name" placeholder="Name"></label>
            <label><span>Role</span><input maxlength="64" name="job_role" placeholder="Bartender, Chef…"></label>
            <label><span>Area</span><select name="department">@foreach($departments as $key => $label)<option value="{{ $key }}">{{ $label }}</option>@endforeach</select></label>
            <button type="submit">Add</button>
            <button type="button" class="is-cancel" data-pmd-people-add-cancel>Cancel</button>
        </form>
    </section>

    <div class="pmd-people__workspace">
        <aside class="pmd-people__list">
            <div class="pmd-people__search"><input type="search" placeholder="Search people" data-pmd-people-search></div>
            <div class="pmd-people__list-scroll">
                @forelse($people as $item)
                    <a class="pmd-people__person {{ $person && (int)$person->id === (int)$item->id ? 'is-active' : '' }}" href="{{ admin_url('people') }}?person={{ (int)$item->id }}" data-pmd-person-row data-search="{{ strtolower($item->display_name.' '.($item->job_role ?? '').' '.($item->department ?? '')) }}">
                        <span class="pmd-people__avatar">{{ strtoupper(substr(trim((string)$item->display_name),0,1)) }}</span>
                        <span class="pmd-people__person-copy"><strong>{{ $item->display_name }}</strong><small>{{ $item->job_role ?: ($departments[$item->department] ?? 'Team') }}</small></span>
                        @if(!empty($item->staff_id))<em>Login</em>@endif
                    </a>
                @empty
                    <div class="pmd-people__empty">No people yet. Add the first person above.</div>
                @endforelse
            </div>

            @if($unlinkedStaff->isNotEmpty())
                <div class="pmd-people__access-only">
                    <strong>Access only</strong>
                    @foreach($unlinkedStaff as $staff)
                        <form method="post" action="{{ admin_url('people/linkstaff') }}">
                            @csrf
                            <input type="hidden" name="staff_id" value="{{ (int)$staff->staff_id }}">
                            <button type="submit"><span><b>{{ $staff->staff_name }}</b><small>{{ $staff->user ? '@'.$staff->user->username : 'PMD account' }}</small></span><em>+ Team</em></button>
                        </form>
                    @endforeach
                </div>
            @endif
        </aside>

        <main class="pmd-people__profile">
            @if($person)
                <header class="pmd-people__profile-head">
                    <div class="pmd-people__profile-title">
                        <span class="pmd-people__avatar is-large">{{ strtoupper(substr(trim((string)$person->display_name),0,1)) }}</span>
                        <div><h2>{{ $person->display_name }}</h2><p>{{ $person->job_role ?: 'Team member' }} · {{ $departments[$person->department] ?? 'Other' }}</p></div>
                    </div>
                    <nav><a href="#schedule">Schedule</a><a href="#messages">Messages</a><a href="#access">Access</a></nav>
                </header>

                <section id="schedule" class="pmd-people__section">
                    <header><div><span>Schedule</span><h3>Shifts</h3></div><a href="{{ admin_url('shifts') }}?month={{ $scheduleDay->copy()->startOfMonth()->toDateString() }}&day={{ $scheduleDay->toDateString() }}#pmd-shift-day">Open calendar</a></header>
                    <div class="pmd-people__shift-list">
                        @forelse($upcoming->take(8) as $shift)
                            <a class="pmd-people__shift" href="{{ admin_url('shifts') }}?month={{ \Carbon\Carbon::parse($shift->shift_date)->startOfMonth()->toDateString() }}&day={{ \Carbon\Carbon::parse($shift->shift_date)->toDateString() }}#pmd-shift-day">
                                <time><strong>{{ \Carbon\Carbon::parse($shift->shift_date)->format('d') }}</strong><small>{{ \Carbon\Carbon::parse($shift->shift_date)->format('M') }}</small></time>
                                <span><strong>{{ $shift->label ?: 'Shift' }}</strong><small>{{ $shift->starts_at ? substr((string)$shift->starts_at,0,5) : 'All day' }}@if($shift->ends_at)–{{ substr((string)$shift->ends_at,0,5) }}@endif</small></span>
                                <em>Edit</em>
                            </a>
                        @empty
                            <div class="pmd-people__empty is-inline">No upcoming shifts.</div>
                        @endforelse
                    </div>
                    @if($previous->isNotEmpty())
                        <details class="pmd-people__previous"><summary>Previous shifts</summary>@foreach($previous as $shift)<a href="{{ admin_url('shifts') }}?month={{ \Carbon\Carbon::parse($shift->shift_date)->startOfMonth()->toDateString() }}&day={{ \Carbon\Carbon::parse($shift->shift_date)->toDateString() }}#pmd-shift-day"><span>{{ \Carbon\Carbon::parse($shift->shift_date)->format('d M Y') }}</span><strong>{{ $shift->label }}</strong><small>{{ $shift->starts_at ? substr((string)$shift->starts_at,0,5) : '—' }}–{{ $shift->ends_at ? substr((string)$shift->ends_at,0,5) : '—' }}</small></a>@endforeach</details>
                    @endif
                </section>

                <section id="messages" class="pmd-people__section">
                    <header><div><span>Messages</span><h3>Conversation & requests</h3></div>@if($requests->where('status','pending')->count())<b>{{ $requests->where('status','pending')->count() }} pending</b>@endif</header>
                    <div class="pmd-people__thread">
                        @forelse($requests->reverse()->take(20) as $request)
                            @php $fromManager = (string)$request->request_type === 'manager_message'; @endphp
                            <article class="{{ $fromManager ? 'is-manager' : 'is-person' }}">
                                <div class="pmd-people__bubble">
                                    <span>{{ $fromManager ? 'Manager' : $person->display_name }} · {{ \Carbon\Carbon::parse($request->created_at)->format('d M H:i') }}</span>
                                    <p>{{ $request->message }}</p>
                                    @if(!$fromManager)<small>{{ ucfirst(str_replace('_',' ',(string)$request->request_type)) }} · {{ ucfirst((string)$request->status) }}</small>@endif
                                </div>
                                @if($request->manager_reply)<div class="pmd-people__bubble is-reply"><span>Manager</span><p>{{ $request->manager_reply }}</p></div>@endif
                                @if(!$fromManager && (string)$request->status === 'pending')
                                    <div class="pmd-people__request-actions">
                                        <form method="post" action="{{ admin_url('people/handlerequest') }}">@csrf<input type="hidden" name="id" value="{{ (int)$request->id }}"><input type="hidden" name="person_id" value="{{ (int)$person->id }}"><input type="hidden" name="decision" value="approved"><button type="submit">Approve</button></form>
                                        <form method="post" action="{{ admin_url('people/handlerequest') }}">@csrf<input type="hidden" name="id" value="{{ (int)$request->id }}"><input type="hidden" name="person_id" value="{{ (int)$person->id }}"><input type="hidden" name="decision" value="declined"><button type="submit" class="is-decline">Decline</button></form>
                                    </div>
                                @endif
                            </article>
                        @empty
                            <div class="pmd-people__empty is-inline">No messages yet.</div>
                        @endforelse
                    </div>
                    @if(!empty($data['requests_ready']) && !empty($person->staff_id))
                        <form class="pmd-people__compose" method="post" action="{{ admin_url('people/sendmessage') }}">
                            @csrf<input type="hidden" name="person_id" value="{{ (int)$person->id }}">
                            <textarea required maxlength="2000" rows="2" name="message" placeholder="Message {{ $person->display_name }}…"></textarea><button type="submit">Send</button>
                        </form>
                    @elseif(empty($person->staff_id))
                        <div class="pmd-people__hint">Enable PMD login in Access to send messages.</div>
                    @endif
                </section>

                <section id="access" class="pmd-people__section">
                    <header><div><span>Profile</span><h3>Details & access</h3></div></header>
                    <div class="pmd-people__settings-grid">
                        <form class="pmd-people__form" method="post" action="{{ admin_url('people/saveperson') }}">
                            @csrf<input type="hidden" name="id" value="{{ (int)$person->id }}">
                            <strong>Person</strong>
                            <label><span>Name</span><input required maxlength="128" name="display_name" value="{{ $person->display_name }}"></label>
                            <div class="pmd-people__form-row"><label><span>Role</span><input maxlength="64" name="job_role" value="{{ $person->job_role }}"></label><label><span>Area</span><select name="department">@foreach($departments as $key => $label)<option value="{{ $key }}" {{ $person->department === $key ? 'selected' : '' }}>{{ $label }}</option>@endforeach</select></label></div>
                            <button type="submit">Save details</button>
                        </form>

                        <form class="pmd-people__form" method="post" action="{{ admin_url('people/saveaccess') }}">
                            @csrf<input type="hidden" name="person_id" value="{{ (int)$person->id }}">
                            <strong>PMD login <em>{{ $access ? 'Active' : 'Optional' }}</em></strong>
                            <label><span>Username</span><input required maxlength="32" autocomplete="off" name="username" value="{{ $access && $access->user ? $access->user->username : '' }}" placeholder="username"></label>
                            <label><span>Access</span><select required name="staff_role_id">@foreach($roles as $role)<option value="{{ (int)$role->staff_role_id }}" {{ $access ? ((int)$access->staff_role_id === (int)$role->staff_role_id ? 'selected' : '') : ($defaultRole && (int)$defaultRole->staff_role_id === (int)$role->staff_role_id ? 'selected' : '') }}>{{ $role->name }}</option>@endforeach</select></label>
                            <label><span>Password {{ $access ? '· leave blank to keep' : '' }}</span><input {{ $access ? '' : 'required' }} minlength="6" maxlength="32" type="password" autocomplete="new-password" name="password"></label>
                            <button type="submit">{{ $access ? 'Save access' : 'Enable login' }}</button>
                        </form>
                    </div>
                </section>
            @else
                <div class="pmd-people__welcome"><strong>Add your first person</strong><p>Name is enough. Login is optional and can be enabled later from their profile.</p></div>
            @endif
        </main>
    </div>
</div>

<script>
(function(){
  var root=document.querySelector('[data-pmd-people]'); if(!root)return;
  var form=root.querySelector('[data-pmd-people-add-form]');
  var open=root.querySelector('[data-pmd-people-add]');
  var close=root.querySelector('[data-pmd-people-add-cancel]');
  function show(value){if(form)form.hidden=!value;if(value){var input=form.querySelector('input[name="display_name"]');if(input)input.focus();}}
  if(open)open.addEventListener('click',function(){show(true);});
  if(close)close.addEventListener('click',function(){show(false);});
  var search=root.querySelector('[data-pmd-people-search]');
  if(search)search.addEventListener('input',function(){var q=search.value.trim().toLowerCase();root.querySelectorAll('[data-pmd-person-row]').forEach(function(row){row.hidden=q!=='' && (row.getAttribute('data-search')||'').indexOf(q)===-1;});});
})();
</script>
