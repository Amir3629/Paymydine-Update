@php
    $userPanel = \Admin\Classes\UserPanel::forUser();
    $faviconPath = setting('favicon_logo');
    $defaultAvatar = $userPanel->getAvatarUrl().'&s=64';
    $profileImage = $faviconPath
        ? asset('assets/media/uploads/'.ltrim($faviconPath, '/'))
        : $defaultAvatar;

    /*
     * PMD_LOCATION_LIVE_CLOCK_CONFIG_R8
     *
     * Timezone truth order:
     *   1) active location model / location option
     *   2) market timezone
     *   3) tenant timezone
     *   4) app timezone
     *
     * The visible clock never falls back to the browser timezone.
     */
    $pmdClockLocation = null;
    $pmdClockLocationId = null;
    $pmdClockLocationName = trim((string)$userPanel->getLocationName());
    $pmdClockTimezone = '';
    $pmdClockTimezoneSource = '';

    $pmdClockValidTimezone = function ($value) {
        $candidate = trim((string)$value);

        if ($candidate === '') {
            return '';
        }

        try {
            new \DateTimeZone($candidate);
            return $candidate;
        } catch (\Throwable $error) {
            return '';
        }
    };

    try {
        $pmdClockLocation = \Admin\Facades\AdminLocation::current();

        if ($pmdClockLocation) {
            $pmdClockLocationId = (int)$pmdClockLocation->location_id;

            if ($pmdClockLocationName === '') {
                $pmdClockLocationName = trim((string)$pmdClockLocation->location_name);
            }

            foreach (['timezone', 'location_timezone'] as $pmdClockField) {
                $pmdClockCandidate = $pmdClockValidTimezone(
                    $pmdClockLocation->{$pmdClockField} ?? ''
                );

                if ($pmdClockCandidate !== '') {
                    $pmdClockTimezone = $pmdClockCandidate;
                    $pmdClockTimezoneSource = 'location-model';
                    break;
                }
            }

            if ($pmdClockTimezone === '') {
                try {
                    $pmdClockCandidate = $pmdClockValidTimezone(
                        \Admin\Models\LocationOption::onLocation(
                            $pmdClockLocation
                        )->get('timezone', '')
                    );

                    if ($pmdClockCandidate !== '') {
                        $pmdClockTimezone = $pmdClockCandidate;
                        $pmdClockTimezoneSource = 'location-option';
                    }
                } catch (\Throwable $pmdClockLocationOptionError) {
                    // Continue to tenant/market timezone.
                }
            }
        }
    } catch (\Throwable $pmdClockLocationError) {
        $pmdClockLocation = null;
    }

    if ($pmdClockTimezone === '') {
        $pmdClockCandidate = $pmdClockValidTimezone(
            setting('pmd_market_timezone')
        );

        if ($pmdClockCandidate !== '') {
            $pmdClockTimezone = $pmdClockCandidate;
            $pmdClockTimezoneSource = 'market-setting';
        }
    }

    if ($pmdClockTimezone === '') {
        $pmdClockCandidate = $pmdClockValidTimezone(
            setting('timezone')
        );

        if ($pmdClockCandidate !== '') {
            $pmdClockTimezone = $pmdClockCandidate;
            $pmdClockTimezoneSource = 'tenant-setting';
        }
    }

    if ($pmdClockTimezone === '') {
        $pmdClockCandidate = $pmdClockValidTimezone(
            config('app.timezone', 'UTC')
        );

        $pmdClockTimezone = $pmdClockCandidate !== ''
            ? $pmdClockCandidate
            : 'UTC';

        $pmdClockTimezoneSource = $pmdClockCandidate !== ''
            ? 'app-fallback'
            : 'utc-fallback';
    }

    $pmdClockConfig = [
        'version' => '8.0.0',
        'timezone' => $pmdClockTimezone,
        'timezoneSource' => $pmdClockTimezoneSource,
        'locationId' => $pmdClockLocationId,
        'locationName' => $pmdClockLocationName,
    ];
@endphp
<script id="pmd-location-live-clock-config-r8">
window.PMDLocationClockConfigR8 = {!! json_encode(
    $pmdClockConfig,
    JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
) !!};
</script>
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

