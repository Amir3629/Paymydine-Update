---
description: 'Local layout'
'[session]':
    security: all
'[staticMenu mainMenu]':
    code: typical-main-menu
'[staticMenu rightMenu]':
    code: typical-right-menu
'[staticMenu footerMenu]':
    code: footer-menu
'[newsletter]': {  }
'[localSearch]': null
'[localInfo]': null
'[localBox]':
    paramFrom: location
    showLocalThumb: 0
'[categories]': null
'[cartBox]':
    checkStockCheckout: 1
    showCartItemThumb: 1
    pageIsCheckout: 0
    pageIsCart: 0
'[contact]': null
'[account]': null
---
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="{{ App::getLocale() }}" class="h-100">
<head>
    @partial('head')
</head>

<body class="d-flex flex-column h-100 {{ $this->page->bodyClass }}">

    @partial('preloader')

    <header class="header">
        <nav class="navbar navbar-light navbar-top navbar-expand-lg fixed-top">
            @partial('header')
        </header>
        @partial('nav/local_header')
        <main role="main" class="pt-0" style="z-index: 1;">
            <div id="page-wrapper">
                <div class="col-full">
                    <div class="row py-4">
                        <div class="col-lg-9">
                            <div class="content">
                                @partial('localBox::container')                            
                                
                                @page
                            </div>
                        </div>
                        <div class="col-lg-3 d-none d-lg-inline-block">
                            <div class="categories affix-categories">
                                <span class="categories-title">Categories</span>
                                @component('categories')
                            </div>
                        </div>                    
                        
                    </div>
                </div>
            </div>
        </main>
        
        <footer class="footer mt-auto d-none d-lg-block">
            @partial('footer')
        </footer>
        
        @partial('button_bottom')
        
        <div id="notification">
            @partial('flash')
        </div>
        @partial('eucookiebanner')
        @partial('scripts')
        <div class="overlay"></div>
    </body>
    </html>