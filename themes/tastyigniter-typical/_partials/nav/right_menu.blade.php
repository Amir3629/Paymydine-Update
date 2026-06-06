---
description: ''
---
<div class="column-wrap">
    <div class="widget-wrap">
        <div class="main-widget-container">
            <div class="widget-container">
                <div class="icon-box-wraper">
                    <div class="icon-box-icon">
                        <span class="eicon animation-">
                            <i aria-hidden="true" class="poco-icon-scooter"></i>
                        </span>
                    </div>
                    <div class="icon-box-content">
                        <h3 class="icon-box-title"> <span>Call and Order in</span></h3>
                        @if ($contactLocation = $contact->location)
                        <p class="icon-box-description" type="tel">{{ $contactLocation->getTelephone() }}</p>
                        @endif
                    </div>
                </div>
            </div>
        </div>
        <div class="main-container-buttons">
            <div class="header-group-action">
                <div class="site-header-address">
                    <a href="#" class="tooltip-test button-search-popup" 
                    data-bs-toggle="modal" 
                    data-bs-target="#addressModal"
                    data-bs-tooltip="tooltip" 
                    data-bs-placement="bottom"
                    title="@lang('admin::lang.orders.label_delivery_address')">
                    <i class="bi bi-geo-alt-fill"></i>
                </a>
            </div>
            <div class="site-header-account dropdown-p">
                <a href="{{ site_url('account/login') }}">
                    <i class="poco-icon-user"></i>
                </a>
                <div class="dropdown-menu dropdown-account">
                    <div class="account-wrap">
                        <div class="account-inner ">
                            @if (!Auth::isLogged())
                            <div class="p-4">
                                <div class="login-form-head">
                                    <span class="login-form-title">@lang('main::lang.account.register.title')</span>
                                    <span>
                                        <a class="register-link"
                                        href="{{ site_url('account/register') }}"
                                        data-bs-tooltip="tooltip" 
                                        data-bs-placement="bottom"   
                                        title="@lang('main::lang.account.register.title')">@lang('main::lang.account.register.title')
                                    </a> 
                                </span>
                            </div>
                            @partial('account::login')
                            <div class="login-form-bottom">
                                <a href="{{ site_url('account/reset') }}" class="lostpass-link"
                                data-bs-tooltip="tooltip" 
                                data-bs-placement="top"  
                                title="Lost your password?">@lang('main::lang.account.login.text_forgot')</a>
                            </div>
                        </div>                        
                        @else
                        @php $items = $rightMenu->menuItems(); @endphp
                        @foreach ($items as $navItem)
                        @foreach ($navItem->items as $item)
                        <a
                        class="dropdown-item{{ ($item->isActive ? ' active' : '') }}"
                        href="{{ $item->url }}"
                        {!! $item->extraAttributes !!}
                        >@lang($item->title)</a>
                        @endforeach
                        @endforeach
                        @endif
                    </div>
                </div>
            </div>
        </div>
        <div class="site-header-cart menu">
            <a class="cart-contents" id="{{ !$pageIsCheckout ? 'sidebarCollapse' : '' }}"
            data-bs-tooltip="tooltip" 
            data-bs-placement="bottom"
            title="View your shopping cart">
                <span data-cart-count class="count">
                    {{ $cart->count() }}
                </span>
            </a>
        </div>
    </div>
</div>
</div>
</div>
