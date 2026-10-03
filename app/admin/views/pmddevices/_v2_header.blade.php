<!-- PMD_DEVICE_SETTINGS_SUITE_V2_RESTAURANT_PARITY_HEADER -->
@php
    $pmdSuiteTitle = $pmdSuiteTitle ?? 'Devices & hardware';
    $pmdSuiteBackUrl = $pmdSuiteBackUrl ?? admin_url('pmddevices');
    $pmdSuiteActionUrl = $pmdSuiteActionUrl ?? null;
    $pmdSuiteActionTitle = $pmdSuiteActionTitle ?? null;
    $pmdSuiteActionTarget = $pmdSuiteActionTarget ?? null;
    $pmdSuiteSave = $pmdSuiteSave ?? false;
    $pmdSuiteDelete = $pmdSuiteDelete ?? false;
@endphp
<header class="pmd-profile-header" id="pmd-profile-header">
    <div class="pmd-profile-header__left">
        <a class="pmd-profile-header-button pmd-profile-back" href="{{ $pmdSuiteBackUrl }}" aria-label="Back" title="Back">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
        </a>
        <h1>{{ $pmdSuiteTitle }}</h1>
    </div>
    <div class="pmd-profile-header__actions" data-pmd-profile-header-actions>
        <span id="pmd-profile-save-status"></span>
        @if($pmdSuiteSave)
            <button
                type="button"
                class="pmd-profile-header-button pmd-profile-save-icon"
                aria-label="Save changes"
                title="Save changes"
                data-request="onSave"
                data-request-form="#pmd-restaurant-profile-form"
                data-request-flash
            >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>
            </button>
        @endif
        @if($pmdSuiteDelete)
            <button
                type="button"
                class="pmd-profile-header-button"
                aria-label="Delete"
                title="Delete"
                data-request="onDelete"
                data-request-form="#pmd-restaurant-profile-form"
                data-request-data="_method:'DELETE'"
                data-request-confirm="Are you sure you want to delete this item?"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M7 6l1 15h8l1-15M10 10v7M14 10v7"></path></svg>
            </button>
        @endif
        @if($pmdSuiteActionUrl)
            <a class="pmd-profile-header-button" href="{{ $pmdSuiteActionUrl }}" aria-label="{{ $pmdSuiteActionTitle ?: 'Open' }}" title="{{ $pmdSuiteActionTitle ?: 'Open' }}" @if($pmdSuiteActionTarget) target="{{ $pmdSuiteActionTarget }}" @endif>
                @if(($pmdSuiteActionTitle ?? '') === 'Open KDS')
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7M10 14 21 3M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6"></path></svg>
                @else
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>
                @endif
            </a>
        @endif
    </div>
</header>
