<?php

namespace Tests\Unit;

use App\Services\AI\AiRedactor;
use App\Services\AI\GeminiGenerateContentProvider;
use App\Services\AI\OpenAiResponsesProvider;
use PHPUnit\Framework\TestCase;

class PmdAiFoundationTest extends TestCase
{
    public function test_redactor_removes_secret_and_guest_identifiers(): void
    {
        $redactor = new AiRedactor();
        $result = $redactor->forModel([
            'customer_name' => 'Guest Example',
            'email' => 'guest@example.test',
            'note' => 'key sk-test_abcdefghijklmnopqrstuvwxyz and 4242 4242 4242 4242',
            'safe_metric' => 42,
        ]);

        $this->assertSame('[REDACTED]', $result['customer_name']);
        $this->assertSame('[REDACTED]', $result['email']);
        $this->assertStringNotContainsString('sk-test_', $result['note']);
        $this->assertStringNotContainsString('4242 4242', $result['note']);
        $this->assertSame(42, $result['safe_metric']);
    }

    public function test_provider_extracts_response_text(): void
    {
        $provider = new OpenAiResponsesProvider();
        $text = $provider->outputText([
            'output' => [[
                'type' => 'message',
                'content' => [[
                    'type' => 'output_text',
                    'text' => 'PMD_OPENAI_OK',
                ]],
            ]],
        ]);

        $this->assertSame('PMD_OPENAI_OK', $text);
    }

    public function test_provider_extracts_function_calls_without_exposing_scope_arguments(): void
    {
        $provider = new OpenAiResponsesProvider();
        $calls = $provider->functionCalls([
            'output' => [[
                'type' => 'function_call',
                'call_id' => 'call_1',
                'name' => 'owner_kpis',
                'arguments' => '{}',
            ]],
        ]);

        $this->assertCount(1, $calls);
        $this->assertSame('owner_kpis', $calls[0]['name']);
        $this->assertSame('{}', $calls[0]['arguments']);
    }

    public function test_gemini_provider_extracts_text(): void
    {
        $provider = new GeminiGenerateContentProvider();
        $text = $provider->outputText([
            'candidates' => [[
                'content' => [
                    'role' => 'model',
                    'parts' => [[
                        'text' => 'PMD_GEMINI_OK',
                        'thoughtSignature' => 'encrypted-signature',
                    ]],
                ],
            ]],
        ]);

        $this->assertSame('PMD_GEMINI_OK', $text);
    }

    public function test_gemini_provider_preserves_function_call_id_and_thought_signature(): void
    {
        $provider = new GeminiGenerateContentProvider();
        $response = [
            'candidates' => [[
                'content' => [
                    'role' => 'model',
                    'parts' => [[
                        'functionCall' => [
                            'id' => 'fc_123',
                            'name' => 'owner_kpis',
                            'args' => [],
                        ],
                        'thoughtSignature' => 'encrypted-signature',
                    ]],
                ],
            ]],
        ];

        $calls = $provider->functionCalls($response);
        $history = $provider->modelHistoryItems($response);
        $toolResult = $provider->toolResultItem(
            $calls[0],
            ['revenue' => 42]
        );

        $this->assertCount(1, $calls);
        $this->assertSame('fc_123', $calls[0]['call_id']);
        $this->assertSame('owner_kpis', $calls[0]['name']);
        $this->assertSame('{}', $calls[0]['arguments']);
        $this->assertSame(
            'encrypted-signature',
            $history[0]['content']['parts'][0]['thoughtSignature']
        );
        $this->assertSame('fc_123', $toolResult['call_id']);
        $this->assertSame('owner_kpis', $toolResult['name']);
        $this->assertSame(42, $toolResult['response']['result']['revenue']);
    }
}
