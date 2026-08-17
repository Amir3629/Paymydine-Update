@php
    $methodProviders = $data['method_providers'] ?? [];
    $providerFields = $data['provider_fields'] ?? [];
    $providerSecretFields = $data['provider_secret_fields'] ?? [];
@endphp
<div id="pmd-finance-inline-templates" data-pmd-inline-templates hidden>
    @foreach($methods as $method)
        <template data-pmd-inline-template="finance:method:{{ $method->code }}">
            @include('admin::pmdfinance._inline_payment_form_v1', ['method'=>$method,'methodProviders'=>$methodProviders])
        </template>
    @endforeach
    @foreach($providers as $provider)
        <template data-pmd-inline-template="finance:provider:{{ $provider->code }}">
            @include('admin::pmdfinance._inline_provider_form_v1', ['provider'=>$provider,'providerFields'=>$providerFields,'secretFields'=>$providerSecretFields])
        </template>
    @endforeach
</div>
