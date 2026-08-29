from pathlib import Path

ROOT = Path('.')

controller = r'''<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

/** PMD_STAFF_PORTAL_V1 */
class PmdStaffPortalController extends Controller
{
    public function login()
    {
        if (AdminAuth::isLogged() && $this->currentPerson()) {
            return redirect('/staff');
        }

        return view('pmd-staff-portal.login', [
            'managementSession' => AdminAuth::isLogged(),
        ]);
    }

    public function authenticate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => ['required', 'string', 'max:64'],
            'password' => ['required', 'string', 'min:6', 'max:128'],
        ]);

        if ($validator->fails()) {
            return redirect('/staff/login')->withErrors($validator)->withInput($request->except('password'));
        }

        if (AdminAuth::isLogged()) {
            try { AdminAuth::logout(); } catch (\Throwable $error) {}
            session()->invalidate();
            session()->regenerateToken();
        }

        $clean = $validator->validated();
        $credentials = [
            'username' => trim((string)$clean['username']),
            'password' => (string)$clean['password'],
        ];

        try {
            if (!AdminAuth::authenticate($credentials, true, true)) {
                return redirect('/staff/login')->with('error', 'Username or password is not correct.')->withInput($request->except('password'));
            }
        } catch (\Throwable $error) {
            report($error);
            return redirect('/staff/login')->with('error', 'Could not sign in. Please try again.')->withInput($request->except('password'));
        }

        session()->regenerate();

        $person = $this->currentPerson();
        if (!$person) {
            $this->logoutSession();
            return redirect('/staff/login')->with('error', 'This account is not connected to a restaurant People profile yet. Ask your manager to open People → Access.');
        }

        try {
            app(\Admin\Services\PmdAdminPresenceService::class)->loginCurrentSession();
        } catch (\Throwable $error) {
            logger()->warning('PMD staff portal presence registration failed', ['message' => $error->getMessage()]);
        }

        return redirect('/staff');
    }

    public function index()
    {
        if (!AdminAuth::isLogged()) return redirect('/staff/login');

        $person = $this->currentPerson();
        if (!$person) {
            $this->logoutSession();
            return redirect('/staff/login')->with('error', 'Your PMD login is not connected to a restaurant People profile. Ask your manager to reconnect it.');
        }

        $staffId = $this->staffId();
        $locationId = (int)$person->location_id;
        $shifts = collect();
        if (Schema::hasTable('pmd_operational_shift_people') && Schema::hasTable('pmd_operational_shifts')) {
            $from = now()->subMonths(2)->startOfMonth()->toDateString();
            $to = now()->addMonths(3)->endOfMonth()->toDateString();
            $shifts = DB::table('pmd_operational_shift_people as assignment')
                ->join('pmd_operational_shifts as shift', 'shift.id', '=', 'assignment.shift_id')
                ->where('shift.location_id', $locationId)
                ->where('assignment.person_id', (int)$person->id)
                ->whereBetween('shift.shift_date', [$from, $to])
                ->whereNotIn('shift.status', ['cancelled', 'canceled'])
                ->select([
                    'shift.id', 'shift.shift_date', 'shift.label', 'shift.starts_at',
                    'shift.ends_at', 'shift.status', 'assignment.attendance_status',
                ])
                ->orderBy('shift.shift_date')
                ->orderBy('shift.starts_at')
                ->get();
        }

        $requests = collect();
        if (Schema::hasTable('pmd_staff_requests')) {
            $requests = DB::table('pmd_staff_requests')
                ->where('location_id', $locationId)
                ->where(function ($query) use ($person, $staffId) {
                    $query->where('person_id', (int)$person->id);
                    if ($staffId > 0) $query->orWhere('staff_id', $staffId);
                })
                ->orderByDesc('created_at')
                ->limit(40)
                ->get();
        }

        return view('pmd-staff-portal.index', [
            'person' => $person,
            'shifts' => $shifts,
            'requests' => $requests,
            'requestsReady' => Schema::hasTable('pmd_staff_requests'),
        ]);
    }

    public function saveRequest(Request $request)
    {
        if (!AdminAuth::isLogged()) return redirect('/staff/login');
        if (!Schema::hasTable('pmd_staff_requests')) return redirect('/staff')->with('error', 'Requests are not available yet.');

        $person = $this->currentPerson();
        if (!$person) {
            $this->logoutSession();
            return redirect('/staff/login')->with('error', 'Your PMD login is not connected to a People profile.');
        }

        $validator = Validator::make($request->all(), [
            'request_type' => ['required', 'in:shift_change,time_off,message'],
            'shift_id' => ['nullable', 'integer', 'min:1'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'message' => ['required', 'string', 'min:1', 'max:2000'],
        ]);
        if ($validator->fails()) return redirect('/staff#requests')->withErrors($validator)->withInput();
        $clean = $validator->validated();

        $locationId = (int)$person->location_id;
        $shiftId = !empty($clean['shift_id']) ? (int)$clean['shift_id'] : null;
        if ($shiftId) {
            $ownsShift = DB::table('pmd_operational_shift_people as assignment')
                ->join('pmd_operational_shifts as shift', 'shift.id', '=', 'assignment.shift_id')
                ->where('assignment.person_id', (int)$person->id)
                ->where('assignment.shift_id', $shiftId)
                ->where('shift.location_id', $locationId)
                ->exists();
            if (!$ownsShift) return redirect('/staff#requests')->with('error', 'Choose one of your own shifts.');
        }

        $dateFrom = !empty($clean['date_from']) ? Carbon::parse($clean['date_from'])->toDateString() : null;
        $dateTo = !empty($clean['date_to']) ? Carbon::parse($clean['date_to'])->toDateString() : null;
        if ($dateFrom && $dateTo && $dateTo < $dateFrom) {
            return redirect('/staff#requests')->with('error', 'End date must be after start date.');
        }

        $type = (string)$clean['request_type'];
        DB::table('pmd_staff_requests')->insert([
            'location_id' => $locationId,
            'staff_id' => $this->staffId(),
            'person_id' => (int)$person->id,
            'request_type' => $type,
            'shift_id' => $shiftId,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'message' => trim((string)$clean['message']),
            'status' => $type === 'message' ? 'sent' : 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return redirect('/staff#messages')->with('success', $type === 'message' ? 'Message sent.' : 'Request sent.');
    }

    public function logout()
    {
        $this->logoutSession();
        return redirect('/staff/login')->with('success', 'Signed out.');
    }

    private function currentPerson()
    {
        $staffId = $this->staffId();
        if ($staffId < 1 || !Schema::hasTable('pmd_operational_people')) return null;

        return DB::table('pmd_operational_people')
            ->where('staff_id', $staffId)
            ->where('is_active', 1)
            ->orderBy('location_id')
            ->orderBy('id')
            ->first();
    }

    private function staffId(): int
    {
        try {
            $user = AdminAuth::getUser();
            return (int)optional($user ? $user->staff : null)->staff_id;
        } catch (\Throwable $error) {
            return 0;
        }
    }

    private function logoutSession(): void
    {
        try {
            if (AdminAuth::isLogged()) {
                try { app(\Admin\Services\PmdAdminPresenceService::class)->logoutCurrentSession(); } catch (\Throwable $error) {}
                AdminAuth::logout();
            }
        } catch (\Throwable $error) {
        }
        session()->invalidate();
        session()->regenerateToken();
    }
}
'''

