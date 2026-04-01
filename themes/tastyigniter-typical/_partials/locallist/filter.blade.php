@if ($searchQueryPosition->isValid())
<div class="card mb-3">
    <div class="card-body">
        <div class="d-flex">
            <h5 class="mb-0 d-inline-block flex-grow-1">
                <i class="bi bi-geo-alt-fill"></i>&nbsp;&nbsp;
                {{ $searchQueryPosition->getLocality() }}
            </h5>
            <a class="text-primary" href="{{ page_url('home') }}">@lang('igniter.local::default.search.text_change')</a>
        </div>
    </div>
</div>
@endif
<div class="group-local-radio d-flex justify-content-start col-sm-6 ps-5">
    @foreach ($listOrderTypes as $key => $name)
    <input type="radio" id="customRadio{{$key}}" name="{{ $orderTypeParam }}" class="local-radio" value="{{$key}}"
        data-page-url="{{ $filterPageUrl }}" {!! $key==$activeOrderType ? 'checked=checked' : '' !!} />
    <label class="custom-local-label" for="customRadio{{$key}}">@lang($name)</label>
    @endforeach
</div>