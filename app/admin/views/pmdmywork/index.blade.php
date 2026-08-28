@php
    $data = $pmdMyWork ?? [];
    $person = $data['person'] ?? null;
    $shifts = collect($data['shifts'] ?? []);
    $requests = collect($data['requests'] ?? []);
    $upcoming = $shifts->filter(fn($shift) => \Carbon\Carbon::parse($shift->shift_date)->endOfDay()->gte(now()->startOfDay()))->values();
    $past = $shifts->filter(fn($shift) => \Carbon\Carbon::parse($shift->shift_date)->endOfDay()->lt(now()->startOfDay()))->reverse()->take(8)->values();
@endphp

<div class="pmd-my-work" data-pmd-my-work>
    <header class="pmd-my-work__header">
        <div><span>My Work</span><h1>{{ $person->display_name ?? optional(optional(\Admin\Facades\AdminAuth::getUser())->staff)->staff_name ?? 'My profile' }}</h1><p>{{ $person ? (($person->job_role ?: 'Team member').' · '.ucfirst((string)$person->department)) : 'Ask your manager to link this PMD account to your Team profile.' }}</p></div>
        <a href="{{ admin_url('logout') }}">Sign out</a>
    </header>

    @if(!$person)
        <section class="pmd-my-work__notice"><strong>Profile link needed</strong><p>Your login works, but it is not linked to a restaurant Team member yet. Your manager can open Shifts → Team and link/create your account there.</p></section>
    @else
        <section class="pmd-my-work__stats">
            <article><span>Next shift</span><strong>{{ $upcoming->first() ? \Carbon\Carbon::parse($upcoming->first()->shift_date)->format('D d M') : '—' }}</strong><small>{{ $upcoming->first() ? substr((string)$upcoming->first()->starts_at,0,5).'–'.substr((string)$upcoming->first()->ends_at,0,5) : 'Nothing planned' }}</small></article>
            <article><span>Upcoming</span><strong>{{ $upcoming->count() }}</strong><small>scheduled shifts</small></article>
            <article><span>Requests</span><strong>{{ $requests->where('status','pending')->count() }}</strong><small>waiting for manager</small></article>
        </section>

        <main class="pmd-my-work__grid">
            <section class="pmd-my-work__card">
                <header><div><span>Schedule</span><h2>My shifts</h2></div></header>
                <div class="pmd-my-work__shift-list">
                    @forelse($upcoming as $shift)
                        <article class="pmd-my-work__shift">
                            <time><strong>{{ \Carbon\Carbon::parse($shift->shift_date)->format('d') }}</strong><small>{{ \Carbon\Carbon::parse($shift->shift_date)->format('M') }}</small></time>
                            <div><strong>{{ $shift->label ?: 'Shift' }}</strong><span>{{ substr((string)$shift->starts_at,0,5) ?: 'All day' }}@if($shift->ends_at)–{{ substr((string)$shift->ends_at,0,5) }}@endif</span></div>
                            <button type="button" data-pmd-my-work-request="shift_change" data-shift-id="{{ (int)$shift->id }}">Request change</button>
                        </article>
                    @empty
                        <div class="pmd-my-work__empty">No upcoming shifts yet.</div>
                    @endforelse
                </div>
                @if($past->isNotEmpty())
                    <details class="pmd-my-work__past"><summary>Previous shifts</summary>@foreach($past as $shift)<div><span>{{ \Carbon\Carbon::parse($shift->shift_date)->format('d M Y') }}</span><strong>{{ $shift->label }}</strong><small>{{ substr((string)$shift->starts_at,0,5) }}–{{ substr((string)$shift->ends_at,0,5) }}</small></div>@endforeach</details>
                @endif
            </section>

            <section class="pmd-my-work__card">
                <header><div><span>Requests</span><h2>Ask manager</h2></div></header>
                @if(!empty($data['requests_ready']))
                    <form method="post" action="{{ admin_url('mywork/saverequest') }}" class="pmd-my-work__request-form" data-pmd-my-work-request-form>
                        @csrf
                        <input type="hidden" name="request_type" value="message" data-pmd-my-work-request-type>
                        <input type="hidden" name="shift_id" value="" data-pmd-my-work-shift-id>
                        <div class="pmd-my-work__request-types">
                            <button type="button" class="is-active" data-pmd-my-work-type="message">Message</button>
                            <button type="button" data-pmd-my-work-type="time_off">Time off</button>
                            <button type="button" data-pmd-my-work-type="shift_change">Shift change</button>
                        </div>
                        <div class="pmd-my-work__dates" data-pmd-my-work-dates hidden><label>From<input type="date" name="date_from"></label><label>To<input type="date" name="date_to"></label></div>
                        <label class="pmd-my-work__message"><span>Message</span><textarea required minlength="2" maxlength="2000" rows="5" name="message" placeholder="Write a short note to your manager…"></textarea></label>
                        <button type="submit" class="pmd-my-work__send">Send request</button>
                    </form>
                @else
                    <div class="pmd-my-work__empty">Requests are being prepared. Ask your manager to run the latest PMD update.</div>
                @endif
            </section>

            <section class="pmd-my-work__card is-wide">
                <header><div><span>Status</span><h2>My requests</h2></div></header>
                <div class="pmd-my-work__request-list">
                    @forelse($requests as $request)
                        <article><div><strong>{{ ucfirst(str_replace('_',' ',(string)$request->request_type)) }}</strong><small>{{ \Carbon\Carbon::parse($request->created_at)->format('d M · H:i') }}</small><p>{{ $request->message }}</p>@if($request->manager_reply)<em>{{ $request->manager_reply }}</em>@endif</div><span class="is-{{ $request->status }}">{{ ucfirst((string)$request->status) }}</span></article>
                    @empty
                        <div class="pmd-my-work__empty">No requests yet.</div>
                    @endforelse
                </div>
            </section>
        </main>
    @endif
</div>

<script>
(function(){
  var root=document.querySelector('[data-pmd-my-work]'); if(!root)return;
  var form=root.querySelector('[data-pmd-my-work-request-form]'); if(!form)return;
  var typeInput=form.querySelector('[data-pmd-my-work-request-type]');
  var shiftInput=form.querySelector('[data-pmd-my-work-shift-id]');
  var dates=form.querySelector('[data-pmd-my-work-dates]');
  function selectType(type,shiftId){
    if(typeInput)typeInput.value=type;
    if(shiftInput)shiftInput.value=shiftId||'';
    if(dates)dates.hidden=type!=='time_off';
    form.querySelectorAll('[data-pmd-my-work-type]').forEach(function(button){button.classList.toggle('is-active',button.getAttribute('data-pmd-my-work-type')===type);});
    var message=form.querySelector('textarea'); if(message)message.focus();
  }
  root.addEventListener('click',function(event){
    var type=event.target.closest('[data-pmd-my-work-type]'); if(type){event.preventDefault();selectType(type.getAttribute('data-pmd-my-work-type')||'message','');return;}
    var shift=event.target.closest('[data-pmd-my-work-request]'); if(shift){event.preventDefault();selectType(shift.getAttribute('data-pmd-my-work-request')||'shift_change',shift.getAttribute('data-shift-id')||'');form.scrollIntoView({behavior:'smooth',block:'center'});}
  });
})();
</script>
