@php
    $userPanel = \Admin\Classes\UserPanel::forUser();
    $faviconPath = setting('favicon_logo');
    $defaultAvatar = $userPanel->getAvatarUrl().'&s=64';
    $profileImage = $faviconPath
        ? asset('assets/media/uploads/'.ltrim($faviconPath, '/'))
        : $defaultAvatar;
@endphp
<li class="nav-item dropdown pmd-topbar-user-item">
    <a href="#" class="nav-link pmd-header-tooltip-target" data-bs-toggle="dropdown" aria-label="Account" data-pmd-tooltip-label="Account" data-no-tooltip="1">
        <img
            class="rounded-circle navbar-profile-avatar"
            src="{{ $profileImage }}"
            alt="{{ $userPanel->getUserName() }}"
        >
    </a>
    <div class="dropdown-menu profile-dropdown-menu">
        <div class="d-flex flex-column w-100 align-items-center">
            <div class="pt-4 px-4 pb-2">
                <img class="rounded-circle" src="{{ $profileImage }}">
            </div>
            <div class="pb-3 text-center">
                <div class="text-uppercase">{{ $userPanel->getUserName() }}</div>
                <div class="text-muted">{{ $userPanel->getRoleName() }}</div>
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

