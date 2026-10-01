@php
    // PMD_TABLE_DISPLAY_V1
    $data = $pmdTableDisplay ?? [];
    $tables = collect($data['tables'] ?? []);
    $selected = (array)($data['selected'] ?? []);
    $selectedId = (int)($data['selected_table_id'] ?? 0);
    $restaurant = (array)($data['restaurant'] ?? []);
    $stateUrl = (string)($data['state_url'] ?? admin_url('pmddevices/tabledisplaystate'));
    $pmdSettingsText = $pmdSettingsText ?? static function ($value) {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish((string)$value, 'settings.');
    };
@endphp

<div
    id="pmd-table-display-admin"
    class="pmd-owner-page pmd-table-display-admin"
    data-pmd-table-display-v1
    data-state-url="{{ e($stateUrl) }}"
    data-setup-code-url="{{ e(url('/admin/table-display/setup-code')) }}"
>
    <header class="pmd-owner-header pmd-table-display-admin__header">
        <div class="pmd-owner-header__left">
            <a class="pmd-owner-header-button" href="{{ admin_url('pmddevices') }}#table-displays" aria-label="{{ $pmdSettingsText('Back to Devices & hardware') }}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
            </a>
            <div>
                <h1>{{ $pmdSettingsText('Table display') }}</h1>
                <p>{{ $pmdSettingsText('Preview the small guest-facing screen before installing the Android app on the physical device.') }}</p>
            </div>
        </div>
        <div class="pmd-owner-header__actions">
            <span class="pmd-owner-status is-active">{{ $pmdSettingsText('Web preview') }}</span>
        </div>
    </header>

    @if($tables->isEmpty())
        <section class="pmd-owner-section">
            <div class="pmd-owner-card" data-accent="emerald">
                <div class="pmd-owner-card__body">
                    <div class="pmd-owner-empty">{{ $pmdSettingsText('Create at least one restaurant table before previewing a Table Display.') }}</div>
                </div>
            </div>
        </section>
    @else
        <main class="pmd-table-display-admin__grid">
            <section class="pmd-table-display-controls">
                <div class="pmd-owner-card" data-accent="emerald">
                    <div class="pmd-owner-card__header">
                        <div class="pmd-owner-card__icon">
                            <svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="3"></rect><path d="M9 7h6M9 17h6"></path></svg>
                        </div>
                        <div class="pmd-owner-card__title">
                            <h2>{{ $pmdSettingsText('Table Companion') }}</h2>
                            <p>{{ $pmdSettingsText('No menu on this screen. It shows the table QR code and reacts to restaurant events.') }}</p>
                        </div>
                    </div>
                    <div class="pmd-owner-card__body">
                        <label class="pmd-table-display-field">
                            <span>{{ $pmdSettingsText('Preview table') }}</span>
                            <select data-pmd-table-display-table>
                                @foreach($tables as $table)
                                    <option value="{{ (int)($table['id'] ?? 0) }}" {{ (int)($table['id'] ?? 0) === $selectedId ? 'selected' : '' }}>
                                        {{ e($table['name'] ?? ('Table '.($table['number'] ?? ''))) }}
                                        @if(!empty($table['floor'])) — {{ e($table['floor']) }} @endif
                                        @if(empty($table['enabled'])) — {{ $pmdSettingsText('Disabled') }} @endif
                                    </option>
                                @endforeach
                            </select>
                        </label>

                        <div class="pmd-table-display-live-row">
                            <div>
                                <strong>{{ $pmdSettingsText('Live reactions') }}</strong>
                                <small>{{ $pmdSettingsText('The preview watches the selected table for new orders, waiter calls and successful payments.') }}</small>
                            </div>
                            <span class="pmd-table-display-live-pill" data-pmd-table-display-live-status><i></i>{{ $pmdSettingsText('Connecting') }}</span>
                        </div>

                        <div class="pmd-table-display-simulations">
                            <span class="pmd-table-display-section-label">{{ $pmdSettingsText('Preview reactions') }}</span>
                            <div class="pmd-table-display-sim-grid">
                                <button type="button" data-pmd-table-display-sim="idle">{{ $pmdSettingsText('QR / idle') }}</button>
                                <button type="button" data-pmd-table-display-sim="order_received">{{ $pmdSettingsText('Order received') }}</button>
                                <button type="button" data-pmd-table-display-sim="waiter_call">{{ $pmdSettingsText('Waiter called') }}</button>
                                <button type="button" data-pmd-table-display-sim="payment_requested">{{ $pmdSettingsText('Card payment') }}</button>
                                <button type="button" data-pmd-table-display-sim="payment_success">{{ $pmdSettingsText('Payment approved') }}</button>
                            </div>
                        </div>

                        <div class="pmd-table-display-contract">
                            <strong>{{ $pmdSettingsText('Native app contract') }}</strong>
                            <ul>
                                <li>{{ $pmdSettingsText('The Android device pairs once to one restaurant table; no waiter/customer password is stored on it.') }}</li>
                                <li>{{ $pmdSettingsText('The QR opens the existing PayMyDine Digital Menu for that exact table.') }}</li>
                                <li>{{ $pmdSettingsText('Orders, waiter calls and payments stay owned by the existing PayMyDine authorities.') }}</li>
                                <li>{{ $pmdSettingsText('Card success appears only after provider-confirmed settlement.') }}</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="pmd-owner-card" data-accent="emerald">
                    <div class="pmd-owner-card__header">
                        <div class="pmd-owner-card__icon">
                            <svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="3"></rect><path d="M9 7h6M8 12h8M10 17h4"></path></svg>
                        </div>
                        <div class="pmd-owner-card__title">
                            <h2>{{ $pmdSettingsText('Android app pairing') }}</h2>
                            <p>{{ $pmdSettingsText('No staff password is stored on the table device. Generate a one-time code, enter it once in the app, then choose the table on the device.') }}</p>
                        </div>
                    </div>
                    <div class="pmd-owner-card__body">
                        <div class="pmd-table-display-pairing">
                            <button type="button" class="pmd-owner-action" data-pmd-table-display-pair>{{ $pmdSettingsText('Generate 6-digit setup code') }}</button>
                            <div class="pmd-table-display-pair-code" data-pmd-table-display-setup-code hidden>
                                <span>{{ $pmdSettingsText('Setup code') }}</span>
                                <strong data-pmd-table-display-setup-code-value>------</strong>
                                <small data-pmd-table-display-setup-code-expiry></small>
                            </div>
                            <p data-pmd-table-display-setup-error hidden></p>
                        </div>
                    </div>
                </div>

                <div class="pmd-owner-card" data-accent="blue">
                    <div class="pmd-owner-card__header">
                        <div class="pmd-owner-card__icon">
                            <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"></rect><path d="M3 9h18M7 14h4"></path></svg>
                        </div>
                        <div class="pmd-owner-card__title">
                            <h2>{{ $pmdSettingsText('Waiter card handoff') }}</h2>
                            <p>{{ $pmdSettingsText('Waiter POS can request card payment on this table display. The physical provider bridge comes next.') }}</p>
                        </div>
                    </div>
                    <div class="pmd-owner-card__body">
                        <div class="pmd-table-display-payment-flow">
                            <span>Waiter POS</span><i>→</i><span>Table Display</span><i>→</i><span>Payment Provider</span><i>→</i><span>Paid Order</span>
                        </div>
                    </div>
                </div>
            </section>

            <section class="pmd-table-display-preview-column">
                <div class="pmd-table-display-device-shell">
                    <div class="pmd-table-display-device-camera"></div>
                    <div class="pmd-table-display-screen">
                        <div class="pmd-table-display-idle" data-pmd-table-display-idle>
                            <div class="pmd-table-display-topbar">
                                <div class="pmd-table-display-brand">
                                    <img data-pmd-table-display-logo src="{{ e($restaurant['logo'] ?? '/brand/paymydine-logo.svg') }}" alt="">
                                    <span data-pmd-table-display-restaurant>{{ e($restaurant['name'] ?? 'PayMyDine') }}</span>
                                </div>
                                <div class="pmd-table-display-table-label" data-pmd-table-display-table-label>
                                    TABLE {{ e(data_get($selected, 'table.number', '')) }}
                                </div>
                            </div>

                            <div class="pmd-table-display-qr-wrap">
                                <img data-pmd-table-display-qr src="{{ e(data_get($selected, 'table.qr_image_url', '')) }}" alt="Table order QR code">
                                <span class="pmd-table-display-qr-logo" aria-hidden="true">
                                    <img src="/brand/paymydine-logo.svg" alt="">
                                </span>
                            </div>

                            <div class="pmd-table-display-message" data-pmd-table-display-message>
                                <span class="pmd-table-display-message__icon" data-pmd-table-display-message-icon hidden>✓</span>
                                <div class="pmd-table-display-message__copy">
                                    <h2 data-pmd-table-display-message-title>{{ $pmdSettingsText('Scan to order') }}</h2>
                                    <p data-pmd-table-display-message-subtitle hidden></p>
                                </div>
                                <strong class="pmd-table-display-message__amount" data-pmd-table-display-message-amount hidden></strong>
                            </div>

                            <small class="pmd-table-display-powered">Powered by PayMyDine</small>
                        </div>
                    </div>
                    <div class="pmd-table-display-device-footer">
                        <span data-pmd-table-display-device-state>{{ $pmdSettingsText('Live preview') }}</span>
                        <span data-pmd-table-display-last-sync>—</span>
                    </div>
                </div>
                <div class="pmd-table-display-preview-note">
                    {{ $pmdSettingsText('The native app will hide Android navigation/status UI and open this surface automatically after boot.') }}
                </div>
            </section>
        </main>
    @endif
</div>

<script>
window.PMD_TABLE_DISPLAY_BOOT = @json($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
</script>
