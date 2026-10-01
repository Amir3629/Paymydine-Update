@php
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16
    $pmdSettingsText = $pmdSettingsText ?? static function ($value) {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish((string)$value, 'settings.');
    };
@endphp

@php
    $data = $pmdDevices ?? [];
    $pos = $data['pos'] ?? collect();
    $terminals = $data['terminals'] ?? collect();
    $terminalProviders = (array)($data['terminal_provider_options'] ?? []);

    // PMD_VR_FINANCE_TERMINAL_AUTHORITY_R5_20260905
    // VR Payment credentials, provider inventory and simulator state now live in
    // Payments & finance. Keep Devices focused on generic/local hardware.
    $terminals = collect($terminals)->reject(static function ($terminal) {
        return strtolower(trim((string)($terminal->provider_code ?? ''))) === 'vr_payment';
    })->values();
    unset($terminalProviders['vr_payment']);

    $pmdTerminalProviderCodes = array_values(array_map(static fn ($code) => strtolower(trim((string)$code)), array_keys($terminalProviders)));
    $pmdLegacySumupOnly = count($pmdTerminalProviderCodes) === 1 && $pmdTerminalProviderCodes[0] === 'sumup';
    $archivedTerminalCount = (int)($data['archived_terminal_count'] ?? 0);
    $drawers = $data['drawers'] ?? collect();
    $biometric = $data['biometric'] ?? collect();
    $kds = $data['kds'] ?? collect();
    $integrations = $data['integrations'] ?? collect();
    $turkeyFiscal = $data['turkey_fiscal'] ?? null;
    $stats = $data['stats'] ?? ['pos'=>0,'terminals'=>0,'drawers'=>0,'kds'=>0,'biometric'=>0];
    $stats['terminals'] = $terminals->count();

    // PMD_DEVICE_PLATFORM_V1
    $devicePlatform = (array)($pmdDevicePlatform ?? []);
    $devicePlatformStats = (array)($devicePlatform['stats'] ?? []);
    $devicePlatformPolicy = (array)($devicePlatform['policy'] ?? []);
    $devicePlatformDesired = (array)($devicePlatform['desired'] ?? []);
    $devicePlatformDevices = (array)($devicePlatform['devices'] ?? []);
    $devicePlatformDeployment = (array)($devicePlatform['deployment'] ?? []);
    $devicePlatformTableOptions = (array)($devicePlatform['table_options'] ?? []);
@endphp

