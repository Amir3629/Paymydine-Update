<?php

namespace App\Services\Turkey;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Native Turkey restaurant inventory/recipe ledger.
 */
final class TurkeyInventoryService
{
    public function __construct(private ?TurkeyTenantContext $context = null)
    {
        $this->context = $context ?: new TurkeyTenantContext();
    }

    public function recordMovement(array $movement, ?int $locationId = null): array
    {
        $state = $this->context->requireTurkey($locationId);
        if (!Schema::hasTable('pmd_tr_stock_movements')) throw new \RuntimeException('Türkiye inventory foundation is not provisioned.');

        $key = trim((string)($movement['idempotency_key'] ?? ''));
        if ($key === '') throw new \InvalidArgumentException('idempotency_key is required.');
        $existing = DB::table('pmd_tr_stock_movements')->where('idempotency_key', $key)->first();
        if ($existing) return ['ok' => true, 'duplicate' => true, 'id' => (int)$existing->id];

        $id = (int)DB::table('pmd_tr_stock_movements')->insertGetId([
            'location_id' => (int)($state['location_id'] ?? 0),
            'ingredient_id' => (int)($movement['ingredient_id'] ?? 0),
            'stock_location' => $movement['stock_location'] ?? null,
            'qty' => (float)($movement['qty'] ?? 0),
            'unit_cost' => (float)($movement['unit_cost'] ?? 0),
            'movement_type' => (string)($movement['movement_type'] ?? 'ADJUSTMENT'),
            'reference_type' => $movement['reference_type'] ?? null,
            'reference_id' => isset($movement['reference_id']) ? (string)$movement['reference_id'] : null,
            'idempotency_key' => $key,
            'occurred_at' => $movement['occurred_at'] ?? now(),
            'metadata_json' => json_encode((array)($movement['metadata'] ?? []), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return ['ok' => true, 'duplicate' => false, 'id' => $id];
    }

    public function onHand(int $ingredientId, ?int $locationId = null, ?string $stockLocation = null): float
    {
        $state = $this->context->requireTurkey($locationId);
        $query = DB::table('pmd_tr_stock_movements')
            ->where('location_id', (int)($state['location_id'] ?? 0))
            ->where('ingredient_id', $ingredientId);
        if ($stockLocation !== null) $query->where('stock_location', $stockLocation);
        return (float)$query->sum('qty');
    }

    public function theoreticalRecipeCost(int $menuItemId): array
    {
        $this->context->requireTurkey();
        $recipe = DB::table('pmd_tr_recipes')
            ->where('menu_item_id', $menuItemId)
            ->where('active', 1)
            ->orderByDesc('version')
            ->first();
        if (!$recipe) return ['ok' => false, 'reason' => 'recipe_not_found', 'cost' => 0.0];

        $lines = DB::table('pmd_tr_recipe_lines')->where('recipe_id', $recipe->id)->get();
        $total = 0.0;
        $details = [];
        foreach ($lines as $line) {
            $last = DB::table('pmd_tr_stock_movements')
                ->where('ingredient_id', $line->ingredient_id)
                ->where('unit_cost', '>', 0)
                ->orderByDesc('occurred_at')
                ->orderByDesc('id')
                ->first();
            $unitCost = (float)($last->unit_cost ?? 0);
            $lineCost = (float)$line->net_qty * $unitCost;
            $total += $lineCost;
            $details[] = [
                'ingredient_id' => (int)$line->ingredient_id,
                'net_qty' => (float)$line->net_qty,
                'unit_cost' => $unitCost,
                'line_cost' => $lineCost,
            ];
        }

        return ['ok' => true, 'recipe_id' => (int)$recipe->id, 'cost' => round($total, 4), 'lines' => $details];
    }

    public function recordWaste(array $waste, ?int $locationId = null): array
    {
        $state = $this->context->requireTurkey($locationId);
        $key = trim((string)($waste['idempotency_key'] ?? ''));
        if ($key === '') throw new \InvalidArgumentException('idempotency_key is required.');
        $existing = DB::table('pmd_tr_waste_events')->where('idempotency_key', $key)->first();
        if ($existing) return ['ok' => true, 'duplicate' => true, 'id' => (int)$existing->id];

        return DB::transaction(function () use ($state, $waste, $key): array {
            $id = (int)DB::table('pmd_tr_waste_events')->insertGetId([
                'location_id' => (int)($state['location_id'] ?? 0),
                'ingredient_id' => (int)$waste['ingredient_id'],
                'qty' => abs((float)$waste['qty']),
                'reason' => $waste['reason'] ?? null,
                'idempotency_key' => $key,
                'occurred_at' => $waste['occurred_at'] ?? now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->recordMovement([
                'ingredient_id' => (int)$waste['ingredient_id'],
                'qty' => -abs((float)$waste['qty']),
                'unit_cost' => (float)($waste['unit_cost'] ?? 0),
                'movement_type' => 'WASTE',
                'reference_type' => 'waste_event',
                'reference_id' => $id,
                'idempotency_key' => 'waste:'.$key,
                'occurred_at' => $waste['occurred_at'] ?? now(),
            ], (int)($state['location_id'] ?? 0));

            return ['ok' => true, 'duplicate' => false, 'id' => $id];
        });
    }
}
