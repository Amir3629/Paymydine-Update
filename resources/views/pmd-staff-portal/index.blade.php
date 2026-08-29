@php
    $shifts = collect($shifts ?? []);
    $requests = collect($requests ?? []);
    $today = now()->startOfDay();
    $upcoming = $shifts->filter(fn($s) => \Carbon\Carbon::parse($s->shift_date)->endOfDay()->gte($today))->values();
    $past = $shifts->filter(fn($s) => \Carbon\Carbon::parse($s->shift_date)->endOfDay()->lt($today))->reverse()->take(8)->values();
    $next = $upcoming->first();
    $pending = $requests->where('status', 'pending')->count();
@endphp
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <title>My Work · PayMyDine</title>
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-staff-portal-v1.css?v=1">
</head>
<body class="pmd-staff-portal-page">
<div class="pmd-staff-shell" data-pmd-staff-portal>
    <header class="pmd-staff-topbar">
        <a href="/staff" class="pmd-staff-brand"><img src="/app/admin/assets/images/pmd-brand-full.svg" alt="PayMyDine"><span>Staff</span></a>
        <div class="pmd-staff-topbar__person"><div><strong>{{ $person->display_name }}</strong><small>{{ $person->job_role ?: 'Team member' }}</small></div><form method="post" action="/staff/logout">@csrf<button type="submit">Sign out</button></form></div>
    </header>

    <nav class="pmd-staff-nav" aria-label="Staff portal"><a href="#schedule">Schedule</a><a href="#messages">Messages</a><a href="#requests">Requests@if($pending)<b>{{ $pending }}</b>@endif</a></nav>

    <main class="pmd-staff-main">
        @if(session('success'))<div class="pmd-staff-flash is-success">{{ session('success') }}</div>@endif
        @if(session('error'))<div class="pmd-staff-flash is-error">{{ session('error') }}</div>@endif
        @if($errors->any())<div class="pmd-staff-flash is-error">{{ $errors->first() }}</div>@endif

        <section class="pmd-staff-hero">
            <div><span class="pmd-staff-eyebrow">My Work</span><h1>Hi {{ explode(' ', trim((string)$person->display_name))[0] ?: $person->display_name }}</h1><p>{{ $person->job_role ?: 'Team member' }} · {{ ucfirst((string)$person->department) }}</p></div>
            <article><span>Next shift</span><strong>{{ $next ? \Carbon\Carbon::parse($next->shift_date)->format('D d M') : 'Nothing planned' }}</strong><small>{{ $next ? (($next->starts_at ? substr((string)$next->starts_at,0,5) : 'All day').($next->ends_at ? '–'.substr((string)$next->ends_at,0,5) : '')) : 'Your manager will add it here' }}</small></article>
        </section>

        <div class="pmd-staff-grid">
            <section id="schedule" class="pmd-staff-card is-wide">
                <header><div><span>Schedule</span><h2>Upcoming shifts</h2></div><b>{{ $upcoming->count() }}</b></header>
                <div class="pmd-staff-shifts">
                    @forelse($upcoming as $shift)
                        <article><time><strong>{{ \Carbon\Carbon::parse($shift->shift_date)->format('d') }}</strong><small>{{ \Carbon\Carbon::parse($shift->shift_date)->format('M') }}</small></time><div><strong>{{ $shift->label ?: 'Shift' }}</strong><span>{{ $shift->starts_at ? substr((string)$shift->starts_at,0,5) : 'All day' }}@if($shift->ends_at)–{{ substr((string)$shift->ends_at,0,5) }}@endif</span></div><em>{{ ucfirst((string)($shift->attendance_status ?: 'planned')) }}</em><button type="button" data-pmd-request-shift="{{ (int)$shift->id }}">Request change</button></article>
                    @empty
                        <div class="pmd-staff-empty">No upcoming shifts yet.</div>
                    @endforelse
                </div>
                @if($past->isNotEmpty())<details class="pmd-staff-past"><summary>Previous shifts</summary>@foreach($past as $shift)<div><span>{{ \Carbon\Carbon::parse($shift->shift_date)->format('d M Y') }}</span><strong>{{ $shift->label }}</strong><small>{{ $shift->starts_at ? substr((string)$shift->starts_at,0,5) : '—' }}@if($shift->ends_at)–{{ substr((string)$shift->ends_at,0,5) }}@endif</small></div>@endforeach</details>@endif
            </section>

            <section id="messages" class="pmd-staff-card">
                <header><div><span>Messages</span><h2>Manager</h2></div></header>
                <div class="pmd-staff-thread">
                    @forelse($requests->reverse()->take(24) as $item)
                        @php $manager = (string)$item->request_type === 'manager_message'; $decision = in_array((string)$item->request_type, ['shift_change','time_off'], true); @endphp
                        <article class="{{ $manager ? 'is-manager' : 'is-me' }}"><div><small>{{ $manager ? 'Manager' : 'You' }} · {{ \Carbon\Carbon::parse($item->created_at)->format('d M H:i') }}</small><p>{{ $item->message }}</p>@if($decision)<em class="is-{{ $item->status }}">{{ ucfirst((string)$item->status) }}</em>@endif</div>@if($item->manager_reply)<div class="is-reply"><small>Manager</small><p>{{ $item->manager_reply }}</p></div>@endif</article>
                    @empty
                        <div class="pmd-staff-empty">No messages yet.</div>
                    @endforelse
                </div>
                @if(!empty($requestsReady))<form method="post" action="/staff/request" class="pmd-staff-message-form">@csrf<input type="hidden" name="request_type" value="message"><textarea name="message" rows="2" maxlength="2000" required placeholder="Message your manager…"></textarea><button type="submit">Send</button></form>@endif
            </section>

            <section id="requests" class="pmd-staff-card">
                <header><div><span>Requests</span><h2>Ask manager</h2></div></header>
                @if(!empty($requestsReady))
                    <form method="post" action="/staff/request" class="pmd-staff-request-form" data-pmd-staff-request-form>
                        @csrf
                        <input type="hidden" name="request_type" value="time_off" data-pmd-request-type>
                        <input type="hidden" name="shift_id" value="" data-pmd-request-shift-id>
                        <div class="pmd-staff-request-types"><button type="button" class="is-active" data-pmd-request-type-button="time_off">Time off</button><button type="button" data-pmd-request-type-button="shift_change">Shift change</button></div>
                        <div class="pmd-staff-dates" data-pmd-request-dates><label><span>From</span><input type="date" name="date_from"></label><label><span>To</span><input type="date" name="date_to"></label></div>
                        <label><span>Note</span><textarea name="message" rows="4" maxlength="2000" required placeholder="Short note for your manager…"></textarea></label>
                        <button type="submit" class="pmd-staff-primary">Send request</button>
                    </form>
                @else<div class="pmd-staff-empty">Requests are not available yet.</div>@endif
            </section>
        </div>
    </main>
</div>
<script>
(function(){var root=document.querySelector('[data-pmd-staff-portal]');if(!root)return;var form=root.querySelector('[data-pmd-staff-request-form]');if(!form)return;var type=form.querySelector('[data-pmd-request-type]');var shift=form.querySelector('[data-pmd-request-shift-id]');var dates=form.querySelector('[data-pmd-request-dates]');function pick(value,id){if(type)type.value=value;if(shift)shift.value=id||'';if(dates)dates.hidden=value==='shift_change';form.querySelectorAll('[data-pmd-request-type-button]').forEach(function(b){b.classList.toggle('is-active',b.getAttribute('data-pmd-request-type-button')===value);});var t=form.querySelector('textarea');if(t)t.focus();}root.addEventListener('click',function(e){var b=e.target.closest('[data-pmd-request-type-button]');if(b){e.preventDefault();pick(b.getAttribute('data-pmd-request-type-button'),'');return;}var s=e.target.closest('[data-pmd-request-shift]');if(s){e.preventDefault();pick('shift_change',s.getAttribute('data-pmd-request-shift'));location.hash='requests';}});})();
</script>
</body>
</html>
