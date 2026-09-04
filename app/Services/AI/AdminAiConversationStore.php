<?php

namespace App\Services\AI;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Throwable;

/**
 * Tenant-local persistence for the authenticated PMD Intelligence workspace.
 *
 * Scope is deliberately narrow:
 * - current tenant connection is already selected by the Admin request;
 * - one conversation per authenticated admin user + canonical location + restaurant-local day;
 * - prior days remain stored but are not mixed into today's conversation;
 * - only user/assistant text and run id are stored;
 * - provider payloads, secrets, IP addresses and raw tool payloads are never stored.
 */
final class AdminAiConversationStore
{
    private const TABLE = 'pmd_admin_ai_conversations';
    private const MAX_MESSAGES = 300;

    public function history(int $locationId, int $userId, int $limit = 120): array
    {
        $this->assertContext($locationId, $userId);
        $limit = max(1, min(self::MAX_MESSAGES, $limit));

        if (!$this->ensureSchema()) {
            return ['storage_ready' => false, 'messages' => []];
        }

        $conversationDate = $this->conversationDate();
        $rows = DB::table(self::TABLE)
            ->where('location_id', $locationId)
            ->where('admin_user_id', $userId)
            ->where('conversation_date', $conversationDate)
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->reverse()
            ->values();

        return [
            'storage_ready' => true,
            'conversation_date' => $conversationDate,
            'messages' => $rows->map(static function ($row): array {
                return [
                    'id' => (int)($row->id ?? 0),
                    'role' => (string)($row->role ?? ''),
                    'content' => (string)($row->content ?? ''),
                    'run_id' => $row->run_id ? (string)$row->run_id : null,
                    'created_at' => isset($row->created_at) ? (string)$row->created_at : null,
                ];
            })->all(),
        ];
    }

