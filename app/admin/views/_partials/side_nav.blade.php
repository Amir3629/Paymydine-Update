<div class="sidebar" role="navigation">
    <div id="navSidebar" class="nav-sidebar">
        <div class="sidebar-mobile-brand d-md-none">
            <a class="logo" href="{{ admin_url('dashboard') }}" aria-label="Dashboard">
                <i class="logo-svg"></i>
            </a>
        </div>
        {!! $this->makePartial('side_nav_items', [
            'navItems' => $navItems,
            'navAttributes' => [
                'id' => 'side-nav-menu',
                'class' => 'nav',
            ],
        ]) !!}
    </div>
</div>
