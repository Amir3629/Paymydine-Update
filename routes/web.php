Route::post('/admin/fiskaly/create-client-ajax', function (\Illuminate\Http\Request $request) {

    \Log::info('[Fiskaly] create-client-ajax hit');

    try {

        $cfg = \Admin\Models\Fiskaly_configs_model::find(1);

        if (!$cfg) {
            return response()->json([
                'ok' => false,
                'message' => 'Fiskaly config missing'
            ]);
        }

        if (!empty($cfg->client_id)) {
            return response()->json([
                'ok' => true,
                'client_id' => $cfg->client_id
            ]);
        }

        $service = app(\Admin\Services\Fiskaly\FiskalyProvisionService::class);
        $service->ensureClientExists($cfg);

        $cfg->refresh();

        return response()->json([
            'ok' => true,
            'client_id' => $cfg->client_id
        ]);

    } catch (\Throwable $e) {

        \Log::error('[Fiskaly] create-client-ajax failed', [
            'message' => $e->getMessage()
        ]);

        return response()->json([
            'ok' => false,
            'message' => $e->getMessage()
        ]);
    }

});
use Illuminate\Support\Facades\Route;

Route::get('/api/media/{filename}', function ($filename) {
    $filename = basename($filename);

    $paths = [
        public_path('assets/media/attachments/public'),
        base_path('assets/media/attachments/public'),
        public_path('assets/media/uploads'),
        base_path('assets/media/uploads'),
        storage_path('app/public/assets/media'),
        storage_path('temp/public'),
    ];

    foreach ($paths as $base) {
        if (!is_dir($base)) {
            continue;
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($base, FilesystemIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if (strtolower($file->getFilename()) === strtolower($filename)) {
                return response()->file($file->getPathname());
            }
        }
    }

    abort(404);
})->where('filename', '.*');

Route::post('admin/pos_configs/sync-ready2order-tables', 'Admin\\Controllers\\Pos_configs@syncReady2OrderTables');


// ===== R2O SYNC TABLES DIRECT ROUTE =====
Route::match(['GET','POST'], 'admin/pos_configs/sync-ready2order-tables-direct', function () {
    $out1 = [];
    $out2 = [];
    $rc1 = 0;
    $rc2 = 0;

    exec('php /home/ubuntu/pmd_r2o_sync_tables.php 2>&1', $out1, $rc1);
    exec('php /home/ubuntu/pmd_r2o_auto_create_tables.php 2>&1', $out2, $rc2);

    $payload = [
        'success' => ($rc1 === 0 && $rc2 === 0),
        'message' => ($rc1 === 0 && $rc2 === 0)
            ? 'ready2order tables synced successfully'
            : 'table sync finished with warnings',
        'rc_sync_tables' => $rc1,
        'rc_auto_create' => $rc2,
        'output_sync_tables' => $out1,
        'output_auto_create' => $out2,
    ];

    @file_put_contents(
        '/var/www/paymydine/storage/logs/system.log',
        '['.date('Y-m-d H:i:s').'] PMD_R2O_SYNC_BUTTON '.json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).PHP_EOL,
        FILE_APPEND
    );

    return response()->json($payload);
});
// ===== /R2O SYNC TABLES DIRECT ROUTE =====


