<?php
    $sessionData = session()->all();
    // print_r($sessionData);
    if(isset($_GET['uqr'])){
        session()->forget('cart');
    }
    $currentUrl = "http://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
    parse_str(parse_url($currentUrl, PHP_URL_QUERY), $queryParams);
    unset($queryParams['data']);
    unset($queryParams['uqr']);
    $baseUrl = strtok($currentUrl, '?');
    $newQueryString = http_build_query($queryParams);
    $cleanUrl = $newQueryString ? "$baseUrl?$newQueryString" : $baseUrl;
    if (isset($queryParams['table'])) {
        $tValue = $queryParams['table'];
      //  $qrValue = $queryParams['qr'];
        $_SESSION['table'] = $tValue;
   //     $_SESSION['qr'] = $qrValue;
        $_SESSION['full_url'] = $cleanUrl;
    }
?>
<ul class="nav flex-column nav-categories product-categories">
    <li class="nav-item">
        <a
            class="nav-link font-weight-bold{{ $selectedCategory ? '' : ' active' }}"
            href="{{ page_url('local/menus', ['category' => null]) }}"
        >
        <i class="poco-icon-cheeseburger"></i>
        <span>@lang('igniter.local::default.text_all_categories')</span>
    </a>

    </li>

    @partial('@items', ['categories' => $categories->toTree()])
</ul>
<script>

$(document).on('click', '#cart-box-modal button[type="submit"]', function() {
function removeURLParameter(url, parameter) {
    const urlObj = new URL(url);
    urlObj.searchParams.delete(parameter);
    return urlObj.toString();
}
function updateURLBasedOnCartCount() {
    const cartCount = 1;
    if (cartCount > 0) {
        const currentURL = window.location.href;
        const updatedURL = removeURLParameter(currentURL, 'uqr');
        if (currentURL !== updatedURL) {
            window.history.replaceState({}, document.title, updatedURL);
        }
    }
}
updateURLBasedOnCartCount();
});
</script>
