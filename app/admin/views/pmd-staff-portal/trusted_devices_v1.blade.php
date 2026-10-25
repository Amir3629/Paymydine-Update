{{-- PMD_PORTAL_TRUST_DEVICES_ACCOUNT_V028_20261023
     Account-scoped and tenant-scoped; accessed only after Staff Portal MFA. --}}
<!doctype html>
<html lang="{{ app()->getLocale() === 'de' ? 'de' : 'en' }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="noindex,nofollow">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Trusted devices · PayMyDine Staff</title>
    <link rel="shortcut icon" href="/app/admin/assets/images/pmd-brand-mark.svg">
    <style>
        *{box-sizing:border-box}
        body{margin:0;min-height:100dvh;background:#f4f9f6;color:#173e32;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:14px;-webkit-font-smoothing:antialiased}
        .top{display:flex;align-items:center;justify-content:space-between;padding:18px max(18px,calc((100% - 640px)/2));background:#fff;border-bottom:1px solid #d9e8e0}
        .top a{display:flex;gap:8px;align-items:center;text-decoration:none;color:#075b47;font-size:13px;font-weight:800}
        .top img{width:108px;height:36px;object-fit:contain}
        main{max-width:640px;margin:0 auto;padding:24px 16px 70px}
        h1{font-size:25px;letter-spacing:-.025em;line-height:1.2;margin:0 0 8px}
        p{font-size:13px;line-height:1.6;color:#59766a;margin:0 0 18px}
        .list{background:#fff;border:1px solid #d8e7df;border-radius:13px;overflow:hidden}
        .device{padding:17px 15px;display:flex;justify-content:space-between;gap:10px;align-items:center;border-bottom:1px solid #e9f0ec}
        .device:last-child{border-bottom:0}
        .device div{min-width:0}
        .device strong{font-size:14px;display:block}
        .device small{display:block;margin-top:5px;font-size:11px;color:#678076}
        .device form{margin:0}
        .device button{border:1px solid #eccfc7;color:#a14132;background:#fff9f7;border-radius:8px;min-height:39px;padding:7px 12px;font:inherit;font-size:12px;font-weight:800;cursor:pointer}
        .empty{padding:22px 16px;color:#698075}
        .notice{border:1px solid #b8dfce;background:#e7f5ec;color:#176149;border-radius:8px;padding:11px 13px;margin-bottom:17px}
        button:focus-visible,a:focus-visible{outline:3px solid #2f9976;outline-offset:3px}
        @media(max-width:480px){.device{align-items:flex-start;flex-direction:column}.device form{align-self:flex-end}}
    </style>
</head>
<body>
    <header class="top">
        <a href="{{ admin_url('mywork') }}"><span aria-hidden="true">←</span> Back to Staff</a>
        <img src="/brand/paymydine-logo.svg" alt="PayMyDine">
    </header>
    <main>
        <h1>Trusted devices</h1>
        <p>These devices can sign in to your Staff Portal with a password instead of an Authenticator code for up to 90 days. Remove any device you no longer use.</p>
        @if(session('success'))<div class="notice" role="status">{{ session('success') }}</div>@endif
        <div class="list">
            @forelse($devices as $device)
            <div class="device">
                <div>
                    <strong>{{ $device->device_name }}</strong>
                    <small>Added {{ \Carbon\Carbon::parse($device->paired_at)->format('d M Y') }}
                    @if($device->last_seen_at) · Last used {{ \Carbon\Carbon::parse($device->last_seen_at)->format('d M Y') }} @endif
                    </small>
                </div>
                <form method="post" action="{{ admin_url('mywork/revoketrusted') }}">
                    @csrf
                    <input type="hidden" name="device_id" value="{{ (int)$device->id }}">
                    <button type="submit" aria-label="Remove {{ $device->device_name }} from trusted devices">Remove device</button>
                </form>
            </div>
            @empty
                <p class="empty">No devices remembered. A device can be added after a successful Authenticator sign-in.</p>
            @endforelse
        </div>
    </main>
</body>
</html>
