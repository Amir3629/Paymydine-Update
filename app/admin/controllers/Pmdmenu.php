<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;

/**
 * PMD Menu & Checkout
 *
 * Consolidated owner-facing configuration for guest menu highlights,
 * checkout review prompts and the reviews experience.
 */
class Pmdmenu extends AdminController
{
    // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16_2
    protected $requiredPermissions = 'Site.Settings';

    protected $highlightDefaults = [
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

    protected $highlightAliases = [
        'pmd_menu_highlights_enable_chef_recommendations_section' => ['pmd_menu_highlights_chef_section_enabled'],
        'pmd_menu_highlights_enable_best_sellers_section' => ['pmd_menu_highlights_bestseller_section_enabled'],
        'pmd_menu_highlights_max_chef_recommendation_items' => ['pmd_menu_highlights_max_chef_items'],
        'pmd_menu_highlights_max_best_seller_items' => ['pmd_menu_highlights_max_bestseller_items'],
        'pmd_menu_highlights_show_badges_on_cards' => ['pmd_menu_highlights_show_card_badges'],
        'pmd_menu_highlights_show_badges_in_modal' => ['pmd_menu_highlights_show_modal_badges'],
        'pmd_menu_highlights_chef_recommendation_label' => ['pmd_menu_highlights_chef_label'],
        'pmd_menu_highlights_best_seller_label' => ['pmd_menu_highlights_bestseller_label'],
    ];

    public function __construct()
    {
        parent::__construct();

        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-settings-suite pmd-menu-settings-page');

        // Head-loaded authorities: geometry and cool shell exist before body paint.
        $this->addCss('css/pmd-settings-menu-v1.css');
        $this->addCss('css/pmd-settings-menu-v2.css');
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');

        AdminMenu::setContext('settings', 'system');
    }

    public function index()
    {
        Template::setTitle(\Admin\Classes\PmdPlatformI18n::fromEnglish('Menu & checkout', 'settings.'));
        Template::setHeading(\Admin\Classes\PmdPlatformI18n::fromEnglish('Menu & checkout', 'settings.'));

        $this->vars['pmdMenuCheckout'] = array_merge(
            $this->highlightValues(),
            [
                'review_prompt_enabled' => (bool)$this->settingValue('pmd_review_share_prompt_enabled', 1),
                'reviews_enabled' => (bool)$this->settingValue('pmd_social_reviews_enabled', 0),
            ]
        );

        return $this->makeView('pmdmenu/index');
    }

    public function onSaveMenuCheckout()
    {
        $input = (array)post('menu_checkout', []);

        $values = [
            'pmd_menu_highlights_enable_chef_recommendations_section' => !empty($input['pmd_menu_highlights_enable_chef_recommendations_section']) ? '1' : '0',
            'pmd_menu_highlights_enable_best_sellers_section' => !empty($input['pmd_menu_highlights_enable_best_sellers_section']) ? '1' : '0',
            'pmd_menu_highlights_show_badges_on_cards' => !empty($input['pmd_menu_highlights_show_badges_on_cards']) ? '1' : '0',
            'pmd_menu_highlights_show_badges_in_modal' => !empty($input['pmd_menu_highlights_show_badges_in_modal']) ? '1' : '0',
            'pmd_menu_highlights_show_badge_text_on_cards' => !empty($input['pmd_menu_highlights_show_badge_text_on_cards']) ? '1' : '0',
            'pmd_menu_highlights_show_badge_text_in_modal' => !empty($input['pmd_menu_highlights_show_badge_text_in_modal']) ? '1' : '0',
            'pmd_menu_highlights_max_chef_recommendation_items' => (string)max(1, min(24, (int)($input['pmd_menu_highlights_max_chef_recommendation_items'] ?? 8))),
            'pmd_menu_highlights_max_best_seller_items' => (string)max(1, min(24, (int)($input['pmd_menu_highlights_max_best_seller_items'] ?? 8))),
            'pmd_menu_highlights_chef_recommendation_label' => mb_substr(trim((string)($input['pmd_menu_highlights_chef_recommendation_label'] ?? 'Chef’s Choice')), 0, 80),
            'pmd_menu_highlights_best_seller_label' => mb_substr(trim((string)($input['pmd_menu_highlights_best_seller_label'] ?? 'Best Seller')), 0, 80),
            'pmd_menu_highlights_section_placement' => $this->allowedValue(
                $input['pmd_menu_highlights_section_placement'] ?? 'hidden',
                ['hidden', 'top', 'after_categories'],
                'hidden'
            ),
            'pmd_menu_highlights_badge_display_mode' => $this->allowedValue(
                $input['pmd_menu_highlights_badge_display_mode'] ?? 'priority_only',
                ['priority_only', 'show_all'],
                'priority_only'
            ),
            'pmd_menu_highlights_badge_style' => $this->allowedValue(
                $input['pmd_menu_highlights_badge_style'] ?? 'corner_ribbon',
                ['minimal_circle', 'corner_ribbon', 'soft_pill', 'luxury_label'],
                'corner_ribbon'
            ),
            'pmd_menu_highlights_badge_position' => $this->allowedValue(
                $input['pmd_menu_highlights_badge_position'] ?? 'image_top_left',
                ['image_top_left', 'image_top_right', 'title_inline', 'hidden'],
                'image_top_left'
            ),
            'pmd_review_share_prompt_enabled' => !empty($input['review_prompt_enabled']) ? 1 : 0,
            'pmd_social_reviews_enabled' => !empty($input['reviews_enabled']) ? 1 : 0,
        ];

        setting()->set($values);
        setting()->save();

        flash()->success(\Admin\Classes\PmdPlatformI18n::fromEnglish('Menu & checkout settings saved.', 'settings.'));

        return [
            '#pmd-menu-save-status' => '<span class="pmd-menu-save-status is-success">'.\Admin\Classes\PmdPlatformI18n::fromEnglish('Saved', 'settings.').'</span>',
        ];
    }

    protected function highlightValues(): array
    {
        $values = [];

        foreach ($this->highlightDefaults as $key => $fallback) {
            $value = $this->settingValue($key, null);

            if ($value === null || $value === '') {
                foreach ($this->highlightAliases[$key] ?? [] as $alias) {
                    $aliasValue = $this->settingValue($alias, null);
                    if ($aliasValue !== null && $aliasValue !== '') {
                        $value = $aliasValue;
                        break;
                    }
                }
            }

            $values[$key] = ($value === null || $value === '') ? $fallback : (string)$value;
        }

        return $values;
    }

    protected function allowedValue($value, array $allowed, string $fallback): string
    {
        $value = (string)$value;
        return in_array($value, $allowed, true) ? $value : $fallback;
    }

    protected function settingValue(string $key, $fallback = null)
    {
        try {
            return setting($key, $fallback);
        } catch (\Throwable $error) {
            return $fallback;
        }
    }
}
