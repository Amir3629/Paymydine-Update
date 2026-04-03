@if (count($featuredMenuItems))
    <div id="featured-menu-box" class="module-box py-2">
        <div class="text-center">
            <h2 class="text-white mb-3">{{ $featuredTitle }}</h2>

            <ul class="products columns-3 mt-5">
                @foreach ($featuredMenuItems as $featuredItem)
                    <li class="product">
                        <div class="product-item">
                            <div class="product-transition">
                                <div class="product-image">
                                    @if ($featuredItem->hasMedia())
                                        <img
                                            class=""
                                            src="{{ $featuredItem->getThumb([
                                                'width' => $featuredWidth,
                                                'height' => $featuredHeight,
                                            ]) }}" alt="{{ $featuredItem->getBuyableName() }}"
                                        />
                                    @endif
                                </div>
                            </div>
                            <div class="product-caption-home">
                                <div class="product-header">
                                    <h4 class="card-title">
                                        {{ $featuredItem->getBuyableName() }}                                        
                                    </h4>                                    
                                </div>
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h4 class="card-title">{{ currency_format($featuredItem->getBuyablePrice()) }}</h4>
                                    </div>
                                    <div>
                                        <a type="button" href="{{ restaurant_url('local/menus') }}" 
                                        class="btn btn-primary btn-md text-uppercase">@lang('igniter.cart::default.button_order')</a>
                                    </div>                                    
                                </div>
                                <div class="product-description">
                                    <p class="card-text">{{ $featuredItem['menu_description'] }}</p>
                                </div>
                            </div>
                        </div>
                    </li>
                @endforeach
            </ul>
        </div>
    </div>
@endif
