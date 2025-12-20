---
title: main::lang.account.address.title
layout: account
permalink: /account/address/:addressId?

'[accountAddressBook]':

'[localMenu]':
    forceRedirect: 0
---

<div class="account-user">
    <div class="row">
        <div class="col-sm-3">
            @partial('account/sidebar')
        </div>
        
        <div class="col-sm-9">
            <div class="p-md-5">
                <div class="panel p-md-5">
                    <div class="panel-body">
                        @component('accountAddressBook')
                    </div>
                </div>
            </div>
        </div>        
    </div>
</div>