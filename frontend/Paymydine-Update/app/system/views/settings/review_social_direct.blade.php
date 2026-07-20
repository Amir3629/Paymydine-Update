<?php
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$fields = [
    'pmd_review_share_prompt_enabled' => ['label' => 'Checkout review share prompt', 'type' => 'switch', 'default' => '1'],
    'pmd_home_social_icons_enabled' => ['label' => 'Homepage social icons', 'type' => 'switch', 'default' => '1'],

    'pmd_social_instagram_enabled' => ['label' => 'Instagram enabled', 'type' => 'switch', 'default' => '0'],
    'pmd_social_instagram_url' => ['label' => 'Instagram URL', 'type' => 'text', 'default' => ''],

    'pmd_social_google_enabled' => ['label' => 'Google / Maps enabled', 'type' => 'switch', 'default' => '0'],
    'pmd_social_google_url' => ['label' => 'Google / Maps URL', 'type' => 'text', 'default' => ''],

    'pmd_social_trustpilot_enabled' => ['label' => 'Trustpilot enabled', 'type' => 'switch', 'default' => '0'],
    'pmd_social_trustpilot_url' => ['label' => 'Trustpilot URL', 'type' => 'text', 'default' => ''],

    'pmd_social_reviews_enabled' => ['label' => 'Reviews page enabled', 'type' => 'switch', 'default' => '0'],
    'pmd_social_reviews_url' => ['label' => 'Reviews page URL', 'type' => 'text', 'default' => ''],

    'pmd_social_website_enabled' => ['label' => 'Website enabled', 'type' => 'switch', 'default' => '0'],
    'pmd_social_website_url' => ['label' => 'Website URL', 'type' => 'text', 'default' => ''],
];

$table = Schema::hasTable('settings') ? 'settings' : null;
$itemCol = $table && Schema::hasColumn($table, 'item') ? 'item' : null;
$valueCol = $table && Schema::hasColumn($table, 'value') ? 'value' : null;

$success = null;
$error = null;

if (request()->isMethod('post')) {
    try {
        if (!$table || !$itemCol || !$valueCol) {
            throw new Exception('Settings table shape was not found.');
        }

        foreach ($fields as $key => $meta) {
            $value = $meta['type'] === 'switch'
                ? (request()->has($key) ? '1' : '0')
                : trim((string)request()->input($key, ''));

            DB::table($table)->updateOrInsert(
                [$itemCol => $key],
                [$valueCol => $value]
            );
        }

        $success = 'Review & Social Links settings saved.';
    } catch (Throwable $e) {
        $error = $e->getMessage();
    }
}

$values = [];
try {
    if ($table && $itemCol && $valueCol) {
        $rows = DB::table($table)
            ->whereIn($itemCol, array_keys($fields))
            ->get();

        foreach ($rows as $row) {
            $values[$row->{$itemCol}] = (string)$row->{$valueCol};
        }
    }
} catch (Throwable $e) {
    $error = $error ?: $e->getMessage();
}

$getValue = function ($key) use ($fields, $values) {
    return array_key_exists($key, $values) ? $values[$key] : $fields[$key]['default'];
};
?>

<div class="row-fluid">
    <div class="col-md-12">
        <div class="page-header">
            <h2>Review & Social Links</h2>
            <p class="text-muted">Manage checkout review sharing and homepage social icons.</p>
        </div>

        <?php if ($success): ?>
            <div class="alert alert-success"><?= e($success) ?></div>
        <?php endif; ?>

        <?php if ($error): ?>
            <div class="alert alert-danger"><?= e($error) ?></div>
        <?php endif; ?>

        <form method="POST" action="<?= e(request()->fullUrl()) ?>">
            <?= csrf_field() ?>

            <div class="panel panel-default">
                <div class="panel-heading">
                    <h4 class="panel-title">General</h4>
                </div>
                <div class="panel-body">
                    <?php foreach (['pmd_review_share_prompt_enabled', 'pmd_home_social_icons_enabled'] as $key): ?>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" name="<?= e($key) ?>" value="1" <?= $getValue($key) === '1' ? 'checked' : '' ?>>
                                <?= e($fields[$key]['label']) ?>
                            </label>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <div class="panel panel-default">
                <div class="panel-heading">
                    <h4 class="panel-title">Platforms</h4>
                </div>
                <div class="panel-body">
                    <?php
                    $platforms = [
                        'instagram' => 'Instagram',
                        'google' => 'Google / Maps',
                        'trustpilot' => 'Trustpilot',
                        'reviews' => 'Reviews Page',
                        'website' => 'Website',
                    ];
                    ?>

                    <?php foreach ($platforms as $key => $label): ?>
                        <div class="form-group row" style="border-bottom:1px solid #eee;padding-bottom:16px;margin-bottom:16px;">
                            <label class="col-sm-3 control-label"><?= e($label) ?></label>
                            <div class="col-sm-9">
                                <label style="margin-bottom:8px;display:block;">
                                    <input type="checkbox"
                                           name="pmd_social_<?= e($key) ?>_enabled"
                                           value="1"
                                           <?= $getValue("pmd_social_{$key}_enabled") === '1' ? 'checked' : '' ?>>
                                    Enabled
                                </label>

                                <input type="url"
                                       class="form-control"
                                       name="pmd_social_<?= e($key) ?>_url"
                                       value="<?= e($getValue("pmd_social_{$key}_url")) ?>"
                                       placeholder="https://...">
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <div class="form-buttons">
                <button type="submit" class="btn btn-primary">
                    Save Settings
                </button>

                <a href="<?= e(admin_url('settings')) ?>" class="btn btn-default">
                    Back to Settings
                </a>
            </div>
        </form>
    </div>
</div>
