<!-- PMD_DEVICE_SETTINGS_SUITE_V1_HEADER -->
@php
    $pmdSuiteTitle = $pmdSuiteTitle ?? 'Devices & hardware';
    $pmdSuiteBackUrl = $pmdSuiteBackUrl ?? admin_url('pmddevices');
    $pmdSuiteActionUrl = $pmdSuiteActionUrl ?? null;
    $pmdSuiteActionLabel = $pmdSuiteActionLabel ?? null;
    $pmdSuiteActionTarget = $pmdSuiteActionTarget ?? null;
@endphp
<header class="pmd-owner-header pmd-device-suite-header">
    <div class="pmd-owner-header__left">
        <a class="pmd-owner-header-button" href="{{ $pmdSuiteBackUrl }}" aria-label="Back" title="Back">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
        </a>
        <h1>{{ $pmdSuiteTitle }}</h1>
    </div>
    <div class="pmd-owner-header__actions" data-pmd-owner-header-actions>
        @if(!empty($pmdSuiteActionUrl) && !empty($pmdSuiteActionLabel))
            <a class="pmd-owner-action" href="{{ $pmdSuiteActionUrl }}" @if($pmdSuiteActionTarget) target="{{ $pmdSuiteActionTarget }}" @endif>
                {{ $pmdSuiteActionLabel }}
            </a>
        @endif
        <span class="pmd-owner-notif-slot" data-pmd-owner-notif-slot></span>
    </div>
</header>
