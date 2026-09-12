<?php

namespace App\Services\AI;

use Illuminate\Http\UploadedFile;
use RuntimeException;
use Throwable;

final class MenuImportAiService
{
    public function analyse(AiContext $context, array $menuSources, array $itemPhotos, array $existingCategories): array
    {
        if (!(bool)config('pmd_ai.enabled', false)) throw new RuntimeException('PMD AI is disabled.');
        if (!app(PmdAiTenantPolicyService::class)->adminEnabled()) throw new RuntimeException('AI menu import is not enabled for this restaurant yet.');
        if (!$menuSources) throw new RuntimeException('Upload at least one menu photo, screenshot or PDF.');

        $provider = strtolower(trim((string)config('pmd_ai.provider', '')));
        $model = trim((string)config('pmd_ai.model', ''));
        if (!in_array($provider, ['gemini', 'openai'], true) || $model === '') {
            throw new RuntimeException('PMD AI provider is not configured for menu import.');
        }

        $health = app(AiHealthService::class);
        $budget = app(AiBudgetService::class);
        $usageLedger = app(AiUsageLedger::class);
        $audit = app(AiAuditLogger::class);
        $health->assertCanAttempt($provider, $model);
        $budget->consume($context);
        $budget->consumeGlobal();

        $existingNames = array_values(array_filter(array_map(
            static fn ($row) => trim((string)($row['name'] ?? '')),
            $existingCategories
        )));
        $task = $this->taskText($existingNames, count($menuSources), count($itemPhotos));

        $audit->write('menu_import_started', $context, [
            'provider' => $provider,
            'menu_source_count' => count($menuSources),
            'item_photo_count' => count($itemPhotos),
        ]);

        $started = microtime(true);
        $body = [];
        try {
            if ($provider === 'gemini') {
                [$body, $latencyMs] = $this->callGemini($model, $task, $menuSources, $itemPhotos);
                $text = $this->geminiText($body);
                $providerUsage = (array)($body['usageMetadata'] ?? []);
                $responseModel = (string)($body['modelVersion'] ?? $model);
            } else {
                [$body, $latencyMs] = $this->callOpenAi($model, $task, $menuSources, $itemPhotos);
                $text = $this->openAiText($body);
                $providerUsage = (array)($body['usage'] ?? []);
                $responseModel = (string)($body['model'] ?? $model);
            }

            $decoded = $this->decodeJson($text);
            $draft = $this->normalizeDraft($decoded, count($itemPhotos));
            if (!$draft['items'] && !$draft['floors']) throw new RuntimeException('No menu items or table structure could be read from the uploaded files.');

            $health->markSuccess($provider, $model, $latencyMs);
            $usageLedger->record($context, 'admin', $provider, $responseModel, $providerUsage, $latencyMs, 1, true);
            $audit->write('menu_import_completed', $context, [
                'provider' => $provider,
                'model' => $responseModel,
                'items_detected' => count($draft['items']),
                'categories_detected' => count($draft['categories']),
                'floors_detected' => count($draft['floors']),
                'latency_ms' => $latencyMs,
            ]);

            return ['ok' => true, 'draft' => $draft, 'latency_ms' => $latencyMs];
        } catch (Throwable $error) {
            $latencyMs = (int)round((microtime(true) - $started) * 1000);
            $health->markFailure($provider, $model, $error);
            $usageLedger->record($context, 'admin', $provider, $model, [], $latencyMs, 1, false);
            $audit->write('menu_import_failed', $context, [
                'provider' => $provider,
                'error_type' => get_class($error),
                'error_message' => $error->getMessage(),
                'latency_ms' => $latencyMs,
            ]);
            throw $error;
        }
    }

