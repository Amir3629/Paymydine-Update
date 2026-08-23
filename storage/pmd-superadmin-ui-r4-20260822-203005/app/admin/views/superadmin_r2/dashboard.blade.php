@extends('admin::superadmin_r2.layout')
@section('title','Overview')

@push('head')
<style>
    .pmd-overview-hero{margin:0 0 16px}.pmd-overview-hero h2{font-size:30px;line-height:1.08;margin:0 0 6px}.pmd-overview-hero p{margin:0;color:var(--muted);font-size:13px}
    .pmd-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:14px}
    .pmd-kpi{position:relative;min-height:126px;padding:18px;border:1px solid var(--line);border-radius:20px;background:#fff;box-shadow:0 8px 24px rgba(18,61,50,.045);overflow:hidden}
    .pmd-kpi:after{content:"";position:absolute;right:-22px;bottom:-34px;width:104px;height:104px;border-radius:50%;background:var(--kpi-soft,#eef5f2)}
    .pmd-kpi-head{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:12px}.pmd-kpi-label{font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#667a73}
    .pmd-kpi-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:var(--kpi-soft,#eef5f2);color:var(--kpi-accent,#123d32)}.pmd-kpi-icon svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
    .pmd-kpi-value{position:relative;z-index:1;margin-top:9px;font-size:32px;line-height:1;font-weight:850;letter-spacing:-.035em}.pmd-kpi-hint{position:relative;z-index:1;margin-top:7px;color:var(--muted);font-size:11px}
    .pmd-kpi.total{--kpi-soft:#edf8f4;--kpi-accent:#11765a}.pmd-kpi.active{--kpi-soft:#ecfdf3;--kpi-accent:#067647}.pmd-kpi.disabled{--kpi-soft:#fff4ed;--kpi-accent:#b54708}.pmd-kpi.expired{--kpi-soft:#fff1f0;--kpi-accent:#b42318}

    .pmd-chart-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(300px,.75fr);gap:14px;margin-bottom:14px}
    .pmd-chart-card{min-height:330px}.pmd-chart-card .card-head{margin-bottom:10px}
    .pmd-growth-chart{height:230px;display:grid;grid-template-columns:repeat(6,minmax(42px,1fr));gap:14px;align-items:end;padding:12px 8px 0;border-top:1px solid #edf2f0}
    .pmd-growth-col{height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:9px;min-width:0}.pmd-growth-value{font-size:11px;font-weight:800;color:#526961}.pmd-growth-track{width:min(54px,76%);height:168px;display:flex;align-items:flex-end;border-radius:14px;background:linear-gradient(180deg,#f7faf9,#eef5f2);overflow:hidden}.pmd-growth-bar{width:100%;min-height:6px;border-radius:14px 14px 8px 8px;background:linear-gradient(180deg,#20b486,#08745a);box-shadow:0 6px 16px rgba(8,116,90,.16)}.pmd-growth-label{font-size:10px;font-weight:800;color:#71837d;text-transform:uppercase;letter-spacing:.04em}
    .pmd-donut-wrap{display:grid;place-items:center;padding:16px 8px 4px}.pmd-donut{position:relative;width:178px;height:178px;border-radius:50%;background:conic-gradient(#19b67d 0 var(--active-deg),#f29a64 var(--active-deg) calc(var(--active-deg) + var(--disabled-deg)),#e45151 calc(var(--active-deg) + var(--disabled-deg)) calc(var(--active-deg) + var(--disabled-deg) + var(--removed-deg)),#e9efec 0)}.pmd-donut:after{content:"";position:absolute;inset:28px;border-radius:50%;background:#fff;border:1px solid #edf2f0}.pmd-donut-center{position:absolute;z-index:2;inset:0;display:grid;place-content:center;text-align:center}.pmd-donut-center strong{font-size:30px;line-height:1}.pmd-donut-center span{margin-top:5px;font-size:10px;color:var(--muted);font-weight:750;text-transform:uppercase;letter-spacing:.05em}
    .pmd-status-list{display:grid;gap:9px;margin-top:16px}.pmd-status-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:9px 10px;border-radius:12px;background:#f8fbfa;font-size:11px}.pmd-status-key{display:flex;align-items:center;gap:8px;font-weight:750}.pmd-status-dot{width:9px;height:9px;border-radius:50%}.pmd-status-dot.active{background:#19b67d}.pmd-status-dot.disabled{background:#f29a64}.pmd-status-dot.removed{background:#e45151}.pmd-status-row strong{font-size:13px}
    .pmd-latest-card .table-wrap{border-radius:15px}
    @media(max-width:1050px){.pmd-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.pmd-chart-grid{grid-template-columns:1fr}}
    @media(max-width:620px){.pmd-kpis{display:flex;overflow:auto;padding-bottom:3px}.pmd-kpi{min-width:190px}.pmd-growth-chart{gap:7px}.pmd-growth-track{width:72%;height:150px}.pmd-chart-card{min-height:310px}}
</style>
@endpush

@section('content')
<div class="pmd-overview-hero">
    <h2>Platform overview</h2>
    <p>PayMyDine restaurant growth, tenant status and platform readiness.</p>
</div>

<div class="pmd-kpis">
    <div class="pmd-kpi total">
        <div class="pmd-kpi-head"><span class="pmd-kpi-label">Restaurants</span><span class="pmd-kpi-icon"><svg viewBox="0 0 24 24"><path d="M4 21h16M6 21V8l6-5 6 5v13M9 11h6M9 15h6"/></svg></span></div>
        <div class="pmd-kpi-value">{{ $stats['total'] }}</div><div class="pmd-kpi-hint">Registered tenants</div>
    </div>
    <div class="pmd-kpi active">
        <div class="pmd-kpi-head"><span class="pmd-kpi-label">Active</span><span class="pmd-kpi-icon"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></span></div>
        <div class="pmd-kpi-value">{{ $stats['active'] }}</div><div class="pmd-kpi-hint">Ready for service</div>
    </div>
    <div class="pmd-kpi disabled">
        <div class="pmd-kpi-head"><span class="pmd-kpi-label">Disabled</span><span class="pmd-kpi-icon"><svg viewBox="0 0 24 24"><path d="M12 8v5M12 17h.01M10 3h4l7 17H3L10 3Z"/></svg></span></div>
        <div class="pmd-kpi-value">{{ $stats['disabled'] }}</div><div class="pmd-kpi-hint">Currently offline</div>
    </div>
    <div class="pmd-kpi expired">
        <div class="pmd-kpi-head"><span class="pmd-kpi-label">Expired</span><span class="pmd-kpi-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span></div>
        <div class="pmd-kpi-value">{{ $stats['expired'] }}</div><div class="pmd-kpi-hint">End date has passed</div>
    </div>
</div>

<div class="pmd-chart-grid">
    <div class="card pmd-chart-card">
        <div class="card-head"><div><h3>Tenant registrations</h3><p>New restaurants created during the last six months.</p></div></div>
        <div class="pmd-growth-chart" aria-label="Tenant registrations by month">
            @foreach($growth as $point)
                @php($height = max(4, (int)round(($point['value'] / max(1,$growthMax)) * 100)))
                <div class="pmd-growth-col">
                    <div class="pmd-growth-value">{{ $point['value'] }}</div>
                    <div class="pmd-growth-track"><div class="pmd-growth-bar" style="height:{{ $height }}%"></div></div>
                    <div class="pmd-growth-label">{{ $point['label'] }}</div>
                </div>
            @endforeach
        </div>
    </div>

    <div class="card pmd-chart-card">
        <div class="card-head"><div><h3>Tenant status</h3><p>Current central registry state.</p></div></div>
        <div class="pmd-donut-wrap">
            <div class="pmd-donut" style="--active-deg:{{ $statusMix['active_deg'] }}deg;--disabled-deg:{{ $statusMix['disabled_deg'] }}deg;--removed-deg:{{ $statusMix['removed_deg'] }}deg">
                <div class="pmd-donut-center"><strong>{{ $stats['total'] }}</strong><span>Total tenants</span></div>
            </div>
        </div>
        <div class="pmd-status-list">
            <div class="pmd-status-row"><span class="pmd-status-key"><span class="pmd-status-dot active"></span>Active</span><strong>{{ $stats['active'] }}</strong></div>
            <div class="pmd-status-row"><span class="pmd-status-key"><span class="pmd-status-dot disabled"></span>Disabled</span><strong>{{ $stats['disabled'] }}</strong></div>
            <div class="pmd-status-row"><span class="pmd-status-key"><span class="pmd-status-dot removed"></span>Removed</span><strong>{{ $stats['removed'] }}</strong></div>
        </div>
    </div>
</div>

<div class="card pmd-latest-card">
    <div class="card-head"><div><h3>Latest restaurants</h3><p>Most recently registered tenants in the central registry.</p></div><a class="btn btn-soft" href="/superadmin/new">View all</a></div>
    <div class="table-wrap"><table><thead><tr><th>Restaurant</th><th>Domain</th><th>Database</th><th>Plan</th><th>Expiry</th><th>Status</th></tr></thead><tbody>
    @forelse($latest as $tenant)
        <tr><td><span class="tenant-name">{{ $tenant->name }}</span><span class="sub">#{{ $tenant->id }}</span></td><td>{{ $tenant->domain }}</td><td>{{ $tenant->database }}</td><td>{{ $tenant->type }}</td><td>{{ $tenant->end }}</td><td><span class="badge {{ $tenant->status === 'active' ? 'ok' : ($tenant->status === 'removed' ? 'warn' : 'bad') }}">{{ $tenant->status }}</span></td></tr>
    @empty
        <tr><td colspan="6" class="empty">No restaurants registered.</td></tr>
    @endforelse
    </tbody></table></div>
</div>
@endsection