routes = r'''<?php

use App\Http\Controllers\PmdStaffPortalController;
use Illuminate\Support\Facades\Route;

/** PMD_STAFF_PORTAL_V1 */
App::before(function () {
    Route::group(['middleware' => ['web']], function () {
        Route::get('/staff/login', [PmdStaffPortalController::class, 'login'])->name('pmd.staff.login');
        Route::post('/staff/login', [PmdStaffPortalController::class, 'authenticate'])
            ->middleware('throttle:8,15')
            ->name('pmd.staff.authenticate');
        Route::get('/staff', [PmdStaffPortalController::class, 'index'])->name('pmd.staff.home');
        Route::post('/staff/request', [PmdStaffPortalController::class, 'saveRequest'])->name('pmd.staff.request');
        Route::post('/staff/logout', [PmdStaffPortalController::class, 'logout'])->name('pmd.staff.logout');
    });
});
'''

login_view = r'''<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <title>Staff · PayMyDine</title>
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-staff-portal-v1.css?v=1">
</head>
<body class="pmd-staff-login-page">
<main class="pmd-staff-login">
    <section class="pmd-staff-login__card">
        <img src="/app/admin/assets/images/pmd-brand-full.svg" alt="PayMyDine" class="pmd-staff-login__brand">
        <span class="pmd-staff-eyebrow">Staff Portal</span>
        <h1>Your work, in one place.</h1>
        <p>See shifts, message your manager and send time-off or shift-change requests.</p>

        @if(session('success'))<div class="pmd-staff-flash is-success">{{ session('success') }}</div>@endif
        @if(session('error'))<div class="pmd-staff-flash is-error">{{ session('error') }}</div>@endif
        @if($errors->any())<div class="pmd-staff-flash is-error">{{ $errors->first() }}</div>@endif
        @if(!empty($managementSession))<div class="pmd-staff-flash">A management account is signed in in this browser. Signing in below switches this browser to the staff account.</div>@endif

        <form method="post" action="/staff/login" class="pmd-staff-login__form">
            @csrf
            <label><span>Username</span><input name="username" value="{{ old('username') }}" autocomplete="username" required autofocus></label>
            <label><span>Password</span><input type="password" name="password" autocomplete="current-password" minlength="6" required></label>
            <button type="submit">Sign in</button>
        </form>
        <small>Need access or a password reset? Ask your manager. They can manage it in PayMyDine → People.</small>
    </section>
</main>
</body>
</html>
'''

