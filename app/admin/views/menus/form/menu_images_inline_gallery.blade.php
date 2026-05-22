@php
$galleryRows = collect($formModel->menu_images ?? [])->sortBy('sort_order')->values();
$isPreview = method_exists($this, 'previewMode') ? $this->previewMode : false;
@endphp
<div id="menu-inline-gallery" class="menu-inline-gallery">
    <div class="menu-inline-gallery__header">Additional Images</div>
    <div class="menu-inline-gallery__list" data-gallery-list>
        @foreach($galleryRows as $index => $row)
            @php
                $path = (string)($row->image_path ?? '');
                $sortOrder = (int)($row->sort_order ?: ($index + 1));
                $thumb = $path ? media_url($path) : '';
            @endphp
            <div class="menu-inline-gallery__item" data-gallery-item>
                <div class="menu-inline-gallery__thumb-wrap"><img class="menu-inline-gallery__thumb" src="{{ $thumb }}" alt="Additional image"></div>
                <div class="menu-inline-gallery__controls">
                    <input type="number" min="1" class="form-control form-control-sm" data-gallery-order name="menu_images_inline[{{ $index }}][sort_order]" value="{{ $sortOrder }}" {{ $isPreview ? 'disabled' : '' }}>
                    @unless($isPreview)<button type="button" class="btn btn-outline-danger btn-sm" data-gallery-remove><i class="fa fa-times"></i></button>@endunless
                </div>
                <input type="hidden" data-gallery-path name="menu_images_inline[{{ $index }}][image_path]" value="{{ $path }}">
            </div>
        @endforeach
    </div>
    @unless($isPreview)
    <button type="button" class="btn btn-outline-primary btn-sm menu-inline-gallery__add" data-gallery-add title="Add image"><i class="fa fa-plus"></i></button>
    @endunless
</div>
<style>#menu-inline-gallery .menu-inline-gallery__list{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}#menu-inline-gallery .menu-inline-gallery__item{width:96px;border:1px solid #ddd;border-radius:8px;padding:6px;background:#fff}#menu-inline-gallery .menu-inline-gallery__thumb-wrap{width:82px;height:68px;overflow:hidden;border-radius:6px;background:#f7f7f7;margin-bottom:6px}#menu-inline-gallery .menu-inline-gallery__thumb{width:100%;height:100%;object-fit:cover}#menu-inline-gallery .menu-inline-gallery__controls{display:flex;gap:4px;align-items:center}#menu-inline-gallery .menu-inline-gallery__controls input{height:28px;padding:2px 6px;font-size:12px}#menu-inline-gallery .menu-inline-gallery__add{width:32px;height:32px;padding:0;border-radius:6px}#menu-inline-gallery .menu-inline-gallery__header{font-size:12px;color:#666;margin-bottom:6px}</style>
@unless($isPreview)
<script>
(function($){var root=document.getElementById('menu-inline-gallery');if(!root||root.dataset.initialized==='1')return;root.dataset.initialized='1';function reindex(){root.querySelectorAll('[data-gallery-item]').forEach(function(item,idx){var path=item.querySelector('[data-gallery-path]');var order=item.querySelector('[data-gallery-order]');path.name='menu_images_inline['+idx+'][image_path]';order.name='menu_images_inline['+idx+'][sort_order]';if(!order.value||Number(order.value)<1)order.value=idx+1;});}root.addEventListener('click',function(e){var removeBtn=e.target.closest('[data-gallery-remove]');if(removeBtn){removeBtn.closest('[data-gallery-item]').remove();reindex();return;}var addBtn=e.target.closest('[data-gallery-add]');if(!addBtn)return;if(!$.ti||!$.ti.mediaManager){$.ti.flashMessage({text:'Media manager widget is not loaded.',class:'danger'});return;}new $.ti.mediaManager.modal({alias:'mediamanager',selectMode:'single',chooseButton:true,chooseButtonText:'Select',onInsert:function(items){if(!items||!items.length)return;var selected=items[0];var holder=$(selected).closest('.media-item');var data=holder.data('mediaItemData')||{};var path=data.path||holder.attr('data-media-item-path')||'';var publicUrl=data.publicUrl||holder.attr('data-media-item-url')||'';if(!path)return;var idx=root.querySelectorAll('[data-gallery-item]').length;var div=document.createElement('div');div.className='menu-inline-gallery__item';div.setAttribute('data-gallery-item','1');div.innerHTML='<div class="menu-inline-gallery__thumb-wrap"><img class="menu-inline-gallery__thumb" src="'+publicUrl+'" alt="Additional image"></div><div class="menu-inline-gallery__controls"><input type="number" min="1" class="form-control form-control-sm" data-gallery-order name="menu_images_inline['+idx+'][sort_order]" value="'+(idx+1)+'"><button type="button" class="btn btn-outline-danger btn-sm" data-gallery-remove><i class="fa fa-times"></i></button></div><input type="hidden" data-gallery-path name="menu_images_inline['+idx+'][image_path]" value="'+path+'">';root.querySelector('[data-gallery-list]').appendChild(div);reindex();this.hide();}});});})(window.jQuery);
</script>
@endunless
