@php
    $pmdSuperPath = trim(request()->path(), '/');
    $pmdSuperActive = function (array $paths) use ($pmdSuperPath) {
        foreach ($paths as $path) {
            if ($pmdSuperPath === $path || str_starts_with($pmdSuperPath, $path.'/')) return true;
        }
        return false;
    };
@endphp

<aside id="pmd-side-menu2" aria-label="Super Admin navigation">
    <div class="pmd-sm2__brand">
        <button type="button" class="pmd-sm2__brand-control" data-pmd-sm2-toggle aria-expanded="false" aria-label="Expand menu">
            <img class="pmd-sm2__brand-full" src="/app/admin/assets/images/pmd-brand-full.svg" alt="Pay My Dine">
            <img class="pmd-sm2__brand-mark" src="/app/admin/assets/images/pmd-brand-mark.svg" alt="">
            <svg class="pmd-sm2__brand-expand-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
            <svg class="pmd-sm2__brand-collapse-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
    </div>

    <nav class="pmd-sm2__nav">
        <a class="pmd-sm2__item {{ $pmdSuperActive(['superadmin/index']) ? 'is-active' : '' }}" href="/superadmin/index">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l-2 0l9 -9l9 9l-2 0"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7"/><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6"/></svg>
            <span class="pmd-sm2__label">Overview</span>
        </a>

        <a class="pmd-sm2__item {{ $pmdSuperActive(['superadmin/new','superadmin/tenants/edit']) ? 'is-active' : '' }}" href="/superadmin/new">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 10h1M14 10h1M9 14h1M14 14h1"/></svg>
            <span class="pmd-sm2__label">Restaurants</span>
        </a>

        <a class="pmd-sm2__item {{ $pmdSuperActive(['superadmin/health']) ? 'is-active' : '' }}" href="/superadmin/health">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h4l2-6 4 12 2-6h4"/></svg>
            <span class="pmd-sm2__label">Status</span>
        </a>

        <a class="pmd-sm2__item {{ $pmdSuperActive(['superadmin/location-requests']) ? 'is-active' : '' }}" href="/superadmin/location-requests">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.3 6-11a6 6 0 1 0 -12 0c0 5.7 6 11 6 11z"/><circle cx="12" cy="10" r="2"/></svg>
            <span class="pmd-sm2__label">Locations</span>
        </a>

        <a class="pmd-sm2__item {{ $pmdSuperActive(['superadmin/settings']) ? 'is-active' : '' }}" href="/superadmin/settings">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.12 2.12-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V20h-3v-.08a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-2.12-2.12.06-.06A1.65 1.65 0 0 0 7.2 15a1.65 1.65 0 0 0-1.51-1H5.6v-3h.09A1.65 1.65 0 0 0 7.2 10a1.65 1.65 0 0 0-.33-1.82l-.06-.06L8.93 6l.06.06A1.65 1.65 0 0 0 10.8 6.4a1.65 1.65 0 0 0 1-1.51V4.8h3v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06 2.12 2.12-.06.06A1.65 1.65 0 0 0 19.4 10a1.65 1.65 0 0 0 1.51 1H21v3h-.09A1.65 1.65 0 0 0 19.4 15z"/></svg>
            <span class="pmd-sm2__label">Settings</span>
        </a>
    </nav>

    <div class="pmd-sm2__account-footer" aria-label="Account actions">
        <a class="pmd-sm2__account-action pmd-sm2__logout-action" href="/superadmin/signout" aria-label="Sign out" title="Sign out">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8l4 4l-4 4"/><path d="M18 12h-10"/><path d="M8 5v-1a1 1 0 0 0 -1 -1h-3a1 1 0 0 0 -1 1v16a1 1 0 0 0 1 1h3a1 1 0 0 0 1 -1v-1"/></svg>
            <span class="pmd-sm2__account-label">Sign out</span>
        </a>
    </div>
</aside>
<div id="pmd-side-menu2-backdrop" aria-hidden="true"></div>
