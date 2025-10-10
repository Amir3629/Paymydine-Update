@if (!$hideMenuSearch)
    <div class="menu-search">
        @partial('@searchbar')
    </div>
@endif

@if ($menuIsGrouped)
    @partial('@grouped', ['groupedMenuItems' => $menuList])
@else
    @partial('@items', ['menuItems' => $menuList])
@endif

<nav class="typical-pagination mb-5">
    @partial('pagination/default', ['paginator' => $menuList])
</nav>
