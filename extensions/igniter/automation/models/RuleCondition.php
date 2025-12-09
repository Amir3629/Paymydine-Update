<?php

namespace Igniter\Automation\Models;

use Igniter\Flame\Database\Model;

class RuleCondition extends Model
{
    /**
     * @var string The database table name
     */
    protected $table = 'igniter_automation_rule_conditions';

    public $timestamps = true;

    protected $guarded = [];

    public $relation = [
        'belongsTo' => [
            'automation_rule' => [AutomationRule::class, 'key' => 'automation_rule_id'],
        ],
    ];

    protected $casts = [
        'options' => 'array',
    ];

    public $rules = [
        'class_name' => 'required',
    ];

    //
    // Attributes
    //

    public function getNameAttribute()
    {
        $condition = $this->getConditionObject();
        return $condition ? $condition->getConditionName() : 'Unknown Condition';
    }

    public function getDescriptionAttribute()
    {
        $condition = $this->getConditionObject();
        return $condition ? $condition->getConditionDescription() : 'Condition class not found';
    }

    //
    // Events
    //

    protected function afterFetch()
    {
        $this->applyConditionClass();
    }

    /**
     * Extends this model with the condition class
     * @param string $class Class name
     * @return bool
     */
    public function applyConditionClass($class = null)
    {
        if (!$class)
            $class = $this->class_name;

        if (!$class)
            return false;

        // Check if class exists before trying to extend
        if (!class_exists($class)) {
            \Log::warning("Automation condition class not found: {$class}");
            return false;
        }

        if (!$this->isClassExtendedWith($class)) {
            $this->extendClassWith($class);
        }

        $this->class_name = $class;

        return true;
    }

    /**
     * @return \Igniter\Automation\Classes\BaseCondition|null
     */
    public function getConditionObject()
    {
        if (!$this->applyConditionClass()) {
            return null;
        }

        try {
            return $this->asExtension($this->getConditionClass());
        } catch (\Exception $e) {
            \Log::warning("Failed to get condition object for class: {$this->class_name} - {$e->getMessage()}");
            return null;
        }
    }

    public function getConditionClass()
    {
        return $this->class_name;
    }
}
