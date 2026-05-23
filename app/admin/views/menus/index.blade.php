@php
use Admin\Models\Categories_model;
use Illuminate\Support\Facades\DB;

$cards = \Admin\Models\Menus_model::with(['categories', 'allergens', 'media'])
    ->orderByRaw('COALESCE(menu_priority, 999999) ASC')
    ->orderBy('menu_name', 'asc')
    ->get();

$categories = Categories_model::query()
    ->orderByRaw('COALESCE(priority, 999999) ASC')
    ->orderBy('name', 'asc')
    ->get(['category_id', 'name', 'priority']);

$hasCombos = false;
try {
    $hasCombos = DB::table('menu_combos')->where('combo_status', 1)->exists();
} catch (\Throwable $e) {
    $hasCombos = false;
}

$pmdSafeThumb = static function ($menu) {
    $fallback = url('/app/admin/assets/images/default-image.png');
    if (!$menu) {
        return $fallback;
    }

    try {
        if (method_exists($menu, 'getThumb')) {
            $thumb = $menu->getThumb();
            if (is_string($thumb) && trim($thumb) !== '') {
                return $thumb;
            }
        }
    } catch (\Throwable $e) {
    }

    return $fallback;
};
@endphp

<div class="pmd-menu-card-grid-wrap">
    <div class="pmd-menu-board-header">
        <div>
            <h4 class="mb-1">Menu Management Board</h4>
            <p class="text-muted mb-0">Drag cards to set visual order for frontend menu.</p>
        </div>
        <a class="btn btn-primary" href="{{ admin_url('menus/create') }}"><i class="fa fa-plus mr-1"></i> Add Item</a>
    </div>

    <div class="pmd-menu-category-row">
        <div id="pmd-category-buttons" class="category-buttons pmd-category-buttons">
            <button type="button" class="category-btn active" data-category="all"><i class="fa fa-th-large"></i> All Items</button>
            @foreach($categories as $category)
                <button type="button" class="category-btn pmd-category-btn" data-category="{{ $category->category_id }}" data-category-id="{{ $category->category_id }}" draggable="true">
                    <span class="pmd-category-drag" title="Drag to reorder categories"><i class="fa fa-grip-lines"></i></span>
                    <i class="fa fa-utensils"></i> {{ $category->name }}
                </button>
            @endforeach
            @if($hasCombos)
                <button type="button" class="category-btn" data-category="combo"><i class="fa fa-layer-group"></i> Combo</button>
            @endif
        </div>
        <a href="{{ admin_url('categories/create') }}" class="btn btn-outline-secondary pmd-add-category-btn" title="Add category">
            <i class="fa fa-plus"></i>
        </a>
    </div>

    <div class="pmd-board-toolbar">
        <input id="pmd-menu-search" type="search" class="form-control" placeholder="Search menu items..." />
        <button id="pmd-menu-save-order" class="btn btn-success pmd-menu-save-order" disabled><i class="fa fa-save mr-1"></i>Save items order</button>
        <button id="pmd-menu-save-category-order" class="btn btn-outline-success" disabled><i class="fa fa-save mr-1"></i>Save category order</button>
        <span id="pmd-menu-order-state" class="text-muted small">Layout is saved</span>
    </div>

    <div id="pmd-menu-filter-warning" class="alert alert-warning py-2 px-3" style="display:none;">Clear category filter to reorder all items.</div>

    <div id="pmd-menu-grid" class="pmd-menu-grid">
        @foreach($cards as $m)
            @php
                $img = $pmdSafeThumb($m);
                $firstCategory = optional($m->categories->sortBy('priority')->first());
            @endphp
            <article class="pmd-menu-card" data-menu-id="{{ $m->menu_id }}" data-category-id="{{ $firstCategory->category_id ?? '' }}" data-menu-name="{{ mb_strtolower($m->menu_name) }}" draggable="true">
                <button type="button" class="pmd-menu-card-handle" title="Drag to reorder"><i class="fa fa-grip-vertical"></i></button>
                <a class="pmd-menu-edit" href="{{ admin_url('menus/edit/'.$m->menu_id) }}" title="Edit {{ e($m->menu_name) }}"><i class="fa fa-pen"></i></a>
                <div class="pmd-menu-img-wrap"><img src="{{ $img }}" alt="{{ e($m->menu_name) }}"></div>
                <div class="pmd-menu-meta">
                    <div class="pmd-menu-name">{{ $m->menu_name }}</div>
                    <div class="pmd-menu-price">{{ currency_format($m->menu_price) }}</div>
                    <div class="pmd-menu-tags">
                        <span class="badge badge-light">{{ $firstCategory->name ?: 'Uncategorized' }}</span>
                        <span class="badge {{ $m->menu_status ? 'badge-success' : 'badge-secondary' }}">{{ $m->menu_status ? 'Enabled' : 'Disabled' }}</span>
                        <span class="badge {{ !empty($m->is_stock_out) ? 'badge-danger' : 'badge-info' }}">{{ !empty($m->is_stock_out) ? 'Stock Out' : 'In Stock' }}</span>
                    </div>
                    <div class="pmd-menu-icons">
                        @if(!empty($m->is_halal))<span title="Halal">🕌</span>@endif
                        @if(!empty($m->is_vegetarian))<span title="Vegetarian">🥗</span>@endif
                        @if(!empty($m->is_vegan))<span title="Vegan">🌱</span>@endif
                        @if($m->allergens && $m->allergens->count())<span title="Allergens">⚠️</span>@endif
                        @if(isset($m->spice_level) && $m->spice_level !== null)<span title="Spice">🌶️</span>@endif
                    </div>
                </div>
            </article>
        @endforeach
    </div>

    <details class="mt-3"><summary><strong>Show advanced table view</strong></summary><div class="mt-2">{!! $this->renderList() !!}</div></details>
