---
title: 'main::lang.home.title'
permalink: /
description: ''
layout: default
'[slider]':
    code: home-slider
    height: 336vh
    effect: ease
    delayInterval: 5000.0
    hideControls: 0
    hideIndicators: 0
    hideCaptions: 0
'[localSearch]':
    hideSearch: 0
'[categories]': null
'[booking]':
    useCalendarView: 0
    weekStartOn: 0.0
    minGuestSize: 2.0
    maxGuestSize: 20.0
    timeSlotsInterval: 120.0
    showLocationThumb: 0
    telephoneIsRequired: 1
    locationThumbWidth: 95.0
    locationThumbHeight: 80.0
    bookingPage: reservation/reservation
    defaultLocationParam: default
    successPage: reservation/success
    localNotFoundPage: local/menus
'[localMenu]':
    isGrouped: 0
    collapseCategoriesAfter: 5.0
    menusPerPage: 20.0
    showMenuImages: 0
    menuImageWidth: 95.0
    menuImageHeight: 80.0
    menuCategoryWidth: 1240.0
    menuCategoryHeight: 256.0
    defaultLocationParam: principal
    localNotFoundPage: local/menus
    hideMenuSearch: 0
    forceRedirect: 0
'[featuredItems]':
    title: 'Popular dishes'
    items: ['4', '5', '6']
    limit: 12.0
    itemsPerRow: 3
    itemWidth: 400.0
    itemHeight: 300.0
---
<div class="col-full">
    @component('slider')
    <div class="button-home position-absolute start-50 translate-middle">
        <a type="button" href="{{ restaurant_url('local/menus') }}" 
    class="btn btn-primary btn-lg">
        <span class="text-uppercase">@lang('admin::lang.menus.text_title')</span> 
        </a>
    </div>
    <div class="categories-home">
        <div class="categories-home-bu">
            @partial('categories::home')
        </div>    
    </div>
    <div class="reservation-home p-md-5">
        <div class="card blue-grey darken-1 p-sm-5 p-5">
            <div class="card-content text-center">
                <span class="card-title norican-heading-title">Has una Reserva!</span>
                    @component('booking')
            </div>        
        </div>    
    </div>
        
    @component('featuredItems')
</div>