<div class="breadcrumb-custom"
    style="background-image: url({{ $this->theme->header_breadcrumb ? uploads_url($this->theme->header_breadcrumb) : site_url('/themes/typical/assets/images/pattern7.png') }})"
    >
    <div class="col-full ms-auto me-auto ps-3 pe-3">
        <h1 class="breadcrumb-heading">
            @lang($this->page->title) </h1>
        <div class="nav-breadcrumb d-block">
            <a href="{{ page_url('home') }}">@lang('main::lang.menu_home')</a>
            <span class="breadcrumb-separator">
                /
            </span>
            @lang($this->page->title)
        </div>
    </div>
</div>