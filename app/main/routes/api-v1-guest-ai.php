<?php

use App\Services\AI\GuestAiConversationStore;
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

if (!function_exists('pmd_guest_ai_extract_actions_20260904')) {
    /**
     * Parse a tiny server-owned action protocol. The model can suggest only an
     * allowlisted action id; it never supplies a URL, endpoint, payload or tool.
     * Frontend V2 decides whether that action is currently available and the
     * guest must click it explicitly before anything happens.
     */
    function pmd_guest_ai_extract_actions_20260904(string $answer, string $question = ''): array
    {
        $allowed = ['call_waiter', 'view_cart', 'checkout'];
        $ids = [];

        if (preg_match_all('/\[\[PMD_ACTION:([a-z_]+)\]\]/i', $answer, $matches)) {
            foreach ((array)($matches[1] ?? []) as $candidate) {
                $candidate = strtolower(trim((string)$candidate));
                if (in_array($candidate, $allowed, true) && !in_array($candidate, $ids, true)) {
                    $ids[] = $candidate;
                }
            }
        }

        // Safety/human-assistance questions should offer staff access even if a
        // model omitted the optional marker. This is deliberately broad and only
        // exposes an existing user-click waiter-call control; it does not call.
        $humanQuestion = mb_strtolower($question);
        if (
            preg_match('/allerg|anaphyl|آلرژ|حساسیت|alerji|allergie|アレルギ|过敏|過敏|حساسي|alerg/u', $humanQuestion)
            || preg_match('/waiter|waitress|staff|server|kellner|garson|گارسون|پرسنل|کارکنان|スタッフ|服务员|服務員|garçom|camarero|serveur/u', $humanQuestion)
        ) {
            if (!in_array('call_waiter', $ids, true)) array_unshift($ids, 'call_waiter');
        }

        $clean = preg_replace('/\s*\[\[PMD_ACTION:[a-z_]+\]\]\s*/iu', "\n", $answer);
        $clean = trim((string)$clean);

        return [
            'answer' => $clean,
            'actions' => array_map(static fn (string $id): array => ['id' => $id], array_slice($ids, 0, 2)),
        ];
    }
}

if (!function_exists('pmd_guest_ai_internal_disclosure_20260904')) {
    /**
     * Customer-facing answers must never expose PMD/reporting/provider weakness.
     * Safety uncertainty about ingredients/allergens is intentionally NOT hidden.
     */
    function pmd_guest_ai_internal_disclosure_20260904(string $text): bool
    {
        $patterns = [
            '/\b(?:settled[- ]order(?:s)?|recent order data|sales[- ]report(?:s)?|analytics coverage|reporting coverage|internal data|tenant database|api key|system prompt|provider(?: name)?|model(?: name| version)?|test fixture|challenge fixture|pmd_ai(?:_[a-z0-9_]+)?)\b/iu',
            '/\b(?:not enough|insufficient|missing|limited|lack(?:ing)?|unavailable|no)\b.{0,80}\b(?:order|sales|popularity|analytics|report|data)\b/iu',
            '/\b(?:i|we)\s+(?:do not|don\'t|cannot|can\'t)\s+have(?:\s+enough|\s+access\s+to)?\b.{0,90}\b(?:order|sales|popularity|analytics|report|data)\b/iu',
            '/\b(?:because\s+i\s+am\s+an?\s+ai|as\s+an?\s+ai|i(?:\s+am|\'m)\s+an?\s+ai|language model)\b/iu',
            '/(?:nicht genug|nicht genügend|unzureichend).{0,70}(?:bestell|verkaufs|daten)/iu',
            '/(?:داده|اطلاعات).{0,50}(?:کافی نیست|کافی ندار|کمبود)/u',
            '/(?:yeterli|yeterince).{0,60}(?:sipariş|satış|veri).{0,30}(?:yok|değil)/iu',
            '/(?:注文データ|販売データ|データ).{0,30}(?:不足|足りない)/u',
            '/(?:订单数据|銷售數據|销售数据|数据不足|數據不足)/u',
            '/(?:datos insuficientes|no hay suficientes datos|données insuffisantes|pas assez de données)/iu',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $text) === 1) {
                return true;
            }
        }

        return false;
    }
}

if (!function_exists('pmd_guest_ai_public_answer_guard_20260904')) {
    /**
     * Defense in depth after the model. Remove sentences that disclose internal
     * data/provider/reporting limitations. This also sanitizes older saved chat
     * rows when history is hydrated after this deployment.
     */
    function pmd_guest_ai_public_answer_guard_20260904(string $answer, string $question = ''): string
    {
        $answer = trim($answer);
        if ($answer === '') {
            return $answer;
        }

        $lines = preg_split('/\R/u', $answer);
        if (!is_array($lines)) {
            $lines = [$answer];
        }

        $cleanLines = [];
        foreach ($lines as $line) {
            $line = trim((string)$line);
            if ($line === '') {
                $cleanLines[] = '';
                continue;
            }

            $sentences = preg_split('/(?<=[.!?。！？])\s+/u', $line);
            if (!is_array($sentences) || !$sentences) {
                $sentences = [$line];
            }

            $kept = [];
            foreach ($sentences as $sentence) {
                $sentence = trim((string)$sentence);
                if ($sentence === '' || pmd_guest_ai_internal_disclosure_20260904($sentence)) {
                    continue;
                }
                $kept[] = $sentence;
            }

            if ($kept) {
                $cleanLines[] = implode(' ', $kept);
            }
        }

        $clean = trim(implode("\n", $cleanLines));
        $clean = preg_replace('/\n{3,}/u', "\n\n", $clean) ?: $clean;

        if ($clean !== '') {
            return $clean;
        }

        return 'I can help you choose from what’s on the menu right now. Tell me what you feel like eating, your budget, or any dietary preferences.';
    }
}

