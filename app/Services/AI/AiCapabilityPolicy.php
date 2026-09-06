<?php

namespace App\Services\AI;

/**
 * Central policy for deciding which AI tool capabilities may be exposed to an
 * authenticated PMD operator. The model never decides its own authority.
 */
final class AiCapabilityPolicy
{
    private const OWNER_TOOLS = [
        'restaurant_identity',
        'owner_kpis',
        'report_snapshot',
        'report_range',
        'order_integrity_range',
        'workforce_schedule_range',
        'kitchen_workforce',
    ];

    private const ORDER_TOOLS = [
        'restaurant_identity',
        'report_snapshot',
        'kitchen_workforce',
    ];

    private const RESERVATION_TOOLS = [
        'restaurant_identity',
        'report_snapshot',
        'report_range',
    ];

    public function allowedToolNames(AiContext $context): array
    {
        if (!app(PmdAiTenantPolicyService::class)->adminEnabled()) {
            return [];
        }

        $permissions = array_values(array_unique(array_map(
            static fn ($value) => strtolower(trim((string)$value)),
            $context->permissions
        )));

        if (in_array('admin.dashboard', $permissions, true)) {
            return self::OWNER_TOOLS;
        }

        $allowed = ['restaurant_identity'];
        if (in_array('admin.orders', $permissions, true)) {
            $allowed = array_merge($allowed, self::ORDER_TOOLS);
        }
        if (in_array('admin.reservations', $permissions, true)) {
            $allowed = array_merge($allowed, self::RESERVATION_TOOLS);
        }

        return array_values(array_unique($allowed));
    }

    public function filterTools(AiContext $context, array $tools): array
    {
        $allowed = array_flip($this->allowedToolNames($context));
        return array_filter(
            $tools,
            static fn ($tool, $name) => isset($allowed[(string)$name]),
            ARRAY_FILTER_USE_BOTH
        );
    }

    public function allows(AiContext $context, string $toolName): bool
    {
        return in_array($toolName, $this->allowedToolNames($context), true);
    }
}
