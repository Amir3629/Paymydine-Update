{{-- PMD_STAFF_SAME_APP_MANAGEMENT_V1_20261023
     Server roles + tenant location gate in Mywork::manage().
     Shared Team chat only; never exposes private staff groups. --}}
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Team control · PayMyDine</title>
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-shifts-staff-center-v1.css?v=25">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-staff-manager-v1.css?v=1">
</head>
<body class="pmd-staff-mobile-manager">
    <main class="pmd-staff-manager" data-pmd-manager-root>
        <header class="pmd-staff-manager__header">
            <a class="pmd-staff-manager__brand" href="{{ admin_url('mywork/manage') }}" aria-label="PayMyDine manager home">
                <img src="/app/admin/assets/images/pmd-login-logo.svg" alt="PayMyDine">
            </a>
            <span class="pmd-staff-manager__role">Owner / Manager</span>
            <nav class="pmd-staff-manager__links" aria-label="Account">
                @if($hasPersonalPortal)
                    <a href="{{ admin_url('mywork/personal') }}#schedule">My work</a>
                @endif
                <a href="{{ admin_url('shifts') }}">Full Shifts</a>
                <a href="{{ admin_url('mywork/stafflogout') }}">Log out</a>
            </nav>
        </header>

        @if(session('success'))<p class="pmd-staff-manager__message" role="status">{{ session('success') }}</p>@endif
        @if(session('error'))<p class="pmd-staff-manager__message is-error" role="alert">{{ session('error') }}</p>@endif

        <div class="pmd-staff-manager__main">
            <div class="pmd-staff-manager__heading">
                <div><small>RESTAURANT · WORKFORCE</small><h1>Team control</h1>
                    <p>Live attendance, requests, extra work and the restaurant Team channel.</p></div>
                <button type="button" data-pmd-manager-refresh>Refresh</button>
            </div>

            <section class="pmd-staff-manager__urgent" aria-labelledby="pmd-manager-extra-label">
                <div class="pmd-staff-manager__urgent-header">
                    <div><small>ACTUAL WORK · UNPLANNED</small>
                        <h2 id="pmd-manager-extra-label">Extra shifts</h2></div>
                    <strong>{{ $unreviewedExtras->count() }} to review</strong>
                </div>
                <div class="pmd-staff-manager__extras">
                    @forelse($extras->take(40) as $extra)
                        <article class="pmd-staff-manager__extra{{ $extra->reviewed ? ' is-reviewed' : '' }}">
                            <div><strong>{{ $extra->person_name }}</strong>
                                <small>{{ \Carbon\Carbon::parse($extra->check_in_time)->format('D d M') }}
                                    · {{ $extra->start_label }} – {{ $extra->end_label ?: 'Working' }}</small></div>
                            <div class="pmd-staff-manager__extra-end">
                                <span>{{ $extra->reviewed ? 'Reviewed' : 'Extra work' }}</span>
                                @if(!$extra->reviewed && !$extra->is_open)
                                    <form method="post" action="{{ admin_url('shifts/reviewactual') }}" data-pmd-manager-action>
                                        @csrf
                                        <input type="hidden" name="attendance_id" value="{{ (int)$extra->actual_shift_id }}">
                                        <button type="submit">Mark reviewed</button>
                                    </form>
                                @elseif($extra->is_open)
                                    <small>On shift</small>
                                @endif
                            </div>
                        </article>
                    @empty
                        <p class="pmd-staff-manager__empty">No extra shifts recorded this month.</p>
                    @endforelse
                </div>
            </section>

            <section class="pmd-staff-manager__operations" aria-labelledby="pmd-staff-ops-title">
                @include('admin::pmdshifts._staff_operations_center_v1', ['pmdStaffOperations' => $center])
            </section>
        </div>
        <nav class="pmd-staff-manager__footer" aria-label="Management navigation">
            <a href="{{ admin_url('mywork/manage') }}" aria-current="page">Team</a>
            <a href="{{ admin_url('shifts') }}">Schedule</a>
            @if($hasPersonalPortal)<a href="{{ admin_url('mywork/personal') }}#schedule">My shifts</a>@endif
        </nav>
    </main>
    <script defer src="/app/admin/assets/js/pmd-staff-manager-v1.js?v=1"></script>
</body>
</html>
