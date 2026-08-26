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

    .pmd-analytics-grid{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(300px,.85fr);gap:16px;align-items:stretch;margin-bottom:16px}
    .pmd-chart-card,.pmd-country-card{padding:22px;margin:0}.pmd-chart-card .card-head{margin-bottom:16px;align-items:flex-end}.pmd-chart-card .card-head h3,.pmd-country-card h3{font-size:20px}
    .pmd-chart-toolbar{display:flex;align-items:flex-end;justify-content:flex-end;gap:9px;flex-wrap:wrap}.pmd-chart-range-field{display:grid;gap:5px}.pmd-chart-range-field span{font-size:11px;font-weight:850;letter-spacing:.05em;text-transform:uppercase;color:#6a7f77}.pmd-chart-range-field input{height:40px;border:1px solid #d8e5e0;border-radius:10px;background:#fff;padding:0 10px;color:var(--ink);font-size:13px}.pmd-chart-toolbar .btn{min-height:40px;padding:8px 14px;font-size:13px}
    .pmd-line-shell{border-top:1px solid #edf2f0;padding-top:12px;overflow-x:auto}.pmd-line-canvas{min-width:620px}.pmd-line-chart{display:block;width:100%;height:180px;overflow:visible}.pmd-line-grid{stroke:#e9f0ed;stroke-width:1}.pmd-line-base{stroke:#dce7e3;stroke-width:1.1}.pmd-line-path{fill:none;stroke:#0b9b74;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.pmd-line-dot{fill:#0b9b74;stroke:#fff;stroke-width:1.8}
    .pmd-line-labels{display:grid;gap:8px;margin-top:2px}.pmd-line-label{text-align:center;color:#6a7f77;font-size:12px;font-weight:750;min-width:58px}.pmd-line-label strong{display:block;color:#17372f;font-size:13px;margin-bottom:2px}

    .pmd-country-card{display:flex;flex-direction:column}.pmd-country-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:16px}.pmd-country-total{font-size:13px;font-weight:800;color:#6a7f77}
    .pmd-country-body{display:grid;grid-template-columns:156px minmax(0,1fr);gap:22px;align-items:center;min-height:218px;flex:1}
    .pmd-country-donut-wrap{display:grid;place-items:center}.pmd-country-donut{position:relative;width:156px;aspect-ratio:1;border-radius:50%;background:conic-gradient(var(--pmd-country-segments));box-shadow:inset 0 0 0 1px rgba(16,70,56,.05)}
    .pmd-country-donut-hole{position:absolute;inset:31px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 0 0 1px #eef3f1}
    .pmd-country-donut-value{font-size:31px;line-height:1;font-weight:900;letter-spacing:-.04em;color:#17372f}.pmd-country-donut-label{margin-top:7px;font-size:10px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#75877f;text-align:center}
    .pmd-country-legend{display:grid;gap:11px}.pmd-country-legend-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:center;padding:8px 0;border-bottom:1px solid #eef3f1}.pmd-country-legend-row:last-child{border-bottom:0}.pmd-country-dot{width:10px;height:10px;border-radius:50%;background:var(--pmd-country-color)}.pmd-country-name{font-size:14px;font-weight:800;color:#17372f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pmd-country-meta{font-size:12px;font-weight:800;color:#72847d;white-space:nowrap}.pmd-country-empty{display:grid;place-items:center;min-height:218px;color:#7b8d87;font-size:14px;text-align:center}
    .pmd-latest-card .table-wrap{border-radius:15px}

    @media(max-width:1100px){.pmd-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.pmd-analytics-grid{grid-template-columns:1fr}.pmd-chart-card .card-head{align-items:flex-start;flex-direction:column}.pmd-chart-toolbar{justify-content:flex-start}.pmd-country-body{grid-template-columns:170px minmax(0,1fr)}}
    @media(max-width:700px){.pmd-kpis{display:flex;overflow:auto;padding-bottom:3px}.pmd-kpi{min-width:210px}.pmd-line-chart{height:165px}.pmd-line-canvas{min-width:600px}.pmd-chart-toolbar{width:100%}.pmd-chart-range-field{flex:1;min-width:145px}.pmd-chart-range-field input{width:100%}.pmd-country-body{grid-template-columns:1fr}.pmd-country-donut{width:150px}.pmd-country-legend{width:100%}}
</style>
@endpush

@section('content')
<div class="pmd-overview-hero"><h2>Overview</h2></div>

<div class="pmd-kpis">
    <div class="pmd-kpi total">
        <div class="pmd-kpi-head"><span class="pmd-kpi-label">Restaurants</span><span class="pmd-kpi-icon"><svg viewBox="0 0 24 24"><path d="M4 21h16M6 21V8l6-5 6 5v13M9 11h6M9 15h6"/></svg></span></div>
        <div class="pmd-kpi-value">{{ $stats['total'] }}</div><div class="pmd-kpi-hint">Registered restaurants</div>
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
    $pointCount = max(1, $growthRows->count());
    $plotLeft = 36;
    $plotRight = 684;
    $plotTop = 34;
    $plotBottom = 150;
    $plotWidth = $plotRight - $plotLeft;
    $plotHeight = $plotBottom - $plotTop;
    $step = $pointCount > 1 ? $plotWidth / ($pointCount - 1) : 0;
    $points = [];

    foreach ($growthRows as $index => $point) {
        $x = $pointCount > 1 ? $plotLeft + ($index * $step) : ($plotLeft + $plotRight) / 2;
        $y = $plotBottom - (((int)$point['value'] / max(1, (int)$growthMax)) * $plotHeight);
        $points[] = ['x' => round($x, 2), 'y' => round($y, 2)];
    }

    $smoothPath = '';
    if (count($points) > 0) {
        $smoothPath = 'M '.$points[0]['x'].' '.$points[0]['y'];
        for ($i = 0; $i < count($points) - 1; $i++) {
            $p0 = $points[max(0, $i - 1)];
            $p1 = $points[$i];
            $p2 = $points[$i + 1];
            $p3 = $points[min(count($points) - 1, $i + 2)];
            $c1x = $p1['x'] + (($p2['x'] - $p0['x']) / 8);
            $c1y = $p1['y'] + (($p2['y'] - $p0['y']) / 8);
            $c2x = $p2['x'] - (($p3['x'] - $p1['x']) / 8);
            $c2y = $p2['y'] - (($p3['y'] - $p1['y']) / 8);
            $smoothPath .= ' C '.round($c1x,2).' '.round($c1y,2).' '.round($c2x,2).' '.round($c2y,2).' '.$p2['x'].' '.$p2['y'];
        }
    }

    // Intentionally high-contrast: each country should be visually distinct,
    // not another shade of PayMyDine green.
    $countryPalette = ['#00A76F','#2563EB','#F59E0B','#E11D48','#7C3AED','#06B6D4'];
    $countryStops = [];
    $countryCursor = 0.0;
    foreach ($countryMix as $index => $row) {
        $size = max(0, min(100, (float)$row['percent']));
        $start = $countryCursor;
        $end = min(100, $countryCursor + $size);
        if ($end > $start) {
            $countryStops[] = $countryPalette[$index % count($countryPalette)].' '.$start.'% '.$end.'%';
        }
        $countryCursor = $end;
    }
    if ($countryCursor < 100) {
        $countryStops[] = '#edf3f0 '.$countryCursor.'% 100%';
    }
    $countryGradient = implode(', ', $countryStops);
@endphp

<div class="pmd-analytics-grid">
    <div class="card pmd-chart-card">
        <div class="card-head">
            <div><h3>Restaurant registrations</h3></div>
            <form class="pmd-chart-toolbar" method="GET" action="/superadmin/index">
                <label class="pmd-chart-range-field"><span>From</span><input type="date" name="from" value="{{ $chartRange['from'] }}"></label>
                <label class="pmd-chart-range-field"><span>To</span><input type="date" name="to" value="{{ $chartRange['to'] }}"></label>
                <button class="btn btn-primary" type="submit">Apply</button>
                <a class="btn btn-soft" href="/superadmin/index">Reset</a>
            </form>
        </div>
        <div class="pmd-line-shell">
            <div class="pmd-line-canvas">
                <svg class="pmd-line-chart" viewBox="0 0 720 180" role="img" aria-label="Restaurant registrations from {{ $chartRange['from'] }} to {{ $chartRange['to'] }}" preserveAspectRatio="none">
                    <line class="pmd-line-grid" x1="36" y1="34" x2="684" y2="34"/>
                    <line class="pmd-line-grid" x1="36" y1="73" x2="684" y2="73"/>
                    <line class="pmd-line-grid" x1="36" y1="112" x2="684" y2="112"/>
                    <line class="pmd-line-base" x1="36" y1="150" x2="684" y2="150"/>
                    @if(count($points) > 1)
                        <path class="pmd-line-path" d="{{ $smoothPath }}"/>
                    @endif
                    @foreach($points as $point)
                        <circle class="pmd-line-dot" cx="{{ $point['x'] }}" cy="{{ $point['y'] }}" r="3"/>
                    @endforeach
                </svg>
                <div class="pmd-line-labels" style="grid-template-columns:repeat({{ max(1,$growthRows->count()) }},minmax(58px,1fr))">
                    @foreach($growthRows as $point)
                        <div class="pmd-line-label" title="{{ $point['label_long'] }}"><strong>{{ $point['value'] }}</strong>{{ $point['label'] }}</div>
                    @endforeach
                </div>
            </div>
        </div>
    </div>

    <div class="card pmd-country-card">
        <div class="pmd-country-head">
            <h3>Restaurants by country</h3>
            @if($countryTotal > 0)<span class="pmd-country-total">{{ $countryTotal }} total</span>@endif
        </div>
        @if($countryMix->isNotEmpty())
            <div class="pmd-country-body">
                <div class="pmd-country-donut-wrap">
                    <div class="pmd-country-donut" style="--pmd-country-segments:{{ $countryGradient }}" role="img" aria-label="Restaurants by country">
                        <div class="pmd-country-donut-hole">
                            <span class="pmd-country-donut-value">{{ $countryTotal }}</span>
                            <span class="pmd-country-donut-label">Restaurants</span>
                        </div>
                    </div>
                </div>
                <div class="pmd-country-legend">
                    @foreach($countryMix as $index => $row)
                        <div class="pmd-country-legend-row">
                            <span class="pmd-country-dot" style="--pmd-country-color:{{ $countryPalette[$index % count($countryPalette)] }}"></span>
                            <span class="pmd-country-name" title="{{ $row['label'] }}">{{ $row['label'] }}</span>
                            <span class="pmd-country-meta">{{ $row['value'] }} · {{ number_format((float)$row['percent'], 0) }}%</span>
                        </div>
                    @endforeach
                </div>
            </div>
        @else
            <div class="pmd-country-empty">Country data will appear here as restaurants are registered.</div>
        @endif
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