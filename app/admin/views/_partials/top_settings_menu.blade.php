@php
    $updatesCount = $item->unreadCount();
    $hasSettingsError = count(array_filter(Session::get('settings.errors', [])))
@endphp
<li class="nav-item dropdown pmd-topbar-settings-item">
    <span class="media-toolbar-tooltip-wrap" data-no-tooltip="1">
    <a class="nav-link pmd-header-tooltip-target" href="" data-bs-toggle="dropdown" aria-label="Settings" data-pmd-tooltip-label="Settings" data-no-tooltip="1">
        <i class="fa fa-gear" role="button"></i>
        @if($hasSettingsError)
            <span class="badge badge-danger"><i class="fa fa-exclamation text-white"></i></span>
        @elseif($updatesCount)
            <span class="badge badge-danger">&nbsp;</span>
        @endif
    </a>
    </span>

    <ul class="dropdown-menu">
        <div class='menu menu-grid row'>
            @foreach ($item->options() as $label => [$icon, $link])
                <div class="menu-item col col-4">
                    <a class="menu-link" href="{{ $link }}" title="@lang($label)" aria-label="@lang($label)">
                        <i class="{{ $icon }}"></i>
                        <span>@lang($label)</span>
                    </a>
                </div>
            @endforeach
        </div>
        @if(!$hasSettingsError && $updatesCount)
            <a
                class="dropdown-item border-top text-center alert-warning"
                href="{{ admin_url('updates') }}"
            >{{ sprintf(lang('system::lang.updates.text_update_found'), $updatesCount) }}</a>
        @endif
        <div class="dropdown-footer">
            <a
                class="text-center{{ $hasSettingsError ? ' text-danger' : '' }}"
                href="{{ admin_url('settings') }}"
                title="All settings"
                aria-label="All settings"
            ><i class="fa fa-ellipsis-h"></i></a>
        </div>
    </ul>
</li>
