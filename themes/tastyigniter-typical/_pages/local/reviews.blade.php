---
title: 'main::lang.local.reviews.title'
permalink: '/:location?local/reviews'
description: ''
layout: local

'[localReview]':
    pageLimit: 10
    sort: 'created_at asc'

'[localMenu]':

'[localList]':

---

<div style="padding-bottom: 45px;">
    <div class="nav-breadcrumb d-block mt-4">
        <i class="poco-icon-angle-left"></i>&nbsp;
        <a href="{{ page_url('local/menus') }}">{{ $locationCurrent->location_name }}</a>&nbsp;
        <span>
            /
        </span>
    
    </div>
    <h1 class="panel-title h4">
        {{ sprintf(lang('igniter.local::default.review.text_review_heading'), $locationCurrent->location_name) }}
    </h1>

    @component('localReview')
</div>
@partial('locations_modal')


