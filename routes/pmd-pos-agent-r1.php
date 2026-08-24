<?php

use Admin\Controllers\Api\PosAgentR1Controller;
use Illuminate\Support\Facades\Route;

/*
 * PMD_LOCAL_POS_AGENT_API_AUTHORITY_R26
 *
 * routes/api.php is already loaded by Laravel under the public /api prefix.
 * Therefore this file must only add v1/pmd-pos-agent, producing the final
 * public endpoints /api/v1/pmd-pos-agent/* exactly once.
 */
Route::prefix('v1/pmd-pos-agent')->middleware(['cors'])->group(function () {
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
            'X-PMD-Local-Agent' => 'R2.6',
        ]);
    });

    Route::middleware(['detect.tenant'])->group(function () {
        Route::post('pair', [PosAgentR1Controller::class, 'pair']);
        Route::get('pull', [PosAgentR1Controller::class, 'pull']);
        Route::post('ack/{id}', [PosAgentR1Controller::class, 'ack']);
    });
});
