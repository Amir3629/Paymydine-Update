---
title: main::lang.account.orders.title
layout: default
permalink: /account/order/:hash?

'[account]':

'[orderPage]':

'[localReview]':

'[localMenu]':
    forceRedirect: 0
---

<div class="account-user">
    <div class="row">
        @if ($customer)
            <div class="col-sm-3">
                @partial('account/sidebar')
            </div>
        @endif
        
        <div class="col-sm-9 {{ $customer ? '' : ' m-auto' }}">
            <div class="p-md-5">
                <div class="panel p-md-5">
                    <div class="panel-body">
                        @component('orderPage')
                    </div>
                </div>
            </div>
        </div>        
    </div>
</div>