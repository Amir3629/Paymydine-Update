<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;

/**
 * Legacy Türkiye settings route.
 *
 * PMD no longer exposes a second country-only settings page. Türkiye-specific
 * settings are embedded into the existing owner IA:
 *   - Devices & hardware: YN ÖKC / fiscal hardware
 *   - Payments & finance: payments, e-documents, Yemeksepeti, communications
 *
 * Keep this controller only so old bookmarks safely land on the canonical page.
 */
final class Pmdturkey extends AdminController
{
    protected $requiredPermissions = 'Site.Settings';

    public function index()
    {
        return redirect(admin_url('pmdfinance').'#turkey-payment-connections');
    }
}
