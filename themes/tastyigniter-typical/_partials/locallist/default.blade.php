@if (count($locationsList))
    <div class="local-group">
        {!! partial('@list', [
            'locationsList' => $locationsList,
            'distanceUnit' => $distanceUnit,
        ]) !!}
    </div>

    <nav class="typical-pagination mb-5">
        @partial('pagination/default', ['paginator' => $locationsList])
    </nav>
@else
    <div class="panel panel-local">
        <div class="panel-body">
            <p>@lang('igniter.local::default.text_filter_no_match')</p>
        </div>
    </div>
@endif
