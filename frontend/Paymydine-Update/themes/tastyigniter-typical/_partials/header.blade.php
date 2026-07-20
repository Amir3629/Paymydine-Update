---
description: ''
---
<div class="container-fluid pe-0 ps-0">
    
    <button class="navbar-toggler collapsed"
            type="button" 
            data-bs-toggle="collapse"
            data-bs-target="#navbarMainHeader"
            aria-controls="navbarNavAltMarkup"
            aria-expanded="false"
            aria-label="Toggle navigation">
            <span class="toggler-icon top-bar"></span>
            <span class="toggler-icon middle-bar"></span>
            <span class="toggler-icon bottom-bar"></span>
    </button>
    @partial('nav/logo')
    <div class="icon-wrapper-phone">
        @if ($contactLocation = $contact->location)
            <a class="icon-phone-home" href="tel:{{ $contactLocation->getTelephone() }}">
                <i aria-hidden="true" class="poco-icon- poco-icon-phone-plus"></i> 
            </a>
        @endif
    </div>
    <div class="collapse navbar-collapse" id="navbarMainHeader">
        @partial('nav/main_menu', ['items' => $mainMenu->menuItems()])
    </div>
    <div class="element-width hidden-phone">
        @partial('nav/right_menu')
    </div>
</div>
</nav>
<!-- Cart  -->
<div id="sidebar" class="header-cart">
    <div class="cart-heading">
        <span class="cart-title">Shopping cart</span>
        <a class="close-cart">close</a>
    </div>
    @if (!$pageIsCheckout and !$pageIsCart)
    <div class="div_cart">
        <div class="cart_content">
            @partial('cartBox::default')
        </div> 
    </div>       
    @endif
</div>