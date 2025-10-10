<div class="row row-cols-1 row-cols-md-3">
    @foreach ($locationsList as $locationObject)
    <div class="restaurant-frames">
        <a class="card collection-item hover-effect"
            href="{{ page_url('local/menus', ['location' => $locationObject->permalink]) }}">
            
            
            <div class="card-content d-sm-flex no-gutters">
                <div class="d-sm-flex">
                    <dl class="no-spacing">                        
                        <dd class="">
                            <span class="text-muted"><p class="slotospan">{{ $locationObject->name }},</p> {!! format_address($locationObject->address)
                                !!}</span>
                        </dd>
                        @if ($locationObject->distance)
                        <dd>
                            <span class="text-muted small"><i
                                    class="bi bi-geo-alt"></i>&nbsp;&nbsp;{{ number_format($locationObject->distance, 1) }}
                                {{ $distanceUnit }}</span>
                        </dd>
                        @endif
                    </dl>
                </div>
                
            </div>
        </a>
    </div>
    @endforeach
</div>
