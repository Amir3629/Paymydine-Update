@php
    $staffName = trim((string)optional($identity['staff'] ?? null)->staff_name) ?: 'Team member';
    $destination = (string)session()->get(\App\Services\PmdSiteAccessService::SESSION_DESTINATION, 'workspace');
    $destinationLabel = $destination === 'staff' ? 'Staff Portal' : 'Workspace';
    $tenantHost = request()->getHost();
@endphp
<!doctype html>
<html lang="{{ app()->getLocale() ?: 'en' }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Workplace verification · PayMyDine</title>
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-workplace-v3">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-workplace-access-v2.css?v=3">
</head>
<body class="pmd-workplace-access">
<header class="pmd-wa-top">
    <a class="pmd-wa-brand" href="{{ admin_url('login') }}">
        <img src="https://mimoza.paymydine.com/brand/paymydine-logo.svg" alt="PayMyDine">
        <span>{{ $destinationLabel }}</span>
    </a>
    <div class="pmd-wa-actions"><span class="pmd-wa-link">{{ $staffName }}</span></div>
</header>

<main class="pmd-wa-main is-login">
    <section class="pmd-wa-card" data-pmd-workplace-verify @if($challenge) data-expires-at="{{ \Carbon\Carbon::parse($challenge->expires_at)->toIso8601String() }}" @endif>
        <header class="pmd-wa-head">
            <span class="pmd-wa-eyebrow">Step 2 of 2</span>
            <h1>Verify restaurant access</h1>
            <p>Your password is correct. Finish signing in with the restaurant Workplace Code. The Owner can alternatively use their personal Authenticator app.</p>
            <span class="pmd-wa-domain">Restaurant locked · {{ $tenantHost }}</span>
        </header>

        <div class="pmd-wa-body">
            @if(session('error'))<div class="pmd-wa-flash is-error">{{ session('error') }}</div>@endif
            @if(session('success'))<div class="pmd-wa-flash is-success">{{ session('success') }}</div>@endif

            @if(!$ready)
                <div class="pmd-wa-note">Workplace Access is not ready for this restaurant. Ask the restaurant Owner to finish setup.</div>
            @elseif(!$challenge)
                <div class="pmd-wa-empty"><strong>No verification request</strong><span>Return to login and start again.</span></div>
                <div style="margin-top:14px"><a class="pmd-wa-primary" href="{{ admin_url('login') }}">Back to login</a></div>
            @else
                <div class="pmd-wa-stack">
                    @if($localWorkplaceCode)
                        <div class="pmd-wa-note"><strong>This is the trusted restaurant device.</strong><br>Use the code shown below to complete this Cashier/Admin login.</div>
                        <div class="pmd-wa-codebox">
                            <span class="pmd-wa-code-label">WORKPLACE CODE</span>
                            <strong class="pmd-wa-code">{{ substr($localWorkplaceCode['code'],0,3) }} {{ substr($localWorkplaceCode['code'],3) }}</strong>
                            <span class="pmd-wa-code-time">Changes in {{ $localWorkplaceCode['expires_in'] }}s</span>
                        </div>
                    @endif

                    <div class="pmd-wa-status {{ $onlineHub ? 'is-online' : '' }}" data-pmd-hub-state>
                        {{ $onlineHub ? 'Restaurant device online' : 'Waiting for the restaurant Admin/Cashier device' }}
                    </div>

                    <form method="post" action="{{ admin_url('siteaccess/verify') }}" class="pmd-wa-form" autocomplete="one-time-code">
                        @csrf
                        <label class="pmd-wa-field">
                            <span>Workplace code</span>
                            <input class="pmd-wa-code-input" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required autofocus>
                        </label>
                        <button class="pmd-wa-primary" type="submit">Continue to {{ $destinationLabel }}</button>
                    </form>

                    @if($isOwner && $ownerTotpEnabled)
                        <div class="pmd-wa-divider"><span>Owner alternative</span></div>
                        <a class="pmd-wa-secondary" href="{{ admin_url('siteaccess/owner-mfa') }}">Use my Authenticator app instead</a>
                    @endif

                    <p class="pmd-wa-muted">This login request expires in <strong data-pmd-countdown>01:30</strong>. Workplace codes rotate every 30 seconds.</p>

                    <details class="pmd-wa-advanced">
                        <summary>Other restaurant verification option</summary>
                        <div class="pmd-wa-stack" style="margin-top:14px">
                            <div class="pmd-wa-status" data-pmd-approval-state>Ask the Cashier/Admin to approve this exact login request.</div>
                            <p class="pmd-wa-muted">The request also appears with a QR on the trusted restaurant device. Approval is short-lived and never permanently trusts this phone.</p>
                        </div>
                    </details>

                    @if($canRecover)
                        <details class="pmd-wa-advanced">
                            <summary>Owner emergency recovery</summary>
                            <form method="post" action="{{ admin_url('siteaccess/recovery') }}" class="pmd-wa-form" style="margin-top:14px">
                                @csrf
                                <label class="pmd-wa-field">
                                    <span>One-time recovery code</span>
                                    <input name="recovery_code" type="text" maxlength="20" placeholder="AB12-CD34" required autocomplete="off">
                                </label>
                                <button class="pmd-wa-secondary" type="submit">Use emergency recovery code</button>
                            </form>
                        </details>
                    @endif
                </div>
            @endif
        </div>
    </section>
