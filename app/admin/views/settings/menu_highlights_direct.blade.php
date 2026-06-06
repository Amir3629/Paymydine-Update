<?php
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$defaults = [
    'pmd_menu_highlights_chef_section_enabled' => '1',
    'pmd_menu_highlights_bestseller_section_enabled' => '1',
    'pmd_menu_highlights_show_card_badges' => '1',
    'pmd_menu_highlights_show_modal_badges' => '1',
    'pmd_menu_highlights_chef_label' => 'Chef’s Choice',
    'pmd_menu_highlights_bestseller_label' => 'Best Seller',
    'pmd_menu_highlights_max_chef_items' => '8',
    'pmd_menu_highlights_max_bestseller_items' => '8',
    'pmd_menu_highlights_badge_style' => 'premium',
    'pmd_menu_highlights_section_placement' => 'after_categories',
];

$values = $defaults;
if (Schema::hasTable('settings')) {
    $columns = Schema::getColumnListing('settings');
    $keyColumn = in_array('item', $columns, true) ? 'item' : (in_array('key', $columns, true) ? 'key' : null);
    $valueColumn = in_array('value', $columns, true) ? 'value' : (in_array('data', $columns, true) ? 'data' : null);
    if ($keyColumn && $valueColumn) {
        $rows = DB::table('settings')->whereIn($keyColumn, array_keys($defaults))->get()->keyBy($keyColumn);
        foreach ($defaults as $key => $fallback) {
            if (isset($rows[$key]) && $rows[$key]->{$valueColumn} !== null && $rows[$key]->{$valueColumn} !== '') {
                $values[$key] = (string)$rows[$key]->{$valueColumn};
            }
        }
    }
}

$checked = fn($key) => !in_array(strtolower((string)$values[$key]), ['0', 'false', 'off', 'no'], true) ? 'checked' : '';
?>

<div class="container-fluid p-4">
    <div class="page-header">
        <h1>Menu Highlights</h1>
        <p class="text-muted">Control how Chef’s Choice and Best Seller items appear on the customer menu.</p>
    </div>

    <?php if ($message = session('success')): ?>
        <div class="alert alert-success"><?= e($message) ?></div>
    <?php endif; ?>
    <?php if ($message = session('error')): ?>
        <div class="alert alert-danger"><?= e($message) ?></div>
    <?php endif; ?>

    <form method="post" action="<?= e(admin_url('settings/edit/menu_highlights')) ?>" class="panel panel-default">
        <?= csrf_field() ?>
        <div class="panel-body">
            <div class="row">
                <div class="col-md-6">
                    <h4>Sections</h4>
                    <div class="checkbox"><label><input type="hidden" name="pmd_menu_highlights_chef_section_enabled" value="0"><input type="checkbox" name="pmd_menu_highlights_chef_section_enabled" value="1" <?= $checked('pmd_menu_highlights_chef_section_enabled') ?>> Enable Chef’s Recommendations section</label></div>
                    <div class="checkbox"><label><input type="hidden" name="pmd_menu_highlights_bestseller_section_enabled" value="0"><input type="checkbox" name="pmd_menu_highlights_bestseller_section_enabled" value="1" <?= $checked('pmd_menu_highlights_bestseller_section_enabled') ?>> Enable Best Sellers section</label></div>
                    <div class="form-group">
                        <label>Section placement</label>
                        <select name="pmd_menu_highlights_section_placement" class="form-control">
                            <option value="top" <?= $values['pmd_menu_highlights_section_placement'] === 'top' ? 'selected' : '' ?>>Top of menu</option>
                            <option value="after_categories" <?= $values['pmd_menu_highlights_section_placement'] === 'after_categories' ? 'selected' : '' ?>>After categories filter</option>
                            <option value="hidden" <?= $values['pmd_menu_highlights_section_placement'] === 'hidden' ? 'selected' : '' ?>>Hidden</option>
                        </select>
                    </div>
                    <div class="row">
                        <div class="col-sm-6 form-group">
                            <label>Max Chef items</label>
                            <input type="number" min="1" max="24" name="pmd_menu_highlights_max_chef_items" class="form-control" value="<?= e($values['pmd_menu_highlights_max_chef_items']) ?>">
                        </div>
                        <div class="col-sm-6 form-group">
                            <label>Max Best Seller items</label>
                            <input type="number" min="1" max="24" name="pmd_menu_highlights_max_bestseller_items" class="form-control" value="<?= e($values['pmd_menu_highlights_max_bestseller_items']) ?>">
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <h4>Badges</h4>
                    <div class="checkbox"><label><input type="hidden" name="pmd_menu_highlights_show_card_badges" value="0"><input type="checkbox" name="pmd_menu_highlights_show_card_badges" value="1" <?= $checked('pmd_menu_highlights_show_card_badges') ?>> Show badges on menu cards</label></div>
                    <div class="checkbox"><label><input type="hidden" name="pmd_menu_highlights_show_modal_badges" value="0"><input type="checkbox" name="pmd_menu_highlights_show_modal_badges" value="1" <?= $checked('pmd_menu_highlights_show_modal_badges') ?>> Show badges in product modal</label></div>
                    <div class="form-group">
                        <label>Chef badge label</label>
                        <input type="text" maxlength="80" name="pmd_menu_highlights_chef_label" class="form-control" value="<?= e($values['pmd_menu_highlights_chef_label']) ?>">
                    </div>
                    <div class="form-group">
                        <label>Best Seller badge label</label>
                        <input type="text" maxlength="80" name="pmd_menu_highlights_bestseller_label" class="form-control" value="<?= e($values['pmd_menu_highlights_bestseller_label']) ?>">
                    </div>
                    <div class="form-group">
                        <label>Badge style</label>
                        <select name="pmd_menu_highlights_badge_style" class="form-control">
                            <option value="compact" <?= $values['pmd_menu_highlights_badge_style'] === 'compact' ? 'selected' : '' ?>>Compact</option>
                            <option value="ribbon" <?= $values['pmd_menu_highlights_badge_style'] === 'ribbon' ? 'selected' : '' ?>>Ribbon</option>
                            <option value="premium" <?= $values['pmd_menu_highlights_badge_style'] === 'premium' ? 'selected' : '' ?>>Premium</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
        <div class="panel-footer">
            <button type="submit" class="btn btn-primary">Save Menu Highlights</button>
            <a href="<?= e(admin_url('settings')) ?>" class="btn btn-default">Back to Settings</a>
        </div>
    </form>
</div>
