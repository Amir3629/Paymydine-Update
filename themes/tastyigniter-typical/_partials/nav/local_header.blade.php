<section class="store-image store__background-image">
    @if ($locationCurrent->hasMedia('thumb'))
    <img src="{{ $locationCurrent->getThumb() }}"
         class="store-image__img">
         @else
         <img src="{{ site_url('/themes/typical/assets/images/localmenu.jpg') }}"
         class="store-image__img">
    @endif
    <div class="store-image__overlay"></div>
</section>
