<?php

namespace Admin\Services\CashDrawerService\Drivers;

use Admin\Services\CashDrawerService\CashDrawerDriverInterface;
use Illuminate\Support\Facades\Log;

/**
 * RJ11 Printer-Driven Cash Drawer Driver
 * Opens drawer by sending ESC/POS commands to a receipt printer
 */
class RJ11PrinterDriver implements CashDrawerDriverInterface
{
    protected $printerPath;
    protected $escPosCommand;
    protected $connected = false;
    protected $lastError = null;
    protected $handle = null;

    public function __construct($printerPath, $escPosCommand = '27,112,0,60,120')
    {
        $this->printerPath = $printerPath;
        $this->escPosCommand = $escPosCommand;
    }

    public function connect(): bool
    {
        try {
            // For RJ11 drawers, connection is through the printer
            // We'll open the printer connection when needed
            $this->connected = true;
            return true;
        } catch (\Exception $e) {
            $this->lastError = $e->getMessage();
            Log::error('Cash Drawer: Failed to connect to printer', [
                'printer' => $this->printerPath,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    public function open(): bool
    {
        try {
            if (!$this->connected) {
                $this->connect();
            }

            // Parse ESC/POS command
            $commandBytes = $this->parseEscPosCommand($this->escPosCommand);

            // Send command to printer
            $result = $this->sendToPrinter($commandBytes);

            if ($result) {
                Log::info('Cash Drawer: Opened via printer', [
                    'printer' => $this->printerPath,
                    'command' => $this->escPosCommand,
                ]);
            }

            return $result;
        } catch (\Exception $e) {
            $this->lastError = $e->getMessage();
            Log::error('Cash Drawer: Failed to open drawer', [
                'printer' => $this->printerPath,
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
        // RJ11 drawers don't support status checking
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
     * Parse ESC/POS command string to bytes
     * Format: "27,112,0,60,120" or "ESC p 0 60 120"
     */
    protected function parseEscPosCommand($command): array
    {
        // If command contains commas, it's decimal format
        if (strpos($command, ',') !== false) {
            $bytes = array_map('intval', explode(',', $command));
            return array_map(function($byte) {
                return chr($byte);
            }, $bytes);
        }

        // If command contains "ESC", parse as ESC/POS format
        if (stripos($command, 'ESC') !== false) {
            $command = str_ireplace('ESC', chr(27), $command);
            $parts = preg_split('/\s+/', trim($command));
            $bytes = [];
            foreach ($parts as $part) {
                if (is_numeric($part)) {
                    $bytes[] = chr((int)$part);
                } else {
                    $bytes[] = $part;
                }
            }
            return $bytes;
        }

        // Default: standard ESC p 0 command
        return [chr(27), 'p', chr(0), chr(60), chr(120)];
    }

    /**
     * Send command to printer
     */
    protected function sendToPrinter(array $commandBytes): bool
    {
        try {
            // Method 1: Direct file write (Linux/Mac)
            if (strtoupper(substr(PHP_OS, 0, 3)) !== 'WIN') {
                // Try /dev/usb/lp* or /dev/usb/lp*
                $devicePaths = [
                    $this->printerPath,
                    '/dev/usb/lp0',
                    '/dev/usb/lp1',
                    '/dev/lp0',
                    '/dev/lp1',
                ];

                foreach ($devicePaths as $path) {
                    if (file_exists($path) && is_writable($path)) {
                        $handle = @fopen($path, 'wb');
                        if ($handle) {
                            fwrite($handle, implode('', $commandBytes));
                            fclose($handle);
                            return true;
                        }
                    }
                }
            } else {
                // Windows: Use COM port or printer name
                // Try COM port first
                if (preg_match('/^COM\d+$/i', $this->printerPath)) {
                    $handle = @fopen($this->printerPath, 'wb');
                    if ($handle) {
                        fwrite($handle, implode('', $commandBytes));
                        fclose($handle);
                        return true;
                    }
                } else {
                    // Try printer name (Windows)
                    $printerName = $this->printerPath;
                    $command = 'echo ' . escapeshellarg(implode('', $commandBytes)) . ' > ' . escapeshellarg($printerName);
                    exec($command, $output, $returnCode);
                    if ($returnCode === 0) {
                        return true;
                    }
                }
            }

            // Method 2: Use system print command
            return $this->sendViaSystemCommand($commandBytes);
        } catch (\Exception $e) {
            $this->lastError = $e->getMessage();
            return false;
        }
    }

    /**
     * Send command via system print command
     */
    protected function sendViaSystemCommand(array $commandBytes): bool
    {
        try {
            $tempFile = sys_get_temp_dir() . '/cash_drawer_' . uniqid() . '.bin';
            file_put_contents($tempFile, implode('', $commandBytes));

            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                // Windows: copy to printer
                $command = 'copy /B ' . escapeshellarg($tempFile) . ' ' . escapeshellarg($this->printerPath);
            } else {
                // Linux/Mac: cat to device
                $command = 'cat ' . escapeshellarg($tempFile) . ' > ' . escapeshellarg($this->printerPath) . ' 2>/dev/null';
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
