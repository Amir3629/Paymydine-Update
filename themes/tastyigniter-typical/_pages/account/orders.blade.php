---
title: main::lang.account.orders.title
layout: account
permalink: /account/orders

'[accountOrders]':

'[localMenu]':
    forceRedirect: 0
---

<div class="account-user">
    <div class="row">
        <div class="col-md-3">
            @partial('account/sidebar')
        </div>
        
        <div class="col-md-9">
            <div class="p-md-5">
                <div class="panel p-md-5">
                    <div class="panel-body">
                        @component('accountOrders')
                    </div>
                </div>
            </div>
        </div>        
    </div>
</div>