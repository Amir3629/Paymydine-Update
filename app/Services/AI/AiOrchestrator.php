<?php

namespace App\Services\AI;

use RuntimeException;
use Throwable;

final class AiOrchestrator
{
    private OpenAiResponsesProvider $provider;
    private AiAuditLogger $audit;
    private AiRedactor $redactor;
    private AiBudgetService $budget;

    public function __construct(
        ?OpenAiResponsesProvider $provider = null,
        ?AiAuditLogger $audit = null,
        ?AiRedactor $redactor = null,
        ?AiBudgetService $budget = null
    ) {
        $this->provider = $provider ?: new OpenAiResponsesProvider();
        $this->audit = $audit ?: new AiAuditLogger();
        $this->redactor = $redactor ?: new AiRedactor();
        $this->budget = $budget ?: new AiBudgetService();
    }

    public function ask(AiContext $context, string $question, array $tools): array
    {
        if (!(bool)config('pmd_ai.enabled', false)) {
            throw new RuntimeException('PMD Intelligence is disabled. Set PMD_AI_ENABLED=true on the server after validation.');
        }

        if ((string)config('pmd_ai.provider', 'openai') !== 'openai') {
            throw new RuntimeException('PMD Intelligence V1 currently requires PMD_AI_PROVIDER=openai.');
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
            'You are PMD Intelligence, the read-only operations copilot for PayMyDine restaurant owners.',
            'Use tools for restaurant facts. Never invent KPI values, payment state, staffing state, reservations, orders, menu performance, or device state.',
            'The server already fixed the tenant, database, authenticated user, permissions, and location. Never ask for or attempt to change tenant/database/location scope.',
            'You cannot write data. Never claim to create, void, refund, settle, capture, mark paid, change tax/VAT/fiscal data, reset MFA, change attendance/rosters, edit menus, or assign reservations.',
            'When evidence is unavailable, say it is unavailable. Distinguish fact from recommendation.',
            'Keep the answer operational: start with the most important finding, then evidence, then recommended next actions.',
            'Use the user locale where practical. Avoid exposing internal database names, secrets, tokens, stack traces, or raw personal data.',
        ]);

        $input = [
            ['role' => 'user', 'content' => $question],
        ];
        $maxCalls = max(1, (int)config('pmd_ai.max_tool_calls', 6));
        $callsMade = 0;
        $toolTrace = [];
        $requestIds = [];
        $latencyMs = 0;
        $lastResponse = null;

        $this->audit->write('run_started', $context, [
            'question_length' => mb_strlen($question),
            'tool_names' => array_keys($tools),
        ]);

        try {
            while (true) {
                $request = [
                    'model' => (string)config('pmd_ai.model', 'gpt-5.6-luna'),
                    'instructions' => $instructions,
                    'input' => $input,
                    'tools' => $toolDefinitions,
                    'tool_choice' => 'auto',
                    'max_output_tokens' => max(200, (int)config('pmd_ai.max_output_tokens', 1400)),
                    'store' => (bool)config('pmd_ai.store_provider_response', false),
                ];

                $result = $this->provider->create($request);
                $lastResponse = $result['body'];
                $latencyMs += (int)$result['latency_ms'];
                if (!empty($result['request_id'])) {
                    $requestIds[] = $result['request_id'];
                }

                $calls = $this->provider->functionCalls($lastResponse);
                if (!$calls) {
                    $answer = $this->provider->outputText($lastResponse);
                    if ($answer === '') {
                        throw new RuntimeException('OpenAI returned no answer text.');
                    }

                    $usage = (array)($lastResponse['usage'] ?? []);
                    $this->audit->write('run_completed', $context, [
                        'tool_trace' => $toolTrace,
                        'provider_request_ids' => $requestIds,
                        'latency_ms' => $latencyMs,
                        'usage' => $usage,
                    ]);

                    return [
                        'ok' => true,
                        'run_id' => $context->runId,
                        'answer' => $answer,
                        'model' => (string)($lastResponse['model'] ?? config('pmd_ai.model')),
                        'tool_trace' => $toolTrace,
                        'usage' => $usage,
                        'latency_ms' => $latencyMs,
                    ];
                }

                // Carry the assistant output forward exactly once, then attach one
                // function_call_output for each requested tool call.
                foreach ((array)($lastResponse['output'] ?? []) as $outputItem) {
                    $input[] = $outputItem;
                }

                foreach ($calls as $call) {
                    $callsMade++;
                    if ($callsMade > $maxCalls) {
                        throw new RuntimeException('AI tool-call limit reached safely.');
                    }

                    $name = $call['name'];
                    if (!isset($tools[$name]) || !is_callable($tools[$name]['handler'] ?? null)) {
                        throw new RuntimeException('Model requested an unavailable tool.');
                    }

                    $arguments = json_decode($call['arguments'], true);
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

                    $input[] = [
                        'type' => 'function_call_output',
                        'call_id' => $call['call_id'],
                        'output' => json_encode($output, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                    ];
                }
            }
        } catch (Throwable $error) {
            $this->audit->write('run_failed', $context, [
                'tool_trace' => $toolTrace,
                'provider_request_ids' => $requestIds,
                'latency_ms' => $latencyMs,
                'error_type' => get_class($error),
                'error_message' => $error->getMessage(),
            ]);
            throw $error;
        }
    }
}
