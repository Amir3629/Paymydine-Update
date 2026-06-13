<?php
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$defaults = [
    'pmd_menu_highlights_enable_chef_recommendations_section' => '0',
    'pmd_menu_highlights_enable_best_sellers_section' => '0',
    'pmd_menu_highlights_section_placement' => 'hidden',
    'pmd_menu_highlights_max_chef_recommendation_items' => '8',
    'pmd_menu_highlights_max_best_seller_items' => '8',
    'pmd_menu_highlights_show_badges_on_cards' => '1',
    'pmd_menu_highlights_show_badges_in_modal' => '1',
    'pmd_menu_highlights_badge_display_mode' => 'priority_only',
    'pmd_menu_highlights_badge_style' => 'corner_ribbon',
    'pmd_menu_highlights_badge_position' => 'image_top_left',
    'pmd_menu_highlights_show_badge_text_on_cards' => '0',
    'pmd_menu_highlights_show_badge_text_in_modal' => '1',
    'pmd_menu_highlights_chef_recommendation_label' => 'Chef’s Choice',
    'pmd_menu_highlights_best_seller_label' => 'Best Seller',
];

$legacyAliases = [
    'pmd_menu_highlights_enable_chef_recommendations_section' => ['pmd_menu_highlights_chef_section_enabled'],
    'pmd_menu_highlights_enable_best_sellers_section' => ['pmd_menu_highlights_bestseller_section_enabled'],
    'pmd_menu_highlights_max_chef_recommendation_items' => ['pmd_menu_highlights_max_chef_items'],
    'pmd_menu_highlights_max_best_seller_items' => ['pmd_menu_highlights_max_bestseller_items'],
    'pmd_menu_highlights_show_badges_on_cards' => ['pmd_menu_highlights_show_card_badges'],
    'pmd_menu_highlights_show_badges_in_modal' => ['pmd_menu_highlights_show_modal_badges'],
    'pmd_menu_highlights_chef_recommendation_label' => ['pmd_menu_highlights_chef_label'],
    'pmd_menu_highlights_best_seller_label' => ['pmd_menu_highlights_bestseller_label'],
];

$values = $defaults;
if (Schema::hasTable('settings')) {
    $columns = Schema::getColumnListing('settings');
    $keyColumn = in_array('item', $columns, true) ? 'item' : (in_array('key', $columns, true) ? 'key' : null);
    $valueColumn = in_array('value', $columns, true) ? 'value' : (in_array('data', $columns, true) ? 'data' : null);
    if ($keyColumn && $valueColumn) {
        $keys = array_values(array_unique(array_merge(array_keys($defaults), ...array_values($legacyAliases))));
        $rows = DB::table('settings')->whereIn($keyColumn, $keys)->get()->keyBy($keyColumn);
        foreach ($defaults as $key => $fallback) {
            $candidateKeys = array_merge([$key], $legacyAliases[$key] ?? []);
            foreach ($candidateKeys as $candidateKey) {
                if (isset($rows[$candidateKey]) && $rows[$candidateKey]->{$valueColumn} !== null && $rows[$candidateKey]->{$valueColumn} !== '') {
                    $values[$key] = (string)$rows[$candidateKey]->{$valueColumn};
                    break;
                }
            }
        }
    }
}

