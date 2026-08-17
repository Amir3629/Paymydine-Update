@php
    $method = $method ?? null;
    $methodProviders = $methodProviders ?? [];
    $code = (string)($method->code ?? '');
    $providersForMethod = $methodProviders[$code] ?? [];
    $providerCode = (string)($method->provider_code ?? '');
@endphp
<form class="pmd-inline-form" data-pmd-inline-form data-pmd-inline-title="Edit payment method" data-pmd-backend-url="{{ admin_url('payments/edit/'.$code.'?mode=methods') }}" data-pmd-save-handler="onSave" data-pmd-refresh-selectors="#payment-methods">
    <input type="hidden" name="_token" value="{{ csrf_token() }}">
    <input type="hidden" name="form_context" value="edit">
    <input type="hidden" name="Payment[code]" value="{{ $code }}">

    <section class="pmd-inline-section">
        <div class="pmd-inline-section__head"><h3>Method details</h3><p>The existing Payments controller remains the save and validation authority.</p></div>
        <div class="pmd-inline-grid">
            <div class="pmd-inline-field"><label>Name</label><input type="text" name="Payment[name]" value="{{ $method->name }}" required maxlength="128"></div>
            <div class="pmd-inline-field"><label>Code</label><input type="text" value="{{ $code }}" readonly></div>
            <div class="pmd-inline-field"><label>Priority</label><input type="number" name="Payment[priority]" value="{{ $method->priority ?? 10 }}" required></div>
            @if(count($providersForMethod))
                <div class="pmd-inline-field"><label>Provider</label><select name="Payment[provider_code]" required><option value="">Choose provider</option>@foreach($providersForMethod as $value=>$label)<option value="{{ $value }}" {{ $providerCode === (string)$value ? 'selected' : '' }}>{{ $label }}</option>@endforeach</select></div>
            @else
                <input type="hidden" name="Payment[provider_code]" value="">
            @endif
            <div class="pmd-inline-field pmd-inline-field--full"><label>Description</label><textarea name="Payment[description]" maxlength="255">{{ $method->description }}</textarea></div>
        </div>
        <div class="pmd-inline-setting-row"><div class="pmd-inline-setting-copy"><strong>Enabled</strong><small>Disabled methods stay configured but are not offered to guests.</small></div><label class="pmd-inline-switch"><input type="hidden" name="Payment[status]" value="0"><input type="checkbox" name="Payment[status]" value="1" {{ !empty($method->status) ? 'checked' : '' }}><span></span></label></div>
        <div class="pmd-inline-setting-row"><div class="pmd-inline-setting-copy"><strong>Default method</strong><small>Marks this method as the default choice where the payment flow supports it.</small></div><label class="pmd-inline-switch"><input type="hidden" name="Payment[is_default]" value="0"><input type="checkbox" name="Payment[is_default]" value="1" {{ !empty($method->is_default) ? 'checked' : '' }}><span></span></label></div>
    </section>
</form>
