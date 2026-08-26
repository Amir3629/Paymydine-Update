@php
    $provider = $provider ?? null;
    $providerFields = $providerFields ?? [];
    $secretFields = $secretFields ?? [];
    $code = (string)($provider->code ?? '');
    $fields = $providerFields[$code] ?? [];
    $secrets = $secretFields[$code] ?? [];
    $config = $provider ? $provider->getConfigData() : [];
@endphp
<form class="pmd-inline-form" data-pmd-inline-form data-pmd-inline-title="Edit {{ $provider->name ?: ucfirst(str_replace('_',' ',$code)) }} provider" data-pmd-backend-url="{{ admin_url('payments/edit/'.$code.'?mode=providers') }}" data-pmd-save-handler="onSave" data-pmd-refresh-selectors="#payment-methods">
    <input type="hidden" name="_token" value="{{ csrf_token() }}">
    <input type="hidden" name="form_context" value="edit">
    <input type="hidden" name="Payment[code]" value="{{ $code }}">
    <input type="hidden" name="Payment[name]" value="{{ $provider->name }}">

    <section class="pmd-inline-section">
        <div class="pmd-inline-section__head"><h3>Provider connection</h3><p>Credentials save through the existing Payments provider logic. Stored secrets are never printed into this modal.</p></div>
        <div class="pmd-inline-setting-row"><div class="pmd-inline-setting-copy"><strong>Provider enabled</strong><small>Disable to keep the configuration saved without offering this provider.</small></div><label class="pmd-inline-switch"><input type="hidden" name="Payment[status]" value="0"><input type="checkbox" name="Payment[status]" value="1" {{ !empty($provider->status) ? 'checked' : '' }}><span></span></label></div>
        <div class="pmd-inline-grid">
            @foreach($fields as $name=>$field)
                @php
                    $type = $field['type'] ?? 'text';
                    $readonly = !empty($field['readonly']);
                    $secret = !empty($field['secret']) || in_array((string)$name, $secrets, true);
                    $value = $config[$name] ?? ($field['default'] ?? '');
                @endphp
                <div class="pmd-inline-field {{ count($fields) === 1 ? 'pmd-inline-field--full' : '' }}">
                    <label>{{ $field['label'] ?? ucwords(str_replace('_',' ',(string)$name)) }}</label>
                    @if($type === 'select')
                        <select name="Payment[{{ $name }}]" {{ $readonly ? 'disabled' : '' }}>@foreach(($field['options'] ?? []) as $optionValue=>$optionLabel)<option value="{{ $optionValue }}" {{ (string)$value === (string)$optionValue ? 'selected' : '' }}>{{ $optionLabel }}</option>@endforeach</select>
                    @elseif($readonly)
                        <input type="text" value="{{ $value }}" readonly>
                    @elseif($secret)
                        <input type="password" name="Payment[{{ $name }}]" value="" autocomplete="new-password" placeholder="{{ array_key_exists($name,$config) && trim((string)$config[$name]) !== '' ? 'Stored — leave blank to keep' : 'Enter credential' }}" data-pmd-omit-empty>
                    @else
                        <input type="text" name="Payment[{{ $name }}]" value="{{ $value }}">
                    @endif
                    @if(!empty($field['help']))<small>{{ $field['help'] }}</small>@endif
                </div>
            @endforeach
        </div>
        <div class="pmd-inline-note">Credentials are sent only to the existing <strong>Payments</strong> backend. Blank secret fields keep the current stored secret.</div>
        @if($code === 'vr_payment')
            {{-- PMD_VR_PROVIDER_RUNTIME_GUIDE_R1_4_2 --}}
            <div class="pmd-inline-note" style="margin-top:12px">
                <strong>VR Payment runtime guide</strong><br>
                Guest checkout: Frontend V2 requests <strong>Lightbox</strong>. Hosted Payment Page is only the safe fallback when VR Payment does not expose a usable Lightbox configuration for the selected transaction/method.<br><br>
                Terminal test: open VR Payment <strong>Space → Payment → Terminals</strong>, provision/link a real or provider-issued test terminal, then run <strong>Test saved connection</strong> here. PayMyDine will not offer a terminal payment test until <code>terminal_count ≥ 1</code>.<br><br>
                Apple Pay / Google Pay: disabled means the current VR Space did not expose that wallet. Configure/activate the wallet with VR Payment first, then run <strong>Test saved connection</strong>. PayMyDine intentionally does not fake-enable unavailable wallets.
            </div>
        @endif
        <div style="margin-top:12px"><button type="button" class="pmd-settings-inline-action" data-pmd-inline-action="onTestProviderConnection">Test saved connection</button></div>
        <pre class="pmd-inline-result" data-pmd-inline-result hidden></pre>
    </section>
</form>
