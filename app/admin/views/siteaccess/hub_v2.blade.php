@php
    $roleCode = app(\Admin\Services\PmdDefaultStaffRoleService::class)->roleCodeForUser($identity['user'] ?? null);
    $canRecovery = $roleCode === \Admin\Services\PmdDefaultStaffRoleService::OWNER;
    $tenantHost = request()->getHost();
@endphp
<!doctype html>
<html lang="{{ app()->getLocale() ?: 'en' }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Workplace Access · PayMyDine</title>
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-workplace-v3">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-workplace-access-v2.css?v=3">
</head>
<body class="pmd-workplace-access">
<header class="pmd-wa-top">
    <a class="pmd-wa-brand" href="{{ admin_url('orders') }}">
        <img src="https://mimoza.paymydine.com/brand/paymydine-logo.svg" alt="PayMyDine">
        <span>Workplace Access</span>
    </a>
    <div class="pmd-wa-actions">
        <a class="pmd-wa-link" href="{{ admin_url('orders') }}">Cashier</a>
        <a class="pmd-wa-link" href="{{ admin_url('pmddevices') }}">Devices</a>
    </div>
</header>

<main class="pmd-wa-main">
    @if(session('error'))<div class="pmd-wa-flash is-error">{{ session('error') }}</div>@endif
    @if(session('success'))<div class="pmd-wa-flash is-success">{{ session('success') }}</div>@endif

    @if(!$ready)
        <section class="pmd-wa-card">
            <header class="pmd-wa-head">
                <span class="pmd-wa-eyebrow">Workplace Access</span>
                <h1>Setup is not ready</h1>
                <p>The Workplace Access database setup must be completed before this restaurant can turn on workplace verification.</p>
            </header>
        </section>
    @elseif(!$hub)
        <section class="pmd-wa-card">
            <header class="pmd-wa-head">
                <span class="pmd-wa-eyebrow">One-time restaurant setup</span>
                <h1>Turn on Workplace Access</h1>
                <p>Do this once on a device that stays inside the restaurant, such as the main Admin computer, Cashier or POS.</p>
                <span class="pmd-wa-domain">Restaurant locked · {{ $tenantHost }}</span>
            </header>
            <div class="pmd-wa-body">
                @if($canConfigure)
                    <div class="pmd-wa-stack">
                        @if($canRecovery && !$ownerTotpEnabled)
                            <div class="pmd-wa-note"><strong>Owner Authenticator is required first.</strong><br>Connect Google Authenticator, Microsoft Authenticator, 1Password or another TOTP app. This is free and does not use SMS.</div>
                            <a class="pmd-wa-primary" href="{{ admin_url('siteaccess/owner-mfa/setup') }}">Connect Owner Authenticator</a>
                        @else
                            <div class="pmd-wa-note"><strong>No POS record is required first.</strong><br>This browser itself becomes the restaurant's trusted Workplace Access device. After activation, every Workspace and Staff Portal login needs a fresh restaurant proof.</div>
                            <form method="post" action="{{ admin_url('siteaccess/hub/activate') }}">
                                @csrf
                                <button type="submit" class="pmd-wa-primary" style="width:100%">Activate Workplace Access on this device</button>
                            </form>
                            <p class="pmd-wa-muted">PMD will immediately create one-time Owner recovery codes. Save them somewhere private.</p>
                        @endif
                    </div>
                @else
                    <div class="pmd-wa-empty"><strong>Owner setup required</strong><span>The restaurant Owner must finish Authenticator and Workplace Access setup before team logins are allowed.</span></div>
                @endif
            </div>
        </section>
    @else
        <section class="pmd-wa-card">
            <header class="pmd-wa-head">
                <span class="pmd-wa-eyebrow">Restaurant workplace code</span>
                <h1>Use this code to sign in</h1>
                <p>Anyone signing in to Workspace or Staff Portal must use a fresh restaurant proof after their password. The Owner may instead use their personal Authenticator app.</p>
                <span class="pmd-wa-domain">{{ $tenantHost }}</span>
            </header>
            <div class="pmd-wa-body pmd-wa-stack">
                <div class="pmd-wa-codebox">
                    <span class="pmd-wa-code-label">WORKPLACE CODE</span>
                    <strong class="pmd-wa-code" data-pmd-workplace-code>{{ isset($workplaceCode['code']) ? substr($workplaceCode['code'],0,3).' '.substr($workplaceCode['code'],3) : '--- ---' }}</strong>
                    <span class="pmd-wa-code-time">Changes in <b data-pmd-workplace-countdown>{{ $workplaceCode['expires_in'] ?? 30 }}</b>s</span>
                </div>

                <div class="pmd-wa-status is-online">This restaurant device is trusted and online</div>

                @if($recoveryCodes)
                    <div class="pmd-wa-flash is-success"><strong>Save these Owner recovery codes now.</strong> They are shown only once. Do not store them on a staff device.</div>
                    <div class="pmd-wa-recovery">
                        @foreach($recoveryCodes as $code)<code>{{ $code }}</code>@endforeach
                    </div>
                @endif

                <section>
                    <div class="pmd-wa-row" style="margin-bottom:10px">
                        <div>
                            <strong>Login requests</strong>
                            <div class="pmd-wa-muted">When someone enters their password, their request appears here. They can type the Workplace Code, scan their QR, or you can approve directly.</div>
                        </div>
                    </div>
                    <div class="pmd-wa-request-list" data-pmd-pending-list>
                        @forelse($pending as $item)
                            <article class="pmd-wa-request is-with-qr" data-challenge-id="{{ (int)$item->id }}">
                                <div class="pmd-wa-request-copy">
                                    <strong>{{ $item->staff_name ?: 'Team member' }}</strong>
                                    <small>{{ $item->requested_device_name ?: 'Browser device' }} · expires {{ \Carbon\Carbon::parse($item->expires_at)->format('H:i:s') }}</small>
                                    <span class="pmd-wa-request-code">Use Workplace Code above</span>
                                </div>
                                <img class="pmd-wa-request-qr" src="{{ admin_url('siteaccess/hub/qr/'.(int)$item->id) }}" alt="Login QR for {{ $item->staff_name ?: 'team member' }}">
                                <div class="pmd-wa-request-actions">
                                    <form method="post" action="{{ admin_url('siteaccess/hub/approve') }}">@csrf<input type="hidden" name="challenge_id" value="{{ (int)$item->id }}"><button class="approve" type="submit">Approve</button></form>
                                    <form method="post" action="{{ admin_url('siteaccess/hub/decline') }}">@csrf<input type="hidden" name="challenge_id" value="{{ (int)$item->id }}"><button class="decline" type="submit">Decline</button></form>
                                </div>
                            </article>
                        @empty
                            <div class="pmd-wa-empty"><strong>No one is waiting</strong><span>New login requests appear here automatically.</span></div>
                        @endforelse
                    </div>
                </section>

                <details class="pmd-wa-advanced">
                    <summary>Advanced · trusted devices & recovery</summary>
                    <div style="margin-top:14px">
                        @if($canRecovery)
                            <div class="pmd-wa-device">
                                <div>
                                    <strong>Owner Authenticator</strong>
                                    <small>{{ $ownerTotpEnabled ? 'Connected · can verify Owner remotely without SMS' : 'Not connected' }}</small>
                                </div>
                                @if(!$ownerTotpEnabled)<a class="pmd-wa-secondary" href="{{ admin_url('siteaccess/owner-mfa/setup') }}" style="min-height:34px;padding:0 10px;font-size:11px">Connect</a>@endif
                            </div>
                        @endif

                        @foreach($devices as $device)
                            <div class="pmd-wa-device">
                                <div>
                                    <strong>{{ $device->device_name }}</strong>
                                    <small>{{ $device->device_kind === 'site_hub' ? 'Restaurant workplace device' : 'Legacy personal device' }}</small>
                                </div>
                                @if($canConfigure)
                                    <form method="post" action="{{ admin_url('siteaccess/device/revoke') }}" onsubmit="return confirm('Revoke this trusted device?');">@csrf<input type="hidden" name="device_id" value="{{ (int)$device->id }}"><button class="pmd-wa-danger" type="submit" style="min-height:34px;padding:0 10px;font-size:11px">Revoke</button></form>
                                @endif
                            </div>
                        @endforeach

                        @if($canRecovery)
                            <div id="recovery" style="margin-top:18px">
                                <form method="post" action="{{ admin_url('siteaccess/recovery-codes') }}" onsubmit="return confirm('Generate a new set? Unused old recovery codes will stop working.');">@csrf<button class="pmd-wa-secondary" type="submit">Generate new Owner recovery codes</button></form>
                            </div>
                        @endif
                    </div>
                </details>
            </div>
        </section>
    @endif
