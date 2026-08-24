<?php

use Admin\Controllers\Api\PosAgentR1Controller;
use Illuminate\Support\Facades\Route;

/*
 * PMD_LOCAL_POS_AGENT_R1
 *
 * Loaded from routes/api.php, so /api is already the outer prefix and the
 * standard API middleware group is already active. Hardware traffic stays out
 * of Admin web/session/CSRF routes.
 */
Route::prefix('pmd-pos-agent')->middleware(['cors'])->group(function () {
    // Agent code contains no restaurant secret. Installer secrets are supplied
    // separately by the authenticated Devices & Hardware download action.
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
                "/api/pmd-pos-agent/pair",
                "/api/pmd-pos-agent/pull",
                "/api/pmd-pos-agent/ack/",
            ],
            $content
        );
        // The old ACK path appends /ack after the command id. Dedicated R1 API
        // already places the command id after /ack/, so remove that suffix.
        $content = str_replace(" + '/ack'", '', $content);

        return response($content, 200, [
            'Content-Type' => 'application/javascript; charset=UTF-8',
            'Cache-Control' => 'no-store, max-age=0',
            'X-PMD-Local-Agent' => 'R1',
        ]);
    });

    Route::middleware(['detect.tenant'])->group(function () {
        Route::post('pair', [PosAgentR1Controller::class, 'pair']);
        Route::get('pull', [PosAgentR1Controller::class, 'pull']);
        Route::post('ack/{id}', [PosAgentR1Controller::class, 'ack']);
    });
});
