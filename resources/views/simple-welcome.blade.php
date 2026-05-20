<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PayMyDine - Working!</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container">
            <a class="navbar-brand" href="/">PayMyDine</a>
            <a class="nav-link" href="/admin">Admin Panel</a>
        </div>
    </nav>

    <div class="container mt-5">
        <div class="row">
            <div class="col-md-12 text-center">
                <h1 class="display-4">🎉 PayMyDine is Working!</h1>
                <p class="lead">Your restaurant management system is now running successfully!</p>
                <hr class="my-4">
                <p>This page is served directly by Laravel, bypassing the TastyIgniter theme system.</p>
                <div class="row mt-4">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">🔧 Admin Panel</h5>
                                <p class="card-text">Manage your restaurant settings, menus, and orders.</p>
                                <a href="/admin" class="btn btn-primary">Access Admin</a>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">🚀 Next.js Frontend</h5>
                                <p class="card-text">Your modern customer-facing frontend.</p>
                                <a href="http://localhost:3000" class="btn btn-success">View Frontend</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <footer class="footer mt-5 py-3 bg-light">
        <div class="container text-center">
            <span class="text-muted">© 2025 PayMyDine. All rights reserved.</span>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>

<!-- PMD_R2O_FLOATING_SYNC_BUTTON -->
<script>
(function () {
    try {
        var path = window.location.pathname || '';
        if (path !== '/admin/pos_configs/edit/18') return;

        if (document.getElementById('pmd-r2o-sync-btn')) return;

        var wrap = document.createElement('div');
        wrap.id = 'pmd-r2o-sync-btn';
        wrap.style.position = 'fixed';
        wrap.style.right = '20px';
        wrap.style.bottom = '20px';
        wrap.style.zIndex = '99999';

        var a = document.createElement('a');
        a.href = '/admin/pos_configs/sync-ready2order-tables-direct';
        a.innerText = 'Sync R2O Tables';
        a.style.display = 'inline-block';
        a.style.background = '#28a745';
        a.style.color = '#fff';
        a.style.padding = '12px 16px';
        a.style.borderRadius = '8px';
        a.style.textDecoration = 'none';
        a.style.fontWeight = 'bold';
        a.style.boxShadow = '0 2px 10px rgba(0,0,0,.2)';
        a.onclick = function () {
            a.innerText = 'Syncing...';
        };

        wrap.appendChild(a);
        document.body.appendChild(wrap);

        var params = new URLSearchParams(window.location.search);
        if (params.get('sync_tables') === '1') {
            setTimeout(function () {
                alert('ready2order tables synced successfully');
            }, 200);
        }
    } catch (e) {}
})();
</script>
<!-- /PMD_R2O_FLOATING_SYNC_BUTTON -->

</body>
</html> 