</main>

@if($ready && $hub)
<script>
(function () {
    'use strict';
    var csrf = document.querySelector('meta[name="csrf-token"]');
    var token = csrf ? csrf.getAttribute('content') : '';
    var code = document.querySelector('[data-pmd-workplace-code]');
    var countdown = document.querySelector('[data-pmd-workplace-countdown]');
    var list = document.querySelector('[data-pmd-pending-list]');

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>'"]/g, function (c) {
            return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];
        });
    }
    function formatCode(value) {
        var clean = String(value || '').replace(/\D+/g, '').slice(0,6);
        return clean.length === 6 ? clean.slice(0,3) + ' ' + clean.slice(3) : '--- ---';
    }

    function renderPending(items) {
        if (!list) return;
        if (!items || !items.length) {
            list.innerHTML = '<div class="pmd-wa-empty"><strong>No one is waiting</strong><span>New login requests appear here automatically.</span></div>';
            return;
        }
        list.innerHTML = items.map(function (item) {
            var id = Number(item.id || 0);
            return '<article class="pmd-wa-request is-with-qr" data-challenge-id="'+id+'">'
                +'<div class="pmd-wa-request-copy"><strong>'+escapeHtml(item.staff_name || 'Team member')+'</strong><small>'+escapeHtml(item.device_name || 'Browser device')+' · short-lived login request</small><span class="pmd-wa-request-code">Use Workplace Code above</span></div>'
                +'<img class="pmd-wa-request-qr" src="'+escapeHtml(item.qr_image_url || '')+'" alt="Login QR">'
                +'<div class="pmd-wa-request-actions"><form method="post" action="{{ admin_url('siteaccess/hub/approve') }}"><input type="hidden" name="_token" value="'+escapeHtml(token)+'"><input type="hidden" name="challenge_id" value="'+id+'"><button class="approve" type="submit">Approve</button></form>'
                +'<form method="post" action="{{ admin_url('siteaccess/hub/decline') }}"><input type="hidden" name="_token" value="'+escapeHtml(token)+'"><input type="hidden" name="challenge_id" value="'+id+'"><button class="decline" type="submit">Decline</button></form></div></article>';
        }).join('');
    }

    function refresh() {
        fetch('{{ admin_url('siteaccess/hub/data') }}', {credentials:'same-origin',headers:{'Accept':'application/json','Cache-Control':'no-cache'}})
          .then(function (response) { return response.json(); })
          .then(function (payload) {
              if (!payload || !payload.ok) return;
              if (code) code.textContent = formatCode(payload.workplace_code);
              if (countdown) countdown.textContent = String(payload.code_expires_in || 0);
              renderPending(payload.pending || []);
          }).catch(function () {});
    }

    function heartbeat() {
        fetch('{{ admin_url('siteaccess/hub/heartbeat') }}', {
            method:'POST', credentials:'same-origin',
            headers:{'X-CSRF-TOKEN':token,'Accept':'application/json'}
        }).then(function (response) { return response.json(); })
          .then(function (payload) {
              if (!payload || !payload.ok) return;
              if (code) code.textContent = formatCode(payload.workplace_code);
              if (countdown) countdown.textContent = String(payload.code_expires_in || 0);
          }).catch(function () {});
    }

    refresh(); heartbeat();
    window.setInterval(refresh, 2500);
    window.setInterval(heartbeat, 30000);
})();
</script>
@endif
</body>
</html>
