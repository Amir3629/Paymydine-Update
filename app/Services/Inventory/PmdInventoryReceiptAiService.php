<?php

namespace App\Services\Inventory;

use App\Services\AI\AiBudgetService;
use App\Services\AI\AiHealthService;
use App\Services\AI\AiUsageLedger;
use App\Services\AI\GeminiGenerateContentProvider;
use App\Services\AI\OpenAiResponsesProvider;
use RuntimeException;
use Throwable;

/**
 * PMD_INVENTORY_RECEIPT_AI_R1
 *
 * Narrow multimodal extraction service for supplier receipts/invoices.
 * AI never changes stock directly. It only proposes structured purchase lines;
 * an authenticated Owner/Manager must review and confirm them.
 */
final class PmdInventoryReceiptAiService
{
    public function available(): bool
    {
        try {
            $status = app(AiHealthService::class)->status();
            return !empty($status['configured'])
                && !empty($status['available_for_traffic']);
        } catch (Throwable $error) {
            return false;
        }
    }

    public function extract(string $absolutePath, string $mimeType): array
    {
        if (!$this->available()) {
            throw new RuntimeException('PMD AI receipt extraction is not enabled on this server.');
        }

        if (!is_file($absolutePath) || !is_readable($absolutePath)) {
            throw new RuntimeException('The uploaded receipt could not be read.');
        }

        $allowed = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pdf',
        ];
        if (!in_array($mimeType, $allowed, true)) {
            throw new RuntimeException('Receipt must be JPG, PNG, WEBP or PDF.');
        }

        $bytes = file_get_contents($absolutePath);
        if ($bytes === false || $bytes === '') {
            throw new RuntimeException('The uploaded receipt is empty.');
        }
        if (strlen($bytes) > 8 * 1024 * 1024) {
            throw new RuntimeException('Receipt file must be 8 MB or smaller.');
        }

        $dataUrl = 'data:'.$mimeType.';base64,'.base64_encode($bytes);
        $providerName = strtolower(trim((string)config('pmd_ai.provider', '')));

        $provider = $providerName === 'gemini'
            ? new GeminiGenerateContentProvider()
            : new OpenAiResponsesProvider();

        $prompt = implode("\n", [
            'Read this restaurant supplier receipt or invoice.',
            'Return ONLY valid JSON. Do not use markdown.',
            'Extract what is visibly supported; never invent missing values.',
            'JSON shape:',
            '{',
            '  "supplier_name": string|null,',
            '  "invoice_number": string|null,',
            '  "purchase_date": "YYYY-MM-DD"|null,'
            '  "currency": string|null,',
            '  "total_amount": number|null,',
            '  "lines": [',
            '    {',
            '      "item_name": string,',
            '      "supplier_sku": string|null,',
            '      "quantity": number|null,',
            '      "unit": string|null,'
            '      "unit_cost": number|null,',
            '      "line_total": number|null',
            '    }',
            '  ]',
            '}',
            'Use practical stock units such as bottle, can, piece, pack, kg, g, l or ml when the document makes them clear.',
            'If the document shows a pack count (for example 6 bottles), set quantity to the received stock quantity when it is clear.',
            'Keep at most 80 line items.',
        ]);

        $inputPartType = $mimeType === 'application/pdf' ? 'input_file' : 'input_image';
        $mediaKey = $inputPartType === 'input_file' ? 'file_data' : 'image_url';

        $mediaPart = [
            'type' => $inputPartType,
            $mediaKey => $dataUrl,
        ];
        if ($inputPartType === 'input_file') {
            $mediaPart['filename'] = basename($absolutePath);
        }

        $payload = [
            'model' => trim((string)config('pmd_ai.model', '')),
            'instructions' => 'You extract supplier document facts for a restaurant inventory review. Be literal and conservative.',
            'input' => [[
                'role' => 'user',
                'content' => [
                    ['type' => 'input_text', 'text' => $prompt],
                    $mediaPart,
                ],
            ]],
            'max_output_tokens' => 1800,
            'store' => false,
        ];

        // Gemini owns this optional transport hint. The OpenAI Responses API
        // receives only fields it natively understands; its JSON-only behavior
        // is driven by the extraction instructions above.
        if ($providerName === 'gemini') {
            $payload['response_mime_type'] = 'application/json';
        }

        $model = trim((string)config('pmd_ai.model', ''));
        $health = app(AiHealthService::class);
        $budget = app(AiBudgetService::class);
        $ledger = app(AiUsageLedger::class);

        $health->assertCanAttempt($providerName, $model);
        $budget->consumeGlobal();

