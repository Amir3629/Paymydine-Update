@php
use Illuminate\Support\Facades\DB;
$imgSrcDashboard = DB::table('logos')->orderBy('id', 'desc')->value('dashboard_logo');
@endphp
@if(AdminAuth::isLogged())
    <nav class="navbar navbar-top navbar-expand navbar-fixed-top" role="navigation">
        <div class="container-fluid">
            <div class="navbar-brand" style="height:63px;">
                <a class="logo" href="{{ admin_url('dashboard') }}">
                    <img src="<?php echo $imgSrcDashboard ? $imgSrcDashboard . '?t=' . time() : ''; ?>" alt="Dashboard Logo">
                    <i class="logo-svg"></i>
                </a>
            </div>

            <div class="page-title">
                <span>{!! Template::getHeading() !!}</span>
            </div>

            <div class="navbar navbar-right">
                <button
                    type="button" class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#navSidebar"
                    aria-controls="navSidebar" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="fa fa-bars"></span>
                </button>

                {!! $this->widgets['mainmenu']->render() !!}
            </div>
        </div>
    </nav>
@endif

