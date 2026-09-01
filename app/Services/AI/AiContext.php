<?php

namespace App\Services\AI;

final class AiContext
{
    public function __construct(
        public readonly ?int $tenantId,
        public readonly ?string $tenantDatabase,
        public readonly ?string $tenantDomain,
        public readonly ?int $locationId,
        public readonly ?int $userId,
        public readonly ?int $staffId,
        public readonly array $permissions,
        public readonly string $locale,
        public readonly string $timezone,
        public readonly string $runId,
        public readonly string $task,
    ) {}

    public function audit(): array
    {
        return [
            'run_id' => $this->runId,
            'tenant_id' => $this->tenantId,
            'tenant_database' => $this->tenantDatabase,
            'tenant_domain' => $this->tenantDomain,
            'location_id' => $this->locationId,
            'user_id' => $this->userId,
            'staff_id' => $this->staffId,
            'permissions' => $this->permissions,
            'locale' => $this->locale,
            'timezone' => $this->timezone,
            'task' => $this->task,
        ];
    }
}
