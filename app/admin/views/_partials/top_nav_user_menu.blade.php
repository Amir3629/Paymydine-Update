@php
    $userPanel = \Admin\Classes\UserPanel::forUser();

    /*
     * PMD_PERF_R14_PROFILE_ROLE_CONTEXT_REUSE
     * Clean workspaces already resolved staff + role before makeLayout().
     * Reuse that row instead of lazy-loading staff and role relations again.
     */
    $pmdProfileRoleContextR14 = request()->attributes->get(
        '_pmd_admin_role_context_r12',
        []
    );

    if (!is_array($pmdProfileRoleContextR14)) {
        $pmdProfileRoleContextR14 = [];
    }

    $pmdProfileNameR14 = trim((string)(
        $pmdProfileRoleContextR14['staff_name']
        ?? ''
    ));

    $pmdProfileRoleR14 = trim((string)(
        $pmdProfileRoleContextR14['role_name']
        ?? ''
    ));

    $pmdProfileEmailR14 = strtolower(trim((string)(
        $pmdProfileRoleContextR14['staff_email']
        ?? ''
    )));

    if ($pmdProfileNameR14 === '') {
        $pmdProfileNameR14 = (string)$userPanel->getUserName();
    }

    if ($pmdProfileRoleR14 === '') {
        $pmdProfileRoleR14 = (string)$userPanel->getRoleName();
    }

    $faviconPath = setting('favicon_logo');

    $defaultAvatar = $pmdProfileEmailR14 !== ''
        ? '//www.gravatar.com/avatar/'
            .md5($pmdProfileEmailR14)
            .'.png?d=mm&s=64'
        : $userPanel->getAvatarUrl().'&s=64';

    $profileImage = $faviconPath
        ? asset('assets/media/uploads/'.ltrim($faviconPath, '/'))
        : $defaultAvatar;

    \App\Http\Middleware\PmdLivePerformanceProfiler::checkpoint(
        'mainmenu_user_profile'
    );
@endphp
<li class="nav-item dropdown pmd-topbar-user-item">
    <a href="#" class="nav-link pmd-header-tooltip-target" data-bs-toggle="dropdown" aria-label="Account" data-pmd-tooltip-label="Account" data-no-tooltip="1">
        <img
            class="rounded-circle navbar-profile-avatar"
            src="{{ $profileImage }}"
            alt="{{ $pmdProfileNameR14 }}"
        >
    </a>
    <div class="dropdown-menu profile-dropdown-menu">
        <div class="d-flex flex-column w-100 align-items-center">
            <div class="pt-4 px-4 pb-2">
                <img class="rounded-circle" src="{{ $profileImage }}">
            </div>
            <div class="pb-3 text-center">
                <div class="text-uppercase">{{ $pmdProfileNameR14 }}</div>
                <div class="text-muted">{{ $pmdProfileRoleR14 }}</div>
            </div>
        </div>
        <div role="separator" class="dropdown-divider"></div>
        @foreach ($item->options() as $item)
            <a class="dropdown-item {{ $item->cssClass }}" {!! Html::attributes($item->attributes) !!}>
                <i class="{{ $item->iconCssClass }}"></i><span>@lang($item->label)</span>
            </a>
        @endforeach
        <!-- <div role="separator" class="dropdown-divider"></div>
        <a class="dropdown-item text-black-50" href="https://tastyigniter.com/support" target="_blank">
            <i class="fa fa-circle-question fa-fw"></i>@lang('admin::lang.text_support')
        </a>
        <a class="dropdown-item text-black-50" href="https://tastyigniter.com/docs" target="_blank">
            <i class="fa fa-book fa-fw"></i>@lang('admin::lang.text_documentation')
        </a>
        <a class="dropdown-item text-black-50" href="https://forum.tastyigniter.com" target="_blank">
            <i class="fa fa-comments fa-fw"></i>@lang('admin::lang.text_community_support')
        </a>
    </div> -->
</li>