$checked = fn($key) => !in_array(strtolower((string)$values[$key]), ['0', 'false', 'off', 'no'], true) ? 'checked' : '';
$selected = fn($key, $value) => (string)$values[$key] === (string)$value ? 'selected' : '';
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
                    <h4>Highlight Sections</h4>
                    <div class="checkbox"><label><input type="hidden" name="pmd_menu_highlights_enable_chef_recommendations_section" value="0"><input type="checkbox" name="pmd_menu_highlights_enable_chef_recommendations_section" value="1" <?= $checked('pmd_menu_highlights_enable_chef_recommendations_section') ?>> Enable Chef’s Recommendations section</label></div>
                    <div class="checkbox"><label><input type="hidden" name="pmd_menu_highlights_enable_best_sellers_section" value="0"><input type="checkbox" name="pmd_menu_highlights_enable_best_sellers_section" value="1" <?= $checked('pmd_menu_highlights_enable_best_sellers_section') ?>> Enable Best Sellers section</label></div>
                    <div class="form-group">
                        <label>Section placement</label>
                        <select name="pmd_menu_highlights_section_placement" class="form-control">
                            <option value="hidden" <?= $selected('pmd_menu_highlights_section_placement', 'hidden') ?>>Hidden</option>
                            <option value="top" <?= $selected('pmd_menu_highlights_section_placement', 'top') ?>>Top of menu</option>
                            <option value="after_categories" <?= $selected('pmd_menu_highlights_section_placement', 'after_categories') ?>>After categories filter</option>
                        </select>
                    </div>
                    <div class="row">
                        <div class="col-sm-6 form-group">
                            <label>Max Chef items</label>
                            <input type="number" min="1" max="24" name="pmd_menu_highlights_max_chef_recommendation_items" class="form-control" value="<?= e($values['pmd_menu_highlights_max_chef_recommendation_items']) ?>">
                        </div>
                        <div class="col-sm-6 form-group">
                            <label>Max Best Seller items</label>
                            <input type="number" min="1" max="24" name="pmd_menu_highlights_max_best_seller_items" class="form-control" value="<?= e($values['pmd_menu_highlights_max_best_seller_items']) ?>">
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <h4>Badges</h4>
                    <div class="checkbox"><label><input type="hidden" name="pmd_menu_highlights_show_badges_on_cards" value="0"><input type="checkbox" name="pmd_menu_highlights_show_badges_on_cards" value="1" <?= $checked('pmd_menu_highlights_show_badges_on_cards') ?>> Show badges on menu cards</label></div>
                    <div class="checkbox"><label><input type="hidden" name="pmd_menu_highlights_show_badges_in_modal" value="0"><input type="checkbox" name="pmd_menu_highlights_show_badges_in_modal" value="1" <?= $checked('pmd_menu_highlights_show_badges_in_modal') ?>> Show badges in product modal</label></div>
                    <div class="checkbox"><label><input type="hidden" name="pmd_menu_highlights_show_badge_text_on_cards" value="0"><input type="checkbox" name="pmd_menu_highlights_show_badge_text_on_cards" value="1" <?= $checked('pmd_menu_highlights_show_badge_text_on_cards') ?>> Show badge text on cards</label></div>
                    <div class="checkbox"><label><input type="hidden" name="pmd_menu_highlights_show_badge_text_in_modal" value="0"><input type="checkbox" name="pmd_menu_highlights_show_badge_text_in_modal" value="1" <?= $checked('pmd_menu_highlights_show_badge_text_in_modal') ?>> Show badge text in modal</label></div>
                    <div class="form-group">
                        <label>Badge display mode</label>
                        <select name="pmd_menu_highlights_badge_display_mode" class="form-control">
                            <option value="priority_only" <?= $selected('pmd_menu_highlights_badge_display_mode', 'priority_only') ?>>Priority only (Chef’s Choice over Best Seller)</option>
                            <option value="show_all" <?= $selected('pmd_menu_highlights_badge_display_mode', 'show_all') ?>>Show all matching badges</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Badge style</label>
                        <select name="pmd_menu_highlights_badge_style" class="form-control">
                            <option value="minimal_circle" <?= $selected('pmd_menu_highlights_badge_style', 'minimal_circle') ?>>Minimal circle</option>
                            <option value="corner_ribbon" <?= $selected('pmd_menu_highlights_badge_style', 'corner_ribbon') ?>>Corner ribbon</option>
                            <option value="soft_pill" <?= $selected('pmd_menu_highlights_badge_style', 'soft_pill') ?>>Soft pill</option>
                            <option value="luxury_label" <?= $selected('pmd_menu_highlights_badge_style', 'luxury_label') ?>>Luxury label</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Badge position</label>
                        <select name="pmd_menu_highlights_badge_position" class="form-control">
                            <option value="image_top_left" <?= $selected('pmd_menu_highlights_badge_position', 'image_top_left') ?>>Image top left</option>
                            <option value="image_top_right" <?= $selected('pmd_menu_highlights_badge_position', 'image_top_right') ?>>Image top right</option>
                            <option value="title_inline" <?= $selected('pmd_menu_highlights_badge_position', 'title_inline') ?>>Inline with title</option>
                            <option value="hidden" <?= $selected('pmd_menu_highlights_badge_position', 'hidden') ?>>Hidden on cards</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Chef badge label</label>
                        <input type="text" maxlength="80" name="pmd_menu_highlights_chef_recommendation_label" class="form-control" value="<?= e($values['pmd_menu_highlights_chef_recommendation_label']) ?>">
                    </div>
                    <div class="form-group">
                        <label>Best Seller badge label</label>
                        <input type="text" maxlength="80" name="pmd_menu_highlights_best_seller_label" class="form-control" value="<?= e($values['pmd_menu_highlights_best_seller_label']) ?>">
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