index_view = r'''@php
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
'''

css = r'''html{scroll-behavior:smooth}body.pmd-staff-login-page,body.pmd-staff-portal-page{margin:0;background:#f4f8fa;color:#102a43;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}*{box-sizing:border-box}.pmd-staff-login{min-height:100vh;display:grid;place-items:center;padding:24px}.pmd-staff-login__card{width:min(440px,100%);padding:34px;border:1px solid #d9e5ea;border-radius:22px;background:#fff;box-shadow:0 22px 65px rgba(32,55,70,.09)}.pmd-staff-login__brand{width:150px;height:auto;margin:0 0 28px}.pmd-staff-eyebrow{display:block;color:#08745c;font-size:10px;font-weight:900;letter-spacing:.09em;text-transform:uppercase}.pmd-staff-login h1{margin:5px 0 8px;font-size:30px;line-height:1.05;letter-spacing:-.04em}.pmd-staff-login p{margin:0 0 24px;color:#647985;font-size:13px;line-height:1.6}.pmd-staff-login__form{display:grid;gap:13px}.pmd-staff-login label,.pmd-staff-request-form label{display:grid;gap:5px;color:#536b78;font-size:10px;font-weight:850}.pmd-staff-login input,.pmd-staff-request-form input,.pmd-staff-request-form textarea,.pmd-staff-message-form textarea{width:100%;border:1px solid #cfdee5;border-radius:11px;background:#fff;color:#102a43;font:inherit;outline:none}.pmd-staff-login input{height:46px;padding:0 12px}.pmd-staff-login input:focus,.pmd-staff-request-form input:focus,.pmd-staff-request-form textarea:focus,.pmd-staff-message-form textarea:focus{border-color:#66ad99;box-shadow:0 0 0 3px rgba(102,173,153,.14)}.pmd-staff-login__form>button,.pmd-staff-primary,.pmd-staff-message-form button{min-height:44px;border:0;border-radius:11px;background:#075f4f;color:#fff;font:inherit;font-size:12px;font-weight:900;cursor:pointer}.pmd-staff-login__card>small{display:block;margin-top:16px;color:#82939b;font-size:10px;line-height:1.5}.pmd-staff-flash{margin:0 0 14px;padding:10px 12px;border-radius:11px;background:#eef4f7;color:#526a76;font-size:11px;font-weight:750;line-height:1.45}.pmd-staff-flash.is-success{background:#eaf8f2;color:#096048}.pmd-staff-flash.is-error{background:#fff0ef;color:#a13f35}.pmd-staff-shell{min-height:100vh}.pmd-staff-topbar{position:sticky;top:0;z-index:20;display:flex;min-height:68px;align-items:center;justify-content:space-between;gap:16px;padding:0 max(18px,calc((100vw - 1180px)/2));border-bottom:1px solid #dce7eb;background:rgba(255,255,255,.96);backdrop-filter:blur(12px)}.pmd-staff-brand{display:flex;align-items:center;gap:10px;color:#244251;text-decoration:none}.pmd-staff-brand img{width:122px}.pmd-staff-brand span{padding-left:10px;border-left:1px solid #d7e3e8;color:#08745c;font-size:10px;font-weight:900;text-transform:uppercase}.pmd-staff-topbar__person{display:flex;align-items:center;gap:12px}.pmd-staff-topbar__person>div{display:grid;text-align:right}.pmd-staff-topbar__person strong{font-size:11px}.pmd-staff-topbar__person small{color:#7a8c95;font-size:9px}.pmd-staff-topbar__person button{height:34px;padding:0 10px;border:1px solid #d1dee4;border-radius:9px;background:#fff;color:#526b77;font:inherit;font-size:10px;font-weight:850;cursor:pointer}.pmd-staff-nav{position:sticky;top:68px;z-index:19;display:flex;gap:6px;padding:8px max(18px,calc((100vw - 1180px)/2));border-bottom:1px solid #e2eaee;background:#f8fbfc}.pmd-staff-nav a{display:flex;align-items:center;gap:5px;padding:7px 10px;border-radius:8px;color:#5f7580;font-size:10px;font-weight:850;text-decoration:none}.pmd-staff-nav a:hover{background:#fff;color:#075f4f}.pmd-staff-nav b{display:grid;min-width:16px;height:16px;place-items:center;border-radius:999px;background:#fff0d8;color:#a55e00;font-size:8px}.pmd-staff-main{width:min(1180px,calc(100% - 36px));margin:0 auto;padding:24px 0 64px}.pmd-staff-hero{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:14px;margin-bottom:14px}.pmd-staff-hero>div,.pmd-staff-hero>article{padding:22px;border:1px solid #dbe6eb;border-radius:16px;background:#fff}.pmd-staff-hero h1{margin:3px 0 4px;font-size:28px;letter-spacing:-.04em}.pmd-staff-hero p{margin:0;color:#758893;font-size:11px}.pmd-staff-hero article{display:grid;align-content:center;gap:4px}.pmd-staff-hero article span{color:#768a94;font-size:9px;font-weight:850;text-transform:uppercase}.pmd-staff-hero article strong{font-size:18px}.pmd-staff-hero article small{color:#607680;font-size:10px}.pmd-staff-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,.8fr);gap:14px;align-items:start}.pmd-staff-card{scroll-margin-top:120px;padding:18px;border:1px solid #dbe6eb;border-radius:16px;background:#fff}.pmd-staff-card.is-wide{grid-row:span 2}.pmd-staff-card>header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:13px}.pmd-staff-card>header span{display:block;color:#08745c;font-size:8.5px;font-weight:900;letter-spacing:.07em;text-transform:uppercase}.pmd-staff-card h2{margin:2px 0 0;font-size:16px;letter-spacing:-.02em}.pmd-staff-card>header>b{display:grid;min-width:28px;height:28px;place-items:center;border-radius:9px;background:#eef6f2;color:#08745c;font-size:11px}.pmd-staff-shifts{display:grid;gap:7px}.pmd-staff-shifts article{display:grid;grid-template-columns:46px minmax(0,1fr) auto auto;align-items:center;gap:10px;padding:9px;border:1px solid #e0e8ec;border-radius:11px}.pmd-staff-shifts time{display:grid;width:40px;height:40px;place-items:center;border-radius:9px;background:#eef5f8;line-height:1}.pmd-staff-shifts time strong{font-size:14px}.pmd-staff-shifts time small{font-size:8px;text-transform:uppercase}.pmd-staff-shifts article>div{display:grid;gap:2px}.pmd-staff-shifts article>div strong{font-size:11.5px}.pmd-staff-shifts article>div span{color:#738792;font-size:9.5px}.pmd-staff-shifts em{color:#08745c;font-size:8.5px;font-style:normal;font-weight:850;text-transform:capitalize}.pmd-staff-shifts button{padding:6px 8px;border:1px solid #d1dee4;border-radius:8px;background:#fff;color:#536c78;font:inherit;font-size:8.5px;font-weight:850;cursor:pointer}.pmd-staff-past{margin-top:10px}.pmd-staff-past summary{color:#6f838e;font-size:10px;font-weight:850;cursor:pointer}.pmd-staff-past>div{display:grid;grid-template-columns:90px minmax(0,1fr) 100px;gap:8px;padding:7px 2px;border-bottom:1px solid #eef2f4;color:#60737e;font-size:9.5px}.pmd-staff-thread{display:grid;gap:8px;max-height:430px;overflow:auto;padding-right:2px}.pmd-staff-thread article{display:grid;gap:5px}.pmd-staff-thread article>div{width:min(88%,520px);padding:9px 10px;border-radius:11px;background:#f1f5f7}.pmd-staff-thread article.is-me>div{margin-left:auto;background:#edf8f3}.pmd-staff-thread article>div.is-reply{margin-left:0;background:#f1f5f7}.pmd-staff-thread small{color:#7b8e97;font-size:8.5px}.pmd-staff-thread p{margin:3px 0 0;font-size:10.5px;line-height:1.45}.pmd-staff-thread em{display:inline-block;margin-top:5px;padding:3px 6px;border-radius:999px;background:#eef3f5;color:#647984;font-size:8px;font-style:normal;font-weight:850}.pmd-staff-thread em.is-approved{background:#e9f7f1;color:#08745c}.pmd-staff-thread em.is-declined{background:#fff0ef;color:#a13f35}.pmd-staff-message-form{display:grid;grid-template-columns:minmax(0,1fr) 70px;gap:7px;margin-top:11px}.pmd-staff-message-form textarea,.pmd-staff-request-form textarea{padding:9px 10px;resize:vertical;font-size:11px}.pmd-staff-request-form{display:grid;gap:10px}.pmd-staff-request-types{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px;border-radius:10px;background:#f0f5f7}.pmd-staff-request-types button{height:34px;border:0;border-radius:8px;background:transparent;color:#647985;font:inherit;font-size:10px;font-weight:850;cursor:pointer}.pmd-staff-request-types button.is-active{background:#fff;color:#075f4f;box-shadow:0 1px 4px rgba(37,58,70,.08)}.pmd-staff-dates{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pmd-staff-request-form input{height:38px;padding:0 9px;font-size:11px}.pmd-staff-empty{padding:18px;border:1px dashed #d6e2e7;border-radius:11px;color:#7a8d96;font-size:10.5px;text-align:center}@media(max-width:820px){.pmd-staff-topbar{padding:0 14px}.pmd-staff-brand img{width:105px}.pmd-staff-topbar__person>div{display:none}.pmd-staff-nav{top:68px;padding:7px 12px;overflow:auto}.pmd-staff-main{width:min(100% - 24px,700px);padding-top:14px}.pmd-staff-hero{grid-template-columns:1fr}.pmd-staff-grid{grid-template-columns:1fr}.pmd-staff-card.is-wide{grid-row:auto}.pmd-staff-shifts article{grid-template-columns:42px minmax(0,1fr) auto}.pmd-staff-shifts em{display:none}.pmd-staff-shifts button{grid-column:2/4;justify-self:start}.pmd-staff-past>div{grid-template-columns:80px minmax(0,1fr)}.pmd-staff-past>div small{display:none}}@media(max-width:520px){.pmd-staff-login{padding:14px}.pmd-staff-login__card{padding:24px 20px;border-radius:18px}.pmd-staff-login h1{font-size:26px}.pmd-staff-brand span{display:none}.pmd-staff-main{width:calc(100% - 20px)}.pmd-staff-hero>div,.pmd-staff-hero>article,.pmd-staff-card{padding:14px}.pmd-staff-shifts article{grid-template-columns:40px minmax(0,1fr)}.pmd-staff-shifts button{grid-column:1/3}.pmd-staff-dates{grid-template-columns:1fr}.pmd-staff-message-form{grid-template-columns:1fr}.pmd-staff-message-form button{min-height:38px}}
'''

