---
description: 'Static layout for static pages'
'[session]':
    security: all
'[staticPage]': null
'[staticMenu mainMenu]':
    code: typical-main-menu
'[staticMenu rightMenu]':
    code: typical-right-menu
'[staticMenu footerMenu]':
    code: footer-menu
'[staticMenu pagesSideMenu]':
    code: pages-menu
'[newsletter]': {  }
'[contact]': null
'[account]': null
'[cartBox]':
    checkStockCheckout: 1
    showCartItemThumb: 1
    pageIsCheckout: 0
    pageIsCart: 0
'[localSearch]':
    hideSearch: 0
'[localMenu]':
    forceRedirect: 0
---
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="{{ App::getLocale() }}" class="h-100">
<head>
    @partial('head')
</head>
<body class="d-flex flex-column h-100 {{ $this->page->bodyClass }}">

    @partial('preloader')

    <header class="header">
        <nav class="navbar navbar-light navbar-top navbar-expand-md fixed-top">
            @partial('header')
    </header>
    <main role="main">
    @partial('breadcrumb')
        <div id="page-wrapper">
            <div class="col-full pb-5">
                    <div class="row">
                        <div class="col-sm-3 pb-2">
                            @partial('nav/pages_menu')
                        </div>

                        <div class="col-sm-9">
                            <div class="card">
                                <div class="card-body">
                                    @page
                                </div>
                            </div>
                        </div>
                </div>
            </div>
        </div>
    </main>

    <footer class="footer mt-auto">
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