</div>

<style>
.pmd-menu-card-grid-wrap{padding:14px;background:linear-gradient(180deg,#f9fbfd,#f4f6f8);border:1px solid #e7ecf1;border-radius:14px}
.pmd-menu-board-header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}
.pmd-menu-category-row{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px}
.pmd-category-buttons{display:flex;gap:8px;flex-wrap:wrap}
.pmd-category-btn{position:relative;padding-left:28px}
.pmd-category-drag{position:absolute;left:9px;top:7px;color:#a3afbd;cursor:grab}
.pmd-add-category-btn{min-width:38px;min-height:38px;border-radius:999px}
.pmd-board-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
#pmd-menu-search{max-width:280px}
.pmd-menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.pmd-menu-card{position:relative;background:#fff;border:1px solid #e8edf3;border-radius:14px;box-shadow:0 10px 25px rgba(29,53,87,.06);padding:10px;transition:.2s transform,.2s box-shadow}
.pmd-menu-card:hover{transform:translateY(-2px);box-shadow:0 14px 30px rgba(29,53,87,.12)}
.pmd-menu-img-wrap{height:140px;border-radius:10px;overflow:hidden;background:linear-gradient(135deg,#f4f7fb,#eef2f6)}
.pmd-menu-card img{width:100%;height:100%;object-fit:cover}
.pmd-menu-meta{padding-top:10px}
.pmd-menu-name{font-weight:600;line-height:1.3;min-height:36px}
.pmd-menu-price{font-size:1rem;font-weight:700;color:#1f7a4c;margin-top:4px}
.pmd-menu-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.pmd-menu-icons{margin-top:8px;display:flex;gap:6px;font-size:14px}
.pmd-menu-edit,.pmd-menu-card-handle{position:absolute;top:15px;width:28px;height:28px;border-radius:999px;border:1px solid #e0e6ed;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;color:#56606b;z-index:2}
.pmd-menu-edit{right:14px}
.pmd-menu-card-handle{right:46px;cursor:grab}
.pmd-menu-card.is-hidden{display:none}
@media (max-width: 992px){.pmd-menu-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
@media (max-width: 640px){.pmd-menu-grid{grid-template-columns:1fr}.pmd-menu-board-header{flex-direction:column;align-items:flex-start}}
</style>

<script>
(function(){
    const grid = document.getElementById('pmd-menu-grid');
    const categoryButtonsWrap = document.getElementById('pmd-category-buttons');
    if (!grid || !categoryButtonsWrap) return;

    const searchInput = document.getElementById('pmd-menu-search');
    const saveItemsBtn = document.getElementById('pmd-menu-save-order');
    const saveCatsBtn = document.getElementById('pmd-menu-save-category-order');
    const stateEl = document.getElementById('pmd-menu-order-state');
    const warningEl = document.getElementById('pmd-menu-filter-warning');

    const cards = () => Array.from(grid.querySelectorAll('.pmd-menu-card'));
    const categoryButtons = () => Array.from(categoryButtonsWrap.querySelectorAll('.pmd-category-btn'));
    let draggedCard = null;
    let draggedCategory = null;
    let itemsDirty = false;
    let categoriesDirty = false;

    function activeCategory() {
        return categoryButtonsWrap.querySelector('.category-btn.active')?.dataset.category || 'all';
    }

    function updateState() {
        const categoryFiltered = activeCategory() !== 'all';
        saveItemsBtn.disabled = !itemsDirty || categoryFiltered;
        saveCatsBtn.disabled = !categoriesDirty;
        warningEl.style.display = categoryFiltered ? 'block' : 'none';
        if (itemsDirty && categoriesDirty) stateEl.textContent = 'Unsaved items + category order';
        else if (itemsDirty) stateEl.textContent = 'Unsaved items order';
        else if (categoriesDirty) stateEl.textContent = 'Unsaved category order';
        else stateEl.textContent = 'Layout is saved';
    }

    function applyFilters(){
        const q = (searchInput?.value || '').trim().toLowerCase();
        const category = activeCategory();
        cards().forEach(card => {
            const byCategory = category === 'all' ? true : card.dataset.categoryId === category;
            const bySearch = !q || (card.dataset.menuName || '').includes(q);
            card.classList.toggle('is-hidden', !(byCategory && bySearch));
        });
        updateState();
    }

    categoryButtonsWrap.addEventListener('click', (e) => {
        const btn = e.target.closest('.category-btn');
        if (!btn) return;
        categoryButtonsWrap.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyFilters();
    });

    searchInput?.addEventListener('input', applyFilters);

    cards().forEach(card => {
        card.addEventListener('dragstart', () => draggedCard = card);
        card.addEventListener('dragover', e => e.preventDefault());
        card.addEventListener('drop', e => {
            e.preventDefault();
            if (!draggedCard || draggedCard === card || activeCategory() !== 'all') return;
            const after = (e.clientY - card.getBoundingClientRect().top) > card.offsetHeight/2;
            if (after) card.after(draggedCard); else card.before(draggedCard);
            itemsDirty = true;
            updateState();
        });
    });

    categoryButtons().forEach(btn => {
        btn.addEventListener('dragstart', () => draggedCategory = btn);
        btn.addEventListener('dragover', e => e.preventDefault());
        btn.addEventListener('drop', e => {
            e.preventDefault();
            if (!draggedCategory || draggedCategory === btn) return;
            const after = (e.clientX - btn.getBoundingClientRect().left) > btn.offsetWidth / 2;
            if (after) btn.after(draggedCategory); else btn.before(draggedCategory);
            categoriesDirty = true;
            updateState();
        });
    });

    saveItemsBtn.addEventListener('click', function(){
        const ordered = cards().map(c => c.dataset.menuId).filter(Boolean);
        const body = ordered.map(id => 'ordered_ids[]=' + encodeURIComponent(id)).join('&') + '&_handler=onSaveCardOrder';
        saveItemsBtn.disabled = true;
        fetch(window.location.pathname, {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8','X-CSRF-TOKEN':document.querySelector('meta[name="csrf-token"]')?.content || ''}, body})
            .then(r=>r.json()).then(j=>{ if(j && j.ok){itemsDirty=false;} updateState(); })
            .catch(()=>{saveItemsBtn.disabled=false; stateEl.textContent='Item order save failed';});
    });

    saveCatsBtn.addEventListener('click', function(){
        const ordered = categoryButtons().map(c => c.dataset.categoryId).filter(Boolean);
        const body = ordered.map(id => 'ordered_category_ids[]=' + encodeURIComponent(id)).join('&') + '&_handler=onSaveCategoryOrder';
        saveCatsBtn.disabled = true;
        fetch(window.location.pathname, {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8','X-CSRF-TOKEN':document.querySelector('meta[name="csrf-token"]')?.content || ''}, body})
            .then(r=>r.json()).then(j=>{ if(j && j.ok){categoriesDirty=false;} updateState(); })
            .catch(()=>{saveCatsBtn.disabled=false; stateEl.textContent='Category order save failed';});
    });

    updateState();
    applyFilters();
})();
</script>