files = {
    'app/Http/Controllers/PmdStaffPortalController.php': controller,
    'routes/pmd-staff-portal-v1.php': routes,
    'resources/views/pmd-staff-portal/login.blade.php': login_view,
    'resources/views/pmd-staff-portal/index.blade.php': index_view,
    'app/admin/assets/css/pmd-staff-portal-v1.css': css,
}
for path, content in files.items():
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)

# Route loader: keep this tiny and next to the existing admin route modules.
routes_file = ROOT / 'app/admin/routes.php'
text = routes_file.read_text()
needle = "require_once base_path('routes/admin-app-before.php');\n"
insert = needle + "require_once base_path('routes/pmd-staff-portal-v1.php');\n"
if "routes/pmd-staff-portal-v1.php" not in text:
    if needle not in text: raise SystemExit('admin route loader anchor not found')
    text = text.replace(needle, insert, 1)
routes_file.write_text(text)

# Fix the real role landing authority: Team Member was missing here.
landing_file = ROOT / 'app/admin/Services/PmdRoleLandingService.php'
text = landing_file.read_text()
anchor = "        'reservations' => 'reservations',\n"
addition = anchor + "\n        'pmd-team-member' => 'mywork',\n        'team-member' => 'mywork',\n        'team member' => 'mywork',\n"
if "'pmd-team-member' => 'mywork'" not in text:
    if anchor not in text: raise SystemExit('role landing anchor not found')
    text = text.replace(anchor, addition, 1)
