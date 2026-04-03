---
title: main::lang.checkout.title
layout: default
permalink: /checkout

'[account]':

'[localMenu]':
    forceRedirect: 0

'[localSearch]':
    hideSearch: 1

'[localInfo]':

'[localBox]':
    paramFrom: location
    showLocalThumb: 0

'[cartBox]':
    pageIsCheckout: true

'[checkout]':
    showCountryField: 0
'[localList]':
---
@partial('breadcrumb')
<div class="col-full">
    <div class="row py-4">
        <div class="col col-lg-7">
            @partial('localBox::box_checkout')
            <div class="card my-1">
                <div class="card-body">
                    @partial('account/welcome')
                </div>
            </div>
            <div class="card">
                <div class="card-body">
                    @component('checkout')
                </div>
            </div>
        </div>

        <div class="col-lg-5">
            <div id="order_checkout" class="affix-cart order_checkout">
                <h3 id="order_review_heading">@lang('admin::lang.orders.text_tab_general')</h3>
                @partial('cartBox::checkout_cart')
            </div>                                    
        </div>
    </div>
</div>

@partial('locations_modal')