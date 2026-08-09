<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;

/**
 * PMD Menu & Checkout
 *
 * A consolidated owner-facing page for guest menu management and checkout
 * behaviour. It reuses existing settings authorities instead of creating a
 * parallel data model.
 */
class Pmdmenu extends AdminController
{
    protected $requiredPermissions = 'Site.Settings';

    public function __construct()
    {
        parent::__construct();
        AdminMenu::setContext('settings', 'system');
    }

    public function index()
    {
        Template::setTitle('Menu & checkout');
        Template::setHeading('Menu & checkout');

        $this->vars['pmdMenuCheckout'] = [
            'review_prompt_enabled' => (bool)$this->settingValue('pmd_review_share_prompt_enabled', 1),
            'reviews_enabled' => (bool)$this->settingValue('pmd_social_reviews_enabled', 0),
        ];

        $this->vars['pmdMenuActions'] = [
            [
                'title' => 'Menu items',
                'description' => 'Create dishes, prices, descriptions, availability and menu content.',
                'href' => admin_url('menus'),
                'icon' => 'menu',
            ],
            [
                'title' => 'Categories',
                'description' => 'Organize dishes into clear guest-facing menu sections.',
                'href' => admin_url('categories'),
                'icon' => 'categories',
            ],
            [
                'title' => 'Menu highlights',
                'description' => 'Chef recommendations, best sellers, badges and highlighted items.',
                'href' => admin_url('settings/edit/menu_highlights'),
                'icon' => 'star',
            ],
            [
                'title' => 'Meal times',
                'description' => 'Control breakfast, lunch, dinner and time-based menu availability.',
                'href' => admin_url('mealtimes'),
                'icon' => 'clock',
            ],
        ];

        return $this->makeView('pmdmenu/index');
    }

    public function onSaveMenuCheckout()
    {
        $settings = (array)post('menu_checkout', []);

        setting()->set([
            'pmd_review_share_prompt_enabled' => !empty($settings['review_prompt_enabled']) ? 1 : 0,
            'pmd_social_reviews_enabled' => !empty($settings['reviews_enabled']) ? 1 : 0,
        ]);
        setting()->save();

        flash()->success('Menu & checkout settings saved.');

        return [
            '#pmd-menu-save-status' => '<span class="pmd-menu-save-status is-success">Saved</span>',
        ];
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