landing_file.write_text(text)

# Old /admin/mywork becomes a compatibility bridge into the standalone portal.
mywork_file = ROOT / 'app/admin/controllers/Mywork.php'
text = mywork_file.read_text()
start = text.index('    public function index()\n    {')
end = text.index('    public function saverequest()', start)
new_index = '''    public function index()\n    {\n        // PMD_STAFF_PORTAL_COMPAT_V1\n        // Keep the old authenticated route as a bridge only. Staff work lives\n        // on the standalone /staff surface with no Admin chrome.\n        return redirect('/staff');\n    }\n\n'''
text = text[:start] + new_index + text[end:]
text = text.replace("return redirect(admin_url('mywork'))->with('success', 'Request sent to your manager.');", "return redirect('/staff#messages')->with('success', 'Request sent to your manager.');")
mywork_file.write_text(text)

# Make the owner workflow explicit about where staff actually sign in.
people_controller = ROOT / 'app/admin/controllers/People.php'
text = people_controller.read_text()
text = text.replace("return redirect(admin_url('people').'?person='.$personId.'#access')->with('success', 'PMD access saved.');", "return redirect(admin_url('people').'?person='.$personId.'#access')->with('success', 'PMD access saved. Staff sign in at /staff/login.');")
people_controller.write_text(text)

