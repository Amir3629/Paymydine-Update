@php
    $data = $pmdDevices ?? [];
    $pos = $data['pos'] ?? collect();
    $terminals = $data['terminals'] ?? collect();
    $drawers = $data['drawers'] ?? collect();
    $biometric = $data['biometric'] ?? collect();
    $kds = $data['kds'] ?? collect();
    $stats = $data['stats'] ?? ['pos'=>0,'terminals'=>0,'drawers'=>0,'kds'=>0,'biometric'=>0];
@endphp

<div id="pmd-devices-page" class="pmd-owner-page" data-pmd-owner-page>
    <header class="pmd-owner-header">
        <div class="pmd-owner-header__left">
            <a class="pmd-owner-header-button" href="{{ admin_url('pmdsettings') }}" aria-label="Back to Settings" title="Back to Settings">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
            </a>
            <h1>Devices & hardware</h1>
        </div>
        <div class="pmd-owner-header__actions" data-pmd-owner-header-actions>
            <span class="pmd-owner-notif-slot" data-pmd-owner-notif-slot></span>
        </div>
    </header>

    <section class="pmd-owner-section">
        <div class="pmd-owner-card" data-accent="cyan">
            <div class="pmd-owner-card__header">
                <div class="pmd-owner-card__icon">
                    <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"></rect><path d="M8 20h8M12 16v4"></path></svg>
                </div>
                <div class="pmd-owner-card__title">
                    <h2>Hardware overview</h2>
                    <p>One place to see every screen, terminal, drawer and authentication device connected to PayMyDine.</p>
                </div>
            </div>
            <div class="pmd-owner-card__body">
                <div class="pmd-owner-stats">
                    <div class="pmd-owner-stat"><span>POS devices</span><strong>{{ (int)$stats['pos'] }}</strong></div>
                    <div class="pmd-owner-stat"><span>Payment terminals</span><strong>{{ (int)$stats['terminals'] }}</strong></div>
                    <div class="pmd-owner-stat"><span>KDS stations</span><strong>{{ (int)$stats['kds'] }}</strong></div>
                    <div class="pmd-owner-stat"><span>Cash drawers</span><strong>{{ (int)$stats['drawers'] }}</strong></div>
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
                <div class="pmd-owner-card__title"><h2>POS devices</h2><p>Registers and local terminals that run PayMyDine POS.</p></div>
                <div class="pmd-owner-card__actions"><a class="pmd-owner-action" href="{{ admin_url('posdevices') }}">Manage POS devices</a></div>
            </div>
            <div class="pmd-owner-card__body">
                <div class="pmd-owner-list">
                    @forelse($pos as $device)
                        <div class="pmd-owner-list-row">
                            <div><strong>{{ $device->name ?: $device->code ?: 'POS device' }}</strong><small>{{ $device->description ?: ($device->device_type ?: 'PayMyDine terminal') }}</small></div>
                            <div class="pmd-owner-meta">{{ $device->device_type ?: 'POS' }}</div>
                            <div class="pmd-owner-status {{ method_exists($device, 'isOnline') && $device->isOnline() ? 'is-active' : '' }}">{{ method_exists($device, 'isOnline') && $device->isOnline() ? 'Online' : ($device->device_status ?: 'Configured') }}</div>
                            <a class="pmd-owner-action" href="{{ admin_url('posdevices') }}">Open</a>
                        </div>
                    @empty
                        <div class="pmd-owner-empty">No POS devices are configured yet.</div>
                    @endforelse
                </div>
            </div>
        </div>
    </section>

    <section class="pmd-owner-section" id="payment-terminals">
        <div class="pmd-owner-card" data-accent="blue">
            <div class="pmd-owner-card__header">
                <div class="pmd-owner-card__icon">
                    <svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2"></rect><path d="M8 6h8M8 10h2M12 10h2M16 10h.01M8 14h8"></path></svg>
                </div>
                <div class="pmd-owner-card__title"><h2>Payment terminals</h2><p>Card-present readers, pairing state and terminal readiness.</p></div>
                <div class="pmd-owner-card__actions"><a class="pmd-owner-action" href="{{ admin_url('terminal_devices') }}">Manage terminals</a></div>
            </div>
            <div class="pmd-owner-card__body">
                <div class="pmd-owner-list">
                    @forelse($terminals as $terminal)
                        <div class="pmd-owner-list-row">
                            <div><strong>{{ $terminal->reader_label ?: $terminal->reader_id ?: 'Payment terminal' }}</strong><small>{{ strtoupper((string)($terminal->provider_code ?: 'provider')) }}</small></div>
                            <div class="pmd-owner-meta">{{ $terminal->pairing_state ?: 'Unknown pairing' }}</div>
                            <div class="pmd-owner-status {{ !empty($terminal->is_active) ? 'is-active' : '' }}">{{ !empty($terminal->is_active) ? ($terminal->terminal_status ?: 'Active') : 'Inactive' }}</div>
                            <a class="pmd-owner-action" href="{{ admin_url('terminal_devices/edit/'.$terminal->terminal_device_id) }}">Edit</a>
                        </div>
                    @empty
                        <div class="pmd-owner-empty">No payment terminals are configured yet.</div>
                    @endforelse
                </div>
            </div>
        </div>
    </section>

    <section class="pmd-owner-section" id="kds">
        <div class="pmd-owner-card" data-accent="violet">
            <div class="pmd-owner-card__header">
                <div class="pmd-owner-card__icon">
                    <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"></rect><path d="M7 21h10M12 17v4"></path></svg>
                </div>
                <div class="pmd-owner-card__title"><h2>Kitchen display stations</h2><p>Kitchen, bar, grill, dessert and pass screens.</p></div>
                <div class="pmd-owner-card__actions"><a class="pmd-owner-action" href="{{ admin_url('kds_stations') }}">Manage KDS</a></div>
            </div>
            <div class="pmd-owner-card__body">
                <div class="pmd-owner-list">
                    @forelse($kds as $station)
                        <div class="pmd-owner-list-row">
                            <div><strong>{{ $station->name ?: 'KDS station' }}</strong><small>{{ $station->description ?: ucfirst((string)($station->station_type ?: 'kitchen')).' display' }}</small></div>
                            <div class="pmd-owner-meta">{{ ucfirst((string)($station->display_density ?: 'normal')) }}</div>
                            <div class="pmd-owner-status {{ !empty($station->is_active) ? 'is-active' : '' }}">{{ !empty($station->is_active) ? 'Active' : 'Inactive' }}</div>
                            <a class="pmd-owner-action" href="{{ admin_url('kds_stations/edit/'.$station->station_id) }}">Edit</a>
                        </div>
                    @empty
                        <div class="pmd-owner-empty">No KDS stations are configured yet.</div>
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
                <div class="pmd-owner-card__title"><h2>Cash drawers</h2><p>Drawer connections, local POS mapping and automatic cash opening.</p></div>
                <div class="pmd-owner-card__actions"><a class="pmd-owner-action" href="{{ admin_url('cash_drawers') }}">Manage drawers</a></div>
            </div>
            <div class="pmd-owner-card__body">
                <div class="pmd-owner-list">
                    @forelse($drawers as $drawer)
                        <div class="pmd-owner-list-row">
                            <div><strong>{{ $drawer->name ?: 'Cash drawer' }}</strong><small>{{ $drawer->description ?: ($drawer->connection_type ?: 'Hardware connection') }}</small></div>
                            <div class="pmd-owner-meta">{{ $drawer->connection_type ?: 'Not assigned' }}</div>
                            <div class="pmd-owner-status {{ !empty($drawer->status) ? 'is-active' : '' }}">{{ !empty($drawer->status) ? 'Enabled' : 'Disabled' }}</div>
                            <a class="pmd-owner-action" href="{{ admin_url('cash_drawers/edit/'.$drawer->drawer_id) }}">Edit</a>
                        </div>
                    @empty
                        <div class="pmd-owner-empty">No cash drawers are configured yet.</div>
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
                <div class="pmd-owner-card__title"><h2>Biometric devices</h2><p>Fingerprint attendance and staff authentication hardware.</p></div>
                <div class="pmd-owner-card__actions"><a class="pmd-owner-action" href="{{ admin_url('biometric_devices?tab=management') }}">Manage biometric</a></div>
            </div>
            <div class="pmd-owner-card__body">
                <div class="pmd-owner-list">
                    @forelse($biometric as $device)
                        <div class="pmd-owner-list-row">
                            <div><strong>{{ $device->name ?: 'Biometric device' }}</strong><small>{{ $device->description ?: ($device->ip ? $device->ip.':'.($device->port ?: 4370) : 'Fingerprint device') }}</small></div>
                            <div class="pmd-owner-meta">{{ $device->serial_number ?: 'No serial' }}</div>
                            <div class="pmd-owner-status {{ !empty($device->status) ? 'is-active' : '' }}">{{ !empty($device->status) ? 'Enabled' : 'Disabled' }}</div>
                            <a class="pmd-owner-action" href="{{ admin_url('biometric_devices/edit/'.$device->device_id) }}">Edit</a>
                        </div>
                    @empty
                        <div class="pmd-owner-empty">No biometric devices are configured yet.</div>
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
                <div class="pmd-owner-card__title"><h2>Device configuration</h2><p>Advanced POS configuration stays with the existing POS configuration authority.</p></div>
                <div class="pmd-owner-card__actions"><a class="pmd-owner-action" href="{{ admin_url('pos_configs') }}">POS configuration</a></div>
            </div>
        </div>
    </section>
</div>
