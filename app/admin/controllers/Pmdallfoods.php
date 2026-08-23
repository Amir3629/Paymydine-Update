<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

/**
 * PMD_MENU_ALL_FOODS_PREFERENCE_R27
 *
 * Tenant-local preference authority for the virtual All Foods menu view.
 * All Foods is intentionally NOT a categories row and owns no food membership.
 * Removing it only hides the view; no food/category data is deleted.
 */
class Pmdallfoods extends AdminController
{
    protected $requiredPermissions = 'Admin.Categories';

    private const LABEL_KEY = 'pmd_menu_all_foods_label_r27';
    private const VISIBLE_KEY = 'pmd_menu_all_foods_visible_r27';

    public function index(): JsonResponse
    {
        return $this->onBootstrap();
    }

    public function onBootstrap(): JsonResponse
    {
        return response()->json([
            'ok' => true,
            'all_foods' => $this->preference(),
            'version' => 'all-foods-r27',
        ]);
    }

    public function onSave(): JsonResponse
    {
        $validator = Validator::make(request()->all(), [
            'label' => ['required', 'string', 'min:2', 'max:64'],
            'visible' => ['nullable', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'ok' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()->toArray(),
            ], 422);
        }

        $clean = $validator->validated();
        $label = trim((string)$clean['label']);
        $visible = array_key_exists('visible', $clean)
            ? (bool)$clean['visible']
            : $this->preference()['visible'];

        if ($label === '') {
            return response()->json([
                'ok' => false,
                'message' => 'All Foods name is required.',
            ], 422);
        }

        try {
            $this->writeSetting(self::LABEL_KEY, $label);
            $this->writeSetting(self::VISIBLE_KEY, $visible ? '1' : '0');
        } catch (\Throwable $error) {
            return response()->json([
                'ok' => false,
                'message' => 'All Foods preference could not be saved.',
            ], 500);
        }

        return response()->json([
            'ok' => true,
            'all_foods' => [
                'label' => $label,
                'visible' => $visible,
            ],
            'message' => 'All Foods preference saved.',
        ]);
    }

    public function onHide(): JsonResponse
    {
        try {
            $this->writeSetting(self::VISIBLE_KEY, '0');
        } catch (\Throwable $error) {
            return response()->json([
                'ok' => false,
                'message' => 'All Foods view could not be hidden.',
            ], 500);
        }

        $preference = $this->preference();
        $preference['visible'] = false;

        return response()->json([
            'ok' => true,
            'all_foods' => $preference,
            'message' => 'All Foods view hidden. No foods were deleted.',
        ]);
    }

    public function onRestore(): JsonResponse
    {
        try {
            $this->writeSetting(self::VISIBLE_KEY, '1');
        } catch (\Throwable $error) {
            return response()->json([
                'ok' => false,
                'message' => 'All Foods view could not be restored.',
            ], 500);
        }

        $preference = $this->preference();
        $preference['visible'] = true;

        return response()->json([
            'ok' => true,
            'all_foods' => $preference,
            'message' => 'All Foods view restored.',
        ]);
    }

    private function preference(): array
    {
        $defaultLabel = $this->defaultLabel();
        $label = trim((string)$this->readSetting(self::LABEL_KEY, $defaultLabel));
        if ($label === '') {
            $label = $defaultLabel;
        }

        $visibleRaw = (string)$this->readSetting(self::VISIBLE_KEY, '1');

        return [
            'label' => $label,
            'visible' => !in_array(strtolower(trim($visibleRaw)), ['0', 'false', 'off', 'no'], true),
        ];
    }

    private function defaultLabel(): string
    {
        $locale = strtolower(trim((string)request()->cookie(
            'pmd_admin_locale',
            app()->getLocale()
        )));

        return str_starts_with($locale, 'de')
            ? 'Alle Speisen'
            : 'All foods';
    }

    private function readSetting(string $key, $default = null)
    {
        if (!Schema::hasTable('settings')) {
            return $default;
        }

        $row = DB::table('settings')
            ->where('item', $key)
            ->first();

        if (!$row) {
            return $default;
        }

        $value = $row->value ?? $default;

        if (
            property_exists($row, 'serialized')
            && (int)($row->serialized ?? 0) === 1
            && is_string($value)
        ) {
            $decoded = @unserialize($value);
            if ($decoded !== false || $value === 'b:0;') {
                $value = $decoded;
            }
        }

        return $value;
    }

    private function writeSetting(string $key, string $value): void
    {
        if (!Schema::hasTable('settings')) {
            throw new \RuntimeException('Settings table is not available.');
        }

        $payload = [
            'value' => $value,
        ];

        if (Schema::hasColumn('settings', 'serialized')) {
            $payload['serialized'] = 0;
        }

        if (Schema::hasColumn('settings', 'sort')) {
            $payload['sort'] = 'pmd_menu';
        }

        DB::table('settings')->updateOrInsert(
            ['item' => $key],
            $payload
        );
    }
}
