<div
    class="dropdown d-flex aling-items-center"
    data-control="address-picker"
>
    <a
        class="btn btn-lg btn-block dropdown-toggle border text-truncate w-100"
        role="button"
        id="savedAddressPicker"
        data-bs-toggle="dropdown"
        aria-haspopup="true"
        aria-expanded="false"
    >
        <i data-address-picker-loading class="bi bi-geo-alt-fill"></i>&nbsp;&nbsp;
        <span class="pr-2">{{ $searchDefaultAddress->formatted_address }}</span>
        <span class="small text-primary">@lang('igniter.local::default.search.text_change')</span>
    </a>

    <div class="dropdown-menu w-100" aria-labelledby="savedAddressPicker">
        <h6 class="dropdown-header">@lang('igniter.local::default.search.text_saved_addresses')</h6>
        <a
            class="dropdown-item w-100"
            data-address-picker-control="new"
        ><i class="bi bi-plus-lg"></i>&nbsp;&nbsp;@lang('igniter.cart::default.checkout.text_address')</a>
        <div class="dropdown-divider"></div>
        @foreach ($__SELF__->getSavedAddresses() as $address)
            <a
                class="dropdown-item text-wrap py-2 {{ $searchDefaultAddress->address_id === $address->address_id ? 'active' : '' }}"
                data-address-picker-control="select"
                data-request="{{ $pickerEventHandler }}"
                data-request-data="addressId: '{{ $address->address_id }}'"
            >{{ $address->formatted_address }}</a>
        @endforeach
    </div>
</div>
