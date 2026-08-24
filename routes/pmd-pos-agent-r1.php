<?php

use Admin\Controllers\Api\PosAgentR1Controller;
use Illuminate\Support\Facades\Route;

/*
 * PMD_LOCAL_POS_AGENT_ADMIN_AUTHORITY_R24
 *
 * This file is loaded from app/admin/routes.php, which is an explicit route
 * authority booted by Admin\ServiceProvider. Nginx already sends /api/v1/* to
 * Laravel, so register the complete public URI here instead of relying on the
 * separate routes/api.php loader.
 */
Route::prefix('api/v1/pmd-pos-agent')->middleware(['cors'])->group(function () {
    Route::get('agent.js', function () {
        $path = base_path('tools/local-pos-agent/agent.js');
        if (!is_file($path)) {
            abort(404, 'PayMyDine Local POS Agent package is unavailable.');
        }

        $content = file_get_contents($path);
        $content = str_replace(
            [
                "/api/pos-agent/pair",
                "/api/pos-agent/commands/pull",
                "/api/pos-agent/commands/",
            ],
            [
                "/api/v1/pmd-pos-agent/pair",
                "/api/v1/pmd-pos-agent/pull",
                "/api/v1/pmd-pos-agent/ack/",
            ],
            $content
        );
        $content = str_replace(" + '/ack'", '', $content);

        return response($content, 200, [
            'Content-Type' => 'application/javascript; charset=UTF-8',
            'Cache-Control' => 'no-store, max-age=0',
            'X-PMD-Local-Agent' => 'R2.4',
        ]);
    });

    Route::middleware(['detect.tenant'])->group(function () {
        Route::post('pair', [PosAgentR1Controller::class, 'pair']);
        Route::get('pull', [PosAgentR1Controller::class, 'pull']);
        Route::post('ack/{id}', [PosAgentR1Controller::class, 'ack']);
    });
});
