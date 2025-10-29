<div class="categories-home-row">
    <ul class="nav nav-categories nav-inline flex-nowrap w-100">
        @partial('@home_items', ['categories' => $categories->toFlatTree(), 'displayAsFlatTree' => true])
    </ul>
</div>