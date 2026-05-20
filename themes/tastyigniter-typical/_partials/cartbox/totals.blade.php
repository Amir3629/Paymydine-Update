@if ($cart->count())
    <div class="cart-total">
        <div class="table-responsive">
            <table class="table table-none">
                <tbody>

                <tr>
                    <td>
                    <span class="text-muted">
                        @lang('igniter.cart::default.text_sub_total'):
                    </span>
                    </td>
                    <td class="text-right">
                        {{ currency_format($cart->subtotal()) }}
                    </td>
                </tr>

                @foreach ($cart->conditions() as $id => $condition)
                    <tr>
                        <td>
                        <span class="text-muted">
                            {{ $condition->getLabel() }}:
                            @if ($condition->removeable)
                                <button
                                    type="button"
                                    class="btn btn-outline-sm"
                                    data-request="{{ $removeConditionEventHandler }}"
                                    data-request-data="conditionId: '{{ $id }}'"
                                    data-replace-loading="spinner-border spinner-border-sm text-dark"
                                ><i class="bi bi-x"></i>"></i></button>
                            @endif
                        </span>
                        </td>
                        <td class="text-right">
                            {{ is_numeric($result = $condition->getValue()) ? currency_format($result) : $result }}
                        </td>
                    </tr>
                @endforeach

                <tr>
                    <td>
                    <span class="amount-total-cart-label">
                        @lang('igniter.cart::default.text_order_total'):
                    </span>
                    </td>
                    <td class="amount-total-cart text-right">
                        {{ currency_format($cart->total()) }}
                    </td>
                </tr>
                </tbody>
            </table>
        </div>
    </div>
@endif
