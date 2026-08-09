<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;

/**
 * PMD Menu & Checkout
 *
 * Owner-facing guest-menu/checkout settings page. Operational menu data such
 * as dishes, categories and mealtimes stays in its real management authority;
 * this page contains settings directly instead of navigation tiles.
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
