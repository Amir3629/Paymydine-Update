@php
    $method = $method ?? null;
    $methodProviders = $methodProviders ?? [];
    $code = (string)($method->code ?? '');
    $providersForMethod = $methodProviders[$code] ?? [];
    $providerCode = (string)($method->provider_code ?? '');
    $providerRequired = !in_array($code, ['cod', 'cash'], true);
@endphp
<form class="pmd-inline-form" data-pmd-inline-form data-pmd-inline-title="Edit payment method" data-pmd-backend-url="{{ admin_url('payments/edit/'.$code.'?mode=methods') }}" data-pmd-save-handler="onSave" data-pmd-refresh-selectors="#payment-methods">
    <input type="hidden" name="_token" value="{{ csrf_token() }}">
    <input type="hidden" name="form_context" value="edit">
    <input type="hidden" name="Payment[code]" value="{{ $code }}">
    <input type="hidden" name="Payment[priority]" value="{{ $method->priority ?? 10 }}">
    <input type="hidden" name="Payment[description]" value="{{ $method->description }}">
    <input type="hidden" name="Payment[status]" value="{{ !empty($method->status) ? 1 : 0 }}">
    <input type="hidden" name="Payment[is_default]" value="{{ !empty($method->is_default) ? 1 : 0 }}">

    <section class="pmd-inline-section pmd-inline-section--payment-method-compact">
        <div class="pmd-inline-grid">
            <div class="pmd-inline-field pmd-inline-field--full">
                <label>Name</label>
                <input type="text" name="Payment[name]" value="{{ $method->name }}" readonly required maxlength="128">
            </div>

            @if($providerRequired)
                <div class="pmd-inline-field pmd-inline-field--full">
                    <label>Provider</label>
                    <select name="Payment[provider_code]">
                        <option value="">Not offered</option>
                        @foreach($providersForMethod as $value=>$label)
                            <option value="{{ $value }}" {{ $providerCode === (string)$value ? 'selected' : '' }}>{{ $label }}</option>
                        @endforeach
                    </select>
                    @if(!count($providersForMethod))
                        <small>Connect or enable a compatible provider first.</small>
                    @endif
                </div>
            @else
                <div class="pmd-inline-field pmd-inline-field--full">
                    <label>Provider</label>
                    <input type="text" value="No provider required" readonly>
                    <input type="hidden" name="Payment[provider_code]" value="">
                </div>
            @endif
        </div>
    </section>
</form>
