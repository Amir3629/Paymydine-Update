@php
    use Admin\Facades\AdminLocation;
    $userPanel = \Admin\Classes\UserPanel::forUser();
    $faviconPath = setting('favicon_logo');
    $defaultAvatar = $userPanel->getAvatarUrl().'&s=64';
    $profileImage = $faviconPath
        ? asset('assets/media/uploads/'.ltrim($faviconPath, '/'))
        : $defaultAvatar;
@endphp
<li class="nav-item dropdown">
    <a href="#" class="nav-link" data-bs-toggle="dropdown">
        <img
            class="rounded-circle"
            src="{{ $profileImage }}"
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
        {{-- Location Picker --}}
        @if(AdminLocation::listLocations()->isNotEmpty())
            <div role="separator" class="dropdown-divider"></div>
            <div class="dropdown-header">
                <i class="fa fa-location-dot"></i>
                <span>@lang('admin::lang.side_menu.location')</span>
            </div>
            @php
                $locations = \Admin\Classes\UserPanel::listLocations(null, null, null);
            @endphp
            @foreach($locations as $location)
                <a
                    class="dropdown-item {{ $location->active ? 'active' : '' }}"
                    data-request="mainmenu::onChooseLocation"
                    @unless($location->active)data-request-data="location: '{{ $location->id }}'"@endunless
                    href="#"
                >
                    <span>{{ $location->name }}</span>
                </a>
            @endforeach
        @endif
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

