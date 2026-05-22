@php
$cards = \Admin\Models\Menus_model::with(['categories','media'])->orderBy('menu_priority','asc')->orderBy('menu_id','desc')->get();
@endphp
<div class="row-fluid">
    {!! $this->renderList() !!}
</div>
<div class="pmd-menu-card-grid-wrap">
  <h4>Visual Menu Grid</h4>
  <div id="pmd-menu-grid" class="pmd-menu-grid">
    <a class="pmd-menu-card pmd-add-card" href="{{ admin_url('menus/create') }}">+ Add New Item</a>
    @foreach($cards as $m)
      @php $img = $m->getThumb() ?: url('/app/admin/assets/images/default-image.png'); @endphp
      <div class="pmd-menu-card" draggable="true" data-menu-id="{{ $m->menu_id }}">
        <img src="{{ $img }}" alt="{{ e($m->menu_name) }}">
        <strong>{{ $m->menu_name }}</strong>
        <div>{{ currency_format($m->menu_price) }}</div>
        <small>{{ optional($m->categories->first())->name ?: 'Uncategorized' }} · {{ $m->menu_status ? 'Active':'Inactive' }}</small>
        <a href="{{ admin_url('menus/edit/'.$m->menu_id) }}">Edit</a>
      </div>
    @endforeach
  </div>
</div>
<style>.pmd-menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}.pmd-menu-card{border:1px solid #ddd;border-radius:10px;padding:8px;background:#fff}.pmd-menu-card img{width:100%;height:110px;object-fit:cover;border-radius:8px}.pmd-add-card{display:flex;align-items:center;justify-content:center;min-height:150px;border-style:dashed}</style>
<script>
(function(){const g=document.getElementById('pmd-menu-grid'); if(!g) return; let drag=null; g.querySelectorAll('.pmd-menu-card[draggable=true]').forEach(c=>{c.addEventListener('dragstart',()=>drag=c); c.addEventListener('dragover',e=>e.preventDefault()); c.addEventListener('drop',e=>{e.preventDefault(); if(!drag||drag===c)return; c.parentNode.insertBefore(drag,c); save();});});
function save(){const ids=[...g.querySelectorAll('.pmd-menu-card[data-menu-id]')].map(x=>x.dataset.menuId); fetch('{{ admin_url('menus') }}',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-CSRF-TOKEN':document.querySelector('meta[name=csrf-token]')?.content||''},body:'_handler=onSaveCardOrder&ordered_ids[]='+ids.join('&ordered_ids[]=')});}
})();
</script>