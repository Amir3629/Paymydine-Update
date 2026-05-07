<?php
namespace App\Admin\Classes;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class TerminalDevicesPlatformController extends Controller {
    public function index() {
        $devices = DB::table('terminal_devices_platform')->get();
        return view('admin::terminal_devices_platform.index', compact('devices'));
    }
}