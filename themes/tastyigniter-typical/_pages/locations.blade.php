---
title: main::lang.locations.title
layout: default
permalink: /locations

'[localSearch]':

'[localList]':

'[localMenu]':
    forceRedirect: 0
---
@partial('breadcrumb')
<div class="col-full">
    <div class="row g-4">

        <div class="location-list">
            @partial('localList::search')

            <div class="row">
                
                    @partial('localList::filter')
                
                    @partial('localList::sorting')
                
            </div>

            @component('localList')
        </div>
    </div>
</div>