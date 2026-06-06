---
title: 'main::lang.reservation.title'
layout: default
permalink: ':location/reservation'
'[account]': null

'[booking]':
    useCalendarView: 1
    minGuestSize: 2.0
    maxGuestSize: 20.0
    timeSlotsInterval: 120.0
    showLocationThumb: 0
    locationThumbWidth: 95.0
    locationThumbHeight: 80.0
    bookingPage: reservation/reservation
    successPage: reservation/success
description: ''


---
@partial('breadcrumb')
<div class="col-full">
    <div class="row justify-content-center">
        <div class="col col-sm-12 center-block">
            <div class="card mb-1">
                <div class="card-body">
                    @partial('account/welcome')
                </div>
            </div>
            <div class="card card-contact">
                <div class="row ">
                    <div class="col-md-6 image-reserve" 
                    style="background-image: url({{ $this->theme->reservation_image ? uploads_url($this->theme->reservation_image) : site_url('/themes/tastyigniter-typical/assets/images/reserva.jpeg') }})">                        
                    </div>
                    <div class="col-md-6 ">
                        <div class="custom-form-reserve justify-content-center d-flex m-3">
                            @component('booking')
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>