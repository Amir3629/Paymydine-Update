@php
    $pmdUniversalList = $pmdUniversalList ?? [];
    $pmdKpiCards = $pmdUniversalList['kpis'] ?? [];
    $pmdPageTitle = $pmdUniversalList['title'] ?? '';
    $pmdPageDescription = $pmdUniversalList['description'] ?? '';
    $pmdPageKey = $pmdUniversalList['pageKey'] ?? 'generic';
@endphp

<div class="pmd-admin-universal-list-v1 pmd-admin-universal-list-v1--{{ e($pmdPageKey) }}">
    <div class="pmd-admin-universal-kpi-grid" aria-label="PMD admin list summary cards">
        @foreach($pmdKpiCards as $card)
            <section class="pmd-admin-universal-kpi-card" aria-label="{{ $card['label'] ?? '' }}">
                <span class="pmd-admin-universal-kpi-card__icon" aria-hidden="true">
                    <i class="fa {{ $card['icon'] ?? 'fa-circle-info' }}"></i>
                </span>
                <span class="pmd-admin-universal-kpi-card__content">
                    <span class="pmd-admin-universal-kpi-card__label">{{ $card['label'] ?? '' }}</span>
                    <span class="pmd-admin-universal-kpi-card__value">{{ $card['value'] ?? '0' }}</span>
                    @if(!empty($card['meaning']))
                        <span class="pmd-admin-universal-kpi-card__meaning">{{ $card['meaning'] }}</span>
                    @endif
                </span>
            </section>
        @endforeach
    </div>

    <section class="pmd-admin-universal-list-panel" aria-label="PMD admin list panel">
        <div class="pmd-admin-universal-list-panel__body">
            {!! $slot !!}
        </div>
    </section>
</div>
