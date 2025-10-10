@if (count($customerAddresses))
    <div class="list-group list-group-flush">
        @foreach ($customerAddresses as $address)
            <div
                class="p-3 mb-3 rounded list-group-item {{ ($customer->address_id == $address->address_id) ? 'list-group-item-info' : '' }}"
            >
                <address class="text-left">{{ str_replace(', ,', ',', $address->formatted_address) }}</address>
                <span class="">
                    <a
                        class="btn btn-outline-primary"
                        href="{{ site_url('account/address', ['addressId' => $address->address_id]) }}"
                    >@lang('igniter.user::default.account.text_edit')</a>
                    <button
                        type="button"
                        class="btn text-danger pull-right"
                        data-request="accountAddressBook::onDelete"
                        data-request-data="addressId: '{{ $address->address_id }}'"
                    >@lang('igniter.user::default.account.text_delete')</button>
                    @if ($customer->address_id != $address->address_id)
                        <a
                            class="btn btn-outline-primary"
                            href="{{ site_url('account/address', ['addressId' => $address->address_id]) }}?setDefault=1"
                        >@lang('igniter.user::default.text_set_default')</a>
                    @endif
                </span>
            </div>
        @endforeach
    </div>

    <nav class="typical-pagination mb-5">
        @partial('pagination/default', ['paginator' => $customerAddresses])
    </nav>
    
@else
    <p>@lang('igniter.user::default.account.text_no_address')</p>
@endif

<div class="buttons pt-3">
    <button
        class="btn btn-primary btn-lg text-uppercase"
        data-request="{{ $addAddressEventHandler }}"
    >@lang('igniter.user::default.account.button_add')</button>
</div>
