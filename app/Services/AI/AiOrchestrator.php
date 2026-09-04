<?php

namespace App\Services\AI;

use RuntimeException;
use Throwable;

final class AiOrchestrator
{
    private AiProvider $provider;
    private AiAuditLogger $audit;
    private AiRedactor $redactor;
    private AiBudgetService $budget;

    public function __construct(
        ?AiProvider $provider = null,
        ?AiAuditLogger $audit = null,
        ?AiRedactor $redactor = null,
        ?AiBudgetService $budget = null
    ) {
        $this->provider = $provider ?: $this->resolveProvider();
        $this->audit = $audit ?: new AiAuditLogger();
        $this->redactor = $redactor ?: new AiRedactor();
        $this->budget = $budget ?: new AiBudgetService();
    }

    public function ask(AiContext $context, string $question, array $tools): array
    {
        if (!(bool)config('pmd_ai.enabled', false)) {
            throw new RuntimeException('PMD Intelligence is disabled. Set PMD_AI_ENABLED=true on the server after validation.');
        }

        if ($context->locationId === null || $context->locationId < 1) {
            throw new RuntimeException('No canonical restaurant location is selected.');
        }

        $question = trim($question);
        if ($question === '') {
            throw new RuntimeException('A question is required.');
        }
        if (mb_strlen($question) > 4000) {
            throw new RuntimeException('Question is too long.');
        }

        $this->budget->consume($context);
        $safeQuestion = (string)$this->redactor->forModel($question, 'user_question');

        $toolDefinitions = [];
        foreach ($tools as $name => $tool) {
            if (!isset($tool['handler']) || !is_callable($tool['handler'])) {
                continue;
            }
            $toolDefinitions[] = [
                'type' => 'function',
                'name' => $name,
                'description' => (string)($tool['description'] ?? ''),
                'parameters' => $tool['parameters'] ?? [
                    'type' => 'object',
                    'properties' => new \stdClass(),
                    'additionalProperties' => false,
                ],
                'strict' => true,
            ];
        }

        $instructions = implode("\n", [
            'You are PMD Intelligence, a read-only assistant for authenticated restaurant operators.',
            'Your personality is warm, relaxed, friendly and concise. Sound like a smart restaurant teammate, not a compliance notice, corporate analyst, policy document or robot.',
            'Use PMD tools for restaurant facts. Never invent sales, payments, orders, staffing, reservations, menu performance, device state, or causes for missing activity.',
            'For any named historical day, month, year, or date range, use an explicit historical-range tool with the exact requested dates. Never relabel today or the current month as a historical period. If exact historical evidence is unavailable, say so instead of giving numeric historical claims.',
            'The server already fixed the restaurant, authenticated user, permissions, and location. Never ask for or attempt to change that scope.',
            'You cannot write data. Never claim to create, void, refund, settle, capture, mark paid, change tax/VAT/fiscal data, reset MFA, change attendance/rosters, edit menus, or assign reservations.',
            'Write for a busy restaurant operator, not a developer, accountant, data analyst, or engineer. Use plain words, short sentences, contractions where natural, and direct conclusions.',
            'Never flatter the signed-in user with hierarchy or status language. Do not call them boss, chief, king, queen, president, or similar titles, and do not use crown emojis. Do not address them as owner unless they explicitly ask what their PMD account role is; if they do, state the role neutrally.',
            'If restaurant_identity is used, treat name and role only as factual context. Never turn a role into praise, banter, status, or a nickname.',
            'Do not expose or mention technical terms such as tenant, database, canonical authority, source mode, settlement fields, function calls, tool names, API internals, stack traces, or implementation details unless the user explicitly asks for technical diagnostics.',
            'Default to a compact answer of about 70 to 150 words unless the user asks for detail. Prefer 2 to 4 short sections instead of a long report.',
            'Use friendly visual headings when useful, for example: ### ✨ Quick answer, ### 💰 Key numbers, ### ⚠️ Watch, ### ✅ Next step. Do not use markdown tables.',
            'Use emojis sparingly and naturally. One or two contextual emojis are enough; do not decorate every sentence.',
            'If the user asks an unrelated general-knowledge or trivia question, do not answer the trivia. Reply briefly and cheerfully, usually in 1 to 3 sentences. A good pattern is: sorry or playful refusal, a light joke about staying inside the restaurant world, then offer a useful PMD question. Never give a long explanation of your scope.',
            'For an off-topic question, it is fine to say something like: “😄 That one is outside my restaurant shift. I’m staying in PMD today — ask me who is running the floor, what sold best, or what needs attention.” Keep the joke contextual and never invent a real person’s role, title, or identity.',
            'Show only the few numbers that matter most. Do not dump every row returned by a report.',
            'For a useful day-by-day historical sales view with up to seven meaningful days, you may emit lines exactly like: 📊 2026-08-24 — €150 · 2 orders. The PMD UI can turn these lines into a small bar chart.',
            'Be precise with superlatives: highest volume means the highest order count; highest sales or highest revenue means the largest money amount. Never call a revenue peak the highest volume unless order count is also highest.',
            'Never invent explanations such as renovations, marketing campaigns, events, staff shortages, POS outages, or closures unless PMD evidence proves them. If the cause is unknown, simply say the cause is not visible in the available data.',
            'Do not rename financial metrics. If the PMD source says settled sales, gross, net, tips, or order total, keep that meaning. Do not call one metric another.',
            'Separate facts from suggestions. If a suggestion requires data you cannot read, phrase it as something the user may want to check, not something you already verified.',
            'Use the user locale where practical. Avoid exposing internal database names, secrets, tokens, raw personal data, or security-sensitive identifiers.',
        ]);

        $input = [
            ['role' => 'user', 'content' => $safeQuestion],
        ];
        $maxCalls = max(1, (int)config('pmd_ai.max_tool_calls', 6));
        $callsMade = 0;
        $toolTrace = [];
        $requestIds = [];
        $latencyMs = 0;
        $lastResponse = null;

        $this->audit->write('run_started', $context, [
            'provider' => $this->provider->name(),
            'model' => (string)config('pmd_ai.model', ''),
            'question_length' => mb_strlen($question),
            'question_redacted' => $safeQuestion !== $question,
            'tool_names' => array_keys($tools),
        ]);

        try {
            while (true) {
                $request = [
                    'model' => (string)config('pmd_ai.model', ''),
                    'instructions' => $instructions,
                    'input' => $input,
                    'tools' => $toolDefinitions,
                    'tool_choice' => 'auto',
                    'max_output_tokens' => max(200, (int)config('pmd_ai.max_output_tokens', 1400)),
                    'store' => (bool)config('pmd_ai.store_provider_response', false),
                ];

                $result = $this->provider->create($request);
                $lastResponse = (array)$result['body'];
                $latencyMs += (int)$result['latency_ms'];
                if (!empty($result['request_id'])) {
                    $requestIds[] = (string)$result['request_id'];
                }

                $calls = $this->provider->functionCalls($lastResponse);
                if (!$calls) {
                    $answer = $this->provider->outputText($lastResponse);
                    if ($answer === '') {
                        throw new RuntimeException(
                            ucfirst($this->provider->name()).' returned no answer text.'
                        );
                    }

                    $usage = $this->provider->usage($lastResponse);
                    $this->audit->write('run_completed', $context, [
                        'provider' => $this->provider->name(),
                        'tool_trace' => $toolTrace,
                        'provider_request_ids' => $requestIds,
                        'latency_ms' => $latencyMs,
                        'usage' => $usage,
                    ]);

                    return [
                        'ok' => true,
                        'run_id' => $context->runId,
                        'answer' => $answer,
                        'provider' => $this->provider->name(),
                        'model' => $this->provider->responseModel($lastResponse),
                        'tool_trace' => $toolTrace,
                        'usage' => $usage,
                        'latency_ms' => $latencyMs,
                    ];
                }

                foreach ($this->provider->modelHistoryItems($lastResponse) as $historyItem) {
                    $input[] = $historyItem;
                }

                foreach ($calls as $call) {
                    $callsMade++;
                    if ($callsMade > $maxCalls) {
                        throw new RuntimeException('AI tool-call limit reached safely.');
                    }

                    $name = (string)($call['name'] ?? '');
                    if (!isset($tools[$name]) || !is_callable($tools[$name]['handler'] ?? null)) {
                        throw new RuntimeException('Model requested an unavailable tool.');
                    }

                    $arguments = json_decode((string)($call['arguments'] ?? '{}'), true);
                    if (!is_array($arguments)) {
                        $arguments = [];
                    }

                    $started = microtime(true);
                    try {
                        $output = call_user_func($tools[$name]['handler'], $arguments, $context);
                        $output = $this->redactor->forModel($output);
                        $toolOk = true;
                    } catch (Throwable $toolError) {
                        $output = [
                            'available' => false,
                            'reason' => 'Source unavailable',
                        ];
                        $toolOk = false;
                        logger()->warning('PMD AI tool failed', [
                            'run_id' => $context->runId,
                            'tool' => $name,
                            'type' => get_class($toolError),
                            'message' => $toolError->getMessage(),
                            'location_id' => $context->locationId,
                        ]);
                    }

                    $toolTrace[] = [
                        'tool' => $name,
                        'ok' => $toolOk,
                        'duration_ms' => (int)round((microtime(true) - $started) * 1000),
                    ];

                    $input[] = $this->provider->toolResultItem($call, $output);
                }
            }
        } catch (Throwable $error) {
            $this->audit->write('run_failed', $context, [
                'provider' => $this->provider->name(),
                'tool_trace' => $toolTrace,
                'provider_request_ids' => $requestIds,
                'latency_ms' => $latencyMs,
                'error_type' => get_class($error),
                'error_message' => $error->getMessage(),
            ]);
            throw $error;
        }
    }

    private function resolveProvider(): AiProvider
    {
        $provider = strtolower(trim((string)config('pmd_ai.provider', 'openai')));

        if ($provider === 'openai') {
            return new OpenAiResponsesProvider();
        }

        if ($provider === 'gemini') {
            return new GeminiGenerateContentProvider();
        }

        throw new RuntimeException(
            'Unsupported PMD AI provider. Use PMD_AI_PROVIDER=openai or gemini.'
        );
    }
}
