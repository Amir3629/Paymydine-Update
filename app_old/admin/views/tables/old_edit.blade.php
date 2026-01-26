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
        $time = urlencode($current_time);
        // FIXED: Get location data separately to avoid confusion
        $location_data = DB::table('locationables')
            ->where('locationable_id', $id)
            ->where('locationable_type', 'tables')
            ->first();
            
        $location_id = $location_data ? $location_data->location_id : 1;
        $max_capacity = $table_data->max_capacity ?? 3;
        $table_id = $id; // Use the actual table_id from URL, not from joined query
        $site_url = site_url('/');
        $affiliate_link = $site_url.'?code='.$qr_code->qr_code;
        // FIXED: Point QR codes to Next.js frontend instead of old system
        $frontend_url = env('FRONTEND_URL', 'http://127.0.0.1:8001');
        $affiliate_link = $frontend_url.'/table/'.$table_id.'?location='.$location_id.'&guest='.$max_capacity.'&date='.$date.'&time='.$time.'&qr='.$qr_code->qr_code.'&table='.$table_id.'&uqr=true';
        $qr_code_url = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' . urlencode($affiliate_link);
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
        background: #2170c0;
  color: #fff;
  padding: 10px 12px;
  border: none;
  margin-left: 1rem;
    }
</style>
   </div>

</div>
