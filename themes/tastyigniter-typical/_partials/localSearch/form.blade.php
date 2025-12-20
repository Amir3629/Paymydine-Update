<form
    id="location-search"
    method="POST"
    role="form"
    data-request="{{ $searchEventHandler }}"
>
    <div class="input-group input-group-lg">
            <span
                class="input-group-text btn-primary"
                @if ($searchDefaultAddress)
                role="button"
                data-address-picker-control="new"
                @endif
            ><i class="bi bi-geo-alt-fill"></i></span>
        <input
            type="text"
            id="search-query"
            class="form-control text-center"
            name="search_query"
            placeholder="@lang('igniter.local::default.label_search_query')"
            value="{{ $__SELF__->getSearchQuery() }}"
        >
                    <button
                type="button"
                class="btn btn-primary"
                data-control="search-local"
                data-replace-loading="spinner-grow spinner-grow-sm"
            ><i class="bi bi-check-lg"></i></button>
    </div>
</form>
