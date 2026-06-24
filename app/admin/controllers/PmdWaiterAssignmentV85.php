<?php namespace Admin\Controllers;

class PmdWaiterAssignmentV85 extends \Admin\Classes\AdminController
{
    public function index() { return $this->compat('index'); }
    public function audit() { return $this->compat('audit'); }
    public function setup() { return $this->compat('setup'); }
    public function refresh() { return $this->compat('refresh'); }
    public function data() { return $this->compat('data'); }
    public function assign() { return $this->compat('assign'); }
    public function auto() { return $this->compat('auto'); }
    public function clear() { return $this->compat('clear'); }
    public function clearMerges() { return $this->compat('clearMerges'); }
    public function cleanFake() { return $this->compat('cleanFake'); }
    public function addItem() { return $this->compat('addItem'); }
    public function merge() { return $this->compat('merge'); }
    public function resetTables() { return $this->compat('resetTables'); }
    public function details() { return $this->compat('details'); }
    public function menu() { return $this->compat('menu'); }
    public function tables() { return $this->compat('tables'); }
    public function orders() { return $this->compat('orders'); }

    public function __call($name, $arguments)
    {
        return $this->compat($name);
    }

    protected function compat($method = 'compat')
    {
        $payload = [
            'ok' => true,
            'version' => 'v116c-legacy-safe-stub',
            'controller' => __CLASS__,
            'method' => $method,
            'message' => 'Old waiter assignment controller was safely neutralized. Active waiter UI should use newer floor/menu endpoints.'
        ];

        if (function_exists('response')) {
            return response()->json($payload);
        }

        header('Content-Type: application/json');
        echo json_encode($payload);
        exit;
    }
}
