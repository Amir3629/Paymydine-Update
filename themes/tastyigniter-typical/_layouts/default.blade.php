---
description: 'Default layout'
'[session]':
    security: all
'[staticMenu mainMenu]':
    code: typical-main-menu
'[staticMenu rightMenu]':
    code: typical-right-menu
'[staticMenu footerMenu]':
    code: footer-menu
'[newsletter]': {  }
'[account]':
'[cartBox]':
    checkStockCheckout: 1
    showCartItemThumb: 1
    pageIsCheckout: 0
    pageIsCart: 0
'[contact]':
'[localBox]':
    paramFrom: location
    showLocalThumb: 0
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
        <nav class="navbar navbar-light navbar-top navbar-expand-lg fixed-top">
            @partial('header')
    </header>    

    <main role="main">
        <div id="page-wrapper">
            @page
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