@php
use Admin\Models\Categories_model;

$user = admin_auth()->user();
$canManageLayout = $user && ($user->hasPermission('Admin.Menus') || $user->hasPermission('Admin.Categories'));

$cards = \Admin\Models\Menus_model::with(['categories', 'allergens', 'media'])
    ->orderByRaw('COALESCE(menu_priority, 999999) ASC')
    ->orderBy('menu_name', 'asc')
    ->get();

$categories = Categories_model::query()->orderByRaw('COALESCE(priority, 999999) ASC')->orderBy('name', 'asc')->get(['category_id','name']);
$pmdSafeThumb = static function ($menu) {
    $fallback = url('/app/admin/assets/images/default-image.png');
    if (!$menu) return $fallback;
    try { if (method_exists($menu, 'getThumb')) { $thumb = $menu->getThumb(); if (is_string($thumb) && trim($thumb) !== '') return $thumb; } } catch (\Throwable $e) {}
    return $fallback;
};
@endphp

<div class="pmd-menu-card-grid-wrap">
    <div class="pmd-toolbar-main">
        <a class="btn btn-primary" href="{{ admin_url('menus/create') }}"><i class="fa fa-plus mr-1"></i>Add Item</a>
        <div class="d-flex gap-2 align-items-center">
            <button id="pmd-select-toggle" class="btn btn-outline-secondary">Select</button>
            @if($canManageLayout)
                <button id="pmd-layout-toggle" class="btn btn-outline-primary">Edit Layout</button>
            @endif
            <button id="pmd-menu-save-order" class="btn btn-success" style="display:none;">Save order</button>
        </div>
    </div>

    <div class="pmd-board-toolbar">
        <input id="pmd-menu-search" type="search" class="form-control" placeholder="Search menu items..." />
        <span id="pmd-selection-count" class="text-muted small" style="display:none;">0 selected</span>
        <span id="pmd-menu-order-state" class="text-muted small">Layout is saved</span>
    </div>

    <div id="pmd-category-buttons" class="category-buttons pmd-category-buttons">
        <button type="button" class="category-btn active" data-category="all"><i class="fa fa-th-large"></i> All Items</button>
        @foreach($categories as $category)
            <button type="button" class="category-btn" data-category="{{ $category->category_id }}"><i class="fa fa-utensils"></i> {{ $category->name }}</button>
        @endforeach
        <a href="{{ admin_url('categories/create') }}" class="category-btn pmd-category-add" title="Add category"><i class="fa fa-plus"></i></a>
    </div>

    <div id="pmd-menu-filter-warning" class="alert alert-warning py-2 px-3" style="display:none;">Clear category filter to reorder all items.</div>

    <div id="pmd-menu-grid" class="pmd-menu-grid">
        @foreach($cards as $m)
            @php $img=$pmdSafeThumb($m); $cat=optional($m->categories->sortBy('priority')->first()); $disabled=!$m->menu_status; $stockOut=!empty($m->is_stock_out); @endphp
            <article class="pmd-menu-card {{ $disabled ? 'is-disabled' : '' }}" data-menu-id="{{ $m->menu_id }}" data-category-id="{{ $cat->category_id ?? '' }}" data-menu-name="{{ mb_strtolower($m->menu_name) }}" data-stock-out="{{ $stockOut ? 1 : 0 }}" data-enabled="{{ $disabled ? 0 : 1 }}">
                <label class="pmd-select-dot"><input type="checkbox" class="pmd-select-checkbox" value="{{ $m->menu_id }}"><span></span></label>
                <div class="dropdown pmd-card-menu">
                    <button class="btn btn-light btn-xs dropdown-toggle" type="button" data-toggle="dropdown"><i class="fa fa-ellipsis-h"></i></button>
                    <div class="dropdown-menu dropdown-menu-right">
                        <a class="dropdown-item" href="{{ admin_url('menus/edit/'.$m->menu_id) }}">Edit</a>
                        <button class="dropdown-item pmd-stock-toggle" data-menu-id="{{ $m->menu_id }}">{{ $stockOut ? 'Stock in' : 'Stock out' }}</button>
                        <button class="dropdown-item pmd-status-toggle" data-menu-id="{{ $m->menu_id }}">{{ $disabled ? 'Enable' : 'Disable' }}</button>
                    </div>
                </div>
                <div class="pmd-menu-card-handle"><i class="fa fa-grip-vertical"></i></div>
                <div class="pmd-menu-img-wrap"><img src="{{ $img }}" alt="{{ e($m->menu_name) }}"></div>
                <div class="pmd-menu-meta text-center">
                    <div class="pmd-menu-name">{{ $m->menu_name }}</div>
                    <div class="pmd-menu-price">{{ currency_format($m->menu_price) }}</div>
                    <div class="pmd-menu-category">{{ $cat->name ?: 'Uncategorized' }}</div>
                    <div class="pmd-menu-tags">
                        @if($disabled)<span class="badge badge-secondary">Disabled</span>@endif
                        @if($stockOut)<span class="badge badge-danger">Out of stock</span>@endif
                        @if(!empty($m->is_halal))<span class="badge badge-light">🕌</span>@endif
                        @if(!empty($m->is_vegetarian))<span class="badge badge-light">🥗</span>@endif
                        @if(!empty($m->is_vegan))<span class="badge badge-light">🌱</span>@endif
                        @if($m->allergens && $m->allergens->count())<span class="badge badge-light">⚠️</span>@endif
                        @if(isset($m->spice_level) && $m->spice_level !== null)<span class="badge badge-light">🌶️</span>@endif
                    </div>
                </div>
            </article>
        @endforeach
    </div>

    <details class="mt-3"><summary><strong>Show advanced table view</strong></summary><div class="mt-2">{!! $this->renderList() !!}</div></details>
