---
title: main::lang.checkout.success.title
layout: default
permalink: /checkout/success/:hash?

'[orderPage]':
    hideReorderBtn: 1

'[localReview]':

'[localMenu]':
    forceRedirect: 0
---
<div class="col-full">
  <div class="row">
    <div class="reservation-home mb-0 ">
      <article class="mx-auto ticket">
        <header class="ticket__wrapper">
          <div class="ticket__header">
            @lang('admin::lang.orders.text_invoice_thank_you') 🎟
          </div>
        </header>
        <div class="ticket__divider">
          <div class="ticket__notch"></div>
          <div class="ticket__notch ticket__notch--right"></div>
        </div>
        <div class="ticket__body">
          @component('orderPage')
      </article>   
</div>
</div>
</div>
