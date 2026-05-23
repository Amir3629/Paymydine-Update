@php
use Admin\Models\Categories_model;

$cards = \Admin\Models\Menus_model::with(['categories', 'allergens', 'media'])
    ->orderByRaw('COALESCE(menu_priority, 999999) ASC')
    ->orderBy('menu_name', 'asc')
    ->get();

$categories = Categories_model::query()
    ->orderByRaw('COALESCE(priority, 999999) ASC')
    ->orderBy('name', 'asc')
    ->get(['category_id', 'name', 'priority']);

$pmdSafeThumb = static function ($menu) {
    $fallback = url('/app/admin/assets/images/default-image.png');
    if (!$menu) return $fallback;
    try {
        if (method_exists($menu, 'getThumb')) {
            $thumb = $menu->getThumb();
            if (is_string($thumb) && trim($thumb) !== '') return $thumb;
        }
    } catch (\Throwable $e) {}
    return $fallback;
};
@endphp

<div class="pmd-menu-card-grid-wrap">
    <div class="pmd-menu-board-header">
        <h4 class="mb-0">Menu Layout Board</h4>
        <div class="d-flex gap-2">
            <button id="pmd-layout-toggle" class="btn btn-outline-primary">Edit Layout</button>
            <a class="btn btn-primary" href="{{ admin_url('menus/create') }}"><i class="fa fa-plus mr-1"></i>Add Item</a>
        </div>
    </div>

    <div class="pmd-menu-category-row">
        <div id="pmd-category-buttons" class="category-buttons pmd-category-buttons">
            <button type="button" class="category-btn active" data-category="all"><i class="fa fa-th-large"></i> All Items</button>
            @foreach($categories as $category)
                <button type="button" class="category-btn" data-category="{{ $category->category_id }}"><i class="fa fa-utensils"></i> {{ $category->name }}</button>
            @endforeach
        </div>
        <a href="{{ admin_url('categories/create') }}" class="btn btn-outline-secondary pmd-add-category-btn" title="Add category"><i class="fa fa-plus"></i></a>
    </div>

    <div class="pmd-board-toolbar">
        <input id="pmd-menu-search" type="search" class="form-control" placeholder="Search menu items..." />
        <button id="pmd-menu-save-order" class="btn btn-success pmd-menu-save-order" disabled>Save items order</button>
        <span id="pmd-menu-order-state" class="text-muted small">Layout is saved</span>
    </div>
    <div id="pmd-menu-filter-warning" class="alert alert-warning py-2 px-3" style="display:none;">Clear category filter to reorder all items.</div>

    <div id="pmd-menu-grid" class="pmd-menu-grid">
        @foreach($cards as $m)
            @php
                $img = $pmdSafeThumb($m);
                $firstCategory = optional($m->categories->sortBy('priority')->first());
                $isDisabled = !$m->menu_status;
                $isStockOut = !empty($m->is_stock_out);
            @endphp
            <article class="pmd-menu-card {{ $isDisabled ? 'is-disabled' : '' }}" data-menu-id="{{ $m->menu_id }}" data-category-id="{{ $firstCategory->category_id ?? '' }}" data-menu-name="{{ mb_strtolower($m->menu_name) }}">
                <a class="pmd-menu-edit" href="{{ admin_url('menus/edit/'.$m->menu_id) }}" title="Edit {{ e($m->menu_name) }}"><i class="fa fa-pen"></i></a>
                <div class="pmd-menu-card-handle" aria-hidden="true"><i class="fa fa-grip-vertical"></i></div>
                <div class="pmd-menu-img-wrap"><img src="{{ $img }}" alt="{{ e($m->menu_name) }}"></div>
                <div class="pmd-menu-meta text-center">
                    <div class="pmd-menu-name">{{ $m->menu_name }}</div>
                    <div class="pmd-menu-price">{{ currency_format($m->menu_price) }}</div>
                    <div class="pmd-menu-category">{{ $firstCategory->name ?: 'Uncategorized' }}</div>
                    <div class="pmd-menu-tags">
                        @if($isDisabled)<span class="badge badge-secondary">Disabled</span>@endif
                        @if($isStockOut)<span class="badge badge-danger">Out of stock</span>@endif
                        @if(!empty($m->is_halal))<span class="badge badge-light" title="Halal">🕌</span>@endif
                        @if(!empty($m->is_vegetarian))<span class="badge badge-light" title="Vegetarian">🥗</span>@endif
                        @if(!empty($m->is_vegan))<span class="badge badge-light" title="Vegan">🌱</span>@endif
                        @if($m->allergens && $m->allergens->count())<span class="badge badge-light" title="Allergens">⚠️</span>@endif
                        @if(isset($m->spice_level) && $m->spice_level !== null)<span class="badge badge-light" title="Spice">🌶️</span>@endif
                    </div>
                </div>
            </article>
        @endforeach
    </div>

    <details class="mt-3"><summary><strong>Show advanced table view</strong></summary><div class="mt-2">{!! $this->renderList() !!}</div></details>
</div>