</div>
<style>
.pmd-toolbar-main{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.pmd-board-toolbar{display:flex;gap:8px;align-items:center;margin-bottom:8px}.pmd-category-buttons{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.pmd-category-add{text-decoration:none}
.pmd-menu-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}@media(max-width:760px){.pmd-menu-grid{grid-template-columns:1fr}}
.pmd-menu-card{position:relative;background:#fff;border:1px solid #e8edf3;border-radius:12px;box-shadow:0 6px 14px rgba(29,53,87,.08);padding:8px;transition:all .15s ease}.pmd-menu-card.is-selected{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.2)}
.pmd-menu-card.is-draggable{cursor:move}.pmd-menu-card.is-dragging{opacity:.65;transform:scale(.98)}.pmd-menu-card-handle{display:none;position:absolute;left:10px;top:9px;color:#8b98a9}.pmd-menu-card.is-draggable .pmd-menu-card-handle{display:block}
.pmd-menu-img-wrap{height:124px;display:flex;align-items:center;justify-content:center;background:#f3f6fa;border-radius:9px;padding:4px}.pmd-menu-img-wrap img{width:100%;height:100%;object-fit:contain;max-height:116px}
.pmd-menu-name{font-weight:700;font-size:14px;line-height:1.25;min-height:34px;display:flex;align-items:center;justify-content:center}.pmd-menu-price{font-weight:700;color:#1f7a4c;font-size:13px}.pmd-menu-category{font-size:11px;color:#7a8799}.pmd-menu-tags{display:flex;justify-content:center;gap:4px;flex-wrap:wrap;margin-top:6px}.pmd-menu-tags .badge{font-size:10px;padding:3px 6px}
.pmd-card-menu{position:absolute;right:8px;top:8px;z-index:3}.pmd-select-dot{display:none;position:absolute;left:10px;top:10px;z-index:4}.pmd-select-dot input{display:none}.pmd-select-dot span{width:16px;height:16px;border:2px solid #9ca3af;border-radius:50%;display:block;background:#fff}.pmd-select-dot input:checked+span{background:#3b82f6;border-color:#3b82f6}
.pmd-menu-card.select-mode .pmd-select-dot{display:block}.pmd-menu-card.is-disabled{opacity:.65}.pmd-menu-card.is-disabled .pmd-menu-img-wrap img{filter:grayscale(100%)}.pmd-menu-card.is-hidden{display:none}
</style>
<script>
(function(){const grid=document.getElementById('pmd-menu-grid'); if(!grid) return; const toggleBtn=document.getElementById('pmd-layout-toggle'); const selectBtn=document.getElementById('pmd-select-toggle'); const saveBtn=document.getElementById('pmd-menu-save-order'); const searchInput=document.getElementById('pmd-menu-search'); const warning=document.getElementById('pmd-menu-filter-warning'); const stateEl=document.getElementById('pmd-menu-order-state'); const countEl=document.getElementById('pmd-selection-count'); const catWrap=document.getElementById('pmd-category-buttons');
let editMode=false, selectMode=false, dirty=false, dragCard=null; const cards=()=>Array.from(grid.querySelectorAll('.pmd-menu-card')); const activeCategory=()=>catWrap.querySelector('.category-btn.active')?.dataset.category||'all';
function syncMode(){const filtered=activeCategory()!=='all'; warning.style.display=filtered?'block':'none'; cards().forEach(c=>{c.draggable=editMode&&!filtered;c.classList.toggle('is-draggable',editMode&&!filtered);c.classList.toggle('select-mode',selectMode); c.querySelector('.pmd-card-menu').style.display=editMode?'none':'';}); if(toggleBtn) toggleBtn.disabled=filtered; saveBtn.style.display=(editMode||dirty)?'':'none'; saveBtn.disabled=!dirty||!editMode||filtered; if(!dirty) stateEl.textContent='Layout is saved'; countEl.style.display=selectMode?'':'none'; }
function applyFilter(){const q=(searchInput.value||'').trim().toLowerCase(),cat=activeCategory(); cards().forEach(c=>{const okCat=cat==='all'||c.dataset.categoryId===cat;const okQ=!q||(c.dataset.menuName||'').includes(q); c.classList.toggle('is-hidden',!(okCat&&okQ));}); syncMode();}
catWrap.addEventListener('click',e=>{const b=e.target.closest('.category-btn[data-category]'); if(!b) return; catWrap.querySelectorAll('.category-btn[data-category]').forEach(x=>x.classList.remove('active')); b.classList.add('active'); applyFilter();});
searchInput.addEventListener('input',applyFilter);
if(toggleBtn) toggleBtn.addEventListener('click',()=>{if(toggleBtn.disabled)return; editMode=!editMode; if(editMode&&selectMode){selectMode=false;selectBtn.classList.remove('btn-primary');selectBtn.classList.add('btn-outline-secondary');} toggleBtn.textContent=editMode?'Done editing':'Edit Layout'; if(dirty) stateEl.textContent='Unsaved items order'; syncMode();});
selectBtn.addEventListener('click',()=>{if(editMode) return; selectMode=!selectMode; selectBtn.classList.toggle('btn-primary',selectMode); selectBtn.classList.toggle('btn-outline-secondary',!selectMode); cards().forEach(c=>{if(!selectMode){const ch=c.querySelector('.pmd-select-checkbox');ch.checked=false;c.classList.remove('is-selected');}}); updateSelection(); syncMode();});
function updateSelection(){const selected=cards().filter(c=>c.querySelector('.pmd-select-checkbox').checked).length; countEl.textContent=selected+' selected'; cards().forEach(c=>c.classList.toggle('is-selected',c.querySelector('.pmd-select-checkbox').checked));}
grid.addEventListener('change',e=>{if(e.target.classList.contains('pmd-select-checkbox')) updateSelection();});
cards().forEach(card=>{card.addEventListener('dragstart',e=>{if(!editMode)return e.preventDefault();dragCard=card;card.classList.add('is-dragging');});card.addEventListener('dragend',()=>card.classList.remove('is-dragging'));card.addEventListener('dragover',e=>{if(!editMode)return;e.preventDefault();});card.addEventListener('drop',e=>{e.preventDefault();if(!editMode||!dragCard||dragCard===card)return;const after=(e.clientY-card.getBoundingClientRect().top)>card.offsetHeight/2; if(after)card.after(dragCard); else card.before(dragCard); dirty=true; stateEl.textContent='Unsaved items order'; syncMode();});});
saveBtn.addEventListener('click',()=>{const ordered=cards().map(c=>c.dataset.menuId).filter(Boolean);const body=ordered.map(id=>'ordered_ids[]='+encodeURIComponent(id)).join('&')+'&_handler=onSaveCardOrder';fetch(window.location.pathname,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8','X-CSRF-TOKEN':document.querySelector('meta[name="csrf-token"]')?.content||''},body}).then(r=>r.json()).then(j=>{if(j&&j.ok){dirty=false;stateEl.textContent='Items order saved';syncMode();}else stateEl.textContent='Save failed';}).catch(()=>stateEl.textContent='Save failed');});
function postToggle(handler,id){const body='_handler='+handler+'&menu_id='+encodeURIComponent(id); fetch(window.location.pathname,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8','X-CSRF-TOKEN':document.querySelector('meta[name="csrf-token"]')?.content||''},body}).then(r=>r.json()).then(j=>{ if(j&&j.ok){ location.reload(); } else { alert(j.message||'Action failed'); }}).catch(()=>alert('Action failed')); }
grid.addEventListener('click',e=>{const s=e.target.closest('.pmd-status-toggle'); if(s){postToggle('onToggleMenuStatus',s.dataset.menuId);} const t=e.target.closest('.pmd-stock-toggle'); if(t){postToggle('onToggleMenuStock',t.dataset.menuId);} });
applyFilter();
})();
</script>
