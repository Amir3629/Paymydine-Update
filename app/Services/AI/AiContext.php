<?php

namespace App\Services\AI;

final class AiContext
{
    public ?int $tenantId;
    public ?string $tenantDatabase;
    public ?string $tenantDomain;
    public ?int $locationId;
    public ?int $userId;
    public ?int $staffId;
    public array $permissions;
    public string $locale;
    public string $timezone;
    public string $runId;
    public string $task;

    public function __construct(
        ?int $tenantId,
        ?string $tenantDatabase,
        ?string $tenantDomain,
        ?int $locationId,
        ?int $userId,
        ?int $staffId,
        array $permissions,
        string $locale,
        string $timezone,
        string $runId,
        string $task
    ) {
        $this->tenantId = $tenantId;
        $this->tenantDatabase = $tenantDatabase;
        $this->tenantDomain = $tenantDomain;
        $this->locationId = $locationId;
        $this->userId = $userId;
        $this->staffId = $staffId;
        $this->permissions = $permissions;
        $this->locale = $locale;
        $this->timezone = $timezone;
        $this->runId = $runId;
        $this->task = $task;
    }

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