</main>

@if($ready && $challenge)
<script>
(function () {
    'use strict';
    var root = document.querySelector('[data-pmd-workplace-verify]');
    if (!root) return;
    var csrf = document.querySelector('meta[name="csrf-token"]');
    var token = csrf ? csrf.getAttribute('content') : '';
    var state = document.querySelector('[data-pmd-approval-state]');
    var hubState = document.querySelector('[data-pmd-hub-state]');
    var countdown = document.querySelector('[data-pmd-countdown]');
    var expires = new Date(root.getAttribute('data-expires-at') || '').getTime();
    var finished = false;

    function updateCountdown() {
        if (!countdown || !isFinite(expires)) return;
        var left = Math.max(0, Math.floor((expires - Date.now()) / 1000));
        var m = Math.floor(left / 60);
        var s = left % 60;
        countdown.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        if (left === 0 && state) state.textContent = 'This request expired. Sign in again.';
    }

    function finalize() {
        if (finished) return;
        finished = true;
        if (state) state.textContent = 'Approved. Finishing sign-in…';
        fetch('{{ admin_url('siteaccess/finalize') }}', {
            method: 'POST', credentials: 'same-origin',
            headers: {'X-CSRF-TOKEN': token, 'Accept': 'application/json'}
        }).then(function (response) { return response.json(); })
          .then(function (payload) {
              if (!payload || !payload.ok) throw new Error(payload && payload.message ? payload.message : 'Could not finish verification.');
              window.location.assign(payload.redirect);
          }).catch(function (error) {
              finished = false;
              if (state) state.textContent = error.message || 'Could not finish verification.';
          });
    }

    function poll() {
        if (finished) return;
        fetch('{{ admin_url('siteaccess/status') }}', {
            credentials: 'same-origin', headers: {'Accept':'application/json','Cache-Control':'no-cache'}
        }).then(function (response) { return response.json(); })
          .then(function (payload) {
              if (!payload || !payload.ok) return;
              if (hubState) {
                  hubState.classList.toggle('is-online', !!payload.online_hub);
                  hubState.textContent = payload.online_hub ? 'Restaurant device online' : 'Waiting for the restaurant Admin/Cashier device';
              }
              if (payload.status === 'approved') return finalize();
              if (payload.status === 'declined' && state) state.textContent = 'The restaurant declined this login.';
              if (payload.status === 'expired' && state) state.textContent = 'This request expired. Sign in again.';
          }).catch(function () {});
    }

    updateCountdown();
    window.setInterval(updateCountdown, 1000);
    window.setInterval(poll, 2200);
    poll();
})();
</script>
@endif
</body>
</html>
