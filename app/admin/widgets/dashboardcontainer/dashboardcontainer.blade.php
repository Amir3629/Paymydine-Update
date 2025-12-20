
<div
    class=""
    data-control="dashboard-container"
    data-alias="{{ $this->alias }}"
    data-sortable-container="#{{ $this->getId('container-list') }}"
    data-date-range-format="{{ $dateRangeFormat }}"
>
    <div
        id="{{ $this->getId('container-toolbar') }}"
        class="toolbar dashboard-toolbar btn-toolbar"
        data-container-toolbar>
        {!! $this->makePartial('widget_toolbar') !!}
    </div>

    <div class="dashboard-widgets page-x-spacer">
        <div class="progress-indicator vh-100 d-flex flex-column">
            <div class="align-self-center text-center m-auto">
            @php
// Always use the base64 image from loaderimage file
use Illuminate\Support\Str;
$loaderImagePath = app_path('admin/assets/images/loaderimage');
$loader_logo = '';
if (file_exists($loaderImagePath)) {
    $loader_logo = file_get_contents($loaderImagePath);
    // Ensure it's a valid base64 data URI
    if (!Str::startsWith($loader_logo, 'data:')) {
        $loader_logo = 'data:image/png;base64,' . $loader_logo;
    }
}
@endphp
            <img src="{{ $loader_logo }}" alt="Loader Logo" style="max-width: 256px; max-height: 256px;">
                <i class="d-block" style="width: 256px;height: 256px;">
                </i>
                <br>
                <span class="spinner-border"></span>&nbsp;&nbsp;@lang('admin::lang.text_loading')
            </div>
        </div>
        <div id="{{ $this->getId('container') }}"></div>
    </div>
</div>


