<div class="row-fluid">
    {!! form_open([
        'id'     => 'edit-form',
        'role'   => 'form',
        'method' => 'PATCH',
    ]) !!}
    {!! $this->renderForm() !!}
    {!! form_close() !!}
    <div class="ms-qr" style="margin-left:2rem;">
    <?php 
    use Illuminate\Support\Facades\DB;
    $request_uri = $_SERVER['REQUEST_URI']; 
    $uri_parts = explode('/', $request_uri);
    $id = end($uri_parts);
    $qr_code = DB::table('tables')->select('qr_code')->where('table_id', $id)->first();
    
    $date = date('Y-m-d');
    $location_id = 1;
    $max_capacity = 3;
    $table_id = 1;
    if ($qr_code) {
        $table_data = DB::table('tables')->where('qr_code', $qr_code->qr_code)->first();
        $date = date('Y-m-d', strtotime($table_data->updated_at));
        $current_time = date('H:i', strtotime($table_data->updated_at));
        $time = $current_time; // raw value; http_build_query will encode
        // FIXED: Get location data separately to avoid confusion
        $location_data = DB::table('locationables')
            ->where('locationable_id', $id)
            ->where('locationable_type', 'tables')
            ->first();
            
        $location_id = $location_data ? $location_data->location_id : 1;
        $max_capacity = $table_data->max_capacity ?? 3;
        $table_id = $id; // Use the actual table_id from URL, not from joined query
        $site_url = request()->getSchemeAndHttpHost();
        
        // STRICT: Build subdomain URL from location slug (no localhost fallback)
        // NO "use Illuminate\Support\Facades\DB;" here

        $location_id = DB::table('locationables')
            ->where('locationable_type', 'tables')
            ->where('locationable_id', $id)
            ->value('location_id');

        // FIXED: ALWAYS use tenant domain from database (no slug fallback)
        $tenant = app()->bound('tenant') ? app('tenant') : null;
        
        if ($tenant && !empty($tenant->domain)) {
            // Use tenant domain from middleware
            $scheme = request()->isSecure() ? 'https' : 'http';
            $frontend_url = "{$scheme}://{$tenant->domain}";
        } else {
            // Query ti_tenants directly from current host
            $host = request()->getHost();
            $tenantFromDb = DB::connection('mysql')->table('tenants')
                ->where('domain', $host)
                ->where('status', 'active')
                ->first();
            
            if ($tenantFromDb && !empty($tenantFromDb->domain)) {
                $scheme = request()->isSecure() ? 'https' : 'http';
                $frontend_url = "{$scheme}://{$tenantFromDb->domain}";
            } else {
                // FAIL LOUDLY - show error instead of using wrong domain
                echo '<div style="color:#b91c1c;background:#fee2e2;padding:10px;border-radius:6px;margin:10px 0;">
                        <strong> Cannot generate QR code:</strong> No tenant detected.<br>
                        Please ensure you\'re accessing the admin via tenant domain (e.g., mimoza.paymydine.com)
                      </div>';
                return;
            }
        }

        $tableNumber = (!empty($table_data->table_no) && (int)$table_data->table_no > 0)
            ? (int)$table_data->table_no
            : (int)($table_id ?? 0);

        $qr_redirect_url = rtrim($frontend_url, '/') . '/table/' . $tableNumber . '?' . http_build_query([
            'location' => $location_id ?? 1,
            'guest'    => $max_capacity ?? 1,
            'date'     => $date ?? date('Y-m-d'),
            'time'     => $time ?? date('H:i'),
            'qr'       => $qr_code->qr_code ?? $table_data->qr_code ?? null,
            'table'    => $tableNumber,
        ]);
$qr_code_url = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' . urlencode($qr_redirect_url);

        $qr_code_image = file_get_contents($qr_code_url);
        $base64_qr_code = base64_encode($qr_code_image);
        echo '<img id="qr-code" src="data:image/png;base64,' . $base64_qr_code . '" alt="QR Code" />';
        echo '<br />';
        echo '<a href="data:image/png;base64,' . $base64_qr_code . '" download="qr-code.png">';
        echo '<button>Download QR Code</button>';
        echo '</a>';
    } 
    ?>
</div>
<style>
    .ms-qr{
        display: flex;
        align-items:end;
    }
    .ms-qr button{
        background: #364a63;
        color: #ffffff;
        padding: 10px 12px;
        border: 2px solid #364a63;
        margin-left: 1rem;
        border-radius: 6px;
        font-weight: 600;
    }
</style>
   </div>

</div>



