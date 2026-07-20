<?php

namespace Admin\Services\CashDrawerService\Drivers;

use Admin\Services\CashDrawerService\CashDrawerDriverInterface;
use Illuminate\Support\Facades\Log;

/**
 * USB Cash Drawer Driver
 * Opens drawer via USB connection (HID or virtual COM port)
 */
class USBCashDrawerDriver implements CashDrawerDriverInterface
{
    protected $devicePath;
    protected $vendorId;
    protected $productId;
    protected $connected = false;
    protected $lastError = null;
    protected $handle = null;

    public function __construct($devicePath, $vendorId = null, $productId = null)
    {
        $this->devicePath = $devicePath;
        $this->vendorId = $vendorId;
        $this->productId = $productId;
    }

    public function connect(): bool
    {
        try {
            // Try to open USB device
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                // Windows: COM port or device path
                if (preg_match('/^COM\d+$/i', $this->devicePath)) {
                    $this->handle = @fopen($this->devicePath, 'r+b');
                } else {
                    // Try as file path
                    $this->handle = @fopen($this->devicePath, 'r+b');
                }
            } else {
                // Linux/Mac: /dev/ttyUSB* or /dev/ttyACM*
                if (file_exists($this->devicePath)) {
                    $this->handle = @fopen($this->devicePath, 'r+b');
                }
            }

            if ($this->handle) {
                stream_set_blocking($this->handle, false);
                $this->connected = true;
                return true;
            }

            $this->lastError = 'Failed to open USB device: ' . $this->devicePath;
            return false;
        } catch (\Exception $e) {
            $this->lastError = $e->getMessage();
            Log::error('Cash Drawer: Failed to connect USB device', [
                'device' => $this->devicePath,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    public function open(): bool
    {
        try {
            if (!$this->connected) {
                if (!$this->connect()) {
                    return false;
                }
            }

            // USB drawers typically use ESC/POS commands or simple control signals
            // Send ESC/POS drawer open command
            $command = [chr(27), 'p', chr(0), chr(60), chr(120)];

            if ($this->handle) {
                $written = fwrite($this->handle, implode('', $command));
                fflush($this->handle);

                if ($written !== false) {
                    Log::info('Cash Drawer: Opened via USB', [
                        'device' => $this->devicePath,
                    ]);
                    return true;
                }
            }

            // Fallback: Try system command
            return $this->sendViaSystemCommand($command);
        } catch (\Exception $e) {
            $this->lastError = $e->getMessage();
            Log::error('Cash Drawer: Failed to open USB drawer', [
                'device' => $this->devicePath,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    public function test(): bool
    {
        return $this->open();
    }

    public function isOpen(): ?bool
    {
        // Most USB drawers don't support status checking
        return null;
    }

    public function disconnect(): void
    {
        if ($this->handle) {
            @fclose($this->handle);
            $this->handle = null;
        }
        $this->connected = false;
    }

    public function getLastError(): ?string
    {
        return $this->lastError;
    }

    /**
     * Send command via system command
     */
    protected function sendViaSystemCommand(array $command): bool
    {
        try {
            $tempFile = sys_get_temp_dir() . '/cash_drawer_usb_' . uniqid() . '.bin';
            file_put_contents($tempFile, implode('', $command));

            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                $command = 'copy /B ' . escapeshellarg($tempFile) . ' ' . escapeshellarg($this->devicePath);
            } else {
                $command = 'cat ' . escapeshellarg($tempFile) . ' > ' . escapeshellarg($this->devicePath) . ' 2>/dev/null';
            }

            exec($command, $output, $returnCode);
            @unlink($tempFile);

            return $returnCode === 0;
        } catch (\Exception $e) {
            $this->lastError = $e->getMessage();
            return false;
        }
    }
}