    private function taskText(array $existingCategories, int $sourceCount, int $photoCount): string
    {
        return implode("\n", [
            'You are PMD Menu Import, a vision/document extraction assistant for restaurant onboarding.',
            'Return JSON only. No markdown.',
            'This is a human-review draft. Never write data and never invent missing facts.',
            'Extract categories, food names, visible descriptions and visible prices from the uploaded menu pages/screenshots/PDFs.',
            'Keep source-language names/descriptions. Do not translate.',
            'Price must be a numeric amount without currency symbols; use null when absent or unreadable.',
            'Dedicated FOOD_PHOTO_n images may be matched to an item only when the match is visually clear. Never use a whole menu-page screenshot as an item photo and never guess a photo match.',
            'If an old management-system screenshot explicitly shows floor/area names and table counts, extract them. Never infer tables from ordinary menu pages.',
            'Do not extract staff, customer, payment, reservation, credentials or private data.',
            'If a category clearly equals an existing category, reuse its exact spelling.',
            'EXISTING_CATEGORIES='.json_encode($existingCategories, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'MENU_SOURCE_COUNT='.$sourceCount,
            'FOOD_PHOTO_COUNT='.$photoCount,
            'Schema: {"language":"auto","currency":null,"categories":["..."],"items":[{"name":"...","category":"...","price":12.5,"description":"...","source_photo_index":1,"confidence":0.95,"review_reasons":[]}],"floors":[{"name":"Main Floor","table_count":12,"confidence":0.95}]}',
        ]);
    }

    private function callGemini(string $model, string $task, array $sources, array $photos): array
    {
        $key = trim((string)config('pmd_ai.gemini_api_key', ''));
        if ($key === '') throw new RuntimeException('GEMINI_API_KEY is not configured on the server.');
        $parts = [['text' => $task]];
        foreach ($sources as $i => $file) {
            if (!$file instanceof UploadedFile) continue;
            $parts[] = ['text' => 'MENU_SOURCE_'.($i + 1).' filename='.$this->safeName($file)];
            $parts[] = $this->geminiInline($file);
        }
        foreach ($photos as $i => $file) {
            if (!$file instanceof UploadedFile) continue;
            $parts[] = ['text' => 'FOOD_PHOTO_'.($i + 1).' filename='.$this->safeName($file)];
            $parts[] = $this->geminiInline($file);
        }

        $request = [
            'contents' => [['role' => 'user', 'parts' => $parts]],
            'generationConfig' => [
                'maxOutputTokens' => 6000,
                'responseMimeType' => 'application/json',
                'thinkingConfig' => ['thinkingLevel' => (string)config('pmd_ai.gemini_thinking_level', 'low')],
            ],
        ];
        $base = rtrim((string)config('pmd_ai.gemini_base_url', 'https://generativelanguage.googleapis.com'), '/');
        $url = $base.'/v1beta/models/'.rawurlencode($model).':generateContent';
        return $this->curlJson($url, [
            'x-goog-api-key: '.$key,
            'x-goog-api-client: paymydine-menu-import/1.0',
            'Content-Type: application/json',
        ], $request, true);
    }

    private function callOpenAi(string $model, string $task, array $sources, array $photos): array
    {
        $key = trim((string)config('pmd_ai.openai_api_key', ''));
        if ($key === '') throw new RuntimeException('OPENAI_API_KEY is not configured on the server.');
        $content = [['type' => 'input_text', 'text' => $task]];
        foreach ($sources as $i => $file) {
            if (!$file instanceof UploadedFile) continue;
            $content[] = ['type' => 'input_text', 'text' => 'MENU_SOURCE_'.($i + 1).' filename='.$this->safeName($file)];
            $content[] = $this->openAiPart($file);
        }
        foreach ($photos as $i => $file) {
            if (!$file instanceof UploadedFile) continue;
            $content[] = ['type' => 'input_text', 'text' => 'FOOD_PHOTO_'.($i + 1).' filename='.$this->safeName($file)];
            $content[] = $this->openAiPart($file);
        }
        $request = [
            'model' => $model,
            'input' => [['role' => 'user', 'content' => $content]],
            'max_output_tokens' => 6000,
            'store' => false,
        ];
        $url = rtrim((string)config('pmd_ai.openai_base_url', 'https://api.openai.com/v1'), '/').'/responses';
        return $this->curlJson($url, ['Authorization: Bearer '.$key, 'Content-Type: application/json'], $request, false);
    }

    private function curlJson(string $url, array $headers, array $payload, bool $forceIpv4): array
    {
        if (!function_exists('curl_init')) throw new RuntimeException('PHP cURL extension is required for AI menu import.');
        $timeout = max(10, (int)config('pmd_ai.request_timeout_seconds', 25));
        $started = microtime(true);
        $ch = curl_init($url);
        $options = [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => min(8, $timeout),
            CURLOPT_TIMEOUT => max(45, $timeout),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ];
        if ($forceIpv4 && (bool)config('pmd_ai.gemini_force_ipv4', true)) $options[CURLOPT_IPRESOLVE] = CURL_IPRESOLVE_V4;
        curl_setopt_array($ch, $options);
        $raw = curl_exec($ch);
        $error = curl_error($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        $latency = (int)round((microtime(true) - $started) * 1000);
        if ($raw === false || $error !== '') throw new RuntimeException('AI menu import transport failed: '.$error);
        $body = json_decode((string)$raw, true);
        if (!is_array($body)) throw new RuntimeException('AI menu import provider returned invalid JSON.');
        if ($status < 200 || $status >= 300) {
            $message = $body['error']['message'] ?? ('AI menu import HTTP '.$status);
            throw new RuntimeException((string)$message);
        }
        return [$body, $latency];
    }

    private function geminiInline(UploadedFile $file): array
    {
        return ['inlineData' => ['mimeType' => $this->mime($file), 'data' => base64_encode($this->bytes($file))]];
    }

    private function openAiPart(UploadedFile $file): array
    {
        $mime = $this->mime($file);
        $url = 'data:'.$mime.';base64,'.base64_encode($this->bytes($file));
        if ($mime === 'application/pdf') return ['type' => 'input_file', 'filename' => $this->safeName($file), 'file_data' => $url];
        return ['type' => 'input_image', 'image_url' => $url, 'detail' => 'high'];
    }

    private function bytes(UploadedFile $file): string
    {
        $path = $file->getRealPath();
        if (!is_string($path) || $path === '' || !is_file($path)) throw new RuntimeException('An uploaded source file could not be read.');
        $bytes = file_get_contents($path);
        if ($bytes === false) throw new RuntimeException('An uploaded source file could not be read.');
        return $bytes;
    }

    private function mime(UploadedFile $file): string
    {
        $mime = strtolower(trim((string)$file->getMimeType()));
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], true)) throw new RuntimeException('Menu sources must be JPG, PNG, WEBP or PDF.');
        return $mime;
    }

    private function safeName(UploadedFile $file): string
    {
        $name = preg_replace('/[^\pL\pN._ -]+/u', '_', trim((string)$file->getClientOriginalName())) ?: 'upload';
        return mb_substr($name, 0, 120);
    }

    private function geminiText(array $body): string
    {
        $out = [];
        foreach ((array)($body['candidates'][0]['content']['parts'] ?? []) as $part) if (empty($part['thought']) && isset($part['text'])) $out[] = (string)$part['text'];
        return trim(implode("\n", $out));
    }

    private function openAiText(array $body): string
    {
        $out = [];
        foreach ((array)($body['output'] ?? []) as $item) {
            if (($item['type'] ?? '') !== 'message') continue;
            foreach ((array)($item['content'] ?? []) as $part) if (($part['type'] ?? '') === 'output_text') $out[] = (string)($part['text'] ?? '');
        }
        return trim(implode("\n", $out));
    }

    private function decodeJson(string $text): array
    {
        $text = trim($text);
        if ($text === '') throw new RuntimeException('The AI importer returned no extraction.');
        $text = preg_replace('/^```(?:json)?\s*/iu', '', $text) ?: $text;
        $text = preg_replace('/\s*```$/u', '', $text) ?: $text;
        $decoded = json_decode($text, true);
        if (is_array($decoded)) return $decoded;
        $start = mb_strpos($text, '{'); $end = mb_strrpos($text, '}');
        if ($start !== false && $end !== false && $end > $start) {
            $decoded = json_decode(mb_substr($text, $start, $end - $start + 1), true);
            if (is_array($decoded)) return $decoded;
        }
        throw new RuntimeException('The AI importer returned invalid structured data.');
    }

    private function normalizeDraft(array $raw, int $photoCount): array
    {
        $categories = []; $seenCategories = [];
        $addCategory = static function ($value) use (&$categories, &$seenCategories): void {
            $name = mb_substr(trim((string)$value), 0, 128); if ($name === '') return;
            $key = mb_strtolower($name); if (isset($seenCategories[$key])) return;
            $seenCategories[$key] = true; $categories[] = $name;
        };
        foreach ((array)($raw['categories'] ?? []) as $row) $addCategory(is_array($row) ? ($row['name'] ?? '') : $row);

        $items = []; $seenItems = [];
        foreach ((array)($raw['items'] ?? []) as $row) {
            if (!is_array($row)) continue;
            $name = mb_substr(trim((string)($row['name'] ?? '')), 0, 128); if ($name === '') continue;
            $category = mb_substr(trim((string)($row['category'] ?? '')) ?: 'Menu', 0, 128);
            $key = mb_strtolower($category.'|'.$name); if (isset($seenItems[$key])) continue; $seenItems[$key] = true; $addCategory($category);
            $price = $row['price'] ?? null;
            if (is_string($price)) { $price = preg_replace('/[^0-9.,-]+/', '', $price) ?: null; if (is_string($price) && str_contains($price, ',') && !str_contains($price, '.')) $price = str_replace(',', '.', $price); elseif (is_string($price)) $price = str_replace(',', '', $price); }
            $price = is_numeric($price) ? max(0, min(9999999, (float)$price)) : null;
            $photo = is_numeric($row['source_photo_index'] ?? null) ? (int)$row['source_photo_index'] : null;
            if ($photo !== null && ($photo < 1 || $photo > $photoCount)) $photo = null;
            $confidence = is_numeric($row['confidence'] ?? null) ? max(0, min(1, (float)$row['confidence'])) : 0.5;
            $reasons = array_values(array_filter(array_map(static fn ($v) => mb_substr(trim((string)$v), 0, 160), (array)($row['review_reasons'] ?? []))));
            if ($price === null) $reasons[] = 'Price needs review';
            if ($confidence < .72) $reasons[] = 'Low extraction confidence';
            $items[] = ['name' => $name, 'category' => $category, 'price' => $price, 'description' => mb_substr(trim((string)($row['description'] ?? '')), 0, 1028), 'source_photo_index' => $photo, 'confidence' => round($confidence, 3), 'review_reasons' => array_values(array_unique($reasons))];
            if (count($items) >= 250) break;
        }

        $floors = []; $seenFloors = [];
        foreach ((array)($raw['floors'] ?? []) as $row) {
            if (!is_array($row)) continue;
            $name = mb_substr(trim((string)($row['name'] ?? '')), 0, 80); $count = is_numeric($row['table_count'] ?? null) ? (int)$row['table_count'] : 0;
            if ($name === '' || $count < 1) continue; $key = mb_strtolower($name); if (isset($seenFloors[$key])) continue; $seenFloors[$key] = true;
            $floors[] = ['name' => $name, 'table_count' => max(1, min(60, $count)), 'confidence' => is_numeric($row['confidence'] ?? null) ? round(max(0, min(1, (float)$row['confidence'])), 3) : .5];
            if (count($floors) >= 8) break;
        }

        return ['language' => mb_substr(trim((string)($raw['language'] ?? 'auto')), 0, 24) ?: 'auto', 'currency' => ($c = trim((string)($raw['currency'] ?? ''))) !== '' ? mb_substr($c, 0, 12) : null, 'categories' => $categories, 'items' => $items, 'floors' => $floors];
    }
}
