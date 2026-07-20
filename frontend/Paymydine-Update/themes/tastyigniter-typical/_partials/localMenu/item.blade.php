<li id="menu{{ $menuItem->menu_id }}" class="product">
    <div class="product-item">
        @if ($menuItemObject->specialIsActive)
            <span class="badge-sale"
            data-bs-tooltip="tooltip"
            data-bs-placement="bottom"
            title="{!! sprintf(lang('igniter.local::default.text_end_elapsed'),
            $menuItemObject->specialDaysRemaining) !!}">
            Sale!</span>
        @endif
        <div class="product-transition">
            <a 
            @if (!$menuItemObject->mealtimeIsNotAvailable)
            data-cart-control="load-item"
            data-menu-id="{{ $menuItem->menu_id }}"
            data-quantity="{{ $menuItem->minimum_qty }}"  
            
            @endif>
            <div class="product-image">
            
                @if ($showMenuImages == 1 && $menuItemObject->hasThumb)
                <img class="" 
                src= "{{ $menuItem->getThumb() }}"
                width="{{$menuImageWidth}}" height="{{$menuImageHeight}}"
                >
                @endif
            
            </div>
        </a>
        </div>
        <div class="d-flex flex-wrap align-items-center allergens">
            @partial('@allergens', ['menuItem' => $menuItem, 'menuItemObject' => $menuItemObject])
        </div>
        <div class="product-caption">
            <div class="product-caption-details">
                <div class="menu-content">
                    <h5 class="menu-name">{{ $menuItem->menu_name }}</h5>                    
                </div>
                <div class="product-menu-price">                     
                    @if ($menuItemObject->specialIsActive)                   
                    <p class="product-discount-price">        
                        {!! currency_format($menuItemObject->menuPriceBeforeSpecial) !!}                        
                    </p>
                    @endif
                    <p @if ($menuItemObject->specialIsActive)
                    
                        data-bs-tooltip="tooltip"
                        title="{!! sprintf(lang('igniter.local::default.text_end_elapsed'), $menuItemObject->specialDaysRemaining) !!}"
                    
                    @endif>
                    {!! $menuItemObject->menuPrice > 0 ? currency_format($menuItemObject->menuPrice) : lang('main::lang.text_free') !!}
                    </p>
                </div>                
            </div>
            <div class="product-add-product">
                @isset($updateCartItemEventHandler)            
                @partial('@button', ['menuItem' => $menuItem, 'menuItemObject' => $menuItemObject ])            
            @endisset 
            </div>
                   
        
        </div>
                
    </div>
</li>
