<?php

use App\Services\AI\GuestMenuAiService;
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

if (!function_exists('pmd_guest_ai_normalize_locale_20260902')) {
    function pmd_guest_ai_normalize_locale_20260902(string $locale): string
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

if (!function_exists('pmd_guest_ai_explicit_locale_20260902')) {
    /**
     * Resolve only an explicit response-language request. Cuisine references
     * such as "Persian food" must not silently switch the answer to Farsi.
     */
    function pmd_guest_ai_explicit_locale_20260902(string $question, string $fallback): string
    {
        $rules = [
            'fa' => [
                '/\b(?:in|into)\s+(?:farsi|persian)\b/iu',
                '/\b(?:answer|reply|respond|write|speak|say|tell|explain|translate)\b.{0,50}\b(?:in|into)\s+(?:farsi|persian)\b/iu',
                '/(?:به|با)\s*فارسی\b/u',
                '/\bفارسی\s+(?:جواب|پاسخ|توضیح|بگو|بنویس)\b/u',
            ],
            'de' => [
                '/\b(?:in)\s+german\b/iu',
                '/\bauf\s+deutsch\b/iu',
            ],
            'tr' => [
                '/\b(?:in)\s+turkish\b/iu',
                '/\b(?:türkçe|turkce)\s+(?:yanıtla|yanitla|cevapla|anlat|yaz)\b/iu',
                '/\b(?:yanıtla|yanitla|cevapla|anlat|yaz)\b.{0,30}\b(?:türkçe|turkce)\b/iu',
            ],
            'ja' => [
                '/\b(?:in)\s+japanese\b/iu',
                '/日本語で/u',
            ],
            'en' => [
                '/\b(?:in)\s+english\b/iu',
                '/(?:به|با)\s*انگلیسی\b/u',
                '/\bauf\s+englisch\b/iu',
            ],
        ];

        foreach ($rules as $locale => $patterns) {
            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $question) === 1) {
                    return $locale;
                }
            }
        }

        return pmd_guest_ai_normalize_locale_20260902($fallback);
    }
}

if (!function_exists('pmd_guest_ai_model_question_20260902')) {
    /**
     * Keep the answer tightly scoped to the guest's request. This is not a new
     * authority or tool; it is a compact response preference sent alongside the
     * already-public guest question.
     */
    function pmd_guest_ai_model_question_20260902(string $question, string $responseLocale): string
    {
        $language = match ($responseLocale) {
            'fa' => 'Persian (Farsi)',
            'de' => 'German',
            'tr' => 'Turkish',
            'ja' => 'Japanese',
            default => 'English',
        };

        $preference = "\n\nResponse preference: answer only this menu request. Do not volunteer unrelated popularity, best-seller, sold-out, availability or allergy commentary. Reply entirely in {$language}.";
        $maxQuestionChars = 600;

        if (mb_strlen($question.$preference) <= $maxQuestionChars) {
            return $question.$preference;
        }

        return $question;
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
        $responseLocale = pmd_guest_ai_explicit_locale_20260902(
            $rawQuestion,
            (string)($payload['locale'] ?? 'en')
        );
        $modelQuestion = pmd_guest_ai_model_question_20260902($rawQuestion, $responseLocale);

        $result = app(GuestMenuAiService::class)->ask(
            $modelQuestion,
            $responseLocale,
            (string)$request->ip(),
            (int)$payload['location_id']
        );

        return response()->json([
            'ok' => true,
            'run_id' => $runId,
            'answer' => (string)$result['answer'],
            'response_locale' => $responseLocale,
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
