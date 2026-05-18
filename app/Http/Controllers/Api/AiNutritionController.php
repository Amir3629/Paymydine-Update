<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AiNutritionSuggestionService;
use Illuminate\Http\Request;

class AiNutritionController extends Controller
{
    public function suggest(Request $request, AiNutritionSuggestionService $suggester)
    {
        $validated = $request->validate([
            'food_name' => ['nullable', 'required_without:ingredients', 'string', 'max:160'],
            'ingredients' => ['nullable', 'required_without:food_name', 'string', 'max:1200'],
        ]);

        $suggestion = $suggester->suggest(
            (string)($validated['food_name'] ?? ''),
            (string)($validated['ingredients'] ?? '')
        );

        return response()->json([
            'success' => true,
            'data' => $suggestion,
        ]);
    }
}
