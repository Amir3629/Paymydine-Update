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
    $stats = $data['stats'] ?? ['pos'=>0,'terminals'=>0,'drawers'=>0,'kds'=>0,'biometric'=>0];
    $stats['terminals'] = $terminals->count();
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
