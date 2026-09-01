<?php

namespace Tests\Unit;

use App\Services\AI\AiRedactor;
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
}
