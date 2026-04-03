---
title: 'main::lang.reservation.success.title'
layout: default
permalink: ':location/reservation/success/:hash?'
'[booking]':
    useCalendarView: 0
    minGuestSize: 2.0
    maxGuestSize: 20.0
    timeSlotsInterval: 15.0
    showLocationThumb: 0
    locationThumbWidth: 95.0
    locationThumbHeight: 80.0
    bookingPage: reservation/reservation
    successPage: reservation/success
    localNotFoundPage: home
description: ''
'[localMenu]': null
---
@partial('breadcrumb')
<div class="col-full">
    <div class="row justify-content-center">
        <div class="col col-sm-6 center-block">
            <div class="card card-contact custom-form-reserve">
            <h4 class="norican-heading-title elementor-size-default m-2">@lang(admin::lang.reservations.text_title')</h4>
                <div class="card-body">
                    @partial('booking::success')
                </div>
            </div>
        </div>
    </div>
</div>