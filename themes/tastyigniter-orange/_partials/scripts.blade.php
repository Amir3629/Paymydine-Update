{!! Assets::getJsVars() !!}
<script defer src="/app/admin/assets/js/pmd-no-hover-titles-global-r4.js?v=20261026-r5" data-pmd-no-hover-titles-r4></script>
@scripts
{!! $this->theme->ga_tracking_code !!}
@if (!empty($this->theme->custom_js))
    <script type="text/javascript">{!! $this->theme->custom_js !!}</script>
@endif
