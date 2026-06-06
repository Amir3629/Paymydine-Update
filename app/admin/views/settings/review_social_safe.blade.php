<?php
/*
|--------------------------------------------------------------------------
| PMD_REVIEW_SOCIAL_SAFE_SETTINGS_VIEW_20260606
|--------------------------------------------------------------------------
| Direct safe view for /admin/settings/edit/review_social.
| It avoids the broken null widget render path.
|--------------------------------------------------------------------------
*/

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$fields = [
    'pmd_review_share_prompt_enabled' => ['label' => 'Enable checkout review share prompt', 'type' => 'switch'],
    'pmd_home_social_icons_enabled' => ['label' => 'Enable homepage social icons', 'type' => 'switch'],

    'pmd_social_instagram_enabled' => ['label' => 'Instagram enabled', 'type' => 'switch'],
    'pmd_social_instagram_url' => ['label' => 'Instagram URL', 'type' => 'text'],

    'pmd_social_google_enabled' => ['label' => 'Google / Maps enabled', 'type' => 'switch'],
    'pmd_social_google_url' => ['label' => 'Google / Maps URL', 'type' => 'text'],

    'pmd_social_trustpilot_enabled' => ['label' => 'Trustpilot enabled', 'type' => 'switch'],
    'pmd_social_trustpilot_url' => ['label' => 'Trustpilot URL', 'type' => 'text'],

    'pmd_social_reviews_enabled' => ['label' => 'Reviews page enabled', 'type' => 'switch'],
    'pmd_social_reviews_url' => ['label' => 'Reviews page URL', 'type' => 'text'],

    'pmd_social_website_enabled' => ['label' => 'Website enabled', 'type' => 'switch'],
    'pmd_social_website_url' => ['label' => 'Website URL', 'type' => 'text'],
];

$values = [];
$error = null;

try {
    if (!Schema::hasTable('settings')) {
        throw new Exception('settings table not found');
    }

    $cols = Schema::getColumnListing('settings');
    $keyCol = in_array('item', $cols, true) ? 'item' : (in_array('key', $cols, true) ? 'key' : null);
    $valueCol = in_array('value', $cols, true) ? 'value' : (in_array('data', $cols, true) ? 'data' : null);

    if (!$keyCol || !$valueCol) {
        throw new Exception('settings table columns not recognized: '.implode(', ', $cols));
    }

    $values = DB::table('settings')
        ->whereIn($keyCol, array_keys($fields))
        ->pluck($valueCol, $keyCol)
        ->all();
} catch (Throwable $e) {
    $error = $e->getMessage();
}

$getValue = function ($key, $default = '') use ($values) {
    return array_key_exists($key, $values) ? $values[$key] : $default;
};

$checked = function ($key, $default = '0') use ($getValue) {
    return (string)$getValue($key, $default) === '1' ? 'checked' : '';
};
?>

<div class="container-fluid">
    <div class="page-header">
        <h1>Review & Social Links</h1>
        <p class="help-block">
            Configure checkout review sharing and homepage social icons.
        </p>
    </div>

    <?php if (session()->has('success')): ?>
        <div class="alert alert-success"><?= e(session('success')) ?></div>
    <?php endif; ?>

    <?php if ($error): ?>
        <div class="alert alert-danger">
            <strong>Settings could not be loaded:</strong> <?= e($error) ?>
        </div>
    <?php endif; ?>

    <form method="POST" action="<?= admin_url('pmd-review-social-safe-save') ?>" class="form-horizontal">
        <?= csrf_field() ?>

        <div class="panel panel-default">
            <div class="panel-heading">
                <h4 class="panel-title">General</h4>
            </div>
            <div class="panel-body">
                <div class="form-group">
                    <label class="control-label col-sm-4">Checkout review share prompt</label>
                    <div class="col-sm-8">
                        <input type="hidden" name="pmd_review_share_prompt_enabled" value="0">
                        <label>
                            <input type="checkbox" name="pmd_review_share_prompt_enabled" value="1" <?= $checked('pmd_review_share_prompt_enabled', '1') ?>>
                            Enabled
                        </label>
                    </div>
                </div>

                <div class="form-group">
                    <label class="control-label col-sm-4">Homepage social icons</label>
                    <div class="col-sm-8">
                        <input type="hidden" name="pmd_home_social_icons_enabled" value="0">
                        <label>
                            <input type="checkbox" name="pmd_home_social_icons_enabled" value="1" <?= $checked('pmd_home_social_icons_enabled', '1') ?>>
                            Enabled
                        </label>
                    </div>
                </div>
            </div>
        </div>

        <?php
        $platforms = [
            'instagram' => 'Instagram',
            'google' => 'Google / Maps',
            'trustpilot' => 'Trustpilot',
            'reviews' => 'Reviews Page',
            'website' => 'Website',
        ];
        ?>

        <div class="panel panel-default">
            <div class="panel-heading">
                <h4 class="panel-title">Platforms</h4>
            </div>
            <div class="panel-body">
                <?php foreach ($platforms as $key => $label): ?>
                    <div class="form-group">
                        <label class="control-label col-sm-4"><?= e($label) ?></label>
                        <div class="col-sm-8">
                            <input type="hidden" name="pmd_social_<?= e($key) ?>_enabled" value="0">
                            <label style="display:block;margin-bottom:8px;">
                                <input type="checkbox" name="pmd_social_<?= e($key) ?>_enabled" value="1" <?= $checked("pmd_social_{$key}_enabled", '0') ?>>
                                Enabled
                            </label>
                            <input
                                type="url"
                                class="form-control"
                                name="pmd_social_<?= e($key) ?>_url"
                                value="<?= e($getValue("pmd_social_{$key}_url", '')) ?>"
                                placeholder="https://..."
                            >
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>

        <div class="form-buttons">
            <button type="submit" class="btn btn-primary">
                Save settings
            </button>
            <a href="<?= admin_url() ?>" class="btn btn-default">
                Back
            </a>
        </div>
    </form>
</div>
