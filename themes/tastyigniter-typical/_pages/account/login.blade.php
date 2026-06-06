---
title: 'main::lang.account.login.title'
layout: default
permalink: /login
'[session]':
    security: guest
'[account]':
    accountPage: account/account
    addressPage: account/reset
    ordersPage: account/orders
    reservationsPage: account/reset
    reviewsPage: account/reset
    inboxPage: account/reset
    loginPage: account/login
    activationPage: account/register
    agreeRegistrationTermsPage: 1
    redirectPage: local/menus
description: ''

'[localMenu]':
    forceRedirect: 0
---
@partial('breadcrumb')

<div class="col-full">
    <div class="row">
        <div class="col-sm-6 mx-auto my-5">
            <div class="card card-login">
                <div class="">
                    <h1 class="card-title h4 mb-4 font-weight-normal">
                        @lang('main::lang.account.login.text_login')
                    </h1>

                    @partial('account::login')

                </div>
            </div>
            <div class="px-2 px-sm-5">
                <p class="float-start LostPassword">
                    <a href="{{ site_url('account/reset') }}">
                        @lang('main::lang.account.login.text_forgot')
                    </a>
                </p>
                @if ((bool)$canRegister)
                <p class="float-end LostPassword">
                    <a href="{{ site_url('account/register') }}">@lang('main::lang.account.login.button_register')</a>
                </p>
                @endif
            </div>
        </div>
    </div>
</div>