<?php

namespace App\Services\AI;

use Illuminate\Http\UploadedFile;
use RuntimeException;
use Throwable;

/**
 * Read-only multimodal extraction for restaurant onboarding/menu migration.
 *
 * This service never writes Menu, Category, Table or image records. It returns
 * a reviewable draft only. The browser must send approved rows through the
 * existing PMD write authorities after the human reviews the extraction.
 */
final class MenuImportAiService
{
    private AiProvider $provider;
    private AiHealthService $health;
    private AiBudgetService $budget;
    private AiUsageLedger $usage;
    private AiAuditLogger $audit;

    public function __construct(
        ?AiProvider $provider = null,
        ?AiHealthService $health = null,
        ?AiBudgetService $budget = null,
        ?AiUsageLedger $usage = null,
        ?AiAuditLogger $audit = null
    ) {
        $this->provider = $provider ?: $this->resolveProvider();
        $this->health = $health ?: new AiHealthService();
        $this->budget = $budget ?: new AiBudgetService();
        $this->usage = $usage ?: new AiUsageLedger();
        $this->audit = $audit ?: new AiAuditLogger();
    }

    /**
     * @param UploadedFile[] $menuSources Photos/screenshots/PDFs containing menu or old-system data.
     * @param UploadedFile[] $itemImages Optional dedicated food photos that AI may match to items.
     * @param array<int,array{id:int,name:string}> $existingCategories
     */
    public function analyse(
        AiContext $context,
        array $menuSources,
        array $itemImages = [],
        array $existingCategories = []
    ): array {
        if (!(bool)config('pmd_ai.enabled', false)) {
            throw new RuntimeException('PMD AI is disabled.');
        }
        if (!app(PmdAiTenantPolicyService::class)->adminEnabled()) {
            throw new RuntimeException('AI menu import is not enabled for this restaurant yet.');
        }
        if (!$menuSources) {
            throw new RuntimeException('Upload at least one menu photo, screenshot or PDF.');
        }

        $model = trim((string)config('pmd_ai.model', ''));
        $providerName = $this->provider->name();
        $this->health->assertCanAttempt($providerName, $model);
        $this->budget->consume($context);
        $this->budget->consumeGlobal();

        $existingNames = array_values(array_filter(array_map(
            static fn (array $row): string => trim((string)($row['name'] ?? '')),
            $existingCategories
        )));

        $content = [[
            'type' => 'input_text',
            'text' => $this->taskText($existingNames, count($menuSources), count($itemImages)),
        ]];

        foreach ($menuSources as $index => $file) {
            if (!$file instanceof UploadedFile) continue;
            $content[] = [
                'type' => 'input_text',
                'text' => 'MENU_SOURCE_'.($index + 1).' filename='.$this->safeFilename($file),
            ];
            $content[] = $this->filePart($file);
        }

        foreach ($itemImages as $index => $file) {
            if (!$file instanceof UploadedFile) continue;
            $content[] = [
                'type' => 'input_text',
                'text' => 'FOOD_PHOTO_'.($index + 1).' filename='.$this->safeFilename($file),
            ];
            $content[] = $this->filePart($file);
        }

        $instructions = implode("\n", [
            'You are PMD Menu Import, a document and vision extraction assistant for authenticated restaurant administrators.',
            'Your output is a draft for human review. You have no authority to write restaurant data.',
            'Extract only information explicitly visible in the supplied menu pages, screenshots and PDFs.',
            'Never invent a missing item, category, price, description, floor, table count, dietary claim, allergen, ingredient or photo match.',
            'Prices must be numeric amounts without currency symbols. If a price is unreadable or absent, use null and add a review reason.',
            'Keep the source language for item/category names and descriptions. Do not translate unless the source itself contains translations.',
            'FOOD_PHOTO_n files are dedicated optional food photos. Set source_photo_index only when that dedicated photo clearly matches the item. Never use a whole menu-page image as an item photo and never guess a photo match.',
            'If an old management-system screenshot explicitly shows floor names and table counts, extract them. Never infer floors/tables from ordinary menu pages.',
            'When a source category clearly matches one of EXISTING_CATEGORIES, reuse that exact existing category spelling.',
            'Do not extract staff, customer, payment, reservation or credential data even if it appears in an old-system screenshot.',
            'Return JSON only. No markdown, commentary or code fences.',
        ]);

        $request = [
            'model' => $model,
            'instructions' => $instructions,
            'input' => [[
                'role' => 'user',
                'content' => $content,
            ]],
            'tools' => [],
            'tool_choice' => 'auto',
            'max_output_tokens' => 6000,
            'store' => false,
        ];

        $started = microtime(true);
        $body = [];
        $latencyMs = 0;

        $this->audit->write('menu_import_started', $context, [
            'provider' => $providerName,
            'menu_source_count' => count($menuSources),
            'item_photo_count' => count($itemImages),
            'existing_category_count' => count($existingNames),
        ]);

        try {
            $result = $this->provider->create($request);
            $body = (array)($result['body'] ?? []);
            $latencyMs = (int)($result['latency_ms'] ?? round((microtime(true) - $started) * 1000));
            $text = trim($this->provider->outputText($body));
            if ($text === '') {
                throw new RuntimeException('The AI importer returned no extraction.');
            }

            $decoded = $this->decodeJson($text);
            $draft = $this->normalizeDraft($decoded, count($itemImages));
            if (!$draft['items'] && !$draft['floors']) {
                throw new RuntimeException('No menu items or table structure could be read from the uploaded files.');
            }

            $usage = $this->provider->usage($body);
            $responseModel = $this->provider->responseModel($body);
            $this->health->markSuccess($providerName, $model, $latencyMs);
            $this->usage->record(
                $context,
                'admin',
                $providerName,
                $responseModel,
                $usage,
                $latencyMs,
                1,
                true
            );
            $this->audit->write('menu_import_completed', $context, [
                'provider' => $providerName,
                'model' => $responseModel,
                'latency_ms' => $latencyMs,
                'items_detected' => count($draft['items']),
                'categories_detected' => count($draft['categories']),
                'floors_detected' => count($draft['floors']),
            ]);

            return [
                'ok' => true,
                'draft' => $draft,
                'latency_ms' => $latencyMs,
            ];
        } catch (Throwable $error) {
            $latencyMs = $latencyMs > 0
                ? $latencyMs
                : (int)round((microtime(true) - $started) * 1000);
            $this->health->markFailure($providerName, $model, $error);
            $this->usage->record(
                $context,
                'admin',
                $providerName,
                $model,
                $body ? $this->provider->usage($body) : [],
                $latencyMs,
                1,
                false
            );
            $this->audit->write('menu_import_failed', $context, [
                'provider' => $providerName,
                'latency_ms' => $latencyMs,
                'error_type' => get_class($error),
                'error_message' => $error->getMessage(),
            ]);
            throw $error;
        }
    }

