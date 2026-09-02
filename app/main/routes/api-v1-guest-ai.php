<?php

use App\Services\AI\GuestMenuAiService;
use App\Services\AI\GuestMenuMomentContext;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/*
|--------------------------------------------------------------------------
| PMD Guest Menu AI V2
|--------------------------------------------------------------------------
| Public, read-only concierge for Frontend V2. DetectTenant has already fixed
| the restaurant database. Location is explicit and independently allowlisted.
|--------------------------------------------------------------------------
*/

if (!function_exists('pmd_guest_ai_normalize_ui_locale_20260902')) {
    /**
     * Frontend V2 currently ships five interface locales. This is only a UI
     * fallback; it MUST NOT limit which language the AI may answer in.
     */
    function pmd_guest_ai_normalize_ui_locale_20260902(string $locale): string
    {
        $locale = strtolower(trim($locale));
        foreach (['fa', 'de', 'tr', 'ja', 'en'] as $supported) {
            if ($locale === $supported || str_starts_with($locale, $supported.'-') || str_starts_with($locale, $supported.'_')) {
                return $supported;
            }
        }
        return 'en';
    }
}

if (!function_exists('pmd_guest_ai_model_question_20260902')) {
    /**
     * Add compact server-owned response preferences without replacing the guest
     * request. The combined string must remain inside GuestMenuAiService's 600
     * character public-question ceiling.
     */
    function pmd_guest_ai_model_question_20260902(
        string $question,
        string $uiLocale,
        string $momentContext
    ): string {
        $rule = "PMD_RULE: answer only the requested menu task. LANGUAGE: reply in the language the guest is using or explicitly asks for; any explicit language request overrides UI={$uiLocale}; if ambiguous use UI={$uiLocale}. A cuisine name alone is not a language request. NOW: prioritize what is relevant/orderable now. If the whole menu is requested, cover it but clearly distinguish current choices from other meal periods. An inactive mealtime is not sold out.";
        $maxChars = 600;

        $baseSuffix = "\n\n".$rule;
        if (mb_strlen($question.$baseSuffix) > $maxChars) {
            return $question;
        }

        $momentContext = trim($momentContext);
        if ($momentContext === '') {
            return $question.$baseSuffix;
        }

        $momentPrefix = "\n\nPMD_NOW: ";
        $room = $maxChars - mb_strlen($question.$baseSuffix.$momentPrefix);
        if ($room < 60) {
            return $question.$baseSuffix;
        }

        $moment = mb_strlen($momentContext) > $room
            ? rtrim(mb_substr($momentContext, 0, max(1, $room - 1))).'…'
            : $momentContext;

        return $question.$momentPrefix.$moment.$baseSuffix;
    }
}

Route::get('/guest-ai/status', function (Request $request) {
    $locationId = is_numeric($request->query('location_id'))
        ? (int)$request->query('location_id')
        : 0;

    try {
        $enabled = $locationId > 0
            && app(GuestMenuAiService::class)->isEnabledForCurrentTenant($locationId);
    } catch (\Throwable $error) {
        $enabled = false;
    }

    return response()->json([
        'ok' => true,
        'enabled' => (bool)$enabled,
        'read_only' => true,
        'scope' => 'customer_menu_location',
        'location_id' => $locationId > 0 ? $locationId : null,
        'surface' => 'frontend_v2',
    ])->withHeaders([
        'Cache-Control' => 'private, no-store, max-age=0',
        'X-PMD-AI-Surface' => 'frontend-v2',
    ]);
});

Route::post('/guest-ai/ask', function (Request $request) {
    $runId = (string)Str::uuid();

    try {
        $payload = $request->validate([
            'question' => 'required|string|max:600',
            'locale' => 'nullable|string|max:20',
            'location_id' => 'required|integer|min:1',
        ]);

        $rawQuestion = (string)$payload['question'];
        $locationId = (int)$payload['location_id'];
        $uiLocale = pmd_guest_ai_normalize_ui_locale_20260902((string)($payload['locale'] ?? 'en'));

        // The AI response language is intentionally open-ended. The model is
        // told to mirror/obey the guest language, with UI locale only as fallback.
        $responseLocale = 'auto';
        $momentContext = app(GuestMenuMomentContext::class)->compact($locationId, 260);
        $modelQuestion = pmd_guest_ai_model_question_20260902(
            $rawQuestion,
            $uiLocale,
            $momentContext
        );

        $result = app(GuestMenuAiService::class)->ask(
            $modelQuestion,
            $responseLocale,
            (string)$request->ip(),
            $locationId
        );

        return response()->json([
            'ok' => true,
            'run_id' => $runId,
            'answer' => (string)$result['answer'],
            'response_locale' => $responseLocale,
            'ui_locale' => $uiLocale,
            'latency_ms' => (int)($result['latency_ms'] ?? 0),
            'guarded' => (bool)($result['guarded'] ?? false),
            'read_only' => true,
        ])->withHeaders([
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-PMD-AI-Surface' => 'frontend-v2',
        ]);
    } catch (\Throwable $error) {
        $message = strtolower($error->getMessage());
        $status = 503;
        $public = 'The menu assistant is taking a short break. Please try again in a moment.';

        if (
            $error instanceof ValidationException
            || str_contains($message, 'question is required')
            || str_contains($message, 'question is too long')
        ) {
            $status = 422;
            $public = 'Please ask a shorter menu question from a valid restaurant table.';
        } elseif (str_contains($message, 'rate limit')) {
            $status = 429;
            $public = 'Lots of menu questions right now 😄 Please wait a moment and try again.';
        } elseif (str_contains($message, 'not enabled')) {
            $status = 404;
            $public = 'The menu assistant is not available at this restaurant location yet.';
        } elseif (str_contains($message, 'customer menu is temporarily unavailable')) {
            $status = 503;
            $public = 'I can’t read the menu right now. Please try again in a moment.';
        }

        logger()->warning('PMD Guest AI request failed', [
            'run_id' => $runId,
            'type' => get_class($error),
            'message' => $error->getMessage(),
            'location_id' => is_numeric($request->input('location_id')) ? (int)$request->input('location_id') : null,
            'question_length' => mb_strlen((string)$request->input('question', '')),
        ]);

        return response()->json([
            'ok' => false,
            'run_id' => $runId,
            'message' => $public,
            'read_only' => true,
        ], $status)->withHeaders([
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-PMD-AI-Surface' => 'frontend-v2',
        ]);
    }
})->withoutMiddleware([
    \Igniter\Flame\Foundation\Http\Middleware\VerifyCsrfToken::class,
]);
