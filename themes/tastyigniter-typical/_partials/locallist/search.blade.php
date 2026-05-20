<div class="card mb-3">
    <div class="card-body">
        <form
            method="GET"
            id="filter-search-form"
            class="form-search form-horizontal"
            action="{{ current_url() }}"
        >
            <div class="form-floating mb-3 input-group input-group-lg">
                <input
                    type="search"
                    id="search-local"
                    class="form-control btn-lg"
                    name="search"
                    value="{{ $filterSearch }}"
                    placeholder="@lang('igniter.local::default.text_filter_search')"
                />
                <Label for="search-local">@lang('igniter.local::default.text_filter_search')</Label>
                    <button
                        class="btn btn-primary"
                        type="submit"
                    ><i class="poco-icon-search"></i></button>
            </div>
        </form>
    </div>
</div>