<style>
.pmd-menu-card-grid-wrap{max-width:1080px}
.pmd-menu-board-header{margin-bottom:8px}
.pmd-menu-category-row{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}
.pmd-category-buttons{display:flex;gap:6px;flex-wrap:wrap}
.pmd-category-buttons .category-btn{padding:6px 10px;font-size:12px;line-height:1.2}
.pmd-add-category-btn{padding:6px 9px;line-height:1}
.pmd-board-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}
#pmd-menu-search{max-width:220px;height:34px}
.pmd-menu-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
@media (max-width:760px){.pmd-menu-grid{grid-template-columns:1fr}}
.pmd-menu-card{position:relative;background:#fff;border:1px solid #e8edf3;border-radius:12px;box-shadow:0 6px 14px rgba(29,53,87,.08);padding:8px;transition:transform .18s ease, box-shadow .18s ease}
.pmd-menu-card.is-draggable{cursor:move}
.pmd-menu-card.is-dragging{opacity:.65;transform:scale(.98)}
.pmd-menu-card-handle{display:none;position:absolute;left:10px;top:9px;color:#8b98a9;font-size:12px}
.pmd-menu-card.is-draggable .pmd-menu-card-handle{display:block}
.pmd-menu-img-wrap{height:124px;max-height:124px;border-radius:9px;overflow:hidden;background:#f3f6fa;display:flex;align-items:center;justify-content:center;padding:4px}
.pmd-menu-img-wrap img{width:100%;height:100%;max-height:116px;object-fit:contain}
.pmd-menu-name{font-weight:700;margin-top:6px;font-size:14px;line-height:1.25;min-height:34px;display:flex;align-items:center;justify-content:center}
.pmd-menu-price{font-weight:700;color:#1f7a4c;font-size:13px;line-height:1.2;margin-top:2px}
.pmd-menu-category{font-size:11px;color:#7a8799;line-height:1.2;margin-top:2px}
.pmd-menu-tags{display:flex;justify-content:center;gap:4px;flex-wrap:wrap;margin-top:6px}
.pmd-menu-tags .badge{font-size:10px;padding:3px 6px}
.pmd-menu-edit{position:absolute;right:10px;top:9px;width:24px;height:24px;border-radius:999px;background:rgba(255,255,255,.92);border:1px solid #e0e6ed;display:flex;align-items:center;justify-content:center;font-size:11px}
.pmd-menu-card.is-disabled{opacity:.65}
.pmd-menu-card.is-disabled .pmd-menu-img-wrap img{filter:grayscale(100%)}
.pmd-menu-card.is-hidden{display:none}
</style>

<script>
(function(){
const grid=document.getElementById('pmd-menu-grid'); if(!grid) return;
const toggleBtn=document.getElementById('pmd-layout-toggle');
const saveBtn=document.getElementById('pmd-menu-save-order');
const searchInput=document.getElementById('pmd-menu-search');
const warning=document.getElementById('pmd-menu-filter-warning');
const stateEl=document.getElementById('pmd-menu-order-state');
const catWrap=document.getElementById('pmd-category-buttons');
let editMode=false, dirty=false, dragCard=null;
const cards=()=>Array.from(grid.querySelectorAll('.pmd-menu-card'));
const activeCategory=()=>catWrap.querySelector('.category-btn.active')?.dataset.category||'all';
function syncMode(){
 const filtered=activeCategory()!=='all';
 toggleBtn.disabled=filtered;
 warning.style.display=filtered?'block':'none';
 cards().forEach(c=>{c.draggable=editMode&&!filtered;c.classList.toggle('is-draggable',editMode&&!filtered);});
 saveBtn.disabled=!dirty||!editMode||filtered;
 toggleBtn.textContent=editMode?'Done editing':'Edit Layout';
 if(!dirty) stateEl.textContent='Layout is saved';
}
function applyFilter(){const q=(searchInput.value||'').trim().toLowerCase();const cat=activeCategory();cards().forEach(c=>{const okCat=cat==='all'||c.dataset.categoryId===cat;const okQ=!q||(c.dataset.menuName||'').includes(q);c.classList.toggle('is-hidden',!(okCat&&okQ));});syncMode();}
catWrap.addEventListener('click',e=>{const b=e.target.closest('.category-btn');if(!b)return;catWrap.querySelectorAll('.category-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');applyFilter();});
searchInput.addEventListener('input',applyFilter);
toggleBtn.addEventListener('click',()=>{if(toggleBtn.disabled)return;editMode=!editMode;syncMode();if(dirty)stateEl.textContent='Unsaved items order';});
cards().forEach(card=>{card.addEventListener('dragstart',e=>{if(!editMode)return e.preventDefault();dragCard=card;card.classList.add('is-dragging');});card.addEventListener('dragend',()=>card.classList.remove('is-dragging'));card.addEventListener('dragover',e=>{if(!editMode)return;e.preventDefault();});card.addEventListener('drop',e=>{e.preventDefault();if(!editMode||!dragCard||dragCard===card)return;const after=(e.clientY-card.getBoundingClientRect().top)>card.offsetHeight/2;if(after)card.after(dragCard);else card.before(dragCard);dirty=true;stateEl.textContent='Unsaved items order';syncMode();});});
saveBtn.addEventListener('click',()=>{const ordered=cards().map(c=>c.dataset.menuId).filter(Boolean);const body=ordered.map(id=>'ordered_ids[]='+encodeURIComponent(id)).join('&')+'&_handler=onSaveCardOrder';fetch(window.location.pathname,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8','X-CSRF-TOKEN':document.querySelector('meta[name="csrf-token"]')?.content||''},body}).then(r=>r.json()).then(j=>{if(j&&j.ok){dirty=false;stateEl.textContent='Items order saved';syncMode();}else{stateEl.textContent='Save failed';}}).catch(()=>stateEl.textContent='Save failed');});
applyFilter();
})();
</script>
