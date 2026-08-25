<link rel="stylesheet" href="/app/admin/assets/css/pmd-table-qr-template-studio-v1.css?v=20260825_1">

<div class="row-fluid">
    {!! form_open([
        'id'     => 'edit-form',
        'role'   => 'form',
        'method' => 'PATCH',
    ]) !!}
    {!! $this->renderForm() !!}
    {!! form_close() !!}
    <div class="ms-qr">
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

        // PMD_TABLE_QR_GENERATOR_AUTHORITY_UNCHANGED_V1
        // Keep the existing QR provider and payload exactly as-is. The template
        // studio below only changes how the already-generated QR is presented/downloaded.
        $qr_code_url = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' . urlencode($qr_redirect_url);

        $qr_code_image = file_get_contents($qr_code_url);
        $base64_qr_code = base64_encode($qr_code_image);
        $qrDataUri = 'data:image/png;base64,' . $base64_qr_code;

        // PMD_TABLE_QR_TEMPLATE_STUDIO_V1
        // Read-only restaurant identity. No setting, table or QR data is written here.
        $settingValue = static function (string $key) {
            try {
                return DB::table('settings')->where('item', $key)->value('value');
            } catch (\Throwable $error) {
                return null;
            }
        };

        $restaurantName = trim((string)($settingValue('pmd_restaurant_identity_name') ?: $settingValue('site_name') ?: ''));
        if ($restaurantName === '') {
            try {
                $restaurantName = trim((string)(DB::table('locations')->where('location_id', $location_id)->value('location_name') ?: ''));
            } catch (\Throwable $error) {
                $restaurantName = '';
            }
        }
        if ($restaurantName === '') {
            $restaurantName = ucfirst((string)(explode('.', request()->getHost())[0] ?? 'Restaurant'));
        }

        $restaurantLogo = trim((string)($settingValue('pmd_restaurant_identity_logo') ?: $settingValue('site_logo') ?: ''));
        if ($restaurantLogo === '') {
            $restaurantLogo = '/brand/paymydine-logo.svg';
        } elseif (!preg_match('#^https?://#i', $restaurantLogo)) {
            $logoPath = '/'.ltrim(str_replace('\\', '/', (string)(parse_url($restaurantLogo, PHP_URL_PATH) ?: $restaurantLogo)), '/');
            if (str_starts_with($logoPath, '/api/media/') || str_starts_with($logoPath, '/assets/media/') || str_starts_with($logoPath, '/brand/')) {
                $restaurantLogo = $logoPath;
            } elseif (str_starts_with($logoPath, '/uploads/')) {
                $restaurantLogo = '/assets/media'.$logoPath;
            } else {
                $restaurantLogo = '/api/media/'.basename($logoPath);
            }
        }

        $tableDisplayName = trim((string)($table_data->table_name ?? ''));
        if ($tableDisplayName === '') {
            $tableDisplayName = 'Table '.$tableNumber;
        }

        echo '<div class="pmd-table-qr-studio-v1"'
            .' data-pmd-qr-template-studio-v1="1"'
            .' data-pmd-qr-src="'.e($qrDataUri).'"'
            .' data-pmd-restaurant-name="'.e($restaurantName).'"'
            .' data-pmd-restaurant-logo="'.e($restaurantLogo).'"'
            .' data-pmd-table-name="'.e($tableDisplayName).'">';
        echo '<div class="pmd-table-qr-studio-v1__preview">';
        echo '<img id="qr-code" src="'.e($qrDataUri).'" alt="QR Code for '.e($tableDisplayName).'" />';
        echo '</div>';
        echo '<div class="pmd-table-qr-studio-v1__actions">';
        echo '<strong>'.e($tableDisplayName).' QR code</strong>';
        echo '<span>Choose from 10 branded restaurant templates before downloading.</span>';
        echo '<button type="button" class="pmd-table-qr-studio-v1__button" data-pmd-qr-template-open-v1>Choose design &amp; download</button>';
        echo '</div>';
        echo '</div>';
    } 
    ?>
</div>
   </div>

</div>

<script src="/app/admin/assets/js/pmd-table-qr-template-studio-v1.js?v=20260825_1" defer></script>
