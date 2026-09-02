<?php

use App\Services\AI\GuestMenuAiService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/*
|--------------------------------------------------------------------------
| PMD Guest Menu AI V1
|--------------------------------------------------------------------------
| Public read-only concierge for the customer digital menu. DetectTenant has
| already selected the restaurant database before these routes run.
|--------------------------------------------------------------------------
*/

Route::get('/guest-ai/status', function () {
    try {
        $enabled = app(GuestMenuAiService::class)->isEnabledForCurrentTenant();
    } catch (\Throwable $error) {
        $enabled = false;
    }

    return response()->json([
        'ok' => true,
        'enabled' => (bool)$enabled,
        'read_only' => true,
        'scope' => 'customer_menu',
    ])->withHeaders([
        'Cache-Control' => 'private, no-store, max-age=0',
    ]);
});

Route::post('/guest-ai/ask', function (Request $request) {
    $runId = (string)Str::uuid();

    try {
        $payload = $request->validate([
            'question' => 'required|string|max:1200',
            'locale' => 'nullable|string|max:20',
        ]);

        $result = app(GuestMenuAiService::class)->ask(
            (string)$payload['question'],
            (string)($payload['locale'] ?? 'en'),
            (string)$request->ip()
        );

        return response()->json([
            'ok' => true,
            'run_id' => $runId,
            'answer' => (string)$result['answer'],
            'latency_ms' => (int)($result['latency_ms'] ?? 0),
            'read_only' => true,
        ])->withHeaders([
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    } catch (\Throwable $error) {
        $message = strtolower($error->getMessage());
        $status = 503;
        $public = 'The menu assistant is taking a short break. Please try again in a moment.';

        if (
            str_contains($message, 'question is required')
            || str_contains($message, 'question is too long')
            || str_contains($message, 'validation')
        ) {
            $status = 422;
            $public = 'Please ask a shorter menu question.';
        } elseif (str_contains($message, 'rate limit')) {
            $status = 429;
            $public = 'Lots of menu questions right now 😄 Please wait a moment and try again.';
        } elseif (str_contains($message, 'not enabled')) {
            $status = 503;
            $public = 'The menu assistant is not available at this restaurant yet.';
        } elseif (str_contains($message, 'customer menu is temporarily unavailable')) {
            $status = 503;
            $public = 'I can’t read the menu right now. Please try again in a moment.';
        }

        logger()->warning('PMD Guest AI request failed', [
            'run_id' => $runId,
            'type' => get_class($error),
            'message' => $error->getMessage(),
            'question_length' => mb_strlen((string)$request->input('question', '')),
        ]);

        return response()->json([
            'ok' => false,
            'run_id' => $runId,
            'message' => $public,
            'read_only' => true,
        ], $status)->withHeaders([
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    }
});
