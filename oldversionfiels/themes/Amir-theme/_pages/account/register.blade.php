---
title: 'main::lang.account.register.title'
permalink: /register
description: ''
layout: default

'[session]':
    security: guest

'[account]':
    agreeRegistrationTermsPage: 1

'[localMenu]':
    forceRedirect: 0
---

@partial('breadcrumb')

<div class="col-full">
    <div class="row">
        <div class="col-sm-6 mx-auto my-5">
            <div class="card card-register">
                <div class="">
                    <h1 class="card-title h4 mb-4 font-weight-normal">
                        @lang('main::lang.account.login.text_register')
                    </h1>
                    @partial('account::register')
                </div>
            </div>
        </div>
    </div>
</div>