        $startedAt = microtime(true);
        try {
            $result = $provider->create($payload);
            $latencyMs = max(0, (int)round((microtime(true) - $startedAt) * 1000));
            $body = (array)($result['body'] ?? []);

            $health->markSuccess($providerName, $model, $latencyMs);
            $ledger->record(
                null,
                'admin',
                $providerName,
                $provider->responseModel($body) ?: $model,
                $provider->usage($body),
                $latencyMs,
                1,
                true
            );
        } catch (Throwable $error) {
            $latencyMs = max(0, (int)round((microtime(true) - $startedAt) * 1000));
            $health->markFailure($providerName, $model, $error);
            $ledger->record(
                null,
                'admin',
                $providerName,
                $model,
                [],
                $latencyMs,
                1,
                false
            );
            throw $error;
        }

        $text = trim($provider->outputText($body));
        if ($text === '') {
            throw new RuntimeException('AI returned no receipt data.');
        }

        $decoded = $this->decodeJson($text);
        if (!is_array($decoded)) {
            throw new RuntimeException('AI receipt output could not be parsed.');
        }

        $lines = [];
        foreach (array_slice((array)($decoded['lines'] ?? []), 0, 80) as $line) {
            if (!is_array($line)) {
                continue;
            }

            $name = trim((string)($line['item_name'] ?? ''));
            if ($name === '') {
                continue;
            }

            $quantity = $this->nullableNumber($line['quantity'] ?? null);
            $unitCost = $this->nullableNumber($line['unit_cost'] ?? null);
            $lineTotal = $this->nullableNumber($line['line_total'] ?? null);

            if (
                $unitCost === null
                && $lineTotal !== null
                && $quantity !== null
                && $quantity > 0
            ) {
                $unitCost = round($lineTotal / $quantity, 4);
            }

            $lines[] = [
                'item_name' => mb_substr($name, 0, 190),
                'supplier_sku' => $this->nullableText($line['supplier_sku'] ?? null, 160),
                'quantity' => $quantity,
                'unit' => $this->normalizeUnit($line['unit'] ?? null),
                'unit_cost' => $unitCost,
                'line_total' => $lineTotal,
            ];
        }

        return [
            'supplier_name' => $this->nullableText($decoded['supplier_name'] ?? null, 190),
            'invoice_number' => $this->nullableText($decoded['invoice_number'] ?? null, 120),
            'purchase_date' => $this->normalizeDate($decoded['purchase_date'] ?? null),
            'currency' => $this->nullableText($decoded['currency'] ?? null, 12),
            'total_amount' => $this->nullableNumber($decoded['total_amount'] ?? null),
            'lines' => $lines,
            'provider' => $provider->name(),
            'model' => $provider->responseModel($body),
        ];
    }

    private function decodeJson(string $text): ?array
    {
        $text = trim($text);
        $text = preg_replace('/^\x60{3}(?:json)?\s*/i', '', $text) ?? $text;
        $text = preg_replace('/\s*\x60{3}$/', '', $text) ?? $text;

        $decoded = json_decode($text, true);
        if (is_array($decoded)) {
            return $decoded;
        }

        $start = strpos($text, '{');
        $end = strrpos($text, '}');
        if ($start === false || $end === false || $end <= $start) {
            return null;
        }

        $decoded = json_decode(substr($text, $start, $end - $start + 1), true);
        return is_array($decoded) ? $decoded : null;
    }

    private function nullableNumber($value): ?float
    {
        if ($value === null || $value === '' || !is_numeric($value)) {
            return null;
        }

        return round((float)$value, 4);
    }

    private function nullableText($value, int $limit): ?string
    {
        $value = trim((string)($value ?? ''));
        return $value === '' ? null : mb_substr($value, 0, $limit);
    }

    private function normalizeDate($value): ?string
    {
        $value = trim((string)($value ?? ''));
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) ? $value : null;
    }

    private function normalizeUnit($value): ?string
    {
        $value = strtolower(trim((string)($value ?? '')));
        if ($value === '') {
            return null;
        }

        $map = [
            'pcs' => 'piece',
            'pc' => 'piece',
            'pieces' => 'piece',
            'bottles' => 'bottle',
            'cans' => 'can',
            'packs' => 'pack',
            'litre' => 'l',
            'liter' => 'l',
            'litres' => 'l',
            'liters' => 'l',
            'kilogram' => 'kg',
            'kilograms' => 'kg',
            'grams' => 'g',
            'milliliter' => 'ml',
            'millilitre' => 'ml',
        ];

        return mb_substr($map[$value] ?? $value, 0, 30);
    }
}
