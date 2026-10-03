@php
    $purpose = $challenge->purpose ?? '';
    $isPair = $purpose === \App\Services\PmdSiteAccessService::PURPOSE_PAIR_STAFF;
    $staffName = trim((string)optional($identity['staff'] ?? null)->staff_name) ?: 'Team member';
@endphp
<!doctype html>
<html lang="{{ app()->getLocale() ?: 'en' }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Site Access · PayMyDine</title>
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-site-access-v1">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-site-access-v1.css?v=1">
</head>
<body class="pmd-site-access-standalone">
<div class="pmd-sa-shell">
    <header class="pmd-sa-topbar">
        <a class="pmd-sa-brand" href="{{ admin_url('login') }}">
            <img src="https://mimoza.paymydine.com/brand/paymydine-logo.svg" alt="PayMyDine">
            <span>Site Access</span>
        </a>
        <span class="pmd-sa-top-action">{{ $staffName }}</span>
    </header>

    <main class="pmd-sa-main is-center">
        <section class="pmd-sa-card" data-pmd-site-access @if($challenge) data-expires-at="{{ \Carbon\Carbon::parse($challenge->expires_at)->toIso8601String() }}" @endif>
            <header class="pmd-sa-card-head">
                <span class="pmd-sa-eyebrow">PMD Site Access</span>
                <h1>{{ $isPair ? 'Pair this phone' : 'Verify at restaurant' }}</h1>
                <p>
                    @if($isPair)
                        Connect this personal device once at the restaurant. After pairing, you can use Staff Portal from this device without asking the Cashier every time.
                    @else
                        Your password is correct. One restaurant verification is required before this device can open the operational Workspace.
                    @endif
                </p>
            </header>

            <div class="pmd-sa-card-body">
                @if(session('error'))
                    <div class="pmd-sa-flash is-error">{{ session('error') }}</div>
                @endif
                @if(session('success'))
                    <div class="pmd-sa-flash is-success">{{ session('success') }}</div>
                @endif

                @if(!$ready)
                    <div class="pmd-sa-icon"><svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01"></path><circle cx="12" cy="12" r="9"></circle></svg></div>
                    <div class="pmd-sa-flash is-error">Site Access storage is not ready for this restaurant yet. No access policy has been activated.</div>
                    <a class="pmd-sa-secondary" href="{{ admin_url('login') }}">Back to login</a>
                @elseif(!$challenge)
                    <div class="pmd-sa-icon"><svg viewBox="0 0 24 24"><path d="M5 12l4 4L19 6"></path></svg></div>
                    <p class="pmd-sa-kicker">There is no pending Site Access request for this session.</p>
                    <a class="pmd-sa-primary" href="{{ admin_url('login') }}">Continue</a>
                @else
                    <div class="pmd-sa-icon">
                        @if($isPair)
                            <svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"></rect><path d="M10 18h4"></path></svg>
                        @else
                            <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-5"></path></svg>
                        @endif
                    </div>

                    <div class="pmd-sa-status {{ $onlineHub ? 'is-online' : 'is-waiting' }}" data-pmd-hub-state>
                        {{ $onlineHub ? 'Restaurant Site Access is online' : 'Waiting for the Cashier Site Access device' }}
                    </div>

                    <form method="post" action="{{ admin_url('siteaccess/verify') }}" class="pmd-sa-form" autocomplete="one-time-code">
                        @csrf
                        <label class="pmd-sa-field">
                            <span>6-digit code from the Cashier</span>
                            <input class="pmd-sa-code-input" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required>
                        </label>
                        <button class="pmd-sa-primary" type="submit">{{ $isPair ? 'Pair this device' : 'Verify Workspace access' }}</button>
                    </form>

                    <div class="pmd-sa-divider">or</div>
                    <div class="pmd-sa-status is-waiting" data-pmd-approval-state>Waiting for approval on the restaurant device…</div>
                    <p class="pmd-sa-help">The Cashier can approve this request directly. A challenge QR shown on the restaurant device can also complete this exact login request. Codes and QR links expire automatically.</p>
                    <p class="pmd-sa-help">Request expires in <strong data-pmd-countdown>01:30</strong>.</p>

                    @if($canRecover)
                        <details class="pmd-sa-recovery">
                            <summary>Restaurant device unavailable? Owner emergency access</summary>
                            <form method="post" action="{{ admin_url('siteaccess/recovery') }}" class="pmd-sa-form">
                                @csrf
                                <label class="pmd-sa-field">
                                    <span>One-time Owner recovery code</span>
                                    <input name="recovery_code" type="text" maxlength="20" placeholder="AB12-CD34" required autocomplete="off">
                                </label>
                                <button class="pmd-sa-secondary" type="submit">Use recovery code</button>
                            </form>
                            <p class="pmd-sa-help">Emergency access is audited and each recovery code works once.</p>
                        </details>
                    @endif
                @endif
            </div>
        </section>
    </main>
</div>

@if($ready && $challenge)
<script>
(function () {
    'use strict';
    var root = document.querySelector('[data-pmd-site-access]');
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
        if (left === 0 && state) state.textContent = 'This request expired. Sign in again to create a new request.';
    }

    function finalize() {
        if (finished) return;
        finished = true;
        if (state) state.textContent = 'Approved. Finishing secure sign-in…';
        fetch('{{ admin_url('siteaccess/finalize') }}', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {'X-CSRF-TOKEN': token, 'Accept': 'application/json'}
        }).then(function (response) { return response.json(); })
          .then(function (payload) {
              if (!payload || !payload.ok) throw new Error(payload && payload.message ? payload.message : 'Could not finish verification.');
              window.location.assign(payload.redirect);
          })
          .catch(function (error) {
              finished = false;
              if (state) state.textContent = error.message || 'Could not finish verification.';
          });
    }

    function poll() {
        if (finished) return;
        fetch('{{ admin_url('siteaccess/status') }}', {
            credentials: 'same-origin',
            headers: {'Accept': 'application/json', 'Cache-Control': 'no-cache'}
        }).then(function (response) { return response.json(); })
          .then(function (payload) {
              if (!payload || !payload.ok) return;
              if (hubState) {
                  hubState.classList.toggle('is-online', !!payload.online_hub);
                  hubState.classList.toggle('is-waiting', !payload.online_hub);
                  hubState.textContent = payload.online_hub ? 'Restaurant Site Access is online' : 'Waiting for the Cashier Site Access device';
              }
              if (payload.status === 'approved') return finalize();
              if (payload.status === 'declined' && state) state.textContent = 'The restaurant declined this access request.';
              if (payload.status === 'expired' && state) state.textContent = 'This request expired. Sign in again to create a new request.';
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
