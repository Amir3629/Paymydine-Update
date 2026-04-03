---
title: main::lang.account.reservations.title
layout: account
permalink: /account/reservations/:hash?

'[accountReservations]':

'[localReview]':
    reviewableType: reservation

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
                        @component('accountReservations')
                    </div>
                </div>
            </div>
        </div>        
    </div>
</div>