    private function taskText(array $existingCategories, int $sourceCount, int $photoCount): string
    {
        return json_encode([
            'task' => 'extract_restaurant_menu_and_optional_floor_structure',
            'menu_source_count' => $sourceCount,
            'dedicated_food_photo_count' => $photoCount,
            'existing_categories' => $existingCategories,
            'response_schema' => [
                'language' => 'BCP-47-ish source language code or auto',
                'currency' => 'currency code/symbol if clearly visible, otherwise null',
                'categories' => ['category name strings'],
                'items' => [[
                    'name' => 'required visible item name',
                    'category' => 'visible heading/category or Menu',
                    'price' => 'number or null',
                    'description' => 'visible description only, otherwise empty string',
                    'source_photo_index' => '1-based FOOD_PHOTO_n match or null',
                    'confidence' => '0..1',
                    'review_reasons' => ['short reasons for uncertain/missing fields'],
                ]],
                'floors' => [[
                    'name' => 'explicit visible floor/area name',
                    'table_count' => 'explicit positive integer count',
                    'confidence' => '0..1',
                ]],
            ],
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '{}';
    }

    private function filePart(UploadedFile $file): array
    {
        $path = $file->getRealPath();
        if (!is_string($path) || $path === '' || !is_file($path)) {
            throw new RuntimeException('One uploaded source file could not be read.');
        }

        $bytes = file_get_contents($path);
        if ($bytes === false) {
            throw new RuntimeException('One uploaded source file could not be read.');
        }

        $mime = strtolower(trim((string)$file->getMimeType()));
        $dataUrl = 'data:'.$mime.';base64,'.base64_encode($bytes);

        if ($mime === 'application/pdf') {
            return [
                'type' => 'input_file',
                'filename' => $this->safeFilename($file),
                'file_data' => $dataUrl,
            ];
        }

        return [
            'type' => 'input_image',
            'image_url' => $dataUrl,
            'detail' => 'high',
        ];
    }

    private function safeFilename(UploadedFile $file): string
    {
        $name = trim((string)$file->getClientOriginalName());
        $name = preg_replace('/[^\pL\pN._ -]+/u', '_', $name) ?: 'upload';
        return mb_substr($name, 0, 120);
    }

    private function decodeJson(string $text): array
    {
        $text = trim($text);
        $text = preg_replace('/^```(?:json)?\s*/iu', '', $text) ?: $text;
        $text = preg_replace('/\s*```$/u', '', $text) ?: $text;

        $decoded = json_decode($text, true);
        if (is_array($decoded)) return $decoded;

        $start = mb_strpos($text, '{');
        $end = mb_strrpos($text, '}');
        if ($start !== false && $end !== false && $end > $start) {
            $candidate = mb_substr($text, $start, $end - $start + 1);
            $decoded = json_decode($candidate, true);
            if (is_array($decoded)) return $decoded;
        }

        throw new RuntimeException('The AI importer returned invalid structured data.');
    }

    private function normalizeDraft(array $raw, int $photoCount): array
    {
        $categories = [];
        $seenCategories = [];
        $addCategory = static function ($value) use (&$categories, &$seenCategories): void {
            $name = trim((string)$value);
            if ($name === '') return;
            $name = mb_substr($name, 0, 128);
            $key = mb_strtolower($name);
            if (isset($seenCategories[$key])) return;
            $seenCategories[$key] = true;
            $categories[] = $name;
        };

        foreach ((array)($raw['categories'] ?? []) as $category) {
            $addCategory(is_array($category) ? ($category['name'] ?? '') : $category);
        }

        $items = [];
        $seenItems = [];
        foreach ((array)($raw['items'] ?? []) as $row) {
            if (!is_array($row)) continue;
            $name = trim((string)($row['name'] ?? ''));
            if ($name === '') continue;
            $name = mb_substr($name, 0, 128);
            $category = trim((string)($row['category'] ?? '')) ?: 'Menu';
            $category = mb_substr($category, 0, 128);
            $key = mb_strtolower($category.'|'.$name);
            if (isset($seenItems[$key])) continue;
            $seenItems[$key] = true;
            $addCategory($category);

            $price = $row['price'] ?? null;
            if (is_string($price)) {
                $price = preg_replace('/[^0-9.,-]+/', '', $price) ?: null;
                if (is_string($price) && str_contains($price, ',') && !str_contains($price, '.')) {
                    $price = str_replace(',', '.', $price);
                } elseif (is_string($price)) {
                    $price = str_replace(',', '', $price);
                }
            }
            $price = is_numeric($price) ? max(0, min(9999999, (float)$price)) : null;

            $photoIndex = is_numeric($row['source_photo_index'] ?? null)
                ? (int)$row['source_photo_index']
                : null;
            if ($photoIndex !== null && ($photoIndex < 1 || $photoIndex > $photoCount)) {
                $photoIndex = null;
            }

            $confidence = is_numeric($row['confidence'] ?? null)
                ? max(0, min(1, (float)$row['confidence']))
                : 0.5;

            $reviewReasons = [];
            foreach ((array)($row['review_reasons'] ?? []) as $reason) {
                $reason = trim((string)$reason);
                if ($reason !== '') $reviewReasons[] = mb_substr($reason, 0, 160);
            }
            if ($price === null && !in_array('Price needs review', $reviewReasons, true)) {
                $reviewReasons[] = 'Price needs review';
            }
            if ($confidence < 0.72 && !in_array('Low extraction confidence', $reviewReasons, true)) {
                $reviewReasons[] = 'Low extraction confidence';
            }

            $items[] = [
                'name' => $name,
                'category' => $category,
                'price' => $price,
                'description' => mb_substr(trim((string)($row['description'] ?? '')), 0, 1028),
                'source_photo_index' => $photoIndex,
                'confidence' => round($confidence, 3),
                'review_reasons' => array_values(array_unique($reviewReasons)),
            ];

            if (count($items) >= 250) break;
        }

        $floors = [];
        $seenFloors = [];
        foreach ((array)($raw['floors'] ?? []) as $row) {
            if (!is_array($row)) continue;
            $name = mb_substr(trim((string)($row['name'] ?? '')), 0, 80);
            $count = is_numeric($row['table_count'] ?? null) ? (int)$row['table_count'] : 0;
            if ($name === '' || $count < 1) continue;
            $count = max(1, min(60, $count));
            $key = mb_strtolower($name);
            if (isset($seenFloors[$key])) continue;
            $seenFloors[$key] = true;
            $floors[] = [
                'name' => $name,
                'table_count' => $count,
                'confidence' => is_numeric($row['confidence'] ?? null)
                    ? round(max(0, min(1, (float)$row['confidence'])), 3)
                    : 0.5,
            ];
            if (count($floors) >= 8) break;
        }

        return [
            'language' => mb_substr(trim((string)($raw['language'] ?? 'auto')), 0, 24) ?: 'auto',
            'currency' => ($currency = trim((string)($raw['currency'] ?? ''))) !== ''
                ? mb_substr($currency, 0, 12)
                : null,
            'categories' => $categories,
            'items' => $items,
            'floors' => $floors,
        ];
    }

    private function resolveProvider(): AiProvider
    {
        $provider = strtolower(trim((string)config('pmd_ai.provider', '')));
        if ($provider === 'openai') return new OpenAiResponsesProvider();
        if ($provider === 'gemini') return new GeminiGenerateContentProvider();
        throw new RuntimeException('Unsupported PMD AI provider. Set PMD_AI_PROVIDER explicitly.');
    }
}
