@php
    $roleCode = app(\Admin\Services\PmdDefaultStaffRoleService::class)->roleCodeForUser($identity['user'] ?? null);
    $canRecovery = $roleCode === \Admin\Services\PmdDefaultStaffRoleService::OWNER;
    $purposeLabels = [
        \App\Services\PmdSiteAccessService::PURPOSE_WORKSPACE => 'Workspace access',
        \App\Services\PmdSiteAccessService::PURPOSE_PAIR_STAFF => 'Pair personal phone',
        \App\Services\PmdSiteAccessService::PURPOSE_ELEVATE => 'Elevated access',
    ];
@endphp
<!doctype html>
<html lang="{{ app()->getLocale() ?: 'en' }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Site Access Hub · PayMyDine</title>
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-site-access-v1">
    <link rel="stylesheet" href="/app/admin/assets/css/pmd-site-access-v1.css?v=1">
</head>
<body class="pmd-site-access-standalone">
<div class="pmd-sa-shell">
    <header class="pmd-sa-topbar">
        <a class="pmd-sa-brand" href="{{ admin_url('orders') }}">
            <img src="https://mimoza.paymydine.com/brand/paymydine-logo.svg" alt="PayMyDine">
            <span>Site Access</span>
        </a>
        <div style="display:flex;gap:8px">
            <a class="pmd-sa-top-action" href="{{ admin_url('orders') }}">Cashier</a>
            @if($canConfigure)<a class="pmd-sa-top-action" href="{{ admin_url('pmddevices') }}#site-access">Devices</a>@endif
        </div>
    </header>

    <main class="pmd-sa-main">
        @if(session('error'))<div class="pmd-sa-flash is-error">{{ session('error') }}</div>@endif
        @if(session('success'))<div class="pmd-sa-flash is-success">{{ session('success') }}</div>@endif

        @if(!$ready)
            <section class="pmd-sa-card">
                <header class="pmd-sa-card-head"><span class="pmd-sa-eyebrow">PMD Site Access</span><h1>Site Access is not installed yet</h1><p>The additive tenant database migration must be applied before a trusted restaurant hub can be activated.</p></header>
            </section>
        @elseif(!$hub)
            <div class="pmd-sa-grid">
                <section class="pmd-sa-card">
                    <header class="pmd-sa-card-head"><span class="pmd-sa-eyebrow">First setup</span><h1>Make this POS a trusted hub</h1><p>Once activated, this browser can approve Workspace logins and pair employees' personal Staff Portal devices.</p></header>
                    <div class="pmd-sa-card-body">
                        @if($canConfigure)
                            <div class="pmd-sa-warning">Activate this only on the physical restaurant POS/tablet that should prove workplace presence. The browser receives an HttpOnly device token; the raw token is never stored in the database.</div>
                            <form method="post" action="{{ admin_url('siteaccess/hub/activate') }}" class="pmd-sa-form">
                                @csrf
                                <label class="pmd-sa-field">
                                    <span>POS device</span>
                                    <select name="pos_device_id" required>
                                        <option value="">Choose a registered POS</option>
                                        @foreach($posDevices as $pos)
                                            <option value="{{ (int)$pos->device_id }}">{{ $pos->name ?: $pos->code ?: 'POS #'.$pos->device_id }}{{ !empty($pos->is_local_terminal) ? ' · local' : '' }}</option>
                                        @endforeach
                                    </select>
                                </label>
                                <button type="submit" class="pmd-sa-primary">Trust this browser as Site Access hub</button>
                            </form>
                            @if($posDevices->isEmpty())<p class="pmd-sa-help">No POS record exists yet. Create the Cashier/POS device in Settings → Devices first.</p>@endif
                        @else
                            <div class="pmd-sa-empty"><strong>This browser is not a trusted hub yet</strong><span>Ask the restaurant Owner or Manager to open Settings → Devices on this Cashier and activate Site Access.</span></div>
                        @endif
                    </div>
                </section>

                <section class="pmd-sa-card">
                    <header class="pmd-sa-card-head"><span class="pmd-sa-eyebrow">How it works</span><h2>One restaurant authority</h2></header>
                    <div class="pmd-sa-card-body">
                        <p class="pmd-sa-kicker">Workspace logins from laptops/phones wait here for restaurant approval. Staff Portal phones pair here once and then remain trusted for personal Staff Portal use until revoked.</p>
                        <div class="pmd-sa-status is-waiting">No Site Access cookie on this browser</div>
                    </div>
                </section>
            </div>
        @else
            <section class="pmd-sa-card" style="margin-bottom:16px">
                <div class="pmd-sa-card-body pmd-sa-hub-hero">
                    <div>
                        <span class="pmd-sa-eyebrow">Trusted restaurant device</span>
                        <h1>{{ $hub->device_name ?: 'Cashier Site Access' }}</h1>
                        <div class="pmd-sa-hub-meta">
                            <span class="pmd-sa-chip is-online" data-pmd-hub-online>Online</span>
                            <span class="pmd-sa-chip">Workspace approvals</span>
                            <span class="pmd-sa-chip">Staff phone pairing</span>
                        </div>
                    </div>
                    <a class="pmd-sa-secondary" href="{{ admin_url('orders') }}">Back to Cashier</a>
                </div>
            </section>

            <div class="pmd-sa-grid">
                <section class="pmd-sa-card">
                    <header class="pmd-sa-card-head">
                        <span class="pmd-sa-eyebrow">Live approvals</span>
                        <h2>Waiting for restaurant verification</h2>
                        <p>Codes and QR links are unique to one login request and expire automatically.</p>
                    </header>
                    <div class="pmd-sa-card-body">
                        <div class="pmd-sa-pending" data-pmd-pending-list>
                            @forelse($pending as $item)
                                <article class="pmd-sa-request" data-challenge-id="{{ (int)$item->id }}">
                                    <div class="pmd-sa-request-main">
                                        <div class="pmd-sa-request-title"><strong>{{ $item->staff_name ?: 'Team member' }}</strong><span class="pmd-sa-chip">{{ $purposeLabels[$item->purpose] ?? $item->purpose }}</span></div>
                                        <p>{{ $item->requested_device_name ?: 'Browser device' }} · expires {{ \Carbon\Carbon::parse($item->expires_at)->format('H:i:s') }}</p>
                                        <span class="pmd-sa-request-code">{{ $item->display_code }}</span>
                                        <div style="display:flex;align-items:center;gap:12px;margin-top:10px;flex-wrap:wrap">
                                            <img src="{{ admin_url('siteaccess/hub/qr/'.(int)$item->id) }}" width="148" height="148" alt="QR for {{ $item->staff_name ?: 'login request' }}" style="display:block;border:1px solid #e3ecea;border-radius:10px;padding:6px;background:#fff">
                                            <div><small style="display:block;color:#71817f;font-size:10px;max-width:170px;line-height:1.45">Scan this QR with the same phone/browser that just entered the PMD password.</small></div>
                                        </div>
                                    </div>
                                    <div class="pmd-sa-request-actions">
                                        <form method="post" action="{{ admin_url('siteaccess/hub/approve') }}">@csrf<input type="hidden" name="challenge_id" value="{{ (int)$item->id }}"><button class="approve" type="submit">Approve</button></form>
                                        <form method="post" action="{{ admin_url('siteaccess/hub/decline') }}">@csrf<input type="hidden" name="challenge_id" value="{{ (int)$item->id }}"><button class="decline" type="submit">Decline</button></form>
                                    </div>
                                </article>
                            @empty
                                <div class="pmd-sa-empty"><strong>No one is waiting</strong><span>New Workspace logins and phone-pairing requests will appear here automatically.</span></div>
                            @endforelse
                        </div>
                    </div>
                </section>

                <div class="pmd-sa-stack">
                    <section class="pmd-sa-card">
                        <header class="pmd-sa-card-head"><span class="pmd-sa-eyebrow">Trusted devices</span><h2>Restaurant & personal devices</h2></header>
                        <div class="pmd-sa-card-body">
                            <div class="pmd-sa-device-list">
                                @forelse($devices as $device)
                                    <div class="pmd-sa-device">
                                        <div><strong>{{ $device->device_name }}</strong><small>{{ $device->device_kind === 'site_hub' ? 'Restaurant hub'.(!empty($device->pos_name) ? ' · '.$device->pos_name : '') : 'Personal Staff Portal'.(!empty($device->staff_name) ? ' · '.$device->staff_name : '') }}</small></div>
                                        <span class="pmd-sa-device-state">{{ $device->last_seen_at && \Carbon\Carbon::parse($device->last_seen_at)->gte(now()->subMinutes(2)) ? 'Online' : 'Trusted' }}</span>
                                        <form method="post" action="{{ admin_url('siteaccess/device/revoke') }}" onsubmit="return confirm('Revoke trust for this device?');">@csrf<input type="hidden" name="device_id" value="{{ (int)$device->id }}"><button type="submit">Revoke</button></form>
                                    </div>
                                @empty
                                    <div class="pmd-sa-empty"><strong>No trusted devices</strong><span>Activate the first Cashier hub to begin.</span></div>
                                @endforelse
                            </div>
                        </div>
                    </section>

                    @if($canRecovery)
                        <section class="pmd-sa-card" id="recovery">
                            <header class="pmd-sa-card-head"><span class="pmd-sa-eyebrow">Owner emergency</span><h2>Recovery codes</h2><p>Use only if restaurant verification hardware is unavailable.</p></header>
                            <div class="pmd-sa-card-body">
                                @if($recoveryCodes)
                                    <div class="pmd-sa-warning">Save these now. PMD stores only hashes and will not show the raw codes again.</div>
                                    <div class="pmd-sa-recovery-codes">@foreach($recoveryCodes as $code)<code>{{ $code }}</code>@endforeach</div>
                                @endif
                                <form method="post" action="{{ admin_url('siteaccess/recovery-codes') }}" onsubmit="return confirm('Generate a new set? Any unused old recovery codes will stop working.');">@csrf<button class="pmd-sa-secondary" type="submit">Generate new recovery codes</button></form>
                            </div>
                        </section>
                    @endif
                </div>
            </div>
        @endif
    </main>
