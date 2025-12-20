<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QrRedirectController extends AdminController
{
    public function handleRedirect(Request $request)
    {
        $table_id = $request->query('table', '');
        $site_url = $request->getScheme() . '://' . $request->getHost();

      
      session_start(); // Always start the session at the top
       $redirectUrl = "$site_url/default/menus?picker_step=2&" . http_build_query($request->query());
      $_SESSION['full_url'] = $redirectUrl;

        $table = DB::table('tables')->where('table_id', $table_id)->first();

        if (!$table) {
            return redirect("$site_url/default/menus?error=TableNotFound");
        }

        $orders = DB::table('orders')->where('order_type', $table->table_name)->get();
        $statusIds = $orders->pluck('status_id')->unique();

        $statuses = DB::table('statuses')
        ->whereIn('status_id', $statusIds)
        ->pluck('status_name', 'status_id'); // Fetch as [status_id => status_name]

foreach ($orders as $order) {
    if (!isset($statuses[$order->status_id]) || strtolower($statuses[$order->status_id]) !== 'paid') {
        return redirect("$site_url/checkout/success/" . rawurlencode($order->hash));
    }
}

        // If no matching orders, redirect to default menu
        return redirect()->to("$site_url/default/menus?picker_step=2&" . http_build_query($request->query()));
    }
}
