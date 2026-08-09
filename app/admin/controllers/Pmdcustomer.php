<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;

class Pmdcustomer extends AdminController
{
    protected $requiredPermissions = 'Site.Settings';

    public function __construct()
    {
        parent::__construct();
        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-settings-suite pmd-owner-settings-page pmd-customer-settings-page');
        $this->addCss('css/pmd-owner-settings-v1.css');
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addJs('js/pmd-owner-settings-v1.js');
        AdminMenu::setContext('settings', 'system');
    }

    public function index()
    {
        Template::setTitle('Customer accounts');
        Template::setHeading('Customer accounts');

        $emails = $this->settingValue('registration_email', []);
        if (!is_array($emails)) {
            $decoded = @unserialize((string)$emails);
            $emails = is_array($decoded) ? $decoded : [];
        }

        $this->vars['pmdCustomer'] = [
            'allow_registration' => (bool)$this->settingValue('allow_registration', 1),
            'registration_email' => array_values(array_intersect(['customer', 'admin'], array_map('strval', $emails))),
        ];

        return $this->makeView('pmdcustomer/index');
    }

    public function onSaveCustomerAccounts()
    {
        $input = (array)post('customer_accounts', []);
        $emails = array_values(array_intersect(
            ['customer', 'admin'],
            array_map('strval', (array)($input['registration_email'] ?? []))
        ));

        setting()->set([
            'allow_registration' => !empty($input['allow_registration']) ? 1 : 0,
            'registration_email' => $emails,
        ]);
        setting()->save();

        flash()->success('Customer account settings saved.');
        return ['#pmd-owner-save-status' => '<span>Saved</span>'];
    }

    protected function settingValue(string $key, $fallback = null)
    {
        try { return setting($key, $fallback); }
        catch (\Throwable $error) { return $fallback; }
    }
}