<div id="pmd-devices-page" class="pmd-owner-page" data-pmd-owner-page data-pmd-device-inline-v6>
    {{-- PMD_DEVICE_SETTINGS_INLINE_V6 --}}
    <header class="pmd-owner-header">
        <div class="pmd-owner-header__left">
            <a class="pmd-owner-header-button" href="{{ admin_url('pmdsettings') }}" aria-label="{{ $pmdSettingsText('Back to Settings') }}" title="{{ $pmdSettingsText('Back to Settings') }}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
            </a>
            <h1>{{ $pmdSettingsText('Devices & hardware') }}</h1>
        </div>
        <div class="pmd-owner-header__actions" data-pmd-owner-header-actions>
            <span class="pmd-owner-notif-slot" data-pmd-owner-notif-slot></span>
        </div>
    </header>

    <section class="pmd-owner-section" id="hardware-overview">
        <div class="pmd-owner-card" data-accent="cyan">
            <div class="pmd-owner-card__header">
                <div class="pmd-owner-card__icon">
                    <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"></rect><path d="M8 20h8M12 16v4"></path></svg>
                </div>
                <div class="pmd-owner-card__title">
                    <h2>{{ $pmdSettingsText('Hardware overview') }}</h2>
                    <p>{{ $pmdSettingsText('One place to see every screen, terminal, drawer and authentication device connected to PayMyDine.') }}</p>
                </div>
            </div>
            <div class="pmd-owner-card__body">
                <div class="pmd-owner-stats">
                    <div class="pmd-owner-stat"><span>{{ $pmdSettingsText('POS devices') }}</span><strong>{{ (int)$stats['pos'] }}</strong></div>
                    <div class="pmd-owner-stat"><span>{{ $pmdSettingsText('Payment terminals') }}</span><strong>{{ (int)$stats['terminals'] }}</strong></div>
                    <div class="pmd-owner-stat"><span>{{ $pmdSettingsText('KDS stations') }}</span><strong>{{ (int)$stats['kds'] }}</strong></div>
                    <div class="pmd-owner-stat"><span>{{ $pmdSettingsText('Cash drawers') }}</span><strong>{{ (int)$stats['drawers'] }}</strong></div>
                </div>
            </div>
        </div>
    </section>

    {{-- PMD_DEVICE_PLATFORM_V1 --}}
    <section class="pmd-owner-section" id="device-platform">
        <div class="pmd-owner-card pmd-device-platform-card" data-accent="emerald">
            <div class="pmd-owner-card__header">
                <div class="pmd-owner-card__icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="13" rx="2"></rect>
                        <path d="M8 21h8M12 17v4M7 8h.01M10 8h7"></path>
                    </svg>
                </div>
                <div class="pmd-owner-card__title">
                    <h2>{{ $pmdSettingsText('PayMyDine Device Control') }}</h2>
                    <p>{{ $pmdSettingsText('One control plane for Table Companion, Android POS, KDS, customer displays and future kiosks.') }}</p>
                </div>
                <div class="pmd-owner-card__actions">
                    <span class="pmd-owner-status {{ (($devicePlatformStats['offline'] ?? 0) < 1) ? 'is-active' : '' }}">
                        {{ (int)($devicePlatformStats['online'] ?? 0) }} {{ $pmdSettingsText('online') }}
                    </span>
                </div>
            </div>

            <div class="pmd-owner-card__body">
                @if(!empty($devicePlatform['error']))
                    <div class="pmd-device-platform-alert">{{ e($devicePlatform['error']) }}</div>
                @endif

                <div class="pmd-device-platform-stats">
                    <div><span>{{ $pmdSettingsText('Trusted devices') }}</span><strong>{{ (int)($devicePlatformStats['total'] ?? 0) }}</strong></div>
                    <div><span>{{ $pmdSettingsText('Online') }}</span><strong>{{ (int)($devicePlatformStats['online'] ?? 0) }}</strong></div>
                    <div><span>{{ $pmdSettingsText('Offline') }}</span><strong>{{ (int)($devicePlatformStats['offline'] ?? 0) }}</strong></div>
                    <div><span>{{ $pmdSettingsText('Closed / sleeping') }}</span><strong>{{ (int)($devicePlatformStats['sleeping'] ?? 0) }}</strong></div>
                </div>

                <div class="pmd-device-platform-now">
                    <div>
                        <span>{{ $pmdSettingsText('Current automatic state') }}</span>
                        <strong>{{ (($devicePlatformDesired['screen_state'] ?? 'awake') === 'awake') ? $pmdSettingsText('Open / awake') : $pmdSettingsText('Closed / low power') }}</strong>
                    </div>
                    <small>
                        {{ e(str_replace('_', ' ', (string)($devicePlatformDesired['reason'] ?? 'schedule'))) }}
                        @if(!empty($devicePlatformDesired['timezone']))
                            · {{ e($devicePlatformDesired['timezone']) }}
                        @endif
                    </small>
                </div>

                <form
                    class="pmd-device-platform-actions"
                    data-request="onPmdDevicePlatformCommand"
                    data-request-flash
                    data-request-redirect="{{ admin_url('pmddevices').'#device-platform' }}"
                >
                    <button class="pmd-owner-action pmd-device-platform-primary" type="submit" name="action" value="OPEN_RESTAURANT">
                        {{ $pmdSettingsText('Open restaurant') }}
                    </button>
                    <button class="pmd-owner-action" type="submit" name="action" value="CLOSE_RESTAURANT">
                        {{ $pmdSettingsText('Close restaurant') }}
                    </button>
                    <button class="pmd-owner-action" type="submit" name="action" value="USE_SCHEDULE">
                        {{ $pmdSettingsText('Use opening-hours schedule') }}
                    </button>
                    <button class="pmd-owner-action" type="submit" name="action" value="RELOAD_APP">
                        {{ $pmdSettingsText('Reload all apps') }}
                    </button>
                </form>

                <div class="pmd-device-platform-grid">
                    <div class="pmd-device-platform-pane">
                        <h3>{{ $pmdSettingsText('Device schedule') }}</h3>
                        <p>{{ $pmdSettingsText('PayMyDine uses the restaurant Opening Hours as the authority. Devices wake before opening and enter closed mode after closing.') }}</p>

                        <form
                            data-request="onSavePmdDevicePlatformPolicy"
                            data-request-flash
                            data-request-redirect="{{ admin_url('pmddevices').'#device-platform' }}"
                        >
                            <div class="pmd-device-platform-policy-grid">
                                <label class="pmd-device-platform-check">
                                    <input type="checkbox" name="device_policy[schedule_enabled]" value="1" {{ !empty($devicePlatformPolicy['schedule_enabled']) ? 'checked' : '' }}>
                                    <span>{{ $pmdSettingsText('Use Opening Hours automatically') }}</span>
                                </label>

                                <label>
                                    <span>{{ $pmdSettingsText('Wake before opening') }}</span>
                                    <div class="pmd-device-platform-number">
                                        <input type="number" min="0" max="240" name="device_policy[wake_before_minutes]" value="{{ (int)($devicePlatformPolicy['wake_before_minutes'] ?? 30) }}">
                                        <small>min</small>
                                    </div>
                                </label>

                                <label>
                                    <span>{{ $pmdSettingsText('Sleep after closing') }}</span>
                                    <div class="pmd-device-platform-number">
                                        <input type="number" min="0" max="240" name="device_policy[sleep_after_minutes]" value="{{ (int)($devicePlatformPolicy['sleep_after_minutes'] ?? 30) }}">
                                        <small>min</small>
                                    </div>
                                </label>

                                <label>
                                    <span>{{ $pmdSettingsText('Open brightness') }}</span>
                                    <div class="pmd-device-platform-number">
                                        <input type="number" min="10" max="100" name="device_policy[open_brightness]" value="{{ (int)($devicePlatformPolicy['open_brightness'] ?? 80) }}">
                                        <small>%</small>
                                    </div>
                                </label>

                                <label>
                                    <span>{{ $pmdSettingsText('Closed brightness') }}</span>
                                    <div class="pmd-device-platform-number">
                                        <input type="number" min="0" max="10" name="device_policy[closed_brightness]" value="{{ (int)($devicePlatformPolicy['closed_brightness'] ?? 1) }}">
                                        <small>%</small>
                                    </div>
                                </label>
                            </div>

                            <div class="pmd-device-platform-modes">
                                <label><input type="checkbox" name="device_policy[table_display_enabled]" value="1" {{ !empty($devicePlatformPolicy['table_display_enabled']) ? 'checked' : '' }}> {{ $pmdSettingsText('Table displays') }}</label>
                                <label><input type="checkbox" name="device_policy[kds_enabled]" value="1" {{ !empty($devicePlatformPolicy['kds_enabled']) ? 'checked' : '' }}> {{ $pmdSettingsText('KDS') }}</label>
                                <label><input type="checkbox" name="device_policy[customer_display_enabled]" value="1" {{ !empty($devicePlatformPolicy['customer_display_enabled']) ? 'checked' : '' }}> {{ $pmdSettingsText('Customer displays') }}</label>
                                <label><input type="checkbox" name="device_policy[kiosk_enabled]" value="1" {{ !empty($devicePlatformPolicy['kiosk_enabled']) ? 'checked' : '' }}> {{ $pmdSettingsText('Self-service kiosks') }}</label>
                                <label><input type="checkbox" name="device_policy[pos_enabled]" value="1" {{ !empty($devicePlatformPolicy['pos_enabled']) ? 'checked' : '' }}> {{ $pmdSettingsText('Cashier POS') }}</label>
                            </div>

                            <button class="pmd-owner-action pmd-device-platform-primary" type="submit">
                                {{ $pmdSettingsText('Save device schedule') }}
                            </button>
                        </form>
                    </div>

                    <div class="pmd-device-platform-pane">
                        <h3>{{ $pmdSettingsText('How power management works') }}</h3>
                        <div class="pmd-device-platform-explainer">
                            <div><strong>Open</strong><span>Screen awake, normal brightness, app stays in dedicated PayMyDine mode.</span></div>
                            <div><strong>Closed</strong><span>Screen becomes black / minimum brightness but Android and Wi-Fi stay alive for remote wake.</span></div>
                            <div><strong>Power loss</strong><span>On supported hardware, AC restore boots Android and PayMyDine starts automatically.</span></div>
                            <div><strong>Fully powered off</strong><span>A powered-off device has no Wi-Fi and cannot receive a Cloud wake command.</span></div>
                        </div>
                    </div>
                </div>

                <div class="pmd-device-platform-deployment">
                    <div class="pmd-device-platform-deployment__copy">
                        <h3>{{ $pmdSettingsText('Bulk table deployment') }}</h3>
                        <p>{{ $pmdSettingsText('For a new restaurant, enter one reusable 6-digit deployment code on every Table Companion. The devices appear below as Unassigned; assign each one to a table from this page.') }}</p>
                    </div>

                    @if(!empty($devicePlatformDeployment['code']))
                        <div class="pmd-device-platform-deployment__active">
                            <div>
                                <span>{{ $pmdSettingsText('Deployment code') }}</span>
                                <strong>{{ e($devicePlatformDeployment['code']) }}</strong>
                                <small>
                                    {{ (int)($devicePlatformDeployment['paired_count'] ?? 0) }}
                                    /
                                    {{ (int)($devicePlatformDeployment['expected_count'] ?? 0) }}
                                    {{ $pmdSettingsText('devices paired') }}
                                </small>
                            </div>
                            <form
                                data-request="onCancelPmdTableDeployment"
                                data-request-flash
                                data-request-redirect="{{ admin_url('pmddevices').'#device-platform' }}"
                            >
                                <button class="pmd-owner-action" type="submit">
                                    {{ $pmdSettingsText('End deployment') }}
                                </button>
                            </form>
                        </div>
                    @else
                        <form
                            class="pmd-device-platform-deployment__start"
                            data-request="onStartPmdTableDeployment"
                            data-request-flash
                            data-request-redirect="{{ admin_url('pmddevices').'#device-platform' }}"
                        >
                            <label>
                                <span>{{ $pmdSettingsText('How many table displays?') }}</span>
                                <input type="number" min="1" max="200" name="expected_count" value="20">
                            </label>
                            <button class="pmd-owner-action pmd-device-platform-primary" type="submit">
                                {{ $pmdSettingsText('Start deployment') }}
                            </button>
                        </form>
                    @endif
                </div>

                <div class="pmd-device-platform-list-head">
                    <div>
                        <h3>{{ $pmdSettingsText('Managed devices') }}</h3>
                        <p>{{ $pmdSettingsText('Live heartbeat, app version, assignment and remote controls.') }}</p>
                    </div>
                </div>

                <div class="pmd-owner-list pmd-device-platform-list">
                    @forelse($devicePlatformDevices as $device)
                        <div class="pmd-owner-list-row pmd-device-platform-row">
                            <div class="pmd-device-platform-device">
                                <span class="pmd-device-platform-dot {{ !empty($device['online']) ? 'is-online' : '' }}"></span>
                                <div>
                                    <strong>{{ e($device['name'] ?? 'PayMyDine device') }}</strong>
                                    <small>
                                        {{ e($device['kind_label'] ?? 'Device') }}
                                        @if(!empty($device['assignment']))
                                            · {{ e($device['assignment']) }}
                                        @endif
                                        @if(!empty($device['model']))
                                            · {{ e($device['model']) }}
                                        @endif
                                    </small>
                                </div>
                            </div>

                            <div class="pmd-device-platform-health">
                                <span>{{ !empty($device['online']) ? $pmdSettingsText('Online') : $pmdSettingsText('Offline') }}</span>
                                <small>
                                    {{ e($device['screen_state'] ?? 'unknown') }}
                                    @if(!empty($device['network_type']))
                                        · {{ e(strtoupper((string)$device['network_type'])) }}
                                    @endif
                                    @if(!empty($device['app_version']))
                                        · {{ e($device['app_version']) }}
                                    @endif
                                    @if(isset($device['battery_level']) && $device['battery_level'] !== null)
                                        · {{ (int)$device['battery_level'] }}%
                                    @endif
                                    @if(!empty($device['last_seen_at']))
                                        · {{ $pmdSettingsText('last seen') }} {{ e(CarbonCarbon::parse($device['last_seen_at'])->diffForHumans()) }}
                                    @endif
                                </small>
                            </div>

                            <div class="pmd-device-platform-controlstack">
                                @if(($device['kind'] ?? '') === 'table_display')
                                    <form
                                        class="pmd-device-platform-assign"
                                        data-request="onAssignPmdTableDisplay"
                                        data-request-flash
                                        data-request-redirect="{{ admin_url('pmddevices').'#device-platform' }}"
                                    >
                                        <input type="hidden" name="device_id" value="{{ (int)($device['id'] ?? 0) }}">
                                        <select name="table_id" required>
                                            <option value="">{{ $pmdSettingsText('Assign table…') }}</option>
                                            @foreach($devicePlatformTableOptions as $tableOption)
                                                @if(!empty($tableOption['enabled']))
                                                    <option
                                                        value="{{ (int)($tableOption['id'] ?? 0) }}"
                                                        {{ (int)($device['table_id'] ?? 0) === (int)($tableOption['id'] ?? 0) ? 'selected' : '' }}
                                                    >
                                                        {{ $pmdSettingsText('Table') }}
                                                        {{ e($tableOption['number'] ?? '') }}
                                                        @if(!empty($tableOption['floor']))
                                                            · {{ e($tableOption['floor']) }}
                                                        @endif
                                                    </option>
                                                @endif
                                            @endforeach
                                        </select>
                                        <button type="submit">{{ $pmdSettingsText(!empty($device['assignment']) ? 'Reassign' : 'Assign') }}</button>
                                    </form>
                                @endif

                                <form
                                    class="pmd-device-platform-row-actions"
                                    data-request="onPmdDevicePlatformCommand"
                                    data-request-flash
                                    data-request-redirect="{{ admin_url('pmddevices').'#device-platform' }}"
                                >
                                    <input type="hidden" name="device_id" value="{{ (int)($device['id'] ?? 0) }}">
                                    <button type="submit" name="action" value="WAKE">{{ $pmdSettingsText('Wake') }}</button>
                                    <button type="submit" name="action" value="SLEEP">{{ $pmdSettingsText('Sleep') }}</button>
                                    <label class="pmd-device-platform-brightness">
                                        <span>{{ $pmdSettingsText('Brightness') }}</span>
                                        <input type="number" min="0" max="100" name="brightness" value="{{ (int)($device['brightness'] ?? 80) }}">
                                        <button type="submit" name="action" value="SET_BRIGHTNESS">{{ $pmdSettingsText('Set') }}</button>
                                    </label>
                                    <button type="submit" name="action" value="IDENTIFY">{{ $pmdSettingsText('Identify') }}</button>
                                    <button type="submit" name="action" value="RELOAD_APP">{{ $pmdSettingsText('Reload') }}</button>
                                    <button type="submit" name="action" value="REBOOT" data-pmd-device-confirm="reboot">{{ $pmdSettingsText('Reboot') }}</button>
                                </form>
                            </div>
                        </div>
                    @empty
                        <div class="pmd-owner-empty">
                            {{ $pmdSettingsText('No trusted PayMyDine device has reported to Device Control yet. Pair a Table Companion or Android Restaurant App first.') }}
                        </div>
                    @endforelse
                </div>
            </div>
        </div>
    </section>

    <section class="pmd-owner-section" id="pos-devices">
        <div class="pmd-owner-card" data-accent="cyan">
            <div class="pmd-owner-card__header">
                <div class="pmd-owner-card__icon">
                    <svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="14" rx="2"></rect><path d="M8 21h8M12 17v4"></path></svg>
                </div>
                <div class="pmd-owner-card__title"><h2>{{ $pmdSettingsText('POS devices') }}</h2><p>{{ $pmdSettingsText('Registers and local terminals that run PayMyDine POS.') }}</p></div>
            </div>
            <div class="pmd-owner-card__body">
                <div class="pmd-owner-list">
                    @forelse($pos as $device)
                        <div class="pmd-owner-list-row">
                            <div><strong>{{ $device->name ?: $device->code ?: 'POS device' }}</strong><small>{{ $device->description ?: ($device->device_type ?: 'PayMyDine terminal') }}</small></div>
                            <div class="pmd-owner-meta">{{ $device->device_type ?: 'POS' }}</div>
                            <div class="pmd-owner-status {{ method_exists($device, 'isOnline') && $device->isOnline() ? 'is-active' : '' }}">{{ $pmdSettingsText(method_exists($device, 'isOnline') && $device->isOnline() ? 'Online' : ($device->device_status ?: 'Configured')) }}</div>
                            <button type="button" class="pmd-owner-action" data-pmd-device-open="pos:view:{{ $device->device_id }}">{{ $pmdSettingsText('Details') }}</button>
                        </div>
                    @empty
                        <div class="pmd-owner-empty">{{ $pmdSettingsText('No POS devices are configured yet.') }}</div>
                    @endforelse
                </div>
            </div>
        </div>
    </section>

    <section class="pmd-owner-section" id="payment-terminals" data-pmd-terminal-market-ui="1" data-pmd-terminal-provider-codes="{{ implode(',', array_keys($terminalProviders)) }}">
        <div class="pmd-owner-card" data-accent="blue" data-pmd-sumup-self-service="{{ $pmdLegacySumupOnly ? '0' : '1' }}">
            <div class="pmd-owner-card__header">
                <div class="pmd-owner-card__icon">
                    <svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"></rect><path d="M8 6h8M8 10h2M12 10h2M16 10h.01M8 14h8"></path></svg>
                </div>
                <div class="pmd-owner-card__title"><h2>{{ $pmdSettingsText('Payment terminals') }}</h2><p>{{ $pmdSettingsText('Card-present readers, pairing state and terminal readiness.') }}</p></div>
                <div class="pmd-owner-card__actions"><button type="button" class="pmd-owner-action pmd-device-v6-header-add" data-pmd-device-open="terminals:create">{{ $pmdSettingsText('+ Add terminal') }}</button></div>
            </div>
            <div class="pmd-owner-card__body">
                {{-- PMD_SQUARE_TERMINAL_CANADA_R7_VIEW --}}
                <div class="pmd-owner-list">
                    @forelse($terminalProviders as $providerCode => $providerLabel)
                        @php
                            $configuredForProvider = $terminals->filter(static function ($terminal) use ($providerCode) {
                                return strtolower(trim((string)($terminal->provider_code ?? ''))) === strtolower(trim((string)$providerCode));
                            })->count();
                        @endphp
                        <div class="pmd-owner-list-row">
                            <div>
                                <strong>{{ $pmdSettingsText($providerLabel) }}</strong>
                                <small>{{ $providerCode === 'square' ? $pmdSettingsText('Canada · CAD · Square Terminal API') : $pmdSettingsText('Available for this restaurant market') }}</small>
                            </div>
                            <div class="pmd-owner-meta">{{ $configuredForProvider > 0 ? $configuredForProvider.' '.$pmdSettingsText('configured') : $pmdSettingsText('Not configured yet') }}</div>
                            <div class="pmd-owner-status is-active">{{ $pmdSettingsText('Available') }}</div>
                            @if($configuredForProvider < 1)
                                <button type="button" class="pmd-owner-action" data-pmd-device-open="terminals:create">{{ $pmdSettingsText('+ Add terminal') }}</button>
                            @endif
                        </div>
                    @empty
                        <div class="pmd-owner-empty">{{ $pmdSettingsText('No terminal provider is enabled for this restaurant market.') }}</div>
                    @endforelse
                </div>

                @if($terminals->isNotEmpty())
                    <div class="pmd-owner-list">
                        @foreach($terminals as $terminal)
                            <div class="pmd-owner-list-row">
                                <div><strong>{{ $terminal->reader_label ?: $terminal->reader_id ?: 'Payment terminal' }}</strong><small>{{ strtoupper((string)($terminal->provider_code ?: 'provider')) }}</small></div>
                                <div class="pmd-owner-meta">{{ $pmdSettingsText($terminal->pairing_state ?: 'Unknown pairing') }}</div>
                                <div class="pmd-owner-status {{ !empty($terminal->is_active) ? 'is-active' : '' }}">{{ $pmdSettingsText(!empty($terminal->is_active) ? ($terminal->terminal_status ?: 'Active') : 'Inactive') }}</div>
                                <button type="button" class="pmd-owner-action" data-pmd-device-open="terminals:edit:{{ $terminal->terminal_device_id }}">{{ $pmdSettingsText('Edit') }}</button>
                            </div>
                        @endforeach
                    </div>
                @endif

                @if($archivedTerminalCount > 0)
                    <div class="pmd-owner-empty">{{ $archivedTerminalCount }} {{ $pmdSettingsText('terminal configuration(s) from another market are archived and hidden here.') }}</div>
                @endif
            </div>
        </div>
    </section>

    @if($turkeyFiscal)
        @php
            $trFiscalConfig = (array)($turkeyFiscal['config'] ?? []);
            $trFiscalState = (array)($turkeyFiscal['state'] ?? []);
            $trFiscalStatus = str_replace('_', ' ', (string)($trFiscalState['status'] ?? 'partner required'));
        @endphp
        <section class="pmd-owner-section" id="turkey-fiscal-device">
            <div class="pmd-owner-card" data-accent="blue">
                <div class="pmd-owner-card__header">
                    <div class="pmd-owner-card__icon"><svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"></rect><path d="M8 7h8M8 11h8M8 15h5"></path></svg></div>
                    <div class="pmd-owner-card__title">
                        <h2>Türkiye fiscal device (YN ÖKC)</h2>
                        <p>Configure the government-approved fiscal device used by this Turkish restaurant. The combined EFT-POS type can also contain the physical card-payment POS in the same handheld device.</p>
                    </div>
                    <div class="pmd-owner-card__actions"><span class="pmd-owner-status {{ !empty($trFiscalState['production_ready']) ? 'is-active' : '' }}">{{ ucfirst($trFiscalStatus) }}</span></div>
                </div>
                <div class="pmd-owner-card__body">
                    <div class="pmd-owner-empty" style="margin-bottom:16px">
                        PayMyDine still runs tables, menu, orders and waiter workflows. YN ÖKC is the Turkish fiscal/payment hardware layer. Configure the bank/payment connection under <a href="{{ admin_url('pmdfinance') }}#turkey-payment-connections">Payments & finance</a>.
                    </div>
                    <form data-request="onSaveTurkeyFiscalDevice" data-request-flash>
                        <div class="pmd-owner-form-grid">
                            <div class="pmd-owner-field"><label>Manufacturer</label><input type="text" name="turkey[fiscal][manufacturer]" value="{{ e($trFiscalConfig['manufacturer'] ?? '') }}" placeholder="Worldline / TOKEN / VERA / Hugin / ..."></div>
                            <div class="pmd-owner-field"><label>Device model</label><input type="text" name="turkey[fiscal][device_model]" value="{{ e($trFiscalConfig['device_model'] ?? '') }}" placeholder="Approved model / test device"></div>
                            <div class="pmd-owner-field"><label>Device serial</label><input type="text" name="turkey[fiscal][device_serial]" value="{{ e($trFiscalConfig['device_serial'] ?? '') }}" placeholder="Physical or test device serial"></div>
                            <div class="pmd-owner-field"><label>Device type</label><select name="turkey[fiscal][integration_topology]"><option value="">Choose later</option><option value="eft_pos_integrated" {{ ($trFiscalConfig['integration_topology'] ?? '') === 'eft_pos_integrated' ? 'selected' : '' }}>Combined fiscal + card-payment YN ÖKC</option><option value="computer_connected" {{ ($trFiscalConfig['integration_topology'] ?? '') === 'computer_connected' ? 'selected' : '' }}>Fiscal YN ÖKC + separate payment terminal</option></select></div>
                            <div class="pmd-owner-field"><label>Vendor/security agreement reference</label><input type="text" name="turkey[fiscal][security_agreement_reference]" value="{{ e($trFiscalConfig['security_agreement_reference'] ?? '') }}" placeholder="Contract / integration document reference"></div>
                            <div class="pmd-owner-field"><label>Certification status</label><input type="text" name="turkey[fiscal][certification_status]" value="{{ e($trFiscalConfig['certification_status'] ?? '') }}" placeholder="pending / test / certified"></div>
                        </div>
                        <div style="display:flex;align-items:center;gap:12px;margin-top:16px">
                            <button type="submit" class="pmd-owner-action">Save Türkiye fiscal device</button>
                            <span id="pmd-tr-device-save-status"></span>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    @endif

    <section class="pmd-owner-section" id="kds">
        <div class="pmd-owner-card" data-accent="violet">
            <div class="pmd-owner-card__header">
                <div class="pmd-owner-card__icon">
                    <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"></rect><path d="M7 21h10M12 17v4"></path></svg>
                </div>
                <div class="pmd-owner-card__title"><h2>{{ $pmdSettingsText('Kitchen display stations') }}</h2><p>{{ $pmdSettingsText('Route menu categories to the kitchen displays that need them.') }}</p></div>
                <div class="pmd-owner-card__actions"><button type="button" class="pmd-owner-action pmd-device-v6-header-add" data-pmd-device-open="kds:create">{{ $pmdSettingsText('+ Add KDS') }}</button></div>
            </div>
            <div class="pmd-owner-card__body">
                <div class="pmd-owner-list">
                    @forelse($kds as $station)
                        @php $pmdKdsCategoryCount = is_array($station->category_ids) ? count($station->category_ids) : 0; @endphp
                        <div class="pmd-owner-list-row">
                            <div><strong>{{ $station->name ?: 'KDS station' }}</strong><small>{{ $pmdKdsCategoryCount > 0 ? $pmdKdsCategoryCount.' '.$pmdSettingsText('routed categories') : $pmdSettingsText('All menu categories') }}</small></div>
                            <div class="pmd-owner-meta">{{ $pmdSettingsText('Category routing') }}</div>
                            <a class="pmd-owner-action" href="{{ admin_url('kitchendisplay/'.$station->slug) }}" target="_blank" rel="noopener">{{ $pmdSettingsText('Open KDS') }}</a>
                            <button type="button" class="pmd-owner-action" data-pmd-device-open="kds:edit:{{ $station->station_id }}">{{ $pmdSettingsText('Edit') }}</button>
                        </div>
                    @empty
                        <div class="pmd-owner-empty">{{ $pmdSettingsText('No KDS stations are configured yet.') }}</div>
                    @endforelse
                </div>
            </div>
        </div>
    </section>

    {{-- PMD_TABLE_DISPLAY_V1 --}}
    <section class="pmd-owner-section" id="table-displays">
        <div class="pmd-owner-card" data-accent="emerald">
            <div class="pmd-owner-card__header">
                <div class="pmd-owner-card__icon">
                    <svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="3"></rect><path d="M9 7h6M9 17h6"></path></svg>
                </div>
                <div class="pmd-owner-card__title">
                    <h2>{{ $pmdSettingsText('Table displays') }}</h2>
                    <p>{{ $pmdSettingsText('Small guest-facing screens for each table: QR menu entry, order reactions, waiter-call feedback and card-payment handoff.') }}</p>
                </div>
                <div class="pmd-owner-card__actions">
                    <a class="pmd-owner-action" href="{{ admin_url('pmddevices/tabledisplay') }}">{{ $pmdSettingsText('Open preview') }}</a>
                </div>
            </div>
            <div class="pmd-owner-card__body">
                <div class="pmd-owner-list">
                    <div class="pmd-owner-list-row">
                        <div>
                            <strong>{{ $pmdSettingsText('PayMyDine Table Companion') }}</strong>
                            <small>{{ $pmdSettingsText('No menu is rendered on the device. The screen stays focused on the table QR and short live reactions.') }}</small>
                        </div>
                        <div class="pmd-owner-meta">{{ $pmdSettingsText('Android-ready') }}</div>
                        <div class="pmd-owner-status is-active">{{ $pmdSettingsText('Preview ready') }}</div>
                        <a class="pmd-owner-action" href="{{ admin_url('pmddevices/tabledisplay') }}">{{ $pmdSettingsText('Preview') }}</a>
                    </div>
                </div>
                <div class="pmd-owner-empty">{{ $pmdSettingsText('The native device will pair once to one table and will not store a staff password. Secure device pairing and the payment SDK bridge come after this web surface is approved.') }}</div>
            </div>
        </div>
    </section>

    <section class="pmd-owner-section" id="cash-drawers">
        <div class="pmd-owner-card" data-accent="emerald">
            <div class="pmd-owner-card__header">
                <div class="pmd-owner-card__icon">
                    <svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="12" rx="2"></rect><path d="M3 11h18M8 15h.01"></path></svg>
                </div>
                <div class="pmd-owner-card__title"><h2>{{ $pmdSettingsText('Cash drawers') }}</h2><p>{{ $pmdSettingsText('Drawer connections, local POS mapping and automatic cash opening.') }}</p></div>
                <div class="pmd-owner-card__actions"><button type="button" class="pmd-owner-action pmd-device-v6-header-add" data-pmd-device-open="drawers:create">{{ $pmdSettingsText('+ Add drawer') }}</button></div>
            </div>
            <div class="pmd-owner-card__body">
                <div class="pmd-owner-list">
                    @forelse($drawers as $drawer)
                        <div class="pmd-owner-list-row">
                            <div><strong>{{ $drawer->name ?: 'Cash drawer' }}</strong><small>{{ $drawer->description ?: ($drawer->connection_type ?: 'Hardware connection') }}</small></div>
                            <div class="pmd-owner-meta">{{ $drawer->connection_type ?: 'Not assigned' }}</div>
                            <div class="pmd-owner-status {{ !empty($drawer->status) ? 'is-active' : '' }}">{{ $pmdSettingsText(!empty($drawer->status) ? 'Enabled' : 'Disabled') }}</div>
                            <button type="button" class="pmd-owner-action" data-pmd-device-open="drawers:edit:{{ $drawer->drawer_id }}">{{ $pmdSettingsText('Edit') }}</button>
                        </div>
                    @empty
                        <div class="pmd-owner-empty">{{ $pmdSettingsText('No cash drawers are configured yet.') }}</div>
                    @endforelse
                </div>
            </div>
        </div>
    </section>

    <section class="pmd-owner-section" id="biometric">
        <div class="pmd-owner-card" data-accent="rose">
            <div class="pmd-owner-card__header">
                <div class="pmd-owner-card__icon">
                    <svg viewBox="0 0 24 24"><path d="M12 11a3 3 0 1 0-3-3"></path><path d="M6.5 15.5C5.5 17 5 18.8 5 21M18.5 15.5c1 1.5 1.5 3.3 1.5 5.5M8 14c2.5-2 5.5-2 8 0M9.5 17c1.7-1.1 3.3-1.1 5 0M12 19v2"></path></svg>
                </div>
                <div class="pmd-owner-card__title"><h2>{{ $pmdSettingsText('Biometric devices') }}</h2><p>{{ $pmdSettingsText('Fingerprint attendance and staff authentication hardware.') }}</p></div>
                <div class="pmd-owner-card__actions"><button type="button" class="pmd-owner-action pmd-device-v6-header-add" data-pmd-device-open="biometric:create">{{ $pmdSettingsText('+ Add device') }}</button></div>
            </div>
            <div class="pmd-owner-card__body">
                <div class="pmd-owner-list">
                    @forelse($biometric as $device)
                        <div class="pmd-owner-list-row">
                            <div><strong>{{ $device->name ?: 'Biometric device' }}</strong><small>{{ $device->description ?: ($device->ip ? $device->ip.':'.($device->port ?: 4370) : 'Fingerprint device') }}</small></div>
                            <div class="pmd-owner-meta">{{ $device->serial_number ?: 'No serial' }}</div>
                            <div class="pmd-owner-status {{ !empty($device->status) ? 'is-active' : '' }}">{{ $pmdSettingsText(!empty($device->status) ? 'Enabled' : 'Disabled') }}</div>
                            <button type="button" class="pmd-owner-action" data-pmd-device-open="biometric:edit:{{ $device->device_id }}">{{ $pmdSettingsText('Edit') }}</button>
                        </div>
                    @empty
                        <div class="pmd-owner-empty">{{ $pmdSettingsText('No biometric devices are configured yet.') }}</div>
                    @endforelse
                </div>
            </div>
        </div>
    </section>

    <section class="pmd-owner-section" id="device-configuration">
        <div class="pmd-owner-card" data-accent="slate">
            <div class="pmd-owner-card__header">
                <div class="pmd-owner-card__icon">
                    <svg viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"></path><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1V21h-4v-.09a1.7 1.7 0 0 0-1.1-1.51 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V3h4v.09A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.24.36.4.78.6 1 .26.14.65.2 1 .2h.09v4H21c-.35 0-.74.06-1 .2-.2.22-.36.64-.6 1Z"></path></svg>
                </div>
                <div class="pmd-owner-card__title"><h2>{{ $pmdSettingsText('Device configuration') }}</h2><p>{{ $pmdSettingsText('Advanced POS configuration stays with the existing POS configuration authority.') }}</p></div>
                <div class="pmd-owner-card__actions"><button type="button" class="pmd-owner-action pmd-device-v6-header-add" data-pmd-device-open="integrations:create">{{ $pmdSettingsText('+ Add integration') }}</button></div>
            </div>
            <div class="pmd-owner-card__body">
                <div class="pmd-owner-list">
                    @forelse($integrations as $integration)
                        <div class="pmd-owner-list-row">
                            <div><strong>{{ optional($integration->devices)->name ?: 'POS integration' }}</strong><small>{{ optional($integration->devices)->code ?: 'Provider configuration' }}</small></div>
                            <div class="pmd-owner-meta">{{ $integration->url ?: 'No API URL' }}</div>
                            <div class="pmd-owner-status is-active">{{ $pmdSettingsText('Configured') }}</div>
                            <button type="button" class="pmd-owner-action" data-pmd-device-open="integrations:edit:{{ $integration->config_id }}">{{ $pmdSettingsText('Edit') }}</button>
                        </div>
                    @empty
                        <div class="pmd-owner-empty">{{ $pmdSettingsText('No POS integrations are configured yet.') }}</div>
                    @endforelse
                </div>
            </div>
        </div>
    </section>
</div>

@include('pmddevices/_inline_modal_host')