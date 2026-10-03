<?php

namespace Admin\Controllers\Concerns;

use Admin\Facades\AdminAuth;
use Admin\Models\Menus_model;
use Admin\Models\Orders_model;
use Admin\Models\Payments_model;
use App\Services\TerminalPayments\TerminalPaymentService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

trait PmdWaiterPosRenderEndpoints
{
    public function index($tableId = null)
    {
        $table = $this->resolveTable((int)$tableId);
        if (!$table) {
            return response('Table not found.', 404);
        }

        $bootstrap = $this->payload($table);
        $shell = view()->file(base_path('app/admin/views/waiter_pos_shell.blade.php'), [
            'bootstrap' => $bootstrap,
            'embedded' => false,
        ])->render();

        return view()->file(base_path('app/admin/views/waiter_pos.blade.php'), [
            'bootstrap' => $bootstrap,
            'shell' => $shell,
        ]);
    }

    public function overlay($tableId = null)
    {
        $table = $this->resolveTable((int)$tableId);
        if (!$table) {
            return response()->json(['ok' => false, 'message' => 'Table not found.'], 404);
        }

        $bootstrap = $this->payload($table);
        $html = view()->file(base_path('app/admin/views/waiter_pos_shell.blade.php'), [
            'bootstrap' => $bootstrap,
            'embedded' => true,
        ])->render();

        return response()->json([
            'ok' => true,
            'version' => 'pmd-waiter-pos-v2',
            'html' => $html,
            'bootstrap' => $bootstrap,
        ]);
    }

    public function data($tableId = null)
    {
        $table = $this->resolveTable((int)$tableId);
        if (!$table) {
            return response()->json(['ok' => false, 'message' => 'Table not found.'], 404);
        }

        return response()->json($this->payload($table));
    }

}