</div>

@if($ready && $hub)
<script>
(function () {
    'use strict';
    var csrf = document.querySelector('meta[name="csrf-token"]');
    var token = csrf ? csrf.getAttribute('content') : '';
    var list = document.querySelector('[data-pmd-pending-list]');
    var purposeLabels = {
        workspace_login: 'Workspace access',
        pair_staff_device: 'Pair personal phone',
        elevate_session: 'Elevated access'
    };

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>'"]/g, function (c) {
            return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c];
        });
    }

    function render(items) {
        if (!list) return;
        if (!items || !items.length) {
            list.innerHTML = '<div class="pmd-sa-empty"><strong>No one is waiting</strong><span>New Workspace logins and phone-pairing requests will appear here automatically.</span></div>';
            return;
        }
        list.innerHTML = items.map(function (item) {
            var id = Number(item.id || 0);
            var qr = '{{ rtrim(admin_url('siteaccess/hub/qr'), '/') }}/' + id;
            return '<article class="pmd-sa-request" data-challenge-id="'+id+'">'
                +'<div class="pmd-sa-request-main"><div class="pmd-sa-request-title"><strong>'+escapeHtml(item.staff_name || 'Team member')+'</strong><span class="pmd-sa-chip">'+escapeHtml(purposeLabels[item.purpose] || item.purpose)+'</span></div>'
                +'<p>'+escapeHtml(item.device_name || 'Browser device')+' · short-lived request</p>'
                +'<span class="pmd-sa-request-code">'+escapeHtml(item.display_code)+'</span>'
                +'<div style="display:flex;align-items:center;gap:12px;margin-top:10px;flex-wrap:wrap"><img src="'+qr+'" width="148" height="148" alt="Site Access QR" style="display:block;border:1px solid #e3ecea;border-radius:10px;padding:6px;background:#fff"><small style="display:block;color:#71817f;font-size:10px;max-width:170px;line-height:1.45">Scan on the same phone/browser that entered the PMD password.</small></div></div>'
                +'<div class="pmd-sa-request-actions"><form method="post" action="{{ admin_url('siteaccess/hub/approve') }}"><input type="hidden" name="_token" value="'+escapeHtml(token)+'"><input type="hidden" name="challenge_id" value="'+id+'"><button class="approve" type="submit">Approve</button></form>'
                +'<form method="post" action="{{ admin_url('siteaccess/hub/decline') }}"><input type="hidden" name="_token" value="'+escapeHtml(token)+'"><input type="hidden" name="challenge_id" value="'+id+'"><button class="decline" type="submit">Decline</button></form></div></article>';
        }).join('');
    }

    function heartbeat() {
        fetch('{{ admin_url('siteaccess/hub/heartbeat') }}', {method:'POST',credentials:'same-origin',headers:{'X-CSRF-TOKEN':token,'Accept':'application/json'}}).catch(function () {});
    }
    function refresh() {
        fetch('{{ admin_url('siteaccess/hub/data') }}', {credentials:'same-origin',headers:{'Accept':'application/json','Cache-Control':'no-cache'}})
            .then(function (response) { return response.json(); })
            .then(function (payload) { if (payload && payload.ok) render(payload.pending || []); })
            .catch(function () {});
    }

    heartbeat(); refresh();
    window.setInterval(heartbeat, 30000);
    window.setInterval(refresh, 2500);
})();
</script>
@endif
</body>
</html>
