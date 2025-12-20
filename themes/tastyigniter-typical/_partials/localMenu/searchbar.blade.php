<div class="site-search">
    <div class="store-search-input">
        <form
        id="menu-search"
        method="GET"
        role="form"
        action="{{ restaurant_url('local/menus') }}"
        class="store-search-button" 
        >
            <input
            type="search"
            class="store-search-input-field"
            name="q"
            placeholder="@lang('igniter.local::default.label_menu_search')"
            value="{{ $menuSearchTerm }}"
            autocomplete="off"
            >
            @if (strlen($menuSearchTerm))
                <a
                class="store-search-input-placeholder-icon "
                href="{{ restaurant_url('local/menus') }}"
                ><i class="bi bi-x-circle-fill"></i></a>
            @else
                <button type="submit" value="{{ $menuSearchTerm }}">@lang('main::lang.home.text_step_one')</button>
            @endif           
        </form>
    </div>
</div>