@if ($cart->count())
    <div class="{{ !$pageIsCheckout ? 'cart-items' : '' }}">
        @foreach ($cart->content()->reverse() as $cartItem)
        <div class="mt-0 d-block">
            <div class="position-relative">
                <div class="address-modal initgrid p-12-modal">
                    <div style="grid-area: 2 / 1;">
                        <div class="icon1">
                            <div class="icon11">
                                <button
                                    type="button"
                                    class="cart-btn btn text-muted"
                                    data-request="{{ $removeCartItemEventHandler }}"
                                    data-replace-loading="spinner-border spinner-border-sm text-danger"
                                    data-request-data="rowId: '{{ $cartItem->rowId }}', menuId: '{{ $cartItem->id }}'"
                                ><i class="poco-icon-times-circle"></i></button>
                            </div>                                    
                        </div>                            
                    </div>
                    <div style="grid-area: 2 / 2;" class="grid3">
                        <span class="fontsloto">
                            <div class="divspan">
                                <div class="divspan2">
                                    <span>
                                        <a
                                            class="name-item-cart"
                                            data-cart-control="load-item"
                                            data-row-id="{{ $cartItem->rowId }}"
                                            data-menu-id="{{ $cartItem->id }}"
                                        >
                                            <span class="name">
                                                @if ($cartItem->qty > 1)
                                                    <span class="quantity fw-bold">
                                                        {{ $cartItem->qty }} @lang('igniter.cart::default.text_times')
                                                    </span>
                                                @endif
                                                {{ $cartItem->name }}
                                            </span>
                                            @if ($cartItem->hasOptions())
                                                @partial('@cart_item_options', ['itemOptions' => $cartItem->options])
                                            @endif
                                            @if (!empty($cartItem->comment))
                                                <p class="comment text-muted small">
                                                    {{ $cartItem->comment }}
                                                </p>
                                            @endif
                                        </a>
                                        </span>
                                    </span>
                                </div>
                            </div></div>
                    <div style="grid-area: 2 / 3;" class="div-btn-ext me-3 fw-bold">
                        @if ($cartItem->hasConditions())
                        <s class="text-muted">{{currency_format($cartItem->subtotalWithoutConditions())}}</s>/
                    @endif
                    {{ currency_format($cartItem->subtotal) }}
                    </div>
                    <div style="grid-area: -1 / 2 / auto / -1;" class="sdivider">
                        <div class="ddivider">
                            <hr class="modal-divider">
                        </div>
                    </div>                  
                </div>
            </div>                    
        </div>
        @endforeach        
    </div>
@else
    <div class="text-center">
        <i class="poco-icon-order icon-cart"></i>
    </div>    
    <div class="panel-body text-center">@lang('igniter.cart::default.text_no_cart_items')</div>
@endif
