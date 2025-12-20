<div id="local-box" class="local-box-fluid">
    @if ($hideSearch)
        <a
            class="btn btn-block btn-primary"
            href="{{ restaurant_url($menusPage) }}"
        >@lang('igniter.local::default.text_find')</a>
    @else
        <div id="local-search-container">
            @partial('@container')
        </div>
    @endif        
</div>
