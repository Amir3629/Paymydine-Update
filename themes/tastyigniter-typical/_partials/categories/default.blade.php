<ul class="nav flex-column nav-categories product-categories">
    <li class="nav-item">
        <a
            class="nav-link font-weight-bold{{ $selectedCategory ? '' : ' active' }}"
            href="{{ page_url('local/menus', ['category' => null]) }}"
        >
        <i class="poco-icon-cheeseburger"></i>
        <span>@lang('igniter.local::default.text_all_categories')</span>
    </a>
        
    </li>

    @partial('@items', ['categories' => $categories->toTree()])
</ul>
