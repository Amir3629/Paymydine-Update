$(window).resize(function() {
    if (window.matchMedia('(min-width: 768px)').matches) {
        
        $(this).on("scroll", function() {
            
            if ($(this).scrollTop() > 10) {
                $('.navbar-top').addClass('shrink');
                $('.img-logo').addClass('shrink');
            } else {
                $('.navbar-top').removeClass('shrink');
                $('.img-logo').removeClass('shrink');
            };
        });
    }
});
$(document).ready(function () {
    $('.close-cart, .overlay').on('click', function () {
        $('.header-cart').removeClass('active');
        $('.overlay').removeClass('active');
    });

    $('#sidebarCollapse').on('click', function () {
        $('.header-cart').addClass('active');
        $('.overlay').addClass('active');
        $('.collapse.in').toggleClass('in');
        $('a[aria-expanded=true]').attr('aria-expanded', 'false');
    });
});


$('#addressModal').appendTo("body");
$('#infoModal').appendTo("body");
$('#locationsModal').appendTo("body");

var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-tooltip="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
return new bootstrap.Tooltip(tooltipTriggerEl,{
    container: '.container-fluid'
 });
});
$(".categories-home, .table-responsive").mCustomScrollbar({
    axis:"x",
    theme:"rounded-dots-dark",
    autoHideScrollbar: true,
    scrollButtons:{ enable: true }
});


/*
 * Star rating class
 */

$('[data-control="star-rating"]').raty('set', { 
    starOff: 'bi bi-star',
    starOn: 'bi bi-star-fill',
    starType: 'i'
});

var loader = document.getElementById("preloader");

window.addEventListener("load", function(){
    loader.style.display = "none";
});