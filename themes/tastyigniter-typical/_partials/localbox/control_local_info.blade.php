
@if (!$locationCurrentSchedule->isOpen())
    <span class="slotospanclosed">
        @lang('igniter.cart::default.text_is_closed')
    </span>    
@else
    @foreach($locationOrderTypes as $orderType) 
    @if ($location->orderTypeIsDelivery() and $orderType->getLabel() == sprintf(lang('igniter.local::default.text_delivery')) )
            <span class="slotospan" style="color: var(--heading);">
                @if ($orderType->getLeadTime())
                    {!! sprintf(lang('igniter.local::default.text_in_min'), $orderType->getLeadTime()) !!}
                @endif
            </span>
            <div class="slotodesctwo">
                <span class="mt-desc slotodesc">
                    <span class="slotospantwo">
                        @lang('igniter.local::default.text_delivery_time') 
                    </span>
                </span>
            </div>  
        @elseif ($location->orderTypeIsCollection() and $orderType->getLabel() == sprintf(lang('igniter.local::default.text_collection')))
            <span class="slotospan">
                @if ($orderType->getLeadTime())
                    {!! sprintf(lang('igniter.local::default.text_in_min'), $orderType->getLeadTime()) !!}
                @endif
            </span>
            <div class="slotodesctwo">
                <span class="mt-desc slotodesc">
                    <span class="slotospantwo">
                        @lang('igniter.local::default.text_collection_time')  
                    </span>
                </span>
            </div>
        @endif
    @endforeach
@endif
