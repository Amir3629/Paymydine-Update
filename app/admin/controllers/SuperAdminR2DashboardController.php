<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class SuperAdminR2DashboardController extends AdminController
{
    private const MAX_CHART_MONTHS = 12;

    public function dashboard(Request $request): SymfonyResponse
    {
        $restaurants = DB::connection('mysql')->table('tenants')->orderByDesc('id')->get();
        $now = now()->startOfDay();

        $stats = [
            'total' => $restaurants->count(),
            'active' => $restaurants->filter(fn($restaurant) => strtolower((string)$restaurant->status) === 'active')->count(),
            'disabled' => $restaurants->filter(fn($restaurant) => strtolower((string)$restaurant->status) === 'disabled')->count(),
            'removed' => $restaurants->filter(fn($restaurant) => strtolower((string)$restaurant->status) === 'removed')->count(),
            'expired' => $restaurants->filter(function ($restaurant) use ($now) {
                if (empty($restaurant->end)) return false;
                try { return Carbon::parse($restaurant->end)->lt($now); }
                catch (\Throwable $e) { return false; }
            })->count(),
        ];

        [$rangeFrom, $rangeTo] = $this->resolveChartRange($request);
        $monthCursor = $rangeFrom->copy()->startOfMonth();
        $lastMonth = $rangeTo->copy()->startOfMonth();
        $growth = collect();

        while ($monthCursor->lte($lastMonth)) {
            $bucketStart = $monthCursor->copy()->startOfMonth();
            $bucketEnd = $monthCursor->copy()->endOfMonth();
            if ($bucketStart->lt($rangeFrom)) $bucketStart = $rangeFrom->copy();
            if ($bucketEnd->gt($rangeTo)) $bucketEnd = $rangeTo->copy();

            $value = $restaurants->filter(function ($restaurant) use ($bucketStart, $bucketEnd) {
                if (empty($restaurant->created_at)) return false;
                try {
                    $created = Carbon::parse($restaurant->created_at);
                    return $created->gte($bucketStart) && $created->lte($bucketEnd);
                } catch (\Throwable $e) {
                    return false;
                }
            })->count();

            $growth->push([
                'label' => $monthCursor->format('M'),
                'label_long' => $monthCursor->format('M Y'),
                'value' => $value,
            ]);
            $monthCursor->addMonth();
        }

        $growthMax = max(1, (int)$growth->max('value'));
        $chartRange = [
            'from' => $rangeFrom->toDateString(),
            'to' => $rangeTo->toDateString(),
        ];

        $countryCounts = $restaurants
            ->filter(fn($restaurant) => strtolower((string)$restaurant->status) !== 'removed')
            ->map(function ($restaurant) {
                $country = trim((string)($restaurant->country ?? ''));
                return $country !== '' ? $country : null;
            })
            ->filter()
            ->countBy()
            ->sortDesc();

        $countryTotal = (int)$countryCounts->sum();
        $topCountryCounts = $countryCounts->take(5);
        $otherCountryCount = max(0, $countryTotal - (int)$topCountryCounts->sum());

        $countryMix = $topCountryCounts
            ->map(function ($count, $country) use ($countryTotal) {
                return [
                    'label' => (string)$country,
                    'value' => (int)$count,
                    'percent' => $countryTotal > 0 ? round(((int)$count / $countryTotal) * 100, 1) : 0,
                ];
            })
            ->values();

        if ($otherCountryCount > 0) {
            $countryMix->push([
                'label' => 'Other',
                'value' => $otherCountryCount,
                'percent' => $countryTotal > 0 ? round(($otherCountryCount / $countryTotal) * 100, 1) : 0,
            ]);
        }

        $latest = $restaurants->take(8);

        return $this->html('admin::superadmin_r2.dashboard', compact(
            'stats', 'growth', 'growthMax', 'chartRange', 'countryMix', 'countryTotal', 'latest'
        ));
    }

    private function resolveChartRange(Request $request): array
    {
        $defaultTo = now()->endOfDay();
        $defaultFrom = now()->startOfMonth()->subMonths(5)->startOfDay();

        try {
            $from = $request->filled('from')
                ? Carbon::parse((string)$request->input('from'))->startOfDay()
                : $defaultFrom->copy();
            $to = $request->filled('to')
                ? Carbon::parse((string)$request->input('to'))->endOfDay()
                : $defaultTo->copy();
        } catch (\Throwable $e) {
            return [$defaultFrom, $defaultTo];
        }

        if ($from->gt($to)) {
            return [$defaultFrom, $defaultTo];
        }

        $monthSpan = $from->copy()->startOfMonth()->diffInMonths($to->copy()->startOfMonth()) + 1;
        if ($monthSpan > self::MAX_CHART_MONTHS) {
            $from = $to->copy()->startOfMonth()->subMonths(self::MAX_CHART_MONTHS - 1)->startOfDay();
        }

        return [$from, $to];
    }

    private function html(string $view, array $data = []): SymfonyResponse
    {
        return new SymfonyResponse(
            view($view, $data)->render(),
            200,
            ['Content-Type' => 'text/html; charset=UTF-8', 'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0']
        );
    }
}
