@extends('admin::superadmin_r2.layout')
@section('title','Overview')

@push('head')
<style>
    .pmd-overview-hero{margin:0 0 18px}.pmd-overview-hero h2{font-size:32px;line-height:1.08;margin:0}
    .pmd-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:16px}
    .pmd-kpi{min-height:132px;padding:20px;border:1px solid var(--line);border-radius:20px;background:#fff;box-shadow:0 8px 24px rgba(18,61,50,.045)}
    .pmd-kpi-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.pmd-kpi-label{font-size:13px;font-weight:850;letter-spacing:.045em;text-transform:uppercase;color:#667a73}
    .pmd-kpi-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:var(--kpi-soft,#eef5f2);color:var(--kpi-accent,#123d32)}.pmd-kpi-icon svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
    .pmd-kpi-value{margin-top:13px;font-size:36px;line-height:1;font-weight:850;letter-spacing:-.035em}.pmd-kpi-hint{margin-top:8px;color:var(--muted);font-size:14px}
    .pmd-kpi.total{--kpi-soft:#edf8f4;--kpi-accent:#11765a}.pmd-kpi.active{--kpi-soft:#ecfdf3;--kpi-accent:#067647}.pmd-kpi.disabled{--kpi-soft:#fff4ed;--kpi-accent:#b54708}.pmd-kpi.expired{--kpi-soft:#fff1f0;--kpi-accent:#b42318}

    .pmd-chart-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:16px}
    .pmd-chart-card{min-height:390px;padding:22px}.pmd-chart-card .card-head{margin-bottom:18px}.pmd-chart-card .card-head h3{font-size:20px}
    .pmd-line-shell{border-top:1px solid #edf2f0;padding-top:14px}.pmd-line-chart{display:block;width:100%;height:245px;overflow:visible}.pmd-line-grid{stroke:#e8efec;stroke-width:1}.pmd-line-base{stroke:#d9e6e1;stroke-width:1.2}.pmd-line-path{fill:none;stroke:#0b9b74;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.pmd-line-dot{fill:#fff;stroke:#0b9b74;stroke-width:3}
    .pmd-line-labels{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:4px}.pmd-line-label{text-align:center;color:#6a7f77;font-size:13px;font-weight:750}.pmd-line-label strong{display:block;color:#17372f;font-size:14px;margin-bottom:3px}
    .pmd-status-body{display:grid;grid-template-columns:minmax(220px,.9fr) minmax(220px,1.1fr);align-items:center;gap:24px;min-height:285px;padding:4px 4px 0}
    .pmd-donut-wrap{display:grid;place-items:center}.pmd-donut{position:relative;width:224px;height:224px;border-radius:50%;background:conic-gradient(#19b67d 0 var(--active-deg),#f29a64 var(--active-deg) calc(var(--active-deg) + var(--disabled-deg)),#e45151 calc(var(--active-deg) + var(--disabled-deg)) calc(var(--active-deg) + var(--disabled-deg) + var(--removed-deg)),#e9efec 0)}.pmd-donut:after{content:"";position:absolute;inset:38px;border-radius:50%;background:#fff;border:1px solid #edf2f0}.pmd-donut-center{position:absolute;z-index:2;inset:0;display:grid;place-content:center;text-align:center}.pmd-donut-center strong{font-size:38px;line-height:1}.pmd-donut-center span{margin-top:7px;font-size:12px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.05em}
    .pmd-status-list{display:grid;gap:12px}.pmd-status-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 15px;border-radius:14px;background:#f7faf9;font-size:15px}.pmd-status-key{display:flex;align-items:center;gap:10px;font-weight:800}.pmd-status-dot{width:10px;height:10px;border-radius:50%}.pmd-status-dot.active{background:#19b67d}.pmd-status-dot.disabled{background:#f29a64}.pmd-status-dot.removed{background:#e45151}.pmd-status-row strong{font-size:18px}
    .pmd-latest-card .table-wrap{border-radius:15px}
    @media(max-width:1100px){.pmd-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.pmd-chart-grid{grid-template-columns:1fr}}
    @media(max-width:700px){.pmd-kpis{display:flex;overflow:auto;padding-bottom:3px}.pmd-kpi{min-width:210px}.pmd-status-body{grid-template-columns:1fr}.pmd-donut{width:205px;height:205px}.pmd-line-chart{height:210px}.pmd-line-label{font-size:11px}}
</style>
@endpush

@section('content')
<div class="pmd-overview-hero"><h2>Platform overview</h2></div>

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
        <div class="pmd-kpi-value">{{ $stats['expired'] }}</div><div class="pmd-kpi-hint">End date passed</div>
    </div>
</div>

@php
    $growthRows = collect($growth)->values();
    $growthCount = max(1, $growthRows->count() - 1);
    $chartPoints = [];
    foreach ($growthRows as $index => $point) {
        $x = 42 + ($index * (516 / $growthCount));
        $y = 185 - (((int)$point['value'] / max(1, (int)$growthMax)) * 125);
        $chartPoints[] = round($x, 1).','.round($y, 1);
    }
    $chartPolyline = implode(' ', $chartPoints);
@endphp

<div class="pmd-chart-grid">
    <div class="card pmd-chart-card">
        <div class="card-head"><div><h3>Tenant registrations</h3></div></div>
        <div class="pmd-line-shell">
            <svg class="pmd-line-chart" viewBox="0 0 600 220" role="img" aria-label="Tenant registrations over the last six months" preserveAspectRatio="none">
                <line class="pmd-line-grid" x1="42" y1="60" x2="558" y2="60"/>
                <line class="pmd-line-grid" x1="42" y1="102" x2="558" y2="102"/>
                <line class="pmd-line-grid" x1="42" y1="144" x2="558" y2="144"/>
                <line class="pmd-line-base" x1="42" y1="185" x2="558" y2="185"/>
                @if($growthRows->count() > 1)
                    <polyline class="pmd-line-path" points="{{ $chartPolyline }}"/>
                @endif
                @foreach($growthRows as $index => $point)
                    @php
                        $x = 42 + ($index * (516 / $growthCount));
                        $y = 185 - (((int)$point['value'] / max(1, (int)$growthMax)) * 125);
                    @endphp
                    <circle class="pmd-line-dot" cx="{{ round($x,1) }}" cy="{{ round($y,1) }}" r="5"/>
                @endforeach
            </svg>
            <div class="pmd-line-labels">
                @foreach($growthRows as $point)
                    <div class="pmd-line-label"><strong>{{ $point['value'] }}</strong>{{ $point['label'] }}</div>
                @endforeach
            </div>
        </div>
    </div>

    <div class="card pmd-chart-card">
        <div class="card-head"><div><h3>Tenant status</h3></div></div>
        <div class="pmd-status-body">
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
</div>

<div class="card pmd-latest-card">
    <div class="card-head"><div><h3>Latest restaurants</h3></div><a class="btn btn-soft" href="/superadmin/new">View all</a></div>
    <div class="table-wrap"><table><thead><tr><th>Restaurant</th><th>Domain</th><th>From</th><th>To</th><th>Status</th></tr></thead><tbody>
    @forelse($latest as $tenant)
        <tr><td><span class="tenant-name">{{ $tenant->name }}</span><span class="sub">#{{ $tenant->id }}</span></td><td>{{ $tenant->domain }}</td><td>{{ $tenant->start }}</td><td>{{ $tenant->end }}</td><td><span class="badge {{ $tenant->status === 'active' ? 'ok' : ($tenant->status === 'removed' ? 'warn' : 'bad') }}">{{ $tenant->status }}</span></td></tr>
    @empty
        <tr><td colspan="5" class="empty">No restaurants registered.</td></tr>
    @endforelse
    </tbody></table></div>
</div>
@endsection
