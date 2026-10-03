<?php

namespace App\Http\Controllers\RestaurantGroups;

use App\Services\RestaurantGroups\FoodCourtQueue;
use App\Services\RestaurantGroups\Store;

final class DisplayController
{
    private function display(string $token, Store $store): object
    {
        if (!preg_match('/^[a-f0-9]{64}$/D', $token)) {
            abort(404);
        }

        $display = $store->central()->table('pmd_group_displays')
            ->where('token_hash', hash('sha256', $token))
            ->whereNull('revoked_at')
            ->first();

        if (!$display || now()->greaterThan($display->expires_at)) {
            abort(404);
        }

        return $display;
    }

    public function page(string $token, Store $store)
    {
        $display = $this->display($token, $store);
        $group = $store->group((int)$display->group_id);

        return view('pmd-groups::display', [
            'token' => $token,
            'groupName' => (string)$group->name,
        ]);
    }

    public function feed(
        string $token,
        Store $store,
        FoodCourtQueue $queue
    ) {
        $display = $this->display($token, $store);

        return response()->json($queue->feed($display))
            ->header('Cache-Control', 'no-store');
    }
}
