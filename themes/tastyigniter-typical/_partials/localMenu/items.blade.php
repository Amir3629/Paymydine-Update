<ul class="products margin-sus columns-3 mt-5">
    @forelse ($menuItems as $menuItemObject)
        @partial('@item', ['menuItem' => $menuItemObject->model, 'menuItemObject' => $menuItemObject])
    @empty
        <p>@lang('igniter.local::default.text_empty')</p>
    @endforelse
</ul>
