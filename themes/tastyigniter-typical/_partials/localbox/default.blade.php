@if ($location->current())
<div class="panel panel-local">
    <div class="panel-body">
        <div class="row boxes ">
            <div class="box-one">
                @partial('@box_one')

                <div class="local-control">
                    @partial('localBox::control')
                </div>
            </div>
        <div class="box-divider d-block d-sm-none"></div>
        
        <div class="box-two">
            <div class="bt-div">
                <div class="secondb">
                    <div class="sloto">                        
                        @if ($location->orderTypeIsDelivery()) 
                        <div class="slotoprice">                                                       
                            <span class="slotospan">
                                @foreach ($cart->conditions() as $id => $condition)
                                @if ($condition->getLabel() == sprintf(lang('igniter.local::default.text_delivery')) )
                                {{ is_numeric($result = $condition->getValue()) ? currency_format($result) : $result }}        
                                @endif
                                @endforeach
                            </span>
                        </div>
                        <div class="mt-desc slotodesc">
                            <span class="slotospantwo spandesc">
                                @lang('igniter.local::default.column_area_charge')
                            </span>
                        </div>                      
                        @elseif ($location->orderTypeIsCollection())
                        <div class="slotoprice">                                                       
                            <span class="slotospan">
                                $0.00        
                            </span>
                        </div>
                        <div class="mt-desc slotodesc">
                            <span class="slotospantwo spandesc">
                                @lang('igniter.payregister::default.label_order_fee')
                            </span>
                        </div>
                        @endif
                    </div>
                    <div class="divider-v"></div>
                    <div class="{{ !$locationCurrentSchedule->isOpen() ? 'secondslotoclose' : 'secondsloto' }}">
                        @partial('localBox::control_local_info')                        
                    </div>                  
                </div>
            </div>
            <div class="gbuttons">
                <div class="me-2 local-timeslot">
                    @partial('localBox::timeslot')
                </div>
                <div class="btn-info-full">
                    <button
                    type="button"
                    class="p-0 btn-more-info text-truncate"
                    data-bs-toggle="modal"
                    data-bs-target="#infoModal"
                    >
                    <div class="p-0-12">
                        <i class="bi bi-info-circle-fill"></i>&nbsp;
                        <span>@lang('main::lang.text_information')</span>
                    </div>                                
                </button>
                </div>
                
                <div class="btn-icon-info">
                    <button
                    type="button"
                    class="btn-more-info-round  text-truncate"
                    data-bs-toggle="modal"
                    data-bs-target="#infoModal"
                    >
                    <div class="p-0-12">
                        <i class="bi bi-info-circle-fill"></i>
                    </div>                                
                    </button>
                </div>                  
                
            </div>                                
        </div>
    </div>
</div>
</div>
@endif