people_view = ROOT / 'app/admin/views/pmdpeople/index.blade.php'
text = people_view.read_text()
old = '''        <div class="pmd-people__top-actions">\n            <a href="{{ admin_url('shifts') }}">Shifts</a>\n            <button type="button" data-pmd-people-add>+ Person</button>\n        </div>'''
new = '''        <div class="pmd-people__top-actions">\n            <a href="{{ admin_url('shifts') }}">Shifts</a>\n            <a href="{{ url('/staff/login') }}" target="_blank" rel="noopener">Staff Portal</a>\n            <button type="button" data-pmd-people-add>+ Person</button>\n        </div>'''
if old not in text: raise SystemExit('People top action anchor not found')
text = text.replace(old, new, 1)
old = '''                            <strong>PMD login <em>{{ $access ? 'Active' : 'Optional' }}</em></strong>\n                            <label><span>Username</span>'''
new = '''                            <strong>PMD login <em>{{ $access ? 'Active' : 'Optional' }}</em></strong>\n                            <div class="pmd-people__hint">Staff sign in at <a href="{{ url('/staff/login') }}" target="_blank" rel="noopener">{{ url('/staff/login') }}</a>. This is separate from the Owner/Manager Admin workspace.</div>\n                            <label><span>Username</span>'''
if old not in text: raise SystemExit('People access anchor not found')
text = text.replace(old, new, 1)
people_view.write_text(text)

print('PMD Staff Portal V13 staged')
