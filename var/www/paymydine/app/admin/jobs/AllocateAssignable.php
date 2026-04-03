<?php

namespace Admin\Jobs;

use Admin\Classes\Allocator;
use Admin\Models\Assignable_logs_model;
use Admin\Models\Staff_groups_model;
use Admin\Traits\Assignable;
use App\Helpers\TenantContextHelper;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class AllocateAssignable implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** @var string Tenant database name */
    public $tenantDatabase;

    /** @var int Assignable log ID */
    public $assignableLogId;

    /** @var int */
    public $tries = 3;

    /**
     * @param string $tenantDatabase Tenant database name (from main DB tenants table)
     * @param int $assignableLogId Assignable log primary key
     */
    public function __construct(string $tenantDatabase, int $assignableLogId)
    {
        $this->tenantDatabase = $tenantDatabase;
        $this->assignableLogId = $assignableLogId;
    }

    public function handle()
    {
        TenantContextHelper::restoreTenantByDatabase($this->tenantDatabase);

        $assignableLog = Assignable_logs_model::find($this->assignableLogId);
        if (!$assignableLog) {
            return;
        }

        $lastAttempt = $this->attempts() >= $this->tries;

        try {
            if ($assignableLog->assignee_id) {
                return;
            }

            if (!in_array(Assignable::class, class_uses_recursive(get_class($assignableLog->assignable)))) {
                return;
            }

            if (!$assignableLog->assignee_group instanceof Staff_groups_model) {
                return;
            }

            Allocator::addSlot($assignableLog->getKey());

            $assignee = $assignableLog->assignee_group->findAvailableAssignee();
            if (!$assignee) {
                throw new Exception(lang('admin::lang.staff_groups.alert_no_available_assignee'));
            }

            $assignableLog->assignable->assignTo($assignee);

            Allocator::removeSlot($assignableLog->getKey());
        } catch (Exception $exception) {
            if (!$lastAttempt) {
                $waitInSeconds = $this->waitInSecondsAfterAttempt($this->attempts());
                $this->release($waitInSeconds);
            }
        }

        if ($lastAttempt) {
            $this->delete();
        }
    }

    protected function waitInSecondsAfterAttempt(int $attempt)
    {
        if ($attempt > 3) {
            return 1000;
        }
        return 10 ** $attempt;
    }
}
