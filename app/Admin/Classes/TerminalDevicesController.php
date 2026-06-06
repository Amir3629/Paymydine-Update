<?php
namespace Admin\Classes;

use Admin\Classes\AdminController;

class TerminalDevicesController extends AdminController
{
    public $implement = []; // اگر widget یا behavior خاصی نیاز دارید اینجا اضافه کنید

    public function index()
    {
        $this->pageTitle = 'Terminal Devices';
        $this->vars['devices'] = []; // برای تست، خالی بگذارید یا از DB بخوانید
        return $this->makeView('admin::partials.index');
    }
}