<!-- Info Modal -->
<div class="modal fade" id="infoModal" tabindex="-1" aria-labelledby="infoModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-0">
                <div class="p-2">
                    <h1 class="h2">{{ $locationCurrent->getName() }}</h1> 
                </div>
                <iframe
                src="https://maps.google.com/maps?q={!! format_address($locationCurrent->getAddress(), FALSE) !!}&output=embed"
                width="100%" height="100%" frameborder="0" style="border:0" allowfullscreen></iframe>
                <div class="mt-0 d-block">
                    <div class="position-relative">
                        <div class="address-modal initgrid p-12-modal">
                            <div style="grid-area: 2 / 1;">
                                <div class="icon1">
                                    <div class="icon11">
                                        <i class="fs-4 bi bi-geo-alt-fill"></i>
                                    </div>                                    
                                </div>                            
                            </div>
                            <div style="grid-area: 2 / 2;" class="grid3">
                                <span class="fontsloto">
                                    <div class="divspan">
                                        <div class="divspan2">
                                            <span>
                                                {!! format_address($locationCurrent->getAddress(), FALSE) !!}</span>
                                            </span>
                                        </div>
                                    </div></div>
                            <div style="grid-area: 2 / 3;" class="div-btn-ext">
                                <a type="button" href="https://www.google.com/maps?q={!! format_address($locationCurrent->getAddress(), FALSE) !!}"
                                    class="btn-ext" target="_blank"></a>
                            </div>
                            <div style="grid-area: -1 / 2 / auto / -1;" class="sdivider">
                                <div class="ddivider">
                                    <hr class="modal-divider">
                                </div>
                            </div>                  
                        </div>
                    </div>                    
                </div>                        
                
                <div class="mt-0 d-block" >
                    <div class="position-relative accordion-item">
                        <div class="address-modal initgrid p-12-modal">
                            <div style="grid-area: 2 / 1;">
                                <div class="icon1">
                                    <div class="icon11">
                                        <i class="fw-semibold fs-5 bi bi-clock-fill"></i>
                                    </div>                                    
                                </div>                            
                            </div>
                            <div style="grid-area: 2 / 2;" class="grid3 accordion accordion-flush" id="schedule">
                                <span class="fontsloto">
                                    <div class="divspan">
                                        <div class="divspan2">
                                            @php
                                                $openingTime = make_carbon($locationCurrentSchedule->getOpenTime());
                                            @endphp
                                            @if ($locationCurrentSchedule->isOpen())
                                                <span>@lang('igniter.local::default.text_is_opened')</span>
                                            @elseif ($locationCurrentSchedule->isOpening())
                                                <span class="text-muted">{!! sprintf(lang('igniter.local::default.text_opening_time'), $openingTime->isoFormat($openingTimeFormat)) !!}</span>
                                            @else
                                                <span class="text-muted">@lang('igniter.local::default.text_closed')</span>
                                            @endif
                                            &nbsp;<span display="block">•</span>&nbsp;
                                            @if ($openingTime->isToday() && $locationCurrentSchedule->getPeriod($openingTime)->opensAllDay())
                                                <span>@lang('igniter.local::default.text_24_7_hour')</span>
                                            @elseif ($openingHours = $__SELF__->getOpeningHours($localBoxTimeFormat))
                                                {!! implode(', ', $openingHours) !!}
                                            @endif
                                        </div>
                                    </div></div>
                            <div style="grid-area: 2 / 3;" class="div-btn-ext">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseOne" aria-expanded="false" aria-controls="flush-collapseOne"></button>
                            </div>
                            
                            <div style="grid-area: -1 / 2 / auto / -1;" class="sdivider">
                                <div class="ddivider">
                                    <div id="flush-collapseOne" class="accordion-collapse collapse" aria-labelledby="flush-headingOne" data-bs-parent="#schedule">
                                        <div class="me-3">@partial('localInfo::hours')</div>
                                    </div>
                                    <hr class="modal-divider">
                                </div>
                            </div>                  
                        </div>
                    </div>                    
                </div>
                
                

                <div class="mt-0 d-block">
                    <div class="position-relative">
                        <div class="address-modal initgrid p-12-modal">
                            <div style="grid-area: 2 / 1;">
                                <div class="icon1">
                                    <div class="icon11">
                                        <i class="fs-4 bi bi-telephone-outbound-fill"></i>
                                    </div>                                    
                                </div>                            
                            </div>
                            <div style="grid-area: 2 / 2;" class="grid3">
                                <span class="fontsloto">
                                    <div class="divspan">
                                        <div class="divspan2">
                                            <span>
                                                {!! $locationCurrent->getTelephone() !!}</span>
                                            </span>
                                        </div>
                                    </div></div>
                            <div style="grid-area: 2 / 3;" class="div-btn-ext">
                                <a type="button" href="tel:{!! $locationCurrent->getTelephone() !!}" class="btn-ext"></a>
                            </div>
                            <div style="grid-area: -1 / 2 / auto / -1;" class="sdivider">
                                <div class="ddivider">
                                    <hr class="modal-divider">
                                </div>
                            </div>                  
                        </div>
                    </div>                    
                </div>                   
                
                <div class="modal-footer">
                    <button type="button" class="text-uppercase btn btn-primary" data-bs-dismiss="modal">@lang('admin::lang.button_close')</button>
                </div>
            </div>
        </div>
    </div>
</div>