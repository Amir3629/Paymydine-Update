---
title: main::lang.contact.title
layout: default
permalink: /contact

'[contact]':

'[localMenu]':
    forceRedirect: 0
---
@partial('breadcrumb')
<div class="col-full">
    <div class="row">
        @if ($contactLocation = $contact->location)
        <div class="col-md-12 m-contact">
            <h1 class="heading-title text-center text-md-start">@lang('igniter.frontend::default.contact.text_contact_us')</h1>
            <p class="text-center text-md-start">@lang('igniter.frontend::default.contact.text_find_us'): {{ $contactLocation->getName() }}!!!</p>
        </div>
        <div class="row">
            <div class="col-md-3">
                <div class="icon-box-icon mb-5">
                    <span class="icon-c">
                        <i aria-hidden="true" class="poco-icon- poco-icon-mobile-android-alt"></i>
                    </span>
                </div>
                <div class="elementor-icon-box-content">
                    <h3 class="contact-icon-box-title"> <span class="text-white">@lang('igniter.reservation::default.label_telephone'): </span></h3>
                    <p class="elementor-icon-box-description">{{ $contactLocation->getTelephone() }}</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="icon-box-icon mb-5">
                    <span class="icon-c elementor-animation-">
                        <i aria-hidden="true" class="poco-icon- poco-icon-map-marker-check"></i>
                    </span>
                </div>
                <div class="elementor-icon-box-content">
                    <h3 class="contact-icon-box-title"> <span class="text-white">@lang('admin::lang.locations.text_tab_title_address'): </span></h3>
                    <p class="elementor-icon-box-description">{!! format_address($contactLocation->getAddress()) !!}</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="icon-box-icon mb-5">
                    <span class="icon-c col-1">
                        <i aria-hidden="true" class="poco-icon- poco-icon-envelope"></i>
                    </span>
                </div>
                <div class="elementor-icon-box-content">
                    <h3 class="contact-icon-box-title"> <span class="text-white">@lang('admin::lang.label_email'): </span></h3>
                    <p class="elementor-icon-box-description">{!! $contactLocation->getEmail() !!}</p>
                </div>
            </div>
        </div>
    </div>
    @endif

    <div class="card card-contact">
        <div class="row">
            <div class="col-sm-6">
                <iframe
                    src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d11880.492291371422!2d12.4922309!3d41.8902102!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x28f1c82e908503c4!2sColosseo!5e0!3m2!1sit!2sit!4v1524815927977"
                    width="100%" height="100%" frameborder="0" style="border:0" allowfullscreen></iframe>
            </div>
            <div class="col-sm-6">
                <div class="custom-form-contact">
                    <h4 class="heading-title mb-3">@lang('igniter.frontend::default.contact.text_summary')</h4>
                    @component('contact')
                </div>
            </div>
        </div>
    </div>
</div>
</div>