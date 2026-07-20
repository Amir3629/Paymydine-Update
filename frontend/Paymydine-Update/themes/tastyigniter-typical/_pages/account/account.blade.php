---
title: main::lang.account.title
layout: account
permalink: /account

'[localBox]':

'[cartBox]':

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
                        @component('account')
                    </div>
                </div>
            </div>
        </div>        
    </div>
</div>