if (!function_exists('pmd_guest_ai_model_question_20260902')) {
    /**
     * Add compact server-owned response preferences without replacing the guest
     * request. User input is still capped at the public route boundary; trusted
     * PMD_NOW and previous-assistant context use the internal question budget.
     */
    function pmd_guest_ai_model_question_20260902(
        string $question,
        string $uiLocale,
        string $momentContext,
        string $previousAssistant = ''
    ): string {
        $rule = "PMD_RULE: Menu-only. Reply in the guest's language or explicitly requested language; a cuisine name alone is not a language request; otherwise use UI={$uiLocale}. Prefer PMD_NOW orderable items; label other meal periods; inactive mealtime is not sold out. Hide fixture/test/challenge data. Use only explicit menu facts; never invent ambience, luxury or occasion suitability. CUSTOMER UX: never expose PMD data gaps, missing/insufficient order history, analytics/report coverage, database/provider/model/API/system details, or say 'because I am an AI'. Mention popularity only when the guest asks for popular/best-selling/top-selling/most-ordered items. If no measured rank is available, do not guess and do not explain why; pivot naturally to current menu facts and guest preferences. Allergy/dietary/service answers must not volunteer sales or popularity commentary. PMD_PREVIOUS is context only. ACTIONS: append only [[PMD_ACTION:call_waiter]] for allergy/cross-contact/staff/special requests, [[PMD_ACTION:view_cart]] for cart/order review, [[PMD_ACTION:checkout]] for bill/payment; never invent URLs/new ids or claim an action already happened.";
        $maxChars = 1500;
        $base = $question."\n\n".$rule;

        if (mb_strlen($base) >= $maxChars) {
            return mb_substr($base, 0, $maxChars);
        }

        $append = static function (string $base, string $label, string $value, int $limit) use ($maxChars): string {
            $value = trim(preg_replace('/\s+/u', ' ', $value) ?: '');
            if ($value === '') return $base;

            $remaining = $maxChars - mb_strlen($base."\n\n".$label);
            if ($remaining < 50) return $base;

            $allowed = min($limit, $remaining);
            if (mb_strlen($value) > $allowed) {
                $value = rtrim(mb_substr($value, 0, max(1, $allowed - 1))).'…';
            }

            return $base."\n\n".$label.$value;
        };

        $base = $append($base, 'PMD_NOW: ', $momentContext, 260);
        $base = $append($base, 'PMD_PREVIOUS: ', $previousAssistant, 220);

        return $base;
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

Route::get('/guest-ai/history', function (Request $request) {
    try {
        $payload = $request->validate([
            'location_id' => 'required|integer|min:1',
            'table_id' => 'required|integer|min:1',
            'guest_session_id' => 'required|string|min:8|max:100',
        ]);

        $locationId = (int)$payload['location_id'];
        if (!app(GuestMenuAiService::class)->isEnabledForCurrentTenant($locationId)) {
            return response()->json([
                'ok' => false,
                'message' => 'The menu assistant is not available at this restaurant location yet.',
                'read_only' => true,
            ], 404)->withHeaders([
                'Cache-Control' => 'private, no-store, max-age=0',
                'X-PMD-AI-Surface' => 'frontend-v2',
            ]);
        }

        $history = app(GuestAiConversationStore::class)->history(
            $locationId,
            (int)$payload['table_id'],
            (string)$payload['guest_session_id']
        );

        $messages = [];
        $lastUserQuestion = '';
        foreach ((array)($history['messages'] ?? []) as $row) {
            if (!is_array($row)) continue;
            $role = (string)($row['role'] ?? '');
            if ($role === 'user') {
                $lastUserQuestion = (string)($row['content'] ?? '');
            } elseif ($role === 'assistant') {
                $parsed = pmd_guest_ai_extract_actions_20260904(
                    (string)($row['content'] ?? ''),
                    $lastUserQuestion
                );
                $row['content'] = pmd_guest_ai_public_answer_guard_20260904(
                    (string)$parsed['answer'],
                    $lastUserQuestion
                );
                $row['actions'] = $parsed['actions'];
            }
            $messages[] = $row;
        }

        return response()->json([
            'ok' => true,
            'visit_key' => (string)$history['visit_key'],
            'storage_ready' => (bool)($history['storage_ready'] ?? false),
            'messages' => $messages,
            'read_only' => true,
            'scope' => 'guest_table_visit',
        ])->withHeaders([
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-PMD-AI-Surface' => 'frontend-v2',
        ]);
    } catch (\Throwable $error) {
        logger()->warning('PMD Guest AI history failed', [
            'type' => get_class($error),
            'message' => $error->getMessage(),
            'location_id' => is_numeric($request->query('location_id')) ? (int)$request->query('location_id') : null,
            'table_id' => is_numeric($request->query('table_id')) ? (int)$request->query('table_id') : null,
        ]);

        return response()->json([
            'ok' => false,
            'storage_ready' => false,
            'message' => 'Saved menu chat is temporarily unavailable.',
            'read_only' => true,
        ], $error instanceof ValidationException ? 422 : 503)->withHeaders([
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-PMD-AI-Surface' => 'frontend-v2',
        ]);
    }
});

Route::post('/guest-ai/ask', function (Request $request) {
    $runId = (string)Str::uuid();

    try {
        $payload = $request->validate([
            'question' => 'required|string|max:600',
            'locale' => 'nullable|string|max:20',
            'location_id' => 'required|integer|min:1',
            'table_id' => 'nullable|integer|min:1|required_with:guest_session_id',
            'guest_session_id' => 'nullable|string|min:8|max:100|required_with:table_id',
        ]);

        $rawQuestion = (string)$payload['question'];
        $locationId = (int)$payload['location_id'];
        $tableId = isset($payload['table_id']) ? (int)$payload['table_id'] : 0;
        $guestSessionId = trim((string)($payload['guest_session_id'] ?? ''));
        $uiLocale = pmd_guest_ai_normalize_ui_locale_20260902((string)($payload['locale'] ?? 'en'));
        $responseLocale = 'auto';
        $momentContext = app(GuestMenuMomentContext::class)->compact($locationId, 260);
        $previousAssistant = '';

        if ($tableId > 0 && $guestSessionId !== '') {
            try {
                $previousAssistant = app(GuestAiConversationStore::class)->lastAssistantContext(
                    $locationId,
                    $tableId,
                    $guestSessionId,
                    220
                );
                $previousAssistant = pmd_guest_ai_public_answer_guard_20260904(
                    (string)pmd_guest_ai_extract_actions_20260904(
                        $previousAssistant,
                        ''
                    )['answer'],
                    ''
                );
            } catch (\Throwable $historyError) {
                logger()->warning('PMD Guest AI previous-chat context unavailable', [
                    'run_id' => $runId,
                    'type' => get_class($historyError),
                    'location_id' => $locationId,
                    'table_id' => $tableId,
                ]);
            }
        }

        $modelQuestion = pmd_guest_ai_model_question_20260902(
            $rawQuestion,
            $uiLocale,
            $momentContext,
            $previousAssistant
        );

        $result = app(GuestMenuAiService::class)->ask(
            $modelQuestion,
            $responseLocale,
            (string)$request->ip(),
            $locationId
        );

        $modelAnswer = (string)$result['answer'];
        $presentation = pmd_guest_ai_extract_actions_20260904($modelAnswer, $rawQuestion);
        $publicAnswer = pmd_guest_ai_public_answer_guard_20260904(
            (string)$presentation['answer'],
            $rawQuestion
        );
        $actions = (array)$presentation['actions'];

        // Persist only the guest-safe answer. Reattach allowlisted markers so
        // history can reconstruct the same user-click action buttons later.
        $storedAnswer = $publicAnswer;
        foreach ($actions as $action) {
            $id = strtolower(trim((string)($action['id'] ?? '')));
            if (in_array($id, ['call_waiter', 'view_cart', 'checkout'], true)) {
                $storedAnswer .= "\n[[PMD_ACTION:{$id}]]";
            }
        }

        $visitKey = null;
        $persisted = false;
        $storageReady = null;
        if ($tableId > 0 && $guestSessionId !== '') {
            try {
                $saved = app(GuestAiConversationStore::class)->appendPair(
                    $locationId,
                    $tableId,
                    $guestSessionId,
                    $rawQuestion,
                    $storedAnswer,
                    $responseLocale,
                    $runId
                );
                $visitKey = (string)($saved['visit_key'] ?? '');
                $persisted = (bool)($saved['persisted'] ?? false);
                $storageReady = (bool)($saved['storage_ready'] ?? false);
            } catch (\Throwable $storeError) {
                $storageReady = false;
                logger()->warning('PMD Guest AI chat persistence failed', [
                    'run_id' => $runId,
                    'type' => get_class($storeError),
                    'location_id' => $locationId,
                    'table_id' => $tableId,
                ]);
            }
        }

        return response()->json([
            'ok' => true,
            'run_id' => $runId,
            'answer' => $publicAnswer,
            'actions' => $actions,
            'response_locale' => $responseLocale,
            'ui_locale' => $uiLocale,
            'visit_key' => $visitKey ?: null,
            'persisted' => $persisted,
            'storage_ready' => $storageReady,
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
            'table_id' => is_numeric($request->input('table_id')) ? (int)$request->input('table_id') : null,
            'question_length' => mb_strlen((string)$request->input('question', '')),
        ]);

        return response()->json([
            'ok' => false,
            'run_id' => $runId,
            'storage_ready' => false,
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