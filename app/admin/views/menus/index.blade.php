@php
use Admin\Models\Categories_model;

$cards = \Admin\Models\Menus_model::with(['categories', 'media'])
    ->orderByRaw('COALESCE(menu_priority, 999999) ASC')
    ->orderBy('menu_name', 'asc')
    ->get();

$categories = Categories_model::query()->orderBy('priority', 'asc')->orderBy('name', 'asc')->get(['category_id', 'name']);

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
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h4 class="mb-0">Visual Menu Board</h4>
        <a class="btn btn-primary" href="{{ admin_url('menus/create') }}">+ Add New Item</a>
    </div>

    <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
        <select id="pmd-menu-category-filter" class="form-control pmd-menu-category-filter" style="max-width:260px;">
            <option value="">All categories</option>
            @foreach($categories as $category)
                <option value="{{ $category->category_id }}">{{ $category->name }}</option>
            @endforeach
        </select>
        <input id="pmd-menu-search" type="search" class="form-control" style="max-width:300px;" placeholder="Search menu items..." />
        <button id="pmd-menu-save-order" class="btn btn-success pmd-menu-save-order" disabled>Save order</button>
        <span id="pmd-menu-order-state" class="text-muted small">Order is saved</span>
    </div>

    <div id="pmd-menu-filter-warning" class="alert alert-warning py-2 px-3" style="display:none;">
        Clear category filter to reorder all items.
    </div>

    <div id="pmd-menu-grid" class="pmd-menu-grid">
        @foreach($cards as $m)
            @php
                $img = $pmdSafeThumb($m);
                $firstCategory = optional($m->categories->first());
            @endphp
            <div class="pmd-menu-card" data-menu-id="{{ $m->menu_id }}" data-category-id="{{ $firstCategory->category_id ?? '' }}" data-menu-name="{{ mb_strtolower($m->menu_name) }}" draggable="true">
                <div class="pmd-menu-card-handle" title="Drag to reorder">☰</div>
                <img src="{{ $img }}" alt="{{ e($m->menu_name) }}">
                <div class="mt-2 fw-bold">{{ $m->menu_name }}</div>
                <div>{{ currency_format($m->menu_price) }}</div>
                <div class="small text-muted">{{ $firstCategory->name ?: 'Uncategorized' }}</div>
                <div class="small mt-1">Status: <strong>{{ $m->menu_status ? 'Enabled' : 'Disabled' }}</strong></div>
                <div class="small">Stock: <strong>{{ !empty($m->is_stock_out) ? 'Out' : 'In' }}</strong></div>
                <div class="d-flex flex-wrap gap-1 mt-2">
                    @if(!empty($m->is_halal))<span class="badge badge-info">Halal</span>@endif
                    @if(!empty($m->is_vegetarian))<span class="badge badge-success">Veg</span>@endif
                    @if(!empty($m->is_vegan))<span class="badge badge-success">Vegan</span>@endif
                    @if(method_exists($m, 'allergens') && $m->allergens && $m->allergens->count())<span class="badge badge-warning">Allergens</span>@endif
                </div>
                <a class="btn btn-sm btn-outline-primary mt-2" href="{{ admin_url('menus/edit/'.$m->menu_id) }}">Edit</a>
            </div>
        @endforeach
    </div>

    <details class="mt-3">
        <summary><strong>Show advanced table view</strong></summary>
        <div class="mt-2">{!! $this->renderList() !!}</div>
    </details>
</div>

<style>
.pmd-menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.pmd-menu-card{position:relative;border:1px solid #ddd;border-radius:10px;padding:10px;background:#fff}
.pmd-menu-card img{width:100%;height:130px;object-fit:cover;border-radius:8px;background:#f8f8f8}
.pmd-menu-card-handle{position:absolute;top:8px;right:8px;cursor:grab;background:#fff;padding:2px 6px;border-radius:6px;border:1px solid #ddd}
.pmd-menu-card.is-hidden{display:none}
</style>

<script>
(function () {
    const grid = document.getElementById('pmd-menu-grid');
    if (!grid) return;

    const saveBtn = document.getElementById('pmd-menu-save-order');
    const stateEl = document.getElementById('pmd-menu-order-state');
    const categoryFilter = document.getElementById('pmd-menu-category-filter');
    const searchInput = document.getElementById('pmd-menu-search');
    const warningEl = document.getElementById('pmd-menu-filter-warning');
    const cards = () => Array.from(grid.querySelectorAll('.pmd-menu-card'));
    let dragged = null;
    let dirty = false;

    const setDirty = (value) => {
        dirty = value;
        const filterActive = !!(categoryFilter && categoryFilter.value);
        saveBtn.disabled = !dirty || filterActive;
        stateEl.textContent = dirty ? 'Unsaved order changes' : 'Order is saved';
    };

    const applyFilters = () => {
        const categoryValue = categoryFilter ? categoryFilter.value : '';
        const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
        cards().forEach(card => {
            const matchesCategory = !categoryValue || card.dataset.categoryId === categoryValue;
            const matchesSearch = !query || (card.dataset.menuName || '').includes(query);
            card.classList.toggle('is-hidden', !(matchesCategory && matchesSearch));
        });
        const filterActive = !!categoryValue;
        warningEl.style.display = filterActive ? 'block' : 'none';
        if (filterActive) {
            saveBtn.disabled = true;
        } else if (dirty) {
            saveBtn.disabled = false;
        }
    };

    cards().forEach(card => {
        card.addEventListener('dragstart', () => dragged = card);
        card.addEventListener('dragover', e => e.preventDefault());
        card.addEventListener('drop', e => {
            e.preventDefault();
            if (!dragged || dragged === card || (categoryFilter && categoryFilter.value)) return;
            const cardRect = card.getBoundingClientRect();
            const shouldInsertAfter = (e.clientY - cardRect.top) > cardRect.height / 2;
            if (shouldInsertAfter) card.after(dragged); else card.before(dragged);
            setDirty(true);
        });
    });

    saveBtn.addEventListener('click', function () {
        const ordered = cards().map(c => c.dataset.menuId).filter(Boolean);
        const body = ordered.map(id => 'ordered_ids[]=' + encodeURIComponent(id)).join('&') + '&_handler=onSaveCardOrder';
        saveBtn.disabled = true;
        fetch(window.location.pathname, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
            },
            body
        }).then(r => r.json())
            .then(json => {
                if (json && json.ok) {
                    setDirty(false);
                    stateEl.textContent = 'Order saved successfully';
                } else {
                    saveBtn.disabled = false;
                    stateEl.textContent = 'Save failed. Try again.';
                }
            }).catch(() => {
                saveBtn.disabled = false;
                stateEl.textContent = 'Save failed. Try again.';
            });
    });

    categoryFilter?.addEventListener('change', applyFilters);
    searchInput?.addEventListener('input', applyFilters);
    applyFilters();
})();
</script>
