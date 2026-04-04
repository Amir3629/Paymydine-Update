<?php

namespace Admin\Services\CashDrawerService\Drivers;

use Admin\Services\CashDrawerService\CashDrawerDriverInterface;
use Illuminate\Support\Facades\Log;

/**
 * Serial (RS-232) Cash Drawer Driver
 * Opens drawer via serial port connection
 */
class SerialCashDrawerDriver implements CashDrawerDriverInterface
{
    protected $port;
    protected $baudRate;
    protected $connected = false;
    protected $lastError = null;
    protected $handle = null;

    public function __construct($port, $baudRate = 9600)
    {
        $this->port = $port;
        $this->baudRate = $baudRate;
    }

    public function connect(): bool
    {
        try {
            // Open serial port
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                // Windows: COM port
                $this->handle = @fopen($this->port, 'r+b');
            } else {
                // Linux/Mac: /dev/tty*
                if (file_exists($this->port)) {
                    $this->handle = @fopen($this->port, 'r+b');
                } else {
                    $this->lastError = 'Serial port not found: ' . $this->port;
                    return false;
                }
            }

            if ($this->handle) {
                // Configure serial port (basic settings)
                stream_set_blocking($this->handle, false);
                $this->connected = true;
                return true;
            }

            $this->lastError = 'Failed to open serial port: ' . $this->port;
            return false;
        } catch (\Exception $e) {
            $this->lastError = $e->getMessage();
            Log::error('Cash Drawer: Failed to connect serial port', [
                'port' => $this->port,
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

            // Send ESC/POS drawer open command
            $command = [chr(27), 'p', chr(0), chr(60), chr(120)];

            if ($this->handle) {
                $written = fwrite($this->handle, implode('', $command));
                fflush($this->handle);

                if ($written !== false) {
                    Log::info('Cash Drawer: Opened via serial', [
                        'port' => $this->port,
                    ]);
                    return true;
                }
            }

            $this->lastError = 'Failed to write to serial port';
            return false;
        } catch (\Exception $e) {
            $this->lastError = $e->getMessage();
            Log::error('Cash Drawer: Failed to open serial drawer', [
                'port' => $this->port,
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
        // Serial drawers typically don't support status checking
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
}
