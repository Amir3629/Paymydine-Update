<?php

use Admin\Controllers\Api\PosAgentR1Controller;
use Illuminate\Support\Facades\Route;

/*
 * PMD_LOCAL_POS_AGENT_R2_1
 *
 * routes/api.php is already mounted below /api. Tenant Nginx intentionally
 * sends /api/v1/* to Laravel, while other /api/* paths may be owned by the
 * Next frontend. Keep the hardware bridge inside /api/v1 so every tenant uses
 * the existing Laravel authority without a new Nginx exception.
 */
Route::prefix('v1/pmd-pos-agent')->middleware(['cors'])->group(function () {
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
                "/api/v1/pmd-pos-agent/pair",
                "/api/v1/pmd-pos-agent/pull",
                "/api/v1/pmd-pos-agent/ack/",
            ],
            $content
        );
        // The old ACK path appends /ack after the command id. Dedicated R2.1
        // API already places the command id after /ack/, so remove that suffix.
        $content = str_replace(" + '/ack'", '', $content);

        return response($content, 200, [
            'Content-Type' => 'application/javascript; charset=UTF-8',
            'Cache-Control' => 'no-store, max-age=0',
            'X-PMD-Local-Agent' => 'R2.1',
        ]);
    });

    Route::middleware(['detect.tenant'])->group(function () {
        Route::post('pair', [PosAgentR1Controller::class, 'pair']);
        Route::get('pull', [PosAgentR1Controller::class, 'pull']);
        Route::post('ack/{id}', [PosAgentR1Controller::class, 'ack']);
    });
});
