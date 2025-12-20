<div class="panel">
    <div class="panel-body">
        <div class="title_box_checkout">
            <span class="h4">@lang('igniter.cart::default.checkout.text_order_details')</span>
        </div>
        <div class="body_box_checkout">
            <div class="map_box_checkout1">
                <div class="map_box_checkout2">
                    <div class="map_box_checkout3">
                    @php
                        $mapsApiKey = setting('maps_api_key');
                    @endphp
                    @if (!empty($mapsApiKey))
                    <iframe
                        width="600"
                        height="450"
                        frameborder="0"
                        style="border:0"
                        src="https://www.google.com/maps/embed/v1/place?key={{ $mapsApiKey }}&q={!! format_address($locationCurrent->getAddress(), FALSE) !!}"
                        allowfullscreen>
                    </iframe>
                    @else
                    <p>@lang('admin::lang.locations.alert_missing_map_config')</p>
                    @endif
                        </div>
                </div>
            </div>
            <div class="button_box_checkout">
                <div class="button_box_checkout2">
                    @partial('localBox::control')
                </div>
            </div>
        </div>
      <div class="asap_delivery">
        <div class="button_box_checkout2">
            @partial('localBox::timeslot')
        </div>
      </div>
    </div>
  </div>