    /**
     * Compact conversational continuity for today's model session. This is not
     * a factual authority: Pmdintelligence instructs the model to re-check PMD
     * tools for restaurant facts instead of trusting an older assistant answer.
     */
    public function modelContext(int $locationId, int $userId, int $limit = 10): array
    {
        $history = $this->history($locationId, $userId, max(2, min(20, $limit)));
        if (empty($history['storage_ready']) || empty($history['messages'])) {
            return [];
        }

        $messages = array_slice((array)$history['messages'], -max(2, min(20, $limit)));
        $total = 0;
        $result = [];

        foreach ($messages as $message) {
            $role = ($message['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
            $content = trim((string)($message['content'] ?? ''));
            if ($content === '') continue;

            if (mb_strlen($content) > 1200) {
                $content = rtrim(mb_substr($content, 0, 1199)).'…';
            }

            if ($total + mb_strlen($content) > 7000) {
                break;
            }

            $total += mb_strlen($content);
            $result[] = ['role' => $role, 'content' => $content];
        }

        return $result;
    }

    public function appendPair(
        int $locationId,
        int $userId,
        string $question,
        string $answer,
        ?string $runId = null
    ): array {
        $this->assertContext($locationId, $userId);

        if (!$this->ensureSchema()) {
            return ['storage_ready' => false, 'persisted' => false];
        }

        $question = $this->clip($question, 4000);
        $answer = $this->clip($answer, 12000);
        $runId = trim((string)$runId);
        $conversationDate = $this->conversationDate();

        try {
            DB::transaction(function () use ($locationId, $userId, $question, $answer, $runId, $conversationDate): void {
                $now = now();
                $common = [
                    'location_id' => $locationId,
                    'admin_user_id' => $userId,
                    'conversation_date' => $conversationDate,
                    'run_id' => $runId !== '' ? mb_substr($runId, 0, 64) : null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];

                DB::table(self::TABLE)->insert(array_merge($common, [
                    'role' => 'user',
                    'content' => $question,
                ]));

                DB::table(self::TABLE)->insert(array_merge($common, [
                    'role' => 'assistant',
                    'content' => $answer,
                ]));

                // Bound only today's transcript. Previous daily chats remain stored.
                $staleIds = DB::table(self::TABLE)
                    ->where('location_id', $locationId)
                    ->where('admin_user_id', $userId)
                    ->where('conversation_date', $conversationDate)
                    ->orderByDesc('id')
                    ->skip(self::MAX_MESSAGES)
                    ->pluck('id')
                    ->map(static fn ($id) => (int)$id)
                    ->filter(static fn ($id) => $id > 0)
                    ->all();

                if ($staleIds) {
                    DB::table(self::TABLE)->whereIn('id', $staleIds)->delete();
                }
            });
        } catch (Throwable $error) {
            logger()->warning('PMD Admin AI chat write failed', [
                'location_id' => $locationId,
                'admin_user_id' => $userId,
                'conversation_date' => $conversationDate,
                'error_type' => get_class($error),
            ]);
            return ['storage_ready' => true, 'persisted' => false];
        }

        return [
            'storage_ready' => true,
            'persisted' => true,
            'conversation_date' => $conversationDate,
        ];
    }

    /** Clear only today's restaurant-local conversation; archived days remain. */
    public function clear(int $locationId, int $userId): bool
    {
        $this->assertContext($locationId, $userId);
        if (!$this->ensureSchema()) return false;

        DB::table(self::TABLE)
            ->where('location_id', $locationId)
            ->where('admin_user_id', $userId)
            ->where('conversation_date', $this->conversationDate())
            ->delete();

        return true;
    }

    private function ensureSchema(): bool
    {
        try {
            if (!Schema::hasTable(self::TABLE)) {
                Schema::create(self::TABLE, function (Blueprint $table): void {
                    $table->bigIncrements('id');
                    $table->unsignedBigInteger('location_id');
                    $table->unsignedBigInteger('admin_user_id');
                    $table->date('conversation_date');
                    $table->string('role', 16);
                    $table->longText('content');
                    $table->string('run_id', 64)->nullable();
                    $table->timestamps();
                    $table->index(['location_id', 'admin_user_id', 'id'], 'pmd_admin_ai_scope_idx');
                    $table->index(
                        ['location_id', 'admin_user_id', 'conversation_date', 'id'],
                        'pmd_admin_ai_day_scope_idx'
                    );
                });
            } elseif (!Schema::hasColumn(self::TABLE, 'conversation_date')) {
                Schema::table(self::TABLE, function (Blueprint $table): void {
                    $table->date('conversation_date')->nullable();
                    $table->index(
                        ['location_id', 'admin_user_id', 'conversation_date', 'id'],
                        'pmd_admin_ai_day_scope_idx'
                    );
                });
            }

            // Preserve pre-daily-rollout rows instead of deleting them. Their
            // historical SQL date becomes their archive day; all new writes use
            // the canonical restaurant-local date below.
            if (Schema::hasColumn(self::TABLE, 'conversation_date')) {
                DB::table(self::TABLE)
                    ->whereNull('conversation_date')
                    ->whereNotNull('created_at')
                    ->update(['conversation_date' => DB::raw('DATE(created_at)')]);
            }
        } catch (Throwable $error) {
            if (!Schema::hasTable(self::TABLE) || !Schema::hasColumn(self::TABLE, 'conversation_date')) {
                logger()->warning('PMD Admin AI chat schema unavailable', [
                    'error_type' => get_class($error),
                    'database' => DB::connection()->getDatabaseName(),
                ]);
                return false;
            }
        }

        return Schema::hasTable(self::TABLE)
            && Schema::hasColumn(self::TABLE, 'conversation_date');
    }

    private function conversationDate(): string
    {
        $timezone = '';

        try {
            $timezone = trim((string)app(PmdReadAuthority::class)->canonicalTimezone());
        } catch (Throwable $error) {
            $timezone = '';
        }

        if ($timezone === '') {
            $timezone = trim((string)config('app.timezone', 'UTC')) ?: 'UTC';
        }

        try {
            return Carbon::now($timezone)->toDateString();
        } catch (Throwable $error) {
            return Carbon::now('UTC')->toDateString();
        }
    }

    private function assertContext(int $locationId, int $userId): void
    {
        if ($locationId < 1 || $userId < 1) {
            throw new RuntimeException('A canonical location and authenticated admin user are required.');
        }
    }

    private function clip(string $value, int $limit): string
    {
        $value = trim($value);
        if (mb_strlen($value) <= $limit) return $value;
        return rtrim(mb_substr($value, 0, max(1, $limit - 1))).'…';
    }
}
