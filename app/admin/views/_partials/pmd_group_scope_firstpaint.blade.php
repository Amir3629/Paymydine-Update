{{-- PMD Restaurant Groups R18: the existing header owns the scope selector on first paint.
     Only centrally authenticated, tenant-managed Group Owners receive location discovery.
     No report data or writable remote context is exposed here. --}}
@php
    $pmdGroupFirstPaintContext = null;
    try {
        $pmdGroupFirstPaintUser = \Admin\Facades\AdminAuth::getUser();
        if ($pmdGroupFirstPaintUser
            && \App\Services\RestaurantGroups\ManagedIdentity::isManaged((int)$pmdGroupFirstPaintUser->getKey())) {
            $pmdGroupFirstPaintContext = app(\App\Services\RestaurantGroups\Snapshot::class)->context(false);
        }
    } catch (\Throwable $pmdGroupFirstPaintError) {
        // Failed auth or an unavailable Group registry must not block native dashboard rendering.
        $pmdGroupFirstPaintContext = null;
    }
    $pmdGroupFirstPaintSites = (array)($pmdGroupFirstPaintContext['sites'] ?? []);
    $pmdGroupFirstPaintTenant = (int)($pmdGroupFirstPaintContext['current_tenant_id'] ?? 0);
    $pmdGroupFirstPaintLocalName = 'Current restaurant';
    foreach ($pmdGroupFirstPaintSites as $pmdFirstPaintSite) {
        if ((int)($pmdFirstPaintSite['tenant_id'] ?? 0) === $pmdGroupFirstPaintTenant) {
            $pmdGroupFirstPaintLocalName = (string)($pmdFirstPaintSite['label'] ?? 'Current restaurant');
            break;
        }
    }
@endphp
@if($pmdGroupFirstPaintContext && !empty($pmdGroupFirstPaintContext['enabled']) && $pmdGroupFirstPaintSites)
<label class="pmd-group-scope-switch" data-pmd-group-firstpaint="1">
    <span class="pmd-group-scope-caption">Restaurant</span>
    <select aria-label="Restaurant scope" title="{{ $pmdGroupFirstPaintContext['group']['name'] ?? 'Business' }}">
        <option value="{{ $pmdGroupFirstPaintTenant }}">{{ $pmdGroupFirstPaintLocalName }}</option>
        @if(count($pmdGroupFirstPaintSites) > 1)
            <option value="all">All restaurants</option>
        @endif
        @foreach($pmdGroupFirstPaintSites as $pmdFirstPaintSite)
            @if((int)($pmdFirstPaintSite['tenant_id'] ?? 0) !== $pmdGroupFirstPaintTenant)
                <option value="{{ (int)$pmdFirstPaintSite['tenant_id'] }}">{{ (string)$pmdFirstPaintSite['label'] }}</option>
            @endif
        @endforeach
    </select>
</label>
<script type="application/json" id="pmd-group-initial-context">@json($pmdGroupFirstPaintContext)</script>
@endif
