@if (count($locationOrderTypes) <= $__SELF__->property('maxOrderTypeButtons', 1))
    <ul
        class="radio-switch"
        data-control="order-type-toggle"
        data-handler="{{ $orderTypeEventHandler }}"
    >
        @foreach($locationOrderTypes as $orderType)
            @continue($orderType->isDisabled())
            <li class="list-unstyled radio-switch__item">
                <input
                    id="btn-check-{{$orderType->getCode()}}"
                    type="radio"
                    name="order_type"
                    class="radio-switch__input visually-hidden"
                    value="{{ $orderType->getCode() }}"
                    {!! $orderType->isActive() ? 'checked="checked"' : '' !!}
                />
                <label
                    @if ($orderType->getCode() == 'delivery')
                    data-bs-tooltip="tooltip"
                    data-bs-placement="bottom"             
                        @if ($minOrderTotal = $location->minimumOrder($cart->subtotal()))
                            title="@lang('igniter.local::default.text_min_total'): {{ currency_format($minOrderTotal) }}"
                        @else
                            title="@lang('igniter.local::default.text_no_min_total')"
                        @endif
                    @endif
                    for="btn-check-{{$orderType->getCode()}}"
                    class="radio-switch__label {{ $orderType->isActive() ? 'active' : '' }}"
                >@partial('@control_info', ['orderType' => $orderType])</label>
                @if ($orderType->getCode() == 'collection')
                    <div class="radio-switch__marker" aria-hidden="true"></div>
                    <script>
                        // Script para mostrar el modal al cargar la página solo si la opción es "collection"
                        document.addEventListener("DOMContentLoaded", function() {
                            var orderTypeInput = document.querySelector('input[name="order_type"][value="collection"]');
                            if (orderTypeInput.checked) {
                                var locationsModal = new bootstrap.Modal(document.getElementById('locationsModal'));
                                locationsModal.show();
                            }
                            orderTypeInput.addEventListener('click', function() {
                                if (orderTypeInput.checked) {
                                    locationsModal.show();
                                } else {
                                    locationsModal.hide();
                                }
                            });
                        });
                    </script>
                @endif
            </li>
        @endforeach
    </ul>
@else
    <div
        class="dropdown d-flex flex-column align-items-center"
        data-control="order-type-toggle"
        data-handler="{{ $orderTypeEventHandler }}"
    >
        <button
            class="btn btn-light btn-block dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
        >
            @partial('@control_info', ['orderType' => $location->getOrderType()])
        </button>
        <div class="dropdown-menu w-100" aria-labelledby="dropdownMenuButton">
            @foreach($locationOrderTypes as $orderType)
                @continue($orderType->isDisabled())
                <a
                    role="button"
                    class="dropdown-item text-center {{ $orderType->isActive() ? 'active' : '' }}"
                    data-order-type-code="{{ $orderType->getCode() }}"
                >
                    @partial('@control_info', ['orderType' => $orderType])
                </a>
                @if ($orderType->getCode() == 'collection' && $orderType->isActive())
               
                <script>
                    document.addEventListener("DOMContentLoaded", function() {
                        var collectionButtonlink = document.querySelector('.collection-link');
                        var collectionButton = document.querySelector('[data-order-type-code="collection"]');
                        var locationsModal = new bootstrap.Modal(document.getElementById('locationsModal'));
                        var modalShown = localStorage.getItem('collectionModalShown');

                        if (collectionButtonlink) {
                            collectionButtonlink.addEventListener('click', function() {
                                locationsModal.show();
                            });
                        }

                        if (collectionButton && collectionButton.classList.contains('active') && !modalShown) {
                            locationsModal.show();
                            localStorage.setItem('collectionModalShown', 'true');
                        }
                    });
                </script>


                @endif
            @endforeach
        </div>
        @if ($location->getOrderType()->getCode() == 'collection')
            <div class="mt-2">
                <button class="btn btn-light btn-block collection-link dropdown-toggle" type="button">
                    Elegir Sucursal
                </button>
            </div>            
        @endif
    </div>
@endif