@foreach ($categories as $category)
@continue(in_array($category->getKey(), $hiddenCategories))
@continue($hideEmptyCategory && $category->count_menus < 1)

<li class="cat-home-li">
    <div class="cat-home-li2">
        <div class="cat-home-wrap">
            <div class="cat-home-wrap2">
                <div class="cat-product">
                    <div class="cat-image">
                        <a
                        class="text-white link-cat-product font-weight-bold{{ ($selectedCategory && $category->permalink_slug == $selectedCategory->permalink_slug) ? ' active' : '' }}"
                        href="{{ page_url('local/menus', ['category' => $category->permalink_slug]) }}"
                        >@if ($category->hasMedia('thumb'))<img class="link-cat-product-img" 
                        src="{{ $category->getThumb() }}" alt="{{ $category->name}}">@endif                
                        </a>
                        <div class="cat-desc">
                            <div class="cat-name">
                                <a
                                title="{{$category->name}}"                                
                                href="{{ page_url('local/menus', ['category' => $category->permalink_slug]) }}"
                                ><span class="cats-title-text">{{ $category->name }}</span>            
                                </a>
                            </div>
                        </div>                    
                </div>
                
            </div>                    
        </div>                
    </div>            
</div>        
</li>
@endforeach