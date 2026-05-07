<?php

namespace App\Admin\Classes;

use App\Http\Controllers\Controller;
use App\Models\TerminalDevicePlatform;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TerminalDevicesPlatformController extends Controller
{
    public function index(Request $request)
    {
        $query = TerminalDevicePlatform::query()->orderBy('name');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('connection_type')) {
            $query->where('connection_type', $request->input('connection_type'));
        }

        if ($request->filled('search')) {
            $search = trim((string)$request->input('search'));
            $query->where(function ($builder) use ($search) {
                $builder->where('name', 'like', '%'.$search.'%')
                    ->orWhere('ip_address', 'like', '%'.$search.'%');
            });
        }

        return view('admin.terminal_devices_platform.index', [
            'devices' => $query->get(),
            'filters' => $request->only(['status', 'connection_type', 'search']),
            'statusOptions' => TerminalDevicePlatform::statusOptions(),
            'connectionTypeOptions' => TerminalDevicePlatform::connectionTypeOptions(),
        ]);
    }

    public function create()
    {
        return view('admin.terminal_devices_platform.form', [
            'device' => new TerminalDevicePlatform(['status' => 'inactive', 'connection_type' => 'SumUp']),
            'statusOptions' => TerminalDevicePlatform::statusOptions(),
            'connectionTypeOptions' => TerminalDevicePlatform::connectionTypeOptions(),
            'formAction' => route('terminal_devices_platform.store'),
            'formMethod' => 'POST',
            'title' => 'Add Terminal',
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validateDevice($request)->validate();
        TerminalDevicePlatform::create($data);

        return redirect()
            ->route('terminal_devices_platform.index')
            ->with('terminal_devices_platform_message', 'Terminal device created successfully.');
    }

    public function edit($id)
    {
        $device = TerminalDevicePlatform::findOrFail($id);

        return view('admin.terminal_devices_platform.form', [
            'device' => $device,
            'statusOptions' => TerminalDevicePlatform::statusOptions(),
            'connectionTypeOptions' => TerminalDevicePlatform::connectionTypeOptions(),
            'formAction' => route('terminal_devices_platform.update', $device->id),
            'formMethod' => 'POST',
            'title' => 'Edit Terminal',
        ]);
    }

    public function update(Request $request, $id)
    {
        $device = TerminalDevicePlatform::findOrFail($id);
        $device->update($this->validateDevice($request)->validate());

        return redirect()
            ->route('terminal_devices_platform.index')
            ->with('terminal_devices_platform_message', 'Terminal device updated successfully.');
    }

    public function connect($id)
    {
        $device = TerminalDevicePlatform::findOrFail($id);
        $success = (bool)random_int(0, 1);

        if ($success) {
            $device->update([
                'status' => TerminalDevicePlatform::STATUS_ACTIVE,
                'last_active' => now(),
            ]);
        }

        return response()->json([
            'success' => $success,
            'message' => $success
                ? "Connection to {$device->name} succeeded."
                : "Connection to {$device->name} failed. Check network or provider settings.",
            'device' => $device->fresh(),
        ], $success ? 200 : 422);
    }

    public function sync($id)
    {
        $device = TerminalDevicePlatform::findOrFail($id);
        $success = (bool)random_int(0, 1);

        if ($success) {
            $device->update([
                'last_sync' => now(),
                'last_active' => now(),
            ]);
        }

        return response()->json([
            'success' => $success,
            'message' => $success
                ? "Manual sync completed for {$device->name}."
                : "Manual sync failed for {$device->name}. Try again or inspect provider logs.",
            'device' => $device->fresh(),
        ], $success ? 200 : 422);
    }

    public function toggle($id)
    {
        $device = TerminalDevicePlatform::findOrFail($id);
        $nextStatus = $device->status === TerminalDevicePlatform::STATUS_ACTIVE
            ? TerminalDevicePlatform::STATUS_INACTIVE
            : TerminalDevicePlatform::STATUS_ACTIVE;

        $device->update([
            'status' => $nextStatus,
            'last_active' => $nextStatus === TerminalDevicePlatform::STATUS_ACTIVE ? now() : $device->last_active,
        ]);

        return response()->json([
            'success' => true,
            'message' => "{$device->name} is now {$nextStatus}.",
            'device' => $device->fresh(),
        ]);
    }

    protected function validateDevice(Request $request)
    {
        return Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'ip_address' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'in:active,inactive'],
            'model' => ['nullable', 'string', 'max:255'],
            'last_active' => ['nullable', 'date'],
            'connection_type' => ['required', 'in:SumUp,Worldline,Other'],
            'location' => ['nullable', 'string', 'max:255'],
            'last_sync' => ['nullable', 'date'],
        ]);
    }
}
