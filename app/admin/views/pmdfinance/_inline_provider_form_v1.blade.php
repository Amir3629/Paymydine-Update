@php
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_1
    $pmdSettingsText = $pmdSettingsText ?? static function ($value) {
        return \Admin\Classes\PmdPlatformI18n::fromEnglish((string)$value, 'settings.');
    };
@endphp

@php
    $provider = $provider ?? null;
    $providerFields = $providerFields ?? [];
    $secretFields = $secretFields ?? [];
    $code = (string)($provider->code ?? '');
    $fields = $providerFields[$code] ?? [];
    $secrets = $secretFields[$code] ?? [];
    $config = $provider ? $provider->getConfigData() : [];
    // PMD_VR_FINANCE_TERMINAL_AUTHORITY_R5_20260905
    $vrTerminalInventory = $code === 'vr_payment'
        ? (array)($pmdFinance['vr_terminal_inventory'] ?? [])
        : [];
@endphp
<form class="pmd-inline-form" data-pmd-inline-form data-pmd-inline-title="{{ $pmdSettingsText('Edit provider') }}: {{ $provider->name ?: ucfirst(str_replace('_',' ',$code)) }}" data-pmd-backend-url="{{ admin_url('payments/edit/'.$code.'?mode=providers') }}" data-pmd-save-handler="onSave" data-pmd-refresh-selectors="#payment-methods">
    <input type="hidden" name="_token" value="{{ csrf_token() }}">
    <input type="hidden" name="form_context" value="edit">
    <input type="hidden" name="Payment[code]" value="{{ $code }}">
    <input type="hidden" name="Payment[name]" value="{{ $provider->name }}">

    <section class="pmd-inline-section">
        <div class="pmd-inline-section__head"><h3>{{ $pmdSettingsText('Provider connection') }}</h3><p>{{ $pmdSettingsText('Credentials save through the existing Payments provider logic. Stored secrets are never printed into this modal.') }}</p></div>
        <div class="pmd-inline-setting-row"><div class="pmd-inline-setting-copy"><strong>{{ $pmdSettingsText('Provider enabled') }}</strong><small>{{ $pmdSettingsText('Disable to keep the configuration saved without offering this provider.') }}</small></div><label class="pmd-inline-switch"><input type="hidden" name="Payment[status]" value="0"><input type="checkbox" name="Payment[status]" value="1" {{ !empty($provider->status) ? 'checked' : '' }}><span></span></label></div>
        <div class="pmd-inline-grid">
            @foreach($fields as $name=>$field)
                @php
                    $type = $field['type'] ?? 'text';
                    $readonly = !empty($field['readonly']);
                    $secret = !empty($field['secret']) || in_array((string)$name, $secrets, true);
                    $value = $config[$name] ?? ($field['default'] ?? '');
                @endphp
                <div class="pmd-inline-field {{ count($fields) === 1 ? 'pmd-inline-field--full' : '' }}">
                    <label>{{ $pmdSettingsText($field['label'] ?? ucwords(str_replace('_',' ',(string)$name))) }}</label>
                    @if($type === 'select')
                        <select name="Payment[{{ $name }}]" {{ $readonly ? 'disabled' : '' }}>@foreach(($field['options'] ?? []) as $optionValue=>$optionLabel)<option value="{{ $optionValue }}" {{ (string)$value === (string)$optionValue ? 'selected' : '' }}>{{ $pmdSettingsText($optionLabel) }}</option>@endforeach</select>
                    @elseif($readonly)
                        <input type="text" value="{{ $value }}" readonly>
                    @elseif($secret)
                        <input type="password" name="Payment[{{ $name }}]" value="" autocomplete="new-password" placeholder="{{ $pmdSettingsText(array_key_exists($name,$config) && trim((string)$config[$name]) !== '' ? 'Stored — leave blank to keep' : 'Enter credential') }}" data-pmd-omit-empty>
                    @else
                        <input type="text" name="Payment[{{ $name }}]" value="{{ $value }}">
                    @endif
                    @if(!empty($field['help']))<small>{{ $pmdSettingsText($field['help']) }}</small>@endif
                </div>
            @endforeach
        </div>
        <div class="pmd-inline-note">Credentials are sent only to the existing <strong>Payments</strong> backend. Blank secret fields keep the current stored secret.</div>
        @if($code === 'vr_payment')
            {{-- PMD_VR_FINANCE_TERMINAL_AUTHORITY_R5_20260905 --}}
            <div class="pmd-inline-note" style="margin-top:12px">
                <strong>VR Terminal management</strong><br>
                {-- PMD_VR_PAYMENT_SAFETY_R6_20260905 --}
                <div style="margin:8px 0 10px;padding:9px 11px;border:1px solid #f0c7c7;border-radius:9px;background:#fff6f6;color:#8b1d1d">
                    <strong>Safety:</strong> PMD VR Simulators are diagnostics only. They never charge, never settle the order, and never create a paid invoice. Only a final VR provider transaction may settle a real order.
                </div>
                Provider terminal records: <strong>{{ (int)($vrTerminalInventory['provider_rows'] ?? 0) }}</strong>
                · Usable real terminals: <strong>{{ (int)($vrTerminalInventory['usable_real'] ?? 0) }}</strong>
                · PMD test simulators: <strong>{{ (int)($vrTerminalInventory['simulators'] ?? 0) }}</strong>
                <br><small>VR terminal inventory is managed here. Provider terminals are synchronized from VR Payment; PMD simulators are TEST-only and never call the VR network.</small>

                @if(!empty($vrTerminalInventory['rows']))
                    <div style="margin-top:10px;display:grid;gap:8px">
                        @foreach((array)$vrTerminalInventory['rows'] as $terminal)
                            <div style="border:1px solid #dce7ea;border-radius:10px;padding:9px 11px;display:flex;justify-content:space-between;gap:12px;align-items:center">
                                <div>
                                    <strong>{{ $terminal['name'] ?? ($terminal['reader_id'] ?? 'VR terminal') }}</strong><br>
                                    <small>
                                        {{ !empty($terminal['simulator']) ? 'PMD simulator' : 'VR provider terminal' }}
                                        · {{ $terminal['reader_id'] ?? '—' }}
                                        @if(!empty($terminal['provider_terminal_id'])) · API #{{ $terminal['provider_terminal_id'] }} @endif
                                    </small>
                                </div>
                                <div style="text-align:right">
                                    <strong>{{ !empty($terminal['active']) ? 'Ready in PMD' : 'Not selectable' }}</strong><br>
                                    <small>{{ $terminal['status'] ?? 'unknown' }} · {{ $terminal['pairing_state'] ?? 'unknown' }}</small>
                                </div>
                            </div>
                        @endforeach
                    </div>
                @endif

                <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
                    <button type="button" class="pmd-settings-inline-action" data-pmd-inline-action="onTestProviderConnection">Refresh / sync VR inventory</button>
                    <button type="button" class="pmd-settings-inline-action" data-pmd-inline-action="onTestVrTerminalCapability">Test Cloud Till capability</button>
                </div>
                <small style="display:block;margin-top:8px">Cloud Till capability test creates one €0.10 TEST transaction in VR, but sends no perform-transaction command and charges nothing.</small>
            </div>

            {{-- PMD_VR_PROVIDER_RUNTIME_GUIDE_R1_4_2 --}}
            <div class="pmd-inline-note" style="margin-top:12px">
                <strong>{{ $pmdSettingsText('VR Payment runtime guide') }}</strong><br>
                {{ $pmdSettingsText('Guest checkout: Frontend V2 requests') }} <strong>Lightbox</strong>{{ $pmdSettingsText('. Hosted Payment Page is only the safe fallback when VR Payment does not expose a usable Lightbox configuration for the selected transaction/method.') }}<br><br>
                {{ $pmdSettingsText('Terminal test: open VR Payment') }} <strong>Space → Payment → Terminals</strong>{{ $pmdSettingsText(', provision/link a real or provider-issued test terminal, then run') }} <strong>{{ $pmdSettingsText('Test saved connection') }}</strong> {{ $pmdSettingsText('here. PayMyDine will not offer a terminal payment test until') }} <code>terminal_count ≥ 1</code>.<br><br>
                {{ $pmdSettingsText('Apple Pay / Google Pay: disabled means the current VR Space did not expose that wallet. Configure/activate the wallet with VR Payment first, then run') }} <strong>{{ $pmdSettingsText('Test saved connection') }}</strong>{{ $pmdSettingsText('. PayMyDine intentionally does not fake-enable unavailable wallets.') }}
            </div>
        @endif
        @if($code !== 'vr_payment')
            <div style="margin-top:12px"><button type="button" class="pmd-settings-inline-action" data-pmd-inline-action="onTestProviderConnection">{{ $pmdSettingsText('Test saved connection') }}</button></div>
        @endif
        <pre class="pmd-inline-result" data-pmd-inline-result hidden></pre>
    </section>
</form>
