---
title: main::lang.local.gallery.title
layout: local
permalink: /:location?local/gallery

'[localGallery]':

'[localMenu]':

'[localList]':
---

<div class="nav-breadcrumb d-block mt-4">
    
    <a href="{{ page_url('local/menus') }}">{{ $locationCurrent->location_name }}</a>&nbsp;
    <span>
        <i class="poco-icon-angle-left"></i>&nbsp;
    </span>
    <a href="{{ page_url('local/gallery') }}">@lang('admin::lang.locations.text_tab_gallery')</a>&nbsp;
</div>

<div class="panel">
    <div class="panel-body">
        @component('localGallery')
    </div>
</div>
@partial('locations_modal')